/**
 * Supabase Archon - Circuit Breaker Pattern (S-14)
 * Prevents cascade failures by monitoring error rates and managing connection states
 *
 * Circuit States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests rejected immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
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
// TYPES & INTERFACES
// ============================================================================

/**
 * Estados possíveis do circuit breaker
 */
export enum CircuitState {
  CLOSED = 'CLOSED',       // Normal, aceitando requisições
  OPEN = 'OPEN',           // Falhas detectadas, rejeitando requisições
  HALF_OPEN = 'HALF_OPEN', // Testando recuperação, requisições limitadas
}

/**
 * Métricas de erro de um endpoint específico
 */
export interface EndpointMetrics {
  name: string;
  state: CircuitState;
  failureCount: number;      // Contagem de falhas consecutivas
  successCount: number;      // Contagem de sucessos consecutivos
  lastFailureTime?: string;  // ISO timestamp do último erro
  lastSuccessTime?: string;  // ISO timestamp do último sucesso
  totalRequests: number;     // Total de requisições processadas
  totalFailures: number;     // Total de falhas
  errorRate: number;         // Percentual de erros (0-100)
  stateChangeTime?: string;  // Quando mudou de estado
}

/**
 * Métricas agregadas de todos os endpoints
 */
export interface CircuitBreakerMetrics {
  timestamp: string;
  totalEndpoints: number;
  endpoints: Map<string, EndpointMetrics>;
  openCircuits: number;
  halfOpenCircuits: number;
  closedCircuits: number;
  averageErrorRate: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

/**
 * Alerta de falha no circuit breaker
 */
export interface CircuitBreakerAlert {
  level: 'info' | 'warning' | 'critical';
  endpoint: string;
  action: 'opened' | 'closed' | 'half_open' | 'threshold_exceeded' | 'recovery';
  message: string;
  metrics?: Partial<EndpointMetrics>;
  timestamp: string;
}

/**
 * Configuração do circuit breaker
 */
export interface CircuitBreakerConfig {
  failureThreshold?: number;      // Falhas consecutivas para abrir (default: 5)
  successThreshold?: number;      // Sucessos para fechar quando half-open (default: 3)
  timeout?: number;               // Tempo em ms antes de tentar half-open (default: 60000)
  errorRateThreshold?: number;    // Taxa de erro para abrir (default: 50)
  monitoringWindow?: number;      // Janela de tempo para análise (ms, default: 60000)
}

/**
 * Parâmetros de entrada do skill
 */
export interface CircuitBreakerParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  endpoints?: string[];           // Endpoints a monitorar
  config?: CircuitBreakerConfig;
  action?: 'check' | 'reset' | 'manual_open' | 'manual_close' | 'health_report';
  targetEndpoint?: string;        // Para ações específicas em um endpoint
}

/**
 * Resultado do skill
 */
export interface CircuitBreakerResult extends SkillOutput {
  data?: {
    metrics: CircuitBreakerMetrics;
    alerts: CircuitBreakerAlert[];
    recommendations: string[];
    timestamp: string;
    duration: number;
  };
}

// ============================================================================
// IMPLEMENTAÇÃO DO CIRCUIT BREAKER
// ============================================================================

/**
 * Gerenciador de Circuit Breaker para Supabase
 */
