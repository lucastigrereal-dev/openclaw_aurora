/**
 * Supabase Archon - Skills Registry & Index
 *
 * Registra todas as 30 skills do Supabase Archon no OpenClaw Aurora
 *
 * @version 3.0.0 - 30/30 SKILLS COMPLETAS
 */

import { getSkillRegistryV2 } from '../skill-registry-v2';
import { SkillStatus, SkillRiskLevel } from '../skill-spec';

// Skills - P0 Segurança (4)
import { SupabaseSchemaSentinel } from './supabase-schema-sentinel';
import { SupabaseRLSAuditor } from './supabase-rls-auditor';
import { SupabasePermissionDiff } from './supabase-permission-diff';
import { SupabaseSecretsScanner } from './supabase-secrets-scanner';

// Skills - P0 Banco (5)
import { SupabaseDataAuditor } from './supabase-data-auditor';
import { SupabaseMigrationPlanner } from './supabase-migration-planner';
import { SupabaseSchemaDiffer } from './supabase-schema-differ';
import { SupabaseQueryDoctor } from './supabase-query-doctor';
import { SupabaseBackupDriller } from './supabase-backup-driller';

// Skills - P1 Operações (12)
import { SupabaseIndexOptimizer } from './supabase-index-optimizer';
import { SupabaseVacuumScheduler } from './supabase-vacuum-scheduler';
import { SupabaseConnectionPool } from './supabase-connection-pool';
import { SupabaseHealthDashboard } from './supabase-health-dashboard';
import { SupabaseCircuitBreaker } from './supabase-circuit-breaker';
import { SupabaseRateLimiter } from './supabase-rate-limiter';
import { SupabaseCacheWarmer } from './supabase-cache-warmer';
import { SupabaseQueryCache } from './supabase-query-cache';
import { SupabaseSlowQueryLogger } from './supabase-slow-query-logger';
import { SupabaseTransactionMonitor } from './supabase-transaction-monitor';
import { SupabaseDeadlockDetector } from './supabase-deadlock-detector';

// Skills - P2 Avançadas (9)
import { SupabaseReplicationMonitor } from './supabase-replication-monitor';
import { SupabaseTableBloatDetector } from './supabase-table-bloat-detector';
import { SupabaseLockMonitor } from './supabase-lock-monitor';
import { SupabasePartitionManager } from './supabase-partition-manager';
import { SupabaseStatisticsCollector } from './supabase-statistics-collector';
import { SupabaseDiskUsageMonitor } from './supabase-disk-usage-monitor';
import { SupabaseComplianceReporter } from './supabase-compliance-reporter';
import { SupabaseCostAnalyzer } from './supabase-cost-analyzer';
import { SupabaseEdgeFunctionMonitor } from './supabase-edge-function-monitor';
import { SupabaseAIQueryOptimizer } from './supabase-ai-query-optimizer';

// Config
import { getVault } from './supabase-vault-config';

/**
 * Registra todas as 30 skills do Supabase Archon
 */
