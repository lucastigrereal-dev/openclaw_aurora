# Supabase Schema Differ (S-07) - Quick Start Guide

## Installation

```typescript
import { createSchemaDiffer } from './supabase-schema-differ';
```

## 5-Minute Quick Start

### 1. Basic Usage

```typescript
const differ = createSchemaDiffer();

const result = await differ.run({
  sourceUrl: 'https://source.supabase.co',
  sourceKey: 'anon_key_source',
  targetUrl: 'https://target.supabase.co',
  targetKey: 'anon_key_target',
});

console.log('Migration Safe:', result.data.migrationSafe);
console.log('Differences Found:', result.data.summary.totalDifferences);
```

### 2. Check Breaking Changes

```typescript
const result = await differ.run({
  sourceUrl: 'https://prod.supabase.co',
  sourceKey: prodKey,
  targetUrl: 'https://staging.supabase.co',
  targetKey: stagingKey,
  detectBreakingChanges: true,
});

if (result.data.migrationSafe) {
  console.log('✓ Safe to migrate');
} else {
  console.log('❌ Breaking changes detected:');
  result.data.differences
    .filter(d => d.breaking)
    .forEach(d => console.log(`  - ${d.objectName}`));
}
```

### 3. Get Recommendations

```typescript
const result = await differ.run({
  sourceUrl: source,
  sourceKey: sourceKey,
  targetUrl: target,
  targetKey: targetKey,
});

console.log('Migration Recommendations:');
result.data.recommendations.forEach(rec => console.log(`✓ ${rec}`));
```

### 4. Analyze by Type

```typescript
const result = await differ.run({ /* params */ });

const tableChanges = result.data.differences.filter(d => d.type === 'table');
const columnChanges = result.data.differences.filter(d => d.type === 'column');
const indexChanges = result.data.differences.filter(d => d.type === 'index');

console.log(`Tables: ${tableChanges.length}`);
console.log(`Columns: ${columnChanges.length}`);
console.log(`Indexes: ${indexChanges.length}`);
```

### 5. Export Detailed Report

```typescript
const result = await differ.run({ /* params */ });

const report = {
  timestamp: new Date().toISOString(),
  migrationSafe: result.data.migrationSafe,
  summary: result.data.summary,
  breaking: result.data.differences.filter(d => d.breaking),
  warnings: result.data.differences.filter(d => d.severity === 'warning'),
  recommendations: result.data.recommendations,
};

console.log(JSON.stringify(report, null, 2));
```

## Common Patterns

### Pattern 1: Pre-Migration Validation

```typescript
async function validateMigration(sourceDb, sourceKey, targetDb, targetKey) {
  const differ = createSchemaDiffer();

  const result = await differ.run({
    sourceUrl: sourceDb,
    sourceKey,
    targetUrl: targetDb,
    targetKey,
  });

  if (!result.success) {
    throw new Error(`Validation failed: ${result.error}`);
  }

  if (!result.data.migrationSafe) {
    console.warn('⚠️  Migration has breaking changes!');
    console.warn(result.data.recommendations.join('\n'));
    return false;
  }

  return true;
}

// Usage
if (await validateMigration(prod, prodKey, staging, stagingKey)) {
  await applyMigration();
}
```

### Pattern 2: Environment Parity Check

```typescript
async function checkEnvironmentParity() {
  const differ = createSchemaDiffer();

  const environments = [
    { name: 'dev', url: 'dev.supabase.co', key: devKey },
    { name: 'staging', url: 'staging.supabase.co', key: stagingKey },
    { name: 'prod', url: 'prod.supabase.co', key: prodKey },
  ];

  for (let i = 0; i < environments.length - 1; i++) {
    const source = environments[i];
    const target = environments[i + 1];

    const result = await differ.run({
      sourceUrl: source.url,
      sourceKey: source.key,
      targetUrl: target.url,
      targetKey: target.key,
    });

    console.log(`${source.name} → ${target.name}:`);
    console.log(`  Differences: ${result.data.summary.totalDifferences}`);
    console.log(`  Safe: ${result.data.migrationSafe ? '✓' : '✗'}`);
  }
}
```

### Pattern 3: Change Summary Report

```typescript
async function generateChangeReport(sourceDb, targetDb) {
  const differ = createSchemaDiffer();

  const result = await differ.run({
    sourceUrl: sourceDb.url,
    sourceKey: sourceDb.key,
    targetUrl: targetDb.url,
    targetKey: targetDb.key,
  });

  const diffs = result.data.differences;

  return {
    summary: {
      total: result.data.summary.totalDifferences,
      breaking: result.data.summary.breakingChanges,
      safe: result.data.summary.safeChanges,
    },
    byType: result.data.summary.byType,
    byAction: result.data.summary.byAction,
    critical: diffs.filter(d => d.severity === 'critical'),
    warnings: diffs.filter(d => d.severity === 'warning'),
    info: diffs.filter(d => d.severity === 'info'),
  };
}
```

### Pattern 4: Continuous Integration

