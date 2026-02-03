/**
 * Aurora Monitor - OpenClaw Integration
 *
 * Este módulo integra as proteções do Aurora Monitor ao OpenClaw existente.
 * O OpenClaw JÁ TEM:
 *   - Backoff exponencial (src/infra/backoff.ts)
 *   - Rate limiting via apiThrottler()
 *   - Reconexão automática no monitor
 *
 * O Aurora Monitor ADICIONA:
 *   - Circuit Breaker (evita chamadas quando API está fora)
 *   - Watchdog (detecta processos travados)
 *   - WebSocket Server (dashboard em tempo real)
 *   - Métricas centralizadas
 *   - Detecção de anomalias
 */

import { EventEmitter } from 'events';

// ============================================================================
// CIRCUIT BREAKER - Protege contra falhas em cascata
// ============================================================================

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Falhas para abrir (default: 5)
  successThreshold: number;    // Sucessos para fechar (default: 3)
  timeout: number;             // Tempo aberto em ms (default: 30000)
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailure: Date | null = null;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    super();
    this.name = name;
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 3,
      timeout: config.timeout ?? 30000,
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.emit('state-change', { name: this.name, state: 'HALF_OPEN' });
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailure) return true;
    return Date.now() - this.lastFailure.getTime() >= this.config.timeout;
  }

  private recordSuccess(): void {
    this.failures = 0;
    this.successes++;

    if (this.state === 'HALF_OPEN' && this.successes >= this.config.successThreshold) {
      this.state = 'CLOSED';
      this.successes = 0;
      this.emit('state-change', { name: this.name, state: 'CLOSED' });
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.successes = 0;
    this.lastFailure = new Date();

    if (this.failures >= this.config.failureThreshold && this.state === 'CLOSED') {
      this.state = 'OPEN';
      this.emit('state-change', { name: this.name, state: 'OPEN' });
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
    };
  }
}

// ============================================================================
// WATCHDOG - Monitora processos e detecta travamentos
// ============================================================================

export interface WatchdogConfig {
  heartbeatInterval: number;   // Intervalo esperado em ms (default: 10000)
  maxMissedHeartbeats: number; // Máximo de heartbeats perdidos (default: 3)
}

export class Watchdog extends EventEmitter {
  private lastHeartbeat: number = Date.now();
  private missedHeartbeats = 0;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly config: WatchdogConfig;
  private readonly processName: string;

  constructor(processName: string, config: Partial<WatchdogConfig> = {}) {
    super();
    this.processName = processName;
    this.config = {
      heartbeatInterval: config.heartbeatInterval ?? 10000,
      maxMissedHeartbeats: config.maxMissedHeartbeats ?? 3,
    };
  }

  start(): void {
    this.lastHeartbeat = Date.now();
    this.missedHeartbeats = 0;

    this.checkInterval = setInterval(() => {
      const elapsed = Date.now() - this.lastHeartbeat;

      if (elapsed > this.config.heartbeatInterval) {
        this.missedHeartbeats++;
        this.emit('heartbeat-missed', {
          process: this.processName,
          missed: this.missedHeartbeats,
          elapsed,
        });

        if (this.missedHeartbeats >= this.config.maxMissedHeartbeats) {
          this.emit('process-unresponsive', {
            process: this.processName,
            missed: this.missedHeartbeats,
          });
        }
      }
    }, this.config.heartbeatInterval);
  }

