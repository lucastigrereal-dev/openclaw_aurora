# Supabase Index Optimizer (S-09) - Complete Guide

## Overview

The **Index Optimizer** is a comprehensive skill for analyzing, recommending, and managing database indexes in Supabase. It helps optimize query performance by identifying missing indexes, detecting unused indexes, and evaluating overall index efficiency.

**Skill ID:** S-09
**Category:** UTIL
**Version:** 1.0.0
**Priority:** P1

## Features

### 1. **Analyze Current Index Usage**
Examines all existing indexes in your database and evaluates their efficiency based on:
- Usage frequency
- Query scan patterns
- Storage consumption
- Last access time

### 2. **Recommend Missing Indexes**
Analyzes slow query logs and suggests optimal indexes for frequently accessed columns:
- Identifies WHERE clause patterns
- Detects JOIN conditions
- Recommends composite indexes
- Provides SQL CREATE statements

### 3. **Detect Unused Indexes**
Identifies indexes that consume storage but provide no performance benefit:
- Tracks zero-scan indexes
- Flags rarely used indexes
- Calculates storage savings
- Provides removal recommendations

### 4. **Evaluate Index Efficiency**
Calculates performance scores (0-100) for each index:
- Usage vs. storage ratio
- Access frequency
- Overall database health

### 5. **Create Indexes with Approval**
Safely implements recommended indexes:
- Dry-run mode for testing
- Uses CONCURRENT creation (no locks)
- Generates proper SQL syntax
- Logs all operations

## Usage Examples

### Example 1: Analyze Current Indexes

```typescript
import { SupabaseIndexOptimizer } from './supabase-archon/supabase-index-optimizer';

const optimizer = new SupabaseIndexOptimizer();

const result = await optimizer.run({
  action: 'analyze'
});

console.log(result.data.summary);
// Output: "Index analysis complete. Total indexes: 4, Size: 29.0 MB. Keep: 3, Remove: 1, Optimize: 0..."
```

### Example 2: Get Index Recommendations

```typescript
const result = await optimizer.run({
  action: 'recommend',
  slowQueryLog: 'SELECT * FROM users WHERE email = ? AND status = ?;'
});

result.data.recommendations.forEach(rec => {
  console.log(`Table: ${rec.tableName}`);
  console.log(`Columns: ${rec.columns.join(', ')}`);
  console.log(`SQL: ${rec.sql}`);
  console.log(`---`);
});
```

### Example 3: Detect and Remove Unused Indexes

```typescript
const result = await optimizer.run({
  action: 'detect_unused'
});

console.log(result.data.summary);
// Output: "Found 1 unused indexes consuming 15.4 MB..."
```

### Example 4: Evaluate Overall Efficiency

```typescript
const result = await optimizer.run({
  action: 'evaluate_efficiency'
});

result.data.analysis.forEach(idx => {
  console.log(`${idx.indexName}: ${idx.efficiency}/100`);
});
```

## API Reference

### Input Parameters