```typescript
async function ciValidateSchemaChanges() {
  const differ = createSchemaDiffer();

  // Compare merged branch schema against prod
  const result = await differ.run({
    sourceUrl: process.env.PROD_DB_URL,
    sourceKey: process.env.PROD_DB_KEY,
    targetUrl: process.env.NEW_SCHEMA_DB_URL,
    targetKey: process.env.NEW_SCHEMA_DB_KEY,
  });

  if (!result.success) {
    console.error('Schema comparison failed:', result.error);
    process.exit(1);
  }

  // Fail if breaking changes
  if (!result.data.migrationSafe) {
    console.error('❌ Breaking changes detected - migration blocked');
    result.data.differences
      .filter(d => d.breaking)
      .forEach(d => {
        console.error(`  ${d.severity.toUpperCase()}: ${d.objectName}`);
      });
    process.exit(1);
  }

  console.log('✓ Schema changes validated successfully');
  console.log(`Differences: ${result.data.summary.totalDifferences}`);
}

// Run in CI/CD pipeline
ciValidateSchemaChanges();
```

## Output Examples

### Example 1: Safe Migration

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalDifferences": 2,
      "breakingChanges": 0,
      "safeChanges": 2,
      "byType": {
        "column": 1,
        "index": 1
      },
      "byAction": {
        "added": 2
      }
    },
    "migrationSafe": true,
    "recommendations": [
      "✓ Migration is safe - no breaking changes detected.",
      "New indexes added: Improves performance without breaking changes."
    ]
  }
}
```

### Example 2: Breaking Changes Detected

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalDifferences": 3,
      "breakingChanges": 1,
      "safeChanges": 2,
      "byType": {
        "column": 2,
        "table": 1
      },
      "byAction": {
        "removed": 1,
        "modified": 1,
        "added": 1
      }
    },
    "migrationSafe": false,
    "recommendations": [
      "⚠️  BREAKING CHANGES DETECTED: 1 breaking change(s) found. Migration may require downtime or special handling.",
      "Data may be lost when removing columns. Ensure backups exist before migration."
    ]
  }
}
```

## Skill Configuration

### Default Configuration
```typescript
{
  timeout: 120000,        // 2 minutes
  retries: 2,             // Retry twice on failure
  requiresApproval: false // No approval gate
}
```

### Custom Configuration
```typescript
const differ = new SupabaseSchemaDiffer();
// Config is set in constructor (not user-configurable)
```

## Error Scenarios

### Missing Credentials
```typescript
const result = await differ.run({
  // Missing sourceUrl, sourceKey, targetUrl, targetKey
});

// Result:
// success: false,
// error: "Missing database credentials for source or target"
```

### Network/Connection Error
```typescript
const result = await differ.run({
  sourceUrl: 'https://invalid-url.supabase.co',
  sourceKey: 'invalid_key',
  targetUrl: 'https://target.supabase.co',
  targetKey: 'valid_key',
});

// Result:
// success: false,
// error: "Failed to fetch schema: Network error"
```

## Events

```typescript
const differ = createSchemaDiffer();

differ.on('start', (data) => {
  console.log(`Started: ${data.skill}`);
});

differ.on('complete', (data) => {
  console.log(`Completed in ${data.result.duration}ms`);
});

differ.on('error', (data) => {
  console.error(`Error: ${data.error}`);
});

await differ.run(params);
```

## Tips & Tricks

### Tip 1: Filter by Severity
```typescript
const critical = result.data.differences.filter(d => d.severity === 'critical');
const warnings = result.data.differences.filter(d => d.severity === 'warning');
```

### Tip 2: Get Only Breaking Changes
```typescript
const breaking = result.data.differences.filter(d => d.breaking);
console.log(`${breaking.length} breaking changes found`);
```

### Tip 3: Detailed Object Information
```typescript
const diff = result.data.differences[0];
console.log('Before:', diff.details.before);
console.log('After:', diff.details.after);
console.log('Changes:', diff.details.changes);
```

### Tip 4: Compare Schemas Directly
```typescript
const result = await differ.run(params);
const sourceSchema = result.data.schemas.source;
const targetSchema = result.data.schemas.target;

console.log('Source tables:', sourceSchema.tables.map(t => t.name));
console.log('Target tables:', targetSchema.tables.map(t => t.name));
```

### Tip 5: Batch Processing
```typescript
async function compareMultiplePairs(pairs) {
  const differ = createSchemaDiffer();
  const results = [];

  for (const [source, target] of pairs) {
    const result = await differ.run({
      sourceUrl: source.url,
      sourceKey: source.key,
      targetUrl: target.url,
      targetKey: target.key,
    });
    results.push({ pair: source.name + ' → ' + target.name, result });
  }

  return results;
}
```

## Next Steps

1. **Review the main documentation**: See `SCHEMA_DIFFER_S07.md`
2. **Check test examples**: See `test-schema-differ.ts`
3. **Integrate into your workflow**: Use one of the patterns above
4. **Monitor migrations**: Use skill events for tracking

## Support

- **Issue Type**: Schema comparison not working
- **Check**: Verify credentials are valid and databases are accessible
- **Debug**: Enable detailed logging and review recommendations

---

**Quick Reference**
- Skill ID: S-07
- Category: UTIL
- Version: 1.0.0
- Last Updated: 2026-02-06