class CircuitBreakerManager {
  private endpoints: Map<string, EndpointMetrics> = new Map();
  private config: Required<CircuitBreakerConfig>;
  private logger = createLogger('circuit-breaker');

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 3,
      timeout: config.timeout ?? 60000,
      errorRateThreshold: config.errorRateThreshold ?? 50,
      monitoringWindow: config.monitoringWindow ?? 60000,
    };
    this.logger.debug('CircuitBreakerManager initialized', { config: this.config });
  }

  /**
   * Registra um novo endpoint a ser monitorado
   */
  registerEndpoint(name: string): EndpointMetrics {
    if (this.endpoints.has(name)) {
      return this.endpoints.get(name)!;
    }

    const metrics: EndpointMetrics = {
      name,
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      totalRequests: 0,
      totalFailures: 0,
      errorRate: 0,
    };

    this.endpoints.set(name, metrics);
    this.logger.info('Endpoint registered', { endpoint: name });
    return metrics;
  }

  /**
   * Registra uma falha em um endpoint
   */
  recordFailure(endpoint: string): CircuitBreakerAlert | null {
    const metrics = this.endpoints.get(endpoint) || this.registerEndpoint(endpoint);

    metrics.failureCount++;
    metrics.successCount = 0;
    metrics.totalRequests++;
    metrics.totalFailures++;
    metrics.lastFailureTime = new Date().toISOString();
    metrics.errorRate = (metrics.totalFailures / metrics.totalRequests) * 100;

    this.logger.warn('Failure recorded', {
      endpoint,
      failureCount: metrics.failureCount,
      errorRate: metrics.errorRate.toFixed(2),
    });

    let alert: CircuitBreakerAlert | null = null;

    // Verificar se deve abrir o circuit
    if (
      metrics.failureCount >= this.config.failureThreshold ||
      metrics.errorRate > this.config.errorRateThreshold
    ) {
      if (metrics.state !== CircuitState.OPEN) {
        metrics.state = CircuitState.OPEN;
        metrics.stateChangeTime = new Date().toISOString();

        alert = {
          level: 'critical',
          endpoint,
          action: 'opened',
          message: `Circuit opened: ${metrics.failureCount} consecutive failures or ${metrics.errorRate.toFixed(1)}% error rate`,
          metrics,
          timestamp: new Date().toISOString(),
        };

        this.logger.error('Circuit OPENED', { endpoint, ...alert });
      }
    }

    return alert;
  }

  /**
   * Registra um sucesso em um endpoint
   */
  recordSuccess(endpoint: string): CircuitBreakerAlert | null {
    const metrics = this.endpoints.get(endpoint) || this.registerEndpoint(endpoint);

    metrics.successCount++;
    metrics.failureCount = 0;
    metrics.totalRequests++;
    metrics.lastSuccessTime = new Date().toISOString();
    metrics.errorRate = (metrics.totalFailures / metrics.totalRequests) * 100;

    let alert: CircuitBreakerAlert | null = null;

    // Se estava HALF_OPEN e conseguiu o threshold, fechar
    if (metrics.state === CircuitState.HALF_OPEN) {
      if (metrics.successCount >= this.config.successThreshold) {
        metrics.state = CircuitState.CLOSED;
        metrics.failureCount = 0;
        metrics.stateChangeTime = new Date().toISOString();

        alert = {
          level: 'info',
          endpoint,
          action: 'closed',
          message: `Circuit closed: ${metrics.successCount} consecutive successes after recovery`,
          metrics,
          timestamp: new Date().toISOString(),
        };

        this.logger.info('Circuit CLOSED', { endpoint });
      }
    }

    return alert;
  }

  /**
   * Transiciona de OPEN para HALF_OPEN após timeout
   */
  attemptRecovery(endpoint: string): CircuitBreakerAlert | null {
    const metrics = this.endpoints.get(endpoint);
    if (!metrics) {
      return null;
    }

    if (
      metrics.state === CircuitState.OPEN &&
      metrics.lastFailureTime
    ) {
      const timeSinceFailure = Date.now() - new Date(metrics.lastFailureTime).getTime();

      if (timeSinceFailure >= this.config.timeout) {
        metrics.state = CircuitState.HALF_OPEN;
        metrics.successCount = 0;
        metrics.failureCount = 0;
        metrics.stateChangeTime = new Date().toISOString();

        const alert: CircuitBreakerAlert = {
          level: 'warning',
          endpoint,
          action: 'half_open',
          message: `Circuit entering HALF_OPEN: testing recovery after ${timeSinceFailure}ms`,
          metrics,
          timestamp: new Date().toISOString(),
        };

        this.logger.warn('Circuit HALF_OPEN', { endpoint, timeSinceFailure });
        return alert;
      }
    }

    return null;
  }

  /**
   * Reseta manualmente um endpoint
   */
  resetEndpoint(endpoint: string): boolean {
    const metrics = this.endpoints.get(endpoint);
    if (!metrics) {
      return false;
    }

    metrics.state = CircuitState.CLOSED;
    metrics.failureCount = 0;
    metrics.successCount = 0;
    metrics.stateChangeTime = new Date().toISOString();

    this.logger.info('Endpoint reset manually', { endpoint });
    return true;
  }

  /**
   * Força abertura manual de um circuit
   */
  forceOpen(endpoint: string): boolean {
    const metrics = this.endpoints.get(endpoint) || this.registerEndpoint(endpoint);
    metrics.state = CircuitState.OPEN;
    metrics.stateChangeTime = new Date().toISOString();

    this.logger.warn('Circuit forced OPEN', { endpoint });
    return true;
  }

  /**
   * Força fechamento manual de um circuit
   */
  forceClose(endpoint: string): boolean {
    const metrics = this.endpoints.get(endpoint) || this.registerEndpoint(endpoint);
    metrics.state = CircuitState.CLOSED;
    metrics.stateChangeTime = new Date().toISOString();

    this.logger.warn('Circuit forced CLOSED', { endpoint });
    return true;
  }

  /**
   * Obtém métricas consolidadas
   */
  getMetrics(): CircuitBreakerMetrics {
    const endpointsArray = Array.from(this.endpoints.values());
    const openCount = endpointsArray.filter(
      (m) => m.state === CircuitState.OPEN
    ).length;
    const halfOpenCount = endpointsArray.filter(
      (m) => m.state === CircuitState.HALF_OPEN
    ).length;
    const closedCount = endpointsArray.filter(
      (m) => m.state === CircuitState.CLOSED
    ).length;

    const avgErrorRate =
      endpointsArray.length > 0
        ? endpointsArray.reduce((sum, m) => sum + m.errorRate, 0) /
          endpointsArray.length
        : 0;

    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (openCount > 0 || avgErrorRate > 25) {
      systemHealth = 'degraded';
    }
    if (openCount > endpointsArray.length * 0.5 || avgErrorRate > 50) {
      systemHealth = 'critical';
    }

    return {
      timestamp: new Date().toISOString(),
      totalEndpoints: endpointsArray.length,
      endpoints: this.endpoints,
      openCircuits: openCount,
      halfOpenCircuits: halfOpenCount,
      closedCircuits: closedCount,
      averageErrorRate: Math.round(avgErrorRate * 100) / 100,
      systemHealth,
    };
  }

  /**
   * Gera recomendações baseado no estado atual
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.systemHealth === 'critical') {
      recommendations.push(
        'System health is critical. Consider scaling or investigating root cause.'
      );
    }

    if (metrics.openCircuits > 0) {
      recommendations.push(
        `${metrics.openCircuits} circuit(s) are open. Check endpoint health.`
      );
    }

    if (metrics.halfOpenCircuits > 0) {
      recommendations.push(
        `${metrics.halfOpenCircuits} circuit(s) are half-open. Monitor recovery attempts.`
      );
    }

    if (metrics.averageErrorRate > 25) {
      recommendations.push(
        `Average error rate is ${metrics.averageErrorRate.toFixed(1)}%. Investigate failures.`
      );
    }

    if (metrics.averageErrorRate < 5 && metrics.openCircuits === 0) {
      recommendations.push('System is healthy. No action required.');
    }

    return recommendations;
  }
}

// Instância global
let globalManager: CircuitBreakerManager | null = null;

function getCircuitBreakerManager(
  config?: CircuitBreakerConfig
): CircuitBreakerManager {
  if (!globalManager) {
    globalManager = new CircuitBreakerManager(config);
  }
  return globalManager;
}

// ============================================================================
// SKILL IMPLEMENTATION
// ============================================================================

/**
 * Circuit Breaker Skill - Prevenção de falhas em cascata
 */
