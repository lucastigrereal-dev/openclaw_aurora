# S-16 Cache Warmer - Quick Start Guide

## Installation & Setup

### 1. Import the Skill

```typescript
import { SupabaseCacheWarmer } from './supabase-archon/supabase-cache-warmer';
```

### 2. Create Instance

```typescript
const warmer = new SupabaseCacheWarmer();
```

### 3. Use in Your Application

```typescript
// Call any of the 5 main actions
const result = await warmer.run({
  action: 'identify_hot_queries',
  // ... parameters
});
```

## 5 Core Actions

### Action 1: Identify Hot Queries
Finds the most frequently accessed queries that should be cached.

```typescript
const result = await warmer.run({
  action: 'identify_hot_queries',
  timewindowDays: 7,
  maxCacheSize: 50  // MB
});

// Response includes:
// - hotQueries: List of frequently accessed queries
// - estimatedTotalSize: Total cache needed
// - recommendations: Optimization tips
```

**Best For:** Initial cache strategy planning

---

### Action 2: Warm Cache
Pre-loads selected queries into cache (ideal for deployments).

```typescript
const result = await warmer.run({
  action: 'warm_cache',
  queryIds: ['Q001', 'Q002']  // Optional - target specific queries
});

// Response includes:
// - preWarmedCount: Number of queries cached
// - estimatedTotalSize: Memory allocated
```

**Best For:** Deployment scripts, zero cold-start

---

### Action 3: Get Analytics
Shows cache performance and hit rates.

```typescript
const result = await warmer.run({
  action: 'get_analytics'
});

// Response includes:
// - metrics: Hit/miss counts per query
// - summary: Overall performance
// - recommendations: Improvements needed
```

**Best For:** Performance monitoring, dashboards

---

### Action 4: Detect Stale Cache
Identifies cache entries that need refreshing.

```typescript
const result = await warmer.run({
  action: 'detect_stale'
});

// Response includes:
// - staleQueries: IDs of stale cache entries
// - staleness: Time since last refresh
// - recommendations: Refresh strategies
```

**Best For:** Cache maintenance, data freshness

---

### Action 5: Schedule Refresh
Sets up automatic cache refresh intervals.

```typescript
const result = await warmer.run({
  action: 'schedule_refresh',
  queryIds: ['Q001', 'Q002'],
  refreshIntervalMs: 300000  // 5 minutes
});

// Response includes:
// - schedules: Refresh schedule info
// - nextRefreshAt: When refresh will happen
```

**Best For:** Automated cache management

---

## Common Use Cases

### Use Case 1: Find Top Queries to Cache

```typescript
const result = await warmer.run({
  action: 'identify_hot_queries',
  maxCacheSize: 100
});

result.data.hotQueries.forEach(q => {
  console.log(`Query ${q.queryId}: ${q.accessCount} accesses`);
});
```

### Use Case 2: Deploy with Pre-Warmed Cache

```typescript
// In deployment script
const warmResult = await warmer.run({
  action: 'warm_cache'
});

if (warmResult.success) {
  console.log(`Warmed ${warmResult.data.preWarmedCount} queries`);
  // Continue with deployment
}
```

### Use Case 3: Monitor Cache Health

```typescript
// In monitoring job (e.g., every 5 minutes)
const analytics = await warmer.run({
  action: 'get_analytics'
});

if (analytics.data.metrics.some(m => m.hitRate < 70)) {
  console.warn('Low cache hit rate detected!');
  console.log(analytics.data.recommendations);
}
```

### Use Case 4: Fix Stale Data

```typescript
// Daily maintenance job
const staleResult = await warmer.run({
  action: 'detect_stale'
});

if (staleResult.data.staleQueries.length > 0) {
  await warmer.run({
    action: 'schedule_refresh',
    queryIds: staleResult.data.staleQueries,
    refreshIntervalMs: 600000  // 10 minutes for stale data
  });
}
```

### Use Case 5: Auto-Schedule Critical Queries

```typescript
// After identifying hot queries
const identified = await warmer.run({
  action: 'identify_hot_queries'
});

const criticalQueries = identified.data.hotQueries
  .filter(q => q.priority > 80)
  .map(q => q.queryId);

await warmer.run({
  action: 'schedule_refresh',
  queryIds: criticalQueries,
  refreshIntervalMs: 300000  // 5 minutes
});
```