export function registerSupabaseArchonSkills(): void {
  const registry = getSkillRegistryV2();

  console.log('[SupabaseArchon] Registering 30 enterprise skills...');

  // === P0 SEGURANÇA (4 skills) ===

  registry.register(new SupabaseSchemaSentinel(), {
    name: 'supabase-schema-sentinel',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Monitors unauthorized schema changes 24/7 with real-time alerts',
    tags: ['supabase', 'security', 'monitoring', 'schema'],
  });

  registry.register(new SupabaseRLSAuditor(), {
    name: 'supabase-rls-auditor',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Audits Row Level Security policies and detects weak configurations',
    tags: ['supabase', 'security', 'rls', 'audit'],
  });

  registry.register(new SupabasePermissionDiff(), {
    name: 'supabase-permission-diff',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Detects permission changes and escalations between baseline and current state',
    tags: ['supabase', 'security', 'permissions', 'compliance'],
  });

  registry.register(new SupabaseSecretsScanner(), {
    name: 'supabase-secrets-scanner',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Scans code and configs for exposed credentials and secrets',
    tags: ['supabase', 'security', 'secrets', 'credentials'],
  });

  // === P0 BANCO (5 skills) ===

  registry.register(new SupabaseDataAuditor(), {
    name: 'supabase-data-auditor',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Audits data integrity, detects anomalies, validates business rules',
    tags: ['supabase', 'data', 'audit', 'integrity'],
  });

  registry.register(new SupabaseMigrationPlanner(), {
    name: 'supabase-migration-planner',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'UTIL',
    description: 'Plans and validates database migrations with rollback support',
    tags: ['supabase', 'migrations', 'database', 'schema'],
  });

  registry.register(new SupabaseSchemaDiffer(), {
    name: 'supabase-schema-differ',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Compares schemas and generates migration SQL automatically',
    tags: ['supabase', 'schema', 'diff', 'migrations'],
  });

  registry.register(new SupabaseQueryDoctor(), {
    name: 'supabase-query-doctor',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Analyzes SQL queries for performance issues, missing indexes, and optimization opportunities',
    tags: ['supabase', 'performance', 'query', 'optimization'],
  });

  registry.register(new SupabaseBackupDriller(), {
    name: 'supabase-backup-driller',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'UTIL',
    description: 'Creates, validates and tests database backups with integrity checks',
    tags: ['supabase', 'backup', 'recovery', 'disaster-recovery'],
  });

  // === P1 OPERAÇÕES (12 skills) ===

  registry.register(new SupabaseIndexOptimizer(), {
    name: 'supabase-index-optimizer',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'UTIL',
    description: 'Analyzes query patterns and recommends optimal indexes',
    tags: ['supabase', 'performance', 'indexes', 'optimization'],
  });

  registry.register(new SupabaseVacuumScheduler(), {
    name: 'supabase-vacuum-scheduler',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'UTIL',
    description: 'Schedules and manages PostgreSQL VACUUM operations',
    tags: ['supabase', 'maintenance', 'vacuum', 'performance'],
  });

  registry.register(new SupabaseConnectionPool(), {
    name: 'supabase-connection-pool',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Manages database connection pools for optimal resource utilization',
    tags: ['supabase', 'connections', 'pool', 'resources'],
  });

  registry.register(new SupabaseHealthDashboard(), {
    name: 'supabase-health-dashboard',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Real-time health monitoring: connections, query performance, disk usage, replication lag',
    tags: ['supabase', 'monitoring', 'health', 'performance', 'real-time'],
  });

  registry.register(new SupabaseCircuitBreaker(), {
    name: 'supabase-circuit-breaker',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Circuit breaker pattern to prevent cascade failures',
    tags: ['supabase', 'resilience', 'circuit-breaker', 'failure-prevention'],
  });

  registry.register(new SupabaseRateLimiter(), {
    name: 'supabase-rate-limiter',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Rate limiting for API and database operations',
    tags: ['supabase', 'rate-limit', 'throttling', 'protection'],
  });

  registry.register(new SupabaseCacheWarmer(), {
    name: 'supabase-cache-warmer',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Pre-loads frequently accessed data into cache',
    tags: ['supabase', 'cache', 'performance', 'optimization'],
  });

  registry.register(new SupabaseQueryCache(), {
    name: 'supabase-query-cache',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Intelligent query result caching with smart invalidation',
    tags: ['supabase', 'cache', 'query', 'performance'],
  });

  registry.register(new SupabaseSlowQueryLogger(), {
    name: 'supabase-slow-query-logger',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Logs and analyzes slow database queries',
    tags: ['supabase', 'performance', 'slow-queries', 'monitoring'],
  });

  registry.register(new SupabaseTransactionMonitor(), {
    name: 'supabase-transaction-monitor',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Monitors long-running transactions and deadlocks',
    tags: ['supabase', 'transactions', 'monitoring', 'performance'],
  });

  registry.register(new SupabaseDeadlockDetector(), {
    name: 'supabase-deadlock-detector',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Detects and resolves database deadlocks',
    tags: ['supabase', 'deadlocks', 'monitoring', 'resolution'],
  });

  // === P2 AVANÇADAS (9 skills) ===

  registry.register(new SupabaseReplicationMonitor(), {
    name: 'supabase-replication-monitor',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Monitors database replication lag and status',
    tags: ['supabase', 'replication', 'monitoring', 'high-availability'],
  });

  registry.register(new SupabaseTableBloatDetector(), {
    name: 'supabase-table-bloat-detector',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Detects and reports table/index bloat',
    tags: ['supabase', 'bloat', 'maintenance', 'optimization'],
  });

  registry.register(new SupabaseLockMonitor(), {
    name: 'supabase-lock-monitor',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Monitors database locks and blocking queries',
    tags: ['supabase', 'locks', 'monitoring', 'performance'],
  });

  registry.register(new SupabasePartitionManager(), {
    name: 'supabase-partition-manager',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'UTIL',
    description: 'Manages table partitioning automatically',
    tags: ['supabase', 'partitioning', 'performance', 'scalability'],
  });

  registry.register(new SupabaseStatisticsCollector(), {
    name: 'supabase-statistics-collector',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Collects and analyzes database statistics',
    tags: ['supabase', 'statistics', 'analytics', 'insights'],
  });

  registry.register(new SupabaseDiskUsageMonitor(), {
    name: 'supabase-disk-usage-monitor',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Monitors disk usage and predicts capacity issues',
    tags: ['supabase', 'disk', 'storage', 'capacity'],
  });

  registry.register(new SupabaseComplianceReporter(), {
    name: 'supabase-compliance-reporter',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Generates compliance reports (LGPD, GDPR, SOC2)',
    tags: ['supabase', 'compliance', 'lgpd', 'gdpr', 'audit'],
  });

  registry.register(new SupabaseCostAnalyzer(), {
    name: 'supabase-cost-analyzer',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Analyzes and optimizes Supabase costs',
    tags: ['supabase', 'cost', 'optimization', 'analytics'],
  });

  registry.register(new SupabaseEdgeFunctionMonitor(), {
    name: 'supabase-edge-function-monitor',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Monitors Supabase Edge Functions performance',
    tags: ['supabase', 'edge-functions', 'monitoring', 'performance'],
  });

  registry.register(new SupabaseAIQueryOptimizer(), {
    name: 'supabase-ai-query-optimizer',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'AI-powered query optimizer with automatic rewriting and index suggestions',
    tags: ['supabase', 'ai', 'query', 'optimization', 'machine-learning'],
  });

  console.log('[SupabaseArchon] ✅ 30/30 skills registered successfully!');
}

