# Supabase Migration Planner Pro - Architecture & Implementation

## Overview

The Migration Planner Pro (S-06) is a sophisticated skill that follows the Supabase Archon pattern and extends the core `Skill` base class to provide safe, automated migration planning for PostgreSQL/Supabase schemas.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│          SupabaseMigrationPlanner extends Skill             │
└────────┬─────────────────────────────────────────────────────┘
         │
         ├─ Input: MigrationPlannerParams
         │  ├─ targetSchema (required)
         │  ├─ currentSchema (optional)
         │  ├─ generateRollback (default: true)
         │  └─ credentials (from vault if not provided)
         │
         ├─ Core Methods
         │  ├─ execute() - Main entry point
         │  ├─ validate() - Input validation
         │  ├─ analyzeSchemaChanges() - Diff analysis
         │  ├─ generateMigrationSteps() - SQL generation
         │  ├─ detectBreakingChanges() - Risk analysis
         │  ├─ detectDataLossRisks() - Safety analysis
         │  └─ generateRollbackScript() - Rollback generation
         │
         └─ Output: MigrationPlannerResult
            ├─ steps: MigrationStep[]
            ├─ breakingChanges: string[]
            ├─ dataLossRisks: string[]
            ├─ estimatedDuration: string
            ├─ executionOrder: string[]
            └─ rollbackScript?: string
```

## Class Structure

```typescript
export class SupabaseMigrationPlanner extends Skill {
  // Instance fields
  private logger = createLogger('migration-planner');

  // Constructor
  constructor() { /* ... */ }

  // Public methods (from Skill base)
  validate(input: SkillInput): boolean { /* ... */ }
  async execute(params: SkillInput): Promise<MigrationPlannerResult> { /* ... */ }

  // Private analysis methods
  private async fetchCurrentSchema(url: string, key: string): Promise<any>
  private normalizeSchema(schema: any): any
  private analyzeSchemaChanges(current: any, target: any): any
  private generateMigrationSteps(analysis: any): MigrationStep[]

  // SQL generation methods
  private generateCreateTableSQL(table: any): string
  private generateColumnDefinition(column: any): string
  private generateAlterColumnSQL(...): string | null

  // Risk analysis methods
  private assessAddColumnRisk(column: any): 'low' | 'medium' | 'high'
  private detectBreakingChanges(analysis: any): string[]
  private detectDataLossRisks(analysis: any): string[]
  private isLossyConversion(fromType: string, toType: string): boolean

  // Utility methods
  private calculateEstimatedDuration(steps: MigrationStep[]): string
  private estimateAlterTime(tableName: string): string
  private estimateIndexTime(tableName: string): string
  private generateRollbackScript(steps: MigrationStep[]): string
}
```

## Skill Base Integration

```typescript
// Extends from Skill base class
export abstract class Skill extends EventEmitter {
  public readonly metadata: SkillMetadata;
  public readonly config: SkillConfig;
  abstract execute(input: SkillInput): Promise<SkillOutput>;
  validate(input: SkillInput): boolean;
  async run(input: SkillInput): Promise<SkillOutput>;
}

// Implementation
export class SupabaseMigrationPlanner extends Skill {
  constructor() {
    super(
      {
        name: 'supabase-migration-planner',
        description: 'Generates safe migration plans...',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'migration', 'schema', 'planning', 'rollback'],
      },
      {
        timeout: 120000,    // 2 minutes
        retries: 1,
      }
    );
  }
}
```

## Data Flow

### 1. Input Validation
```
Input Parameters
    ↓
validate() checks targetSchema presence
    ↓
returnError OR proceed
```

### 2. Schema Fetching
```
Current Schema Source:
  ├─ Provided as parameter? → Use directly
  └─ Not provided? → Fetch from Supabase REST API
                   (Note: Mock in current implementation)

Credentials Source:
  ├─ Provided in params? → Use directly
  └─ Not provided? → Fetch from vault (env vars)
```

### 3. Schema Analysis
```
Current Schema ─┐
                ├─ normalizeSchema()
                │  ├─ Extract tables
                │  ├─ Extract enums
                │  ├─ Extract functions
                │  └─ Extract policies
Target Schema ──┤
                ├─ analyzeSchemaChanges()
                │  ├─ Compare tables (create/drop/alter)
                │  ├─ Compare columns (add/remove/alter)
                │  ├─ Compare indexes (create/drop)
                │  └─ Compare enums (create/modify)
                │
                └─ Output: Detailed diff analysis
```

### 4. Migration Step Generation
```
Analysis Results
    ↓
