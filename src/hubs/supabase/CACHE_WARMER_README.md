# S-16: Cache Warmer for Supabase Archon

## Overview

The Cache Warmer skill pre-loads frequently accessed data into cache to optimize database performance. It identifies hot queries, manages cache refresh schedules, and provides analytics on cache hit rates.

**Location:** `/mnt/c/Users/lucas/openclaw_aurora/skills/supabase-archon/supabase-cache-warmer.ts`

**Version:** 1.0.0

**Priority:** P1 (Performance)

**Category:** UTIL

## Features

### 1. Identify Hot Queries
- Analyzes access logs to find frequently accessed queries
- Ranks queries by access frequency and performance impact
- Estimates cache size requirements
- Generates priority scores for cache allocation

### 2. Pre-Warm Cache on Deploy
- Pre-loads high-priority queries during deployment
- Ensures zero cold-start latency for critical operations
- Supports targeted warming of specific query sets
- Respects maximum cache size constraints

### 3. Schedule Cache Refresh
- Automatic refresh interval scheduling
- Configurable TTL per query
- Next refresh time tracking
- Integration with deployment pipelines

### 4. Cache Hit Rate Analytics
- Tracks hit/miss counts per query
- Calculates overall hit rate percentages
- Monitors response time improvements
- Identifies underperforming cache entries

### 5. Stale Cache Detection
- Detects cache entries exceeding TTL
- Triggers automatic refresh recommendations
- Identifies high-volatility data patterns
- Prevents serving outdated information

## API Reference

### Input Parameters

```typescript
interface CacheWarmerParams extends SkillInput {
  action: 'identify_hot_queries' | 'warm_cache' | 'get_analytics' | 'detect_stale' | 'schedule_refresh';
  supabaseUrl?: string;
  supabaseKey?: string;
  timewindowDays?: number;        // Default: 7
  targetHitRate?: number;         // Default: 80 (0-100)
  maxCacheSize?: number;          // In MB
  refreshIntervalMs?: number;     // Default: 300000 (5 minutes)
  queryIds?: string[];            // Specific queries to target
}
```

### Output Response

```typescript
interface CacheWarmerResult extends SkillOutput {
  data?: {
    hotQueries?: CacheHotQuery[];
    metrics?: CacheMetric[];
    schedules?: CacheRefreshSchedule[];
    preWarmedCount?: number;
    estimatedTotalSize?: number;  // bytes
    staleQueries?: string[];
    summary: string;
    recommendations?: string[];
  };
}
```

## Usage Examples

### Example 1: Identify Hot Queries

```typescript
import { SupabaseCacheWarmer } from './supabase-cache-warmer';

const warmer = new SupabaseCacheWarmer();

const result = await warmer.run({
  action: 'identify_hot_queries',
  timewindowDays: 7,
  maxCacheSize: 50  // 50 MB limit
});

// Result contains:
// - hotQueries: Array of frequently accessed queries
// - estimatedTotalSize: Total cache size needed
// - recommendations: Optimization suggestions
```

### Example 2: Warm Cache on Deploy

```typescript
const result = await warmer.run({
  action: 'warm_cache',
  queryIds: ['Q001', 'Q002', 'Q004']  // Target specific queries
});

// Result contains:
// - preWarmedCount: Number of queries pre-loaded
// - estimatedTotalSize: Total bytes allocated
// - summary: Warming summary
```

### Example 3: Get Cache Analytics

```typescript
const result = await warmer.run({
  action: 'get_analytics'
});

// Result contains:
// - metrics: Array of CacheMetric objects with hit rates
// - summary: Overall cache performance summary
// - recommendations: Performance improvement suggestions
```

### Example 4: Detect Stale Cache

```typescript
const result = await warmer.run({
  action: 'detect_stale'
});

// Result contains:
// - staleQueries: Array of query IDs exceeding TTL
// - metrics: Detailed staleness metrics
// - recommendations: Refresh strategies
```

### Example 5: Schedule Refresh

```typescript
const result = await warmer.run({
  action: 'schedule_refresh',
  queryIds: ['Q001', 'Q002'],
  refreshIntervalMs: 300000  // 5 minutes
});

// Result contains:
// - schedules: Array of CacheRefreshSchedule objects
// - summary: Scheduling confirmation
```

## Type Definitions

### CacheHotQuery

```typescript
interface CacheHotQuery {
  queryId: string;
  sql: string;
  accessCount: number;
  avgExecutionTime: number;
  lastAccessed: string;              // ISO date string
  estimatedSize: number;             // bytes
  priority: number;                  // 1-100
}
```

### CacheMetric

```typescript
interface CacheMetric {
  queryId: string;
  hitCount: number;
  missCount: number;
  hitRate: number;                   // 0-100
  avgResponseTime: number;           // milliseconds
  staleness: number;                 // milliseconds since last refresh
}
```

### CacheRefreshSchedule

