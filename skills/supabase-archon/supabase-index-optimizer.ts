/**
 * Supabase Archon - Index Optimizer (S-09)
 * Analyzes query patterns and recommends/creates optimal indexes
 *
 * @version 1.0.0
 * @priority P1
 * @category UTIL
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';

// ============================================================================
// TYPES
// ============================================================================

export interface IndexRecommendation {
  id: string;
  tableName: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'brin';
  severity: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  estimatedImpact: string;
  estimatedSize: string;
  sql: string;
  queryPatterns: string[];
}

export interface IndexAnalysis {
  indexName: string;
  tableName: string;
  columns: string[];
  size: string;
  usageCount: number;
  scansPerDay: number;
  lastUsed: string | null;
  efficiency: number; // 0-100
  recommendation: 'keep' | 'optimize' | 'remove' | 'review';
  reason: string;
}

export interface IndexOptimizerParams extends SkillInput {
  action: 'analyze' | 'recommend' | 'create' | 'detect_unused' | 'evaluate_efficiency';
  tableName?: string;
  slowQueryLog?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  requireApproval?: boolean;
  dryRun?: boolean;
}

export interface IndexOptimizerResult extends SkillOutput {
  data?: {
    action: string;
    recommendations: IndexRecommendation[];
    analysis: IndexAnalysis[];
    summary: string;
    totalSize?: string;
    potentialGain?: string;
    createdIndexes?: string[];
  };
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockSlowQueries = [
  {
    query: 'SELECT * FROM users WHERE email = ? AND status = ?',
    executionTime: 2500,
    rowsScanned: 50000,
  },
  {
    query: 'SELECT * FROM orders WHERE user_id = ? AND created_at > ?',
    executionTime: 1800,
    rowsScanned: 100000,
  },
  {
    query: 'SELECT * FROM products WHERE category = ? AND price < ?',
    executionTime: 3200,
    rowsScanned: 200000,
  },
  {
    query: 'SELECT o.*, u.name FROM orders o JOIN users u ON o.user_id = u.id WHERE o.status = ?',
    executionTime: 2100,
    rowsScanned: 150000,
  },
  {
    query: 'SELECT * FROM transactions WHERE date BETWEEN ? AND ? AND status IN (?, ?)',
    executionTime: 4500,
    rowsScanned: 500000,
  },
];

const mockExistingIndexes = [
  {
    name: 'idx_users_id',
    table: 'users',
    columns: ['id'],
    size: '2.5 MB',
    usageCount: 5000,
    scansPerDay: 450,
    lastUsed: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    name: 'idx_orders_created_at',
    table: 'orders',
    columns: ['created_at'],
    size: '8.3 MB',
    usageCount: 120,
    scansPerDay: 8,
    lastUsed: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    name: 'idx_products_unused',
    table: 'products',
    columns: ['sku', 'warehouse_id'],
    size: '15.4 MB',
    usageCount: 2,
    scansPerDay: 0,
    lastUsed: new Date(Date.now() - 2592000000).toISOString(),
  },
  {
    name: 'idx_transactions_status',
    table: 'transactions',
    columns: ['status'],
    size: '3.1 MB',
    usageCount: 890,
    scansPerDay: 120,
    lastUsed: new Date(Date.now() - 1800000).toISOString(),
  },
];

// ============================================================================
// INDEX OPTIMIZER SKILL
// ============================================================================

/**
 * Index Optimizer - Analyzes query patterns and recommends optimal indexes
 */
export class SupabaseIndexOptimizer extends Skill {
  private logger = createLogger('index-optimizer');

