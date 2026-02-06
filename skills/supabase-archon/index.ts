/**
 * Supabase Archon - Skills Registry
 * Central export point for all Supabase Archon skills
 *
 * @version 1.0.0
 */

// Import all skills
export { SupabaseSchemaSentinel } from './supabase-schema-sentinel';
export { SupabaseSecretsScanner } from './supabase-secrets-scanner';

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

  return registry;
}

/**
 * Quick access to individual skills
 */
export const ArchonSkills = {
  SchemaSentinel: () => new (require('./supabase-schema-sentinel').SupabaseSchemaSentinel)(),
  SecretsScanner: () => new (require('./supabase-secrets-scanner').SupabaseSecretsScanner)(),
};
