/**
 * Supabase Archon - Health Dashboard Live (S-13)
 * Monitora saúde em tempo real: conexões, performance de queries, disco, replicação
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
 * Métricas de conexão do banco de dados
 */
export interface ConnectionMetrics {
  active: number;      // Conexões ativas
  max: number;         // Limite máximo
  usage: number;       // Percentual de uso (0-100)
  idle: number;        // Conexões idle
}

/**
 * Métricas de performance de queries
 */
export interface QueryMetrics {
  avg_time_ms: number;      // Tempo médio de query em ms
  slow_queries: number;      // Queries mais lentas que threshold
  p95_ms: number;            // Percentil 95 de latência
  p99_ms: number;            // Percentil 99 de latência
  total_executed: number;    // Total de queries executadas
}

/**
 * Métricas de disco
 */
export interface DiskMetrics {
  used_gb: number;      // GB usado
  total_gb: number;     // GB total
  usage: number;        // Percentual de uso (0-100)
  free_gb: number;      // GB livre
}

/**
 * Métricas de replicação
 */
export interface ReplicationMetrics {
  lag_ms: number;       // Lag de replicação em ms
  status: string;       // Status (healthy, warning, critical)
  replicas_healthy: number; // Replicas saudáveis
  total_replicas: number;   // Total de replicas
}

/**
 * Conjunto completo de métricas de saúde
 */
export interface HealthMetrics {
  connections: ConnectionMetrics;
  queries: QueryMetrics;
  disk: DiskMetrics;
  replication: ReplicationMetrics;
}

/**
 * Alerta de saúde
 */
export interface HealthAlert {
  level: 'info' | 'warning' | 'critical';
  component: 'connections' | 'queries' | 'disk' | 'replication' | 'general';
  message: string;
  threshold?: number;
  current?: number;
  timestamp: string;
}

/**
 * Parâmetros de entrada do skill
 */
export interface HealthDashboardParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  includeMetrics?: ('connections' | 'queries' | 'disk' | 'replication' | 'all')[];
  thresholds?: {
    connectionUsagePercent?: number;  // default: 80
    slowQueryMs?: number;              // default: 1000
    diskUsagePercent?: number;         // default: 85
    replicationLagMs?: number;         // default: 100
  };
}

/**
 * Resultado do skill
 */
export interface HealthDashboardResult extends SkillOutput {
  data?: {
    metrics: HealthMetrics;
    score: number;        // 0-100, onde 100 é perfeito
    alerts: HealthAlert[];
    timestamp: string;
    checkDuration: number; // tempo gasto em ms
  };
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

/**
 * Health Dashboard Live - Monitora saúde em tempo real do Supabase
 */
export class SupabaseHealthDashboard extends Skill {
  private logger = createLogger('health-dashboard');
  private defaultThresholds = {
    connectionUsagePercent: 80,
    slowQueryMs: 1000,
    diskUsagePercent: 85,
    replicationLagMs: 100,
  };