generateMigrationSteps(analysis) executes in order:
    1. Create ENUMs
    2. Create Tables
    3. Add Columns
    4. Alter Columns
    5. Create Indexes
    6. Drop Indexes
    7. Drop Columns
    8. Drop Tables
    ↓
Output: Ordered MigrationStep[]
```

### 5. Risk Assessment
```
Analysis Results
    ↓
    ├─ detectBreakingChanges()
    │  └─ List changes breaking existing code
    │
    └─ detectDataLossRisks()
       └─ List operations causing data loss
```

### 6. Rollback Generation
```
MigrationStep[] (with rollbackSql)
    ↓
generateRollbackScript()
    ├─ Reverse steps
    ├─ Add BEGIN/COMMIT
    ├─ Add warnings
    └─ Generate SQL script
```

## Migration Step Lifecycle

```
MigrationStep {
  order: 1
  type: 'create'

  sql: "CREATE TABLE users (...)"

  rollbackSql: "DROP TABLE IF EXISTS users CASCADE"

  riskLevel: 'low'  // Assessment based on operation

  estimatedTime: '<1s'  // Estimated duration

  dependencies: []  // Tables/objects this depends on

  description: "Create table users"
}
```

### Risk Level Assessment

```
riskLevel Determination:
  ├─ create table → 'low'
  ├─ add nullable column → 'low'
  ├─ add non-nullable column → 'medium'
  ├─ alter column type → 'high'
  ├─ drop column → 'high' (data loss)
  ├─ drop table → 'high' (data loss)
  └─ create index → 'low'
```

## Type Safety

### Type Hierarchy

```
SkillInput (base interface)
    ↓
MigrationPlannerParams (extends SkillInput)
    ├─ supabaseUrl?: string
    ├─ supabaseKey?: string
    ├─ targetSchema: any (required)
    ├─ currentSchema?: any
    ├─ generateRollback?: boolean
    └─ validateOnly?: boolean

SkillOutput (base interface)
    ↓
MigrationPlannerResult (extends SkillOutput)
    ├─ success: boolean
    ├─ data?: { ... }
    ├─ error?: string
    └─ duration?: number
```

### Internal Types

```
Schema
  ├─ tables: Table[]
  ├─ enums: Enum[]
  ├─ functions: Function[]
  └─ policies: Policy[]

Table
  ├─ name: string
  ├─ columns: Column[]
  └─ indexes?: Index[]

Column
  ├─ name: string
  ├─ dataType: string
  ├─ isNullable?: boolean
  ├─ isPrimaryKey?: boolean
  ├─ isUnique?: boolean
  └─ defaultValue?: string

SchemaAnalysis
  ├─ tablesToCreate: Table[]
  ├─ tablesToDrop: Table[]
  ├─ columnsToAdd: { table, column }[]
  ├─ columnsToRemove: { table, column }[]
  ├─ columnsToAlter: { table, currentColumn, targetColumn }[]
  ├─ indicesToCreate: { table, name }[]
  └─ ...
```

## Error Handling Strategy

```
Try-Catch Pattern:

try {
  1. Validate input
  2. Get credentials (from vault if needed)
  3. Fetch current schema (if needed)
  4. Normalize both schemas
  5. Analyze differences
  6. Generate migration steps
  7. Analyze risks
  8. Generate rollback (if requested)
  9. Return success result
} catch (error) {
  1. Log error with context
  2. Return error result
}
```

## Logging Integration

```
Logger: createLogger('migration-planner')

Log Levels:
  ├─ debug: Internal process flow
  ├─ info: Key milestones
  ├─ warn: Breaking changes, data loss risks
  └─ error: Failures

Example Logs:
  ├─ info: "Migration Planner iniciado"
  ├─ debug: "Fetching current schema from Supabase"
  ├─ debug: "Analyzing schema differences"
  ├─ warn: "Breaking changes detected" (if any)
  ├─ warn: "Data loss risks detected" (if any)
  ├─ info: "Migration plan generated successfully"
  └─ error: "Migration Planner failed" (on error)
```

## Vault Integration

```
Credential Resolution:

1. Check parameters:
   if (supabaseUrl && supabaseKey provided)
     → Use directly
   else
     → Get vault instance
     → vault.get('SUPABASE_URL')
     → vault.get('SUPABASE_KEY')

2. Vault tries environment variables:
   SUPABASE_URL
   SUPABASE_KEY
   DATABASE_URL
   ANTHROPIC_API_KEY

3. Error handling:
   if (!url || !key)
     → throw Error('Supabase credentials not found')
