# S-25 Integration Guide: Supabase Statistics Collector

## Quick Integration Steps

### Step 1: Add Import to Archon Index

In `/mnt/c/Users/lucas/openclaw_aurora/skills/supabase-archon/supabase-archon-index.ts`, add the import:

```typescript
// Skills - P2 Otimização & Análise
import { SupabaseStatisticsCollector } from './supabase-statistics-collector';
```

Add this in the P2 section (around line 28-32 where other P2 skills are imported).

### Step 2: Register Skill in registerSupabaseArchonSkills()

Add this registration block in the function (after the other P2 registrations):

```typescript
// S-25: Statistics Collector
const statisticsCollector = new SupabaseStatisticsCollector();
registry.register(statisticsCollector, {
  name: 'supabase-statistics-collector',
  version: '1.0.0',
  status: SkillStatus.ACTIVE,
  riskLevel: SkillRiskLevel.LOW,
  category: 'UTIL',
  description: 'Collect and analyze database statistics: pg_stat_* metrics, table access patterns, index usage, query performance trends with auto-generated insights',
  tags: ['supabase', 'statistics', 'performance', 'analysis', 'pg_stat', 'optimization'],
});
```

### Step 3: Usage Examples

Once registered, use S-25 through the skill registry:

```typescript
import { getSkillRegistryV2 } from './skills/skill-registry-v2';

const registry = getSkillRegistryV2();

// Collect all statistics with insights
const result = await registry.execute('supabase-statistics-collector', {
  includeStats: ['all'],
  generateInsights: true,
  queryLimit: 50,
});

if (result.success && result.data) {
  const { report, timestamp, collectionDuration } = result.data;
  console.log(`Health Score: ${report.summary.health_score}/100`);
  console.log(`Duration: ${collectionDuration}ms`);
  console.log(`Insights: ${report.insights.length}`);
}
```

## Integration Points

### With Other Skills

S-25 integrates well with:

1. **S-13: Health Dashboard** - Complementary monitoring
   - Health Dashboard: Real-time connections, queries, disk, replication
   - S-25: Deep statistics, access patterns, index analysis

2. **S-17: Index Optimizer** - Optimization recommendations
   - S-25 detects unused indexes, low-ratio tables
   - Index Optimizer can implement the recommendations

3. **S-18: Slow Query Logger** - Query performance analysis
   - S-25 identifies degrading trends
   - Slow Query Logger provides detailed timing

4. **S-24: Partition Manager** - Schema optimization
   - S-25 shows access patterns
   - Partition Manager uses this for optimization decisions

### With Monitoring Systems

Send S-25 data to:

```typescript
// Example: Send insights to external system
const insightsSend = report.insights.map(i => ({
  timestamp,
  skillId: 'S-25',
  type: i.type,
  severity: i.severity,
  title: i.title,
  affected: i.affected_objects,
}));

// Post to monitoring/alerting system
await fetch('https://your-monitoring/insights', {
  method: 'POST',
  body: JSON.stringify(insightsSend),
});
```

## Configuration Options

### Basic Collection
```typescript
{
  includeStats: ['all'],  // Collect everything
}
```

### Focused Analysis
```typescript
{
  includeStats: ['tables', 'indexes'],  // Skip query stats
  generateInsights: false,                // Skip insights for speed
}
```

### Custom Parameters
```typescript
{
  includeStats: ['queries'],
  queryLimit: 100,           // Track 100 queries instead of 50
  minTableSize: 120,         // Look at tables not vacuumed in 120 mins
  generateInsights: true,
}
```

### With Custom Credentials
```typescript
{
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-api-key',
  includeStats: ['all'],
}
```

## Response Structure

```typescript
{
  success: true,
  data: {
    report: {
      // Array of TableAccessStats
      tables: [
        {
          table_name: 'users',
          seq_scans: 145,
          idx_scans: 2847,
          access_ratio: 19.5,
          n_live_tup: 8945,
          n_dead_tup: 120,
          // ... more fields
        }
      ],

      // Array of IndexUsageStats
      indexes: [
        {
          index_name: 'users_email_idx',
          idx_scan: 2847,
          efficiency: 100,
          size_bytes: 524288,
          // ... more fields
        }
      ],

      // Array of QueryPerformanceTrend
      queries: [
        {
          query_text: 'SELECT * FROM users WHERE...',
          calls: 2847,
          mean_time_ms: 2.0,
          trend: 'stable',
          trend_percent: -2.5,
          // ... more fields
        }
      ],

      // Array of DatabaseInsight
      insights: [
        {
          type: 'opportunity',
          category: 'index',
          severity: 'medium',
          title: 'Unused Indexes Detected',
          description: 'Found 1 indexes that are never used',
          recommendation: 'DROP INDEX IF EXISTS unused_index;',
          affected_objects: ['unused_index'],
        }
      ],

      // Summary statistics
      summary: {
        total_tables: 4,
        total_indexes: 5,
        total_queries_tracked: 5,
        database_size_bytes: 76865536,
        average_table_size_bytes: 19216384,
        health_score: 82,  // 0-100
      }
    },

    timestamp: '2024-01-15T10:30:45.123Z',
    collectionDuration: 2450  // milliseconds
  }
}
```

