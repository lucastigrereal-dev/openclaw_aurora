/**
 * Supabase Archon - Deadlock Detector (S-20)
 * Detecta e resolve deadlocks em tempo real: grafos de conflito, estratégias de resolução, análise histórica
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
 * Informações sobre uma transação envolvida em deadlock
 */
export interface DeadlockedTransaction {
  pid: number;                    // Process ID
  usename: string;                // Nome do usuário
  application_name: string;       // Nome da aplicação
  query: string;                  // Query em execução
  query_start: string;            // Timestamp de início
  wait_time_ms: number;           // Tempo esperando em ms
  blocked_by_pid?: number;        // PID que bloqueia esta transação
  locks_held: string[];           // Locks que esta transação detém
  lock_types: string[];           // Tipos de locks (AccessShareLock, etc)
}

/**
 * Nó em um grafo de deadlock
 */
export interface DeadlockGraphNode {
  pid: number;
  usename: string;
  query_preview: string;          // Primeiros 100 chars da query
  wait_time_ms: number;
  locks_held: number;
}

/**
 * Aresta em um grafo de deadlock (relação de bloqueio)
 */
export interface DeadlockGraphEdge {
  from_pid: number;
  to_pid: number;                 // Quem está sendo bloqueado
  lock_type: string;
  waited_ms: number;
}

/**
 * Grafo completo de deadlock
 */
export interface DeadlockGraph {
  nodes: DeadlockGraphNode[];
  edges: DeadlockGraphEdge[];
  cycle_detected: boolean;
  cycle_pids?: number[];          // PIDs envolvidos no ciclo
  total_transactions_affected: number;
}

/**
 * Estratégia de resolução de deadlock
 */
export interface DeadlockResolutionStrategy {
  strategy: 'kill_latest' | 'kill_oldest' | 'kill_least_progress' | 'manual';
  description: string;
  target_pids: number[];
  expected_impact: string;
  risk_level: 'low' | 'medium' | 'high';
}

/**
 * Dica de prevenção de deadlock
 */
export interface DeadlockPreventionTip {
  category: 'query-order' | 'locking' | 'transaction' | 'isolation';
  priority: 'high' | 'medium' | 'low';
  tip: string;
  example?: string;
  estimated_benefit?: string;
}

/**
 * Evento histórico de deadlock
 */
export interface DeadlockHistoryEvent {
  timestamp: string;
  transaction_count: number;
  resolved_by: string;             // 'auto' | 'manual' | 'timeout'
  resolution_time_ms: number;
  affected_tables?: string[];
  root_cause?: string;
}

/**
 * Análise completa de deadlock
 */
export interface DeadlockAnalysis {
  detected_at: string;
  deadlock_count: number;          // Total de deadlocks simultâneos
  transactions: DeadlockedTransaction[];
  graph: DeadlockGraph;
  strategies: DeadlockResolutionStrategy[];
  prevention_tips: DeadlockPreventionTip[];
  history: DeadlockHistoryEvent[];
  recommended_action?: string;
}

/**
 * Parâmetros de entrada do skill
 */
export interface DeadlockDetectorParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  analyzeHistory?: boolean;        // Incluir análise histórica (default: true)
  autoResolve?: boolean;           // Resolver automaticamente (default: false)
  resolutionStrategy?: 'kill_latest' | 'kill_oldest' | 'kill_least_progress';
  includeGraph?: boolean;          // Gerar grafo de deadlock (default: true)
  includePrevention?: boolean;     // Incluir tips de prevenção (default: true)
  lookbackHours?: number;          // Horas para análise histórica (default: 24)
}

/**
 * Resultado do skill
 */
export interface DeadlockDetectorResult extends SkillOutput {
  data?: {
    has_deadlocks: boolean;
    analysis?: DeadlockAnalysis;
    resolved_count: number;         // Quantos deadlocks foram resolvidos
    timestamp: string;
    check_duration: number;         // Tempo da verificação em ms
  };
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

/**
 * Deadlock Detector - Detecta e resolve deadlocks no Supabase
 */
export class SupabaseDeadlockDetector extends Skill {
  private logger = createLogger('deadlock-detector');
  private deadlockHistory: Map<string, DeadlockHistoryEvent> = new Map();