```typescript
interface CacheRefreshSchedule {
  queryId: string;
  refreshIntervalMs: number;
  lastRefreshedAt: string;           // ISO date string
  nextRefreshAt: string;             // ISO date string
  isScheduled: boolean;
}
```

## Mock Data

The skill uses mock data for initial development. Production deployment should replace mock data with:

1. **Query Access Logs**: Connect to actual database query logs
2. **Cache Metrics**: Integrate with Redis or memcached metrics
3. **Performance Data**: Real query execution times from database

### Sample Mock Queries

- Q001: User list query (2,847 accesses, 145ms avg)
- Q002: Posts query (1,923 accesses, 87ms avg)
- Q003: Analytics aggregation (1,456 accesses, 234ms avg)
- Q004: Profile data (892 accesses, 56ms avg)
- Q005: Shopping cart (654 accesses, 34ms avg)

## Configuration

### Skill Options

```typescript
{
  timeout: 60000,        // 60 second timeout
  retries: 2,            // Retry failed requests
  requiresApproval: false
}
```

### Recommended Settings

| Setting | Value | Notes |
|---------|-------|-------|
| Default TTL | 5 minutes | Adjust based on data volatility |
| Max Cache Size | 50-100 MB | Depends on infrastructure |
| Target Hit Rate | 80%+ | Monitor and adjust |
| Stale Threshold | 1 hour | Time before marking stale |
| Refresh Interval | 5-15 minutes | Based on data freshness needs |

## Performance Considerations

### Query Identification
- Queries are ranked by access frequency and execution time
- Priority = (accessCount * importance) + (avgExecutionTime * weight)
- Higher priority queries cached first

### Cache Allocation
- Respects maximum cache size constraints
- Prioritizes high-impact queries
- Supports tiered caching strategies

### Memory Management
- Tracks estimated size per query result set
- Prevents cache overflow
- Automatic eviction when limit exceeded

## Integration Points

### Database Connection
```typescript
// Connect to actual Supabase instance
const result = await warmer.run({
  action: 'identify_hot_queries',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY
});
```

### Cache Backend
- Redis: Primary cache layer
- Local Memory: Secondary/backup
- Multi-level caching supported

### Monitoring Integration
- Log cache hit/miss rates
- Alert on declining performance
- Track cache efficiency over time

## Best Practices

### 1. Regular Cache Analysis
- Run analytics weekly to identify trends
- Monitor hit rate changes
- Adjust TTL based on data patterns

### 2. Stale Data Prevention
- Implement cache invalidation hooks
- Set appropriate TTL values
- Monitor staleness metrics

### 3. Cost Optimization
- Identify low-value cached queries
- Remove queries with <20% hit rate
- Reallocate cache space strategically

### 4. Query Optimization
- Combine with Query Doctor skill
- Index hot query columns
- Monitor execution times

### 5. Deployment Strategy
- Pre-warm critical queries on deploy
- Implement gradual cache warming
- Monitor cold-start performance

## Troubleshooting

### Low Cache Hit Rate
1. Increase cache size
2. Lower TTL to keep data fresh
3. Verify query identification accuracy
4. Check cache invalidation logic

### High Staleness
1. Increase refresh frequency
2. Implement event-driven invalidation
3. Reduce TTL for volatile data
4. Monitor data change patterns

### Memory Issues
1. Reduce maximum cache size
2. Remove low-priority queries
3. Implement compression
4. Use distributed caching

### Slow Queries Not Cached
1. Verify query is in hot list
2. Check priority calculation
3. Ensure cache space available
4. Review access patterns

## Testing

### Run Test Suite

```bash
npx ts-node skills/supabase-archon/test-cache-warmer.ts
```

### Test Coverage
- Identify hot queries
- Cache warming
- Analytics retrieval
- Stale detection
- Refresh scheduling
- Error handling

## Metrics to Monitor

### Performance Metrics
- Cache hit rate (target: >80%)
- Average response time (with/without cache)
- Cache size utilization
- Refresh interval compliance

### Business Metrics
- Query latency improvement
- Database load reduction
- User experience impact
- Cost savings

## Future Enhancements

1. **Adaptive TTL**: Automatically adjust TTL based on data patterns
2. **Predictive Warming**: Forecast upcoming high-traffic periods
3. **Multi-Region Support**: Distribute cache across regions
4. **Advanced Analytics**: Machine learning based optimization
5. **Cost Analysis**: Calculate ROI of caching decisions
6. **Integration with Query Doctor**: Auto-remediate slow queries
7. **Distributed Tracing**: Track cache hits across services

## Contributing

To extend the Cache Warmer skill:

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit pull request

## Support

For issues or feature requests:
- Open GitHub issue
- Contact: Supabase Archon team
- Documentation: See `CACHE_WARMER_README.md`

## License

Part of OpenClaw Aurora - Supabase Archon ecosystem
