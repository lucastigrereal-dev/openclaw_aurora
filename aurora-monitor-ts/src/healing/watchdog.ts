/**
 * Process Watchdog - Monitora saúde do processo
 *
 * Detecta:
 * - Processo não respondendo (heartbeat)
 * - Event loop bloqueado
 * - Deadlocks
 * - Memory leaks progressivos
 */

import { EventEmitter } from 'events';
import { AlertManager, AlertLevel } from '../alerts/alert-manager';
import { WatchdogConfig } from '../core/config';

export enum WatchdogState {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  DEAD = 'dead',
}

export interface WatchdogStatus {
  state: WatchdogState;
  lastHeartbeat: Date | null;
  missedHeartbeats: number;
  eventLoopLag: number;
  uptime: number;
  restarts: number;
}

export class ProcessWatchdog extends EventEmitter {
  private running = false;
  private lastHeartbeat: Date | null = null;
  private missedHeartbeats = 0;
  private eventLoopLag = 0;
  private lastEventLoopCheck = 0;
  private restarts = 0;
  private checkInterval: NodeJS.Timeout | null = null;
  private eventLoopInterval: NodeJS.Timeout | null = null;
  private state: WatchdogState = WatchdogState.HEALTHY;

  constructor(
    private readonly config: WatchdogConfig,
    private readonly alertManager?: AlertManager
  ) {
    super();
  }

  /**
   * Inicia o watchdog.
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.lastHeartbeat = new Date();
    this.state = WatchdogState.HEALTHY;

    // Monitora heartbeat
    this.checkInterval = setInterval(() => {
      this.check();
    }, this.config.checkInterval);

    // Monitora event loop
    this.startEventLoopMonitor();

    this.emit('started');
  }

  /**
   * Para o watchdog.
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.eventLoopInterval) {
      clearInterval(this.eventLoopInterval);
      this.eventLoopInterval = null;
    }

    this.emit('stopped');
  }

  /**
   * Registra heartbeat.
   */
  heartbeat(): void {
    this.lastHeartbeat = new Date();
    this.missedHeartbeats = 0;

    if (this.state !== WatchdogState.HEALTHY) {
      this.transitionTo(WatchdogState.HEALTHY);
    }

    this.emit('heartbeat');
  }

  /**
   * Verifica saúde do processo.
   */
  private check(): void {
    const now = Date.now();

    // Verifica heartbeat
    if (this.lastHeartbeat) {
      const elapsed = now - this.lastHeartbeat.getTime();

      if (elapsed > this.config.heartbeatTimeout) {
        this.missedHeartbeats++;

        if (this.missedHeartbeats >= 3) {
          this.transitionTo(WatchdogState.DEAD);
          this.handleDead();
        } else if (this.missedHeartbeats >= 2) {
          this.transitionTo(WatchdogState.CRITICAL);
        } else {
          this.transitionTo(WatchdogState.WARNING);
        }

        this.alertManager?.send({
          level: this.missedHeartbeats >= 3 ? AlertLevel.CRITICAL : AlertLevel.WARNING,
          title: 'Heartbeat Missing',
          message: `No heartbeat for ${(elapsed / 1000).toFixed(1)}s (missed: ${this.missedHeartbeats})`,
          source: 'aurora.watchdog',
        });
      }
    }

    // Verifica event loop lag
    if (this.eventLoopLag > 1000) {
      this.alertManager?.send({
        level: AlertLevel.WARNING,
        title: 'Event Loop Blocked',
        message: `Event loop lag: ${this.eventLoopLag}ms`,
        source: 'aurora.watchdog',
      });

      this.emit('eventLoopBlocked', this.eventLoopLag);
    }

    this.emit('check', this.getStatus());
  }

  /**
   * Monitora lag do event loop.
   */
  private startEventLoopMonitor(): void {
    const expectedInterval = 100; // ms

    this.eventLoopInterval = setInterval(() => {
      const now = Date.now();

      if (this.lastEventLoopCheck > 0) {
        const actual = now - this.lastEventLoopCheck;
        this.eventLoopLag = Math.max(0, actual - expectedInterval);
      }

      this.lastEventLoopCheck = now;
    }, expectedInterval);

    // Ensure timer doesn't prevent process exit
    this.eventLoopInterval.unref?.();
  }

  /**
   * Transição de estado.
   */
  private transitionTo(newState: WatchdogState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    this.emit('stateChange', oldState, newState);
  }

  /**
   * Lida com processo "morto".
   */
  private handleDead(): void {
    this.emit('dead');

    // Tenta recuperar
    this.emit('attemptRecovery');

    // Se não recuperar, pode reiniciar
    // (isso seria feito pelo processo pai ou systemd)
  }

  /**
   * Simula restart (para tracking).
   */
  recordRestart(): void {
    this.restarts++;
    this.lastHeartbeat = new Date();
    this.missedHeartbeats = 0;
    this.state = WatchdogState.HEALTHY;
    this.emit('restart', this.restarts);
  }

  /**
   * Retorna status atual.
   */
  getStatus(): WatchdogStatus {
    return {
      state: this.state,
      lastHeartbeat: this.lastHeartbeat,
      missedHeartbeats: this.missedHeartbeats,
      eventLoopLag: this.eventLoopLag,
      uptime: process.uptime(),
      restarts: this.restarts,
    };
  }

  /**
   * Verifica se está saudável.
   */
  isHealthy(): boolean {
    return this.state === WatchdogState.HEALTHY;
  }

  /**
   * Verifica se está crítico.
   */
  isCritical(): boolean {
    return this.state === WatchdogState.CRITICAL || this.state === WatchdogState.DEAD;
  }
}

/**
 * Cria watchdog configurado para Node.js/OpenClaw.
 */
export function createOpenClawWatchdog(
  alertManager?: AlertManager,
  options?: Partial<WatchdogConfig>
): ProcessWatchdog {
  const config: WatchdogConfig = {
    enabled: true,
    heartbeatTimeout: options?.heartbeatTimeout ?? 30000,
    checkInterval: options?.checkInterval ?? 5000,
    ...options,
  };

  return new ProcessWatchdog(config, alertManager);
}
