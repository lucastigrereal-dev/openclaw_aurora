# S-25: Supabase Statistics Collector

**Status:** Production-Ready
**Priority:** P2
**Category:** UTIL
**Version:** 1.0.0

## Overview

The Statistics Collector (S-25) is a comprehensive PostgreSQL statistics analysis skill for Supabase that collects and analyzes database metrics including:

- **Table Access Patterns** - Sequential scans, index scans, insert/update/delete counts
- **Index Usage Statistics** - Scan counts, efficiency metrics, unused indexes
- **Query Performance Trends** - Execution time trends, performance degradation detection
- **Automated Insights** - AI-generated recommendations for optimization

## Key Features

### 1. Table Access Statistics Collection
Collects metrics from `pg_stat_user_tables`:
- Sequential vs. index scan ratios
- Tuple counts (live, dead, inserted, updated, deleted)
- HOT (Heap-Only Tuple) update counts
- Vacuum and autovacuum history
- Dead tuple ratios for bloat detection

### 2. Index Usage Analysis
Collects metrics from `pg_stat_user_indexes`:
- Index scan counts and efficiency
- Tuple read/fetch statistics
- Index size in bytes
- Detection of unused indexes
- Last usage timestamps

### 3. Query Performance Monitoring
Collects data from `pg_stat_statements`:
- Query execution counts and timing statistics
- Mean, min, max, and stddev query times
- Row count metrics
- Performance trend detection (improving/degrading/stable)
- Trend percentages for change tracking

### 4. Intelligent Insights Generation
Automatically generates insights for:
- **Unused Indexes** - Identifies indexes consuming storage without value
- **Table Bloat** - Detects tables with >5% dead tuple ratios
- **Query Degradation** - Flags queries with performance trends >10% slower
- **Low Index Ratios** - Finds tables with poor index utilization (<2:1 ratio)
- **Vacuum History** - Identifies tables not recently vacuumed
- **Heavy Queries** - Detects queries returning >100k rows

## TypeScript Interfaces

### TableAccessStats
```typescript
interface TableAccessStats {
  table_name: string;
  schema_name: string;
  seq_scans: number;          // Sequential scans
  seq_tup_read: number;       // Tuples read sequentially
  idx_scans: number;          // Index scans
  idx_tup_fetch: number;      // Tuples fetched via index
  n_tup_ins: number;          // Inserted tuples
  n_tup_upd: number;          // Updated tuples
  n_tup_del: number;          // Deleted tuples
  n_live_tup: number;         // Live tuples
  n_dead_tup: number;         // Dead tuples
  last_vacuum: string | null;
  last_autovacuum: string | null;
  hot_updates: number;        // HOT updates
  access_ratio: number;       // Index/sequential ratio
}
```

### IndexUsageStats
```typescript
interface IndexUsageStats {
  index_name: string;
  table_name: string;
  schema_name: string;
  idx_scan: number;           // Scan count
  idx_tup_read: number;       // Tuples read
  idx_tup_fetch: number;      // Tuples fetched
  size_bytes: number;         // Index size
  is_unique: boolean;
  is_primary: boolean;
  efficiency: number;         // 0-100%
  last_used: string | null;
}
```

### QueryPerformanceTrend
```typescript
interface QueryPerformanceTrend {
  query_hash: string;
  query_text: string;
  calls: number;              // Execution count
  total_time_ms: number;
  mean_time_ms: number;
  max_time_ms: number;
  min_time_ms: number;
  stddev_time_ms: number;
  rows: number;               // Affected rows
  trend: 'improving' | 'degrading' | 'stable';
  trend_percent: number;      // Change percentage
}
```

### DatabaseInsight
```typescript
interface DatabaseInsight {
  type: 'opportunity' | 'warning' | 'info';
  category: 'index' | 'table' | 'query' | 'vacuum' | 'bloat' | 'general';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  recommendation: string;
  affected_objects?: string[];
  metric_value?: number;
  timestamp: string;
}
```

## Usage Examples

### Basic Usage - Collect All Statistics

```typescript
import { SupabaseStatisticsCollector } from './supabase-statistics-collector';

const collector = new SupabaseStatisticsCollector();

const result = await collector.execute({
  // Credentials from vault if not provided
  includeStats: ['all'],
  generateInsights: true,
});

if (result.success && result.data) {
  const { report, timestamp, collectionDuration } = result.data;
  console.log(`Health Score: ${report.summary.health_score}/100`);
  console.log(`Found ${report.insights.length} insights`);
  console.log(`Collection took ${collectionDuration}ms`);
}
```

### Collect Specific Metrics

```typescript
const result = await collector.execute({
  includeStats: ['tables', 'indexes'],  // Only tables and indexes
  generateInsights: false,                // Skip insights for speed
  queryLimit: 25,                        // Limit queries tracked
});
```

### Analyze Tables with Most Bloat

```typescript
const bloatedTables = await collector.getTablesWithMostBloat({});
console.log('Tables with most bloat:');
bloatedTables.forEach(table => {
  const bloat = (table.n_dead_tup / (table.n_live_tup + table.n_dead_tup)) * 100;
  console.log(`  ${table.table_name}: ${bloat.toFixed(2)}% dead tuples`);
});
```

### Find Performance Degrading Queries

```typescript
const degradingQueries = await collector.getDegradingQueries({});
console.log('Queries with degrading performance:');
degradingQueries.forEach(query => {
  console.log(`  ${query.query_text.substring(0, 50)}...`);
  console.log(`    Trend: ${query.trend_percent.toFixed(1)}% slower`);
});
```

