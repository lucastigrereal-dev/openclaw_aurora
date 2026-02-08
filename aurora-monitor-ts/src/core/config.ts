/**
 * Configuração do Aurora Monitor
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface MetricsConfig {
  enabled: boolean;
  collectionInterval: number; // ms
  historySize: number;
  cpuThreshold: number; // percent
  memoryThreshold: number; // percent
  diskThreshold: number; // percent
  eventLoopLagThreshold: number; // ms
  includeProcessMetrics: boolean;
}

export interface AnomalyConfig {
  enabled: boolean;
  detectionInterval: number; // ms
  windowSize: number; // number of samples
  zScoreThreshold: number;
  trendThreshold: number; // percent change
  spikeMultiplier: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // ms
}

export interface RateLimiterConfig {
  requestsPerSecond: number;
  burstSize: number;
}

export interface AutoHealerConfig {
  enabled: boolean;
  gcOnHighMemory: boolean;
  memoryThreshold: number; // percent
  maxHealAttempts: number;
  healCooldown: number; // ms
}

export interface WatchdogConfig {
  enabled: boolean;
  heartbeatTimeout: number; // ms
  checkInterval: number; // ms
}

export interface HealthCheckConfig {
  enabled: boolean;
  checkInterval: number; // ms
  timeout: number; // ms per check
}

export interface AlertConfig {
  enabled: boolean;
  cooldown: number; // ms between same alerts
  aggregateAlerts: boolean;
  slackWebhook?: string;
  discordWebhook?: string;
  customWebhook?: string;
}

export interface MonitorConfig {
  appName: string;
  environment: string;
  logLevel: LogLevel;
  jsonLogs: boolean;
  metrics: MetricsConfig;
  anomaly: AnomalyConfig;
  circuitBreaker: CircuitBreakerConfig;
  rateLimiter: RateLimiterConfig;
  autoHealer: AutoHealerConfig;
  watchdog: WatchdogConfig;
  healthCheck: HealthCheckConfig;
  alerts: AlertConfig;
}

export const defaultConfig: MonitorConfig = {
  appName: 'openclaw',
  environment: process.env.NODE_ENV || 'development',
  logLevel: 'info',
  jsonLogs: process.env.NODE_ENV === 'production',

  metrics: {
    enabled: true,
    collectionInterval: 5000, // 5 seconds
    historySize: 1000,
    cpuThreshold: 80,
    memoryThreshold: 85,
    diskThreshold: 90,
    eventLoopLagThreshold: 100, // 100ms
    includeProcessMetrics: true,
  },

  anomaly: {
    enabled: true,
    detectionInterval: 10000, // 10 seconds
    windowSize: 60, // samples
    zScoreThreshold: 3.0,
    trendThreshold: 20, // 20% change
    spikeMultiplier: 2.5,
  },

  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000, // 30 seconds
  },

  rateLimiter: {
    requestsPerSecond: 100,
    burstSize: 150,
  },

  autoHealer: {
    enabled: true,
    gcOnHighMemory: true,
    memoryThreshold: 85,
    maxHealAttempts: 3,
    healCooldown: 60000, // 1 minute
  },

  watchdog: {
    enabled: true,
    heartbeatTimeout: 30000, // 30 seconds
    checkInterval: 5000, // 5 seconds
  },

  healthCheck: {
    enabled: true,
    checkInterval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds per check
  },

  alerts: {
    enabled: true,
    cooldown: 300000, // 5 minutes
    aggregateAlerts: true,
  },
};

/**
 * Carrega configuração de variáveis de ambiente.
 */
export function loadConfigFromEnv(): Partial<MonitorConfig> {
  const config: Partial<MonitorConfig> = {};

  if (process.env.AURORA_APP_NAME) {
    config.appName = process.env.AURORA_APP_NAME;
  }

  if (process.env.AURORA_LOG_LEVEL) {
    config.logLevel = process.env.AURORA_LOG_LEVEL as LogLevel;
  }

  if (process.env.AURORA_SLACK_WEBHOOK) {
    config.alerts = {
      ...defaultConfig.alerts,
      slackWebhook: process.env.AURORA_SLACK_WEBHOOK,
    };
  }

  if (process.env.AURORA_DISCORD_WEBHOOK) {
    config.alerts = {
      ...defaultConfig.alerts,
      ...config.alerts,
      discordWebhook: process.env.AURORA_DISCORD_WEBHOOK,
    };
  }

  if (process.env.AURORA_CPU_THRESHOLD) {
    config.metrics = {
      ...defaultConfig.metrics,
      cpuThreshold: parseInt(process.env.AURORA_CPU_THRESHOLD, 10),
    };
  }

  if (process.env.AURORA_MEMORY_THRESHOLD) {
    config.metrics = {
      ...defaultConfig.metrics,
      ...config.metrics,
      memoryThreshold: parseInt(process.env.AURORA_MEMORY_THRESHOLD, 10),
    };
  }

  return config;
}