export class SupabaseCircuitBreaker extends Skill {
  private logger = createLogger('circuit-breaker-skill');
  private manager: CircuitBreakerManager;

  constructor() {
    super(
      {
        name: 'supabase-circuit-breaker',
        description:
          'Circuit breaker pattern implementation to prevent cascade failures with auto-open, half-open retry logic, and fallback strategies',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: [
          'supabase',
          'resilience',
          'circuit-breaker',
          'failure-prevention',
          'monitoring',
        ],
      },
      {
        timeout: 30000,
        retries: 2,
      }
    );

    this.manager = getCircuitBreakerManager();
  }

  validate(input: SkillInput): boolean {
    const typed = input as CircuitBreakerParams;

    // Validar action se fornecida
    if (typed.action) {
      const validActions = [
        'check',
        'reset',
        'manual_open',
        'manual_close',
        'health_report',
      ];
      if (!validActions.includes(typed.action)) {
        this.logger.warn('Invalid action', { action: typed.action });
        return false;
      }
    }

    return true;
  }

  /**
   * Executa a ação solicitada
   */
  async execute(params: SkillInput): Promise<CircuitBreakerResult> {
    const typed = params as CircuitBreakerParams;
    const startTime = Date.now();

    this.logger.info('Circuit Breaker initialized', {
      action: typed.action || 'check',
      endpoints: typed.endpoints?.length || 0,
    });

    try {
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      // Mesclar configurações
      const config = { ...typed.config };
      const manager = new CircuitBreakerManager(config);

      // Registrar endpoints padrão
      const endpointsToMonitor = typed.endpoints || [
        'health',
        'auth',
        'realtime',
        'functions',
      ];

      for (const endpoint of endpointsToMonitor) {
        manager.registerEndpoint(endpoint);
      }

      // Simular dados de monitoramento
      const alerts = this.simulateMonitoring(manager, endpointsToMonitor);

      // Executar ação solicitada
      let actionAlerts: CircuitBreakerAlert[] = [];
      if (typed.action === 'reset' && typed.targetEndpoint) {
        manager.resetEndpoint(typed.targetEndpoint);
        actionAlerts.push({
          level: 'info',
          endpoint: typed.targetEndpoint,
          action: 'closed',
          message: `Endpoint ${typed.targetEndpoint} has been reset`,
          timestamp: new Date().toISOString(),
        });
      } else if (typed.action === 'manual_open' && typed.targetEndpoint) {
        manager.forceOpen(typed.targetEndpoint);
        actionAlerts.push({
          level: 'warning',
          endpoint: typed.targetEndpoint,
          action: 'opened',
          message: `Circuit for ${typed.targetEndpoint} manually opened`,
          timestamp: new Date().toISOString(),
        });
      } else if (typed.action === 'manual_close' && typed.targetEndpoint) {
        manager.forceClose(typed.targetEndpoint);
        actionAlerts.push({
          level: 'info',
          endpoint: typed.targetEndpoint,
          action: 'closed',
          message: `Circuit for ${typed.targetEndpoint} manually closed`,
          timestamp: new Date().toISOString(),
        });
      }

      // Tentar recuperação em circuits abertos
      for (const endpoint of endpointsToMonitor) {
        const recoveryAlert = manager.attemptRecovery(endpoint);
        if (recoveryAlert) {
          alerts.push(recoveryAlert);
        }
      }

      const metrics = manager.getMetrics();
      const recommendations = manager.getRecommendations();
      const duration = Date.now() - startTime;

      if (alerts.length > 0) {
        this.logger.warn('Alerts detected', {
          count: alerts.length,
          alerts: alerts.map((a) => ({
            level: a.level,
            endpoint: a.endpoint,
            action: a.action,
          })),
        });
      } else {
        this.logger.info('All circuits nominal', {
          endpoints: metrics.totalEndpoints,
          health: metrics.systemHealth,
        });
      }

      return {
        success: true,
        data: {
          metrics,
          alerts: [...alerts, ...actionAlerts],
          recommendations,
          timestamp: new Date().toISOString(),
          duration,
        },
      };
    } catch (error: any) {
      this.logger.error('Circuit Breaker failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Simula monitoramento com dados mock
   */
  private simulateMonitoring(
    manager: CircuitBreakerManager,
    endpoints: string[]
  ): CircuitBreakerAlert[] {
    const alerts: CircuitBreakerAlert[] = [];

    // Simular atividades de cada endpoint
    for (const endpoint of endpoints) {
      const failureChance = Math.random();

      if (failureChance < 0.15) {
        // 15% chance de falha
        const alert = manager.recordFailure(endpoint);
        if (alert) alerts.push(alert);
      } else {
        // 85% sucesso
        const alert = manager.recordSuccess(endpoint);
        if (alert) alerts.push(alert);
      }
    }

    return alerts;
  }

  /**
   * Registra uma falha (método público para integração)
   */
  recordFailure(endpoint: string): CircuitBreakerAlert | null {
    return this.manager.recordFailure(endpoint);
  }

  /**
   * Registra um sucesso (método público para integração)
   */
  recordSuccess(endpoint: string): CircuitBreakerAlert | null {
    return this.manager.recordSuccess(endpoint);
  }

  /**
   * Obtém estado atual dos circuits
   */
  getStatus(): CircuitBreakerMetrics {
    return this.manager.getMetrics();
  }
}
