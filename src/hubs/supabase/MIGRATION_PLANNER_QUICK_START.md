# Supabase Migration Planner Pro (S-06) - Quick Start

## TL;DR

**What**: Safe schema migration planning for Supabase/PostgreSQL
**Why**: Generate safe migration steps, detect breaking changes, auto-generate rollback scripts
**How**: Pass target schema, get migration plan with risk assessment

## Installation

The skill is already integrated in the Supabase Archon system:

```typescript
import { SupabaseMigrationPlanner } from './skills/supabase-archon/supabase-migration-planner';

const planner = new SupabaseMigrationPlanner();
```

## Quick Examples

### 1. Create a New Table

```typescript
const result = await planner.run({
  targetSchema: {
    tables: [
      {
        name: 'products',
        columns: [
          { name: 'id', dataType: 'uuid', isPrimaryKey: true },
          { name: 'name', dataType: 'varchar(255)', isNullable: false },
          { name: 'price', dataType: 'numeric(10,2)', isNullable: false },
          { name: 'created_at', dataType: 'timestamp', defaultValue: 'CURRENT_TIMESTAMP' },
        ],
      },
    ],
  },
});

console.log(result.data?.steps); // Migration steps
console.log(result.data?.rollbackScript); // Rollback SQL
```

### 2. Add Column with Default

```typescript
const result = await planner.run({
  currentSchema: {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', dataType: 'uuid', isPrimaryKey: true },
          { name: 'email', dataType: 'varchar(255)' },
        ],
      },
    ],
  },
  targetSchema: {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', dataType: 'uuid', isPrimaryKey: true },
          { name: 'email', dataType: 'varchar(255)' },
          { name: 'verified', dataType: 'boolean', defaultValue: 'false' }, // NEW
        ],
      },
    ],
  },
});

// Risk: LOW (has default value)
// Steps: 1 (ALTER TABLE ADD COLUMN)
```

### 3. Detect Breaking Changes

```typescript
const result = await planner.run({
  currentSchema: {
    tables: [
      {
        name: 'orders',
        columns: [
          { name: 'id', dataType: 'uuid', isPrimaryKey: true },
          { name: 'user_id', dataType: 'uuid' },
          { name: 'total', dataType: 'numeric(10,2)' },
        ],
      },
    ],
  },
  targetSchema: {
    tables: [
      {
        name: 'orders',
        columns: [
          { name: 'id', dataType: 'uuid', isPrimaryKey: true },
          { name: 'user_id', dataType: 'uuid' },
          // 'total' column removed!
        ],
      },
    ],
  },
});

// Result includes:
// breakingChanges: ["Column 'total' will be removed..."]
// dataLossRisks: ["All data in column 'total' will be permanently deleted"]
// riskLevel: 'high'
```

### 4. Type Conversion

```typescript
const result = await planner.run({
  currentSchema: {
    tables: [
      {
        name: 'metrics',
        columns: [
          { name: 'id', dataType: 'uuid', isPrimaryKey: true },
          { name: 'count', dataType: 'integer' },
        ],
      },
    ],
  },
  targetSchema: {
    tables: [
      {
        name: 'metrics',
        columns: [
          { name: 'id', dataType: 'uuid', isPrimaryKey: true },
          { name: 'count', dataType: 'bigint' }, // int → bigint
        ],
      },
    ],
  },
});

// SQL: ALTER TABLE metrics ALTER COLUMN count TYPE bigint;
// Risk: HIGH (type conversion)
```

### 5. Drop Deprecated Column

```typescript
const result = await planner.run({
  currentSchema: {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', dataType: 'uuid', isPrimaryKey: true },
          { name: 'email', dataType: 'varchar(255)' },
          { name: 'legacy_field', dataType: 'text' }, // Deprecated
        ],
      },
    ],
  },
  targetSchema: {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', dataType: 'uuid', isPrimaryKey: true },
          { name: 'email', dataType: 'varchar(255)' },
        ],
      },
    ],
  },
});

// Warning: Data loss risk!
// Rollback includes: ALTER TABLE ADD COLUMN legacy_field ...
```

## Response Structure

```typescript
interface Result {
  success: boolean;
  data?: {
    steps: Array<{
      order: number;
      type: 'create' | 'alter' | 'drop' | 'data';
      sql: string;
      rollbackSql?: string;
      riskLevel: 'low' | 'medium' | 'high';
      estimatedTime: string;
      dependencies: string[];
      description?: string;
    }>;
    breakingChanges: string[];      // Code-breaking changes
    dataLossRisks: string[];        // Data loss risks
    estimatedDuration: string;      // Total time
    executionOrder: string[];       // Step order for humans
    rollbackScript?: string;        // Complete rollback SQL
  };
  error?: string;
}
```

## Key Concepts

### Risk Levels

| Level | Examples | Action |
|-------|----------|--------|
| **LOW** | CREATE TABLE, ADD nullable column, CREATE INDEX | Safe to execute |
| **MEDIUM** | ADD non-nullable column without default | Review first |
| **HIGH** | DROP COLUMN, ALTER TYPE, DROP TABLE | Extra review required |

### Breaking Changes vs Data Loss

- **Breaking Changes**: Code that queries/uses the changed schema will fail
  - Examples: Column removed, table dropped, type changed

- **Data Loss Risks**: Data will be permanently deleted
  - Examples: Column drop, table drop, lossy type conversion

### Execution Order

Always follows this sequence:

1. CREATE ENUM (needed by tables)
2. CREATE TABLE
3. ADD COLUMN
4. ALTER COLUMN
5. CREATE INDEX
6. DROP INDEX (before column/table drops)
7. DROP COLUMN
8. DROP TABLE

