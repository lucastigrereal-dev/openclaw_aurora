/**
 * Supabase Archon - Rate Limiter (S-15)
 * Rate limiting para API e operações de banco de dados
 * Implementa algoritmos token bucket, sliding window e quotas por usuário/IP
 *
 * @version 1.0.0
 * @priority P2
 * @category UTIL
 * @status production-ready
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Configuração de rate limit
 */
export interface RateLimitConfig {
  capacity: number;        // Capacidade total do bucket (tokens)
  refillRate: number;      // Taxa de preenchimento (tokens/segundo)
  window: number;          // Janela de tempo em ms para sliding window
  maxRequests: number;     // Máximo de requests na janela
}

/**
 * Estado de um bucket de tokens
 */
export interface TokenBucket {
  tokens: number;          // Tokens disponíveis
  lastRefill: number;      // Timestamp do último refill
  capacity: number;        // Capacidade máxima
}

/**
 * Registro de requisição para sliding window
 */
export interface RequestRecord {
  timestamp: number;       // Timestamp da requisição
  cost: number;            // Custo em tokens
  source: string;          // IP ou ID do usuário
}

/**
 * Limite por usuário/IP
 */
export interface QuotaLimit {
  identifier: string;      // IP, ID de usuário, etc
  used: number;            // Tokens usados
  limit: number;           // Limite total
  window: number;          // Janela de tempo em ms
  resetAt: number;         // Quando reseta
}

/**
 * Análise de rate limiting
 */
export interface RateLimitAnalytics {
  totalRequests: number;
  blockedRequests: number;
  averageWaitTime: number;
  peakRequestRate: number;
  quotasExceeded: string[];
  topOffenders: Array<{
    identifier: string;
    violations: number;
  }>;
}

/**
 * Resultado de verificação de rate limit
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;    // Segundos para retry
}

/**
 * Parâmetros de entrada do skill
 */
export interface RateLimiterParams extends SkillInput {
  action?: 'check' | 'refill' | 'reset' | 'analytics' | 'configure';
  identifier?: string;     // IP ou ID do usuário
  cost?: number;           // Custo da operação em tokens
  limiter?: 'token-bucket' | 'sliding-window' | 'quota';
  config?: RateLimitConfig;
  includeAnalytics?: boolean;
}

/**
 * Resultado do skill
 */
export interface RateLimiterResult extends SkillOutput {
  data?: {
    check?: RateLimitCheckResult;
    analytics?: RateLimitAnalytics;
    message?: string;
    timestamp: string;
  };
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

/**
 * Rate Limiter - Implementa múltiplas estratégias de rate limiting
 */
export class SupabaseRateLimiter extends Skill {
  private logger = createLogger('rate-limiter');

  // Armazenamento de buckets de token
  private tokenBuckets: Map<string, TokenBucket> = new Map();

  // Armazenamento de janelas deslizantes
  private slidingWindows: Map<string, RequestRecord[]> = new Map();

  // Armazenamento de quotas
  private quotas: Map<string, QuotaLimit> = new Map();

  // Histórico de analytics
  private requestHistory: RequestRecord[] = [];
  private blockedRequests: number = 0;
  private requestTimes: number[] = [];

  // Configurações padrão
  private defaultConfigs: Record<
    'token-bucket' | 'sliding-window' | 'quota',
    RateLimitConfig
  > = {
    'token-bucket': {
      capacity: 1000,
      refillRate: 100, // tokens/segundo
      window: 1000,
      maxRequests: 100,
    },
    'sliding-window': {
      capacity: 500,
      refillRate: 50,
      window: 60000, // 1 minuto
      maxRequests: 500,
    },
    quota: {
      capacity: 10000,
      refillRate: 10,
      window: 86400000, // 24 horas
      maxRequests: 10000,
    },
  };

