/**
 * Auto-Healer - Correção automática de problemas
 *
 * Detecta e corrige problemas automaticamente:
 * - Reconexão de serviços (Telegram, WebSocket)
 * - Limpeza de memória
 * - Restart de workers
 * - Recuperação de estados inconsistentes
 */

import { EventEmitter } from 'events';
import { AlertManager, AlertLevel } from '../alerts/alert-manager';
import { Anomaly, AnomalyType } from '../detectors/anomaly';
import { AutoHealerConfig } from '../core/config';

export enum HealingActionType {
  GC_COLLECT = 'gc_collect',
  CLEAR_CACHE = 'clear_cache',
  RECONNECT = 'reconnect',
  RESTART_WORKER = 'restart_worker',
  KILL_STUCK_PROCESS = 'kill_stuck_process',
  REDUCE_LOAD = 'reduce_load',
  FLUSH_QUEUES = 'flush_queues',
  RESET_CIRCUIT = 'reset_circuit',
}

export interface HealingAction {
  type: HealingActionType;
  target: string;
  timestamp: Date;
  success: boolean;
  message: string;
  duration: number;
}

export interface ReconnectOptions {
  maxAttempts: number;
  initialDelay: number;    // ms
  maxDelay: number;        // ms
  backoffMultiplier: number;
  onReconnect?: () => Promise<void>;
  onMaxAttempts?: () => void;
}

export interface HealingTarget {
  name: string;
  type: 'service' | 'connection' | 'worker' | 'cache';
  reconnectFn?: () => Promise<boolean>;
  healthCheckFn?: () => Promise<boolean>;
  cleanupFn?: () => Promise<void>;
}

