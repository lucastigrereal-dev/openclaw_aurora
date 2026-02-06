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
// import { SupabaseRLSAuditor } from './supabase-rls-auditor'; // TODO: Implementar Dia 3
// import { SupabasePermissionDiff } from './supabase-permission-diff'; // TODO: Implementar Dia 4
// import { SupabaseSecretsScanner } from './supabase-secrets-scanner'; // TODO: Implementar Dia 4

// Skills - P0 Banco
// import { SupabaseMigrationPlanner } from './supabase-migration-planner'; // TODO: Implementar Dia 5
// import { SupabaseSchemaDiffer } from './supabase-schema-differ'; // TODO: Implementar Dia 5
// import { SupabaseQueryDoctor } from './supabase-query-doctor'; // TODO: Implementar Dia 6
// import { SupabaseBackupDriller } from './supabase-backup-driller'; // TODO: Implementar Dia 6

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

  // TODO: Registrar mais skills conforme forem implementadas
  // Dias 3-4: RLS Auditor, Permission Diff, Secrets Scanner
  // Dias 5-6: Migration Planner, Schema Differ, Query Doctor, Backup Driller

  console.log('[SupabaseArchon] ✓ 1 skill registered (29 more to come)');
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

// Exports
export { SupabaseSchemaSentinel };
export { createLogger } from './supabase-logger';
export { getVault, VaultManager } from './supabase-vault-config';
