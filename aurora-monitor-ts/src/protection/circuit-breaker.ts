/**
 * Circuit Breaker - Proteção contra falhas em cascata
 *
 * Implementa o padrão Circuit Breaker para proteger chamadas
 * a serviços externos (Telegram, Claude, GPT, Ollama).
 *
 * Estados:
 * - CLOSED: Funcionando normal, passando requisições
 * - OPEN: Falhas detectadas, bloqueando requisições
 * - HALF_OPEN: Testando se serviço voltou
 */

import { EventEmitter } from 'events';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold: number;      // Falhas para abrir o circuito
  successThreshold: number;      // Sucessos para fechar o circuito
  timeout: number;               // Tempo em OPEN antes de testar (ms)
  resetTimeout?: number;         // Tempo para resetar contadores (ms)
  monitorInterval?: number;      // Intervalo de monitoramento (ms)
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
  onFailure?: (error: Error) => void;
  onSuccess?: () => void;
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  lastStateChange: Date | null;
  openedAt: Date | null;
  failureRate: number;
}

export class CircuitBreakerError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly state: CircuitState,
    message?: string
  ) {
    super(message || `Circuit breaker '${circuitName}' is ${state}`);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private totalCalls = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private lastFailure: Date | null = null;
  private lastSuccess: Date | null = null;
  private lastStateChange: Date | null = null;
  private openedAt: Date | null = null;
  private halfOpenTimer: NodeJS.Timeout | null = null;
  private resetTimer: NodeJS.Timeout | null = null;

  constructor(private readonly options: CircuitBreakerOptions) {
    super();
    this.options.resetTimeout = options.resetTimeout || 60000;
    this.options.monitorInterval = options.monitorInterval || 10000;
  }

  /**
   * Executa uma função protegida pelo circuit breaker.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      const error = new CircuitBreakerError(this.options.name, this.state);
      this.emit('rejected', error);
      throw error;
    }

    this.totalCalls++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Wrapper para funções - retorna função protegida.
   */
  wrap<T extends (...args: any[]) => Promise<any>>(fn: T): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return this.execute(() => fn(...args));
    }) as T;
  }

  /**
   * Verifica se pode executar.
   */
  private canExecute(): boolean {
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Verifica se timeout passou para tentar novamente
        if (this.openedAt) {
          const elapsed = Date.now() - this.openedAt.getTime();
          if (elapsed >= this.options.timeout) {
            this.transitionTo(CircuitState.HALF_OPEN);
            return true;
          }
        }
        return false;

      case CircuitState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  /**
   * Registra sucesso.
   */
  private onSuccess(): void {
    this.lastSuccess = new Date();
    this.totalSuccesses++;
    this.successes++;
    this.failures = 0;

    if (this.options.onSuccess) {
      this.options.onSuccess();
    }

    this.emit('success');

    // Se estava HALF_OPEN e atingiu threshold de sucesso, fecha
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }

    this.scheduleReset();
  }

  /**
   * Registra falha.
   */
  private onFailure(error: Error): void {
    this.lastFailure = new Date();
    this.totalFailures++;
    this.failures++;
    this.successes = 0;

    if (this.options.onFailure) {
      this.options.onFailure(error);
    }

    this.emit('failure', error);

    // Se estava HALF_OPEN, volta para OPEN
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
      return;
    }

    // Se atingiu threshold de falhas, abre
    if (this.state === CircuitState.CLOSED) {
      if (this.failures >= this.options.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }

    this.scheduleReset();
  }

  /**
   * Transição de estado.
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    if (oldState === newState) return;

    this.state = newState;
    this.lastStateChange = new Date();

    if (newState === CircuitState.OPEN) {
      this.openedAt = new Date();
      this.successes = 0;
    } else if (newState === CircuitState.CLOSED) {
      this.failures = 0;
      this.successes = 0;
      this.openedAt = null;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successes = 0;
    }

    if (this.options.onStateChange) {
      this.options.onStateChange(oldState, newState);
    }

    this.emit('stateChange', oldState, newState);
  }

  /**
   * Agenda reset de contadores.
   */
  private scheduleReset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      if (this.state === CircuitState.CLOSED) {
        this.failures = 0;
        this.successes = 0;
      }
    }, this.options.resetTimeout);
  }

  /**
   * Retorna estado atual.
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Retorna estatísticas.
   */
  getStats(): CircuitBreakerStats {
    return {
      name: this.options.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      lastStateChange: this.lastStateChange,
      openedAt: this.openedAt,
      failureRate: this.totalCalls > 0
        ? this.totalFailures / this.totalCalls
        : 0,
    };
  }

  /**
   * Força abertura do circuito.
   */
  forceOpen(): void {
    this.transitionTo(CircuitState.OPEN);
  }

  /**
   * Força fechamento do circuito.
   */
  forceClose(): void {
    this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Reseta o circuit breaker.
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.openedAt = null;
    this.lastStateChange = new Date();
    this.emit('reset');
  }

  /**
   * Verifica se está saudável.
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Verifica se está aberto.
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Tempo restante no estado OPEN.
   */
  getTimeUntilRetry(): number {
    if (this.state !== CircuitState.OPEN || !this.openedAt) {
      return 0;
    }
    const elapsed = Date.now() - this.openedAt.getTime();
    return Math.max(0, this.options.timeout - elapsed);
  }
}

/**
 * Gerenciador de múltiplos Circuit Breakers.
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Cria ou obtém um circuit breaker.
   */
  getOrCreate(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const cb = new CircuitBreaker({
        name,
        failureThreshold: options?.failureThreshold ?? 5,
        successThreshold: options?.successThreshold ?? 3,
        timeout: options?.timeout ?? 30000,
        ...options,
      });
      this.breakers.set(name, cb);
    }
    return this.breakers.get(name)!;
  }

  /**
   * Obtém circuit breaker por nome.
   */
  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Remove circuit breaker.
   */
  remove(name: string): boolean {
    return this.breakers.delete(name);
  }

  /**
   * Lista todos os circuit breakers.
   */
  list(): string[] {
    return Array.from(this.breakers.keys());
  }

  /**
   * Retorna estatísticas de todos.
   */
  getAllStats(): CircuitBreakerStats[] {
    return Array.from(this.breakers.values()).map(cb => cb.getStats());
  }

  /**
   * Verifica saúde geral.
   */
  isHealthy(): boolean {
    for (const cb of this.breakers.values()) {
      if (!cb.isHealthy()) return false;
    }
    return true;
  }

  /**
   * Reseta todos os circuit breakers.
   */
  resetAll(): void {
    for (const cb of this.breakers.values()) {
      cb.reset();
    }
  }
}

// Instância global
export const circuitBreakerManager = new CircuitBreakerManager();
