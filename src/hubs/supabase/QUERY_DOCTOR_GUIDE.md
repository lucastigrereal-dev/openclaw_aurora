# Supabase Query Doctor (S-08)

Query Doctor is an intelligent SQL query analyzer that identifies performance issues, missing indexes, inefficient patterns, and provides optimization recommendations.

## Features

### Query Analysis
- **SELECT * Detection** - Identifies unnecessary column selection
- **Full Table Scan Detection** - Finds queries without WHERE clauses
- **N+1 Query Patterns** - Detects sequential query indicators
- **Inefficient JOINs** - Identifies JOINs on non-indexed columns
- **Subquery Abuse** - Detects excessive nesting (>2 levels)
- **LIKE Pattern Issues** - Identifies non-indexable patterns
- **Missing Indexes** - Suggests indexes on WHERE conditions

### Scoring & Metrics
- **Query Score (0-100)** - Overall query health indicator
- **Estimated Cost (1-1000)** - Relative query execution cost
- **Issue Severity** - Critical, High, Medium, Low
- **Optimization Suggestions** - Actionable recommendations

## Usage

### Basic Usage

```typescript
import { SupabaseQueryDoctor } from './supabase-query-doctor';

const queryDoctor = new SupabaseQueryDoctor();

const result = await queryDoctor.run({
  query: 'SELECT * FROM users WHERE status = "active"'
});

if (result.success && result.data) {
  console.log(`Score: ${result.data.score}/100`);
  console.log(`Issues: ${result.data.issues.length}`);
  console.log(`Summary: ${result.data.summary}`);
}
```

### Using Registry

```typescript
import { runQueryDoctor } from './supabase-archon-index';

const result = await runQueryDoctor(
  'SELECT * FROM orders WHERE user_id = 123'
);

console.log(result.data?.score); // 0-100
console.log(result.data?.issues); // Array of detected issues
```

## Response Structure

```typescript
{
  success: true,
  data: {
    issues: [
      {
        type: 'missing_index' | 'full_scan' | 'n_plus_one' | 'inefficient_join' | 'subquery_abuse',
        severity: 'critical' | 'high' | 'medium' | 'low',
        description: "Human readable description",
        recommendation: "Suggested fix",
        estimatedImpact: "Expected benefit"
      }
    ],
    estimatedCost: 150,      // 1-1000 scale
    score: 75,               // 0-100 scale
    optimizedQuery: "...",   // Suggested improved query
    summary: "Query needs optimization..."
  }
}
```

## Issue Types

### 1. Missing Index
- **Severity**: Critical/High
- **Detection**: WHERE conditions on non-indexed columns
- **Fix**: Create indexes on frequently filtered columns
- **Impact**: 10-100x faster queries

### 2. Full Scan
- **Severity**: High/Medium
- **Detection**: SELECT *, missing WHERE clauses, LIKE with leading %
- **Fix**: Specify needed columns, add WHERE conditions, use full-text search
- **Impact**: Reduced bandwidth, faster execution

### 3. N+1 Queries
- **Severity**: High
- **Detection**: Multiple SELECT statements without proper JOINs
- **Fix**: Use JOINs or batch loading
- **Impact**: From hundreds of queries to single-digit

### 4. Inefficient Join
- **Severity**: Medium
- **Detection**: JOINs without indexed foreign keys
- **Fix**: Create indexes on join columns
- **Impact**: 5-10x faster JOINs

### 5. Subquery Abuse
- **Severity**: Medium
- **Detection**: >2 levels of nested subqueries
- **Fix**: Use CTEs (WITH clause) or reformulate with JOINs
- **Impact**: Better query plan optimization

## Query Score Calculation

- **100** = No issues detected
- **85+** = Minor issues only
- **70+** = Moderate optimization needed
- **50+** = Significant performance concerns
- **<50** = Critical performance issues

Score calculation:
- Critical issue: -25 points
- High severity: -15 points
- Medium severity: -10 points
- Low severity: -5 points

## Examples

### Example 1: Good Query
```sql
SELECT id, email, created_at
FROM users
WHERE status = 'active'
LIMIT 100
```

**Result**: Score 95/100, estimated cost 10, no issues

### Example 2: SELECT * Anti-pattern
```sql
SELECT *
FROM users
WHERE status = 'active'
```

**Result**: Score 85/100, estimated cost 60
- Issue: Unnecessary column selection
- Recommendation: Specify only needed columns

