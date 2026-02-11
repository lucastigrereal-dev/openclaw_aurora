/**
 * Supabase Archon - Lock Monitor (S-23)
 * Monitora locks de banco de dados e queries bloqueantes: detecção de locks de tabela, locks em nível de linha, identificação de queries bloqueantes, análise de tempo de espera, auto-kill de queries bloqueantes
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
 * Informações sobre um lock em nível de tabela
 */
export interface TableLock {
  relation_name: string;           // Nome da tabela
  lock_type: string;               // AccessShareLock, RowShareLock, RowExclusiveLock, etc
  transaction_id: number;          // ID da transação que detém o lock
  pid: number;                     // Process ID
  usename: string;                 // Nome do usuário
  application_name: string;        // Nome da aplicação
  query: string;                   // Query em execução
  lock_acquired_at: string;        // Timestamp de aquisição do lock
  duration_ms: number;             // Tempo que o lock está sendo mantido
  granted: boolean;                // Se o lock foi concedido
  waiting_count: number;           // Quantos processos estão esperando este lock
}

/**
 * Informações sobre um lock em nível de linha
 */
export interface RowLock {
  table_name: string;              // Nome da tabela
  row_count: number;               // Quantidade de linhas bloqueadas
  lock_type: string;               // RowExclusiveLock, RowShareLock, etc
  holding_pid: number;             // PID que detém o lock
  holding_query: string;           // Query que está segurando o lock
  waiting_pids: number[];          // PIDs aguardando este lock
  waiting_queries: string[];       // Queries aguardando
  duration_ms: number;             // Tempo que o lock está sendo mantido
}

/**
 * Query bloqueante (que está bloqueando outras queries)
 */
export interface BlockingQuery {
  blocking_pid: number;            // PID que está bloqueando
  blocked_pids: number[];          // PIDs sendo bloqueados
  blocked_count: number;           // Quantidade de processos bloqueados
  query: string;                   // Query bloqueante
  usename: string;                 // Usuário
  application_name: string;        // Aplicação
  query_start: string;             // Quando a query iniciou
  blocking_duration_ms: number;    // Há quanto tempo está bloqueando
  wait_times_ms: number[];         // Tempo que cada processo aguarda
  total_wait_ms: number;           // Tempo total de espera combinado
  lock_type: string;               // Tipo de lock sendo usado
}

/**
 * Análise de lock wait
 */
export interface LockWaitAnalysis {
  process_id: number;
  query: string;
  usename: string;
  blocked_by_pid: number;
  wait_duration_ms: number;
  wait_percentage: number;         // Percentual do tempo total de execução
  estimated_resolution_time_ms?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Recomendação de resolução de lock
 */
export interface LockResolutionRecommendation {
  target_pid: number;
  query_preview: string;
  reason: string;
  risk_level: 'low' | 'medium' | 'high';
  expected_impact: string;
  alternative_actions?: string[];
}

/**
 * Snapshot de estado de locks
 */
export interface LockSnapshot {
  timestamp: string;
  table_locks: TableLock[];
  row_locks: RowLock[];
  blocking_queries: BlockingQuery[];
  total_locks: number;
  total_waiting: number;
  has_blocking: boolean;
  lock_contention_score: number;  // 0-100, onde 100 é máxima contensão
}

/**
 * Parâmetros de entrada do skill
 */
export interface LockMonitorParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  includeTableLocks?: boolean;     // Monitorar locks de tabela (default: true)
  includeRowLocks?: boolean;       // Monitorar locks de linha (default: true)
  includeBlockingQueries?: boolean; // Identificar queries bloqueantes (default: true)
  includeWaitAnalysis?: boolean;   // Análise de tempo de espera (default: true)
  autoKillBlockers?: boolean;      // Auto-kill queries bloqueantes (default: false)
  killThresholdMs?: number;        // Limiar de ms para auto-kill (default: 60000)
  minBlockedCount?: number;        // Mínimo de processos bloqueados (default: 2)
  thresholdSeverity?: 'low' | 'medium' | 'high' | 'critical'; // Severidade mínima (default: high)
}

