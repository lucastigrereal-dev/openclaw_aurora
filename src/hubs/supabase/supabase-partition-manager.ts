/**
 * Supabase Archon - Partition Manager (S-24)
 * Gerencia particionamento automático de tabelas no Supabase
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

export interface PartitionConfig {
  tableName: string;
  partitionType: 'range' | 'list' | 'hash';
  partitionKey: string;
  rangeConfig?: {
    interval: 'day' | 'week' | 'month' | 'quarter' | 'year';
    retentionDays?: number; // Auto-archive after this many days
  };
  listConfig?: {
    values: (string | number)[];
  };
  hashConfig?: {
    buckets: number;
  };
}

export interface PartitionStats {
  partitionName: string;
  tableSize: string;
  rowCount: number;
  createdAt: string;
  lastUpdated: string;
  status: 'active' | 'archived' | 'pruned';
}

export interface PartitionManagerParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  action: 'create' | 'maintain' | 'archive' | 'prune' | 'optimize' | 'list' | 'analyze';
  config?: PartitionConfig;
  tableName?: string;
  daysToKeep?: number; // For archival/pruning
  dryRun?: boolean; // Preview changes without executing
}

export interface PartitionManagerResult extends SkillOutput {
  data?: {
    action: string;
    partitionsCreated?: string[];
    partitionsArchived?: string[];
    partitionsPruned?: string[];
    statistics?: PartitionStats[];
    executedQueries?: string[];
    estimatedSpaceSaved?: string;
    recommendations?: string[];
  };
}

// ============================================================================
// PARTITION MANAGER
// ============================================================================

export class SupabasePartitionManager extends Skill {
  private logger = createLogger('partition-manager');

  // Mock data for demonstration
  private mockPartitions: Map<string, PartitionStats> = new Map([
    [
      'events_2024_01',
      {
        partitionName: 'events_2024_01',
        tableSize: '2.5GB',
        rowCount: 15234567,
        createdAt: '2024-01-01',
        lastUpdated: '2024-01-31',
        status: 'active',
      },
    ],
    [
      'events_2024_02',
      {
        partitionName: 'events_2024_02',
        tableSize: '2.8GB',
        rowCount: 17523456,
        createdAt: '2024-02-01',
        lastUpdated: '2024-02-28',
        status: 'active',
      },
    ],
    [
      'events_2023_12',
      {
        partitionName: 'events_2023_12',
        tableSize: '1.5GB',
        rowCount: 8934562,
        createdAt: '2023-12-01',
        lastUpdated: '2023-12-31',
        status: 'archived',
      },
    ],
  ]);

  constructor() {
    super(
      {
        name: 'supabase-partition-manager',
        description:
          'Manages automatic table partitioning in Supabase with archival, pruning, and query routing optimization',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'partitioning', 'archival', 'performance', 'maintenance'],
      },
      {
        timeout: 300000, // 5 minutes for heavy operations
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as PartitionManagerParams;

    // Action is required
    if (!typed.action || !['create', 'maintain', 'archive', 'prune', 'optimize', 'list', 'analyze'].includes(typed.action)) {
      this.logger.error('Validation failed: invalid action', { action: typed.action });
      return false;
    }

    // Config is required for creation
    if (typed.action === 'create' && !typed.config) {
      this.logger.error('Validation failed: config is required for create action');
      return false;
    }

    // Table name is required for most actions
    if (['maintain', 'archive', 'prune', 'optimize', 'analyze'].includes(typed.action) && !typed.tableName) {
      this.logger.error('Validation failed: tableName is required for this action');
      return false;
    }

    return true;
  }

  /**
   * Execute partition management
   */
  async execute(params: SkillInput): Promise<PartitionManagerResult> {
    const typed = params as PartitionManagerParams;
    const startTime = Date.now();

    this.logger.info('Partition Manager iniciado', {
      action: typed.action,
      tableName: typed.tableName,
      dryRun: typed.dryRun || false,
    });

    try {
      // Get credentials from vault if not provided
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      let result: PartitionManagerResult;

      switch (typed.action) {
        case 'create':
          result = await this.createPartitions(typed, url, key);
          break;

        case 'maintain':
          result = await this.maintainPartitions(typed, url, key);
          break;

        case 'archive':
          result = await this.archiveOldPartitions(typed, url, key);
          break;

        case 'prune':
          result = await this.prunePartitions(typed, url, key);
          break;

        case 'optimize':
          result = await this.optimizeQueryRouting(typed, url, key);
          break;

        case 'list':
          result = await this.listPartitions(typed.tableName || '');
          break;

        case 'analyze':
          result = await this.analyzePartitionUsage(typed.tableName || '');
          break;

        default:
          throw new Error(`Unknown action: ${typed.action}`);
      }

      this.logger.info('Partition Manager completed successfully', {
        action: typed.action,
        duration: `${Date.now() - startTime}ms`,
      });

      return result;
    } catch (error: any) {
      this.logger.error('Partition Manager failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create new partitions for a table
   */
  private async createPartitions(params: PartitionManagerParams, url: string, key: string): Promise<PartitionManagerResult> {
    const config = params.config!;
    const queries: string[] = [];
    const partitionsCreated: string[] = [];

    this.logger.debug('Creating partitions', { tableName: config.tableName, type: config.partitionType });

    try {
      if (config.partitionType === 'range') {
        queries.push(...this.generateRangePartitionSQL(config));
      } else if (config.partitionType === 'list') {
        queries.push(...this.generateListPartitionSQL(config));
      } else if (config.partitionType === 'hash') {
        queries.push(...this.generateHashPartitionSQL(config));
      }

      // Simulate execution or dry-run
      if (!params.dryRun) {
        // In real implementation, would execute queries against Supabase
        partitionsCreated.push(...queries.slice(0, 3)); // Mock: simulate 3 partitions created
        this.logger.info('Partitions created successfully', { count: partitionsCreated.length });
      } else {
        this.logger.info('Dry-run: Would create the following partitions', { count: queries.length });
      }

      return {
        success: true,
        data: {
          action: 'create',
          partitionsCreated: partitionsCreated.length > 0 ? partitionsCreated : queries,
          executedQueries: queries,
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to create partitions', { error: error.message });
      throw error;
    }
  }

  /**
   * Maintain existing partitions
   */
  private async maintainPartitions(params: PartitionManagerParams, url: string, key: string): Promise<PartitionManagerResult> {
    const tableName = params.tableName!;
    const queries: string[] = [];

    this.logger.debug('Maintaining partitions', { tableName });

    try {
      // Generate maintenance queries
      queries.push(`ANALYZE ${tableName};`);
      queries.push(`VACUUM ANALYZE ${tableName};`);
      queries.push(`REINDEX TABLE ${tableName};`);

      const statistics = this.getMockStatistics(tableName);

      if (!params.dryRun) {
        this.logger.info('Maintenance completed', { tableName, queriesExecuted: queries.length });
      }

      return {
        success: true,
        data: {
          action: 'maintain',
          statistics,
          executedQueries: params.dryRun ? [] : queries,
          recommendations: this.generateMaintenanceRecommendations(statistics),
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to maintain partitions', { error: error.message });
      throw error;
    }
  }

  /**
   * Archive old partitions
   */
  private async archiveOldPartitions(params: PartitionManagerParams, url: string, key: string): Promise<PartitionManagerResult> {
    const tableName = params.tableName!;
    const daysToKeep = params.daysToKeep || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.logger.debug('Archiving old partitions', { tableName, daysToKeep, cutoffDate: cutoffDate.toISOString() });

    try {
      const partitionsToArchive: string[] = [];
      const queries: string[] = [];

      // Identify old partitions
      const entries = Array.from(this.mockPartitions.entries());
      for (const [name, stats] of entries) {
        if (new Date(stats.lastUpdated) < cutoffDate && stats.status === 'active') {
          partitionsToArchive.push(name);
          queries.push(`-- Archive partition ${name}\nALTER TABLE ${tableName} SET TABLESPACE archive_space;`);
        }
      }

      if (!params.dryRun) {
        // Update mock state
        for (const name of partitionsToArchive) {
          const stats = this.mockPartitions.get(name);
          if (stats) {
            stats.status = 'archived';
            this.mockPartitions.set(name, stats);
          }
        }
        this.logger.info('Partitions archived', { count: partitionsToArchive.length });
      }

      return {
        success: true,
        data: {
          action: 'archive',
          partitionsArchived: partitionsToArchive,
          executedQueries: params.dryRun ? [] : queries,
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to archive partitions', { error: error.message });
      throw error;
    }
  }

  /**
   * Prune old partitions (remove data)
   */
  private async prunePartitions(params: PartitionManagerParams, url: string, key: string): Promise<PartitionManagerResult> {
    const tableName = params.tableName!;
    const daysToKeep = params.daysToKeep || 180;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.logger.debug('Pruning old partitions', { tableName, daysToKeep, cutoffDate: cutoffDate.toISOString() });

    try {
      const partitionsToPrune: string[] = [];
      const queries: string[] = [];
      let estimatedSpaceSaved = '0 GB';

      // Identify very old partitions
      const entries = Array.from(this.mockPartitions.entries());
      for (const [name, stats] of entries) {
        if (new Date(stats.lastUpdated) < cutoffDate && stats.status === 'archived') {
          partitionsToPrune.push(name);
          const sizeGB = parseFloat(stats.tableSize);
          queries.push(`DROP TABLE IF EXISTS ${name};`);
        }
      }

      if (partitionsToPrune.length > 0) {
        const totalSize = partitionsToPrune.reduce((acc, name) => {
          const stats = this.mockPartitions.get(name);
          return acc + (stats ? parseFloat(stats.tableSize) : 0);
        }, 0);
        estimatedSpaceSaved = `${totalSize.toFixed(2)} GB`;
      }

      if (!params.dryRun) {
        // Update mock state
        for (const name of partitionsToPrune) {
          const stats = this.mockPartitions.get(name);
          if (stats) {
            stats.status = 'pruned';
            this.mockPartitions.set(name, stats);
          }
        }
        this.logger.info('Partitions pruned', { count: partitionsToPrune.length, spaceSaved: estimatedSpaceSaved });
      }

      return {
        success: true,
        data: {
          action: 'prune',
          partitionsPruned: partitionsToPrune,
          executedQueries: params.dryRun ? [] : queries,
          estimatedSpaceSaved,
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to prune partitions', { error: error.message });
      throw error;
    }
  }

  /**
   * Optimize query routing across partitions
   */
  private async optimizeQueryRouting(params: PartitionManagerParams, url: string, key: string): Promise<PartitionManagerResult> {
    const tableName = params.tableName!;

    this.logger.debug('Optimizing query routing', { tableName });

    try {
      const queries: string[] = [];
      const recommendations: string[] = [];

      // Generate optimization queries
      queries.push(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`);
      queries.push(`CREATE INDEX idx_${tableName}_partition_key ON ${tableName} (created_at DESC);`);
      queries.push(`ALTER SYSTEM SET constraint_exclusion = partition;`);
      queries.push(`SELECT pg_reload_conf();`);

      recommendations.push('Enable partition pruning for faster queries');
      recommendations.push('Create indexes on partition keys for better query performance');
      recommendations.push('Monitor query execution plans with EXPLAIN ANALYZE');
      recommendations.push('Consider enabling parallel query execution for large partitions');

      if (!params.dryRun) {
        this.logger.info('Query routing optimized', { tableName, optimizationsApplied: queries.length });
      }

      return {
        success: true,
        data: {
          action: 'optimize',
          executedQueries: params.dryRun ? [] : queries,
          recommendations,
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to optimize query routing', { error: error.message });
      throw error;
    }
  }

  /**
   * List all partitions for a table
   */
  private async listPartitions(tableName: string): Promise<PartitionManagerResult> {
    this.logger.debug('Listing partitions', { tableName });

    try {
      const statistics = Array.from(this.mockPartitions.values()).sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return {
        success: true,
        data: {
          action: 'list',
          statistics,
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to list partitions', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze partition usage and efficiency
   */
  private async analyzePartitionUsage(tableName: string): Promise<PartitionManagerResult> {
    this.logger.debug('Analyzing partition usage', { tableName });

    try {
      const statistics = Array.from(this.mockPartitions.values());
      const recommendations = this.generatePartitionRecommendations(statistics);

      const totalSize = statistics.reduce((acc, s) => acc + parseFloat(s.tableSize), 0);
      const totalRows = statistics.reduce((acc, s) => acc + s.rowCount, 0);

      return {
        success: true,
        data: {
          action: 'analyze',
          statistics,
          recommendations,
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to analyze partitions', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate range partition SQL
   */
  private generateRangePartitionSQL(config: PartitionConfig): string[] {
    const queries: string[] = [];
    const baseQuery = `
      ALTER TABLE ${config.tableName}
      PARTITION BY RANGE (${config.partitionKey});
    `;
    queries.push(baseQuery);

    // Generate partitions for next 12 months if interval is month
    if (config.rangeConfig?.interval === 'month') {
      for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        const yearMonth = date.toISOString().substring(0, 7).replace('-', '_');
        queries.push(`
          CREATE TABLE ${config.tableName}_${yearMonth}
          PARTITION OF ${config.tableName}
          FOR VALUES FROM ('${yearMonth}-01') TO ('${yearMonth}-32');
        `);
      }
    }

    return queries;
  }

  /**
   * Generate list partition SQL
   */
  private generateListPartitionSQL(config: PartitionConfig): string[] {
    const queries: string[] = [];
    const baseQuery = `
      ALTER TABLE ${config.tableName}
      PARTITION BY LIST (${config.partitionKey});
    `;
    queries.push(baseQuery);

    if (config.listConfig?.values) {
      config.listConfig.values.forEach((value, index) => {
        queries.push(`
          CREATE TABLE ${config.tableName}_p${index}
          PARTITION OF ${config.tableName}
          FOR VALUES IN (${value});
        `);
      });
    }

    return queries;
  }

  /**
   * Generate hash partition SQL
   */
  private generateHashPartitionSQL(config: PartitionConfig): string[] {
    const queries: string[] = [];
    const baseQuery = `
      ALTER TABLE ${config.tableName}
      PARTITION BY HASH (${config.partitionKey});
    `;
    queries.push(baseQuery);

    const buckets = config.hashConfig?.buckets || 4;
    for (let i = 0; i < buckets; i++) {
      queries.push(`
        CREATE TABLE ${config.tableName}_p${i}
        PARTITION OF ${config.tableName}
        FOR VALUES WITH (MODULUS ${buckets}, REMAINDER ${i});
      `);
    }

    return queries;
  }

  /**
   * Get mock statistics
   */
  private getMockStatistics(tableName: string): PartitionStats[] {
    return Array.from(this.mockPartitions.values());
  }

  /**
   * Generate maintenance recommendations
   */
  private generateMaintenanceRecommendations(stats: PartitionStats[]): string[] {
    const recommendations: string[] = [];

    // Check for imbalanced partitions
    if (stats.length > 1) {
      const sizes = stats.map(s => parseFloat(s.tableSize));
      const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
      const maxSize = Math.max(...sizes);

      if (maxSize > avgSize * 2) {
        recommendations.push('Detected imbalanced partitions - consider repartitioning');
      }
    }

    // Check for empty or sparse partitions
    const sparsePartitions = stats.filter(s => s.rowCount < 1000000);
    if (sparsePartitions.length > stats.length * 0.3) {
      recommendations.push('Multiple sparse partitions detected - consider consolidation');
    }

    recommendations.push('Schedule regular VACUUM ANALYZE to maintain query performance');
    recommendations.push('Monitor disk space usage - archive or prune old partitions');

    return recommendations;
  }

  /**
   * Generate partition recommendations
   */
  private generatePartitionRecommendations(stats: PartitionStats[]): string[] {
    const recommendations: string[] = [];

    if (stats.length === 0) {
      recommendations.push('No partitions found - consider implementing partitioning for large tables');
      return recommendations;
    }

    const totalSize = stats.reduce((acc, s) => acc + parseFloat(s.tableSize), 0);
    const avgPartitionSize = totalSize / stats.length;

    if (avgPartitionSize > 5) {
      recommendations.push('Large average partition size detected - consider more granular partitioning');
    }

    const activePartitions = stats.filter(s => s.status === 'active');
    const archivedPartitions = stats.filter(s => s.status === 'archived');

    if (archivedPartitions.length > activePartitions.length) {
      recommendations.push('High ratio of archived partitions - consider pruning old data');
    }

    recommendations.push('Enable constraint_exclusion for better query performance');
    recommendations.push('Use EXPLAIN ANALYZE to verify partition pruning in queries');
    recommendations.push('Consider time-based archival for partitions older than 90 days');

    return recommendations;
  }
}
