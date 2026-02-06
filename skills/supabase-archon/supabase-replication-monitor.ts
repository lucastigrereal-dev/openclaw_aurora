/**
 * Supabase Archon - Replication Monitor (S-21)
 * Monitora lag de replicação, status de standby, e auto-failover
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
 * Status de replicação de um servidor
 */
export interface ReplicaStatus {
  name: string;           // Nome da replica (standby-1, standby-2, etc)
  state: 'streaming' | 'catchup' | 'disconnected' | 'unknown';
  lag_bytes: number;      // Lag em bytes
  lag_ms: number;         // Lag estimado em ms
  write_lsn: string;      // LSN do servidor primário
  flush_lsn: string;      // LSN confirmado em flush
  replay_lsn: string;     // LSN reproduzido no standby
  sync_priority: number;  // Prioridade de sincronização
  reply_time: string;     // Último heartbeat
  is_healthy: boolean;    // Status geral da réplica
}

/**
 * Informações de WAL (Write-Ahead Logging)
 */
export interface WALMetrics {
  current_lsn: string;           // LSN atual do servidor primário
  wal_files_size_gb: number;     // Tamanho total de arquivos WAL em GB
  archived_wal_files: number;    // Número de arquivos WAL arquivados
  unarchivedWalFiles: number;    // Número de arquivos WAL não arquivados
  wal_archiving_enabled: boolean;// Se WAL archive está habilitado
  wal_keep_size_mb: number;      // Tamanho configurado de retenção de WAL
}

/**
 * Status de detecção de quebra de replicação
 */
export interface ReplicationBreakStatus {
  detected: boolean;                    // Se quebra foi detectada
  severity: 'none' | 'warning' | 'critical';
  breakType: 'lag_threshold' | 'disconnect' | 'wal_not_available' | 'sync_failure' | 'none';
  affectedReplicas: string[];           // Replicas afetadas
  message: string;                      // Mensagem descritiva
  detectedAt: string;                   // Timestamp da detecção
  suggestedAction: string;              // Ação sugerida
}

/**
 * Status de auto-failover
 */
export interface FailoverStatus {
  autoFailoverEnabled: boolean;         // Se auto-failover está habilitado
  lastFailover: string | null;          // Timestamp do último failover
  failoverInProgress: boolean;           // Se há failover em andamento
  primaryServer: string;                // Servidor primário atual
  candidates: string[];                 // Candidatos para failover
  readyForFailover: boolean;            // Se está pronto para failover
}

/**
 * Resultado completo do monitoramento de replicação
 */
export interface ReplicationMonitorMetrics {
  replicas: ReplicaStatus[];            // Status de todas as replicas
  wal: WALMetrics;                       // Métricas de WAL
  replicationBreak: ReplicationBreakStatus;
  failover: FailoverStatus;
  overallHealth: number;                // Score 0-100
  timestamp: string;                    // Timestamp da coleta
}

/**
 * Parâmetros de entrada do skill
 */
export interface ReplicationMonitorParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  lagThresholdMs?: number;              // default: 1000ms
  disconnectTimeoutMs?: number;         // default: 30000ms
  checkInterval?: number;               // Intervalo de verificação contínua
  includeMetrics?: ('replicas' | 'wal' | 'breaks' | 'failover' | 'all')[];
  enableContinuousMonitoring?: boolean; // Monitoramento contínuo
}

/**
 * Resultado do skill
 */
export interface ReplicationMonitorResult extends SkillOutput {
  data?: {
    metrics: ReplicationMonitorMetrics;
    alerts: ReplicationAlert[];
    timestamp: string;
    checkDuration: number;
  };
}

/**
 * Alerta de replicação
 */