## Common Tasks

### Task: Rename Column

PostgreSQL doesn't have direct "rename" - use intermediate approach:

```typescript
// Step 1: Add new column with data
{
  targetSchema: {
    tables: [{
      name: 'users',
      columns: [
        { name: 'id', dataType: 'uuid' },
        { name: 'username', dataType: 'varchar(255)' }, // New
        { name: 'old_name', dataType: 'varchar(255)' },  // Old (keep for now)
      ],
    }],
  },
}

// Step 2: Later, drop old column
{
  targetSchema: {
    tables: [{
      name: 'users',
      columns: [
        { name: 'id', dataType: 'uuid' },
        { name: 'username', dataType: 'varchar(255)' },
      ],
    }],
  },
}
```

### Task: Add Nullable vs Non-Nullable

**Safe (nullable)**:
```typescript
{ name: 'optional_field', dataType: 'text', isNullable: true }
// Risk: LOW
```

**Risky (non-nullable without default)**:
```typescript
{ name: 'required_field', dataType: 'text', isNullable: false }
// Risk: MEDIUM (needs manual population)
```

**Safe (non-nullable with default)**:
```typescript
{ name: 'status', dataType: 'varchar(20)', isNullable: false, defaultValue: "'active'" }
// Risk: LOW
```

### Task: Create Composite Migration

Combine multiple changes:

```typescript
const result = await planner.run({
  currentSchema: { /* current */ },
  targetSchema: {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', dataType: 'uuid', isPrimaryKey: true },
          { name: 'email', dataType: 'varchar(255)', isNullable: false },
          { name: 'verified', dataType: 'boolean', defaultValue: 'false' }, // NEW
        ],
        indexes: [{ name: 'email' }], // NEW
      },
      {
        name: 'profiles', // NEW TABLE
        columns: [
          { name: 'id', dataType: 'uuid', isPrimaryKey: true },
          { name: 'user_id', dataType: 'uuid' },
          { name: 'bio', dataType: 'text' },
        ],
      },
    ],
  },
});

// Result will have:
// - Create users table changes
// - Add verified column
// - Create email index
// - Create profiles table
// All in correct order with dependencies
```

## Error Handling

```typescript
const result = await planner.run(params);

if (!result.success) {
  console.error('Error:', result.error);
} else {
  if (result.data?.breakingChanges.length > 0) {
    console.warn('Breaking changes:');
    result.data.breakingChanges.forEach(c => console.log('  -', c));
  }

  if (result.data?.dataLossRisks.length > 0) {
    console.warn('Data loss risks:');
    result.data.dataLossRisks.forEach(r => console.log('  -', r));
  }

  console.log('Migration steps:');
  result.data?.steps.forEach(step => {
    console.log(`  ${step.order}. [${step.riskLevel.toUpperCase()}] ${step.description}`);
    console.log(`     SQL: ${step.sql.substring(0, 60)}...`);
  });

  if (result.data?.rollbackScript) {
    console.log('Rollback script generated');
  }
}
```

## Best Practices

### ✅ DO

- ✅ Test on development database first
- ✅ Review breaking changes before execution
- ✅ Backup data before high-risk migrations
- ✅ Use NULL defaults for existing data
- ✅ Add nullable columns, then populate them
- ✅ Check rollback scripts before executing
- ✅ Monitor slow migrations on large tables
- ✅ Document all schema changes

### ❌ DON'T

- ❌ Drop columns with HIGH risk without backup
- ❌ Change column types on large tables without planning
- ❌ Add non-nullable columns without defaults on live data
- ❌ Ignore breaking change warnings
- ❌ Skip testing on development first
- ❌ Execute without reviewing the SQL
- ❌ Forget to update application code
- ❌ Assume rollback will restore data

## Command Reference

### Initialize Planner
```typescript
const planner = new SupabaseMigrationPlanner();
```

### Run Migration Analysis
```typescript
const result = await planner.run({
  targetSchema: { /* ... */ },
  generateRollback: true,
});
```

### Access Results
```typescript
// Migration steps
result.data?.steps

// Risk information
result.data?.breakingChanges
result.data?.dataLossRisks

// Execution info
result.data?.estimatedDuration
result.data?.executionOrder

// Rollback
result.data?.rollbackScript
```

## Performance Tips

- Simple schema (<10 tables): <1 second
- Medium schema (10-100 tables): 1-5 seconds
- Complex schema (100+ tables): 5-15 seconds

For large migrations:
- Consider breaking into phases
- Test on production clone first
- Execute during maintenance windows
- Monitor transaction locks

## File Locations

| File | Purpose |
|------|---------|
| `supabase-migration-planner.ts` | Main implementation (702 lines) |
| `test-migration-planner.ts` | Test suite and examples |
| `MIGRATION_PLANNER_GUIDE.md` | Detailed documentation |
| `MIGRATION_PLANNER_ARCHITECTURE.md` | Architecture and design |
| `MIGRATION_PLANNER_QUICK_START.md` | This file |

## Next Steps

1. Review the [detailed guide](./MIGRATION_PLANNER_GUIDE.md)
2. Check [architecture docs](./MIGRATION_PLANNER_ARCHITECTURE.md)
3. Run test examples in `test-migration-planner.ts`
4. Integrate with your Supabase project
5. Test on development database first

## Support

For issues or questions:
- Review error messages in logs
- Check vault credentials are set
- Verify schema structure matches expected format
- See troubleshooting section in main guide

## License

Part of OpenClaw Aurora - Supabase Archon Suite (S-06)
