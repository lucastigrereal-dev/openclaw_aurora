# Supabase Schema Differ (S-07) - Integration Guide

## Registration with Skill Registry

### Method 1: Standalone Registration

```typescript
import { getSkillRegistry } from '../skill-base';
import { createSchemaDiffer } from './supabase-schema-differ';

const registry = getSkillRegistry();
const schemaDiffer = createSchemaDiffer();

registry.register(schemaDiffer);

console.log('Schema Differ registered successfully');
```

### Method 2: Batch Registration with Other Archon Skills

```typescript
import { getSkillRegistry } from '../skill-base';
import { SupabaseSchemaSentinel } from './supabase-schema-sentinel';
import { SupabaseSchemaDiffer } from './supabase-schema-differ';
import { SupabaseRLSAuditor } from './supabase-rls-auditor';
import { SupabaseSecretsScanner } from './supabase-secrets-scanner';
import { SupabaseApprovalSystem } from './supabase-approval-system';

function registerArchonSkills() {
  const registry = getSkillRegistry();

  // Create all Archon skills
  const skills = [
    new SupabaseSchemaSentinel(),       // S-01
    new SupabaseSchemaDiffer(),          // S-07
    new SupabaseRLSAuditor(),            // S-03
    new SupabaseSecretsScanner(),        // S-05
    new SupabaseApprovalSystem(),        // S-06
  ];

  // Register all
  for (const skill of skills) {
    registry.register(skill);
    console.log(`Registered: ${skill.getInfo().name}`);
  }

  return registry;
}

const registry = registerArchonSkills();
```

### Method 3: Integrated Archon Index

Update `supabase-archon-index.ts` to include S-07:

```typescript
import { createSchemaDiffer } from './supabase-schema-differ';

export const ARCHON_SKILLS = {
  // ... existing skills ...
  'schema-differ': createSchemaDiffer(),
};

export async function initializeArchonSkills() {
  const registry = getSkillRegistry();

  // Register all skills
  for (const [, skill] of Object.entries(ARCHON_SKILLS)) {
    registry.register(skill);
  }

  return registry;
}
```

## Workflow Integration

### Integration 1: Pre-Deployment Pipeline

```typescript
import { getSkillRegistry } from '../skill-base';

async function preDeploymentValidation(deploymentConfig) {
  const registry = getSkillRegistry();

  // Step 1: Check schema differences
  const schemaDifferResult = await registry.execute('supabase-schema-differ', {
    sourceUrl: deploymentConfig.currentDbUrl,
    sourceKey: deploymentConfig.currentDbKey,
    targetUrl: deploymentConfig.newDbUrl,
    targetKey: deploymentConfig.newDbKey,
    detectBreakingChanges: true,
  });

  if (!schemaDifferResult.success) {
    throw new Error(`Schema validation failed: ${schemaDifferResult.error}`);
  }

  // Step 2: Check for security issues
  const secretsScanResult = await registry.execute('supabase-secrets-scanner', {
    supabaseUrl: deploymentConfig.newDbUrl,
    supabaseKey: deploymentConfig.newDbKey,
  });

  // Step 3: Audit RLS policies
  const rlsAuditResult = await registry.execute('supabase-rls-auditor', {
    supabaseUrl: deploymentConfig.newDbUrl,
    supabaseKey: deploymentConfig.newDbKey,
  });

  return {
    schemaValid: schemaDifferResult.data.migrationSafe,
    schemaResult: schemaDifferResult,
    securityValid: secretsScanResult.success,
    securityResult: secretsScanResult,
    rlsValid: rlsAuditResult.success,
    rlsResult: rlsAuditResult,
    canProceed:
      schemaDifferResult.data.migrationSafe &&
      secretsScanResult.success &&
      rlsAuditResult.success,
  };
}

// Usage
const validation = await preDeploymentValidation({
  currentDbUrl: 'https://prod.supabase.co',
  currentDbKey: prodKey,
  newDbUrl: 'https://new-schema.supabase.co',
  newDbKey: newKey,
});

if (validation.canProceed) {
  console.log('✓ All checks passed - proceed with deployment');
  await deploymentService.deploy();
} else {
  console.log('❌ Validation failed - review issues:');
  if (!validation.schemaValid) {
    console.log('Schema Issues:');
    validation.schemaResult.data.recommendations.forEach(rec =>
      console.log(`  - ${rec}`)
    );
  }
  // Handle other validation failures
}
```

### Integration 2: Continuous Monitoring

