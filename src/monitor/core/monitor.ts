/**
 * Aurora Monitor - Sistema de Monitoramento em Tempo Real
 *
 * Monitor principal que orquestra todos os componentes de proteção
 * contra crashes para o OpenClaw.
 */

import { EventEmitter } from 'events';
import { MetricsCollector, SystemMetrics } from '../collectors/metrics';
import { AnomalyDetector, Anomaly } from '../detectors/anomaly';
import { CircuitBreaker, CircuitState } from '../protection/circuit-breaker';
import { RateLimiter } from '../protection/rate-limiter';
import { AutoHealer, HealingAction } from '../healing/auto-healer';
import { ProcessWatchdog } from '../healing/watchdog';
import { AlertManager, Alert, AlertLevel } from '../alerts/alert-manager';
import { AuroraLogger } from '../utils/logger';
import { MonitorConfig, defaultConfig } from './config';

export interface MonitorStatus {
  running: boolean;
  startedAt: Date | null;
  appName: string;
  environment: string;
  uptime: number;
  components: {
    metricsCollector: boolean;
    anomalyDetector: boolean;
    autoHealer: boolean;
    watchdog: boolean;
    alertManager: boolean;
  };
  circuitBreakers: number;
  rateLimiters: number;
  healthChecks: number;
}

export interface HealthCheckResult {
  name: string;
  healthy: boolean;
  message?: string;
  duration: number;
}

type HealthCheckFn = () => Promise<boolean> | boolean;

export class AuroraMonitor extends EventEmitter {
  private static instance: AuroraMonitor | null = null;

  private config: MonitorConfig;
  private logger: AuroraLogger;
  private running = false;
  private startedAt: Date | null = null;

  // Componentes
  private metricsCollector: MetricsCollector | null = null;
  private anomalyDetector: AnomalyDetector | null = null;
  private autoHealer: AutoHealer | null = null;
  private watchdog: ProcessWatchdog | null = null;
  private alertManager: AlertManager | null = null;

  // Registros
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private rateLimiters = new Map<string, RateLimiter>();
  private healthChecks = new Map<string, HealthCheckFn>();

  // Intervalos
  private metricsInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private anomalyInterval: NodeJS.Timeout | null = null;

  private constructor(config: Partial<MonitorConfig> = {}) {
    super();
    this.config = { ...defaultConfig, ...config };
    this.logger = new AuroraLogger({
      name: 'aurora',
      level: this.config.logLevel,
      jsonOutput: this.config.jsonLogs,
    });

    this.setupProcessHandlers();
  }

  /**
   * Obtém instância singleton do monitor.
   */
  static getInstance(config?: Partial<MonitorConfig>): AuroraMonitor {
    if (!AuroraMonitor.instance) {
      AuroraMonitor.instance = new AuroraMonitor(config);
    }
    return AuroraMonitor.instance;
  }

  /**
   * Reseta a instância (para testes).
   */
  static resetInstance(): void {
    if (AuroraMonitor.instance) {
      AuroraMonitor.instance.stop();
      AuroraMonitor.instance = null;
    }
  }