### Example 3: Full Table Scan
```sql
SELECT id, email
FROM users
```

**Result**: Score 70/100, estimated cost 100
- Issue: Full table scan without WHERE clause
- Recommendation: Add WHERE conditions to filter results

### Example 4: Inefficient Nested Subqueries
```sql
SELECT * FROM users
WHERE id IN (
  SELECT user_id FROM posts
  WHERE id IN (
    SELECT post_id FROM comments
    WHERE status = 'approved'
  )
)
```

**Result**: Score 60/100, estimated cost 200
- Issues:
  - Subquery abuse (3 levels)
  - SELECT * pattern
- Recommendation: Use WITH clause or direct JOINs

## Configuration

### Parameters

```typescript
interface QueryDoctorParams {
  query: string;                    // Required: SQL query to analyze
  supabaseUrl?: string;             // Optional: Supabase project URL
  supabaseKey?: string;             // Optional: Supabase API key
  analyzeExecutionPlan?: boolean;   // Optional: Deep analysis (default: false)
}
```

### Skill Configuration

```typescript
// Timeout: 30 seconds
// Retries: 2 attempts
// Category: UTIL
// Risk Level: LOW
```

## Best Practices

1. **Analyze Before Deployment**
   - Run Query Doctor on all new queries before production
   - Track score trends over time

2. **Focus on Critical Issues**
   - Address critical and high severity issues first
   - Low severity issues can be deferred

3. **Index Strategy**
   - Create indexes on frequently filtered columns
   - Use compound indexes for multi-column WHERE conditions
   - Avoid indexing low-cardinality columns

4. **Join Optimization**
   - Always index foreign key columns
   - Use INNER JOINs when possible (better optimization)
   - Avoid SELECT * in JOINs

5. **Query Patterns**
   - Prefer explicit JOINs over subqueries
   - Use CTEs for complex queries
   - Limit result sets with WHERE clauses

## Integration Examples

### CLI Usage
```bash
ts-node -e "
import { runQueryDoctor } from './supabase-archon-index';
const result = await runQueryDoctor('SELECT * FROM users');
console.log(JSON.stringify(result, null, 2));
"
```

### In Application Code
```typescript
async function validateQuery(sql: string) {
  const result = await runQueryDoctor(sql);

  if (!result.success) {
    throw new Error(`Query analysis failed: ${result.error}`);
  }

  if (result.data.score < 70) {
    console.warn('Query needs optimization:', result.data.summary);
  }

  return result.data;
}
```

### Monitoring Setup
```typescript
// Log all queries with issues
async function monitorQuery(sql: string) {
  const result = await runQueryDoctor(sql);

  if (result.data?.issues.length > 0) {
    const severity = result.data.issues[0].severity;
    console.log(`[${severity}] Query issue detected`, {
      query: sql,
      score: result.data.score,
      issues: result.data.issues,
    });
  }
}
```

## Performance Characteristics

- **Analysis Time**: <100ms per query
- **Memory Usage**: <10MB
- **Max Query Length**: 1MB
- **Concurrent Queries**: Unlimited

## Limitations

- Static analysis only (no actual query execution)
- Pattern-based detection (not database-aware)
- No execution plan analysis by default
- Cannot detect application-level N+1 patterns

## Future Enhancements

- [ ] Real execution plan analysis via Supabase API
- [ ] Database-aware schema introspection
- [ ] Machine learning-based cost estimation
- [ ] Historical query performance tracking
- [ ] Automatic index recommendation engine
- [ ] Query templating and parameterization checks

## Troubleshooting

### Query Not Analyzed
- Ensure query is valid SQL
- Check query length (must be >10 characters)
- Verify uppercase/lowercase keywords

### Unexpected High Cost
- Complex nested subqueries increase cost
- Multiple JOINs compound the estimate
- Check for LIKE patterns with leading %

### No Issues Detected
- Query may be well-optimized
- Consider if it handles edge cases
- Review for application-level optimization needs

## Related Skills

- **S-01**: Supabase Schema Sentinel - Monitor schema changes
- **S-02**: RLS Auditor Pro - Security policy validation
- **S-05**: Schema Differ - Database migration planning
- **S-06**: Backup Driller - Database backup verification

## Metadata

- **Skill ID**: S-08
- **Version**: 1.0.0
- **Category**: UTIL
- **Risk Level**: LOW
- **Priority**: P0
- **Author**: Supabase Archon
- **Tags**: supabase, performance, query, optimization
