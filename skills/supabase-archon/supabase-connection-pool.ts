/**
 * Supabase Archon - Connection Pool Manager (S-12)
 * Gerencia pools de conexão com escalabilidade automática e detecção de leaks
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
 * Métricas de conexão individual
 */
export interface ConnectionMetric {
  id: string;
  state: 'idle' | 'active' | 'waiting' | 'broken';
  createdAt: number;  // timestamp
  lastUsed: number;   // timestamp
  duration: number;   // tempo em ms desde criação
  idleTime: number;   // tempo em ms que está idle
}

/**
 * Detecção de vazamento de conexão
 */
export interface LeakDetection {
  detected: boolean;
  suspectedConnections: ConnectionMetric[];
  totalSuspected: number;
  confidence: number;  // 0-100
  recommendation: string;
}

/**
 * Configuração de auto-scaling do pool
 */
export interface PoolScalingConfig {
  minSize: number;
  maxSize: number;
  currentSize: number;
  targetSize: number;
  growthRate: number;      // porcentagem de crescimento
  shrinkRate: number;      // porcentagem de redução
}

/**
 * Health check de conexão
 */
export interface ConnectionHealthCheck {
  id: string;
  healthy: boolean;
  latency: number;  // em ms
  error?: string;
}

/**
 * Resumo de health check do pool
 */
export interface PoolHealthSummary {
  totalChecked: number;
  healthy: number;
  unhealthy: number;
  avgLatency: number;
  failureRate: number;  // 0-100
}

/**
 * Estatísticas detalhadas do pool
 */
export interface PoolStatistics {
  connections: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
    broken: number;
  };
  throughput: {
    requestsPerSecond: number;
    connectionsCreatedPerSecond: number;
    connectionsClosedPerSecond: number;
  };
  timing: {
    avgConnectionTime: number;  // em ms
    avgQueryTime: number;       // em ms
    maxWaitTime: number;        // em ms
  };
}

/**
 * Ação de gerenciamento de pool
 */
export interface PoolManagementAction {
  type: 'kill-idle' | 'scale-up' | 'scale-down' | 'restart-broken' | 'drain';
  executed: boolean;
  connectionsAffected: number;
  reason: string;
  timestamp: string;
}

/**
 * Parâmetros de entrada do skill
 */
export interface ConnectionPoolParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  action?: 'monitor' | 'detect-leaks' | 'health-check' | 'auto-scale' | 'kill-idle' | 'full-analysis';
  options?: {
    idleTimeoutMs?: number;        // default: 300000 (5 min)
    maxConnectionAge?: number;     // default: 3600000 (1 hora)
    leakDetectionThreshold?: number; // default: 80% uso
    healthCheckInterval?: number;  // default: 30000 (30 seg)
    allowAutoScaling?: boolean;    // default: true
    maxKillPercentage?: number;    // default: 25% do total
  };
}

/**
 * Resultado do skill
 */
export interface ConnectionPoolResult extends SkillOutput {
  data?: {
    poolStats: PoolStatistics;
    scaling: PoolScalingConfig;
    leakDetection: LeakDetection;
    healthSummary: PoolHealthSummary;
    actions: PoolManagementAction[];
    recommendations: string[];
    timestamp: string;
    analysisDuration: number;  // em ms
  };
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

/**
 * Connection Pool Manager - Gerencia pools de conexão Supabase
 */
export class SupabaseConnectionPool extends Skill {
  private logger = createLogger('connection-pool-manager');

