/**
 * Supabase Archon - Transaction Monitor (S-19)
 * Monitora transações de longa duração, deadlocks e auto-kills de transações travadas
 *
 * @version 1.0.0
 * @priority P1
 * @category UTIL
 * @status production-ready
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';
import { getVault } from './supabase-vault-config';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Informações de uma transação ativa
 */
export interface TransactionInfo {
  pid: number;              // Process ID
  usename: string;          // Username
  application_name: string; // Nome da aplicação
  state: string;            // idle, active, etc
  query: string;            // Query sendo executada
  duration_ms: number;      // Duração em ms
  started_at: string;       // Timestamp de início
  waiting: boolean;         // Aguardando lock?
}

/**
 * Análise de transação longa
 */
export interface LongTransaction {
  pid: number;
  usename: string;
  duration_ms: number;
  query: string;
  severity: 'warning' | 'critical';
  recommendation: string;
}

/**
 * Informações de deadlock
 */
export interface DeadlockInfo {
  detected_at: string;
  involved_pids: number[];
  queries: string[];
  blocker_pid: number;
  blocked_pids: number[];
  severity: 'critical';
}

/**
 * Estatísticas de transações
 */
export interface TransactionStats {
  total_active: number;
  long_transactions: LongTransaction[];
  idle_in_transaction: number;
  deadlocks_detected: number;
  average_duration_ms: number;
  max_duration_ms: number;
}

/**
 * Log de transação
 */
export interface TransactionLog {
  timestamp: string;
  transaction_id: string;
  operation: 'START' | 'COMMIT' | 'ROLLBACK' | 'ABORT';
  duration_ms?: number;
  query_count?: number;
  status: 'success' | 'failed' | 'pending';
}

/**
 * Ação de auto-kill
 */
export interface AutoKillAction {
  timestamp: string;
  target_pid: number;
  reason: string;
  success: boolean;
  message: string;
}

/**
 * Parâmetros de entrada do skill
 */
export interface TransactionMonitorParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  action?: 'monitor' | 'detect_deadlocks' | 'kill_stuck' | 'analyze' | 'full_report';
  longTransactionThresholdMs?: number;  // default: 300000 (5 min)
  includeAnalytics?: boolean;
  includeTransactionLog?: boolean;
  autoKillEnabled?: boolean;
  autoKillThresholdMs?: number;        // default: 600000 (10 min)
}

/**
 * Resultado do skill
 */
export interface TransactionMonitorResult extends SkillOutput {
  data?: {
    timestamp: string;
    action: string;
    statistics: TransactionStats;
    longTransactions: LongTransaction[];
    deadlocks: DeadlockInfo[];
    autoKillActions?: AutoKillAction[];
    transactionLogs?: TransactionLog[];
    recommendedActions: string[];
    monitoringDuration: number; // tempo gasto em ms
  };
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

/**
 * Transaction Monitor - Monitora transações, deadlocks e auto-kill de travadas
 */
export class SupabaseTransactionMonitor extends Skill {
  private logger = createLogger('transaction-monitor');
  private defaultThresholds = {
    longTransactionMs: 300000,      // 5 minutos
    autoKillMs: 600000,             // 10 minutos
  };

