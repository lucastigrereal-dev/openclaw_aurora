/**
 * Supabase Archon - Query Doctor (S-08)
 * Analyzes SQL queries for performance issues and optimization opportunities
 *
 * @version 1.0.0
 * @priority P0
 * @category UTIL
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';
import { getVault } from './supabase-vault-config';

// ============================================================================
// TYPES
// ============================================================================

export interface QueryIssue {
  type: 'missing_index' | 'full_scan' | 'n_plus_one' | 'inefficient_join' | 'subquery_abuse';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  estimatedImpact: string;
}

export interface QueryDoctorParams extends SkillInput {
  query: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  analyzeExecutionPlan?: boolean;
}

export interface QueryDoctorResult extends SkillOutput {
  data?: {
    issues: QueryIssue[];
    estimatedCost: number;
    score: number; // 0-100
    optimizedQuery?: string;
    summary: string;
  };
}

// ============================================================================
// QUERY DOCTOR SKILL
// ============================================================================

/**
 * Query Doctor - Analyzes SQL queries for performance issues
 */
export class SupabaseQueryDoctor extends Skill {
  private logger = createLogger('query-doctor');

  constructor() {
    super(
      {
        name: 'supabase-query-doctor',
        description: 'Analyzes SQL queries for performance issues, missing indexes, and optimization opportunities',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'performance', 'query', 'optimization'],
      },
      {
        timeout: 30000,
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as QueryDoctorParams;

    if (!typed.query || typeof typed.query !== 'string') {
      return false;
    }

    // Query must be at least somewhat meaningful
    return typed.query.trim().length > 10;
  }

  /**
   * Execute query analysis
   */
  async execute(params: SkillInput): Promise<QueryDoctorResult> {
    const typed = params as QueryDoctorParams;

    this.logger.info('Query Doctor analyzing query', {
      queryLength: typed.query.length,
      hasUrl: !!typed.supabaseUrl,
    });

    try {
      // Normalize and parse query
      const normalizedQuery = this.normalizeQuery(typed.query);
      this.logger.debug('Query normalized');

      // Analyze query for issues
      const issues = this.analyzeQuery(normalizedQuery);
      this.logger.debug('Query analysis complete', { issuesFound: issues.length });

      // Calculate cost score (0-100)
      const score = this.calculateScore(issues);

      // Generate optimized query suggestion
      const optimizedQuery = this.generateOptimization(normalizedQuery, issues);

      // Estimate query cost (relative units)
      const estimatedCost = this.estimateCost(normalizedQuery);

      // Create summary
      const summary = this.createSummary(issues, score);

      this.logger.info('Query Doctor analysis complete', {
        score,
        issuesCount: issues.length,
        estimatedCost,
      });

      return {
        success: true,
        data: {
          issues,
          estimatedCost,
          score,
          optimizedQuery,
          summary,
        },
      };
    } catch (error: any) {
      this.logger.error('Query Doctor failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Normalize query (remove extra whitespace, uppercase keywords)
   */
  private normalizeQuery(query: string): string {
    return query
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  /**
   * Analyze query for common performance issues
   */
  private analyzeQuery(query: string): QueryIssue[] {
    const issues: QueryIssue[] = [];

    // Check for SELECT *
    if (this.hasSelectStar(query)) {
      issues.push({
        type: 'full_scan',
        severity: 'medium',
        description: 'Query uses SELECT * which retrieves all columns unnecessarily',
        recommendation: 'Specify only the columns you need in the SELECT clause',
        estimatedImpact: 'Reduced bandwidth usage and faster query execution',
      });
    }

    // Check for missing WHERE clause
    if (this.isMissingWhereClause(query)) {
      issues.push({
        type: 'full_scan',
        severity: 'high',
        description: 'Query performs full table scan without WHERE clause',
        recommendation: 'Add WHERE conditions to filter the result set',
        estimatedImpact: 'Dramatic reduction in data scanned and processing time',
      });
    }

    // Check for N+1 query pattern indicators
    if (this.hasNPlusOneIndicators(query)) {
      issues.push({
        type: 'n_plus_one',
        severity: 'high',
        description: 'Query pattern suggests potential N+1 problem in application code',
        recommendation: 'Use JOINs or batch loading instead of separate queries',
        estimatedImpact: 'Can reduce query count from hundreds to single digit',
      });
    }

    // Check for inefficient JOINs
    if (this.hasIneffientJoins(query)) {
      issues.push({
        type: 'inefficient_join',
        severity: 'medium',
        description: 'JOINs detected without proper indexes on join columns',
        recommendation: 'Create indexes on foreign key columns used in JOINs',
        estimatedImpact: '5-10x faster JOIN performance',
      });
    }

    // Check for subquery abuse
    if (this.hasSubqueryAbuse(query)) {
      issues.push({
        type: 'subquery_abuse',
        severity: 'medium',
        description: 'Multiple nested subqueries may cause inefficient execution',
        recommendation: 'Consider using CTEs (WITH clause) or reformulate with JOINs',
        estimatedImpact: 'Improved query plan optimization and execution',
      });
    }

    // Check for LIKE patterns
    if (this.hasUnoptimizedLike(query)) {
      issues.push({
        type: 'full_scan',
        severity: 'medium',
        description: 'LIKE queries with leading wildcard cannot use indexes',
        recommendation: 'Consider full-text search for complex pattern matching',
        estimatedImpact: 'Better use of indexes, faster searches',
      });
    }

    // Check for missing indexes on WHERE conditions
    if (this.hasMissingIndexOnWhere(query)) {
      issues.push({
        type: 'missing_index',
        severity: 'high',
        description: 'WHERE clause filters on columns likely without indexes',
        recommendation: 'Create indexes on frequently filtered columns',
        estimatedImpact: '10-100x faster query execution',
      });
    }

    return issues;
  }

  /**
   * Check for SELECT * pattern
   */
  private hasSelectStar(query: string): boolean {
    return /SELECT\s+\*/.test(query);
  }

  /**
   * Check if query is missing WHERE clause
   */
  private isMissingWhereClause(query: string): boolean {
    const selectMatch = query.match(/SELECT\s+.*?\s+FROM\s+(\w+)/i);
    if (!selectMatch) return false;

    // If query has FROM but no WHERE or GROUP BY or ORDER BY, it's likely a full scan
    const hasWhere = /WHERE\s+/i.test(query);
    const hasGroup = /GROUP\s+BY/i.test(query);
    const hasOrder = /ORDER\s+BY/i.test(query);
    const hasLimit = /LIMIT\s+\d+/i.test(query);

    // Only flag if it's a simple SELECT without filtering
    return !hasWhere && !hasGroup && !hasOrder;
  }

  /**
   * Check for N+1 query patterns
   */
  private hasNPlusOneIndicators(query: string): boolean {
    // Check for patterns that suggest sequential querying
    const hasJoin = /JOIN/i.test(query);
    const hasSubquery = /\(\s*SELECT/i.test(query);
    const hasMultipleSelects = (query.match(/SELECT/gi) || []).length > 1;

    // If multiple SELECTs or subqueries without proper JOINs, might be N+1
    return hasMultipleSelects && !hasJoin && hasSubquery;
  }

  /**
   * Check for inefficient JOINs
   */
  private hasIneffientJoins(query: string): boolean {
    const hasJoin = /JOIN/i.test(query);
    const hasOnNoIndex = /ON\s+.*\s*=\s*[a-z_]+\.[a-z_]+/i.test(query);

    return hasJoin && hasOnNoIndex;
  }

  /**
   * Check for subquery abuse
   */
  private hasSubqueryAbuse(query: string): boolean {
    const subqueries = (query.match(/\(\s*SELECT/gi) || []).length;
    return subqueries > 2; // More than 2 nested levels
  }

  /**
   * Check for unoptimized LIKE patterns
   */
  private hasUnoptimizedLike(query: string): boolean {
    // LIKE with leading wildcard can't use indexes
    return /LIKE\s+['"]%/.test(query);
  }

  /**
   * Check for missing indexes on WHERE clause
   */
  private hasMissingIndexOnWhere(query: string): boolean {
    const whereMatch = query.match(/WHERE\s+([^;]+)/i);
    if (!whereMatch) return false;

    const whereClause = whereMatch[1];

    // Check for equality conditions on non-primary key columns
    const hasEqualityConditions = /\w+\s*=\s*['"]?[^'"]*/i.test(whereClause);
    const notOnPrimaryKey = !/\bid\s*=|PRIMARY\s+KEY/i.test(whereClause);

    return hasEqualityConditions && notOnPrimaryKey;
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculateScore(issues: QueryIssue[]): number {
    let score = 100;

    issues.forEach((issue) => {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  /**
   * Estimate relative query cost (1-1000)
   */
  private estimateCost(query: string): number {
    let cost = 10; // Base cost

    // Penalty for full table scans
    if (/SELECT\s+\*/.test(query)) cost += 50;
    if (!/WHERE/.test(query)) cost += 100;

    // Penalty for JOINs
    const joinCount = (query.match(/JOIN/gi) || []).length;
    cost += joinCount * 30;

    // Penalty for subqueries
    const subqueryCount = (query.match(/\(\s*SELECT/gi) || []).length;
    cost += subqueryCount * 40;

    // Penalty for LIKE patterns
    if (/LIKE\s+['"]%/.test(query)) cost += 50;

    // Reward for indexes (WHERE on indexed columns)
    if (/WHERE.*\b(id|created_at|updated_at|status)\b/.test(query)) cost = Math.max(10, cost - 30);

    return Math.min(1000, cost);
  }

  /**
   * Generate optimization suggestion
   */
  private generateOptimization(query: string, issues: QueryIssue[]): string {
    let optimized = query;

    // Replace SELECT * with common patterns
    if (/SELECT\s+\*/.test(query)) {
      optimized = optimized.replace(/SELECT\s+\*/i, 'SELECT id, created_at, updated_at');
      optimized += ' -- Consider specifying only needed columns';
    }

    // Add index hints for critical issues
    const hasCritical = issues.some((i) => i.severity === 'critical');
    if (hasCritical) {
      optimized += '\n-- Recommended: CREATE INDEX idx_query_optimization ON table(column)';
    }

    // Suggest EXPLAIN ANALYZE
    if (issues.length > 0) {
      optimized = 'EXPLAIN ANALYZE\n' + optimized;
    }

    return optimized;
  }

  /**
   * Create human-readable summary
   */
  private createSummary(issues: QueryIssue[], score: number): string {
    if (issues.length === 0) {
      return `Query looks good! Score: ${score}/100 - No major performance issues detected.`;
    }

    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const highCount = issues.filter((i) => i.severity === 'high').length;

    const criticalText = criticalCount > 0 ? `${criticalCount} critical issue(s)` : '';
    const highText = highCount > 0 ? `${highCount} high priority issue(s)` : '';

    const summary = [criticalText, highText].filter(Boolean).join(', ') || 'Minor issues detected';

    return `Query needs optimization. Score: ${score}/100 - ${summary}. ${issues.length} issue(s) found.`;
  }
}