export class AutoHealer extends EventEmitter {
  private healingHistory: HealingAction[] = [];
  private lastHealTime = new Map<string, number>();
  private reconnectAttempts = new Map<string, number>();
  private targets = new Map<string, HealingTarget>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly config: AutoHealerConfig,
    private readonly alertManager?: AlertManager
  ) {
    super();
  }

  /**
   * Registra um target para healing.
   */
  registerTarget(target: HealingTarget): void {
    this.targets.set(target.name, target);
  }

  /**
   * Remove um target.
   */
  unregisterTarget(name: string): void {
    this.targets.delete(name);
    this.cancelReconnect(name);
  }

  /**
   * Executa ação de healing.
   */
  private async executeAction(
    type: HealingActionType,
    target: string,
    action: () => Promise<void>
  ): Promise<HealingAction> {
    const start = Date.now();
    let success = false;
    let message = '';

    try {
      // Verifica cooldown
      const lastHeal = this.lastHealTime.get(`${type}:${target}`) || 0;
      if (Date.now() - lastHeal < this.config.healCooldown) {
        message = 'Cooldown active';
        return this.recordAction(type, target, false, message, 0);
      }

      await action();
      success = true;
      message = 'Action completed successfully';
      this.lastHealTime.set(`${type}:${target}`, Date.now());

    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    const duration = Date.now() - start;
    return this.recordAction(type, target, success, message, duration);
  }

  /**
   * Registra ação executada.
   */
  private recordAction(
    type: HealingActionType,
    target: string,
    success: boolean,
    message: string,
    duration: number
  ): HealingAction {
    const action: HealingAction = {
      type,
      target,
      timestamp: new Date(),
      success,
      message,
      duration,
    };

    this.healingHistory.push(action);
    if (this.healingHistory.length > 1000) {
      this.healingHistory.shift();
    }

    this.emit('healed', action);

    // Envia alerta
    if (this.alertManager) {
      this.alertManager.send({
        level: success ? AlertLevel.INFO : AlertLevel.WARNING,
        title: `Auto-Heal: ${type}`,
        message: `${target}: ${message}`,
        source: 'aurora.healer',
      });
    }

    return action;
  }

  /**
   * Força garbage collection.
   */
  async collectGarbage(): Promise<HealingAction> {
    return this.executeAction(
      HealingActionType.GC_COLLECT,
      'process',
      async () => {
        if (global.gc) {
          global.gc();
        } else {
          // Tenta forçar GC indiretamente
          const used = process.memoryUsage();
          if (used.heapUsed > used.heapTotal * 0.9) {
            // Aloca e libera para forçar GC
            let temp: any[] = [];
            for (let i = 0; i < 10; i++) {
              temp.push(new Array(1000000));
            }
            temp = [];
          }
        }
      }
    );
  }

  /**
   * Lida com pressão de memória.
   */
  async handleMemoryPressure(percent: number): Promise<HealingAction[]> {
    const actions: HealingAction[] = [];

    if (percent > this.config.memoryThreshold) {
      // 1. Coleta garbage
      if (this.config.gcOnHighMemory) {
        actions.push(await this.collectGarbage());
      }

      // 2. Limpa caches dos targets registrados
      for (const [name, target] of this.targets) {
        if (target.type === 'cache' && target.cleanupFn) {
          const action = await this.executeAction(
            HealingActionType.CLEAR_CACHE,
            name,
            target.cleanupFn
          );
          actions.push(action);
        }
      }
    }

    return actions;
  }

  /**
   * Lida com pressão de CPU.
   */
  async handleCpuPressure(percent: number): Promise<HealingAction[]> {
    const actions: HealingAction[] = [];

    if (percent > 90) {
      // Reduz carga - mata workers em excesso, limpa filas
      const action = await this.executeAction(
        HealingActionType.REDUCE_LOAD,
        'process',
        async () => {
          // Emite evento para que a aplicação reduza carga
          this.emit('reduceLoad', percent);
        }
      );
      actions.push(action);
    }

    return actions;
  }

  /**
   * Lida com anomalia detectada.
   */
  async handleAnomaly(anomaly: Anomaly): Promise<HealingAction | null> {
    switch (anomaly.type) {
      case AnomalyType.MEMORY_LEAK:
        const actions = await this.handleMemoryPressure(95);
        return actions[0] || null;

      case AnomalyType.SPIKE:
        if (anomaly.metric.includes('error')) {
          return this.executeAction(
            HealingActionType.FLUSH_QUEUES,
            'errors',
            async () => {
              this.emit('flushErrorQueues');
            }
          );
        }
        break;

      case AnomalyType.GROWING_TREND:
        if (anomaly.metric.includes('memory')) {
          return this.collectGarbage();
        }
        break;
    }

    return null;
  }

  /**
   * Lida com crash/exception.
   */
  async handleCrash(type: string, error: Error): Promise<void> {
    this.emit('crash', { type, error });

    // Tenta recuperar serviços
    for (const [name, target] of this.targets) {
      if (target.type === 'service' || target.type === 'connection') {
        await this.reconnect(name);
      }
    }
  }

  /**
   * Inicia reconexão com exponential backoff.
   */
  async reconnect(targetName: string, options?: Partial<ReconnectOptions>): Promise<boolean> {
    const target = this.targets.get(targetName);
    if (!target || !target.reconnectFn) {
      return false;
    }

    const opts: ReconnectOptions = {
      maxAttempts: options?.maxAttempts ?? 10,
      initialDelay: options?.initialDelay ?? 1000,
      maxDelay: options?.maxDelay ?? 60000,
      backoffMultiplier: options?.backoffMultiplier ?? 2,
      onReconnect: options?.onReconnect,
      onMaxAttempts: options?.onMaxAttempts,
    };

    // Cancela reconexão anterior se existir
    this.cancelReconnect(targetName);

    const attempts = this.reconnectAttempts.get(targetName) || 0;

    if (attempts >= opts.maxAttempts) {
      opts.onMaxAttempts?.();
      this.alertManager?.send({
        level: AlertLevel.CRITICAL,
        title: 'Reconnection Failed',
        message: `Max attempts (${opts.maxAttempts}) reached for ${targetName}`,
        source: 'aurora.healer',
      });
      return false;
    }

    // Calcula delay com exponential backoff
    const delay = Math.min(
      opts.initialDelay * Math.pow(opts.backoffMultiplier, attempts),
      opts.maxDelay
    );

    this.emit('reconnecting', { target: targetName, attempt: attempts + 1, delay });

    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        this.reconnectAttempts.set(targetName, attempts + 1);

        try {
          const success = await target.reconnectFn!();

          if (success) {
            await opts.onReconnect?.();
            this.reconnectAttempts.set(targetName, 0);

            await this.executeAction(
              HealingActionType.RECONNECT,
              targetName,
              async () => {}
            );

            this.emit('reconnected', { target: targetName, attempts: attempts + 1 });
            resolve(true);
          } else {
            // Tenta novamente
            resolve(await this.reconnect(targetName, opts));
          }
        } catch (error) {
          this.emit('reconnectFailed', { target: targetName, error, attempt: attempts + 1 });
          // Tenta novamente
          resolve(await this.reconnect(targetName, opts));
        }
      }, delay);

      this.reconnectTimers.set(targetName, timer);
    });
  }

  /**
   * Cancela reconexão em andamento.
   */
  cancelReconnect(targetName: string): void {
    const timer = this.reconnectTimers.get(targetName);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(targetName);
    }
  }

  /**
   * Verifica saúde de um target.
   */
  async checkTargetHealth(targetName: string): Promise<boolean> {
    const target = this.targets.get(targetName);
    if (!target || !target.healthCheckFn) {
      return true; // Assume saudável se não tem health check
    }

    try {
      return await target.healthCheckFn();
    } catch {
      return false;
    }
  }

  /**
   * Verifica saúde de todos os targets e reconecta se necessário.
   */
  async checkAndHealAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, target] of this.targets) {
      const healthy = await this.checkTargetHealth(name);
      results.set(name, healthy);

      if (!healthy && target.reconnectFn) {
        this.reconnect(name);
      }
    }

    return results;
  }

  /**
   * Retorna histórico de ações.
   */
  getHistory(limit?: number): HealingAction[] {
    if (limit) {
      return this.healingHistory.slice(-limit);
    }
    return [...this.healingHistory];
  }

  /**
   * Retorna estatísticas.
   */
  getStats(): {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    actionsByType: Record<string, number>;
    reconnectAttempts: Record<string, number>;
  } {
    const actionsByType: Record<string, number> = {};
    let successfulActions = 0;
    let failedActions = 0;

    for (const action of this.healingHistory) {
      actionsByType[action.type] = (actionsByType[action.type] || 0) + 1;
      if (action.success) {
        successfulActions++;
      } else {
        failedActions++;
      }
    }

    return {
      totalActions: this.healingHistory.length,
      successfulActions,
      failedActions,
      actionsByType,
      reconnectAttempts: Object.fromEntries(this.reconnectAttempts),
    };
  }

  /**
   * Limpa histórico.
   */
  clearHistory(): void {
    this.healingHistory = [];
  }
}