```typescript
import { getSkillRegistry } from '../skill-base';

async function continuousSchemaMonitoring(config) {
  const registry = getSkillRegistry();
  const sentinel = registry.get('supabase-schema-sentinel');

  // Listen for changes detected
  sentinel.on('complete', async (data) => {
    const result = data.result;

    if (result.data.changesDetected > 0) {
      console.log('Schema changes detected - running differ for analysis');

      // Automatically compare with production baseline
      const diffResult = await registry.execute('supabase-schema-differ', {
        sourceUrl: config.productionUrl,
        sourceKey: config.productionKey,
        targetUrl: config.monitoredUrl,
        targetKey: config.monitoredKey,
      });

      if (!diffResult.data.migrationSafe) {
        // Alert on breaking changes
        await alertTeam({
          severity: 'critical',
          message: 'Breaking schema changes detected',
          changes: diffResult.data.differences.filter(d => d.breaking),
        });
      }
    }
  });

  // Start monitoring every 5 minutes
  setInterval(() => sentinel.run({}), 5 * 60 * 1000);
}
```

### Integration 3: Migration Approval Workflow

```typescript
import { getSkillRegistry } from '../skill-base';

async function createMigrationApprovalRequest(migration) {
  const registry = getSkillRegistry();

  // Step 1: Analyze schema changes
  const diffResult = await registry.execute('supabase-schema-differ', {
    sourceUrl: migration.source.url,
    sourceKey: migration.source.key,
    targetUrl: migration.target.url,
    targetKey: migration.target.key,
  });

  // Step 2: Request approval if breaking changes
  if (!diffResult.data.migrationSafe) {
    const approvalResult = await registry.execute('supabase-approval-system', {
      requestType: 'migration',
      severity: diffResult.data.summary.breakingChanges > 0 ? 'critical' : 'high',
      description: `Migration requires approval: ${diffResult.data.summary.breakingChanges} breaking change(s)`,
      details: {
        schema: diffResult.data,
        migration: migration,
      },
      requiredApprovals: diffResult.data.summary.breakingChanges > 2 ? 2 : 1,
    });

    return {
      requiresApproval: true,
      approvalRequest: approvalResult,
      schemaDiff: diffResult,
    };
  }

  return {
    requiresApproval: false,
    schemaDiff: diffResult,
  };
}
```

## Custom Integration Example

```typescript
/**
 * Advanced migration validator combining multiple Archon skills
 */
class MigrationValidator {
  private registry: SkillRegistry;

  constructor(registry: SkillRegistry) {
    this.registry = registry;
  }

  async validate(migration: MigrationPlan) {
    const results = {
      schema: await this.validateSchema(migration),
      security: await this.validateSecurity(migration),
      rls: await this.validateRLS(migration),
      baseline: await this.validateBaseline(migration),
      overallSafe: false,
    };

    results.overallSafe =
      results.schema.safe &&
      results.security.safe &&
      results.rls.safe &&
      results.baseline.safe;

    return results;
  }

  private async validateSchema(migration: MigrationPlan) {
    const result = await this.registry.execute('supabase-schema-differ', {
      sourceUrl: migration.source.url,
      sourceKey: migration.source.key,
      targetUrl: migration.target.url,
      targetKey: migration.target.key,
      detectBreakingChanges: true,
    });

    return {
      safe: result.data.migrationSafe,
      breaking: result.data.summary.breakingChanges,
      differences: result.data.summary.totalDifferences,
      recommendations: result.data.recommendations,
      details: result.data,
    };
  }

  private async validateSecurity(migration: MigrationPlan) {
    const result = await this.registry.execute('supabase-secrets-scanner', {
      supabaseUrl: migration.target.url,
      supabaseKey: migration.target.key,
    });

    return {
      safe: result.success && !result.data.secretsFound,
      secretsFound: result.data.secretsFound,
      details: result.data,
    };
  }

  private async validateRLS(migration: MigrationPlan) {
    const result = await this.registry.execute('supabase-rls-auditor', {
      supabaseUrl: migration.target.url,
      supabaseKey: migration.target.key,
    });

    return {
      safe: result.success && result.data.policiesCompliant,
      issues: result.data.issues || [],
      details: result.data,
    };
  }

  private async validateBaseline(migration: MigrationPlan) {
    // Custom validation logic
    return {
      safe: true,
      details: {},
    };
  }
}

// Usage
const registry = getSkillRegistry();
const validator = new MigrationValidator(registry);

const validation = await validator.validate({
  source: { url: 'https://prod.supabase.co', key: prodKey },
  target: { url: 'https://new.supabase.co', key: newKey },
});

if (validation.overallSafe) {
  console.log('✓ Migration validation passed');
  console.log(validation.schema.recommendations);
} else {
  console.log('❌ Migration validation failed');
}
```