## Response Structure

### Success Response

```typescript
{
  success: true,
  data: {
    // Action-specific data
    summary: "Description of what happened",
    recommendations: ["Suggestion 1", "Suggestion 2"]
  },
  duration: 123  // milliseconds
}
```

### Error Response

```typescript
{
  success: false,
  error: "Error message explaining what went wrong",
  duration: 45
}
```

## Configuration Parameters

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| `action` | string | required | One of the 5 actions |
| `timewindowDays` | number | 7 | How far back to look for hot queries |
| `maxCacheSize` | number | unlimited | Maximum cache size in MB |
| `targetHitRate` | number | 80 | Target cache hit rate % |
| `refreshIntervalMs` | number | 300000 | Default refresh interval (5 min) |
| `queryIds` | string[] | [] | Specific query IDs to target |

## Key Metrics

### Cache Hit Rate
- **Good:** >80%
- **Acceptable:** 60-80%
- **Poor:** <60%

### Response Time
- **Cached:** 1-10ms
- **Database:** 50-500ms
- **Improvement:** 10-50x faster

### Recommended TTL (Time To Live)

| Data Type | TTL |
|-----------|-----|
| User profiles | 30 minutes |
| Product catalog | 1 hour |
| Analytics | 5 minutes |
| Real-time data | 1-2 minutes |
| Static data | 24 hours |

## Troubleshooting

### Problem: Low Cache Hit Rate

```typescript
// Step 1: Check what's cached
const analytics = await warmer.run({
  action: 'get_analytics'
});

// Step 2: Identify hot queries
const hot = await warmer.run({
  action: 'identify_hot_queries',
  maxCacheSize: 200  // Increase size
});

// Step 3: Re-warm cache
await warmer.run({
  action: 'warm_cache'
});
```

### Problem: Stale Data Being Served

```typescript
// Find stale entries
const stale = await warmer.run({
  action: 'detect_stale'
});

// Force refresh
await warmer.run({
  action: 'schedule_refresh',
  queryIds: stale.data.staleQueries,
  refreshIntervalMs: 60000  // Refresh every minute
});
```

### Problem: Too Much Memory Used

```typescript
// Reduce cache size
const hot = await warmer.run({
  action: 'identify_hot_queries',
  maxCacheSize: 25  // Reduce from 50 to 25 MB
});

// Re-warm with smaller set
await warmer.run({
  action: 'warm_cache',
  queryIds: hot.data.hotQueries
    .slice(0, 5)  // Only top 5
    .map(q => q.queryId)
});
```

## Integration Examples

### Express.js Middleware

```typescript
const warmer = new SupabaseCacheWarmer();

app.get('/api/cache/health', async (req, res) => {
  const result = await warmer.run({
    action: 'get_analytics'
  });
  res.json(result);
});

app.post('/api/cache/warm', async (req, res) => {
  const result = await warmer.run({
    action: 'warm_cache'
  });
  res.json(result);
});
```

### Scheduled Job (Node-cron)

```typescript
import cron from 'node-cron';

const warmer = new SupabaseCacheWarmer();

// Every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const result = await warmer.run({
    action: 'schedule_refresh'
  });
  console.log('Cache refreshed:', result.data.summary);
});

// Every hour
cron.schedule('0 * * * *', async () => {
  const result = await warmer.run({
    action: 'detect_stale'
  });
  if (result.data.staleQueries.length > 0) {
    console.warn('Found stale cache:', result.data.staleQueries);
  }
});
```

## Performance Tips

1. **Cache Aggressively**: Set high TTL for stable data
2. **Refresh Regularly**: Prevent stale data issues
3. **Monitor Continuously**: Track hit rates and response times
4. **Optimize Queries**: Use Query Doctor skill alongside
5. **Size Appropriately**: Balance memory usage vs. hit rate

## Next Steps

1. Review the full documentation in `CACHE_WARMER_README.md`
2. Check implementation details in `S16_IMPLEMENTATION_SUMMARY.md`
3. Run the test suite: `npx ts-node test-cache-warmer.ts`
4. Integrate into your application
5. Monitor performance with analytics action
6. Adjust configuration based on metrics

## Support

- Documentation: `CACHE_WARMER_README.md`
- Implementation: `supabase-cache-warmer.ts`
- Tests: `test-cache-warmer.ts`
- Issues: Contact Supabase Archon team
