/**
 * OpenClaw Integration - Integração com o sistema OpenClaw/Jarvis
 *
 * Fornece proteção para:
 * - Canal Telegram (que está caindo)
 * - APIs de AI (Claude, GPT, Ollama)
 * - Gateway WebSocket
 * - Conexões de canais
 */

import { EventEmitter } from 'events';
import { CircuitBreaker, CircuitBreakerManager, CircuitState } from '../protection/circuit-breaker';
import {
  RateLimiter,
  RateLimiterManager,
  createTelegramLimiter,
  createClaudeLimiter,
  createGPTLimiter,
  createOllamaLimiter,
} from '../protection/rate-limiter';
import { AutoHealer, HealingTarget } from '../healing/auto-healer';
import { AlertManager, AlertLevel } from '../alerts/alert-manager';
import { ProcessWatchdog } from '../healing/watchdog';
import { MetricsCollector } from '../collectors/metrics';
import { AnomalyDetector } from '../detectors/anomaly';
import { defaultConfig, MonitorConfig } from '../core/config';

export interface OpenClawChannel {
  name: string;
  type: 'telegram' | 'whatsapp' | 'discord' | 'slack' | 'signal' | 'matrix';
  isConnected: () => boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendMessage?: (chatId: string, message: string) => Promise<void>;
}

export interface AIProvider {
  name: string;
  type: 'claude' | 'gpt' | 'ollama' | 'openai';
  isAvailable: () => Promise<boolean>;
  complete: (prompt: string, options?: any) => Promise<string>;
}

export interface OpenClawIntegrationOptions {
  config?: Partial<MonitorConfig>;
  alertManager?: AlertManager;
  onChannelReconnect?: (channel: string) => void;
  onCircuitOpen?: (name: string) => void;
  onCircuitClose?: (name: string) => void;
}

/**
 * Wrapper protegido para canais do OpenClaw.
 */
export class ProtectedChannel {
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnecting = false;

  constructor(
    private readonly channel: OpenClawChannel,
    private readonly healer: AutoHealer,
    private readonly alertManager?: AlertManager,
    cbOptions?: { failureThreshold?: number; timeout?: number },
    rlOptions?: { rate?: number; burst?: number }
  ) {
    // Configura circuit breaker específico para o canal
    this.circuitBreaker = new CircuitBreaker({
      name: `channel:${channel.name}`,
      failureThreshold: cbOptions?.failureThreshold ?? 3,
      successThreshold: 2,
      timeout: cbOptions?.timeout ?? 30000,
      onStateChange: (old, newState) => {
        if (newState === CircuitState.OPEN) {
          this.alertManager?.send({
            level: AlertLevel.CRITICAL,
            title: `Channel ${channel.name} Circuit Open`,
            message: 'Too many failures, circuit opened',
            source: 'aurora.openclaw',
          });
          this.scheduleReconnect();
        }
      },
    });

    // Configura rate limiter
    const defaultRates: Record<string, { rate: number; burst: number }> = {
      telegram: { rate: 25, burst: 30 },
      whatsapp: { rate: 20, burst: 25 },
      discord: { rate: 50, burst: 60 },
      slack: { rate: 50, burst: 60 },
    };

    const rates = defaultRates[channel.type] || { rate: 30, burst: 40 };

    this.rateLimiter = new RateLimiter({
      name: `channel:${channel.name}`,
      rate: rlOptions?.rate ?? rates.rate,
      burst: rlOptions?.burst ?? rates.burst,
      perClientRate: 1,  // 1 msg/s por chat
      perClientBurst: 3,
    });

    // Registra como target de healing
    this.healer.registerTarget({
      name: `channel:${channel.name}`,
      type: 'connection',
      reconnectFn: () => this.reconnect(),
      healthCheckFn: () => Promise.resolve(channel.isConnected()),
    });
  }

  /**
   * Envia mensagem protegida.
   */
  async sendMessage(chatId: string, message: string): Promise<void> {
    if (!this.channel.sendMessage) {
      throw new Error('Channel does not support sending messages');
    }

    // Rate limiting por chat
    await this.rateLimiter.acquireAsync(chatId);

    // Circuit breaker
    await this.circuitBreaker.execute(async () => {
      await this.channel.sendMessage!(chatId, message);
    });
  }

  /**
   * Executa operação protegida.
   */
  async execute<T>(operation: () => Promise<T>, clientId?: string): Promise<T> {
    await this.rateLimiter.acquireAsync(clientId);
    return this.circuitBreaker.execute(operation);
  }

