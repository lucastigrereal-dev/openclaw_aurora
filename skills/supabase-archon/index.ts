/**
 * Supabase Archon - Skills Registry
 * Central export point for all Supabase Archon skills
 *
 * @version 1.0.0
 */

// Import all skills
export { SupabaseSchemaSentinel } from './supabase-schema-sentinel';
export { SupabaseSecretsScanner } from './supabase-secrets-scanner';
export { SupabaseIndexOptimizer } from './supabase-index-optimizer';
export { SupabaseCircuitBreaker } from './supabase-circuit-breaker';
export { SupabaseTableBloatDetector } from './supabase-table-bloat-detector';
export { SupabaseDiskUsageMonitor } from './supabase-disk-usage-monitor';
export { SupabaseHealthDashboard } from './supabase-health-dashboard';

// Import types
export type {
  SchemaChange,
  SchemaSentinelParams,
  SchemaSentinelResult,
} from './supabase-schema-sentinel';

export type {
  SecretsScannerParams,
  ExposedSecret,
  SecretsScannerResult,
} from './supabase-secrets-scanner';

export type {
  IndexRecommendation,
  IndexAnalysis,
  IndexOptimizerParams,
  IndexOptimizerResult,
} from './supabase-index-optimizer';

export type {
  CircuitState,
  CircuitBreakerMetrics,
  CircuitBreakerAlert,
  CircuitBreakerParams,
  CircuitBreakerResult,
} from './supabase-circuit-breaker';

export type {
  TableBloatMetric,
  IndexBloatMetric,
  BloatTrend,
  TableBloatDetectorParams,
  TableBloatDetectorResult,
} from './supabase-table-bloat-detector';

export type {
  TableDiskUsage,
  IndexDiskUsage,
  DiskUsageSummary,
  CapacityPrediction,
  LargeObject,
  CleanupRecommendation,
  DiskAlert,
  DiskMonitorParams,
  DiskMonitorResult,
} from './supabase-disk-usage-monitor';

export type {
  ConnectionMetrics,
  QueryMetrics,
  DiskMetrics,
  ReplicationMetrics,
  HealthMetrics,
  HealthAlert,
  HealthDashboardParams,
  HealthDashboardResult,
} from './supabase-health-dashboard';

// Import utilities
export { createLogger, SupabaseLogger } from './supabase-logger';
export type { LogEntry } from './supabase-logger';

/**
 * Initialize and register all Archon skills
 */
export function initializeArchonSkills() {
  const { getSkillRegistry } = require('../skill-base');

  const registry = getSkillRegistry();

  // Register all Archon skills
  registry.register(new (require('./supabase-schema-sentinel').SupabaseSchemaSentinel)());
  registry.register(new (require('./supabase-secrets-scanner').SupabaseSecretsScanner)());
  registry.register(new (require('./supabase-index-optimizer').SupabaseIndexOptimizer)());
  registry.register(new (require('./supabase-disk-usage-monitor').SupabaseDiskUsageMonitor)());
  registry.register(new (require('./supabase-health-dashboard').SupabaseHealthDashboard)());

  return registry;
}

/**
 * Quick access to individual skills
 */
export const ArchonSkills = {
  SchemaSentinel: () => new (require('./supabase-schema-sentinel').SupabaseSchemaSentinel)(),
  SecretsScanner: () => new (require('./supabase-secrets-scanner').SupabaseSecretsScanner)(),
  IndexOptimizer: () => new (require('./supabase-index-optimizer').SupabaseIndexOptimizer)(),
  CircuitBreaker: () => new (require('./supabase-circuit-breaker').SupabaseCircuitBreaker)(),
  TableBloatDetector: () => new (require('./supabase-table-bloat-detector').SupabaseTableBloatDetector)(),
  DiskUsageMonitor: () => new (require('./supabase-disk-usage-monitor').SupabaseDiskUsageMonitor)(),
  HealthDashboard: () => new (require('./supabase-health-dashboard').SupabaseHealthDashboard)(),
};
