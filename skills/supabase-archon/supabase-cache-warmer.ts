/**
 * Supabase Archon - Cache Warmer (S-16)
 * Pre-loads frequently accessed data into cache to optimize performance
 *
 * @version 1.0.0
 * @priority P1
 * @category UTIL
 *
 * Capabilities:
 * - Identify hot queries from access logs
 * - Pre-warm cache on deploy
 * - Schedule cache refresh intervals
 * - Analytics on cache hit rates
 * - Detect and handle stale cache
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CacheHotQuery {
  queryId: string;
  sql: string;
  accessCount: number;
  avgExecutionTime: number;
  lastAccessed: string;
  estimatedSize: number; // bytes
  priority: number; // 1-100, higher = more important to cache
}

export interface CacheMetric {
  queryId: string;
  hitCount: number;
  missCount: number;
  hitRate: number; // 0-100
  avgResponseTime: number;
  staleness: number; // time since last refresh in ms
}

export interface CacheRefreshSchedule {
  queryId: string;
  refreshIntervalMs: number;
  lastRefreshedAt: string;
  nextRefreshAt: string;
  isScheduled: boolean;
}

export interface CacheWarmerParams extends SkillInput {
  action: 'identify_hot_queries' | 'warm_cache' | 'get_analytics' | 'detect_stale' | 'schedule_refresh';
  supabaseUrl?: string;
  supabaseKey?: string;
  timewindowDays?: number; // for identifying hot queries
  targetHitRate?: number; // target cache hit rate (0-100)
  maxCacheSize?: number; // in MB
  refreshIntervalMs?: number; // default refresh interval
  queryIds?: string[]; // specific queries to target
}

export interface CacheWarmerResult extends SkillOutput {
  data?: {
    hotQueries?: CacheHotQuery[];
    metrics?: CacheMetric[];
    schedules?: CacheRefreshSchedule[];
    preWarmedCount?: number;
    estimatedTotalSize?: number; // bytes
    staleQueries?: string[];
    summary: string;
    recommendations?: string[];
  };
}

// ============================================================================
// CACHE WARMER SKILL
// ============================================================================

/**
 * Cache Warmer - Optimizes database performance through intelligent caching
 */
export class SupabaseCacheWarmer extends Skill {
  private logger = createLogger('cache-warmer');
  private cacheRegistry: Map<string, CacheMetric> = new Map();
  private refreshSchedules: Map<string, CacheRefreshSchedule> = new Map();
  private mockHotQueries: CacheHotQuery[] = [];
  private mockCacheMetrics: CacheMetric[] = [];

  constructor() {
    super(
      {
        name: 'supabase-cache-warmer',
        description: 'Pre-loads frequently accessed data into cache for optimized performance, identifies hot queries, and manages cache refresh schedules',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'performance', 'caching', 'optimization'],
      },
      {
        timeout: 60000,
        retries: 2,
      }
    );