  private setupProcessHandlers(): void {
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      this.sendAlert(AlertLevel.CRITICAL, 'Uncaught Exception', error.message, 'process');

      if (this.autoHealer) {
        this.autoHealer.handleCrash('uncaughtException', error);
      }
    });

    process.on('unhandledRejection', (reason) => {
      const message = reason instanceof Error ? reason.message : String(reason);
      this.logger.error('Unhandled rejection', { reason: message });
      this.sendAlert(AlertLevel.ERROR, 'Unhandled Rejection', message, 'process');
    });

    process.on('SIGTERM', () => {
      this.logger.info('SIGTERM received, shutting down gracefully...');
      this.stop();
    });

    process.on('SIGINT', () => {
      this.logger.info('SIGINT received, shutting down gracefully...');
      this.stop();
    });
  }

  /**
   * Inicia o monitoramento.
   */
  start(): void {
    if (this.running) {
      this.logger.warn('Monitor already running');
      return;
    }

    this.running = true;
    this.startedAt = new Date();
    this.logger.info(`Aurora Monitor starting for ${this.config.appName}`);

    this.initializeComponents();
    this.startLoops();

    this.sendAlert(
      AlertLevel.INFO,
      'Monitor Started',
      `Aurora Monitor started for ${this.config.appName}`,
      'aurora.monitor'
    );

    this.emit('started');
  }

  private initializeComponents(): void {
    // Metrics Collector
    if (this.config.metrics.enabled) {
      this.metricsCollector = new MetricsCollector(this.config.metrics);
      this.logger.debug('MetricsCollector initialized');
    }

    // Anomaly Detector
    if (this.config.anomaly.enabled) {
      this.anomalyDetector = new AnomalyDetector(this.config.anomaly);
      this.logger.debug('AnomalyDetector initialized');
    }

    // Alert Manager
    if (this.config.alerts.enabled) {
      this.alertManager = new AlertManager(this.config.alerts);
      this.logger.debug('AlertManager initialized');
    }

    // Auto Healer
    if (this.config.autoHealer.enabled) {
      this.autoHealer = new AutoHealer(this.config.autoHealer, this.alertManager ?? undefined);
      this.autoHealer.on('healed', (action: HealingAction) => {
        this.emit('healed', action);
      });
      this.logger.debug('AutoHealer initialized');
    }

    // Watchdog
    if (this.config.watchdog.enabled) {
      this.watchdog = new ProcessWatchdog(this.config.watchdog, this.alertManager ?? undefined);
      this.logger.debug('ProcessWatchdog initialized');
    }
  }

  private startLoops(): void {
    // Metrics collection loop
    if (this.metricsCollector) {
      this.metricsInterval = setInterval(() => {
        this.collectMetrics();
      }, this.config.metrics.collectionInterval);
    }

    // Health check loop
    if (this.config.healthCheck.enabled) {
      this.healthCheckInterval = setInterval(() => {
        this.runHealthChecks();
      }, this.config.healthCheck.checkInterval);
    }

    // Anomaly detection loop
    if (this.anomalyDetector) {
      this.anomalyInterval = setInterval(() => {
        this.detectAnomalies();
      }, this.config.anomaly.detectionInterval);
    }
  }

  private async collectMetrics(): Promise<void> {
    if (!this.metricsCollector) return;

    try {
      const metrics = await this.metricsCollector.collect();
      this.checkThresholds(metrics);

      if (this.anomalyDetector) {
        this.anomalyDetector.addSample(metrics);
      }

      this.emit('metrics', metrics);
    } catch (error) {
      this.logger.error('Error collecting metrics', { error });
    }
  }

  private checkThresholds(metrics: SystemMetrics): void {
    // CPU threshold
    if (metrics.cpu.percent > this.config.metrics.cpuThreshold) {
      this.sendAlert(
        AlertLevel.WARNING,
        'High CPU Usage',
        `CPU at ${metrics.cpu.percent.toFixed(1)}% (threshold: ${this.config.metrics.cpuThreshold}%)`,
        'aurora.metrics'
      );

      if (this.autoHealer) {
        this.autoHealer.handleCpuPressure(metrics.cpu.percent);
      }
    }

    // Memory threshold
    if (metrics.memory.percent > this.config.metrics.memoryThreshold) {
      this.sendAlert(
        AlertLevel.WARNING,
        'High Memory Usage',
        `Memory at ${metrics.memory.percent.toFixed(1)}% (threshold: ${this.config.metrics.memoryThreshold}%)`,
        'aurora.metrics'
      );

      if (this.autoHealer) {
        this.autoHealer.handleMemoryPressure(metrics.memory.percent);
      }
    }

    // Disk threshold
    if (metrics.disk.percent > this.config.metrics.diskThreshold) {
      this.sendAlert(
        AlertLevel.CRITICAL,
        'Disk Almost Full',
        `Disk at ${metrics.disk.percent.toFixed(1)}% (threshold: ${this.config.metrics.diskThreshold}%)`,
        'aurora.metrics'
      );
    }

    // Event loop lag
    if (metrics.eventLoop && metrics.eventLoop.lag > this.config.metrics.eventLoopLagThreshold) {
      this.sendAlert(
        AlertLevel.WARNING,
        'Event Loop Lag',
        `Event loop lag at ${metrics.eventLoop.lag.toFixed(0)}ms (threshold: ${this.config.metrics.eventLoopLagThreshold}ms)`,
        'aurora.metrics'
      );
    }
  }

  private detectAnomalies(): void {
    if (!this.anomalyDetector) return;

    try {
      const anomalies = this.anomalyDetector.detect();

      if (anomalies.length > 0) {
        this.logger.warn('Anomalies detected', { count: anomalies.length });

        for (const anomaly of anomalies) {
          this.sendAlert(
            AlertLevel.WARNING,
            `Anomaly: ${anomaly.type}`,
            anomaly.description,
            'aurora.anomaly'
          );

          if (this.autoHealer) {
            this.autoHealer.handleAnomaly(anomaly);
          }
        }

        this.emit('anomalies', anomalies);
      }
    } catch (error) {
      this.logger.error('Error detecting anomalies', { error });
    }
  }

  private async runHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const [name, checkFn] of this.healthChecks) {
      const start = Date.now();
      let healthy = false;
      let message: string | undefined;

      try {
        healthy = await Promise.resolve(checkFn());
      } catch (error) {
        healthy = false;
        message = error instanceof Error ? error.message : String(error);
      }

      const duration = Date.now() - start;
      results.push({ name, healthy, message, duration });

      if (!healthy) {
        this.logger.warn(`Health check failed: ${name}`, { message, duration });
        this.sendAlert(
          AlertLevel.WARNING,
          'Health Check Failed',
          `${name}: ${message || 'Check returned false'}`,
          'aurora.health'
        );
      }
    }

    this.emit('healthChecks', results);
    return results;
  }

  /**
   * Para o monitoramento.
   */
  stop(): void {
    if (!this.running) return;

    this.logger.info('Stopping Aurora Monitor...');
    this.running = false;

    // Limpa intervalos
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.anomalyInterval) clearInterval(this.anomalyInterval);

    // Para watchdog
    if (this.watchdog) {
      this.watchdog.stop();
    }

    this.sendAlert(
      AlertLevel.INFO,
      'Monitor Stopped',
      `Aurora Monitor stopped for ${this.config.appName}`,
      'aurora.monitor'
    );

    this.emit('stopped');
    this.logger.info('Aurora Monitor stopped');
  }

  /**
   * Cria um circuit breaker.
   */
  createCircuitBreaker(
    name: string,
    options?: {
      failureThreshold?: number;
      successThreshold?: number;
      timeout?: number;
    }
  ): CircuitBreaker {
    const cb = new CircuitBreaker({
      name,
      failureThreshold: options?.failureThreshold ?? this.config.circuitBreaker.failureThreshold,
      successThreshold: options?.successThreshold ?? this.config.circuitBreaker.successThreshold,
      timeout: options?.timeout ?? this.config.circuitBreaker.timeout,
    });

    cb.on('stateChange', (oldState: CircuitState, newState: CircuitState) => {
      this.logger.warn(`Circuit breaker '${name}': ${oldState} -> ${newState}`);

      const level = newState === CircuitState.OPEN ? AlertLevel.CRITICAL : AlertLevel.INFO;
      this.sendAlert(
        level,
        `Circuit Breaker: ${name}`,
        `State changed from ${oldState} to ${newState}`,
        'aurora.circuit_breaker'
      );
    });

    this.circuitBreakers.set(name, cb);
    this.logger.debug(`Circuit breaker '${name}' created`);
    return cb;
  }

  /**
   * Cria um rate limiter.
   */
  createRateLimiter(
    name: string,
    options?: {
      requestsPerSecond?: number;
      burstSize?: number;
    }
  ): RateLimiter {
    const rl = new RateLimiter({
      name,
      rate: options?.requestsPerSecond ?? this.config.rateLimiter.requestsPerSecond,
      burst: options?.burstSize ?? this.config.rateLimiter.burstSize,
    });

    this.rateLimiters.set(name, rl);
    this.logger.debug(`Rate limiter '${name}' created`);
    return rl;
  }

  /**
   * Registra um health check.
   */
  registerHealthCheck(name: string, checkFn: HealthCheckFn): void {
    this.healthChecks.set(name, checkFn);
    this.logger.debug(`Health check '${name}' registered`);
  }

  /**
   * Remove um health check.
   */
  unregisterHealthCheck(name: string): void {
    this.healthChecks.delete(name);
  }

  /**
   * Obtém circuit breaker por nome.
   */
  getCircuitBreaker(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  /**
   * Obtém rate limiter por nome.
   */
  getRateLimiter(name: string): RateLimiter | undefined {
    return this.rateLimiters.get(name);
  }

  /**
   * Envia alerta.
   */
  private sendAlert(level: AlertLevel, title: string, message: string, source: string): void {
    if (this.alertManager) {
      this.alertManager.send({ level, title, message, source });
    }
    this.emit('alert', { level, title, message, source, timestamp: new Date() });
  }

  /**
   * Envia heartbeat para o watchdog.
   */
  heartbeat(): void {
    if (this.watchdog) {
      this.watchdog.heartbeat();
    }
  }

  /**
   * Obtém métricas atuais.
   */
  async getMetrics(): Promise<SystemMetrics | null> {
    if (this.metricsCollector) {
      return this.metricsCollector.getLatest();
    }
    return null;
  }

  /**
   * Obtém status do monitor.
   */
  getStatus(): MonitorStatus {
    return {
      running: this.running,
      startedAt: this.startedAt,
      appName: this.config.appName,
      environment: this.config.environment,
      uptime: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
      components: {
        metricsCollector: this.metricsCollector !== null,
        anomalyDetector: this.anomalyDetector !== null,
        autoHealer: this.autoHealer !== null,
        watchdog: this.watchdog !== null,
        alertManager: this.alertManager !== null,
      },
      circuitBreakers: this.circuitBreakers.size,
      rateLimiters: this.rateLimiters.size,
      healthChecks: this.healthChecks.size,
    };
  }

  /**
   * Executa health checks sob demanda.
   */
  async checkHealth(): Promise<HealthCheckResult[]> {
    return this.runHealthChecks();
  }

  /**
   * Verifica se o sistema está saudável.
   */
  async isHealthy(): Promise<boolean> {
    const results = await this.runHealthChecks();
    return results.every(r => r.healthy);
  }
}

export default AuroraMonitor;