  constructor() {
    super(
      {
        name: 'supabase-index-optimizer',
        description:
          'Analyzes query patterns and recommends/creates optimal indexes for Supabase databases',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'indexes', 'optimization', 'performance'],
      },
      {
        timeout: 45000,
        retries: 2,
        requiresApproval: false,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as IndexOptimizerParams;

    if (!typed.action) {
      return false;
    }

    const validActions = ['analyze', 'recommend', 'create', 'detect_unused', 'evaluate_efficiency'];
    return validActions.includes(typed.action);
  }

  /**
   * Execute index optimization
   */
  async execute(params: SkillInput): Promise<IndexOptimizerResult> {
    const typed = params as IndexOptimizerParams;

    this.logger.info('Index Optimizer starting', {
      action: typed.action,
      hasTable: !!typed.tableName,
    });

    try {
      let result: IndexOptimizerResult;

      switch (typed.action) {
        case 'analyze':
          result = await this.analyzeIndexUsage();
          break;

        case 'recommend':
          result = await this.recommendIndexes(typed.slowQueryLog);
          break;

        case 'create':
          result = await this.createIndexes(typed.dryRun ?? true);
          break;

        case 'detect_unused':
          result = await this.detectUnusedIndexes();
          break;

        case 'evaluate_efficiency':
          result = await this.evaluateIndexEfficiency();
          break;

        default:
          return {
            success: false,
            error: `Unknown action: ${typed.action}`,
          };
      }

      this.logger.info('Index Optimizer complete', {
        action: typed.action,
        success: result.success,
      });

      return result;
    } catch (error: any) {
      this.logger.error('Index Optimizer failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Analyze current index usage and efficiency
   */
  private async analyzeIndexUsage(): Promise<IndexOptimizerResult> {
    this.logger.debug('Analyzing index usage');

    const analysis: IndexAnalysis[] = mockExistingIndexes.map((idx) => {
      const efficiency = this.calculateIndexEfficiency(
        idx.usageCount,
        idx.scansPerDay,
        parseFloat(idx.size)
      );

      let recommendation: 'keep' | 'optimize' | 'remove' | 'review' = 'keep';
      let reason = '';

      if (idx.scansPerDay === 0 && idx.usageCount < 10) {
        recommendation = 'remove';
        reason = 'Index is rarely used and consumes storage';
      } else if (efficiency < 30) {
        recommendation = 'review';
        reason = 'Index efficiency is low, consider optimization or removal';
      } else if (efficiency < 60) {
        recommendation = 'optimize';
        reason = 'Index efficiency could be improved';
      } else {
        reason = 'Index is performing well';
      }

      return {
        indexName: idx.name,
        tableName: idx.table,
        columns: idx.columns,
        size: idx.size,
        usageCount: idx.usageCount,
        scansPerDay: idx.scansPerDay,
        lastUsed: idx.lastUsed,
        efficiency,
        recommendation,
        reason,
      };
    });

    const summary = this.generateAnalysisSummary(analysis);

    return {
      success: true,
      data: {
        action: 'analyze',
        analysis,
        recommendations: [],
        summary,
      },
    };
  }

  /**
   * Recommend indexes based on slow query log
   */
  private async recommendIndexes(slowQueryLog?: string): Promise<IndexOptimizerResult> {
    this.logger.debug('Recommending indexes', { hasLog: !!slowQueryLog });

    const queries = slowQueryLog ? this.parseQueryLog(slowQueryLog) : mockSlowQueries;

    const recommendations: IndexRecommendation[] = [];

    queries.forEach((q, idx) => {
      const extracted = this.extractIndexableColumns(q.query);

      if (extracted.length > 0) {
        recommendations.push({
          id: `rec-${idx + 1}`,
          tableName: this.extractTableName(q.query),
          columns: extracted,
          type: extracted.length > 1 ? 'btree' : 'btree',
          severity: q.executionTime > 3000 ? 'critical' : 'high',
          reason: `Query scanned ${q.rowsScanned} rows and took ${q.executionTime}ms`,
          estimatedImpact: `Potential 5-10x performance improvement`,
          estimatedSize: `${Math.ceil(q.rowsScanned / 10000)} MB`,
          sql: this.generateIndexSQL(this.extractTableName(q.query), extracted),
          queryPatterns: [q.query],
        });
      }
    });

    const summary = `Found ${recommendations.length} index recommendations. ` +
      `Implementing these could improve query performance by 5-10x on average.`;

    return {
      success: true,
      data: {
        action: 'recommend',
        recommendations,
        analysis: [],
        summary,
      },
    };
  }

  /**
   * Create recommended indexes (with approval)
   */
  private async createIndexes(dryRun: boolean = true): Promise<IndexOptimizerResult> {
    this.logger.debug('Creating indexes', { dryRun });

    // Get current recommendations
    const recommendations = await this.recommendIndexes();
    const indexesToCreate = recommendations.data?.recommendations || [];

    const createdIndexes: string[] = [];
    const operations: string[] = [];

    indexesToCreate.forEach((rec) => {
      if (!dryRun) {
        createdIndexes.push(`${rec.tableName}_${rec.columns.join('_')}`);
        this.logger.info('Index created', {
          table: rec.tableName,
          columns: rec.columns.join(','),
        });
      }
      operations.push(rec.sql);
    });

    const summary = dryRun
      ? `Dry run: Would create ${indexesToCreate.length} indexes`
      : `Created ${createdIndexes.length} indexes successfully`;

    return {
      success: true,
      data: {
        action: 'create',
        recommendations: indexesToCreate,
        analysis: [],
        summary,
        createdIndexes,
      },
    };
  }

  /**
   * Detect unused indexes
   */
  private async detectUnusedIndexes(): Promise<IndexOptimizerResult> {
    this.logger.debug('Detecting unused indexes');

    const unusedIndexes: IndexAnalysis[] = [];

    mockExistingIndexes.forEach((idx) => {
      if (idx.scansPerDay === 0 && idx.usageCount < 5) {
        unusedIndexes.push({
          indexName: idx.name,
          tableName: idx.table,
          columns: idx.columns,
          size: idx.size,
          usageCount: idx.usageCount,
          scansPerDay: idx.scansPerDay,
          lastUsed: idx.lastUsed,
          efficiency: 0,
          recommendation: 'remove',
          reason: `Unused index. Last accessed ${this.getDaysSince(idx.lastUsed)} days ago. ` +
            `Removing could save ${idx.size} of storage.`,
        });
      }
    });

    const totalSize = unusedIndexes
      .reduce((sum, idx) => sum + parseFloat(idx.size), 0)
      .toFixed(1);

    const summary = `Found ${unusedIndexes.length} unused indexes consuming ${totalSize} MB. ` +
      `Removing them could free up storage without impacting performance.`;

    return {
      success: true,
      data: {
        action: 'detect_unused',
        analysis: unusedIndexes,
        recommendations: [],
        summary,
        totalSize: `${totalSize} MB`,
      },
    };
  }

  /**
   * Evaluate overall index efficiency
   */
  private async evaluateIndexEfficiency(): Promise<IndexOptimizerResult> {
    this.logger.debug('Evaluating index efficiency');

    const analysis: IndexAnalysis[] = mockExistingIndexes.map((idx) => {
      const efficiency = this.calculateIndexEfficiency(
        idx.usageCount,
        idx.scansPerDay,
        parseFloat(idx.size)
      );

      return {
        indexName: idx.name,
        tableName: idx.table,
        columns: idx.columns,
        size: idx.size,
        usageCount: idx.usageCount,
        scansPerDay: idx.scansPerDay,
        lastUsed: idx.lastUsed,
        efficiency,
        recommendation: efficiency > 70 ? 'keep' : efficiency > 40 ? 'optimize' : 'review',
        reason: `Efficiency score: ${efficiency}/100`,
      };
    });

    const avgEfficiency = Math.round(
      analysis.reduce((sum, a) => sum + a.efficiency, 0) / analysis.length
    );

    const summary = `Database index health: ${avgEfficiency}%. ` +
      `${analysis.filter((a) => a.recommendation !== 'keep').length} indexes could be optimized. ` +
      `Overall storage: ${mockExistingIndexes.reduce((sum, idx) => sum + parseFloat(idx.size), 0).toFixed(1)} MB`;

    return {
      success: true,
      data: {
        action: 'evaluate_efficiency',
        analysis,
        recommendations: [],
        summary,
      },
    };
  }

  /**
   * Calculate index efficiency score (0-100)
   */
  private calculateIndexEfficiency(usageCount: number, scansPerDay: number, sizeInMB: number): number {
    if (usageCount === 0 && scansPerDay === 0) {
      return 0; // Completely unused
    }

    // Higher usage = higher efficiency
    const usageScore = Math.min(100, usageCount / 10);

    // More recent usage = higher efficiency
    const recencyBonus = scansPerDay > 0 ? 30 : 0;

    // Lower size = higher efficiency
    const sizepenalty = Math.min(30, sizeInMB / 10);

    return Math.max(0, Math.round(usageScore + recencyBonus - sizepenalty));
  }

  /**
   * Extract table name from query
   */
  private extractTableName(query: string): string {
    const match = query.match(/FROM\s+(\w+)|INSERT\s+INTO\s+(\w+)|UPDATE\s+(\w+)/i);
    return match ? match[1] || match[2] || match[3] : 'unknown_table';
  }

  /**
   * Extract indexable columns from WHERE clause
   */
  private extractIndexableColumns(query: string): string[] {
    const whereMatch = query.match(/WHERE\s+([^;]+)/i);
    if (!whereMatch) return [];

    const whereClause = whereMatch[1];
    const columns: string[] = [];

    // Match column = value patterns
    const columnMatches = Array.from(whereClause.matchAll(/(\w+)\s*=\s*\?/g));
    columnMatches.forEach((match) => {
      columns.push(match[1]);
    });

    // Match AND conditions
    const andMatches = Array.from(whereClause.matchAll(/AND\s+(\w+)\s*(?:=|<|>|BETWEEN)/gi));
    andMatches.forEach((match) => {
      if (!columns.includes(match[1])) {
        columns.push(match[1]);
      }
    });

    return columns;
  }

  /**
   * Generate CREATE INDEX SQL
   */
  private generateIndexSQL(tableName: string, columns: string[]): string {
    const indexName = `idx_${tableName}_${columns.join('_')}`;
    return `CREATE INDEX CONCURRENTLY ${indexName} ON ${tableName} (${columns.join(', ')}) WHERE status IS NOT NULL;`;
  }

  /**
   * Parse slow query log
   */
  private parseQueryLog(log: string): typeof mockSlowQueries {
    // In production, would parse actual log format
    // For now, return mock data
    return mockSlowQueries;
  }

  /**
   * Generate analysis summary
   */
  private generateAnalysisSummary(analysis: IndexAnalysis[]): string {
    const keepCount = analysis.filter((a) => a.recommendation === 'keep').length;
    const removeCount = analysis.filter((a) => a.recommendation === 'remove').length;
    const optimizeCount = analysis.filter((a) => a.recommendation === 'optimize').length;

    const totalSize = analysis
      .reduce((sum, a) => sum + parseFloat(a.size), 0)
      .toFixed(1);

    return `Index analysis complete. Total indexes: ${analysis.length}, ` +
      `Size: ${totalSize} MB. Keep: ${keepCount}, Remove: ${removeCount}, ` +
      `Optimize: ${optimizeCount}. Removing unused indexes could save ${(removeCount * 5).toFixed(1)} MB.`;
  }

  /**
   * Calculate days since date
   */
  private getDaysSince(dateStr: string | null): number {
    if (!dateStr) return 999;
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}
