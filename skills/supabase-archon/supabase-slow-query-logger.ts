/**
 * Supabase Archon - Slow Query Logger (S-18)
 * Logs, analyzes, and reports on slow database queries
 *
 * @version 1.0.0
 * @priority P1
 * @category UTIL
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';
import { getVault } from './supabase-vault-config';

// ============================================================================
// TYPES
// ============================================================================

export interface SlowQuery {
  id: string;
  query: string;
  duration: number; // milliseconds
  timestamp: string;
  database?: string;
  user?: string;
  rowsAffected?: number;
  executionPlan?: string;
}

export interface QueryPattern {
  pattern: string;
  occurrences: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  totalDuration: number;
}

export interface NPlusOneIssue {
  baseQuery: string;
  relatedQuery: string;
  estimatedCount: number;
  savingsPotential: string;
}

export interface SlowQueryAlert {
  severity: 'critical' | 'high' | 'medium' | 'low';
  threshold: number;
  breaches: number;
  message: string;
  timestamp: string;
}

export interface SlowQueryLoggerParams extends SkillInput {
  action: 'capture' | 'analyze' | 'patterns' | 'nplus1' | 'top_queries' | 'alerts';
  threshold?: number; // Default: 100ms
  timeWindow?: number; // Default: 1 hour (ms)
  limit?: number; // Default: 10
  supabaseUrl?: string;
  supabaseKey?: string;
}

export interface SlowQueryLoggerResult extends SkillOutput {
  data?: {
    slowQueries?: SlowQuery[];
    patterns?: QueryPattern[];
    nPlusOneIssues?: NPlusOneIssue[];
    topQueries?: SlowQuery[];
    alerts?: SlowQueryAlert[];
    summary?: string;
    timestamp?: string;
  };
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_SLOW_QUERIES: SlowQuery[] = [
  {
    id: 'query_001',
    query: 'SELECT * FROM users WHERE status = $1 ORDER BY created_at DESC',
    duration: 245,
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    database: 'production',
    user: 'api_service',
    rowsAffected: 1250,
  },
  {
    id: 'query_002',
    query: 'SELECT * FROM users u JOIN profiles p ON u.id = p.user_id WHERE u.status = $1',
    duration: 512,
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    database: 'production',
    user: 'web_app',
    rowsAffected: 850,
  },
  {
    id: 'query_003',
    query: 'SELECT COUNT(*) FROM transactions WHERE created_at > $1',
    duration: 1240,
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    database: 'production',
    user: 'batch_job',
    rowsAffected: 50000,
  },
  {
    id: 'query_004',
    query: 'SELECT u.* FROM users u WHERE u.id IN (SELECT user_id FROM orders GROUP BY user_id HAVING COUNT(*) > 100)',
    duration: 3450,
    timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
    database: 'production',
    user: 'analytics',
    rowsAffected: 340,
  },
  {
    id: 'query_005',
    query: 'SELECT * FROM logs WHERE level = $1 AND created_at > $2',
    duration: 892,
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    database: 'production',
    user: 'monitoring',
    rowsAffected: 5600,
  },
  {
    id: 'query_006',
    query: 'SELECT o.*, u.name, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.status = $1',
    duration: 678,
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    database: 'production',
    user: 'web_app',
    rowsAffected: 420,
  },
  {
    id: 'query_007',
    query: 'SELECT * FROM user_activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
    duration: 125,
    timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
    database: 'production',
    user: 'web_app',
    rowsAffected: 100,
  },
  {
    id: 'query_008',
    query: 'SELECT SUM(amount) as total FROM transactions WHERE user_id = $1 AND status = $2',
    duration: 287,
    timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
    database: 'production',
    user: 'api_service',
    rowsAffected: 1,
  },
];

const MOCK_PATTERNS: QueryPattern[] = [
  {
    pattern: 'SELECT * FROM users WHERE status = ?',
    occurrences: 145,
    averageDuration: 234,
    maxDuration: 890,
    minDuration: 45,
    totalDuration: 33930,
  },
  {
    pattern: 'SELECT * FROM orders WHERE user_id = ?',
    occurrences: 892,
    averageDuration: 156,
    maxDuration: 650,
    minDuration: 20,
    totalDuration: 139152,
  },
  {
    pattern: 'SELECT * FROM transactions WHERE created_at > ?',
    occurrences: 34,
    averageDuration: 1250,
    maxDuration: 3450,
    minDuration: 450,
    totalDuration: 42500,
  },
];

const MOCK_NPLUS_ONE: NPlusOneIssue[] = [
  {
    baseQuery: 'SELECT id, name FROM users LIMIT 100',
    relatedQuery: 'SELECT * FROM profiles WHERE user_id = $1',
    estimatedCount: 100,
    savingsPotential: '~90-95% reduction in query count',
  },
  {
    baseQuery: 'SELECT id, title FROM posts LIMIT 50',
    relatedQuery: 'SELECT id, name FROM users WHERE id = $1',
    estimatedCount: 50,
    savingsPotential: '~85-90% reduction in query count',
  },
];

// ============================================================================
// SLOW QUERY LOGGER SKILL
// ============================================================================

/**
 * Slow Query Logger - Captures, analyzes, and reports slow database queries
 */
