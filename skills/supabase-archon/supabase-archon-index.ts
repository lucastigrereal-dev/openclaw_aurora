/**
 * Supabase Archon - Skills Registry & Index
 *
 * Registra todas as skills do Supabase Archon no OpenClaw Aurora
 *
 * @version 1.0.0
 */

import { getSkillRegistryV2 } from '../skill-registry-v2';
import { SkillStatus, SkillRiskLevel } from '../skill-spec';

// Skills - P0 Segurança
import { SupabaseSchemaSentinel } from './supabase-schema-sentinel';
import { SupabaseRLSAuditor } from './supabase-rls-auditor';
import { SupabasePermissionDiff } from './supabase-permission-diff';
import { SupabaseSecretsScanner } from './supabase-secrets-scanner';

// Skills - P0 Banco
import { SupabaseMigrationPlanner } from './supabase-migration-planner';
import { SupabaseSchemaDiffer } from './supabase-schema-differ';
import { SupabaseQueryDoctor } from './supabase-query-doctor';
import { SupabaseBackupDriller } from './supabase-backup-driller';

// Skills - P1 Monitoramento
import { SupabaseHealthDashboard } from './supabase-health-dashboard';

// Config
import { getVault } from './supabase-vault-config';

/**
 * Registra todas as skills do Supabase Archon
 */
export function registerSupabaseArchonSkills(): void {
  const registry = getSkillRegistryV2();

  console.log('[SupabaseArchon] Registering skills...');

  // S-01: Schema Sentinel
  const schemaSentinel = new SupabaseSchemaSentinel();
  registry.register(schemaSentinel, {
    name: 'supabase-schema-sentinel',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Monitors unauthorized schema changes 24/7 with real-time alerts',
    tags: ['supabase', 'security', 'monitoring', 'schema'],
  });

  // S-02: RLS Auditor Pro
  const rlsAuditor = new SupabaseRLSAuditor();
  registry.register(rlsAuditor, {
    name: 'supabase-rls-auditor',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Audits Row Level Security policies and detects weak configurations',
    tags: ['supabase', 'security', 'rls', 'audit'],
  });

  // S-03: Permission Diff Engine
  const permissionDiff = new SupabasePermissionDiff();
  registry.register(permissionDiff, {
    name: 'supabase-permission-diff',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Detects permission changes and escalations between baseline and current state',
    tags: ['supabase', 'security', 'permissions', 'compliance'],
  });

  // S-04: Secrets Scanner
  const secretsScanner = new SupabaseSecretsScanner();
  registry.register(secretsScanner, {
    name: 'supabase-secrets-scanner',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Scans code and configs for exposed credentials and secrets',
    tags: ['supabase', 'security', 'secrets', 'credentials'],
  });

  // S-06: Migration Planner Pro
  const migrationPlanner = new SupabaseMigrationPlanner();
  registry.register(migrationPlanner, {
    name: 'supabase-migration-planner',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'UTIL',
    description: 'Plans and validates database migrations with rollback support',
    tags: ['supabase', 'migrations', 'database', 'schema'],
  });

  // S-07: Schema Differ Genius
  const schemaDiffer = new SupabaseSchemaDiffer();
  registry.register(schemaDiffer, {
    name: 'supabase-schema-differ',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Compares schemas and generates migration SQL automatically',
    tags: ['supabase', 'schema', 'diff', 'migrations'],
  });

  // S-08: Query Doctor
  const queryDoctor = new SupabaseQueryDoctor();
  registry.register(queryDoctor, {
    name: 'supabase-query-doctor',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Analyzes SQL queries for performance issues, missing indexes, and optimization opportunities',
    tags: ['supabase', 'performance', 'query', 'optimization'],
  });

  // S-11: Backup Driller
  const backupDriller = new SupabaseBackupDriller();
  registry.register(backupDriller, {
    name: 'supabase-backup-driller',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'UTIL',
    description: 'Creates, validates and tests database backups with integrity checks',
    tags: ['supabase', 'backup', 'recovery', 'disaster-recovery'],
  });

  // S-13: Health Dashboard Live
  const healthDashboard = new SupabaseHealthDashboard();
  registry.register(healthDashboard, {
    name: 'supabase-health-dashboard',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Real-time health monitoring for Supabase: connections, query performance, disk usage, replication lag',
    tags: ['supabase', 'monitoring', 'health', 'performance', 'real-time'],
  });

  console.log('[SupabaseArchon] ✓ 9 skills registered (21 more to come)');
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
    skills: supabaseSkills.map(spec => ({
      name: spec.name,
      version: spec.version,
      status: spec.status,
      category: spec.category,
    })),
  };
}

/**
 * Executar Schema Sentinel (atalho)
 */
export async function runSchemaSentinel(params?: any) {
  const registry = getSkillRegistryV2();
  const vault = getVault();

  return registry.execute('supabase-schema-sentinel', {
    supabaseUrl: vault.get('SUPABASE_URL'),
    supabaseKey: vault.get('SUPABASE_KEY'),
    checkInterval: 300000, // 5 minutes
    ...params,
  });
}

/**
 * Executar Query Doctor (atalho)
 */
export async function runQueryDoctor(query: string, params?: any) {
  const registry = getSkillRegistryV2();
  const vault = getVault();

  return registry.execute('supabase-query-doctor', {
    query,
    supabaseUrl: vault.get('SUPABASE_URL'),
    supabaseKey: vault.get('SUPABASE_KEY'),
    ...params,
  });
}

/**
 * Executar Health Dashboard (atalho)
 */
export async function runHealthDashboard(params?: any) {
  const registry = getSkillRegistryV2();
  const vault = getVault();

  return registry.execute('supabase-health-dashboard', {
    supabaseUrl: vault.get('SUPABASE_URL'),
    supabaseKey: vault.get('SUPABASE_KEY'),
    includeMetrics: ['all'],
    ...params,
  });
}

// Exports
export { SupabaseSchemaSentinel };
export { SupabaseRLSAuditor };
export { SupabasePermissionDiff };
export { SupabaseSecretsScanner };
export { SupabaseMigrationPlanner };
export { SupabaseSchemaDiffer };
export { SupabaseQueryDoctor };
export { SupabaseBackupDriller };
export { SupabaseHealthDashboard };
export { createLogger } from './supabase-logger';
export { getVault, VaultManager } from './supabase-vault-config';
export { getApprovalSystem } from './supabase-approval-system';