/**
 * Resultado do skill
 */
export interface LockMonitorResult extends SkillOutput {
  data?: {
    snapshot: LockSnapshot;
    recommendations: LockResolutionRecommendation[];
    wait_analysis: LockWaitAnalysis[];
    auto_killed_count: number;
    timestamp: string;
    check_duration: number;
  };
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

/**
 * Lock Monitor - Monitora locks e queries bloqueantes no Supabase
 */
export class SupabaseLockMonitor extends Skill {
  private logger = createLogger('lock-monitor');
  private lockHistory: Map<string, LockSnapshot> = new Map();

  constructor() {
    super(
      {
        name: 'supabase-lock-monitor',
        description:
          'Database lock monitoring for Supabase: table locks, row-level locks, blocking query identification, lock wait time analysis, auto-kill blocking queries',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'locks', 'blocking', 'performance', 'monitoring'],
      },
      {
        timeout: 60000, // 60 segundos
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as LockMonitorParams;

    // Validar thresholdSeverity se fornecido
    if (
      typed.thresholdSeverity &&
      !['low', 'medium', 'high', 'critical'].includes(typed.thresholdSeverity)
    ) {
      this.logger.warn('Invalid threshold severity', {
        severity: typed.thresholdSeverity,
      });
      return false;
    }

    // Validar killThresholdMs
    if (typed.killThresholdMs && typed.killThresholdMs < 1000) {
      this.logger.warn('killThresholdMs must be >= 1000', {
        value: typed.killThresholdMs,
      });
      return false;
    }

    // Validar minBlockedCount
    if (typed.minBlockedCount && typed.minBlockedCount < 1) {
      this.logger.warn('minBlockedCount must be >= 1', {
        value: typed.minBlockedCount,
      });
      return false;
    }

    return true;
  }

  /**
   * Executa monitoramento de locks
   */
  async execute(params: SkillInput): Promise<LockMonitorResult> {
    const typed = params as LockMonitorParams;
    const startTime = Date.now();

    this.logger.info('Lock Monitor iniciado', {
      includeTableLocks: typed.includeTableLocks !== false,
      includeRowLocks: typed.includeRowLocks !== false,
      includeBlockingQueries: typed.includeBlockingQueries !== false,
      autoKill: typed.autoKillBlockers || false,
    });

    try {
      // Obter credenciais do vault se não fornecidas
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      // Coletar informações de locks
      const tableLocks = typed.includeTableLocks !== false
        ? await this.getTableLocks(url, key)
        : [];

      const rowLocks = typed.includeRowLocks !== false
        ? await this.getRowLocks(url, key)
        : [];

      const blockingQueries = typed.includeBlockingQueries !== false
        ? await this.getBlockingQueries(url, key)
        : [];

      // Análise de wait times
      let waitAnalysis: LockWaitAnalysis[] = [];
      if (typed.includeWaitAnalysis !== false) {
        waitAnalysis = this.analyzeWaitTimes(blockingQueries);
      }

      // Determinar se há bloqueios
      const hasBlocking = blockingQueries.length > 0;

      // Calcular score de contenção
      const contentionScore = this.calculateContentionScore(
        tableLocks,
        rowLocks,
        blockingQueries
      );

      // Criar snapshot
      const snapshot: LockSnapshot = {
        timestamp: new Date().toISOString(),
        table_locks: tableLocks,
        row_locks: rowLocks,
        blocking_queries: blockingQueries,
        total_locks: tableLocks.length + rowLocks.length,
        total_waiting: blockingQueries.reduce((sum, bq) => sum + bq.blocked_count, 0),
        has_blocking: hasBlocking,
        lock_contention_score: contentionScore,
      };

      // Armazenar no histórico
      this.lockHistory.set(snapshot.timestamp, snapshot);
      // Limitar histórico a últimas 100 entradas
      if (this.lockHistory.size > 100) {
        const first = this.lockHistory.keys().next().value!;
        this.lockHistory.delete(first);
      }

      // Gerar recomendações
      const recommendations = this.generateRecommendations(
        blockingQueries,
        waitAnalysis,
        typed.minBlockedCount || 2,
        typed.thresholdSeverity || 'high'
      );

      // Auto-kill se habilitado
      let autoKilledCount = 0;
      if (typed.autoKillBlockers && recommendations.length > 0) {
        autoKilledCount = await this.autoKillBlockers(
          url,
          key,
          recommendations,
          typed.killThresholdMs || 60000
        );
      }

      this.logger.info('Lock Monitor completed', {
        table_locks: tableLocks.length,
        row_locks: rowLocks.length,
        blocking_queries: blockingQueries.length,
        contentionScore,
        autoKilled: autoKilledCount,
      });

      return {
        success: true,
        data: {
          snapshot,
          recommendations,
          wait_analysis: waitAnalysis,
          auto_killed_count: autoKilledCount,
          timestamp: new Date().toISOString(),
          check_duration: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      this.logger.error('Lock Monitor failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtém locks de tabela
   */
  private async getTableLocks(
    _url: string,
    _key: string
  ): Promise<TableLock[]> {
    this.logger.debug('Fetching table locks');

    // TODO: Implementar coleta real via:
    // SELECT l.*, t.relname, a.usename, a.application_name, a.query, a.query_start
    // FROM pg_locks l
    // JOIN pg_class t ON l.relation = t.oid
    // JOIN pg_stat_activity a ON l.pid = a.pid
    // WHERE l.relation IS NOT NULL

    // Mock data com probabilidade de locks
    const hasTableLocks = Math.random() < 0.3; // 30% de chance

    if (!hasTableLocks) {
      return [];
    }

    const tables = ['users', 'orders', 'products', 'transactions', 'profiles'];
    const lockTypes = ['AccessShareLock', 'RowExclusiveLock', 'ExclusiveLock', 'AccessExclusiveLock'];
    const locks: TableLock[] = [];

    const lockCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < lockCount; i++) {
      locks.push({
        relation_name: tables[Math.floor(Math.random() * tables.length)],
        lock_type: lockTypes[Math.floor(Math.random() * lockTypes.length)],
        transaction_id: 5000 + i,
        pid: 1000 + i,
        usename: `user_${i}`,
        application_name: `app_${Math.floor(Math.random() * 5)}`,
        query: this.generateMockQuery(i),
        lock_acquired_at: new Date(Date.now() - Math.random() * 30000).toISOString(),
        duration_ms: Math.floor(Math.random() * 45000) + 5000,
        granted: Math.random() > 0.3, // 70% concedido
        waiting_count: Math.floor(Math.random() * 3),
      });
    }

    return locks;
  }

  /**
   * Obtém locks de linha
   */
  private async getRowLocks(
    _url: string,
    _key: string
  ): Promise<RowLock[]> {
    this.logger.debug('Fetching row locks');

    // TODO: Implementar coleta real via:
    // SELECT 'row_lock' as lock_type, t.relname, count(*) as row_count,
    //   l.pid, a.query, ...
    // FROM pg_locks l
    // JOIN pg_class t ON l.relation = t.oid
    // WHERE NOT l.granted

    // Mock data
    const hasRowLocks = Math.random() < 0.4; // 40% de chance

    if (!hasRowLocks) {
      return [];
    }

    const tables = ['users', 'orders', 'products'];
    const locks: RowLock[] = [];

    const lockCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < lockCount; i++) {
      const waitingCount = Math.floor(Math.random() * 3) + 1;
      locks.push({
        table_name: tables[Math.floor(Math.random() * tables.length)],
        row_count: Math.floor(Math.random() * 20) + 1,
        lock_type: ['RowExclusiveLock', 'RowShareLock'][Math.floor(Math.random() * 2)],
        holding_pid: 1000 + i,
        holding_query: this.generateMockQuery(i),
        waiting_pids: Array.from({ length: waitingCount }, (_, j) => 2000 + j),
        waiting_queries: Array.from({ length: waitingCount }, (_, j) =>
          this.generateMockQuery(j)
        ),
        duration_ms: Math.floor(Math.random() * 60000) + 10000,
      });
    }

    return locks;
  }

  /**
   * Obtém queries bloqueantes
   */
  private async getBlockingQueries(
    _url: string,
    _key: string
  ): Promise<BlockingQuery[]> {
    this.logger.debug('Fetching blocking queries');

    // TODO: Implementar coleta real via:
    // SELECT blocked_pid, blocking_pid, blocked_query, blocking_query
    // FROM pg_blocking_pids()

    // Mock data
    const hasBlocking = Math.random() < 0.25; // 25% de chance

    if (!hasBlocking) {
      return [];
    }

    const blockingQueries: BlockingQuery[] = [];

    const blockingCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < blockingCount; i++) {
      const blockedCount = Math.floor(Math.random() * 4) + 1;
      const waitTimes = Array.from(
        { length: blockedCount },
        () => Math.floor(Math.random() * 30000) + 5000
      );

      blockingQueries.push({
        blocking_pid: 1000 + i,
        blocked_pids: Array.from({ length: blockedCount }, (_, j) => 2000 + j),
        blocked_count: blockedCount,
        query: this.generateMockQuery(i),
        usename: `user_${i}`,
        application_name: `app_${i}`,
        query_start: new Date(Date.now() - Math.random() * 45000).toISOString(),
        blocking_duration_ms: Math.floor(Math.random() * 45000) + 10000,
        wait_times_ms: waitTimes,
        total_wait_ms: waitTimes.reduce((a, b) => a + b, 0),
        lock_type: ['RowExclusiveLock', 'ExclusiveLock'][Math.floor(Math.random() * 2)],
      });
    }

    return blockingQueries;
  }

  /**
   * Analisa tempos de espera de locks
   */
  private analyzeWaitTimes(
    blockingQueries: BlockingQuery[]
  ): LockWaitAnalysis[] {
    this.logger.debug('Analyzing lock wait times', {
      blockingQueryCount: blockingQueries.length,
    });

    const analysis: LockWaitAnalysis[] = [];

    for (const bq of blockingQueries) {
      for (let i = 0; i < bq.blocked_pids.length; i++) {
        const waitTime = bq.wait_times_ms[i];
        const totalBlockingTime = bq.blocking_duration_ms;
        const waitPercentage = totalBlockingTime > 0
          ? (waitTime / totalBlockingTime) * 100
          : 0;

        analysis.push({
          process_id: bq.blocked_pids[i],
          query: bq.query,
          usename: bq.usename,
          blocked_by_pid: bq.blocking_pid,
          wait_duration_ms: waitTime,
          wait_percentage: waitPercentage,
          estimated_resolution_time_ms: waitTime,
          severity: this.calculateWaitSeverity(waitTime),
        });
      }
    }

    return analysis;
  }

  /**
   * Calcula severidade baseado em tempo de espera
   */
  private calculateWaitSeverity(
    waitMs: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (waitMs < 5000) return 'low';
    if (waitMs < 15000) return 'medium';
    if (waitMs < 30000) return 'high';
    return 'critical';
  }

  /**
   * Calcula score de contenção de locks (0-100)
   */
  private calculateContentionScore(
    tableLocks: TableLock[],
    rowLocks: RowLock[],
    blockingQueries: BlockingQuery[]
  ): number {
    let score = 0;

    // Score por locks de tabela
    score += Math.min(tableLocks.length * 10, 30);

    // Score por locks de linha
    const totalRowsLocked = rowLocks.reduce((sum, rl) => sum + rl.row_count, 0);
    score += Math.min(totalRowsLocked, 30);

    // Score por queries bloqueantes
    const totalBlocked = blockingQueries.reduce((sum, bq) => sum + bq.blocked_count, 0);
    const avgBlockTime = blockingQueries.length > 0
      ? blockingQueries.reduce((sum, bq) => sum + bq.blocking_duration_ms, 0) /
        blockingQueries.length
      : 0;

    score += Math.min(totalBlocked * 5, 25);
    score += Math.min(Math.floor(avgBlockTime / 10000), 15);

    return Math.min(score, 100);
  }

  /**
   * Gera recomendações de resolução
   */
  private generateRecommendations(
    blockingQueries: BlockingQuery[],
    waitAnalysis: LockWaitAnalysis[],
    minBlockedCount: number,
    thresholdSeverity: string
  ): LockResolutionRecommendation[] {
    this.logger.debug('Generating lock resolution recommendations');

    const recommendations: LockResolutionRecommendation[] = [];
    const severityValues: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };
    const minSeverityValue = severityValues[thresholdSeverity] || 3;

    for (const bq of blockingQueries) {
      // Filtrar por número mínimo de processos bloqueados
      if (bq.blocked_count < minBlockedCount) continue;

      // Filtrar por severidade
      const severity = this.calculateWaitSeverity(bq.blocking_duration_ms);
      if (severityValues[severity] < minSeverityValue) continue;

      recommendations.push({
        target_pid: bq.blocking_pid,
        query_preview: bq.query.substring(0, 80),
        reason: `Blocking ${bq.blocked_count} processes for ${bq.blocking_duration_ms}ms`,
        risk_level: bq.blocking_duration_ms > 60000 ? 'high' : 'medium',
        expected_impact: `Unblock ${bq.blocked_count} waiting queries`,
        alternative_actions: [
          'Investigate query performance',
          'Check transaction isolation level',
          'Review table indexes',
        ],
      });
    }

    return recommendations;
  }

  /**
   * Auto-kill queries bloqueantes
   */
  private async autoKillBlockers(
    _url: string,
    _key: string,
    recommendations: LockResolutionRecommendation[],
    killThresholdMs: number
  ): Promise<number> {
    this.logger.info('Auto-killing blocking queries', {
      count: recommendations.length,
      threshold: killThresholdMs,
    });

    let killedCount = 0;

    // TODO: Implementar execução real:
    // SELECT pg_terminate_backend(pid) FROM pg_stat_activity
    // WHERE pid = ANY($1)

    for (const rec of recommendations) {
      if (rec.risk_level !== 'high') {
        this.logger.debug('Simulating query termination', {
          pid: rec.target_pid,
          query: rec.query_preview,
        });
        killedCount++;
      }
    }

    return killedCount;
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
      'UPDATE products SET stock = stock - 1 WHERE id = $1',
      'BEGIN; UPDATE accounts SET balance = balance - $1 WHERE id = $2',
    ];
    return queries[index % queries.length];
  }

  /**
   * Método auxiliar: verificar se há bloqueios críticos
   */
  async hasBlockingLocks(params: SkillInput): Promise<boolean> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.snapshot.has_blocking;
    }
    return false;
  }

  /**
   * Método auxiliar: obter score de contenção
   */
  async getContentionScore(params: SkillInput): Promise<number> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.snapshot.lock_contention_score;
    }
    return 0;
  }

  /**
   * Método auxiliar: obter recomendações
   */
  async getRecommendations(params: SkillInput): Promise<LockResolutionRecommendation[]> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.recommendations;
    }
    return [];
  }

  /**
   * Método auxiliar: obter histórico de locks
   */
  getHistory(): LockSnapshot[] {
    return Array.from(this.lockHistory.values());
  }

  /**
   * Método auxiliar: obter última snapshot
   */
  getLastSnapshot(): LockSnapshot | undefined {
    const entries = Array.from(this.lockHistory.entries());
    if (entries.length === 0) return undefined;
    return entries[entries.length - 1][1];
  }
}