  heartbeat(): void {
    this.lastHeartbeat = Date.now();
    this.missedHeartbeats = 0;
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getStatus() {
    return {
      process: this.processName,
      lastHeartbeat: this.lastHeartbeat,
      missedHeartbeats: this.missedHeartbeats,
      isHealthy: this.missedHeartbeats < this.config.maxMissedHeartbeats,
    };
  }
}

// ============================================================================
// METRICS COLLECTOR - Coleta métricas para o dashboard
// ============================================================================

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export class MetricsCollector extends EventEmitter {
  private metrics: Map<string, MetricPoint[]> = new Map();
  private readonly maxPoints = 1000;

  record(name: string, value: number): void {
    const points = this.metrics.get(name) || [];
    points.push({ timestamp: Date.now(), value });

    // Mantém apenas os últimos N pontos
    if (points.length > this.maxPoints) {
      points.shift();
    }

    this.metrics.set(name, points);
    this.emit('metric', { name, value, timestamp: Date.now() });
  }

  increment(name: string, amount = 1): void {
    const points = this.metrics.get(name) || [];
    const lastValue = points.length > 0 ? points[points.length - 1].value : 0;
    this.record(name, lastValue + amount);
  }

  getMetric(name: string): MetricPoint[] {
    return this.metrics.get(name) || [];
  }

  getAllMetrics(): Record<string, MetricPoint[]> {
    const result: Record<string, MetricPoint[]> = {};
    this.metrics.forEach((points, name) => {
      result[name] = points;
    });
    return result;
  }

  getLatestValues(): Record<string, number> {
    const result: Record<string, number> = {};
    this.metrics.forEach((points, name) => {
      if (points.length > 0) {
        result[name] = points[points.length - 1].value;
      }
    });
    return result;
  }
}

// ============================================================================
// AURORA MONITOR - Coordenador central
// ============================================================================

export class AuroraMonitor extends EventEmitter {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private watchdogs: Map<string, Watchdog> = new Map();
  private metrics: MetricsCollector;
  private startTime: number;

  constructor() {
    super();
    this.metrics = new MetricsCollector();
    this.startTime = Date.now();

    // Propaga eventos de métricas
    this.metrics.on('metric', (data) => {
      this.emit('metric', data);
    });
  }

  // Cria ou retorna um Circuit Breaker para um serviço
  getCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    let cb = this.circuitBreakers.get(name);
    if (!cb) {
      cb = new CircuitBreaker(name, config);
      cb.on('state-change', (data) => {
        this.emit('circuit-state-change', data);
        this.metrics.record(`circuit.${name}.state`, data.state === 'CLOSED' ? 0 : data.state === 'OPEN' ? 2 : 1);
      });
      this.circuitBreakers.set(name, cb);
    }
    return cb;
  }

  // Cria ou retorna um Watchdog para um processo
  getWatchdog(name: string, config?: Partial<WatchdogConfig>): Watchdog {
    let wd = this.watchdogs.get(name);
    if (!wd) {
      wd = new Watchdog(name, config);
      wd.on('heartbeat-missed', (data) => {
        this.emit('watchdog-alert', { type: 'heartbeat-missed', ...data });
      });
      wd.on('process-unresponsive', (data) => {
        this.emit('watchdog-alert', { type: 'process-unresponsive', ...data });
      });
      this.watchdogs.set(name, wd);
    }
    return wd;
  }

  // Acesso às métricas
  recordMetric(name: string, value: number): void {
    this.metrics.record(name, value);
  }

  incrementMetric(name: string, amount = 1): void {
    this.metrics.increment(name, amount);
  }

  // Status geral do sistema
  getSystemStatus() {
    const circuitBreakersStatus: Record<string, any> = {};
    this.circuitBreakers.forEach((cb, name) => {
      circuitBreakersStatus[name] = cb.getStats();
    });

    const watchdogsStatus: Record<string, any> = {};
    this.watchdogs.forEach((wd, name) => {
      watchdogsStatus[name] = wd.getStatus();
    });

    return {
      uptime: Date.now() - this.startTime,
      timestamp: Date.now(),
      circuitBreakers: circuitBreakersStatus,
      watchdogs: watchdogsStatus,
      metrics: this.metrics.getLatestValues(),
    };
  }

  // Iniciar monitoramento
  startAll(): void {
    this.watchdogs.forEach((wd) => wd.start());
    console.log('[Aurora] Monitoring started');
  }