## Testing Integration

### Unit Test Example

```typescript
import { createSchemaDiffer } from './supabase-schema-differ';
import { describe, it, expect } from 'vitest';

describe('Schema Differ Integration', () => {
  it('should register with skill registry', () => {
    const registry = getSkillRegistry();
    const differ = createSchemaDiffer();

    registry.register(differ);
    const retrieved = registry.get('supabase-schema-differ');

    expect(retrieved).toBeDefined();
    expect(retrieved?.metadata.name).toBe('supabase-schema-differ');
  });

  it('should execute via registry', async () => {
    const registry = getSkillRegistry();
    const differ = createSchemaDiffer();

    registry.register(differ);

    const result = await registry.execute('supabase-schema-differ', {
      sourceUrl: 'https://source.supabase.co',
      sourceKey: 'key',
      targetUrl: 'https://target.supabase.co',
      targetKey: 'key',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should detect breaking changes', async () => {
    const differ = createSchemaDiffer();

    const result = await differ.run({
      sourceUrl: 'https://source.supabase.co',
      sourceKey: 'key',
      targetUrl: 'https://target.supabase.co',
      targetKey: 'key',
      detectBreakingChanges: true,
    });

    expect(result.data.summary).toBeDefined();
    expect(result.data.summary.breakingChanges).toBeGreaterThanOrEqual(0);
  });
});
```

## Environment Setup

### Development

```bash
# .env.development
SUPABASE_URL=https://dev.supabase.co
SUPABASE_KEY=dev_anon_key
TARGET_SUPABASE_URL=https://dev-new.supabase.co
TARGET_SUPABASE_KEY=dev_new_anon_key
```

### Staging

```bash
# .env.staging
SUPABASE_URL=https://staging.supabase.co
SUPABASE_KEY=staging_anon_key
TARGET_SUPABASE_URL=https://staging-new.supabase.co
TARGET_SUPABASE_KEY=staging_new_anon_key
```

### Production

```bash
# .env.production
SUPABASE_URL=https://prod.supabase.co
SUPABASE_KEY=prod_anon_key
TARGET_SUPABASE_URL=https://prod-new.supabase.co
TARGET_SUPABASE_KEY=prod_new_anon_key
```

## Monitoring & Alerting

### Example: Send Alerts on Breaking Changes

```typescript
import { getSkillRegistry } from '../skill-base';

async function setupSchemaAlerts() {
  const registry = getSkillRegistry();

  // Hook into schema differ results
  const differ = registry.get('supabase-schema-differ');

  differ?.on('complete', async (data) => {
    const result = data.result;

    if (!result.data.migrationSafe) {
      const breaking = result.data.differences.filter(d => d.breaking);

      // Send alert via webhook
      await sendAlert({
        service: 'supabase-schema-differ',
        severity: 'critical',
        message: `${breaking.length} breaking changes detected`,
        details: breaking.map(b => ({
          object: b.objectName,
          type: b.type,
          action: b.action,
        })),
      });
    }
  });
}
```

## Troubleshooting Integration

### Issue: Skill not found in registry

```typescript
// Solution: Ensure registration happens before execution
const registry = getSkillRegistry();
const differ = createSchemaDiffer();
registry.register(differ); // Must call this

// Then execute
const result = await registry.execute('supabase-schema-differ', params);
```

### Issue: Events not firing

```typescript
// Solution: Register event listeners before calling run()
const differ = createSchemaDiffer();

// Set up listeners FIRST
differ.on('start', (data) => console.log('Started'));
differ.on('complete', (data) => console.log('Done'));

// Then execute
await differ.run(params);
```

### Issue: Credentials not loading from vault

```typescript
// Solution: Explicitly set environment variables or pass params
process.env.SUPABASE_URL = 'https://...';
process.env.SUPABASE_KEY = 'key...';

// Or pass explicitly
await differ.run({
  sourceUrl: 'https://...',
  sourceKey: 'key...',
  targetUrl: 'https://...',
  targetKey: 'key...',
});
```

## Best Practices

1. **Always register before execution** - Register skills with registry before attempting to execute
2. **Use environment variables** - Store credentials in .env files or vault
3. **Check for breaking changes** - Always run schema differ before deployments
4. **Review recommendations** - Read and follow skill recommendations
5. **Test in staging** - Validate migrations in staging environment first
6. **Monitor continuously** - Use skill events for real-time monitoring
7. **Backup data** - Create database backups before applying breaking changes

---

**Integration Guide Version**: 1.0.0
**Last Updated**: 2026-02-06
**Skill ID**: S-07