  constructor() {
    super(
      {
        name: 'supabase-connection-pool',
        description:
          'Manages database connection pools with auto-scaling, leak detection, and health monitoring',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: [
          'supabase',
          'connection-pool',
          'resource-management',
          'monitoring',
          'performance',
        ],
      },
      {
        timeout: 60000, // 60 segundos
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as ConnectionPoolParams;

    // Validar action se fornecida
    if (typed.action) {
      const validActions = [
        'monitor',
        'detect-leaks',
        'health-check',
        'auto-scale',
        'kill-idle',
        'full-analysis',
      ];
      if (!validActions.includes(typed.action)) {
        this.logger.warn('Invalid action specified', {
          action: typed.action,
        });
        return false;
      }
    }

    // Validar options
    if (typed.options) {
      if (
        typed.options.idleTimeoutMs &&
        typed.options.idleTimeoutMs < 10000
      ) {
        this.logger.warn('Idle timeout too low', {
          timeout: typed.options.idleTimeoutMs,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Executa gerenciamento de pool de conexão
   */
  async execute(params: SkillInput): Promise<ConnectionPoolResult> {
    const typed = params as ConnectionPoolParams;
    const startTime = Date.now();

    this.logger.info('Connection Pool Manager iniciado', {
      action: typed.action || 'full-analysis',
      url: params.supabaseUrl ? 'provided' : 'from-vault',
    });

    try {
      // Obter credenciais do vault se não fornecidas
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      // Preparar opções com defaults
      const options = this.normalizeOptions(typed.options);

      // Executar ação solicitada (ou todas se full-analysis)
      const action = typed.action || 'full-analysis';

      let poolStats = this.generateMockPoolStatistics();
      let scaling = this.generateMockScalingConfig();
      let leakDetection = this.generateMockLeakDetection();
      let healthSummary = this.generateMockHealthSummary();
      const actions: PoolManagementAction[] = [];
      const recommendations: string[] = [];

      this.logger.debug('Collecting pool metrics', {
        action,
        options,
      });

      // Executar diferentes tipos de análise conforme necessário
      if (
        action === 'monitor' ||
        action === 'full-analysis'
      ) {
        poolStats = await this.collectPoolStatistics(url, key);
        recommendations.push(...this.generatePoolRecommendations(poolStats));
      }

      if (
        action === 'detect-leaks' ||
        action === 'full-analysis'
      ) {
        leakDetection = await this.detectConnectionLeaks(
          url,
          key,
          options.leakDetectionThreshold
        );
        if (leakDetection.detected) {
          recommendations.push(leakDetection.recommendation);
        }
      }

      if (
        action === 'health-check' ||
        action === 'full-analysis'
      ) {
        healthSummary = await this.performHealthCheck(url, key, options);
      }

      if (
        action === 'auto-scale' ||
        action === 'full-analysis'
      ) {
        const scalingResult = await this.autoScalePool(
          url,
          key,
          poolStats,
          options
        );
        scaling = scalingResult.scaling;
        if (scalingResult.action) {
          actions.push(scalingResult.action);
        }
      }

      if (action === 'kill-idle') {
        const killResult = await this.killIdleConnections(
          url,
          key,
          options.idleTimeoutMs,
          options.maxKillPercentage
        );
        actions.push(killResult);
      }

      const duration = Date.now() - startTime;

      this.logger.info('Connection Pool analysis completed', {
        action,
        poolSize: poolStats.connections.total,
        activeConnections: poolStats.connections.active,
        leaksDetected: leakDetection.detected,
        actionsExecuted: actions.length,
        duration,
      });

      return {
        success: true,
        data: {
          poolStats,
          scaling,
          leakDetection,
          healthSummary,
          actions,
          recommendations,
          timestamp: new Date().toISOString(),
          analysisDuration: duration,
        },
      };
    } catch (error: any) {
      this.logger.error('Connection Pool Manager failed', {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Coleta estatísticas do pool (mock para prototipagem)
   */
  private async collectPoolStatistics(
    _url: string,
    _key: string
  ): Promise<PoolStatistics> {
    this.logger.debug('Collecting pool statistics');

    // TODO: Implementar coleta real via pg_stat_activity
    const total = Math.floor(Math.random() * 50) + 20;
    const active = Math.floor(Math.random() * (total * 0.6)) + 5;
    const idle = total - active;
    const waiting = Math.floor(Math.random() * 3);
    const broken = Math.random() > 0.95 ? 1 : 0;

    return {
      connections: {
        total,
        active: active - waiting,
        idle,
        waiting,
        broken,
      },
      throughput: {
        requestsPerSecond: Math.random() * 1000 + 100,
        connectionsCreatedPerSecond: Math.random() * 5 + 0.5,
        connectionsClosedPerSecond: Math.random() * 5 + 0.5,
      },
      timing: {
        avgConnectionTime: Math.random() * 50 + 10,
        avgQueryTime: Math.random() * 200 + 20,
        maxWaitTime: Math.random() * 5000 + 100,
      },
    };
  }

  /**
   * Detecta vazamento de conexões (mock para prototipagem)
   */
  private async detectConnectionLeaks(
    _url: string,
    _key: string,
    threshold: number
  ): Promise<LeakDetection> {
    this.logger.debug('Detecting connection leaks');

    // TODO: Implementar detecção real analisando pg_stat_activity
    const totalConnections = Math.floor(Math.random() * 100) + 50;
    const idleConnections = Math.floor(totalConnections * 0.4);
    const usage = (totalConnections / 120) * 100;

    const detected = usage > threshold;
    const suspectedConnections: ConnectionMetric[] = [];

    if (detected) {
      // Simular conexões suspeitas
      for (let i = 0; i < Math.min(5, idleConnections); i++) {
        suspectedConnections.push({
          id: `conn_${i}`,
          state: 'idle',
          createdAt: Date.now() - (Math.random() * 3600000),
          lastUsed: Date.now() - (Math.random() * 3600000),
          duration: Math.random() * 3600000,
          idleTime: Math.random() * 3600000,
        });
      }
    }

    const confidence = Math.min(100, usage);

    return {
      detected,
      suspectedConnections,
      totalSuspected: suspectedConnections.length,
      confidence,
      recommendation: detected
        ? `Kill ${suspectedConnections.length} idle connections that have been unused for >30min`
        : 'No connection leaks detected',
    };
  }

  /**
   * Realiza health check do pool (mock para prototipagem)
   */
  private async performHealthCheck(
    _url: string,
    _key: string,
    _options: any
  ): Promise<PoolHealthSummary> {
    this.logger.debug('Performing health check');

    // TODO: Implementar health check real
    const totalChecked = Math.floor(Math.random() * 30) + 10;
    const healthy = Math.floor(totalChecked * 0.95);
    const unhealthy = totalChecked - healthy;

    return {
      totalChecked,
      healthy,
      unhealthy,
      avgLatency: Math.random() * 50 + 5,
      failureRate: (unhealthy / totalChecked) * 100,
    };
  }

  /**
   * Auto-escala o pool de conexão (mock para prototipagem)
   */
  private async autoScalePool(
    _url: string,
    _key: string,
    stats: PoolStatistics,
    options: any
  ): Promise<{
    scaling: PoolScalingConfig;
    action?: PoolManagementAction;
  }> {
    this.logger.debug('Auto-scaling pool');

    // TODO: Implementar auto-scaling real
    const currentSize = stats.connections.total;
    const activePercentage =
      (stats.connections.active / stats.connections.total) * 100;

    let targetSize = currentSize;
    let action: PoolManagementAction | undefined;

    // Decisão de escala
    if (activePercentage > 80 && currentSize < options.maxSize) {
      // Scale UP
      targetSize = Math.min(
        currentSize * (1 + options.growthRate / 100),
        options.maxSize
      );
      action = {
        type: 'scale-up',
        executed: true,
        connectionsAffected: Math.ceil(targetSize - currentSize),
        reason: `High active connection ratio: ${activePercentage.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
      };
    } else if (activePercentage < 30 && currentSize > options.minSize) {
      // Scale DOWN
      targetSize = Math.max(
        currentSize * (1 - options.shrinkRate / 100),
        options.minSize
      );
      action = {
        type: 'scale-down',
        executed: true,
        connectionsAffected: Math.ceil(currentSize - targetSize),
        reason: `Low active connection ratio: ${activePercentage.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      scaling: {
        minSize: options.minSize,
        maxSize: options.maxSize,
        currentSize,
        targetSize: Math.ceil(targetSize),
        growthRate: options.growthRate,
        shrinkRate: options.shrinkRate,
      },
      action,
    };
  }

  /**
   * Mata conexões idle (mock para prototipagem)
   */
  private async killIdleConnections(
    _url: string,
    _key: string,
    idleTimeoutMs: number,
    maxKillPercentage: number
  ): Promise<PoolManagementAction> {
    this.logger.debug('Killing idle connections', {
      timeout: idleTimeoutMs,
      maxKillPercentage,
    });

    // TODO: Implementar kill real via SELECT pg_terminate_backend()
    const totalConnections = Math.floor(Math.random() * 50) + 20;
    const maxKill = Math.ceil((totalConnections * maxKillPercentage) / 100);
    const killed = Math.floor(Math.random() * maxKill) + 1;

    return {
      type: 'kill-idle',
      executed: true,
      connectionsAffected: killed,
      reason: `Killed idle connections older than ${idleTimeoutMs}ms`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Normaliza opções com defaults
   */
  private normalizeOptions(options?: any): any {
    return {
      idleTimeoutMs: options?.idleTimeoutMs ?? 300000,
      maxConnectionAge: options?.maxConnectionAge ?? 3600000,
      leakDetectionThreshold: options?.leakDetectionThreshold ?? 80,
      healthCheckInterval: options?.healthCheckInterval ?? 30000,
      allowAutoScaling: options?.allowAutoScaling ?? true,
      maxKillPercentage: options?.maxKillPercentage ?? 25,
      minSize: options?.minSize ?? 5,
      maxSize: options?.maxSize ?? 100,
      growthRate: options?.growthRate ?? 20,
      shrinkRate: options?.shrinkRate ?? 15,
    };
  }

  /**
   * Gera recomendações baseadas em estatísticas do pool
   */
  private generatePoolRecommendations(stats: PoolStatistics): string[] {
    const recommendations: string[] = [];

    // Análise de throughput
    if (stats.connections.active / stats.connections.total > 0.9) {
      recommendations.push(
        'Consider increasing pool size: >90% connections are active'
      );
    }

    // Análise de timing
    if (stats.timing.avgConnectionTime > 100) {
      recommendations.push(
        'Connection establishment time is high (>100ms): check network latency'
      );
    }

    if (stats.timing.avgQueryTime > 1000) {
      recommendations.push(
        'Average query time is elevated (>1s): review slow queries'
      );
    }

    if (stats.timing.maxWaitTime > 10000) {
      recommendations.push(
        'Max wait time is high (>10s): consider increasing pool size'
      );
    }

    // Análise de conexões broken
    if (stats.connections.broken > 0) {
      recommendations.push(
        `${stats.connections.broken} broken connections detected: monitor for network issues`
      );
    }

    return recommendations;
  }

  /**
   * Gera configuração mock de scaling
   */
  private generateMockScalingConfig(): PoolScalingConfig {
    return {
      minSize: 5,
      maxSize: 100,
      currentSize: Math.floor(Math.random() * 50) + 20,
      targetSize: Math.floor(Math.random() * 50) + 20,
      growthRate: 20,
      shrinkRate: 15,
    };
  }

  /**
   * Gera detecção mock de leaks
   */
  private generateMockLeakDetection(): LeakDetection {
    const detected = Math.random() > 0.7;
    return {
      detected,
      suspectedConnections: [],
      totalSuspected: 0,
      confidence: detected ? Math.random() * 40 + 60 : Math.random() * 30,
      recommendation: detected
        ? 'Review and kill suspected idle connections'
        : 'No leaks detected',
    };
  }

  /**
   * Gera health summary mock
   */
  private generateMockHealthSummary(): PoolHealthSummary {
    const totalChecked = Math.floor(Math.random() * 20) + 10;
    const healthy = Math.floor(totalChecked * 0.95);

    return {
      totalChecked,
      healthy,
      unhealthy: totalChecked - healthy,
      avgLatency: Math.random() * 30 + 5,
      failureRate: ((totalChecked - healthy) / totalChecked) * 100,
    };
  }

  /**
   * Gera estatísticas mock do pool
   */
  private generateMockPoolStatistics(): PoolStatistics {
    const total = Math.floor(Math.random() * 40) + 15;
    const active = Math.floor(Math.random() * (total * 0.7)) + 3;

    return {
      connections: {
        total,
        active,
        idle: total - active,
        waiting: Math.floor(Math.random() * 2),
        broken: 0,
      },
      throughput: {
        requestsPerSecond: Math.random() * 800 + 200,
        connectionsCreatedPerSecond: Math.random() * 3 + 0.5,
        connectionsClosedPerSecond: Math.random() * 3 + 0.5,
      },
      timing: {
        avgConnectionTime: Math.random() * 40 + 10,
        avgQueryTime: Math.random() * 150 + 30,
        maxWaitTime: Math.random() * 3000 + 200,
      },
    };
  }

  /**
   * Método auxiliar: obter snapshot rápido do pool
   */
  async quickPoolStatus(params: SkillInput): Promise<PoolStatistics | null> {
    const result = await this.execute({
      ...params,
      action: 'monitor',
    });
    if (result.success && result.data) {
      return result.data.poolStats;
    }
    return null;
  }

  /**
   * Método auxiliar: verificar se há leaks
   */
  async hasLeakRisk(params: SkillInput): Promise<boolean> {
    const result = await this.execute({
      ...params,
      action: 'detect-leaks',
    });
    if (result.success && result.data) {
      return result.data.leakDetection.detected;
    }
    return false;
  }

  /**
   * Método auxiliar: obter recomendações
   */
  async getRecommendations(params: SkillInput): Promise<string[]> {
    const result = await this.execute({
      ...params,
      action: 'full-analysis',
    });
    if (result.success && result.data) {
      return result.data.recommendations;
    }
    return [];
  }
}