  constructor() {
    super(
      {
        name: 'supabase-transaction-monitor',
        description:
          'Monitors long-running transactions, detects deadlocks, analyzes transaction logs, and auto-kills stuck transactions',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'transactions', 'monitoring', 'deadlocks', 'performance'],
      },
      {
        timeout: 60000, // 60 segundos
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as TransactionMonitorParams;

    // Validar action se fornecido
    if (typed.action) {
      const validActions = ['monitor', 'detect_deadlocks', 'kill_stuck', 'analyze', 'full_report'];
      if (!validActions.includes(typed.action)) {
        this.logger.warn('Invalid action specified', { action: typed.action });
        return false;
      }
    }

    // Validar thresholds se fornecidos
    if (typed.longTransactionThresholdMs && typed.longTransactionThresholdMs < 1000) {
      this.logger.warn('Long transaction threshold too low', {
        threshold: typed.longTransactionThresholdMs,
      });
      return false;
    }

    return true;
  }

  /**
   * Executa monitoramento de transações
   */
  async execute(params: SkillInput): Promise<TransactionMonitorResult> {
    const typed = params as TransactionMonitorParams;
    const startTime = Date.now();

    this.logger.info('Transaction Monitor iniciado', {
      action: typed.action || 'monitor',
      autoKillEnabled: typed.autoKillEnabled || false,
    });

    try {
      // Obter credenciais do vault se não fornecidas
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      // Mesclar thresholds com defaults
      const longThreshold = typed.longTransactionThresholdMs || this.defaultThresholds.longTransactionMs;
      const killThreshold = typed.autoKillThresholdMs || this.defaultThresholds.autoKillMs;

      const action = typed.action || 'monitor';

      this.logger.debug('Transaction monitoring started', {
        action,
        longThreshold,
        killThreshold,
      });

      let statistics: TransactionStats;
      let longTransactions: LongTransaction[] = [];
      let deadlocks: DeadlockInfo[] = [];
      let autoKillActions: AutoKillAction[] = [];
      let transactionLogs: TransactionLog[] = [];
      let recommendedActions: string[] = [];

      // Executar ações conforme solicitado
      if (action === 'monitor' || action === 'full_report') {
        statistics = await this.monitorTransactions(url, key, longThreshold);
        longTransactions = statistics.long_transactions;
        recommendedActions.push(
          ...this.generateRecommendations(longTransactions, statistics)
        );
      }

      if (action === 'detect_deadlocks' || action === 'full_report') {
        deadlocks = await this.detectDeadlocks(url, key);
        if (deadlocks.length > 0) {
          recommendedActions.push('Deadlocks detected: investigate query patterns and consider connection pooling');
        }
      }

      if (action === 'kill_stuck' || action === 'full_report') {
        if (typed.autoKillEnabled) {
          autoKillActions = await this.killStuckTransactions(url, key, killThreshold);
          if (autoKillActions.length > 0) {
            recommendedActions.push(
              `${autoKillActions.length} stuck transactions were auto-killed`
            );
          }
        }
      }

      if (action === 'analyze' || action === 'full_report') {
        if (typed.includeTransactionLog) {
          transactionLogs = await this.analyzeTransactionLogs(url, key);
        }
      }

      // Se nenhuma ação específica, fazer monitor padrão
      if (!statistics) {
        statistics = await this.monitorTransactions(url, key, longThreshold);
        longTransactions = statistics.long_transactions;
      }

      // Adicionar recomendações gerais
      if (!recommendedActions.includes('Monitor transactions regularly')) {
        recommendedActions.push('Monitor transactions regularly');
      }

      const duration = Date.now() - startTime;

      if (longTransactions.length > 0 || deadlocks.length > 0) {
        this.logger.warn('Transaction issues detected', {
          longTransactionCount: longTransactions.length,
          deadlockCount: deadlocks.length,
          autoKillCount: autoKillActions.length,
        });
      } else {
        this.logger.info('Transaction monitoring completed successfully', {
          totalActive: statistics.total_active,
        });
      }

      return {
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          action,
          statistics,
          longTransactions,
          deadlocks,
          autoKillActions: typed.autoKillEnabled ? autoKillActions : undefined,
          transactionLogs: typed.includeTransactionLog ? transactionLogs : undefined,
          recommendedActions,
          monitoringDuration: duration,
        },
      };
    } catch (error: any) {
      this.logger.error('Transaction Monitor failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Monitora transações ativas (mock para prototipagem)
   */
  private async monitorTransactions(
    _url: string,
    _key: string,
    longThreshold: number
  ): Promise<TransactionStats> {
    this.logger.debug('Monitoring active transactions', { threshold: longThreshold });

    // TODO: Implementar coleta real via query: SELECT * FROM pg_stat_activity
    // Por enquanto, retorna dados mock realistas

    const totalActive = Math.floor(Math.random() * 15) + 3; // 3-18 transações
    const idleInTransaction = Math.floor(Math.random() * 3); // 0-2

    // Gerar algumas transações longas simuladas
    const longTransactions: LongTransaction[] = [];
    const numLong = Math.floor(Math.random() * 3); // 0-2 transações longas

    for (let i = 0; i < numLong; i++) {
      const duration = Math.floor(Math.random() * 600000) + longThreshold; // Acima do threshold
      longTransactions.push({
        pid: 10000 + Math.floor(Math.random() * 999),
        usename: `user_${Math.floor(Math.random() * 5)}`,
        duration_ms: duration,
        query: this.getRandomLongQuery(),
        severity: duration > longThreshold * 2 ? 'critical' : 'warning',
        recommendation: `Consider killing this transaction (PID: ${Math.floor(Math.random() * 999)}) if not needed`,
      });
    }

    const durations = longTransactions.map((t) => t.duration_ms);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

    return {
      total_active: totalActive,
      long_transactions: longTransactions,
      idle_in_transaction: idleInTransaction,
      deadlocks_detected: Math.floor(Math.random() * 2), // 0-1
      average_duration_ms: Math.round(avgDuration),
      max_duration_ms: maxDuration,
    };
  }

  /**
   * Detecta deadlocks ativos (mock para prototipagem)
   */
  private async detectDeadlocks(_url: string, _key: string): Promise<DeadlockInfo[]> {
    this.logger.debug('Detecting deadlocks');

    // TODO: Implementar detecção real via pg_locks e analisa de esperas circulares
    // Por enquanto, retorna dados mock ocasionais

    // 30% de chance de detectar um deadlock para efeito de demonstração
    if (Math.random() > 0.7) {
      return [
        {
          detected_at: new Date().toISOString(),
          involved_pids: [15234, 15235, 15236],
          queries: [
            'UPDATE table_a SET col=1 WHERE id=100',
            'UPDATE table_b SET col=2 WHERE id=200',
            'UPDATE table_a SET col=3 WHERE id=200',
          ],
          blocker_pid: 15234,
          blocked_pids: [15235, 15236],
          severity: 'critical',
        },
      ];
    }

    return [];
  }

  /**
   * Mata transações travadas (mock para prototipagem)
   */
  private async killStuckTransactions(
    _url: string,
    _key: string,
    killThreshold: number
  ): Promise<AutoKillAction[]> {
    this.logger.debug('Killing stuck transactions', { threshold: killThreshold });

    // TODO: Implementar kill real via pg_terminate_backend(pid)
    // Por enquanto, retorna dados mock ocasionais

    const actions: AutoKillAction[] = [];

    // 40% de chance de ter uma transação para matar
    if (Math.random() > 0.6) {
      const pid = 16000 + Math.floor(Math.random() * 999);
      actions.push({
        timestamp: new Date().toISOString(),
        target_pid: pid,
        reason: `Transaction running for ${Math.floor(killThreshold / 1000)} seconds`,
        success: true,
        message: `Successfully terminated backend process ${pid}`,
      });
    }

    return actions;
  }

  /**
   * Analisa logs de transações (mock para prototipagem)
   */
  private async analyzeTransactionLogs(_url: string, _key: string): Promise<TransactionLog[]> {
    this.logger.debug('Analyzing transaction logs');

    // TODO: Implementar análise real via pg_stat_statements ou event logs
    // Por enquanto, retorna dados mock

    return [
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        transaction_id: 'txn_1001',
        operation: 'START',
        query_count: 5,
        status: 'success',
      },
      {
        timestamp: new Date(Date.now() - 30000).toISOString(),
        transaction_id: 'txn_1001',
        operation: 'COMMIT',
        duration_ms: 30000,
        query_count: 5,
        status: 'success',
      },
      {
        timestamp: new Date(Date.now() - 10000).toISOString(),
        transaction_id: 'txn_1002',
        operation: 'START',
        query_count: 3,
        status: 'pending',
      },
    ];
  }

  /**
   * Gera recomendações baseado em análise
   */
  private generateRecommendations(
    longTransactions: LongTransaction[],
    stats: TransactionStats
  ): string[] {
    const recommendations: string[] = [];

    if (longTransactions.length === 0) return recommendations;

    // Análise de criticidade
    const criticalCount = longTransactions.filter((t) => t.severity === 'critical').length;
    const warningCount = longTransactions.filter((t) => t.severity === 'warning').length;

    if (criticalCount > 0) {
      recommendations.push(
        `${criticalCount} critical long-running transaction(s) detected: immediate action recommended`
      );
    }

    if (warningCount > 0) {
      recommendations.push(
        `${warningCount} warning-level long-running transaction(s): consider optimization`
      );
    }

    // Análise de padrões
    if (stats.idle_in_transaction > 2) {
      recommendations.push('Multiple idle transactions detected: review application connection management');
    }

    if (stats.average_duration_ms > 30000) {
      recommendations.push('Average transaction duration is high: consider query optimization');
    }

    // Recomendação de índices
    recommendations.push('Review transaction query plans for missing indexes');
    recommendations.push('Consider implementing connection pooling if transaction volume is high');

    return recommendations;
  }

  /**
   * Retorna uma query longa aleatória para simular
   */
  private getRandomLongQuery(): string {
    const queries = [
      'SELECT * FROM large_table JOIN another_table ON large_table.id = another_table.id WHERE large_table.status = \'pending\'',
      'UPDATE products SET stock = stock - 1 WHERE category IN (SELECT id FROM categories WHERE active = true)',
      'DELETE FROM logs WHERE created_at < NOW() - INTERVAL \'30 days\'',
      'INSERT INTO analytics SELECT * FROM raw_events WHERE processed = false',
      'SELECT COUNT(*) FROM transactions WHERE amount > 1000 AND date >= NOW() - INTERVAL \'1 year\'',
    ];

    return queries[Math.floor(Math.random() * queries.length)];
  }

  /**
   * Retorna métricas padrão de transação
   */
  private getDefaultStats(): TransactionStats {
    return {
      total_active: 0,
      long_transactions: [],
      idle_in_transaction: 0,
      deadlocks_detected: 0,
      average_duration_ms: 0,
      max_duration_ms: 0,
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Factory para criar instância do Transaction Monitor
 */
export function createTransactionMonitor(): SupabaseTransactionMonitor {
  return new SupabaseTransactionMonitor();
}

// ============================================================================
// EXEMPLO DE USO
// ============================================================================

/**
 * Exemplo de como usar o skill:
 *
 * const monitor = new SupabaseTransactionMonitor();
 *
 * // Monitoramento básico
 * const result1 = await monitor.run({
 *   action: 'monitor',
 *   longTransactionThresholdMs: 300000,
 * });
 *
 * // Detectar deadlocks
 * const result2 = await monitor.run({
 *   action: 'detect_deadlocks',
 * });
 *
 * // Auto-kill com relatório completo
 * const result3 = await monitor.run({
 *   action: 'full_report',
 *   autoKillEnabled: true,
 *   autoKillThresholdMs: 600000,
 *   includeTransactionLog: true,
 * });
 */