/**
 * Obtém estatísticas do Supabase Archon
 */
export function getSupabaseArchonStats() {
  const registry = getSkillRegistryV2();

  const supabaseSkills = registry.listAll().filter(spec =>
    spec.name.startsWith('supabase-')
  );

  return {
    totalSkills: supabaseSkills.length,
    targetSkills: 30,
    progress: `${supabaseSkills.length}/30`,
    completed: supabaseSkills.length === 30,
    skills: supabaseSkills.map(spec => ({
      name: spec.name,
      version: spec.version,
      status: spec.status,
      category: spec.category,
    })),
  };
}

// Exports
export { SupabaseSchemaSentinel, SupabaseRLSAuditor, SupabasePermissionDiff, SupabaseSecretsScanner };
export { SupabaseDataAuditor, SupabaseMigrationPlanner, SupabaseSchemaDiffer, SupabaseQueryDoctor, SupabaseBackupDriller };
export { SupabaseIndexOptimizer, SupabaseVacuumScheduler, SupabaseConnectionPool, SupabaseHealthDashboard };
export { SupabaseCircuitBreaker, SupabaseRateLimiter, SupabaseCacheWarmer, SupabaseQueryCache };
export { SupabaseSlowQueryLogger, SupabaseTransactionMonitor, SupabaseDeadlockDetector };
export { SupabaseReplicationMonitor, SupabaseTableBloatDetector, SupabaseLockMonitor, SupabasePartitionManager };
export { SupabaseStatisticsCollector, SupabaseDiskUsageMonitor, SupabaseComplianceReporter, SupabaseCostAnalyzer };
export { SupabaseEdgeFunctionMonitor, SupabaseAIQueryOptimizer };
export { createLogger } from './supabase-logger';
export { getVault, VaultManager } from './supabase-vault-config';
export { getApprovalSystem } from './supabase-approval-system';
