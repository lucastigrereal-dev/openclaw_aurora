/**
 * Rate Limiter - Controle de taxa de requisições
 *
 * Implementa Token Bucket para proteger contra flood.
 * Especialmente importante para Telegram que tem limites rígidos.
 *
 * Limites do Telegram:
 * - 30 mensagens/segundo para grupos
 * - 1 mensagem/segundo para o mesmo chat
 * - 20 mensagens/minuto para o mesmo grupo
 */

import { EventEmitter } from 'events';

export class RateLimitError extends Error {
  constructor(
    public readonly limiterName: string,
    public readonly retryAfter: number,
    public readonly currentRate: number
  ) {
    super(`Rate limit exceeded for '${limiterName}'. Retry after ${retryAfter}ms`);
    this.name = 'RateLimitError';
  }
}

export interface RateLimiterOptions {
  name: string;
  rate: number;           // Tokens por segundo
  burst: number;          // Capacidade máxima (burst)
  perClientRate?: number; // Rate por cliente
  perClientBurst?: number;
}

export interface RateLimiterStats {
  name: string;
  rate: number;
  burst: number;
  availableTokens: number;
  totalRequests: number;
  acceptedRequests: number;
  rejectedRequests: number;
  currentRate: number;
  peakRate: number;
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly rate: number,
    private readonly burst: number
  ) {
    this.tokens = burst;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.burst, this.tokens + elapsed * this.rate);
    this.lastRefill = now;
  }

  acquire(tokens: number = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  getWaitTime(tokens: number = 1): number {
    this.refill();
    if (this.tokens >= tokens) return 0;
    const deficit = tokens - this.tokens;
    return Math.ceil((deficit / this.rate) * 1000);
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  reset(): void {
    this.tokens = this.burst;
    this.lastRefill = Date.now();
  }
}

export class RateLimiter extends EventEmitter {
  private globalBucket: TokenBucket;
  private clientBuckets = new Map<string, TokenBucket>();
  private requestTimes: number[] = [];

  // Estatísticas
  private totalRequests = 0;
  private acceptedRequests = 0;
  private rejectedRequests = 0;
  private peakRate = 0;

  constructor(private readonly options: RateLimiterOptions) {
    super();
    this.globalBucket = new TokenBucket(options.rate, options.burst);
  }

  private getClientBucket(clientId: string): TokenBucket {
    if (!this.clientBuckets.has(clientId)) {
      this.clientBuckets.set(clientId, new TokenBucket(
        this.options.perClientRate || this.options.rate,
        this.options.perClientBurst || this.options.burst
      ));
    }
    return this.clientBuckets.get(clientId)!;
  }

  private updateStats(accepted: boolean): void {
    this.totalRequests++;
    if (accepted) {
      this.acceptedRequests++;
      const now = Date.now();
      this.requestTimes.push(now);
      // Mantém últimos 60 segundos
      const cutoff = now - 60000;
      this.requestTimes = this.requestTimes.filter(t => t > cutoff);
      const currentRate = this.requestTimes.length / 60;
      this.peakRate = Math.max(this.peakRate, currentRate);
    } else {
      this.rejectedRequests++;
    }
  }

  /**
   * Tenta adquirir permissão.
   */
  acquire(clientId?: string, tokens: number = 1): boolean {
    // Verifica limite global
    if (!this.globalBucket.acquire(tokens)) {
      this.updateStats(false);
      this.emit('rejected', { clientId, reason: 'global_limit' });
      return false;
    }

    // Verifica limite por cliente
    if (clientId && this.options.perClientRate) {
      const clientBucket = this.getClientBucket(clientId);
      if (!clientBucket.acquire(tokens)) {
        // Devolve token global
        this.globalBucket.acquire(-tokens);
        this.updateStats(false);
        this.emit('rejected', { clientId, reason: 'client_limit' });
        return false;
      }
    }

    this.updateStats(true);
    this.emit('acquired', { clientId });
    return true;
  }

  /**
   * Adquire ou lança erro.
   */
  acquireOrThrow(clientId?: string, tokens: number = 1): void {
    if (!this.acquire(clientId, tokens)) {
      const waitTime = this.getWaitTime(clientId, tokens);
      throw new RateLimitError(
        this.options.name,
        waitTime,
        this.getCurrentRate()
      );
    }
  }

  /**
   * Aguarda até poder adquirir.
   */
  async acquireAsync(clientId?: string, tokens: number = 1, maxWait: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      if (this.acquire(clientId, tokens)) {
        return true;
      }

      const waitTime = Math.min(
        this.getWaitTime(clientId, tokens),
        maxWait - (Date.now() - startTime)
      );

      if (waitTime <= 0) break;

      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 100)));
    }

    return false;
  }

  /**
   * Wrapper para funções.
   */
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    getClientId?: (...args: Parameters<T>) => string
  ): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const clientId = getClientId?.(...args);
      await this.acquireAsync(clientId);
      return fn(...args);
    }) as T;
  }

  /**
   * Tempo de espera estimado.
   */
  getWaitTime(clientId?: string, tokens: number = 1): number {
    const globalWait = this.globalBucket.getWaitTime(tokens);

    if (clientId && this.options.perClientRate && this.clientBuckets.has(clientId)) {
      const clientWait = this.clientBuckets.get(clientId)!.getWaitTime(tokens);
      return Math.max(globalWait, clientWait);
    }

    return globalWait;
  }

  /**
   * Taxa atual de requisições/segundo.
   */
  getCurrentRate(): number {
    const now = Date.now();
    const cutoff = now - 1000;
    const recentRequests = this.requestTimes.filter(t => t > cutoff);
    return recentRequests.length;
  }

  /**
   * Tokens disponíveis.
   */
  getAvailableTokens(clientId?: string): number {
    if (clientId && this.clientBuckets.has(clientId)) {
      return Math.min(
        this.globalBucket.getAvailableTokens(),
        this.clientBuckets.get(clientId)!.getAvailableTokens()
      );
    }
    return this.globalBucket.getAvailableTokens();
  }

  /**
   * Retorna estatísticas.
   */
  getStats(): RateLimiterStats {
    return {
      name: this.options.name,
      rate: this.options.rate,
      burst: this.options.burst,
      availableTokens: this.globalBucket.getAvailableTokens(),
      totalRequests: this.totalRequests,
      acceptedRequests: this.acceptedRequests,
      rejectedRequests: this.rejectedRequests,
      currentRate: this.getCurrentRate(),
      peakRate: this.peakRate,
    };
  }

  /**
   * Reseta o rate limiter.
   */
  reset(): void {
    this.globalBucket.reset();
    this.clientBuckets.clear();
    this.totalRequests = 0;
    this.acceptedRequests = 0;
    this.rejectedRequests = 0;
    this.requestTimes = [];
    this.emit('reset');
  }

  /**
   * Reseta cliente específico.
   */
  resetClient(clientId: string): void {
    this.clientBuckets.delete(clientId);
  }
}

