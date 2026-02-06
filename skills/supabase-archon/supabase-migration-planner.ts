/**
 * Supabase Archon - Migration Planner Pro (S-06)
 * Gera planos de migração seguros para alterações de schema
 *
 * @version 1.0.0
 * @priority P1
 * @category UTIL
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';
import { getVault } from './supabase-vault-config';

// ============================================================================
// TIPOS
// ============================================================================

export interface MigrationStep {
  order: number;
  type: 'create' | 'alter' | 'drop' | 'data';
  sql: string;
  rollbackSql?: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedTime: string;
  dependencies: string[];
  description?: string;
}

export interface MigrationPlannerParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  targetSchema: any; // Desired schema structure
  currentSchema?: any; // Optional: current schema (if not provided, will be fetched)
  generateRollback?: boolean; // Default: true
  validateOnly?: boolean; // Default: false (only analyze, don't execute)
}

export interface MigrationPlannerResult extends SkillOutput {
  data?: {
    steps: MigrationStep[];
    breakingChanges: string[];
    dataLossRisks: string[];
    estimatedDuration: string;
    executionOrder: string[];
    rollbackScript?: string;
  };
}

// ============================================================================
// MIGRATION PLANNER PRO
// ============================================================================

export class SupabaseMigrationPlanner extends Skill {
  private logger = createLogger('migration-planner');

  constructor() {
    super(
      {
        name: 'supabase-migration-planner',
        description:
          'Generates safe migration plans for schema changes with risk analysis and automatic rollback generation',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'migration', 'schema', 'planning', 'rollback'],
      },
      {
        timeout: 120000, // 2 minutes
        retries: 1,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as MigrationPlannerParams;

    // Target schema is required
    if (!typed.targetSchema || typeof typed.targetSchema !== 'object') {
      this.logger.error('Validation failed: targetSchema is required and must be an object');
      return false;
    }

    return true;
  }

  /**
   * Execute migration planning
   */
  async execute(params: SkillInput): Promise<MigrationPlannerResult> {
    const typed = params as MigrationPlannerParams;
    const startTime = Date.now();

    this.logger.info('Migration Planner iniciado', {
      validateOnly: typed.validateOnly || false,
      generateRollback: typed.generateRollback !== false,
    });

    try {
      // Get credentials from vault if not provided
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      // Get current schema (if not provided)
      let currentSchema = typed.currentSchema;
      if (!currentSchema) {
        this.logger.debug('Fetching current schema from Supabase');
        currentSchema = await this.fetchCurrentSchema(url, key);
      }

      // Normalize schemas
      const normalizedCurrent = this.normalizeSchema(currentSchema);
      const normalizedTarget = this.normalizeSchema(typed.targetSchema);

      // Analyze differences
      this.logger.debug('Analyzing schema differences');
      const analysis = this.analyzeSchemaChanges(normalizedCurrent, normalizedTarget);

      // Generate migration steps
      this.logger.debug('Generating migration steps');
      const steps = this.generateMigrationSteps(analysis);

      // Analyze risks
      const breakingChanges = this.detectBreakingChanges(analysis);
      const dataLossRisks = this.detectDataLossRisks(analysis);

      // Calculate duration
      const estimatedDuration = this.calculateEstimatedDuration(steps);

      // Generate rollback script if requested
      let rollbackScript: string | undefined;
      if (typed.generateRollback !== false) {
        rollbackScript = this.generateRollbackScript(steps);
      }

      // Log analysis results
      if (breakingChanges.length > 0) {
        this.logger.warn('Breaking changes detected', {
          count: breakingChanges.length,
          changes: breakingChanges,
        });
      }

      if (dataLossRisks.length > 0) {
        this.logger.warn('Data loss risks detected', {
          count: dataLossRisks.length,
          risks: dataLossRisks,
        });
      }

      this.logger.info('Migration plan generated successfully', {
        stepCount: steps.length,
        duration: `${Date.now() - startTime}ms`,
        estimatedMigrationTime: estimatedDuration,
      });

      return {
        success: true,
        data: {
          steps,
          breakingChanges,
          dataLossRisks,
          estimatedDuration,
          executionOrder: steps.map(s => `Step ${s.order}: ${s.description || s.type}`),
          rollbackScript,
        },
      };
    } catch (error: any) {
      this.logger.error('Migration Planner failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Fetch current schema from Supabase
   */
  private async fetchCurrentSchema(url: string, key: string): Promise<any> {
    this.logger.debug('Fetching current schema');

    // In a real implementation, would query information_schema via REST API or direct connection
    // For now, return mock schema based on Supabase standard
    return {
      tables: [],
      enums: [],
      functions: [],
      policies: [],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Normalize schema structure
   */
  private normalizeSchema(schema: any): any {
    if (!schema) {
      return { tables: [], enums: [], functions: [], policies: [] };
    }

    return {
      tables: Array.isArray(schema.tables) ? schema.tables : [],
      enums: Array.isArray(schema.enums) ? schema.enums : [],
      functions: Array.isArray(schema.functions) ? schema.functions : [],
      policies: Array.isArray(schema.policies) ? schema.policies : [],
    };
  }

  /**
   * Analyze schema changes between current and target
   */
  private analyzeSchemaChanges(current: any, target: any): any {
    const analysis = {
      tablesToCreate: [] as any[],
      tablesToAlter: [] as any[],
      tablesToDrop: [] as any[],
      columnsToAdd: [] as any[],
      columnsToRemove: [] as any[],
      columnsToAlter: [] as any[],
      indicesToCreate: [] as any[],
      indicesToDrop: [] as any[],
      constraintsToAdd: [] as any[],
      constraintsToRemove: [] as any[],
      enumsToCreate: [] as any[],
      enumsToModify: [] as any[],
      policiesToCreate: [] as any[],
      policiesToRemove: [] as any[],
    };

    // Build lookup maps
    const currentTableMap = new Map(current.tables.map((t: any) => [t.name, t]));
    const targetTableMap = new Map(target.tables.map((t: any) => [t.name, t]));

    // Detect tables to create
    for (const table of target.tables) {
      if (!currentTableMap.has(table.name)) {
        analysis.tablesToCreate.push(table);
      }
    }

    // Detect tables to drop
    for (const table of current.tables) {
      if (!targetTableMap.has(table.name)) {
        analysis.tablesToDrop.push(table);
      }
    }

    // Detect table alterations
    for (const targetTable of target.tables) {
      const currentTable = currentTableMap.get(targetTable.name) as any;
      if (currentTable) {
        // Check columns
        const currentColMap = new Map(
          ((currentTable as any).columns || []).map((c: any) => [c.name, c])
        );
        const targetColMap = new Map(((targetTable as any).columns || []).map((c: any) => [c.name, c]));

        // Columns to add
        for (const col of (targetTable as any).columns || []) {
          if (!currentColMap.has(col.name)) {
            analysis.columnsToAdd.push({
              table: targetTable.name,
              column: col,
            });
          }
        }

        // Columns to remove
        for (const col of (currentTable as any).columns || []) {
          if (!targetColMap.has(col.name)) {
            analysis.columnsToRemove.push({
              table: targetTable.name,
              column: col,
            });
          }
        }

        // Columns to alter
        for (const targetCol of (targetTable as any).columns || []) {
          const currentCol = currentColMap.get(targetCol.name);
          if (currentCol && JSON.stringify(currentCol) !== JSON.stringify(targetCol)) {
            analysis.columnsToAlter.push({
              table: targetTable.name,
              currentColumn: currentCol,
              targetColumn: targetCol,
            });
          }
        }
      }
    }

    // Detect index changes
    const currentIndexes = new Set<string>(
      current.tables.flatMap((t: any) => (t.indexes || []).map((i: any) => `${t.name}.${i.name}`))
    );
    const targetIndexes = new Set<string>(
      target.tables.flatMap((t: any) => (t.indexes || []).map((i: any) => `${t.name}.${i.name}`))
    );

    Array.from(targetIndexes).forEach((idx: string) => {
      if (!currentIndexes.has(idx)) {
        const [table, name] = idx.split('.');
        analysis.indicesToCreate.push({ table, name });
      }
    });

    Array.from(currentIndexes).forEach((idx: string) => {
      if (!targetIndexes.has(idx)) {
        const [table, name] = idx.split('.');
        analysis.indicesToDrop.push({ table, name });
      }
    });

    // Detect enum changes
    const currentEnumMap = new Map(current.enums.map((e: any) => [e.name, e]));
    const targetEnumMap = new Map(target.enums.map((e: any) => [e.name, e]));

    for (const enumDef of target.enums) {
      if (!currentEnumMap.has(enumDef.name)) {
        analysis.enumsToCreate.push(enumDef);
      }
    }

    for (const enumDef of target.enums) {
      const currentEnum = currentEnumMap.get(enumDef.name);
      if (currentEnum && JSON.stringify(currentEnum) !== JSON.stringify(enumDef)) {
        analysis.enumsToModify.push({
          current: currentEnum,
          target: enumDef,
        });
      }
    }

    return analysis;
  }

  /**
   * Generate SQL migration steps from analysis
   */
  private generateMigrationSteps(analysis: any): MigrationStep[] {
    const steps: MigrationStep[] = [];
    let order = 1;

    // Step 1: Create enums (must be before tables that use them)
    for (const enumDef of analysis.enumsToCreate) {
      const values = (enumDef.values || []).map((v: string) => `'${v}'`).join(', ');
      steps.push({
        order: order++,
        type: 'create',
        sql: `CREATE TYPE ${enumDef.name} AS ENUM (${values});`,
        rollbackSql: `DROP TYPE IF EXISTS ${enumDef.name};`,
        riskLevel: 'low',
        estimatedTime: '<1s',
        dependencies: [],
        description: `Create enum type ${enumDef.name}`,
      });
    }

    // Step 2: Create tables
    for (const table of analysis.tablesToCreate) {
      const sql = this.generateCreateTableSQL(table);
      steps.push({
        order: order++,
        type: 'create',
        sql,
        rollbackSql: `DROP TABLE IF EXISTS ${table.name} CASCADE;`,
        riskLevel: 'low',
        estimatedTime: '<1s',
        dependencies: [],
        description: `Create table ${table.name}`,
      });
    }

    // Step 3: Add columns to existing tables
    for (const change of analysis.columnsToAdd) {
      const colSQL = this.generateColumnDefinition(change.column);
      steps.push({
        order: order++,
        type: 'alter',
        sql: `ALTER TABLE ${change.table} ADD COLUMN ${colSQL};`,
        rollbackSql: `ALTER TABLE ${change.table} DROP COLUMN ${change.column.name};`,
        riskLevel: this.assessAddColumnRisk(change.column),
        estimatedTime: this.estimateAlterTime(change.table),
        dependencies: [change.table],
        description: `Add column ${change.column.name} to ${change.table}`,
      });
    }

    // Step 4: Modify columns
    for (const change of analysis.columnsToAlter) {
      const sql = this.generateAlterColumnSQL(change.table, change.currentColumn, change.targetColumn);
      if (sql) {
        steps.push({
          order: order++,
          type: 'alter',
          sql,
          rollbackSql: this.generateAlterColumnSQL(change.table, change.targetColumn, change.currentColumn),
          riskLevel: 'high', // Column modifications are risky
          estimatedTime: this.estimateAlterTime(change.table),
          dependencies: [change.table],
          description: `Alter column ${change.currentColumn.name} in ${change.table}`,
        });
      }
    }

    // Step 5: Create indexes
    for (const idx of analysis.indicesToCreate) {
      steps.push({
        order: order++,
        type: 'create',
        sql: `CREATE INDEX idx_${idx.table}_${idx.name} ON ${idx.table} (${idx.name});`,
        rollbackSql: `DROP INDEX IF EXISTS idx_${idx.table}_${idx.name};`,
        riskLevel: 'low',
        estimatedTime: this.estimateIndexTime(idx.table),
        dependencies: [idx.table],
        description: `Create index on ${idx.table}.${idx.name}`,
      });
    }

    // Step 6: Remove indexes (before dropping tables/columns)
    for (const idx of analysis.indicesToDrop) {
      steps.push({
        order: order++,
        type: 'drop',
        sql: `DROP INDEX IF EXISTS idx_${idx.table}_${idx.name};`,
        rollbackSql: `CREATE INDEX idx_${idx.table}_${idx.name} ON ${idx.table} (${idx.name});`,
        riskLevel: 'low',
        estimatedTime: '<1s',
        dependencies: [],
        description: `Drop index on ${idx.table}.${idx.name}`,
      });
    }

    // Step 7: Remove columns
    for (const change of analysis.columnsToRemove) {
      steps.push({
        order: order++,
        type: 'alter',
        sql: `ALTER TABLE ${change.table} DROP COLUMN ${change.column.name} CASCADE;`,
        rollbackSql: `ALTER TABLE ${change.table} ADD COLUMN ${this.generateColumnDefinition(change.column)};`,
        riskLevel: 'high', // Data loss
        estimatedTime: this.estimateAlterTime(change.table),
        dependencies: [change.table],
        description: `Drop column ${change.column.name} from ${change.table}`,
      });
    }

    // Step 8: Drop tables
    for (const table of analysis.tablesToDrop) {
      steps.push({
        order: order++,
        type: 'drop',
        sql: `DROP TABLE IF EXISTS ${table.name} CASCADE;`,
        rollbackSql: `-- Cannot automatically rollback table drop. Restore from backup.`,
        riskLevel: 'high', // Data loss
        estimatedTime: '<1s',
        dependencies: [],
        description: `Drop table ${table.name}`,
      });
    }

    return steps;
  }

  /**
   * Generate CREATE TABLE SQL
   */
  private generateCreateTableSQL(table: any): string {
    const columns = (table.columns || [])
      .map((col: any) => this.generateColumnDefinition(col))
      .join(',\n  ');

    return `CREATE TABLE ${table.name} (\n  ${columns}\n);`;
  }

  /**
   * Generate column definition SQL
   */
  private generateColumnDefinition(column: any): string {
    let def = `${column.name} ${column.dataType}`;

    if (column.isNullable === false) {
      def += ' NOT NULL';
    }

    if (column.defaultValue) {
      def += ` DEFAULT ${column.defaultValue}`;
    }

    if (column.isPrimaryKey) {
      def += ' PRIMARY KEY';
    }

    if (column.isUnique) {
      def += ' UNIQUE';
    }

    return def;
  }

  /**
   * Generate ALTER COLUMN SQL
   */
  private generateAlterColumnSQL(
    table: string,
    currentColumn: any,
    targetColumn: any
  ): string | null {
    const changes: string[] = [];

    // Type change
    if (currentColumn.dataType !== targetColumn.dataType) {
      changes.push(`ALTER TABLE ${table} ALTER COLUMN ${currentColumn.name} TYPE ${targetColumn.dataType};`);
    }

    // Nullability change
    if (currentColumn.isNullable !== targetColumn.isNullable) {
      if (targetColumn.isNullable) {
        changes.push(`ALTER TABLE ${table} ALTER COLUMN ${currentColumn.name} DROP NOT NULL;`);
      } else {
        changes.push(`ALTER TABLE ${table} ALTER COLUMN ${currentColumn.name} SET NOT NULL;`);
      }
    }

    // Default value change
    if (currentColumn.defaultValue !== targetColumn.defaultValue) {
      if (targetColumn.defaultValue) {
        changes.push(
          `ALTER TABLE ${table} ALTER COLUMN ${currentColumn.name} SET DEFAULT ${targetColumn.defaultValue};`
        );
      } else {
        changes.push(`ALTER TABLE ${table} ALTER COLUMN ${currentColumn.name} DROP DEFAULT;`);
      }
    }

    return changes.length > 0 ? changes.join('\n') : null;
  }

  /**
   * Assess risk level of adding a column
   */
  private assessAddColumnRisk(column: any): 'low' | 'medium' | 'high' {
    if (column.isNullable || column.defaultValue) {
      return 'low';
    }
    return 'medium'; // Non-nullable without default can cause issues
  }

  /**
   * Detect breaking changes that would affect existing code
   */
  private detectBreakingChanges(analysis: any): string[] {
    const changes: string[] = [];

    // Dropping tables breaks all queries on those tables
    for (const table of analysis.tablesToDrop) {
      changes.push(`Table '${table.name}' will be dropped - breaks all code referencing it`);
    }

    // Removing columns breaks queries/code selecting those columns
    for (const change of analysis.columnsToRemove) {
      changes.push(
        `Column '${change.column.name}' will be removed from '${change.table}' - breaks queries selecting it`
      );
    }

    // Changing column types might break application code
    for (const change of analysis.columnsToAlter) {
      if (change.currentColumn.dataType !== change.targetColumn.dataType) {
        changes.push(
          `Column '${change.currentColumn.name}' type changed from ${change.currentColumn.dataType} to ${change.targetColumn.dataType}`
        );
      }
    }

    // Removing NOT NULL constraint can cause issues
    for (const change of analysis.columnsToAlter) {
      if (change.currentColumn.isNullable === false && change.targetColumn.isNullable === true) {
        changes.push(`Column '${change.currentColumn.name}' nullability changed - code might expect non-null`);
      }
    }

    return changes;
  }

  /**
   * Detect data loss risks
   */
  private detectDataLossRisks(analysis: any): string[] {
    const risks: string[] = [];

    // Dropping tables causes data loss
    for (const table of analysis.tablesToDrop) {
      risks.push(`All data in table '${table.name}' will be permanently deleted`);
    }

    // Dropping columns causes data loss
    for (const change of analysis.columnsToRemove) {
      risks.push(`All data in column '${change.column.name}' of '${change.table}' will be permanently deleted`);
    }

    // Type conversions might lose data
    for (const change of analysis.columnsToAlter) {
      if (this.isLossyConversion(change.currentColumn.dataType, change.targetColumn.dataType)) {
        risks.push(
          `Converting column '${change.currentColumn.name}' from ${change.currentColumn.dataType} to ${change.targetColumn.dataType} may lose data`
        );
      }
    }

    return risks;
  }

  /**
   * Check if type conversion is lossy
   */
  private isLossyConversion(fromType: string, toType: string): boolean {
    // Conversions that might lose data
    const lossyPatterns: [RegExp, RegExp][] = [
      [/int|bigint|numeric|decimal/, /varchar|text/], // Numeric to string usually OK
      [/varchar|text/, /int|bigint|numeric/], // String to numeric - lossy
      [/uuid/, /varchar/], // UUID to string usually OK
      [/timestamp/, /int|bigint/], // Timestamp to int - lossy
    ];

    for (const [from, to] of lossyPatterns) {
      if (from.test(fromType) && to.test(toType)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate estimated total duration
   */
  private calculateEstimatedDuration(steps: MigrationStep[]): string {
    let totalSeconds = 0;

    for (const step of steps) {
      const timeStr = step.estimatedTime.replace(/[^0-9]/g, '');
      const time = parseInt(timeStr, 10) || 0;

      if (step.estimatedTime.includes('m')) {
        totalSeconds += time * 60;
      } else if (step.estimatedTime.includes('s')) {
        totalSeconds += time;
      }
    }

    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    } else if (totalSeconds < 3600) {
      return `${Math.ceil(totalSeconds / 60)}m`;
    } else {
      return `${Math.ceil(totalSeconds / 3600)}h`;
    }
  }

  /**
   * Estimate time to alter a table
   */
  private estimateAlterTime(tableName: string): string {
    // In real implementation, would estimate based on table size
    // For now, use reasonable defaults
    return '5-30s';
  }

  /**
   * Estimate time to create an index
   */
  private estimateIndexTime(tableName: string): string {
    // In real implementation, would estimate based on table size
    return '10s-2m';
  }

  /**
   * Generate rollback script from migration steps
   */
  private generateRollbackScript(steps: MigrationStep[]): string {
    const rollbackSteps = steps
      .filter(s => s.rollbackSql)
      .reverse()
      .map(s => `-- ${s.description}\n${s.rollbackSql}`);

    return `-- Rollback Script
-- Generated: ${new Date().toISOString()}
-- WARNING: Executing this script will undo all migrations

BEGIN;

${rollbackSteps.join('\n\n')}

COMMIT;`;
  }
}