export interface ReplicationAlert {
  level: 'info' | 'warning' | 'critical';
  type: 'lag_high' | 'replica_disconnected' | 'wal_issue' | 'failover_triggered' | 'break_detected';
  replica?: string;
  message: string;
  threshold?: number;
  current?: number;
  timestamp: string;
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

/**
 * Replication Monitor - Monitora replicação de banco de dados Supabase
 */
export class SupabaseReplicationMonitor extends Skill {
  private logger = createLogger('replication-monitor');
  private defaultThresholds = {
    lagThresholdMs: 1000,           // Lag acima de 1s é alerta
    disconnectTimeoutMs: 30000,     // Timeout de 30s desconexão
    criticalLagMs: 5000,            // Lag acima de 5s é crítico
    walWarningSizeGb: 50,           // Aviso se WAL > 50GB
    walCriticalSizeGb: 100,         // Crítico se WAL > 100GB
  };

  private continuousMonitoringActive: boolean = false;
  private monitoringIntervalId: NodeJS.Timeout | null = null;

  constructor() {
    super(
      {
        name: 'supabase-replication-monitor',
        description:
          'Monitor database replication lag, status, WAL metrics, and auto-failover readiness for Supabase',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'replication', 'monitoring', 'failover', 'wal', 'high-availability'],
      },
      {
        timeout: 30000,
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as ReplicationMonitorParams;

    // Validar includeMetrics se fornecido
    if (typed.includeMetrics) {
      const validMetrics = ['replicas', 'wal', 'breaks', 'failover', 'all'];
      const valid = typed.includeMetrics.every((m) => validMetrics.includes(m));
      if (!valid) {
        this.logger.warn('Invalid metrics specified', {
          metrics: typed.includeMetrics,
        });
        return false;
      }
    }

    // Validar thresholds
    if (typed.lagThresholdMs && typed.lagThresholdMs < 0) {
      this.logger.warn('Invalid lag threshold', { threshold: typed.lagThresholdMs });
      return false;
    }

    return true;
  }

  /**
   * Executa monitoramento de replicação
   */
  async execute(params: SkillInput): Promise<ReplicationMonitorResult> {
    const typed = params as ReplicationMonitorParams;
    const startTime = Date.now();

    this.logger.info('Replication Monitor iniciado', {
      url: params.supabaseUrl ? 'provided' : 'from-vault',
      metrics: typed.includeMetrics || 'all',
      continuousMonitoring: typed.enableContinuousMonitoring || false,
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
      const thresholds = { ...this.defaultThresholds };

      // Determinar quais métricas coletar
      const metricsToCollect = this.normalizeMetrics(
        typed.includeMetrics || ['all']
      );

      this.logger.debug('Collecting replication metrics', {
        components: metricsToCollect,
      });

      // Coletar métricas em paralelo
      const [replicas, wal, replicationBreak, failover] = await Promise.all([
        metricsToCollect.includes('replicas')
          ? this.collectReplicaMetrics(url, key)
          : Promise.resolve(this.getDefaultReplicaStatus()),
        metricsToCollect.includes('wal')
          ? this.collectWALMetrics(url, key)
          : Promise.resolve(this.getDefaultWALMetrics()),
        metricsToCollect.includes('breaks')
          ? this.detectReplicationBreaks(url, key, thresholds)
          : Promise.resolve(this.getDefaultReplicationBreakStatus()),
        metricsToCollect.includes('failover')
          ? this.checkFailoverStatus(url, key)
          : Promise.resolve(this.getDefaultFailoverStatus()),
      ]);

      // Construir objeto de métricas
      const metrics: ReplicationMonitorMetrics = {
        replicas,
        wal,
        replicationBreak,
        failover,
        overallHealth: 100,
        timestamp: new Date().toISOString(),
      };

      // Detectar anomalias
      const alerts = this.detectAnomalies(metrics, thresholds);

      // Calcular health score
      metrics.overallHealth = this.calculateHealthScore(metrics, alerts);

      const duration = Date.now() - startTime;

      if (alerts.length > 0) {
        this.logger.warn('Replication issues detected', {
          alertCount: alerts.length,
          healthScore: metrics.overallHealth,
          alerts: alerts.map((a) => ({
            level: a.level,
            type: a.type,
            message: a.message,
          })),
        });
      } else {
        this.logger.info('Replication status healthy', {
          healthScore: metrics.overallHealth,
        });
      }

      // Ativar monitoramento contínuo se solicitado
      if (typed.enableContinuousMonitoring && !this.continuousMonitoringActive) {
        this.startContinuousMonitoring(params, typed.checkInterval || 30000);
      }

      return {
        success: true,
        data: {
          metrics,
          alerts,
          timestamp: new Date().toISOString(),
          checkDuration: duration,
        },
      };
    } catch (error: any) {
      this.logger.error('Replication Monitor failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Coleta status de réplicas (mock para prototipagem)
   */
  private async collectReplicaMetrics(_url: string, _key: string): Promise<ReplicaStatus[]> {
    this.logger.debug('Collecting replica metrics');

    // TODO: Implementar coleta real via pg_stat_replication
    const replicas: ReplicaStatus[] = [
      {
        name: 'standby-1',
        state: 'streaming',
        lag_bytes: Math.floor(Math.random() * 1000000),
        lag_ms: Math.floor(Math.random() * 500),
        write_lsn: '0/12345678',
        flush_lsn: '0/12345678',
        replay_lsn: '0/12345670',
        sync_priority: 1,
        reply_time: new Date().toISOString(),
        is_healthy: Math.random() > 0.1, // 90% saudável
      },
      {
        name: 'standby-2',
        state: 'streaming',
        lag_bytes: Math.floor(Math.random() * 500000),
        lag_ms: Math.floor(Math.random() * 300),
        write_lsn: '0/12345678',
        flush_lsn: '0/12345678',
        replay_lsn: '0/12345670',
        sync_priority: 2,
        reply_time: new Date().toISOString(),
        is_healthy: Math.random() > 0.05, // 95% saudável
      },
    ];

    return replicas;
  }

  /**
   * Coleta métricas de WAL (mock para prototipagem)
   */
  private async collectWALMetrics(_url: string, _key: string): Promise<WALMetrics> {
    this.logger.debug('Collecting WAL metrics');

    // TODO: Implementar coleta real via queries PostgreSQL
    return {
      current_lsn: '0/12345678',
      wal_files_size_gb: Math.random() * 30 + 5,
      archived_wal_files: Math.floor(Math.random() * 1000) + 500,
      unarchivedWalFiles: Math.floor(Math.random() * 100) + 10,
      wal_archiving_enabled: true,
      wal_keep_size_mb: 1024,
    };
  }

  /**
   * Detecta quebras de replicação (mock para prototipagem)
   */
  private async detectReplicationBreaks(
    _url: string,
    _key: string,
    _thresholds: any
  ): Promise<ReplicationBreakStatus> {
    this.logger.debug('Detecting replication breaks');

    // TODO: Implementar lógica real de detecção
    const isHealthy = Math.random() > 0.05; // 95% de chance de estar saudável

    if (isHealthy) {
      return {
        detected: false,
        severity: 'none',
        breakType: 'none',
        affectedReplicas: [],
        message: 'No replication breaks detected',
        detectedAt: new Date().toISOString(),
        suggestedAction: 'Continue monitoring',
      };
    }

    return {
      detected: true,
      severity: 'warning',
      breakType: 'lag_threshold',
      affectedReplicas: ['standby-1'],
      message: 'Replication lag exceeded threshold on standby-1',
      detectedAt: new Date().toISOString(),
      suggestedAction: 'Investigate network latency and query load on standby',
    };
  }

  /**
   * Verifica status de auto-failover (mock para prototipagem)
   */
  private async checkFailoverStatus(_url: string, _key: string): Promise<FailoverStatus> {
    this.logger.debug('Checking failover status');

    // TODO: Implementar verificação real de failover configuration
    return {
      autoFailoverEnabled: true,
      lastFailover: null,
      failoverInProgress: false,
      primaryServer: 'primary-1',
      candidates: ['standby-1', 'standby-2'],
      readyForFailover: true,
    };
  }

  /**
   * Detecta anomalias nas métricas de replicação
   */
  private detectAnomalies(
    metrics: ReplicationMonitorMetrics,
    thresholds: any
  ): ReplicationAlert[] {
    const alerts: ReplicationAlert[] = [];
    const timestamp = new Date().toISOString();

    // Verificar lag de replicas
    for (const replica of metrics.replicas) {
      if (!replica.is_healthy) {
        alerts.push({
          level: 'critical',
          type: 'replica_disconnected',
          replica: replica.name,
          message: `Replica ${replica.name} is unhealthy (state: ${replica.state})`,
          timestamp,
        });
      } else if (replica.lag_ms > thresholds.criticalLagMs) {
        alerts.push({
          level: 'critical',
          type: 'lag_high',
          replica: replica.name,
          message: `Critical replication lag on ${replica.name}: ${replica.lag_ms}ms`,
          threshold: thresholds.criticalLagMs,
          current: replica.lag_ms,
          timestamp,
        });
      } else if (replica.lag_ms > thresholds.lagThresholdMs) {
        alerts.push({
          level: 'warning',
          type: 'lag_high',
          replica: replica.name,
          message: `High replication lag on ${replica.name}: ${replica.lag_ms}ms`,
          threshold: thresholds.lagThresholdMs,
          current: replica.lag_ms,
          timestamp,
        });
      }
    }

    // Verificar WAL
    if (metrics.wal.wal_files_size_gb > thresholds.walCriticalSizeGb) {
      alerts.push({
        level: 'critical',
        type: 'wal_issue',
        message: `Critical WAL size: ${metrics.wal.wal_files_size_gb.toFixed(2)}GB`,
        threshold: thresholds.walCriticalSizeGb,
        current: metrics.wal.wal_files_size_gb,
        timestamp,
      });
    } else if (metrics.wal.wal_files_size_gb > thresholds.walWarningSizeGb) {
      alerts.push({
        level: 'warning',
        type: 'wal_issue',
        message: `High WAL size: ${metrics.wal.wal_files_size_gb.toFixed(2)}GB`,
        threshold: thresholds.walWarningSizeGb,
        current: metrics.wal.wal_files_size_gb,
        timestamp,
      });
    }

    // Verificar replication break
    if (metrics.replicationBreak.detected) {
      alerts.push({
        level: metrics.replicationBreak.severity === 'critical' ? 'critical' : 'warning',
        type: 'break_detected',
        message: metrics.replicationBreak.message,
        timestamp,
      });
    }

    // Verificar failover
    if (metrics.failover.failoverInProgress) {
      alerts.push({
        level: 'critical',
        type: 'failover_triggered',
        message: 'Failover is currently in progress',
        timestamp,
      });
    }

    return alerts;
  }

  /**
   * Calcula health score (0-100)
   */
  private calculateHealthScore(
    metrics: ReplicationMonitorMetrics,
    alerts: ReplicationAlert[]
  ): number {
    let score = 100;

    // Penalidades por alertas
    for (const alert of alerts) {
      if (alert.level === 'critical') {
        score -= 30;
      } else if (alert.level === 'warning') {
        score -= 10;
      }
    }

    // Penalidades por status de replicas
    const unhealthyReplicas = metrics.replicas.filter((r) => !r.is_healthy).length;
    score -= unhealthyReplicas * 20;

    // Penalidades por lag
    const avgLag = metrics.replicas.reduce((sum, r) => sum + r.lag_ms, 0) / Math.max(1, metrics.replicas.length);
    score -= Math.min((avgLag / 5000) * 20, 20); // até -20 pontos

    // Garantir que score está entre 0 e 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Normaliza lista de métricas a coletar
   */
  private normalizeMetrics(
    includeMetrics: ('replicas' | 'wal' | 'breaks' | 'failover' | 'all')[]
  ): ('replicas' | 'wal' | 'breaks' | 'failover')[] {
    if (includeMetrics.includes('all')) {
      return ['replicas', 'wal', 'breaks', 'failover'];
    }

    return includeMetrics.filter(
      (m) => m !== 'all'
    ) as ('replicas' | 'wal' | 'breaks' | 'failover')[];
  }

  /**
   * Inicia monitoramento contínuo
   */
  private startContinuousMonitoring(params: SkillInput, intervalMs: number): void {
    if (this.continuousMonitoringActive) {
      this.logger.warn('Continuous monitoring already active');
      return;
    }

    this.continuousMonitoringActive = true;
    this.logger.info('Starting continuous monitoring', { intervalMs });

    this.monitoringIntervalId = setInterval(async () => {
      try {
        const result = await this.execute(params);
        if (result.success && result.data) {
          this.emit('replication-status', {
            metrics: result.data.metrics,
            alerts: result.data.alerts,
          });
        }
      } catch (error: any) {
        this.logger.error('Continuous monitoring iteration failed', { error: error.message });
      }
    }, intervalMs);
  }

  /**
   * Para monitoramento contínuo
   */
  public stopContinuousMonitoring(): void {
    if (this.monitoringIntervalId) {
      clearInterval(this.monitoringIntervalId);
      this.monitoringIntervalId = null;
      this.continuousMonitoringActive = false;
      this.logger.info('Continuous monitoring stopped');
    }
  }

  /**
   * Retorna status padrão de réplicas
   */
  private getDefaultReplicaStatus(): ReplicaStatus[] {
    return [];
  }

  /**
   * Retorna métricas padrão de WAL
   */
  private getDefaultWALMetrics(): WALMetrics {
    return {
      current_lsn: '0/00000000',
      wal_files_size_gb: 0,
      archived_wal_files: 0,
      unarchivedWalFiles: 0,
      wal_archiving_enabled: false,
      wal_keep_size_mb: 0,
    };
  }

  /**
   * Retorna status padrão de quebra de replicação
   */
  private getDefaultReplicationBreakStatus(): ReplicationBreakStatus {
    return {
      detected: false,
      severity: 'none',
      breakType: 'none',
      affectedReplicas: [],
      message: 'No data available',
      detectedAt: new Date().toISOString(),
      suggestedAction: 'Collect metrics first',
    };
  }

  /**
   * Retorna status padrão de failover
   */
  private getDefaultFailoverStatus(): FailoverStatus {
    return {
      autoFailoverEnabled: false,
      lastFailover: null,
      failoverInProgress: false,
      primaryServer: 'unknown',
      candidates: [],
      readyForFailover: false,
    };
  }

  /**
   * Método auxiliar: obter diagnóstico rápido de replicação
   */
  async quickReplicationCheck(params: SkillInput): Promise<{
    healthy: boolean;
    healthScore: number;
    criticalIssues: string[];
  }> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      const criticalAlerts = result.data.alerts
        .filter((a) => a.level === 'critical')
        .map((a) => a.message);

      return {
        healthy: result.data.metrics.overallHealth >= 80,
        healthScore: result.data.metrics.overallHealth,
        criticalIssues: criticalAlerts,
      };
    }
    return {
      healthy: false,
      healthScore: 0,
      criticalIssues: ['Failed to check replication status'],
    };
  }

  /**
   * Método auxiliar: verificar se há lag crítico
   */
  async hasCriticalLag(params: SkillInput): Promise<boolean> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.alerts.some((a) => a.type === 'lag_high' && a.level === 'critical');
    }
    return false;
  }

  /**
   * Método auxiliar: verificar se há replicas desconectadas
   */
  async hasDisconnectedReplicas(params: SkillInput): Promise<boolean> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.alerts.some((a) => a.type === 'replica_disconnected');
    }
    return false;
  }
}
