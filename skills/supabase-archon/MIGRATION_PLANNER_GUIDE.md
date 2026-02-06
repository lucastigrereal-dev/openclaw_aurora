# Supabase Migration Planner Pro (S-06)

## Overview

The Supabase Migration Planner Pro is an advanced skill that generates safe, automated migration plans for PostgreSQL/Supabase schema changes. It analyzes dependencies, detects breaking changes, identifies data loss risks, and automatically generates rollback scripts.

**Skill ID**: S-06
**Status**: Production-Ready
**Version**: 1.0.0
**Category**: UTIL

## Features

### 1. Safe Migration Planning
- Analyzes schema differences between current and target states
- Generates ordered migration steps with proper dependencies
- Respects database constraints and relationships

### 2. Risk Detection
- **Breaking Changes**: Identifies changes that would break existing code
  - Table drops
  - Column removals
  - Type changes
  - Nullability modifications

- **Data Loss Risks**: Warns about potentially destructive operations
  - Data deletion from dropped tables
  - Data deletion from dropped columns
  - Lossy type conversions

### 3. Comprehensive SQL Generation
- CREATE statements for new tables
- ALTER statements for column modifications
- INDEX management
- ENUM type handling
- Automatic rollback script generation

### 4. Execution Planning
- Dependency-aware ordering
- Risk level assessment (low/medium/high)
- Estimated execution time per step
- Total migration duration calculation

## Usage

### Basic Usage

```typescript
import { SupabaseMigrationPlanner, MigrationPlannerParams } from './supabase-migration-planner';

const planner = new SupabaseMigrationPlanner();

const params: MigrationPlannerParams = {
  targetSchema: {
    tables: [
      {
        name: 'users',
        columns: [
          {
            name: 'id',
            dataType: 'uuid',
            isPrimaryKey: true,
            isNullable: false,
          },
          {
            name: 'email',
            dataType: 'varchar(255)',
            isNullable: false,
            isUnique: true,
          },
        ],
      },
    ],
  },
  generateRollback: true,
};

const result = await planner.run(params);
console.log(result.data?.steps); // Migration steps
console.log(result.data?.breakingChanges); // Breaking changes
console.log(result.data?.dataLossRisks); // Data loss risks
console.log(result.data?.rollbackScript); // Rollback script
```

### With Current Schema

```typescript
const params: MigrationPlannerParams = {
  currentSchema: {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', dataType: 'uuid', isPrimaryKey: true },
          { name: 'email', dataType: 'varchar(255)', isNullable: false },
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
          { name: 'email', dataType: 'varchar(255)', isNullable: false },
          { name: 'name', dataType: 'varchar(255)', isNullable: true },
          {
            name: 'created_at',
            dataType: 'timestamp',
            defaultValue: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      },
    ],
  },
  generateRollback: true,
};

const result = await planner.run(params);
```

### With Vault Credentials

If credentials are not provided, the planner will automatically fetch them from the vault:

```typescript
const params: MigrationPlannerParams = {
  // Credentials will be fetched from SUPABASE_URL and SUPABASE_KEY env vars
  targetSchema: { /* ... */ },
};

const result = await planner.run(params);
```

## Input Parameters

### `MigrationPlannerParams`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `supabaseUrl` | string | No | From vault | Supabase project URL |
| `supabaseKey` | string | No | From vault | Supabase API key |
| `targetSchema` | object | **Yes** | - | Desired schema structure |
| `currentSchema` | object | No | Auto-fetch | Current schema (if not provided, will be fetched) |
| `generateRollback` | boolean | No | true | Generate automatic rollback script |
| `validateOnly` | boolean | No | false | Analyze without executing |

### Schema Structure