/**
 * Rate Limiters pré-configurados para serviços comuns.
 */
export const createTelegramLimiter = (name: string = 'telegram'): RateLimiter => {
  return new RateLimiter({
    name,
    rate: 25,              // 25 msgs/segundo (margem de segurança)
    burst: 30,             // Burst máximo
    perClientRate: 1,      // 1 msg/segundo por chat
    perClientBurst: 3,     // Pequeno burst por chat
  });
};

export const createClaudeLimiter = (name: string = 'claude'): RateLimiter => {
  return new RateLimiter({
    name,
    rate: 50,              // 50 req/segundo
    burst: 60,
  });
};

export const createGPTLimiter = (name: string = 'gpt'): RateLimiter => {
  return new RateLimiter({
    name,
    rate: 60,              // 60 req/minuto = 1/segundo
    burst: 10,
  });
};

export const createOllamaLimiter = (name: string = 'ollama'): RateLimiter => {
  return new RateLimiter({
    name,
    rate: 10,              // Ollama local - mais conservador
    burst: 5,
  });
};

/**
 * Gerenciador de Rate Limiters.
 */
export class RateLimiterManager {
  private limiters = new Map<string, RateLimiter>();

  getOrCreate(name: string, options?: Partial<RateLimiterOptions>): RateLimiter {
    if (!this.limiters.has(name)) {
      const rl = new RateLimiter({
        name,
        rate: options?.rate ?? 100,
        burst: options?.burst ?? 150,
        ...options,
      });
      this.limiters.set(name, rl);
    }
    return this.limiters.get(name)!;
  }

  get(name: string): RateLimiter | undefined {
    return this.limiters.get(name);
  }

  getAllStats(): RateLimiterStats[] {
    return Array.from(this.limiters.values()).map(rl => rl.getStats());
  }

  resetAll(): void {
    for (const rl of this.limiters.values()) {
      rl.reset();
    }
  }
}

export const rateLimiterManager = new RateLimiterManager();