## Scheduling Recommendations

### For Development/Testing
```typescript
// Run every 6 hours
const schedule = '0 */6 * * *';  // Cron expression
```

### For Production Monitoring
```typescript
// Hourly collection
const schedule = '0 * * * *';

// Full analysis with insights every 6 hours
const detailedSchedule = '0 */6 * * *';
```

### For Critical Environments
```typescript
// Every 15 minutes for real-time monitoring
const schedule = '*/15 * * * *';

// But limited scope to reduce load
{
  includeStats: ['tables'],  // Only table bloat
  generateInsights: false,    // Skip computation
}
```

## Error Handling

```typescript
const result = await registry.execute('supabase-statistics-collector', {
  includeStats: ['all'],
});

if (!result.success) {
  console.error('S-25 failed:', result.error);
  // Fallback to last known good state
  // Or try with reduced scope
  const retry = await registry.execute('supabase-statistics-collector', {
    includeStats: ['tables'],  // Simpler query
  });
}
```

## Alert Configuration

### Health Score Thresholds
```typescript
const healthScore = result.data?.report.summary.health_score || 0;

if (healthScore < 50) {
  // Critical - immediate investigation needed
  alert('Database health CRITICAL', { score: healthScore });
} else if (healthScore < 70) {
  // Warning - schedule maintenance
  alert('Database health WARNING', { score: healthScore });
} else {
  // Informational
  log('Database health OK', { score: healthScore });
}
```

### Insight-based Alerts
```typescript
const criticalInsights = report.insights.filter(i => i.severity === 'high');

if (criticalInsights.length > 0) {
  // High-severity issues detected
  for (const insight of criticalInsights) {
    alert(`${insight.title}: ${insight.recommendation}`);
  }
}
```

### Performance Degradation Alert
```typescript
const degradingQueries = report.queries.filter(q => q.trend === 'degrading');

if (degradingQueries.length > 2) {
  alert(`Performance degradation detected in ${degradingQueries.length} queries`);

  // Send query texts to performance team
  sendAlert({
    queries: degradingQueries.map(q => ({
      text: q.query_text,
      degradation: q.trend_percent,
    })),
  });
}
```

## Migration from Mock to Real Data

When ready to use real PostgreSQL statistics:

1. **Update collectTableAccessStats():**
   ```typescript
   // Replace mock with:
   const query = `
     SELECT
       schemaname, relname, seq_scan, seq_tup_read,
       idx_scan, idx_tup_fetch, n_tup_ins, n_tup_upd, n_tup_del,
       n_live_tup, n_dead_tup, last_vacuum, last_autovacuum, hot_upd
     FROM pg_stat_user_tables
     WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
     ORDER BY n_live_tup DESC
   `;
   ```

2. **Update collectIndexUsageStats():**
   ```typescript
   // Replace mock with pg_stat_user_indexes query
   ```

3. **Update collectQueryPerformanceTrends():**
   ```typescript
   // Replace mock with pg_stat_statements query
   // (requires pg_stat_statements extension)
   ```

## Troubleshooting

### Timeout Issues
If collection times out:
```typescript
{
  includeStats: ['tables'],  // Reduce scope
  generateInsights: false,    // Skip analysis
  queryLimit: 20,            // Fewer queries
}
```

### Missing Insights
If no insights are generated:
- Check if mock data is being used (expected)
- Verify `generateInsights: true` is set
- Ensure tables/indexes/queries have data

### Credential Errors
```typescript
// Verify vault has credentials
if (!result.success) {
  console.log('Set SUPABASE_URL and SUPABASE_KEY in vault');

  // Or pass directly
  const result = await registry.execute('supabase-statistics-collector', {
    supabaseUrl: 'https://...',
    supabaseKey: '...',
    includeStats: ['all'],
  });
}
```

## Performance Impact

### Estimated Collection Times (with mock data)
- Table stats only: ~100ms
- Index stats only: ~80ms
- Query stats only: ~50ms
- All stats: ~150ms
- With insights: +200-300ms
- **Total average: 300-500ms** (with mock data)

### Real PostgreSQL Impact
- Will vary based on database size
- Recommended timeout: 60 seconds (configured)
- Suitable for hourly runs
- Can reduce frequency on small databases

## Support & Documentation

- **Main Skill File:** `/skills/supabase-archon/supabase-statistics-collector.ts`
- **Usage Guide:** `/skills/supabase-archon/STATISTICS_COLLECTOR_USAGE.md`
- **Creation Summary:** `/skills/supabase-archon/S-25_CREATION_SUMMARY.md`

## Success Criteria

After integration, verify:
- ✅ Skill registers without errors
- ✅ `execute()` returns success with mock data
- ✅ Report contains all expected sections
- ✅ Health score calculated (0-100)
- ✅ Insights generated automatically
- ✅ Helper methods work correctly
- ✅ Logger outputs structured JSON
- ✅ Proper error handling on failures