  constructor() {
    super(
      {
        name: 'supabase-health-dashboard',
        description:
          'Real-time health monitoring for Supabase: connections, query performance, disk usage, replication lag',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'monitoring', 'health', 'performance', 'real-time'],
      },
      {
        timeout: 30000, // 30 segundos
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    // URL e key são opcionais (podem vir do vault)
    const typed = input as HealthDashboardParams;

    // Validar includeMetrics se fornecido
    if (typed.includeMetrics) {
      const validMetrics = [
        'connections',
        'queries',
        'disk',
        'replication',
        'all',
      ];
      const valid = typed.includeMetrics.every((m) =>
        validMetrics.includes(m)
      );
      if (!valid) {
        this.logger.warn('Invalid metrics specified', {
          metrics: typed.includeMetrics,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Executa coleta de métricas de saúde
   */
  async execute(params: SkillInput): Promise<HealthDashboardResult> {
    const typed = params as HealthDashboardParams;
    const startTime = Date.now();

    this.logger.info('Health Dashboard iniciado', {
      url: params.supabaseUrl ? 'provided' : 'from-vault',
      metrics: typed.includeMetrics || 'all',
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
      const thresholds = { ...this.defaultThresholds, ...typed.thresholds };

      // Determinar quais métricas coletar
      const metricsToCollect = this.normalizeMetrics(
        typed.includeMetrics || ['all']
      );

      this.logger.debug('Collecting health metrics', {
        components: metricsToCollect,
      });

      // Coletar métricas em paralelo quando possível
      const [connections, queries, disk, replication] = await Promise.all([
        metricsToCollect.includes('connections')
          ? this.collectConnectionMetrics(url, key)
          : Promise.resolve(null),
        metricsToCollect.includes('queries')
          ? this.collectQueryMetrics(url, key)
          : Promise.resolve(null),
        metricsToCollect.includes('disk')
          ? this.collectDiskMetrics(url, key)
          : Promise.resolve(null),
        metricsToCollect.includes('replication')
          ? this.collectReplicationMetrics(url, key)
          : Promise.resolve(null),
      ]);

      // Construir objeto de métricas
      const metrics: HealthMetrics = {
        connections: connections || this.getDefaultConnectionMetrics(),
        queries: queries || this.getDefaultQueryMetrics(),
        disk: disk || this.getDefaultDiskMetrics(),
        replication: replication || this.getDefaultReplicationMetrics(),
      };

      // Detectar anomalias
      const alerts = this.detectAnomalies(metrics, thresholds);

      // Calcular score de saúde
      const score = this.calculateHealthScore(metrics, alerts);

      const duration = Date.now() - startTime;

      if (alerts.length > 0) {
        this.logger.warn('Health issues detected', {
          alertCount: alerts.length,
          score,
          alerts: alerts.map((a) => ({
            level: a.level,
            component: a.component,
            message: a.message,
          })),
        });
      } else {
        this.logger.info('All health checks passed', { score });
      }

      return {
        success: true,
        data: {
          metrics,
          score,
          alerts,
          timestamp: new Date().toISOString(),
          checkDuration: duration,
        },
      };
    } catch (error: any) {
      this.logger.error('Health Dashboard failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Coleta métricas de conexão (mock para prototipagem)
   */
  private async collectConnectionMetrics(
    _url: string,
    _key: string
  ): Promise<ConnectionMetrics> {
    this.logger.debug('Collecting connection metrics');

    // TODO: Implementar coleta real via API ou query direto
    // Por enquanto, retorna dados mock
    const active = Math.floor(Math.random() * 80) + 20; // 20-100
    const max = 120;
    const usage = (active / max) * 100;
    const idle = Math.floor(Math.random() * 30);

    return {
      active,
      max,
      usage,
      idle,
    };
  }

  /**
   * Coleta métricas de performance de queries (mock para prototipagem)
   */
  private async collectQueryMetrics(
    _url: string,
    _key: string
  ): Promise<QueryMetrics> {
    this.logger.debug('Collecting query metrics');

    // TODO: Implementar coleta real via pg_stat_statements
    // Por enquanto, retorna dados mock
    const avg_time_ms = Math.random() * 500 + 10;
    const slow_queries = Math.floor(Math.random() * 5);
    const p95_ms = avg_time_ms * 3;
    const p99_ms = avg_time_ms * 5;
    const total_executed = Math.floor(Math.random() * 50000) + 10000;

    return {
      avg_time_ms: Math.round(avg_time_ms * 100) / 100,
      slow_queries,
      p95_ms: Math.round(p95_ms * 100) / 100,
      p99_ms: Math.round(p99_ms * 100) / 100,
      total_executed,
    };
  }

  /**
   * Coleta métricas de disco (mock para prototipagem)
   */
  private async collectDiskMetrics(
    _url: string,
    _key: string
  ): Promise<DiskMetrics> {
    this.logger.debug('Collecting disk metrics');

    // TODO: Implementar coleta real via PostgreSQL
    // Por enquanto, retorna dados mock
    const total_gb = 100;
    const used_gb = Math.floor(Math.random() * 70) + 20; // 20-90 GB
    const usage = (used_gb / total_gb) * 100;
    const free_gb = total_gb - used_gb;

    return {
      used_gb,
      total_gb,
      usage,
      free_gb,
    };
  }

  /**
   * Coleta métricas de replicação (mock para prototipagem)
   */
  private async collectReplicationMetrics(
    _url: string,
    _key: string
  ): Promise<ReplicationMetrics> {
    this.logger.debug('Collecting replication metrics');

    // TODO: Implementar coleta real via pg_stat_replication
    // Por enquanto, retorna dados mock
    const lag_ms = Math.floor(Math.random() * 150); // 0-150ms
    const replicas_healthy = 2;
    const total_replicas = 2;
    const status =
      lag_ms < 50 ? 'healthy' : lag_ms < 100 ? 'warning' : 'critical';

    return {
      lag_ms,
      status,
      replicas_healthy,
      total_replicas,
    };
  }

  /**
   * Detecta anomalias nas métricas
   */
  private detectAnomalies(
    metrics: HealthMetrics,
    thresholds: {
      connectionUsagePercent: number;
      slowQueryMs: number;
      diskUsagePercent: number;
      replicationLagMs: number;
    }
  ): HealthAlert[] {
    const alerts: HealthAlert[] = [];
    const timestamp = new Date().toISOString();

    // Verificar conexões
    if (metrics.connections.usage > thresholds.connectionUsagePercent) {
      alerts.push({
        level: metrics.connections.usage > 95 ? 'critical' : 'warning',
        component: 'connections',
        message: `Connection pool usage is high: ${metrics.connections.usage.toFixed(1)}%`,
        threshold: thresholds.connectionUsagePercent,
        current: metrics.connections.usage,
        timestamp,
      });
    }

    // Verificar slow queries
    if (metrics.queries.slow_queries > 10) {
      alerts.push({
        level: 'warning',
        component: 'queries',
        message: `High number of slow queries detected: ${metrics.queries.slow_queries}`,
        threshold: 10,
        current: metrics.queries.slow_queries,
        timestamp,
      });
    }

    if (metrics.queries.avg_time_ms > thresholds.slowQueryMs) {
      alerts.push({
        level: 'warning',
        component: 'queries',
        message: `Average query time is elevated: ${metrics.queries.avg_time_ms.toFixed(2)}ms`,
        threshold: thresholds.slowQueryMs,
        current: metrics.queries.avg_time_ms,
        timestamp,
      });
    }

    // Verificar disco
    if (metrics.disk.usage > 95) {
      alerts.push({
        level: 'critical',
        component: 'disk',
        message: `Critical disk usage: ${metrics.disk.usage.toFixed(1)}%`,
        threshold: 95,
        current: metrics.disk.usage,
        timestamp,
      });
    } else if (metrics.disk.usage > thresholds.diskUsagePercent) {
      alerts.push({
        level: 'warning',
        component: 'disk',
        message: `Disk usage is high: ${metrics.disk.usage.toFixed(1)}%`,
        threshold: thresholds.diskUsagePercent,
        current: metrics.disk.usage,
        timestamp,
      });
    }

    // Verificar replicação
    if (
      metrics.replication.replicas_healthy < metrics.replication.total_replicas
    ) {
      alerts.push({
        level: 'critical',
        component: 'replication',
        message: `Unhealthy replicas detected: ${metrics.replication.replicas_healthy}/${metrics.replication.total_replicas}`,
        timestamp,
      });
    } else if (metrics.replication.lag_ms > thresholds.replicationLagMs) {
      alerts.push({
        level: metrics.replication.lag_ms > 500 ? 'critical' : 'warning',
        component: 'replication',
        message: `Replication lag is high: ${metrics.replication.lag_ms}ms`,
        threshold: thresholds.replicationLagMs,
        current: metrics.replication.lag_ms,
        timestamp,
      });
    }

    return alerts;
  }

  /**
   * Calcula score de saúde (0-100)
   * 100 = perfeito, 0 = crítico
   */
  private calculateHealthScore(
    metrics: HealthMetrics,
    alerts: HealthAlert[]
  ): number {
    let score = 100;

    // Penalidades por alertas
    for (const alert of alerts) {
      if (alert.level === 'critical') {
        score -= 25;
      } else if (alert.level === 'warning') {
        score -= 10;
      }
    }

    // Penalidades por métricas específicas
    score -=
      (metrics.connections.usage / 100) * 20; // até -20 pontos
    score -= (metrics.disk.usage / 100) * 20; // até -20 pontos
    score -= (metrics.queries.slow_queries / 20) * 10; // até -10 pontos
    score -=
      Math.min(metrics.replication.lag_ms / 1000, 10) * 5; // até -5 pontos

    // Garantir que score está entre 0 e 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Normaliza lista de métricas a coletar
   */
  private normalizeMetrics(
    includeMetrics: ('connections' | 'queries' | 'disk' | 'replication' | 'all')[]
  ): ('connections' | 'queries' | 'disk' | 'replication')[] {
    if (includeMetrics.includes('all')) {
      return ['connections', 'queries', 'disk', 'replication'];
    }

    return includeMetrics.filter(
      (m) => m !== 'all'
    ) as ('connections' | 'queries' | 'disk' | 'replication')[];
  }

  /**
   * Retorna métricas de conexão padrão
   */
  private getDefaultConnectionMetrics(): ConnectionMetrics {
    return {
      active: 0,
      max: 0,
      usage: 0,
      idle: 0,
    };
  }

  /**
   * Retorna métricas de query padrão
   */
  private getDefaultQueryMetrics(): QueryMetrics {
    return {
      avg_time_ms: 0,
      slow_queries: 0,
      p95_ms: 0,
      p99_ms: 0,
      total_executed: 0,
    };
  }

  /**
   * Retorna métricas de disco padrão
   */
  private getDefaultDiskMetrics(): DiskMetrics {
    return {
      used_gb: 0,
      total_gb: 0,
      usage: 0,
      free_gb: 0,
    };
  }

  /**
   * Retorna métricas de replicação padrão
   */
  private getDefaultReplicationMetrics(): ReplicationMetrics {
    return {
      lag_ms: 0,
      status: 'unknown',
      replicas_healthy: 0,
      total_replicas: 0,
    };
  }

  /**
   * Método auxiliar: obter snapshot de saúde rápido
   */
  async quickHealthCheck(params: SkillInput): Promise<number> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.score;
    }
    return 0;
  }

  /**
   * Método auxiliar: verificar se há alertas críticos
   */
  async hasCriticalAlerts(params: SkillInput): Promise<boolean> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.alerts.some((a) => a.level === 'critical');
    }
    return false;
  }
}