  // Parar monitoramento
  stopAll(): void {
    this.watchdogs.forEach((wd) => wd.stop());
    console.log('[Aurora] Monitoring stopped');
  }
}

// ============================================================================
// WEBSOCKET SERVER - Envia métricas para o dashboard
// ============================================================================

import { WebSocketServer, WebSocket } from 'ws';

export class AuroraWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private monitor: AuroraMonitor;

  constructor(monitor: AuroraMonitor) {
    this.monitor = monitor;
  }

  start(port: number): void {
    this.wss = new WebSocketServer({ port });
    console.log(`[Aurora WebSocket] Server started on port ${port}`);

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`[Aurora WebSocket] Client connected (${this.clients.size} total)`);

      // Envia status inicial
      ws.send(JSON.stringify({
        type: 'system',
        event: 'connected',
        data: this.monitor.getSystemStatus(),
        timestamp: Date.now(),
      }));

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[Aurora WebSocket] Client disconnected (${this.clients.size} total)`);
      });
    });

    // Subscreve eventos do monitor
    this.monitor.on('metric', (data) => {
      this.broadcast({ type: 'metric', ...data });
    });

    this.monitor.on('circuit-state-change', (data) => {
      this.broadcast({ type: 'circuit_breaker', event: 'state_change', data });
    });

    this.monitor.on('watchdog-alert', (data) => {
      this.broadcast({ type: 'watchdog', event: data.type, data });
    });

    // Envia status a cada 5 segundos
    setInterval(() => {
      this.broadcast({
        type: 'status',
        data: this.monitor.getSystemStatus(),
        timestamp: Date.now(),
      });
    }, 5000);
  }

  private broadcast(message: object): void {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  stop(): void {
    this.wss?.close();
    this.clients.clear();
  }
}

// ============================================================================
// OPENCLAW INTEGRATION HOOKS
// ============================================================================

/**
 * Wrapper para proteger chamadas de API com Circuit Breaker
 * Uso: const protectedCall = wrapWithCircuitBreaker(monitor, 'claude', callClaudeApi);
 */
export function wrapWithCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  monitor: AuroraMonitor,
  serviceName: string,
  fn: T,
  config?: Partial<CircuitBreakerConfig>
): T {
  const cb = monitor.getCircuitBreaker(serviceName, config);

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const startTime = Date.now();
    try {
      const result = await cb.execute(() => fn(...args));
      monitor.recordMetric(`${serviceName}.latency`, Date.now() - startTime);
      monitor.incrementMetric(`${serviceName}.success`);
      return result;
    } catch (error) {
      monitor.incrementMetric(`${serviceName}.error`);
      throw error;
    }
  }) as T;
}

/**
 * Hook para integrar com o bot Telegram do OpenClaw
 * Adiciona heartbeat automático ao monitor
 */
export function integrateTelegramBot(monitor: AuroraMonitor, bot: any): void {
  const watchdog = monitor.getWatchdog('telegram-bot', {
    heartbeatInterval: 30000,
    maxMissedHeartbeats: 3,
  });

  watchdog.start();

  // Hook no processamento de mensagens
  bot.use(async (ctx: any, next: any) => {
    watchdog.heartbeat();
    monitor.incrementMetric('telegram.messages');

    const startTime = Date.now();
    await next();
    monitor.recordMetric('telegram.latency', Date.now() - startTime);
  });
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

let instance: AuroraMonitor | null = null;

export function getAuroraMonitor(): AuroraMonitor {
  if (!instance) {
    instance = new AuroraMonitor();
  }
  return instance;
}

export function createAuroraSystem(wsPort = 18789) {
  const monitor = getAuroraMonitor();
  const wsServer = new AuroraWebSocketServer(monitor);

  return {
    monitor,
    wsServer,
    start: () => {
      monitor.startAll();
      wsServer.start(wsPort);
    },
    stop: () => {
      monitor.stopAll();
      wsServer.stop();
    },
  };
}
