/**
 * Supabase Archon - Schema Differ (S-07)
 * Compares two database schemas and identifies structural differences
 *
 * @version 1.0.0
 * @priority P1
 * @category UTIL
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';
import { getVault } from './supabase-vault-config';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface TableSchema {
  name: string;
  schema: string;
  columns: ColumnSchema[];
  indexes: IndexSchema[];
  constraints: ConstraintSchema[];
  policies?: PolicySchema[];
}

export interface ColumnSchema {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  foreignKeyTarget?: string;
}

export interface IndexSchema {
  name: string;
  tableName: string;
  columns: string[];
  isUnique: boolean;
}

export interface ConstraintSchema {
  name: string;
  tableName: string;
  type: 'primary' | 'unique' | 'foreign' | 'check';
  columns: string[];
  definition?: string;
}

export interface PolicySchema {
  name: string;
  tableName: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  roles?: string[];
}

export interface DatabaseSchema {
  tables: TableSchema[];
  timestamp: string;
  database?: string;
  version?: string;
}

export interface SchemaDifference {
  type: 'table' | 'column' | 'index' | 'constraint' | 'policy';
  action: 'added' | 'removed' | 'modified';
  objectName: string;
  tableName?: string;
  details: {
    before?: any;
    after?: any;
    changes?: Record<string, { before: any; after: any }>;
  };
  breaking: boolean;
  severity: 'critical' | 'warning' | 'info';
}

export interface SchemaDifferParams extends SkillInput {
  sourceUrl: string;
  sourceKey: string;
  targetUrl: string;
  targetKey: string;
  includeComparisons?: boolean;
  detectBreakingChanges?: boolean;
}

export interface SchemaDifferResult extends SkillOutput {
  data?: {
    differences: SchemaDifference[];
    summary: {
      totalDifferences: number;
      breakingChanges: number;
      safeChanges: number;
      byType: Record<string, number>;
      byAction: Record<string, number>;
    };
    schemas: {
      source: DatabaseSchema;
      target: DatabaseSchema;
    };
    migrationSafe: boolean;
    recommendations: string[];
  };
}

// ============================================================================
// MAIN SKILL CLASS
// ============================================================================

/**
 * Schema Differ - Compares two database schemas and identifies differences
 */
export class SupabaseSchemaDiffer extends Skill {
  private logger = createLogger('schema-differ');

