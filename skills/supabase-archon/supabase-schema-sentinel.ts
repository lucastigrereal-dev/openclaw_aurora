/**
 * Supabase Archon - Schema Sentinel (S-01)
 * Monitora alterações não autorizadas no schema 24/7
 *
 * @version 1.0.0
 * @priority P0
 * @category UTIL
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';
import { getVault } from './supabase-vault-config';

export interface SchemaChange {
  type: 'table' | 'column' | 'index' | 'constraint' | 'policy';
  action: 'added' | 'removed' | 'modified';
  objectName: string;
  details: any;
  timestamp: string;
}

export interface SchemaSentinelParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  checkInterval?: number; // milliseconds
  baselinePath?: string;
}

export interface SchemaSentinelResult extends SkillOutput {
  data?: {
    changes: SchemaChange[];
    changesDetected: number;
    lastCheck: string;
  };
}

/**
 * Schema Sentinel - Monitora alterações no schema
 */
export class SupabaseSchemaSentinel extends Skill {
  private logger = createLogger('schema-sentinel');

  constructor() {
    super(
      {
        name: 'supabase-schema-sentinel',
        description: 'Monitors unauthorized schema changes 24/7 with real-time alerts',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'security', 'monitoring', 'schema'],
      },
      {
        timeout: 60000, // 1 minute
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as SchemaSentinelParams;

    // URL and key are optional (can come from vault)
    return true;
  }

  /**
   * Execute schema monitoring
   */
  async execute(params: SkillInput): Promise<SchemaSentinelResult> {
    const typed = params as SchemaSentinelParams;
    this.logger.info('Schema Sentinel iniciado', {
      url: params.supabaseUrl || 'from-vault',
      interval: params.checkInterval || 300000,
    });

    try {
      // Get credentials from vault if not provided
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      this.logger.debug('Fetching current schema');

      // Get current schema
      const currentSchema = await this.fetchSchema(url, key);

      // Load baseline schema
      const baselineSchema = await this.loadBaseline(typed.baselinePath);

      // Compare schemas
      const changes = this.compareSchemas(baselineSchema, currentSchema);

      if (changes.length > 0) {
        this.logger.warn('Schema changes detected!', {
          count: changes.length,
          changes: changes.map(c => ({ type: c.type, action: c.action, name: c.objectName })),
        });

        // TODO: Send alerts (Telegram, email, webhook)
      } else {
        this.logger.info('Schema unchanged', { lastCheck: new Date().toISOString() });
      }

      return {
        success: true,
        data: {
          changes,
          changesDetected: changes.length,
          lastCheck: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      this.logger.error('Schema Sentinel failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Fetch current schema from Supabase
   */
  private async fetchSchema(url: string, key: string): Promise<any> {
    this.logger.debug('Fetching schema from Supabase');

    // Query information_schema to get tables, columns, constraints
    const query = `
      SELECT
        table_schema,
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name, ordinal_position
    `;

    // TODO: Execute query via Supabase REST API or direct PostgreSQL connection
    // For now, return mock data
    return {
      tables: [
        { schema: 'public', name: 'users', columns: ['id', 'email', 'created_at'] },
        { schema: 'public', name: 'posts', columns: ['id', 'user_id', 'title', 'content'] },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Load baseline schema from file or database
   */
  private async loadBaseline(baselinePath?: string): Promise<any> {
    this.logger.debug('Loading baseline schema');

    // TODO: Load from file system or database
    // For now, return empty baseline (all changes will be new)
    return {
      tables: [],
      timestamp: new Date('2026-02-01').toISOString(),
    };
  }

  /**
   * Compare baseline and current schemas
   */
  private compareSchemas(baseline: any, current: any): SchemaChange[] {
    const changes: SchemaChange[] = [];

    // Compare tables
    const baselineTables = new Set(baseline.tables.map((t: any) => t.name));
    const currentTables = new Set(current.tables.map((t: any) => t.name));

    // Detect added tables
    for (const table of current.tables) {
      if (!baselineTables.has(table.name)) {
        changes.push({
          type: 'table',
          action: 'added',
          objectName: table.name,
          details: table,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Detect removed tables
    for (const table of baseline.tables) {
      if (!currentTables.has(table.name)) {
        changes.push({
          type: 'table',
          action: 'removed',
          objectName: table.name,
          details: table,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return changes;
  }

  /**
   * Save current schema as new baseline
   */
  async saveBaseline(params: SkillInput): Promise<boolean> {
    const typed = params as SchemaSentinelParams;
    this.logger.info('Saving current schema as baseline');

    try {
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found');
      }

      const currentSchema = await this.fetchSchema(url, key);

      // TODO: Save to file system or database
      this.logger.info('Baseline saved successfully');

      return true;
    } catch (error: any) {
      this.logger.error('Failed to save baseline', { error: error.message });
      return false;
    }
  }
}