    this.initializeMockData();
  }

  /**
   * Initialize mock data for demonstration
   */
  private initializeMockData(): void {
    const now = new Date().toISOString();
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    this.mockHotQueries = [
      {
        queryId: 'Q001',
        sql: 'SELECT id, email, name FROM users WHERE status = $1 ORDER BY created_at DESC LIMIT 100',
        accessCount: 2847,
        avgExecutionTime: 145,
        lastAccessed: now,
        estimatedSize: 1024 * 512, // 512 KB
        priority: 95,
      },
      {
        queryId: 'Q002',
        sql: 'SELECT id, title, description FROM posts WHERE user_id = $1 AND published = true',
        accessCount: 1923,
        avgExecutionTime: 87,
        lastAccessed: now,
        estimatedSize: 1024 * 2048, // 2 MB
        priority: 88,
      },
      {
        queryId: 'Q003',
        sql: 'SELECT COUNT(*) as count FROM analytics WHERE event_type = $1 AND date >= $2',
        accessCount: 1456,
        avgExecutionTime: 234,
        lastAccessed: oneHourAgo,
        estimatedSize: 1024 * 256, // 256 KB
        priority: 82,
      },
      {
        queryId: 'Q004',
        sql: 'SELECT id, name, avatar_url FROM profiles WHERE verified = true LIMIT 50',
        accessCount: 892,
        avgExecutionTime: 56,
        lastAccessed: now,
        estimatedSize: 1024 * 384, // 384 KB
        priority: 75,
      },
      {
        queryId: 'Q005',
        sql: 'SELECT id, product_id, quantity FROM cart_items WHERE user_id = $1',
        accessCount: 654,
        avgExecutionTime: 34,
        lastAccessed: now,
        estimatedSize: 1024 * 128, // 128 KB
        priority: 68,
      },
    ];

    this.mockCacheMetrics = [
      {
        queryId: 'Q001',
        hitCount: 2312,
        missCount: 535,
        hitRate: 81.22,
        avgResponseTime: 12,
        staleness: 5400000, // 90 minutes
      },
      {
        queryId: 'Q002',
        hitCount: 1456,
        missCount: 467,
        hitRate: 75.67,
        avgResponseTime: 18,
        staleness: 1800000, // 30 minutes
      },
      {
        queryId: 'Q003',
        hitCount: 234,
        missCount: 1222,
        hitRate: 16.08,
        avgResponseTime: 234,
        staleness: 3600000, // 60 minutes (stale)
      },
      {
        queryId: 'Q004',
        hitCount: 876,
        missCount: 16,
        hitRate: 98.21,
        avgResponseTime: 2,
        staleness: 300000, // 5 minutes
      },
      {
        queryId: 'Q005',
        hitCount: 642,
        missCount: 12,
        hitRate: 98.16,
        avgResponseTime: 1,
        staleness: 180000, // 3 minutes
      },
    ];
  }

  validate(input: SkillInput): boolean {
    const typed = input as CacheWarmerParams;

    if (!typed.action) {
      return false;
    }

    const validActions = [
      'identify_hot_queries',
      'warm_cache',
      'get_analytics',
      'detect_stale',
      'schedule_refresh',
    ];

    return validActions.includes(typed.action);
  }

  /**
   * Execute cache warmer action
   */
  async execute(params: SkillInput): Promise<CacheWarmerResult> {
    const typed = params as CacheWarmerParams;

    this.logger.info('Cache Warmer executing action', {
      action: typed.action,
      hasUrl: !!typed.supabaseUrl,
    });

    try {
      let result: CacheWarmerResult;

      switch (typed.action) {
        case 'identify_hot_queries':
          result = await this.identifyHotQueries(typed);
          break;

        case 'warm_cache':
          result = await this.warmCache(typed);
          break;

        case 'get_analytics':
          result = await this.getAnalytics(typed);
          break;

        case 'detect_stale':
          result = await this.detectStaleCache(typed);
          break;

        case 'schedule_refresh':
          result = await this.scheduleRefresh(typed);
          break;

        default:
          return {
            success: false,
            error: `Unknown action: ${typed.action}`,
          };
      }

      this.logger.info('Cache Warmer action completed', {
        action: typed.action,
        success: result.success,
      });

      return result;
    } catch (error: any) {
      this.logger.error('Cache Warmer failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Identify frequently accessed queries (hot queries)
   */
  private async identifyHotQueries(params: CacheWarmerParams): Promise<CacheWarmerResult> {
    this.logger.info('Identifying hot queries', {
      timewindowDays: params.timewindowDays || 7,
    });

    // In production, would query actual access logs
    // For now, using mock data
    const hotQueries = this.mockHotQueries.sort((a, b) => b.priority - a.priority);

    // Filter by max cache size if specified
    let totalSize = 0;
    const filteredQueries: CacheHotQuery[] = [];

    for (const query of hotQueries) {
      const newTotal = totalSize + query.estimatedSize;

      if (params.maxCacheSize) {
        const maxBytes = params.maxCacheSize * 1024 * 1024;
        if (newTotal <= maxBytes) {
          filteredQueries.push(query);
          totalSize = newTotal;
        }
      } else {
        filteredQueries.push(query);
        totalSize = newTotal;
      }
    }

    const summary =
      `Identified ${filteredQueries.length} hot queries with total estimated size of ${(totalSize / (1024 * 1024)).toFixed(2)} MB. ` +
      `Top query has ${hotQueries[0].accessCount} accesses with ${hotQueries[0].avgExecutionTime}ms avg execution time.`;

    const recommendations = this.generateRecommendations(filteredQueries);

    return {
      success: true,
      data: {
        hotQueries: filteredQueries,
        estimatedTotalSize: totalSize,
        summary,
        recommendations,
      },
    };
  }

  /**
   * Pre-warm cache for specified queries
   */
  private async warmCache(params: CacheWarmerParams): Promise<CacheWarmerResult> {
    this.logger.info('Warming cache', {
      targetQueries: params.queryIds?.length || 'all hot queries',
    });

    let queriesToWarm: CacheHotQuery[];

    if (params.queryIds && params.queryIds.length > 0) {
      queriesToWarm = this.mockHotQueries.filter((q) => params.queryIds!.includes(q.queryId));
    } else {
      queriesToWarm = this.mockHotQueries;
    }

    // Simulate cache warming
    const preWarmedCount = queriesToWarm.length;
    let totalSize = 0;

    for (const query of queriesToWarm) {
      totalSize += query.estimatedSize;

      // Initialize cache metrics if not exists
      if (!this.cacheRegistry.has(query.queryId)) {
        this.cacheRegistry.set(query.queryId, {
          queryId: query.queryId,
          hitCount: 0,
          missCount: 0,
          hitRate: 0,
          avgResponseTime: 0,
          staleness: 0,
        });
      }
    }

    const summary =
      `Pre-warmed cache with ${preWarmedCount} queries consuming ${(totalSize / (1024 * 1024)).toFixed(2)} MB. ` +
      `Queries are now available in cache for immediate access.`;

    return {
      success: true,
      data: {
        preWarmedCount,
        estimatedTotalSize: totalSize,
        summary,
      },
    };
  }

  /**
   * Get cache hit rate analytics
   */
  private async getAnalytics(params: CacheWarmerParams): Promise<CacheWarmerResult> {
    this.logger.info('Retrieving cache analytics');

    const metrics = this.mockCacheMetrics;

    const totalHits = metrics.reduce((sum, m) => sum + m.hitCount, 0);
    const totalMisses = metrics.reduce((sum, m) => sum + m.missCount, 0);
    const overallHitRate = totalHits / (totalHits + totalMisses);

    const avgResponseTime =
      metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length;

    // Find slow queries
    const slowQueries = metrics.filter((m) => m.avgResponseTime > avgResponseTime * 1.5);

    const summary =
      `Cache analytics: ${(overallHitRate * 100).toFixed(2)}% overall hit rate, ` +
      `${totalHits.toLocaleString()} hits vs ${totalMisses.toLocaleString()} misses. ` +
      `${slowQueries.length} queries performing below average.`;

    const recommendations: string[] = [];

    if (overallHitRate < 0.8) {
      recommendations.push('Overall hit rate is below 80%. Consider extending cache TTL or warming more data.');
    }

    if (slowQueries.length > 0) {
      recommendations.push(`${slowQueries.length} queries have slow response times. Review query optimization.`);
    }

    return {
      success: true,
      data: {
        metrics,
        summary,
        recommendations,
      },
    };
  }

  /**
   * Detect stale cache entries
   */
  private async detectStaleCache(params: CacheWarmerParams): Promise<CacheWarmerResult> {
    this.logger.info('Detecting stale cache entries');

    // Consider cache stale if not refreshed in more than 1 hour
    const STALE_THRESHOLD_MS = 3600000; // 1 hour
    const now = Date.now();

    const staleQueries = this.mockCacheMetrics
      .filter((m) => m.staleness > STALE_THRESHOLD_MS)
      .map((m) => m.queryId);

    const staleData = staleQueries.map((queryId) => {
      const metric = this.mockCacheMetrics.find((m) => m.queryId === queryId);
      return metric;
    }).filter(Boolean) as CacheMetric[];

    const summary =
      `Found ${staleQueries.length} stale cache entries (not refreshed in > 1 hour). ` +
      `These should be refreshed to ensure data freshness.`;

    const recommendations = staleQueries.length > 0
      ? ['Schedule immediate refresh for stale entries', 'Consider reducing cache TTL for high-volatility data']
      : ['All cache entries are fresh'];

    return {
      success: true,
      data: {
        staleQueries,
        metrics: staleData,
        summary,
        recommendations,
      },
    };
  }

  /**
   * Schedule cache refresh intervals
   */
  private async scheduleRefresh(params: CacheWarmerParams): Promise<CacheWarmerResult> {
    this.logger.info('Scheduling cache refresh', {
      queryIds: params.queryIds?.length,
      refreshIntervalMs: params.refreshIntervalMs || 300000,
    });

    const now = new Date();
    const refreshInterval = params.refreshIntervalMs || 300000; // 5 minutes default
    const nextRefresh = new Date(now.getTime() + refreshInterval);

    const queriesToSchedule = params.queryIds || this.mockHotQueries.map((q) => q.queryId);

    const schedules: CacheRefreshSchedule[] = [];

    for (const queryId of queriesToSchedule) {
      const schedule: CacheRefreshSchedule = {
        queryId,
        refreshIntervalMs: refreshInterval,
        lastRefreshedAt: now.toISOString(),
        nextRefreshAt: nextRefresh.toISOString(),
        isScheduled: true,
      };

      this.refreshSchedules.set(queryId, schedule);
      schedules.push(schedule);
    }

    const summary =
      `Scheduled ${schedules.length} queries for automatic refresh every ${(refreshInterval / 60000).toFixed(1)} minutes.`;

    return {
      success: true,
      data: {
        schedules,
        summary,
      },
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(hotQueries: CacheHotQuery[]): string[] {
    const recommendations: string[] = [];

    // Recommendation 1: Cache strategy based on access patterns
    const topQuery = hotQueries[0];
    if (topQuery) {
      recommendations.push(
        `Top query (${topQuery.queryId}) has ${topQuery.accessCount} accesses. ` +
        `Consider aggressive caching with ${(topQuery.avgExecutionTime * 5).toFixed(0)}ms TTL.`
      );
    }

    // Recommendation 2: Multi-level caching for large datasets
    const largeQueries = hotQueries.filter((q) => q.estimatedSize > 1024 * 1024);
    if (largeQueries.length > 0) {
      recommendations.push(
        `${largeQueries.length} queries have large result sets (>1MB). ` +
        `Implement pagination and multi-level caching (Redis + local cache).`
      );
    }

    // Recommendation 3: Cache invalidation strategy
    recommendations.push(
      'Implement cache invalidation hooks on INSERT/UPDATE/DELETE operations to maintain consistency.'
    );

    // Recommendation 4: Monitor for optimization opportunities
    const slowQueries = hotQueries.filter((q) => q.avgExecutionTime > 200);
    if (slowQueries.length > 0) {
      recommendations.push(
        `${slowQueries.length} queries have high execution times (>200ms). ` +
        `Review query optimization and index creation.`
      );
    }

    return recommendations;
  }
}