  constructor() {
    super(
      {
        name: 'supabase-rate-limiter',
        description:
          'Advanced rate limiting for Supabase APIs: token bucket, sliding window, per-user quotas, burst handling, and analytics',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: [
          'supabase',
          'rate-limiting',
          'token-bucket',
          'sliding-window',
          'quota',
          'api-protection',
        ],
      },
      {
        timeout: 5000,
        retries: 1,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as RateLimiterParams;

    // Validar action
    const validActions = [
      'check',
      'refill',
      'reset',
      'analytics',
      'configure',
    ];
    if (typed.action && !validActions.includes(typed.action)) {
      this.logger.warn('Invalid action specified', {
        action: typed.action,
      });
      return false;
    }

    // Validar limiter type
    const validLimiters = ['token-bucket', 'sliding-window', 'quota'];
    if (typed.limiter && !validLimiters.includes(typed.limiter)) {
      this.logger.warn('Invalid limiter type', {
        limiter: typed.limiter,
      });
      return false;
    }

    // Validar cost
    if (typed.cost !== undefined && (typed.cost < 1 || !Number.isInteger(typed.cost))) {
      this.logger.warn('Invalid cost value', { cost: typed.cost });
      return false;
    }

    return true;
  }

  /**
   * Executa operação de rate limiting
   */
  async execute(params: SkillInput): Promise<RateLimiterResult> {
    const typed = params as RateLimiterParams;
    const action = typed.action || 'check';
    const limiter = typed.limiter || 'token-bucket';
    const identifier = typed.identifier || 'default';
    const cost = typed.cost || 1;

    this.logger.info('Rate limiter action started', {
      action,
      limiter,
      identifier,
      cost,
    });

    try {
      let result: RateLimiterResult = {
        success: true,
        data: {
          timestamp: new Date().toISOString(),
        },
      };

      switch (action) {
        case 'check':
          result.data!.check = this.performCheck(
            identifier,
            cost,
            limiter
          );
          break;

        case 'refill':
          this.refillBucket(identifier, limiter);
          result.data!.message = `Bucket refilled for ${identifier}`;
          break;

        case 'reset':
          this.resetAllLimits(identifier, limiter);
          result.data!.message = `Rate limits reset for ${identifier}`;
          break;

        case 'analytics':
          result.data!.analytics = this.generateAnalytics();
          break;

        case 'configure':
          if (typed.config) {
            this.configureRateLimit(identifier, typed.config, limiter);
            result.data!.message = `Rate limit configured for ${identifier}`;
          }
          break;

        default:
          result.success = false;
          result.error = `Unknown action: ${action}`;
      }

      if (typed.includeAnalytics && action !== 'analytics') {
        result.data!.analytics = this.generateAnalytics();
      }

      this.logger.info('Rate limiter action completed', {
        action,
        success: result.success,
      });

      return result;
    } catch (error: any) {
      this.logger.error('Rate limiter failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Realiza verificação de rate limit
   */
  private performCheck(
    identifier: string,
    cost: number,
    limiterType: 'token-bucket' | 'sliding-window' | 'quota'
  ): RateLimitCheckResult {
    const timestamp = Date.now();

    this.logger.debug('Performing rate limit check', {
      identifier,
      cost,
      limiterType,
    });

    let result: RateLimitCheckResult;

    switch (limiterType) {
      case 'token-bucket':
        result = this.checkTokenBucket(identifier, cost);
        break;

      case 'sliding-window':
        result = this.checkSlidingWindow(identifier, cost);
        break;

      case 'quota':
        result = this.checkQuota(identifier, cost);
        break;

      default:
        result = { allowed: false, remaining: 0, resetAt: timestamp };
    }

    // Registrar no histórico
    if (result.allowed) {
      this.requestTimes.push(timestamp);
      this.requestHistory.push({
        timestamp,
        cost,
        source: identifier,
      });
    } else {
      this.blockedRequests++;
      if (result.retryAfter) {
        this.logger.warn('Request blocked', {
          identifier,
          retryAfter: result.retryAfter,
        });
      }
    }

    return result;
  }

  /**
   * Token Bucket: permite requisições até esgotar tokens
   * Tokens se regeneram ao longo do tempo
   */
  private checkTokenBucket(identifier: string, cost: number): RateLimitCheckResult {
    const config = this.defaultConfigs['token-bucket'];
    const now = Date.now();

    // Obter ou criar bucket
    let bucket = this.tokenBuckets.get(identifier);
    if (!bucket) {
      bucket = {
        tokens: config.capacity,
        lastRefill: now,
        capacity: config.capacity,
      };
      this.tokenBuckets.set(identifier, bucket);
    }

    // Calcular tokens regenerados
    const timePassed = (now - bucket.lastRefill) / 1000; // em segundos
    const tokensGenerated = timePassed * config.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensGenerated);
    bucket.lastRefill = now;

    // Verificar se há tokens suficientes
    const allowed = bucket.tokens >= cost;

    if (allowed) {
      bucket.tokens -= cost;
    }

    const resetAt = now + (bucket.capacity / config.refillRate) * 1000;

    return {
      allowed,
      remaining: Math.floor(bucket.tokens),
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil((cost - bucket.tokens) / config.refillRate),
    };
  }

  /**
   * Sliding Window: conta requisições em uma janela de tempo
   * Se exceder maxRequests na janela, bloqueia
   */
  private checkSlidingWindow(identifier: string, cost: number): RateLimitCheckResult {
    const config = this.defaultConfigs['sliding-window'];
    const now = Date.now();
    const windowStart = now - config.window;

    // Obter ou criar janela
    let window = this.slidingWindows.get(identifier);
    if (!window) {
      window = [];
      this.slidingWindows.set(identifier, window);
    }

    // Limpar requisições antigas
    const activeRequests = window.filter((r) => r.timestamp > windowStart);
    this.slidingWindows.set(identifier, activeRequests);

    // Contar custo total
    const totalCost = activeRequests.reduce((sum, r) => sum + r.cost, 0) + cost;
    const allowed = totalCost <= config.maxRequests;

    if (allowed) {
      activeRequests.push({
        timestamp: now,
        cost,
        source: identifier,
      });
    }

    const remaining = Math.max(0, config.maxRequests - totalCost);
    const resetAt = now + config.window;

    return {
      allowed,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil((config.window - (now - windowStart)) / 1000),
    };
  }

  /**
   * Quota: limite total por período (ex: 10k requisições por dia)
   */
  private checkQuota(identifier: string, cost: number): RateLimitCheckResult {
    const config = this.defaultConfigs.quota;
    const now = Date.now();

    // Obter ou criar quota
    let quota = this.quotas.get(identifier);
    if (!quota) {
      quota = {
        identifier,
        used: 0,
        limit: config.maxRequests,
        window: config.window,
        resetAt: now + config.window,
      };
      this.quotas.set(identifier, quota);
    }

    // Verificar se quota expirou
    if (now > quota.resetAt) {
      quota.used = 0;
      quota.resetAt = now + config.window;
    }

    const newUsage = quota.used + cost;
    const allowed = newUsage <= quota.limit;

    if (allowed) {
      quota.used = newUsage;
    }

    const remaining = Math.max(0, quota.limit - newUsage);
    const retryAfter = Math.ceil((quota.resetAt - now) / 1000);

    return {
      allowed,
      remaining,
      resetAt: quota.resetAt,
      retryAfter: allowed ? undefined : retryAfter,
    };
  }

  /**
   * Refill bucket para identifier
   */
  private refillBucket(
    identifier: string,
    limiterType: 'token-bucket' | 'sliding-window' | 'quota'
  ): void {
    const now = Date.now();

    this.logger.info('Refilling rate limit bucket', {
      identifier,
      limiterType,
    });

    if (limiterType === 'token-bucket') {
      const config = this.defaultConfigs['token-bucket'];
      this.tokenBuckets.set(identifier, {
        tokens: config.capacity,
        lastRefill: now,
        capacity: config.capacity,
      });
    } else if (limiterType === 'sliding-window') {
      this.slidingWindows.delete(identifier);
    } else if (limiterType === 'quota') {
      const config = this.defaultConfigs.quota;
      this.quotas.set(identifier, {
        identifier,
        used: 0,
        limit: config.maxRequests,
        window: config.window,
        resetAt: now + config.window,
      });
    }
  }

  /**
   * Reset todos os limites para um identifier
   */
  private resetAllLimits(
    identifier: string,
    limiterType: 'token-bucket' | 'sliding-window' | 'quota'
  ): void {
    this.logger.info('Resetting rate limits', {
      identifier,
      limiterType,
    });

    if (limiterType === 'token-bucket') {
      this.tokenBuckets.delete(identifier);
    } else if (limiterType === 'sliding-window') {
      this.slidingWindows.delete(identifier);
    } else if (limiterType === 'quota') {
      this.quotas.delete(identifier);
    }
  }

  /**
   * Configura limites customizados para identifier
   */
  private configureRateLimit(
    identifier: string,
    config: RateLimitConfig,
    limiterType: 'token-bucket' | 'sliding-window' | 'quota'
  ): void {
    this.logger.info('Configuring rate limit', {
      identifier,
      limiterType,
      config,
    });

    // Validar configuração
    if (config.capacity <= 0 || config.refillRate <= 0 || config.maxRequests <= 0) {
      throw new Error('Invalid rate limit configuration: values must be positive');
    }

    // Atualizar configuração padrão (para simplicidade)
    this.defaultConfigs[limiterType] = config;

    // Resetar limites existentes para aplicar nova config
    this.resetAllLimits(identifier, limiterType);
  }

  /**
   * Gera relatório de analytics
   */
  private generateAnalytics(): RateLimitAnalytics {
    const now = Date.now();
    const last60s = now - 60000;

    // Requisições nos últimos 60 segundos
    const recentRequests = this.requestHistory.filter(
      (r) => r.timestamp > last60s
    );

    // Taxa de pico
    const peakRate = recentRequests.length > 0 ? recentRequests.length / 60 : 0;

    // Quotas excedidas (mock data)
    const quotasExceeded: string[] = [];
    this.quotas.forEach((quota, identifier) => {
      if (quota.used > quota.limit * 0.8) {
        quotasExceeded.push(identifier);
      }
    });

    // Top offenders
    const offenderMap = new Map<string, number>();
    this.requestHistory.forEach((r) => {
      offenderMap.set(r.source, (offenderMap.get(r.source) || 0) + 1);
    });

    const topOffenders = Array.from(offenderMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([identifier, violations]) => ({
        identifier,
        violations,
      }));

    // Tempo médio de espera
    const avgWaitTime =
      this.requestTimes.length > 1
        ? this.requestTimes.reduce((sum, t, i) => {
            if (i === 0) return 0;
            return sum + (this.requestTimes[i] - this.requestTimes[i - 1]);
          }, 0) / (this.requestTimes.length - 1)
        : 0;

    this.logger.debug('Generated rate limit analytics', {
      totalRequests: this.requestHistory.length,
      blockedRequests: this.blockedRequests,
      peakRate,
      quotasExceeded: quotasExceeded.length,
    });

    return {
      totalRequests: this.requestHistory.length,
      blockedRequests: this.blockedRequests,
      averageWaitTime: Math.round(avgWaitTime),
      peakRequestRate: Math.round(peakRate * 100) / 100,
      quotasExceeded,
      topOffenders,
    };
  }

  /**
   * Método auxiliar: verificar se request é permitido
   */
  async isRequestAllowed(identifier: string, cost: number = 1): Promise<boolean> {
    const result = this.performCheck(identifier, cost, 'token-bucket');
    return result.allowed;
  }

  /**
   * Método auxiliar: obter tempo de reset
   */
  async getResetTime(identifier: string): Promise<number> {
    const bucket = this.tokenBuckets.get(identifier);
    if (!bucket) {
      return Date.now();
    }
    const config = this.defaultConfigs['token-bucket'];
    return Date.now() + (bucket.capacity / config.refillRate) * 1000;
  }

  /**
   * Método auxiliar: obter status dos limites
   */
  async getLimitStatus(identifier: string): Promise<{
    tokenBucket: number;
    slidingWindow: number;
    quota: number;
  }> {
    return {
      tokenBucket: this.tokenBuckets.get(identifier)?.tokens || 0,
      slidingWindow: this.slidingWindows.get(identifier)?.length || 0,
      quota: this.quotas.get(identifier)?.used || 0,
    };
  }
}