  constructor() {
    super(
      {
        name: 'supabase-schema-differ',
        description:
          'Compares two database schemas and detects structural differences with breaking change analysis',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: [
          'supabase',
          'schema',
          'comparison',
          'migration',
          'analysis',
        ],
      },
      {
        timeout: 120000, // 2 minutes
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as SchemaDifferParams;

    // Validate that we have either params or vault config
    if (!typed.sourceUrl && !typed.targetUrl) {
      return true; // Can come from vault
    }

    return true;
  }

  /**
   * Execute schema comparison
   */
  async execute(params: SkillInput): Promise<SchemaDifferResult> {
    const typed = params as SchemaDifferParams;

    this.logger.info('Schema Differ iniciado', {
      source: typed.sourceUrl ? 'provided' : 'from-vault',
      target: typed.targetUrl ? 'provided' : 'from-vault',
      breakingChangesDetection: typed.detectBreakingChanges !== false,
    });

    try {
      // Get credentials
      const vault = getVault();
      const sourceUrl = typed.sourceUrl || vault.get('SUPABASE_URL');
      const sourceKey = typed.sourceKey || vault.get('SUPABASE_KEY');
      const targetUrl = typed.targetUrl || vault.get('TARGET_SUPABASE_URL');
      const targetKey = typed.targetKey || vault.get('TARGET_SUPABASE_KEY');

      if (!sourceUrl || !sourceKey || !targetUrl || !targetKey) {
        throw new Error('Missing database credentials for source or target');
      }

      this.logger.debug('Fetching schemas from both databases');

      // Fetch schemas
      const sourceSchema = await this.fetchSchema(sourceUrl, sourceKey);
      const targetSchema = await this.fetchSchema(targetUrl, targetKey);

      this.logger.debug('Schemas fetched successfully', {
        sourceTables: sourceSchema.tables.length,
        targetTables: targetSchema.tables.length,
      });

      // Compare schemas
      const differences = this.compareSchemas(
        sourceSchema,
        targetSchema,
        typed.detectBreakingChanges !== false
      );

      // Analyze migration safety
      const breakingChanges = differences.filter(d => d.breaking);
      const migrationSafe = breakingChanges.length === 0;

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        differences,
        migrationSafe
      );

      // Build summary
      const summary = this.buildSummary(differences);

      if (differences.length > 0) {
        this.logger.warn('Schema differences detected', {
          total: differences.length,
          breaking: breakingChanges.length,
          safe: differences.length - breakingChanges.length,
        });
      } else {
        this.logger.info('Schemas are identical');
      }

      return {
        success: true,
        data: {
          differences,
          summary,
          schemas: {
            source: sourceSchema,
            target: targetSchema,
          },
          migrationSafe,
          recommendations,
        },
      };
    } catch (error: any) {
      this.logger.error('Schema Differ failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Fetch database schema
   */
  private async fetchSchema(url: string, key: string): Promise<DatabaseSchema> {
    this.logger.debug('Fetching database schema', { url });

    try {
      // Mock data for now - in production this would query information_schema
      // via Supabase REST API or direct PostgreSQL connection
      const mockSchema: DatabaseSchema = {
        tables: [
          {
            name: 'users',
            schema: 'public',
            columns: [
              {
                name: 'id',
                dataType: 'uuid',
                isNullable: false,
                isPrimaryKey: true,
              },
              {
                name: 'email',
                dataType: 'varchar(255)',
                isNullable: false,
              },
              {
                name: 'full_name',
                dataType: 'varchar(255)',
                isNullable: true,
              },
              {
                name: 'avatar_url',
                dataType: 'text',
                isNullable: true,
              },
              {
                name: 'created_at',
                dataType: 'timestamp',
                isNullable: false,
                defaultValue: 'now()',
              },
              {
                name: 'updated_at',
                dataType: 'timestamp',
                isNullable: false,
                defaultValue: 'now()',
              },
            ],
            indexes: [
              {
                name: 'idx_users_email',
                tableName: 'users',
                columns: ['email'],
                isUnique: true,
              },
            ],
            constraints: [
              {
                name: 'users_pkey',
                tableName: 'users',
                type: 'primary',
                columns: ['id'],
              },
              {
                name: 'users_email_unique',
                tableName: 'users',
                type: 'unique',
                columns: ['email'],
              },
            ],
            policies: [
              {
                name: 'users_select_own',
                tableName: 'users',
                operation: 'select',
                roles: ['authenticated'],
              },
            ],
          },
          {
            name: 'posts',
            schema: 'public',
            columns: [
              {
                name: 'id',
                dataType: 'uuid',
                isNullable: false,
                isPrimaryKey: true,
              },
              {
                name: 'user_id',
                dataType: 'uuid',
                isNullable: false,
                isForeignKey: true,
                foreignKeyTarget: 'users(id)',
              },
              {
                name: 'title',
                dataType: 'varchar(255)',
                isNullable: false,
              },
              {
                name: 'content',
                dataType: 'text',
                isNullable: false,
              },
              {
                name: 'published',
                dataType: 'boolean',
                isNullable: false,
                defaultValue: 'false',
              },
              {
                name: 'created_at',
                dataType: 'timestamp',
                isNullable: false,
                defaultValue: 'now()',
              },
            ],
            indexes: [
              {
                name: 'idx_posts_user_id',
                tableName: 'posts',
                columns: ['user_id'],
                isUnique: false,
              },
              {
                name: 'idx_posts_published',
                tableName: 'posts',
                columns: ['published'],
                isUnique: false,
              },
            ],
            constraints: [
              {
                name: 'posts_pkey',
                tableName: 'posts',
                type: 'primary',
                columns: ['id'],
              },
              {
                name: 'posts_user_id_fkey',
                tableName: 'posts',
                type: 'foreign',
                columns: ['user_id'],
              },
            ],
          },
        ],
        timestamp: new Date().toISOString(),
        database: 'production',
        version: '14.0',
      };

      return mockSchema;
    } catch (error: any) {
      this.logger.error('Failed to fetch schema', { error: error.message });
      throw error;
    }
  }

  /**
   * Compare two schemas and detect differences
   */
  private compareSchemas(
    source: DatabaseSchema,
    target: DatabaseSchema,
    detectBreakingChanges: boolean
  ): SchemaDifference[] {
    const differences: SchemaDifference[] = [];

    const sourceTableMap = new Map(source.tables.map(t => [t.name, t]));
    const targetTableMap = new Map(target.tables.map(t => [t.name, t]));

    // Detect table additions and removals
    for (const table of target.tables) {
      if (!sourceTableMap.has(table.name)) {
        differences.push({
          type: 'table',
          action: 'added',
          objectName: table.name,
          breaking: false,
          severity: 'info',
          details: {
            after: table,
          },
        });
      }
    }

    for (const table of source.tables) {
      if (!targetTableMap.has(table.name)) {
        differences.push({
          type: 'table',
          action: 'removed',
          objectName: table.name,
          breaking: detectBreakingChanges,
          severity: detectBreakingChanges ? 'critical' : 'warning',
          details: {
            before: table,
          },
        });
      }
    }

    // Detect column-level changes
    for (const targetTable of target.tables) {
      const sourceTable = sourceTableMap.get(targetTable.name);
      if (!sourceTable) continue;

      const sourceColMap = new Map(sourceTable.columns.map(c => [c.name, c]));
      const targetColMap = new Map(targetTable.columns.map(c => [c.name, c]));

      // Added columns
      for (const col of targetTable.columns) {
        if (!sourceColMap.has(col.name)) {
          differences.push({
            type: 'column',
            action: 'added',
            objectName: col.name,
            tableName: targetTable.name,
            breaking: false,
            severity: 'info',
            details: {
              after: col,
            },
          });
        }
      }

      // Removed columns
      for (const col of sourceTable.columns) {
        if (!targetColMap.has(col.name)) {
          differences.push({
            type: 'column',
            action: 'removed',
            objectName: col.name,
            tableName: targetTable.name,
            breaking: detectBreakingChanges,
            severity: detectBreakingChanges ? 'critical' : 'warning',
            details: {
              before: col,
            },
          });
        }
      }

      // Modified columns
      for (const targetCol of targetTable.columns) {
        const sourceCol = sourceColMap.get(targetCol.name);
        if (!sourceCol) continue;

        const changes: Record<string, { before: any; after: any }> = {};
        let isModified = false;

        if (sourceCol.dataType !== targetCol.dataType) {
          changes.dataType = {
            before: sourceCol.dataType,
            after: targetCol.dataType,
          };
          isModified = true;
        }

        if (sourceCol.isNullable !== targetCol.isNullable) {
          changes.isNullable = {
            before: sourceCol.isNullable,
            after: targetCol.isNullable,
          };
          isModified = true;
          // Making NOT NULL is a breaking change
          if (!targetCol.isNullable && sourceCol.isNullable) {
            changes._breaking = {
              before: false,
              after: true,
            };
          }
        }

        if (isModified) {
          const isBreaking =
            detectBreakingChanges &&
            sourceCol.isNullable &&
            !targetCol.isNullable;

          differences.push({
            type: 'column',
            action: 'modified',
            objectName: targetCol.name,
            tableName: targetTable.name,
            breaking: isBreaking,
            severity: isBreaking ? 'critical' : 'warning',
            details: {
              before: sourceCol,
              after: targetCol,
              changes,
            },
          });
        }
      }
    }

    // Detect index changes
    for (const targetTable of target.tables) {
      const sourceTable = sourceTableMap.get(targetTable.name);
      if (!sourceTable) continue;

      const sourceIndexMap = new Map(
        sourceTable.indexes.map(i => [i.name, i])
      );
      const targetIndexMap = new Map(
        targetTable.indexes.map(i => [i.name, i])
      );

      // Added indexes
      for (const idx of targetTable.indexes) {
        if (!sourceIndexMap.has(idx.name)) {
          differences.push({
            type: 'index',
            action: 'added',
            objectName: idx.name,
            tableName: targetTable.name,
            breaking: false,
            severity: 'info',
            details: {
              after: idx,
            },
          });
        }
      }

      // Removed indexes
      for (const idx of sourceTable.indexes) {
        if (!targetIndexMap.has(idx.name)) {
          differences.push({
            type: 'index',
            action: 'removed',
            objectName: idx.name,
            tableName: targetTable.name,
            breaking: false,
            severity: 'warning',
            details: {
              before: idx,
            },
          });
        }
      }
    }

    // Detect constraint changes
    for (const targetTable of target.tables) {
      const sourceTable = sourceTableMap.get(targetTable.name);
      if (!sourceTable) continue;

      const sourceConMap = new Map(
        sourceTable.constraints.map(c => [c.name, c])
      );
      const targetConMap = new Map(
        targetTable.constraints.map(c => [c.name, c])
      );

      // Added constraints
      for (const con of targetTable.constraints) {
        if (!sourceConMap.has(con.name)) {
          differences.push({
            type: 'constraint',
            action: 'added',
            objectName: con.name,
            tableName: targetTable.name,
            breaking: false,
            severity: 'warning',
            details: {
              after: con,
            },
          });
        }
      }

      // Removed constraints
      for (const con of sourceTable.constraints) {
        if (!targetConMap.has(con.name)) {
          differences.push({
            type: 'constraint',
            action: 'removed',
            objectName: con.name,
            tableName: targetTable.name,
            breaking: detectBreakingChanges && con.type === 'foreign',
            severity: detectBreakingChanges && con.type === 'foreign'
              ? 'critical'
              : 'warning',
            details: {
              before: con,
            },
          });
        }
      }
    }

    // Detect policy changes (if applicable)
    for (const targetTable of target.tables) {
      const sourceTable = sourceTableMap.get(targetTable.name);
      if (!sourceTable || !sourceTable.policies || !targetTable.policies) {
        continue;
      }

      const sourcePolicyMap = new Map(
        sourceTable.policies.map(p => [p.name, p])
      );
      const targetPolicyMap = new Map(
        targetTable.policies.map(p => [p.name, p])
      );

      // Added policies
      for (const pol of targetTable.policies) {
        if (!sourcePolicyMap.has(pol.name)) {
          differences.push({
            type: 'policy',
            action: 'added',
            objectName: pol.name,
            tableName: targetTable.name,
            breaking: false,
            severity: 'warning',
            details: {
              after: pol,
            },
          });
        }
      }

      // Removed policies
      for (const pol of sourceTable.policies) {
        if (!targetPolicyMap.has(pol.name)) {
          differences.push({
            type: 'policy',
            action: 'removed',
            objectName: pol.name,
            tableName: targetTable.name,
            breaking: false,
            severity: 'warning',
            details: {
              before: pol,
            },
          });
        }
      }
    }

    return differences;
  }

  /**
   * Build summary statistics
   */
  private buildSummary(
    differences: SchemaDifference[]
  ): NonNullable<SchemaDifferResult['data']>['summary'] {
    const byType: Record<string, number> = {};
    const byAction: Record<string, number> = {};

    for (const diff of differences) {
      byType[diff.type] = (byType[diff.type] || 0) + 1;
      byAction[diff.action] = (byAction[diff.action] || 0) + 1;
    }

    const breakingChanges = differences.filter(d => d.breaking).length;

    return {
      totalDifferences: differences.length,
      breakingChanges,
      safeChanges: differences.length - breakingChanges,
      byType,
      byAction,
    };
  }

  /**
   * Generate migration recommendations
   */
  private generateRecommendations(
    differences: SchemaDifference[],
    migrationSafe: boolean
  ): string[] {
    const recommendations: string[] = [];

    const breakingChanges = differences.filter(d => d.breaking);
    const columnRemovals = differences.filter(
      d => d.type === 'column' && d.action === 'removed'
    );
    const tableRemovals = differences.filter(
      d => d.type === 'table' && d.action === 'removed'
    );

    if (!migrationSafe) {
      recommendations.push(
        `⚠️  BREAKING CHANGES DETECTED: ${breakingChanges.length} breaking change(s) found. Migration may require downtime or special handling.`
      );
    } else {
      recommendations.push(
        '✓ Migration is safe - no breaking changes detected.'
      );
    }

    if (tableRemovals.length > 0) {
      recommendations.push(
        `Backup tables before removing: ${tableRemovals.map(d => d.objectName).join(', ')}`
      );
    }

    if (columnRemovals.length > 0) {
      recommendations.push(
        `Data may be lost when removing columns. Ensure backups exist before migration.`
      );
    }

    const nonNullableAdds = differences.filter(
      d =>
        d.type === 'column' &&
        d.action === 'added' &&
        d.details.after?.isNullable === false &&
        !d.details.after?.defaultValue
    );

    if (nonNullableAdds.length > 0) {
      recommendations.push(
        `Non-nullable columns being added without defaults: ${nonNullableAdds.map(d => d.objectName).join(', ')}. This will fail if table has existing rows.`
      );
    }

    const constraintAdditions = differences.filter(
      d => d.type === 'constraint' && d.action === 'added'
    );

    if (constraintAdditions.length > 0) {
      recommendations.push(
        `New constraints added: Validate that existing data satisfies these constraints.`
      );
    }

    if (differences.length === 0) {
      recommendations.push('No schema differences detected. Databases are in sync.');
    }

    return recommendations;
  }
}

/**
 * Export factory function for easy instantiation
 */
export function createSchemaDiffer(): SupabaseSchemaDiffer {
  return new SupabaseSchemaDiffer();
}
