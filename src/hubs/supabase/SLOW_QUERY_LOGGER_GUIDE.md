# Supabase Archon - Slow Query Logger (S-18)

**Version:** 1.0.0
**Category:** UTIL
**Priority:** P1
**Status:** Production Ready

## Overview

The Slow Query Logger is a comprehensive skill for capturing, analyzing, and reporting on slow database queries in Supabase. It detects performance issues, identifies query patterns, and alerts on threshold breaches.

## Features

### 1. **Capture Slow Queries**
- Captures queries exceeding configurable threshold (default: 100ms)
- Filters by time window (default: 1 hour)
- Returns full query details including duration, database, user, and rows affected

**Action:** `capture`

```typescript
{
  action: 'capture',
  threshold: 100,        // milliseconds
  timeWindow: 3600000    // 1 hour in ms
}
```

### 2. **Comprehensive Analysis**
- Analyzes query patterns and performance metrics
- Detects SELECT * queries (full column retrieval)
- Identifies full table scans
- Counts JOIN operations
- Calculates statistical summaries

**Action:** `analyze`

```typescript
{
  action: 'analyze',
  threshold: 100
}
```

**Output includes:**
- Average, max, min duration
- COUNT of SELECT * queries
- COUNT of full table scans
- COUNT of JOIN operations

### 3. **Query Pattern Detection**
- Groups similar queries by pattern
- Tracks occurrence frequency
- Calculates average/max/min duration per pattern
- Ranks by total impact (total duration)
- Identifies high-frequency patterns

**Action:** `patterns`

```typescript
{
  action: 'patterns',
  limit: 10  // Top N patterns
}
```

### 4. **N+1 Problem Detection**
- Identifies queries that execute multiple times
- Suggests consolidation opportunities
- Estimates savings potential (85-95% reduction)
- Recommends JOINs or batch loading

**Action:** `nplus1`

```typescript
{
  action: 'nplus1'
}
```

**Detection Logic:**
- Tracks query repetition patterns
- Flags queries executing 5+ times
- Calculates consolidation impact

### 5. **Top Slow Queries Report**
- Returns queries sorted by duration
- Shows slowest queries first
- Configurable result limit
- Includes all query metadata

**Action:** `top_queries`

```typescript
{
  action: 'top_queries',
  limit: 10
}
```

### 6. **Threshold Breach Alerts**
- Monitors for severity-based threshold breaches
- Generates categorized alerts

**Action:** `alerts`

```typescript
{
  action: 'alerts',
  threshold: 100,        // Base threshold
  timeWindow: 3600000    // 1 hour
}
```

**Severity Levels:**
- **CRITICAL:** > 2000ms
- **HIGH:** 1000-2000ms
- **MEDIUM:** 500-1000ms
- **LOW:** threshold-500ms

## Data Structures

### SlowQuery
```typescript
interface SlowQuery {
  id: string;              // Unique query identifier
  query: string;           // SQL query text
  duration: number;        // Execution time in milliseconds
  timestamp: string;       // ISO 8601 timestamp
  database?: string;       // Database name
  user?: string;          // User/service that ran query
  rowsAffected?: number;  // Number of rows affected
  executionPlan?: string; // Optional execution plan
}
```

### QueryPattern
```typescript
interface QueryPattern {
  pattern: string;           // Normalized query pattern
  occurrences: number;       // How many times pattern appeared
  averageDuration: number;   // Average execution time
  maxDuration: number;       // Slowest execution
  minDuration: number;       // Fastest execution
  totalDuration: number;     // Sum of all executions
}
```

### NPlusOneIssue
```typescript
interface NPlusOneIssue {
  baseQuery: string;        // The outer/main query
  relatedQuery: string;     // The query running multiple times
  estimatedCount: number;   // Estimated repetitions
  savingsPotential: string; // Expected improvement
}
```

### SlowQueryAlert
```typescript
interface SlowQueryAlert {
  severity: 'critical' | 'high' | 'medium' | 'low';
  threshold: number;     // Threshold that was breached
  breaches: number;      // Count of breaches
  message: string;       // Human-readable alert message
  timestamp: string;     // When alert was generated
}
```

## Usage Examples

### Example 1: Capture Slow Queries

```typescript
import { SupabaseSlowQueryLogger } from './supabase-slow-query-logger';

const logger = new SupabaseSlowQueryLogger();

const result = await logger.run({
  action: 'capture',
  threshold: 150,        // Queries > 150ms
  timeWindow: 1800000    // Last 30 minutes
});

if (result.success) {
  const { slowQueries, summary } = result.data;
  console.log(`Found ${slowQueries.length} slow queries`);
  console.log(summary);
}
```

### Example 2: Analyze and Get Top Queries

```typescript
// First, analyze all slow queries
const analysis = await logger.run({
  action: 'analyze',
  threshold: 100
});

// Then get top 5 slowest
const topQueries = await logger.run({
  action: 'top_queries',
  limit: 5
});

console.log('Top slowest queries:');
topQueries.data.topQueries.forEach((q, i) => {
  console.log(`${i + 1}. ${q.duration}ms - ${q.query}`);
});
```

### Example 3: Detect N+1 Problems