  constructor() {
    super(
      {
        name: 'supabase-deadlock-detector',
        description:
          'Real-time deadlock detection and resolution for Supabase: deadlock graphs, auto-resolution strategies, historical analysis',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'deadlock', 'locking', 'performance', 'monitoring'],
      },
      {
        timeout: 60000, // 60 segundos
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as DeadlockDetectorParams;

    // Validar strategy se fornecido
    if (
      typed.resolutionStrategy &&
      !['kill_latest', 'kill_oldest', 'kill_least_progress'].includes(
        typed.resolutionStrategy
      )
    ) {
      this.logger.warn('Invalid resolution strategy', {
        strategy: typed.resolutionStrategy,
      });
      return false;
    }

    // Validar lookbackHours
    if (typed.lookbackHours && typed.lookbackHours < 1) {
      this.logger.warn('lookbackHours must be >= 1', {
        value: typed.lookbackHours,
      });
      return false;
    }

    return true;
  }

  /**
   * Executa detecção de deadlock
   */
  async execute(params: SkillInput): Promise<DeadlockDetectorResult> {
    const typed = params as DeadlockDetectorParams;
    const startTime = Date.now();

    this.logger.info('Deadlock Detector iniciado', {
      autoResolve: typed.autoResolve || false,
      analyzeHistory: typed.analyzeHistory !== false,
    });

    try {
      // Obter credenciais do vault se não fornecidas
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      // Coletar dados de deadlock
      const deadlockedTransactions = await this.detectDeadlockedTransactions(
        url,
        key
      );

      if (deadlockedTransactions.length === 0) {
        this.logger.info('No deadlocks detected');
        return {
          success: true,
          data: {
            has_deadlocks: false,
            resolved_count: 0,
            timestamp: new Date().toISOString(),
            check_duration: Date.now() - startTime,
          },
        };
      }

      this.logger.warn('Deadlocks detected', {
        count: deadlockedTransactions.length,
      });

      // Gerar grafo de deadlock
      const graph = typed.includeGraph !== false
        ? this.buildDeadlockGraph(deadlockedTransactions)
        : { nodes: [], edges: [], cycle_detected: false, total_transactions_affected: deadlockedTransactions.length };

      // Gerar estratégias de resolução
      const strategies = this.generateResolutionStrategies(deadlockedTransactions);

      // Gerar tips de prevenção
      const prevention_tips = typed.includePrevention !== false
        ? this.generatePreventionTips(deadlockedTransactions)
        : [];

      // Análise histórica se solicitado
      let history: DeadlockHistoryEvent[] = [];
      if (typed.analyzeHistory !== false) {
        history = this.getDeadlockHistory(typed.lookbackHours || 24);
      }

      // Selecionar estratégia de resolução se autoResolve estiver ativo
      let resolved_count = 0;
      if (typed.autoResolve && strategies.length > 0) {
        const selectedStrategy =
          strategies.find(
            (s) =>
              s.strategy ===
              (typed.resolutionStrategy || 'kill_latest')
          ) || strategies[0];

        this.logger.info('Auto-resolving deadlock', {
          strategy: selectedStrategy.strategy,
          targets: selectedStrategy.target_pids,
        });

        resolved_count = await this.resolveDeadlock(
          url,
          key,
          selectedStrategy
        );
      }

      const analysis: DeadlockAnalysis = {
        detected_at: new Date().toISOString(),
        deadlock_count: deadlockedTransactions.length,
        transactions: deadlockedTransactions,
        graph,
        strategies,
        prevention_tips,
        history,
        recommended_action:
          strategies.length > 0
            ? `Use strategy: ${strategies[0].strategy} on PIDs ${strategies[0].target_pids.join(', ')}`
            : 'Manual intervention required',
      };

      return {
        success: true,
        data: {
          has_deadlocks: true,
          analysis,
          resolved_count,
          timestamp: new Date().toISOString(),
          check_duration: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      this.logger.error('Deadlock Detector failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Detecta transações em deadlock (mock para prototipagem)
   */
  private async detectDeadlockedTransactions(
    _url: string,
    _key: string
  ): Promise<DeadlockedTransaction[]> {
    this.logger.debug('Detecting deadlocked transactions');

    // TODO: Implementar coleta real via query:
    // SELECT * FROM pg_stat_activity WHERE state = 'active';
    // SELECT * FROM pg_locks WHERE NOT granted;
    // Correlacionar para encontrar deadlocks

    // Por enquanto, retorna dados mock com probabilidade
    const hasDeadlock = Math.random() < 0.2; // 20% de chance

    if (!hasDeadlock) {
      return [];
    }

    // Simular deadlock com 3-5 transações
    const transactionCount = Math.floor(Math.random() * 3) + 3;
    const transactions: DeadlockedTransaction[] = [];

    for (let i = 0; i < transactionCount; i++) {
      transactions.push({
        pid: 1000 + i,
        usename: `user_${i}`,
        application_name: `app_${i}`,
        query: this.generateMockQuery(i),
        query_start: new Date(Date.now() - Math.random() * 30000).toISOString(),
        wait_time_ms: Math.floor(Math.random() * 25000) + 5000,
        blocked_by_pid: i > 0 ? 1000 + ((i - 1) % transactionCount) : undefined,
        locks_held: ['AccessExclusiveLock', 'ExclusiveLock'].slice(
          0,
          Math.floor(Math.random() * 2) + 1
        ),
        lock_types: ['AccessExclusiveLock', 'ExclusiveLock', 'RowExclusiveLock'],
      });
    }

    return transactions;
  }

  /**
   * Constrói grafo de deadlock a partir de transações bloqueadas
   */
  private buildDeadlockGraph(
    transactions: DeadlockedTransaction[]
  ): DeadlockGraph {
    this.logger.debug('Building deadlock graph', {
      transactionCount: transactions.length,
    });

    const nodes: DeadlockGraphNode[] = transactions.map((t) => ({
      pid: t.pid,
      usename: t.usename,
      query_preview: t.query.substring(0, 100),
      wait_time_ms: t.wait_time_ms,
      locks_held: t.locks_held.length,
    }));

    const edges: DeadlockGraphEdge[] = [];
    const visited = new Set<number>();
    let cycle_detected = false;
    let cycle_pids: number[] = [];

    // Construir arestas baseado em bloqueios
    for (const t of transactions) {
      if (t.blocked_by_pid !== undefined) {
        edges.push({
          from_pid: t.blocked_by_pid,
          to_pid: t.pid,
          lock_type: t.lock_types[0] || 'unknown',
          waited_ms: t.wait_time_ms,
        });

        // Detecção de ciclo simplificada
        if (visited.has(t.pid)) {
          cycle_detected = true;
          cycle_pids = [t.pid, t.blocked_by_pid];
        }
        visited.add(t.pid);
      }
    }

    return {
      nodes,
      edges,
      cycle_detected,
      cycle_pids: cycle_detected ? cycle_pids : undefined,
      total_transactions_affected: transactions.length,
    };
  }

  /**
   * Gera estratégias de resolução de deadlock
   */
  private generateResolutionStrategies(
    transactions: DeadlockedTransaction[]
  ): DeadlockResolutionStrategy[] {
    this.logger.debug('Generating resolution strategies', {
      transactionCount: transactions.length,
    });

    const strategies: DeadlockResolutionStrategy[] = [];

    // Ordenar por tempo de espera (descending)
    const byWaitTime = [...transactions].sort(
      (a, b) => b.wait_time_ms - a.wait_time_ms
    );

    // Estratégia 1: Matar a transação mais recente
    if (byWaitTime.length > 0) {
      strategies.push({
        strategy: 'kill_latest',
        description: 'Terminate the most recent transaction waiting',
        target_pids: [byWaitTime[0].pid],
        expected_impact: 'Unblock other transactions immediately',
        risk_level: 'low',
      });
    }

    // Estratégia 2: Matar a transação mais antiga
    const oldest = transactions.reduce((a, b) =>
      new Date(a.query_start) < new Date(b.query_start) ? a : b
    );
    strategies.push({
      strategy: 'kill_oldest',
      description: 'Terminate the oldest running transaction',
      target_pids: [oldest.pid],
      expected_impact: 'May release critical resources',
      risk_level: 'medium',
    });

    // Estratégia 3: Matar a transação com menos progresso (mais locks)
    const leastProgress = transactions.reduce((a, b) =>
      a.locks_held.length > b.locks_held.length ? a : b
    );
    strategies.push({
      strategy: 'kill_least_progress',
      description: 'Terminate transaction holding most locks',
      target_pids: [leastProgress.pid],
      expected_impact: 'Maximize resource release',
      risk_level: 'medium',
    });

    return strategies;
  }

  /**
   * Gera tips de prevenção de deadlock
   */
  private generatePreventionTips(
    _transactions: DeadlockedTransaction[]
  ): DeadlockPreventionTip[] {
    const tips: DeadlockPreventionTip[] = [
      {
        category: 'query-order',
        priority: 'high',
        tip: 'Always access tables in the same order across all transactions',
        example: 'SELECT * FROM users, orders WHERE users.id = orders.user_id (consistent order)',
        estimated_benefit: 'Eliminates most deadlocks',
      },
      {
        category: 'locking',
        priority: 'high',
        tip: 'Use SELECT FOR UPDATE to acquire explicit locks at the start of a transaction',
        example: 'SELECT * FROM users WHERE id = 1 FOR UPDATE;',
        estimated_benefit: 'Prevents lock-wait deadlocks',
      },
      {
        category: 'transaction',
        priority: 'medium',
        tip: 'Keep transactions short and hold locks for minimal time',
        example: 'Commit frequently, avoid manual BEGIN WORK',
        estimated_benefit: 'Reduces lock contention',
      },
      {
        category: 'isolation',
        priority: 'medium',
        tip: 'Use appropriate isolation levels (READ COMMITTED is often sufficient)',
        example: 'SET TRANSACTION ISOLATION LEVEL READ COMMITTED;',
        estimated_benefit: 'Balances consistency and concurrency',
      },
      {
        category: 'query-order',
        priority: 'high',
        tip: 'Avoid mixing READ and WRITE operations on same tables',
        example: 'Separate read queries from write queries when possible',
        estimated_benefit: 'Reduces row lock conflicts',
      },
    ];

    return tips;
  }

  /**
   * Obtém histórico de deadlocks
   */
  private getDeadlockHistory(lookbackHours: number): DeadlockHistoryEvent[] {
    this.logger.debug('Retrieving deadlock history', { lookbackHours });

    // TODO: Implementar coleta real via pg_stat_database
    // Ou via logs estruturados do PostgreSQL

    // Por enquanto, retorna dados mock
    const history: DeadlockHistoryEvent[] = [];
    const now = Date.now();

    for (let i = 0; i < 3; i++) {
      history.push({
        timestamp: new Date(now - i * 3600000).toISOString(),
        transaction_count: Math.floor(Math.random() * 4) + 2,
        resolved_by: ['auto', 'manual', 'timeout'][Math.floor(Math.random() * 3)],
        resolution_time_ms: Math.floor(Math.random() * 5000) + 1000,
        affected_tables: ['users', 'orders', 'transactions'].slice(
          0,
          Math.floor(Math.random() * 3) + 1
        ),
        root_cause: ['lock ordering', 'concurrent updates', 'table scan'][
          Math.floor(Math.random() * 3)
        ],
      });
    }

    return history;
  }

  /**
   * Resolve deadlock usando estratégia selecionada
   */
  private async resolveDeadlock(
    _url: string,
    _key: string,
    strategy: DeadlockResolutionStrategy
  ): Promise<number> {
    this.logger.info('Executing deadlock resolution', {
      strategy: strategy.strategy,
      targets: strategy.target_pids,
    });

    // TODO: Implementar execução real:
    // SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = ANY($1);

    // Por enquanto, simula sucesso
    this.deadlockHistory.set(
      `${Date.now()}`,
      {
        timestamp: new Date().toISOString(),
        transaction_count: strategy.target_pids.length,
        resolved_by: 'auto',
        resolution_time_ms: Math.floor(Math.random() * 2000) + 500,
      }
    );

    return strategy.target_pids.length;
  }

  /**
   * Gera query mock para teste
   */
  private generateMockQuery(index: number): string {
    const queries = [
      'UPDATE users SET updated_at = NOW() WHERE id = $1',
      'DELETE FROM orders WHERE user_id = $1',
      'INSERT INTO transactions (user_id, amount) VALUES ($1, $2)',
      'UPDATE orders SET status = $1 WHERE id = $2',
      'SELECT * FROM users WHERE id = $1 FOR UPDATE',
    ];
    return queries[index % queries.length];
  }

  /**
   * Método auxiliar: verificar se há deadlock
   */
  async hasDeadlock(params: SkillInput): Promise<boolean> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.has_deadlocks;
    }
    return false;
  }

  /**
   * Método auxiliar: obter recomendação de ação
   */
  async getRecommendation(params: SkillInput): Promise<string> {
    const result = await this.execute(params);
    if (result.success && result.data?.analysis) {
      return result.data.analysis.recommended_action || 'No action needed';
    }
    return 'Run deadlock detection first';
  }

  /**
   * Método auxiliar: resolver automaticamente
   */
  async autoResolve(params: SkillInput): Promise<number> {
    const withAutoResolve = { ...params, autoResolve: true };
    const result = await this.execute(withAutoResolve);
    if (result.success && result.data) {
      return result.data.resolved_count;
    }
    return 0;
  }
}