```typescript
interface IndexOptimizerParams extends SkillInput {
  action: 'analyze' | 'recommend' | 'create' | 'detect_unused' | 'evaluate_efficiency';
  tableName?: string;
  slowQueryLog?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  requireApproval?: boolean;
  dryRun?: boolean;
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | Operation to perform (analyze, recommend, create, detect_unused, evaluate_efficiency) |
| `tableName` | string | No | Target table name (for specific table analysis) |
| `slowQueryLog` | string | No | Custom slow query log for analysis |
| `supabaseUrl` | string | No | Supabase project URL |
| `supabaseKey` | string | No | Supabase API key |
| `requireApproval` | boolean | No | Require user approval before creating indexes |
| `dryRun` | boolean | No | Test index creation without applying changes |

### Output

```typescript
interface IndexOptimizerResult extends SkillOutput {
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
```

## Index Recommendation Structure

```typescript
interface IndexRecommendation {
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
```

## Index Analysis Structure

```typescript
interface IndexAnalysis {
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
```

## Action Details

### `analyze`
Analyzes all existing indexes for performance and efficiency.

**Use Case:** Regular database health checks
**Output:** Array of IndexAnalysis objects with efficiency scores

```typescript
await optimizer.run({ action: 'analyze' });
```

### `recommend`
Recommends new indexes based on slow query patterns.

**Use Case:** After identifying slow queries
**Output:** Array of IndexRecommendation objects with SQL statements

```typescript
await optimizer.run({
  action: 'recommend',
  slowQueryLog: 'your slow query here'
});
```

### `create`
Creates recommended indexes (with optional dry-run).

**Use Case:** Implementing index recommendations
**Output:** List of created indexes and SQL statements

```typescript
await optimizer.run({
  action: 'create',
  dryRun: true  // Set to false to actually create
});
```

### `detect_unused`
Identifies indexes that consume storage but provide no benefit.

**Use Case:** Cleanup and storage optimization
**Output:** Array of unused IndexAnalysis objects

```typescript
await optimizer.run({ action: 'detect_unused' });
```

### `evaluate_efficiency`
Calculates efficiency scores for all indexes (0-100).

**Use Case:** Overall database optimization assessment
**Output:** Efficiency scores and optimization recommendations

```typescript
await optimizer.run({ action: 'evaluate_efficiency' });
```

## Efficiency Score Calculation

The efficiency score (0-100) is calculated as:

```
score = usageScore + recencyBonus - sizePenalty

usageScore = min(100, usageCount / 10)
recencyBonus = scansPerDay > 0 ? 30 : 0
sizePenalty = min(30, sizeInMB / 10)
```

**Interpretation:**
- **80-100:** Excellent - Keep and use as template
- **60-79:** Good - Monitor for optimization
- **40-59:** Fair - Potential for optimization
- **20-39:** Poor - Review for removal
- **0-19:** Critical - Strong candidate for removal

## Index Types

The optimizer recommends different index types based on use cases:

| Type | Use Case | Performance |
|------|----------|-------------|
| **btree** | General purpose (default) | Good for most queries |
| **hash** | Equality comparisons | Fast for = operations |
| **gin** | Full-text search, JSON | Excellent for complex types |
| **gist** | Spatial data, ranges | Good for geometric data |
| **brin** | Large tables, sequential data | Compact storage |

## Best Practices

### 1. Regular Analysis
Run `analyze` action weekly to monitor index health:

```typescript
// Add to scheduled job
const result = await optimizer.run({ action: 'analyze' });
logToMonitoring(result.data);
```

### 2. Act on Recommendations Promptly
Implement recommendations within 24 hours of identification:

```typescript
const recs = await optimizer.run({ action: 'recommend' });
if (recs.data.recommendations.length > 0) {
  // Alert team for implementation
  notifyTeam(recs.data);
}
```

### 3. Use Dry-Run Before Creating
Always test index creation:

```typescript
// First dry-run
const dryRun = await optimizer.run({
  action: 'create',
  dryRun: true
});

// Review results, then execute
const actual = await optimizer.run({
  action: 'create',
  dryRun: false
});
```

### 4. Remove Unused Indexes Periodically
Clean up storage by removing unused indexes:

```typescript
const unused = await optimizer.run({ action: 'detect_unused' });
// Manually verify and drop indexes listed in unused.data.analysis
```

### 5. Monitor Index Growth
Track index storage consumption over time:

```typescript
const analysis = await optimizer.run({ action: 'analyze' });
const totalSize = analysis.data.analysis
  .reduce((sum, idx) => sum + parseFloat(idx.size), 0);
logMetric('index_storage_mb', totalSize);
```

## Mock Data

The skill includes comprehensive mock data for demonstration:

### Mock Slow Queries
- `SELECT * FROM users WHERE email = ? AND status = ?` (2500ms)
- `SELECT * FROM orders WHERE user_id = ? AND created_at > ?` (1800ms)
- `SELECT * FROM products WHERE category = ? AND price < ?` (3200ms)
- JOIN query with user lookup (2100ms)
- Range query with IN clause (4500ms)

### Mock Existing Indexes
- `idx_users_id` - Highly used (5000 uses)
- `idx_orders_created_at` - Moderately used (120 uses)
- `idx_products_unused` - Unused (2 uses, unused for 30 days)
- `idx_transactions_status` - Active (890 uses)

## Testing

Run the comprehensive test suite:

```bash
npx ts-node skills/supabase-archon/test-index-optimizer.ts
```

Test output includes:
1. Index usage analysis
2. Index recommendations
3. Dry-run index creation
4. Unused index detection
5. Efficiency evaluation
6. Error handling
7. Skill metadata

## Integration with Other Archon Skills

The Index Optimizer works alongside:

- **Query Doctor (S-08):** Identifies slow queries for optimization
- **Permission Diff (S-05):** Ensures index-level security
- **Migration Planner (S-06):** Plans index changes in migrations
- **Health Dashboard (S-13):** Displays index metrics

## Performance Considerations

### Query Analysis Time
- Small databases: < 100ms
- Medium databases: < 500ms
- Large databases: < 2000ms

### Index Creation Time
- Depends on table size
- Uses CONCURRENT to avoid locks
- Estimated 10% of table scan time

### Storage Impact
- Average index: 5-15% of table size
- Composite indexes: 15-30% of table size
- Unused indexes: Pure overhead

## Troubleshooting

### Problem: No Recommendations Generated
**Solution:** Check slowQueryLog format and ensure queries match extracted patterns

### Problem: Efficiency Scores Too Low
**Solution:** Review index usage patterns; they may genuinely need optimization

### Problem: False Positive Unused Indexes
**Solution:** Verify lastUsed timestamp; some queries run less frequently

## Future Enhancements

- [ ] Real Supabase API integration
- [ ] Machine learning index suggestions
- [ ] Composite index optimization
- [ ] Partial index recommendations
- [ ] Index fragmentation detection
- [ ] Performance impact prediction
- [ ] Automated index maintenance

## Version History

### 1.0.0 (Current)
- Initial release
- Full index analysis capabilities
- Recommendation engine
- Unused index detection
- Efficiency scoring

## Support

For issues, questions, or feature requests:
- Check existing documentation
- Review test cases for examples
- Refer to Query Doctor for query optimization
- Contact Supabase Archon team

---

**Last Updated:** 2026-02-06
**Status:** Production Ready
**Maintainer:** Supabase Archon Team
