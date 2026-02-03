/**
 * Aurora Monitor - Sistema de Monitoramento para OpenClaw
 *
 * Fornece proteção contra crashes através de:
 * - Circuit Breakers
 * - Rate Limiters
 * - Auto-Healing
 * - Detecção de Anomalias
 * - Alertas em tempo real
 *
 * @example
 * ```typescript
 * import { createOpenClawIntegration, createMetricsServer } from 'aurora-monitor';
 *
 * // Cria integração
 * const aurora = createOpenClawIntegration();
 *
 * // Registra canal Telegram
 * const telegram = aurora.registerChannel({
 *   name: 'telegram',
 *   type: 'telegram',
 *   isConnected: () => bot.isConnected,
 *   connect: () => bot.connect(),
 *   disconnect: () => bot.disconnect(),
 *   sendMessage: (chatId, msg) => bot.sendMessage(chatId, msg),
 * });
 *
 * // Registra provider Claude
 * const claude = aurora.registerAIProvider({
 *   name: 'claude',
 *   type: 'claude',
 *   isAvailable: () => true,
 *   complete: (prompt) => anthropic.complete(prompt),
 * });
 *
 * // Inicia monitoramento
 * aurora.start();
 *
 * // Inicia servidor de métricas para o dashboard
 * const server = createMetricsServer(aurora, { port: 18790 });
 * server.start();
 * ```
 */

// Core
export { AuroraMonitor } from './core/monitor';
export { MonitorConfig, defaultConfig, loadConfigFromEnv } from './core/config';

// Protection
export {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitState,
  CircuitBreakerError,
  circuitBreakerManager,
} from './protection/circuit-breaker';
export type { CircuitBreakerOptions, CircuitBreakerStats } from './protection/circuit-breaker';

export {
  RateLimiter,
  RateLimiterManager,
  RateLimitError,
  rateLimiterManager,
  createTelegramLimiter,
  createClaudeLimiter,
  createGPTLimiter,
  createOllamaLimiter,
} from './protection/rate-limiter';
export type { RateLimiterOptions, RateLimiterStats } from './protection/rate-limiter';

// Collectors
export { MetricsCollector } from './collectors/metrics';
export type {
  SystemMetrics,
  CPUMetrics,
  MemoryMetrics,
  DiskMetrics,
  NetworkMetrics,
  ProcessMetrics,
  GCMetrics,
} from './collectors/metrics';

// Detectors
export { AnomalyDetector, AnomalyType, AnomalySeverity } from './detectors/anomaly';
export type { Anomaly } from './detectors/anomaly';

// Healing
export { AutoHealer, HealingActionType } from './healing/auto-healer';
export type { HealingAction, HealingTarget, ReconnectOptions } from './healing/auto-healer';

export { ProcessWatchdog, WatchdogState, createOpenClawWatchdog } from './healing/watchdog';
export type { WatchdogStatus } from './healing/watchdog';

// Alerts
export { AlertManager, AlertLevel } from './alerts/alert-manager';
export type { Alert, AlertInput } from './alerts/alert-manager';

// Integrations
export {
  OpenClawIntegration,
  ProtectedChannel,
  ProtectedAIProvider,
  createOpenClawIntegration,
} from './integrations/openclaw';
export type {
  OpenClawChannel,
  AIProvider,
  OpenClawIntegrationOptions,
} from './integrations/openclaw';

export {
  AuroraWebSocketServer,
  createMetricsServer,
} from './integrations/websocket-server';
export type {
  MetricsServerOptions,
  MetricsMessage,
} from './integrations/websocket-server';

// Utility: Logger
export { AuroraLogger } from './utils/logger';

// Quick start helper
export function quickStart(options?: {
  port?: number;
  enableDashboard?: boolean;
}) {
  const integration = createOpenClawIntegration();
  integration.start();

  if (options?.enableDashboard !== false) {
    const { createMetricsServer } = require('./integrations/websocket-server');
    const server = createMetricsServer(integration, {
      port: options?.port || 18790,
    });
    server.start();
    return { integration, server };
  }

  return { integration };
}
