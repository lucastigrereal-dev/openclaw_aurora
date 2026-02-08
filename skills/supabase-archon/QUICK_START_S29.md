# S-29 Edge Function Monitor - Quick Start

## What Does It Do?

Monitors your Supabase Edge Functions performance:
- How many times each function runs (invocations)
- How often functions start "cold" (cold starts)
- How long functions take to execute (latency)
- How many functions fail (error rates)
- How much each function costs
- Memory consumption
- Timeout occurrences

## File

```
/mnt/c/Users/lucas/openclaw_aurora/skills/supabase-archon/supabase-edge-function-monitor.ts
```

## Basic Usage

```typescript
import { SupabaseEdgeFunctionMonitor } from './supabase-edge-function-monitor';

const monitor = new SupabaseEdgeFunctionMonitor();

// Run the monitor
const result = await monitor.execute({});

// Check results
if (result.success) {
  console.log('Total functions:', result.data.aggregated.totalFunctions);
  console.log('Total cost:', result.data.aggregated.totalCost);
  console.log('Error rate:', result.data.aggregated.globalErrorRate);

  // Check for alerts
  const criticalAlerts = result.data.alerts.filter(a => a.level === 'critical');
  console.log('Critical issues:', criticalAlerts.length);
}
```

## Key Metrics Provided

### Per-Function Metrics
- Invocations count
- Cold start count and rate
- Average/p95/p99 execution times
- Error count and rate
- Cost per invocation
- Total cost
- Memory usage
- Timeout count

### Global Metrics
- Total invocations across all functions
- Global error rate
- Global cold start rate
- Most expensive function
- Slowest function (by p99)
- Total cost
- Cost per million invocations

## Alert Types

| Alert Type | Trigger | Severity |
|-----------|---------|----------|
| `high_cold_start` | Cold start rate > 20% (default) | warning/critical |
| `high_error_rate` | Error rate > 5% (default) | warning/critical |
| `slow_execution` | p99 latency > 5000ms (default) | warning/critical |
| `high_cost` | Cost per invocation is elevated | warning |
| `high_memory` | Memory usage > 256MB (default) | info/warning |
| `frequent_timeout` | Timeouts > 5 (default) | warning |

## Default Thresholds

```javascript
{
  coldStartRatePercent: 20,    // Alert if > 20% cold starts
  errorRatePercent: 5,         // Alert if > 5% errors
  executionTimeMs: 5000,       // Alert if p99 > 5 seconds
  costPerMillion: 100,         // Alert if > $100 per million calls
  memoryUsedMb: 256,          // Alert if > 256 MB
  timeoutCount: 5,            // Alert if > 5 timeouts
}
```

## Examples

### Monitor All Functions
```typescript
const result = await monitor.execute({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-service-role-key',
});
```

### Monitor Specific Functions
```typescript
const result = await monitor.execute({
  functionNames: ['process-invoice', 'send-email'],
  timeRangeHours: 24,
});
```

### Custom Thresholds
```typescript
const result = await monitor.execute({
  thresholds: {
    errorRatePercent: 2,        // Stricter than default
    coldStartRatePercent: 10,   // Stricter than default
  },
});
```

### Get Specific Information
```typescript
// Most expensive function
const mostExpensive = await monitor.getMostExpensiveFunction({});
console.log('Most expensive:', mostExpensive);

// Slowest function
const slowest = await monitor.getSlowestFunction({});
console.log('Slowest:', slowest);

// Total cost
const totalCost = await monitor.getTotalCost({});
console.log('Total cost:', totalCost);

// Error rate
const errorRate = await monitor.getGlobalErrorRate({});
console.log('Error rate:', errorRate);
```

## Response Structure

```typescript
{
  success: boolean,
  data?: {
    functions: [
      {
        name: 'function-name',
        invocations: 50000,
        coldStarts: 5000,
        coldStartRate: 10,
        avgExecutionTimeMs: 250,
        p95ExecutionTimeMs: 750,
        p99ExecutionTimeMs: 1500,
        errorCount: 250,
        errorRate: 0.5,
        costPerInvocation: 0.000001,
        totalCost: 0.05,
        memoryUsedMb: 128,
        timeoutCount: 2,
        // ...
      },
      // ... more functions
    ],
    aggregated: {
      totalFunctions: 5,
      totalInvocations: 250000,
      totalColdStarts: 12500,
      globalColdStartRate: 5,
      globalErrorRate: 1,
      globalAvgExecutionTimeMs: 300,
      globalP95ExecutionTimeMs: 900,
      globalP99ExecutionTimeMs: 1800,
      totalCost: 0.25,
      costPerMillion: 1000,
      averageMemoryUsedMb: 150,
      mostExpensiveFunction: 'resize-image',
      slowestFunction: 'generate-report',
    },
    alerts: [
      {
        level: 'warning',
        functionName: 'resize-image',
        alertType: 'high_memory',
        message: 'High memory usage: 512MB',
        threshold: 256,
        current: 512,
        timestamp: '2026-02-06T...',
      },
      // ... more alerts
    ],
    timestamp: '2026-02-06T...',
    checkDuration: 234,  // milliseconds
  },
  error?: 'Error message if failed',
}
```

## Integration with Supabase Vault

The skill automatically reads Supabase credentials from your vault:
- SUPABASE_URL
- SUPABASE_KEY

Or provide them explicitly in params.

## Logging

All operations are logged to console in JSON format:
```json
{
  "timestamp": "2026-02-06T10:30:00.000Z",
  "skill": "edge-function-monitor",
  "level": "info",
  "message": "Edge Function Monitor iniciado",
  "context": {
    "timeRange": 24,
    "functionCount": "all"
  }
}
```

## What's Currently Using Mock Data

- All metrics are generated from realistic distributions
- Real implementation will query Supabase Management API
- Ready for production integration

## Next Steps for Real Implementation

1. Add Supabase Management API integration
2. Query edge function logs from Supabase
3. Extract billing/cost data
4. Add persistent storage for historical data
5. Implement trend analysis

## Error Handling

The skill handles:
- Missing credentials gracefully
- Invalid parameters
- API failures
- Network timeouts
- Malformed data

## Performance

- Timeout: 60 seconds
- Automatic retry: 2 times on failure
- Can monitor 5-10+ functions concurrently

## Related Skills

- S-13: Health Dashboard
- S-08: Cache Warmer
- S-10: Rate Limiter
- S-12: Query Cache

See the Supabase Archon suite for more monitoring tools.