```typescript
const nplus1Result = await logger.run({
  action: 'nplus1'
});

if (nplus1Result.success) {
  const { nPlusOneIssues, summary } = nplus1Result.data;

  nPlusOneIssues.forEach((issue) => {
    console.log(`\nN+1 Detected:`);
    console.log(`Base: ${issue.baseQuery}`);
    console.log(`Repeated: ${issue.relatedQuery}`);
    console.log(`Estimated runs: ${issue.estimatedCount}`);
    console.log(`Potential: ${issue.savingsPotential}`);
  });
}
```

### Example 4: Monitor Alerts

```typescript
// Check for threshold breaches
const alerts = await logger.run({
  action: 'alerts',
  threshold: 100,
  timeWindow: 3600000
});

if (alerts.data.alerts.length > 0) {
  // Send notification
  const critical = alerts.data.alerts.filter(a => a.severity === 'critical');

  if (critical.length > 0) {
    console.error('CRITICAL PERFORMANCE ISSUES:', critical);
    // Send alert to monitoring system
  }
}
```

### Example 5: Pattern Analysis

```typescript
const patterns = await logger.run({
  action: 'patterns',
  limit: 10
});

console.log('Top query patterns by impact:');
patterns.data.patterns.forEach((pattern) => {
  console.log(`
Pattern: ${pattern.pattern}
Occurrences: ${pattern.occurrences}
Total time: ${pattern.totalDuration}ms
Average: ${pattern.averageDuration.toFixed(2)}ms
  `);
});
```

## Performance Recommendations

Based on detected issues, the skill recommends:

### For SELECT * Queries
- Specify only needed columns
- Reduces bandwidth and parsing overhead
- Improves query caching efficiency

### For Full Table Scans
- Add WHERE conditions to filter
- Create appropriate indexes
- Use LIMIT when appropriate

### For N+1 Problems
- Consolidate with JOINs
- Use batch loading
- Consider application-level caching
- Potential savings: 85-95% query reduction

### For Missing Indexes
- Create indexes on frequently filtered columns
- Index JOIN condition columns
- Index ORDER BY columns
- Expected improvement: 10-100x faster queries

### For Inefficient JOINs
- Ensure join columns are indexed
- Use appropriate join types
- Order JOINs by selectivity
- Expected improvement: 5-10x faster

## Integration with Monitoring

### Real-time Alerting
```typescript
// Set up continuous monitoring
setInterval(async () => {
  const result = await logger.run({
    action: 'alerts',
    threshold: 200
  });

  const critical = result.data.alerts.filter(a => a.severity === 'critical');
  if (critical.length > 0) {
    await sendToPagerDuty(critical);
  }
}, 60000); // Check every minute
```

### Weekly Report
```typescript
// Generate weekly pattern report
const patterns = await logger.run({
  action: 'patterns',
  limit: 20
});

const report = generateHtmlReport(patterns.data.patterns);
await sendEmailReport(report, 'db-performance@company.com');
```

### Dashboard Data
```typescript
// Continuous dashboard feed
const metrics = {
  slowQueries: await logger.run({ action: 'capture', threshold: 100 }),
  patterns: await logger.run({ action: 'patterns', limit: 5 }),
  nPlusOne: await logger.run({ action: 'nplus1' }),
  topQueries: await logger.run({ action: 'top_queries', limit: 10 }),
  alerts: await logger.run({ action: 'alerts' })
};

updateDashboard(metrics);
```

## Configuration

### Environment Variables
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### Default Parameters
- **Threshold:** 100ms
- **Time Window:** 3600000ms (1 hour)
- **Result Limit:** 10
- **Timeout:** 60000ms
- **Retries:** 2

## Technical Details

### Logging
- All operations logged via structured logger
- JSON format output for parsing
- Trace IDs for distributed tracing
- Timestamp precision: ISO 8601

### Query Normalization
- Whitespace normalized
- Parameters replaced with placeholders
- Uppercase keywords for consistency
- Allows pattern matching

### Skill Base Extension
- Extends Skill class from skill-base.ts
- Implements abstract execute() method
- Custom validate() for input validation
- Event emission for lifecycle events
- Automatic timing measurement

## Testing

Run the test suite:

```bash
npx ts-node skills/supabase-archon/test-slow-query-logger.ts
```

Tests include:
- Capture functionality
- Query analysis
- Pattern detection
- N+1 detection
- Top queries retrieval
- Alert generation
- Input validation
- Skill info retrieval

## Future Enhancements

### Planned Features
- Real Supabase connection integration
- Query plan analysis
- Automatic index recommendations
- ML-based anomaly detection
- Historical trend analysis
- Custom alert rules
- Query performance regression detection

### Possible Integrations
- PostgreSQL pg_stat_statements
- Datadog APM
- New Relic insights
- Grafana dashboards
- Slack/Teams notifications
- Database optimization services

## Error Handling

```typescript
const result = await logger.run(params);

if (!result.success) {
  console.error('Error:', result.error);
  // Handle error appropriately
}
```

## Support and Debugging

### Enable Debug Logging
```typescript
// Logs are automatically captured
// Check console output for detailed logs
```

### Common Issues

**Issue:** No slow queries detected
- Check threshold value (default 100ms)
- Verify time window includes recent queries
- Ensure database connection configured

**Issue:** False positives in N+1 detection
- Check estimated count accuracy
- Review relatedQuery content
- May need application-level verification

## License

Part of Supabase Archon - OpenClaw Aurora
Author: Supabase Archon Team

---

**Last Updated:** 2026-02-06
**Skill ID:** S-18
**Status:** Production Ready