```typescript
interface Schema {
  tables: Table[];
  enums?: Enum[];
  functions?: Function[];
  policies?: Policy[];
}

interface Table {
  name: string;
  columns: Column[];
  indexes?: Index[];
}

interface Column {
  name: string;
  dataType: string; // 'uuid', 'varchar(255)', 'integer', 'timestamp', etc.
  isNullable?: boolean;
  isPrimaryKey?: boolean;
  isUnique?: boolean;
  defaultValue?: string;
}

interface Index {
  name: string;
}

interface Enum {
  name: string;
  values: string[];
}
```

## Output

### `MigrationPlannerResult`

```typescript
interface MigrationPlannerResult {
  success: boolean;
  data?: {
    steps: MigrationStep[];
    breakingChanges: string[];
    dataLossRisks: string[];
    estimatedDuration: string;
    executionOrder: string[];
    rollbackScript?: string;
  };
  error?: string;
}

interface MigrationStep {
  order: number;
  type: 'create' | 'alter' | 'drop' | 'data';
  sql: string;
  rollbackSql?: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedTime: string;
  dependencies: string[];
  description?: string;
}
```

## Migration Step Types

### 1. CREATE
- Creating new tables
- Creating new enums
- Creating new indexes

**Risk Level**: Usually LOW

### 2. ALTER
- Adding columns
- Modifying column types
- Changing nullability
- Changing defaults

**Risk Level**: LOW to HIGH depending on operation

### 3. DROP
- Removing columns
- Removing indexes
- Removing tables

**Risk Level**: MEDIUM to HIGH (data loss risk)

### 4. DATA
- Data transformations
- Data migrations
- Bulk operations

**Risk Level**: MEDIUM to HIGH

## Risk Assessment

### Breaking Changes
Detected when changes would break existing application code:

```
"Table 'users' will be dropped - breaks all code referencing it"
"Column 'email' will be removed from 'users' - breaks queries selecting it"
"Column 'age' type changed from integer to varchar - code expects numeric"
```

### Data Loss Risks
Detected when operations would permanently delete data:

```
"All data in table 'users' will be permanently deleted"
"All data in column 'age' of 'users' will be permanently deleted"
"Converting column 'age' from integer to varchar may lose data"
```

## Execution Order

The planner generates steps in this order:

1. **Create ENUMs** - Must exist before tables using them
2. **Create Tables** - New tables needed by other tables
3. **Add Columns** - Safe additions to existing tables
4. **Alter Columns** - Modifications to existing columns
5. **Create Indexes** - Improve query performance
6. **Drop Indexes** - Remove old indexes before dropping columns
7. **Drop Columns** - Remove columns no longer needed
8. **Drop Tables** - Remove entire tables

## Rollback Scripts

Automatic rollback scripts are generated for each step:

```sql
-- Rollback Script
-- Generated: 2026-02-06T10:30:00.000Z
-- WARNING: Executing this script will undo all migrations

BEGIN;

-- Add column name to users
ALTER TABLE users DROP COLUMN name;

-- Add column created_at to users
ALTER TABLE users DROP COLUMN created_at;

-- Create table users
DROP TABLE IF EXISTS users CASCADE;

COMMIT;
```

**Important**: Rollback scripts for table drops include a manual warning since data cannot be automatically restored.

## Type Conversion

### Safe Conversions
- VARCHAR → TEXT (generally safe)
- INTEGER → BIGINT (compatible)
- UUID → VARCHAR (most code handles this)
- TIMESTAMP → BIGINT (lossy warning given)

### Lossy Conversions
- TEXT → INTEGER (data loss risk)
- TIMESTAMP → INTEGER (data loss risk)
- NUMERIC → VARCHAR (in some cases)

## Column Addition Rules

### Low Risk
- Column with DEFAULT value
- Column with nullable=true
- Existing data can be populated

### Medium Risk
- Non-nullable column without default
- May require manual data migration
- Application code must handle NULLs or defaults

## Error Handling

The planner handles errors gracefully:

```typescript
try {
  const result = await planner.run(params);

  if (!result.success) {
    console.error('Migration planning failed:', result.error);
  } else if (result.data?.breakingChanges.length > 0) {
    console.warn('Breaking changes detected:', result.data.breakingChanges);
  }
} catch (error) {
  console.error('Planner error:', error);
}
```

## Real-World Examples

### Example 1: Adding a Timestamp Column

**Target**: Add `updated_at` column to users table

**Generated Steps**:
1. ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

**Risk Level**: LOW (has default)

**Breaking Changes**: None

### Example 2: Renaming a Table (via new table)

**Current**: `user_profiles` table
**Target**: `profiles` table

**Generated Steps**:
1. CREATE TABLE profiles (...)
2. INSERT INTO profiles SELECT * FROM user_profiles
3. DROP TABLE user_profiles CASCADE

**Risk Level**: HIGH (data copy required)

**Breaking Changes**: Yes - queries on `user_profiles` will break

### Example 3: Type Conversion

**Current**: `age INTEGER`
**Target**: `age SMALLINT`

**Generated Steps**:
1. ALTER TABLE users ALTER COLUMN age TYPE SMALLINT;

**Risk Level**: HIGH

**Data Loss Risks**: "Converting column 'age' from integer to smallint may lose data if values exceed 32767"

## Performance Considerations

### Large Table Alterations
For tables with millions of rows:
- Column additions: FAST (instant with default)
- Column type changes: SLOW (table rewrite)
- Column removal: SLOW (table rewrite)
- Index creation: SLOW (scan + sort)

### Estimated Times
- Small table (<1M rows):
  - ADD COLUMN: <1s
  - ALTER TYPE: 5-30s
  - CREATE INDEX: 10s-2m

- Large table (>1M rows):
  - ADD COLUMN: <1s
  - ALTER TYPE: 1-10m
  - CREATE INDEX: 5-30m

## Best Practices

1. **Test First**: Always test migrations on a development database
2. **Review Changes**: Examine all breaking changes and risks before executing
3. **Backup Data**: Create backups before running high-risk migrations
4. **Validate Rollback**: Test rollback scripts to ensure they work
5. **Monitor Execution**: Watch for locks and performance issues
6. **Document Changes**: Log all migrations for audit trail
7. **Stage Rollouts**: For large tables, consider staged migrations

## Limitations

- Currently generates basic SQL (PostgreSQL dialect)
- Does not handle custom functions or stored procedures
- Does not handle row-level security (RLS) policies
- Does not handle foreign key constraints (manually added)
- Type conversions are analyzed but not executed
- Does not perform actual schema queries (mock data in demo)

## Future Enhancements

- [ ] Direct Supabase API integration for live schema fetching
- [ ] Advanced type conversion with data migration scripts
- [ ] Foreign key and constraint handling
- [ ] RLS policy migrations
- [ ] Trigger and function migrations
- [ ] Dry-run execution preview
- [ ] Migration validation against live database
- [ ] Performance analysis and optimization suggestions

## Integration with Supabase Archon

The Migration Planner works with other Supabase Archon skills:

- **Schema Sentinel (S-01)**: Monitor baseline schema
- **Migration Planner (S-06)**: Generate safe migration plans
- **Approval System**: Gate migrations for approval before execution

## Troubleshooting

### No migration steps generated
- Verify `targetSchema` is properly structured
- Ensure schema objects have required fields (`name` for tables, etc.)
- Check that differences exist between current and target schemas

### Rollback script not generated
- Set `generateRollback: true` in parameters (default)
- Check that `rollbackScript` is present in response

### Breaking changes not detected
- Review the list of breaking change patterns (see Risk Assessment section)
- Consider that some changes may not be caught - manual review recommended

### Vault credentials not found
- Ensure environment variables are set: `SUPABASE_URL`, `SUPABASE_KEY`
- Or provide credentials explicitly in parameters

## License

Supabase Archon - Migration Planner Pro (S-06)
Part of OpenClaw Aurora ecosystem