  /**
   * Reconecta o canal.
   */
  private async reconnect(): Promise<boolean> {
    if (this.reconnecting) return false;

    this.reconnecting = true;
    this.reconnectAttempts++;

    try {
      await this.channel.disconnect().catch(() => {});
      await this.delay(1000);
      await this.channel.connect();

      this.reconnectAttempts = 0;
      this.circuitBreaker.reset();

      this.alertManager?.send({
        level: AlertLevel.INFO,
        title: `Channel ${this.channel.name} Reconnected`,
        message: 'Successfully reconnected',
        source: 'aurora.openclaw',
      });

      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      this.alertManager?.send({
        level: AlertLevel.ERROR,
        title: `Channel ${this.channel.name} Reconnect Failed`,
        message: `Attempt ${this.reconnectAttempts}: ${msg}`,
        source: 'aurora.openclaw',
      });

      return false;
    } finally {
      this.reconnecting = false;
    }
  }

  /**
   * Agenda reconexão com backoff.
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.alertManager?.send({
        level: AlertLevel.CRITICAL,
        title: `Channel ${this.channel.name} Max Reconnects`,
        message: 'Max reconnection attempts reached',
        source: 'aurora.openclaw',
      });
      return;
    }

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      60000
    );

    setTimeout(() => {
      this.healer.reconnect(`channel:${this.channel.name}`);
    }, delay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retorna status.
   */
  getStatus(): {
    name: string;
    type: string;
    connected: boolean;
    circuitState: CircuitState;
    reconnectAttempts: number;
  } {
    return {
      name: this.channel.name,
      type: this.channel.type,
      connected: this.channel.isConnected(),
      circuitState: this.circuitBreaker.getState(),
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

/**
 * Wrapper protegido para providers de AI.
 */
export class ProtectedAIProvider {
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;

  constructor(
    private readonly provider: AIProvider,
    private readonly alertManager?: AlertManager
  ) {
    // Circuit breaker para o provider
    this.circuitBreaker = new CircuitBreaker({
      name: `ai:${provider.name}`,
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      onStateChange: (old, newState) => {
        if (newState === CircuitState.OPEN) {
          this.alertManager?.send({
            level: AlertLevel.WARNING,
            title: `AI Provider ${provider.name} Circuit Open`,
            message: 'Falling back to alternative provider',
            source: 'aurora.openclaw.ai',
          });
        }
      },
    });

    // Rate limiter específico por tipo
    switch (provider.type) {
      case 'claude':
        this.rateLimiter = createClaudeLimiter(`ai:${provider.name}`);
        break;
      case 'gpt':
      case 'openai':
        this.rateLimiter = createGPTLimiter(`ai:${provider.name}`);
        break;
      case 'ollama':
        this.rateLimiter = createOllamaLimiter(`ai:${provider.name}`);
        break;
      default:
        this.rateLimiter = new RateLimiter({
          name: `ai:${provider.name}`,
          rate: 10,
          burst: 15,
        });
    }
  }

  /**
   * Executa completion protegido.
   */
  async complete(prompt: string, options?: any): Promise<string> {
    await this.rateLimiter.acquireAsync();

    return this.circuitBreaker.execute(async () => {
      return this.provider.complete(prompt, options);
    });
  }

  /**
   * Verifica disponibilidade.
   */
  async isAvailable(): Promise<boolean> {
    if (this.circuitBreaker.isOpen()) {
      return false;
    }

    try {
      return await this.provider.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Retorna status.
   */
  getStatus(): {
    name: string;
    type: string;
    circuitState: CircuitState;
    available: boolean;
  } {
    return {
      name: this.provider.name,
      type: this.provider.type,
      circuitState: this.circuitBreaker.getState(),
      available: !this.circuitBreaker.isOpen(),
    };
  }
}

/**
 * Integração principal com OpenClaw.
 */
export class OpenClawIntegration extends EventEmitter {
  private channels = new Map<string, ProtectedChannel>();
  private aiProviders = new Map<string, ProtectedAIProvider>();
  private healer: AutoHealer;
  private alertManager: AlertManager;
  private watchdog: ProcessWatchdog;
  private metricsCollector: MetricsCollector;
  private anomalyDetector: AnomalyDetector;
  private running = false;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(options: OpenClawIntegrationOptions = {}) {
    super();

    const config = { ...defaultConfig, ...options.config };

    // Inicializa componentes
    this.alertManager = options.alertManager || new AlertManager(config.alerts);
    this.healer = new AutoHealer(config.autoHealer, this.alertManager);
    this.watchdog = new ProcessWatchdog(config.watchdog, this.alertManager);
    this.metricsCollector = new MetricsCollector(config.metrics);
    this.anomalyDetector = new AnomalyDetector(config.anomaly);

    // Configura callbacks
    this.healer.on('reconnected', ({ target }) => {
      options.onChannelReconnect?.(target);
      this.emit('channelReconnected', target);
    });

    this.anomalyDetector.on('anomaly', (anomaly) => {
      this.healer.handleAnomaly(anomaly);
      this.emit('anomaly', anomaly);
    });

    this.watchdog.on('dead', () => {
      this.alertManager.send({
        level: AlertLevel.CRITICAL,
        title: 'Process Unresponsive',
        message: 'Watchdog detected unresponsive process',
        source: 'aurora.openclaw',
      });
      this.emit('processUnresponsive');
    });
  }

  /**
   * Inicia a integração.
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.watchdog.start();

    // Coleta métricas periodicamente
    this.metricsInterval = setInterval(async () => {
      const metrics = await this.metricsCollector.collect();
      this.anomalyDetector.addSample(metrics);

      // Verifica thresholds
      if (metrics.memory.percent > 85) {
        this.healer.handleMemoryPressure(metrics.memory.percent);
      }

      if (metrics.cpu.percent > 90) {
        this.healer.handleCpuPressure(metrics.cpu.percent);
      }

      this.emit('metrics', metrics);
    }, 5000);

    this.alertManager.send({
      level: AlertLevel.INFO,
      title: 'Aurora Integration Started',
      message: 'OpenClaw protection active',
      source: 'aurora.openclaw',
    });

    this.emit('started');
  }

  /**
   * Para a integração.
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.watchdog.stop();

    this.alertManager.send({
      level: AlertLevel.INFO,
      title: 'Aurora Integration Stopped',
      message: 'OpenClaw protection deactivated',
      source: 'aurora.openclaw',
    });

    this.emit('stopped');
  }

  /**
   * Registra canal protegido.
   */
  registerChannel(channel: OpenClawChannel): ProtectedChannel {
    const protected_ = new ProtectedChannel(
      channel,
      this.healer,
      this.alertManager
    );

    this.channels.set(channel.name, protected_);
    this.emit('channelRegistered', channel.name);

    return protected_;
  }

  /**
   * Registra provider de AI protegido.
   */
  registerAIProvider(provider: AIProvider): ProtectedAIProvider {
    const protected_ = new ProtectedAIProvider(provider, this.alertManager);
    this.aiProviders.set(provider.name, protected_);
    this.emit('aiProviderRegistered', provider.name);

    return protected_;
  }

  /**
   * Obtém canal protegido.
   */
  getChannel(name: string): ProtectedChannel | undefined {
    return this.channels.get(name);
  }

  /**
   * Obtém provider de AI protegido.
   */
  getAIProvider(name: string): ProtectedAIProvider | undefined {
    return this.aiProviders.get(name);
  }

  /**
   * Envia heartbeat.
   */
  heartbeat(): void {
    this.watchdog.heartbeat();
  }

  /**
   * Retorna status geral.
   */
  getStatus(): {
    running: boolean;
    channels: { name: string; connected: boolean; circuitState: string }[];
    aiProviders: { name: string; available: boolean; circuitState: string }[];
    watchdog: { state: string; lastHeartbeat: Date | null };
    anomalies: number;
  } {
    return {
      running: this.running,
      channels: Array.from(this.channels.values()).map(c => ({
        name: c.getStatus().name,
        connected: c.getStatus().connected,
        circuitState: c.getStatus().circuitState,
      })),
      aiProviders: Array.from(this.aiProviders.values()).map(p => ({
        name: p.getStatus().name,
        available: p.getStatus().available,
        circuitState: p.getStatus().circuitState,
      })),
      watchdog: {
        state: this.watchdog.getStatus().state,
        lastHeartbeat: this.watchdog.getStatus().lastHeartbeat,
      },
      anomalies: this.anomalyDetector.getHistory().length,
    };
  }

  /**
   * Retorna métricas para o dashboard.
   */
  async getMetricsForDashboard(): Promise<{
    system: any;
    channels: any[];
    aiProviders: any[];
    alerts: any[];
    anomalies: any[];
  }> {
    const metrics = await this.metricsCollector.collect();

    return {
      system: {
        cpu: metrics.cpu.percent,
        memory: metrics.memory.percent,
        disk: metrics.disk.percent,
        uptime: process.uptime(),
        eventLoopLag: metrics.eventLoop?.lag || 0,
      },
      channels: Array.from(this.channels.values()).map(c => c.getStatus()),
      aiProviders: Array.from(this.aiProviders.values()).map(p => p.getStatus()),
      alerts: this.alertManager.getHistory({ limit: 20 }),
      anomalies: this.anomalyDetector.getHistory(20),
    };
  }
}

// Factory function
export function createOpenClawIntegration(
  options?: OpenClawIntegrationOptions
): OpenClawIntegration {
  return new OpenClawIntegration(options);
}