```

## Performance Characteristics

### Time Complexity
- Schema analysis: O(n*m) where n=current tables, m=target tables
- Column comparison: O(c²) where c=columns per table
- Risk detection: O(s) where s=total steps
- Overall: Linear to number of schema objects

### Space Complexity
- Stores: Current schema, target schema, diff analysis, steps
- Typical: O(n) where n=total schema objects

### Estimated Execution Times
- Simple analysis (<10 tables): <1s
- Medium analysis (10-100 tables): 1-5s
- Complex analysis (100+ tables): 5-15s

## SQL Generation Strategy

### CREATE TABLE
```
Input: Table definition
Output: CREATE TABLE ... (...columns...)

Features:
  ├─ Column types
  ├─ Constraints (PRIMARY KEY, UNIQUE)
  ├─ Nullability
  └─ Defaults
```

### ALTER TABLE
```
Modifications:
  ├─ ADD COLUMN
  ├─ DROP COLUMN
  ├─ ALTER COLUMN TYPE
  ├─ ALTER COLUMN ... SET NOT NULL
  ├─ ALTER COLUMN ... DROP NOT NULL
  ├─ ALTER COLUMN ... SET DEFAULT
  └─ ALTER COLUMN ... DROP DEFAULT

Rollback:
  └─ Reverse operation SQL
```

### INDEX Management
```
CREATE INDEX idx_table_column ON table (column)
DROP INDEX IF EXISTS idx_name

Note: Assumes simple single-column indexes
      For complex indexes, manual SQL recommended
```

## Known Limitations

1. **Schema Fetching**
   - Currently returns mock schema
   - Real implementation needs REST API or direct DB connection

2. **Type Conversions**
   - Basic lossy conversion detection
   - Advanced type casting not supported
   - Data migration scripts not generated

3. **Constraints**
   - Foreign keys not analyzed
   - Check constraints not considered
   - Unique constraints basic support

4. **Advanced Features**
   - Triggers not supported
   - Stored procedures not supported
   - RLS policies not migrated
   - Sequences not managed

5. **Rollback Limitations**
   - Table drops cannot be automatically restored
   - Data-intensive operations have basic rollback
   - Some operations have `-- Cannot automatically rollback` comments

## Extension Points

### Adding New Risk Detectors
```typescript
private detectCustomRisks(analysis: any): string[] {
  const risks: string[] = [];
  // Custom logic
  return risks;
}
```

### Adding New Step Types
```typescript
const steps: MigrationStep[] = [];

steps.push({
  order: order++,
  type: 'custom',  // New type
  sql: `...`,
  rollbackSql: `...`,
  riskLevel: 'medium',
  estimatedTime: '30s',
  dependencies: ['table1', 'table2'],
  description: 'Custom migration step',
});
```

### Integrating with Database Connection
```typescript
private async fetchCurrentSchema(
  url: string,
  key: string
): Promise<any> {
  // Replace mock with real API call
  const response = await supabaseClient.rpc('get_schema_info');
  return response.data;
}
```

## Testing Strategy

### Unit Tests
- Schema normalization
- Diff detection
- Risk assessment
- SQL generation

### Integration Tests
- Full migration planning
- Rollback generation
- Error handling

### Test File Location
`/mnt/c/Users/lucas/openclaw_aurora/skills/supabase-archon/test-migration-planner.ts`

## Documentation

- **Main Guide**: `MIGRATION_PLANNER_GUIDE.md`
- **Architecture**: `MIGRATION_PLANNER_ARCHITECTURE.md` (this file)
- **Test Examples**: `test-migration-planner.ts`

## Version History

### v1.0.0 (2026-02-06)
- Initial release
- Schema analysis and diffing
- Migration step generation
- Breaking change detection
- Data loss risk detection
- Automatic rollback script generation
- Vault credential integration
- Comprehensive logging

## Future Enhancements

### Phase 2
- [ ] Real Supabase API integration
- [ ] Foreign key constraint handling
- [ ] RLS policy migrations
- [ ] Trigger and function support

### Phase 3
- [ ] Dry-run execution
- [ ] Performance optimization suggestions
- [ ] Advanced data migration scripts
- [ ] Transaction management

### Phase 4
- [ ] Integration with Approval System (S-05)
- [ ] Migration history tracking
- [ ] Rollback automation
- [ ] Real-time monitoring

## Related Skills

- **S-01: Schema Sentinel** - Monitor baseline schema
- **S-02: Approval System** - Gate migrations for approval
- **S-03-S-05**: Other Supabase Archon skills

## Contributing

To extend or modify the Migration Planner:

1. Maintain TypeScript strict mode
2. Add tests for new features
3. Update documentation
4. Follow Supabase Archon patterns
5. Use structured logging
6. Add vault integration if needed