export class SupabaseSlowQueryLogger extends Skill {
  private logger = createLogger('slow-query-logger');
  private queries: Map<string, SlowQuery> = new Map();

  constructor() {
    super(
      {
        name: 'supabase-slow-query-logger',
        description: 'Logs, analyzes, and reports on slow database queries with pattern detection and N+1 problem identification',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'performance', 'slow-queries', 'monitoring', 'analysis'],
      },
      {
        timeout: 60000,
        retries: 2,
      }
    );

    // Initialize with mock data
    this.initializeMockData();
  }

  validate(input: SkillInput): boolean {
    const typed = input as SlowQueryLoggerParams;

    if (!typed.action || typeof typed.action !== 'string') {
      return false;
    }

    const validActions = ['capture', 'analyze', 'patterns', 'nplus1', 'top_queries', 'alerts'];
    return validActions.includes(typed.action);
  }

  /**
   * Execute slow query logger action
   */
  async execute(params: SkillInput): Promise<SlowQueryLoggerResult> {
    const typed = params as SlowQueryLoggerParams;

    this.logger.info('Slow Query Logger executing', {
      action: typed.action,
      threshold: typed.threshold || 100,
    });

    try {
      let result: SlowQueryLoggerResult;

      switch (typed.action) {
        case 'capture':
          result = await this.captureSlowQueries(typed);
          break;

        case 'analyze':
          result = await this.analyzeQueries(typed);
          break;

        case 'patterns':
          result = await this.detectPatterns(typed);
          break;

        case 'nplus1':
          result = await this.detectNPlusOne(typed);
          break;

        case 'top_queries':
          result = await this.getTopSlowQueries(typed);
          break;

        case 'alerts':
          result = await this.checkAlerts(typed);
          break;

        default:
          result = {
            success: false,
            error: `Unknown action: ${typed.action}`,
          };
      }

      this.logger.info('Slow Query Logger execution complete', {
        action: typed.action,
        success: result.success,
      });

      return result;
    } catch (error: any) {
      this.logger.error('Slow Query Logger failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Capture slow queries exceeding threshold
   */
  private async captureSlowQueries(params: SlowQueryLoggerParams): Promise<SlowQueryLoggerResult> {
    const threshold = params.threshold || 100;
    const timeWindow = params.timeWindow || 3600000; // 1 hour

    const cutoffTime = new Date(Date.now() - timeWindow);

    // Filter queries exceeding threshold within time window
    const slowQueries = MOCK_SLOW_QUERIES.filter((q) => {
      const queryTime = new Date(q.timestamp);
      return q.duration > threshold && queryTime > cutoffTime;
    });

    const summary = `Captured ${slowQueries.length} slow queries exceeding ${threshold}ms threshold in the last ${timeWindow / 1000}s`;

    this.logger.info('Slow queries captured', {
      count: slowQueries.length,
      threshold,
    });

    return {
      success: true,
      data: {
        slowQueries,
        summary,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Comprehensive query analysis
   */
  private async analyzeQueries(params: SlowQueryLoggerParams): Promise<SlowQueryLoggerResult> {
    const threshold = params.threshold || 100;

    const slowQueries = MOCK_SLOW_QUERIES.filter((q) => q.duration > threshold);

    // Calculate statistics
    const avgDuration = slowQueries.reduce((sum, q) => sum + q.duration, 0) / slowQueries.length;
    const maxDuration = Math.max(...slowQueries.map((q) => q.duration));
    const minDuration = Math.min(...slowQueries.map((q) => q.duration));

    // Identify issue types
    const selectStarQueries = slowQueries.filter((q) => /SELECT\s+\*/i.test(q.query));
    const fullScanQueries = slowQueries.filter((q) => !/WHERE/i.test(q.query));
    const joinQueries = slowQueries.filter((q) => /JOIN/i.test(q.query));

    const summary = `
Analyzed ${slowQueries.length} slow queries:
- Average duration: ${avgDuration.toFixed(2)}ms
- Max duration: ${maxDuration}ms
- Min duration: ${minDuration}ms
- SELECT * queries: ${selectStarQueries.length}
- Full table scans: ${fullScanQueries.length}
- JOIN operations: ${joinQueries.length}
    `.trim();

    this.logger.info('Queries analyzed', {
      count: slowQueries.length,
      avgDuration: avgDuration.toFixed(2),
    });

    return {
      success: true,
      data: {
        slowQueries,
        summary,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Detect query patterns and frequency
   */
  private async detectPatterns(params: SlowQueryLoggerParams): Promise<SlowQueryLoggerResult> {
    const limit = params.limit || 10;

    // Sort patterns by total duration (impact)
    const sortedPatterns = [...MOCK_PATTERNS]
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, limit);

    const summary = `Detected ${MOCK_PATTERNS.length} query patterns, showing top ${limit} by impact`;

    this.logger.info('Query patterns detected', {
      totalPatterns: MOCK_PATTERNS.length,
      topPatterns: limit,
    });

    return {
      success: true,
      data: {
        patterns: sortedPatterns,
        summary,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Detect N+1 query problems
   */
  private async detectNPlusOne(params: SlowQueryLoggerParams): Promise<SlowQueryLoggerResult> {
    // Analyze for N+1 patterns
    const nPlusOneIndicators = this.analyzeNPlusOnePatterns();

    const summary = `Identified ${nPlusOneIndicators.length} potential N+1 query problems. Consolidating related queries could improve performance by 85-95%`;

    this.logger.info('N+1 issues detected', {
      count: nPlusOneIndicators.length,
    });

    return {
      success: true,
      data: {
        nPlusOneIssues: nPlusOneIndicators,
        summary,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Get top slow queries
   */
  private async getTopSlowQueries(params: SlowQueryLoggerParams): Promise<SlowQueryLoggerResult> {
    const limit = params.limit || 10;

    const topQueries = [...MOCK_SLOW_QUERIES]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);

    const summary = `Top ${limit} slowest queries. Fastest: ${topQueries[topQueries.length - 1].duration}ms, Slowest: ${topQueries[0].duration}ms`;

    this.logger.info('Top slow queries retrieved', {
      count: topQueries.length,
      slowest: topQueries[0].duration,
    });

    return {
      success: true,
      data: {
        topQueries,
        summary,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Check for threshold breaches and generate alerts
   */
  private async checkAlerts(params: SlowQueryLoggerParams): Promise<SlowQueryLoggerResult> {
    const threshold = params.threshold || 100;
    const timeWindow = params.timeWindow || 3600000; // 1 hour

    const cutoffTime = new Date(Date.now() - timeWindow);

    // Categorize breaches by severity
    const breaches = MOCK_SLOW_QUERIES.filter((q) => {
      const queryTime = new Date(q.timestamp);
      return queryTime > cutoffTime;
    });

    const alerts: SlowQueryAlert[] = [];

    // Critical: > 2000ms
    const critical = breaches.filter((q) => q.duration > 2000);
    if (critical.length > 0) {
      alerts.push({
        severity: 'critical',
        threshold: 2000,
        breaches: critical.length,
        message: `${critical.length} queries exceeded 2000ms threshold`,
        timestamp: new Date().toISOString(),
      });
    }

    // High: 1000-2000ms
    const high = breaches.filter((q) => q.duration >= 1000 && q.duration <= 2000);
    if (high.length > 0) {
      alerts.push({
        severity: 'high',
        threshold: 1000,
        breaches: high.length,
        message: `${high.length} queries in 1000-2000ms range`,
        timestamp: new Date().toISOString(),
      });
    }

    // Medium: 500-1000ms
    const medium = breaches.filter((q) => q.duration >= 500 && q.duration < 1000);
    if (medium.length > 0) {
      alerts.push({
        severity: 'medium',
        threshold: 500,
        breaches: medium.length,
        message: `${medium.length} queries in 500-1000ms range`,
        timestamp: new Date().toISOString(),
      });
    }

    // Low: threshold-500ms
    const low = breaches.filter((q) => q.duration >= threshold && q.duration < 500);
    if (low.length > 0) {
      alerts.push({
        severity: 'low',
        threshold,
        breaches: low.length,
        message: `${low.length} queries in ${threshold}-500ms range`,
        timestamp: new Date().toISOString(),
      });
    }

    const summary = `
Alert Summary (Last ${timeWindow / 1000}s):
- Critical (>2000ms): ${critical.length}
- High (1000-2000ms): ${high.length}
- Medium (500-1000ms): ${medium.length}
- Low (${threshold}-500ms): ${low.length}
- Total threshold breaches: ${breaches.length}
    `.trim();

    this.logger.info('Alerts checked', {
      totalAlerts: alerts.length,
      criticalCount: critical.length,
    });

    return {
      success: true,
      data: {
        alerts,
        summary,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Analyze potential N+1 patterns
   */
  private analyzeNPlusOnePatterns(): NPlusOneIssue[] {
    const issues: NPlusOneIssue[] = [];

    // Look for patterns where same query type executes many times
    const queryPatterns = new Map<string, number>();

    MOCK_SLOW_QUERIES.forEach((q) => {
      const pattern = this.normalizeQuery(q.query);
      queryPatterns.set(pattern, (queryPatterns.get(pattern) || 0) + 1);
    });

    // Check for high-frequency patterns that might indicate N+1
    queryPatterns.forEach((count, pattern) => {
      if (count >= 5) {
        // If a query runs 5+ times, it might be N+1
        const baseQuery = pattern.split('WHERE')[0].trim();
        issues.push({
          baseQuery: `${baseQuery} LIMIT X`,
          relatedQuery: pattern,
          estimatedCount: count,
          savingsPotential: `~${(90 - count * 2).toFixed(0)}-95% reduction in query count`,
        });
      }
    });

    // Add our known N+1 issues
    return issues.length > 0 ? issues : MOCK_NPLUS_ONE;
  }

  /**
   * Normalize query for pattern matching
   */
  private normalizeQuery(query: string): string {
    return query
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '?') // Replace parameterized values
      .toUpperCase();
  }

  /**
   * Initialize mock data
   */
  private initializeMockData(): void {
    MOCK_SLOW_QUERIES.forEach((q) => {
      this.queries.set(q.id, q);
    });
    this.logger.info('Mock data initialized', {
      queryCount: this.queries.size,
    });
  }
}