### Identify Unused Indexes

```typescript
const unusedIndexes = await collector.getUnusedIndexes({});
console.log(`Found ${unusedIndexes.length} unused indexes:`);
unusedIndexes.forEach(idx => {
  console.log(`  - ${idx.index_name} on ${idx.table_name} (${(idx.size_bytes / 1024 / 1024).toFixed(2)}MB)`);
});
```

## Mock Data Features

The skill currently uses **realistic mock data** for prototyping:

### Sample Data Includes:
- **users** table: 8,945 live tuples, 19.5:1 index/seq ratio
- **posts** table: 24,560 live tuples, 16.4:1 ratio (high index efficiency)
- **comments** table: 52,340 live tuples, 1.95:1 ratio (low index ratio detected)
- **logs** table: 450,230 tuples, 0.016:1 ratio (sequential heavy - optimization opportunity)

### Generated Insights Examples:
1. Unused index detection (`unused_index` on posts)
2. Table bloat warnings (comments with >5% dead tuples)
3. Query performance degradation (JOIN queries showing 23.5% slowdown)
4. Low index ratio recommendations (logs table improvement opportunity)
5. Vacuum history tracking

## Integration Points

### Extends: Skill Base Class
```typescript
export class SupabaseStatisticsCollector extends Skill
```

### Imports:
- `Skill, SkillInput, SkillOutput` from `../skill-base`
- `createLogger` from `./supabase-logger`
- `getVault` from `./supabase-vault-config`

### Configuration
```typescript
{
  timeout: 60000,      // 60 second timeout
  retries: 2,          // Retry twice on failure
}
```

## Implementation Status

### Currently Implemented (Mock Data):
- [x] Table access statistics collection
- [x] Index usage analytics
- [x] Query performance trend tracking
- [x] Automated insight generation (6 insight types)
- [x] Health score calculation
- [x] Summary statistics aggregation
- [x] Helper methods for common queries

### TODO - Real Data Integration:
- [ ] Replace mock data with real `pg_stat_user_tables` queries
- [ ] Replace mock data with real `pg_stat_user_indexes` queries
- [ ] Replace mock data with real `pg_stat_statements` queries
- [ ] Add historical trend tracking (compare to previous collections)
- [ ] Implement caching layer for expensive queries
- [ ] Add custom insight rules configuration
- [ ] Export reports in JSON/HTML formats
- [ ] Add Grafana dashboard integration

## Health Score Calculation

The health score (0-100) is calculated as:
1. Start at 100 points
2. Subtract points for each insight:
   - Critical severity: -15 points
   - Medium severity: -8 points
   - Low severity: -3 points
3. Subtract points for degrading queries: -5 per query (max -20)
4. Clamp to 0-100 range

**Example:**
- 2 high-severity insights = -30 points
- 1 degrading query = -5 points
- Result: 65/100

## Best Practices

### Scheduling
- Run statistics collection hourly for real-time monitoring
- Run full analysis with insights generation every 6 hours
- Archive reports daily for trend analysis

### Alert Thresholds
- **Critical:** health_score < 50 or critical insights detected
- **Warning:** health_score < 70 or multiple high-severity insights
- **Info:** Regular reporting of collected metrics

### Actionable Items
Each insight includes:
- **Problem identification** - What's wrong
- **Affected objects** - Which tables/indexes/queries
- **Recommendation** - How to fix it
- **SQL examples** - Ready-to-run commands

## Example Response

```json
{
  "success": true,
  "data": {
    "report": {
      "tables": [
        {
          "table_name": "users",
          "schema_name": "public",
          "seq_scans": 145,
          "idx_scans": 2847,
          "access_ratio": 19.5,
          "n_live_tup": 8945,
          "n_dead_tup": 120
        }
      ],
      "indexes": [
        {
          "index_name": "users_email_idx",
          "table_name": "users",
          "idx_scan": 2847,
          "efficiency": 100,
          "size_bytes": 524288
        },
        {
          "index_name": "unused_index",
          "table_name": "posts",
          "idx_scan": 0,
          "efficiency": 0,
          "size_bytes": 1048576
        }
      ],
      "queries": [
        {
          "query_hash": "SELECT2",
          "query_text": "SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC",
          "calls": 1456,
          "mean_time_ms": 8.5,
          "trend": "degrading",
          "trend_percent": 12.3
        }
      ],
      "insights": [
        {
          "type": "opportunity",
          "category": "index",
          "severity": "medium",
          "title": "Unused Indexes Detected",
          "description": "Found 1 indexes that are never used",
          "recommendation": "DROP INDEX IF EXISTS unused_index;",
          "affected_objects": ["unused_index"]
        }
      ],
      "summary": {
        "total_tables": 4,
        "total_indexes": 5,
        "total_queries_tracked": 5,
        "database_size_bytes": 76865536,
        "health_score": 82
      }
    },
    "timestamp": "2024-01-15T10:30:45.123Z",
    "collectionDuration": 2450
  }
}
```

## Future Enhancements

1. **Historical Analysis** - Track statistics over time to identify trends
2. **Automated Recommendations** - Machine learning based optimization suggestions
3. **Cost Analysis** - Estimate storage costs of unused indexes
4. **Slow Query Dashboard** - Real-time slow query monitoring
5. **Custom Alert Rules** - User-defined alert thresholds and conditions
6. **Export Formats** - JSON, HTML, PDF reports
7. **Integration APIs** - Send insights to Slack, PagerDuty, etc.
8. **Baseline Comparison** - Compare current stats to historical baselines
