# S-14 Circuit Breaker - Quick Start Guide

## What It Does

The Circuit Breaker skill prevents cascade failures by monitoring error rates and automatically managing connection states. When too many failures occur, it "opens" the circuit to fail-fast and prevent resource exhaustion.

## Install & Import

```typescript
import { SupabaseCircuitBreaker } from './supabase-circuit-breaker';
import { runCircuitBreaker } from './supabase-archon-index';
```

## 5-Minute Setup

### 1. Create Instance
```typescript
const breaker = new SupabaseCircuitBreaker();
```

### 2. Check Status
```typescript
const result = await breaker.execute({
  action: 'check',
  endpoints: ['auth', 'health', 'realtime', 'functions'],
});

console.log(result.data?.metrics.systemHealth); // 'healthy', 'degraded', 'critical'
```

### 3. Record Events
```typescript
// When a request succeeds
breaker.recordSuccess('auth');

// When a request fails
breaker.recordFailure('auth');
```

### 4. Get Recommendations
```typescript
const result = await breaker.execute({
  action: 'health_report',
  endpoints: ['auth', 'health'],
});

console.log(result.data?.recommendations);
```

## States

```
CLOSED ──(5+ failures)──> OPEN ──(60s timeout)──> HALF_OPEN
  ↑                                                    │
  └────────(3+ successes)─────────────────────────────┘
```

| State | Behavior | Next State |
|-------|----------|-----------|
| CLOSED | ✓ Accept all requests | → OPEN (on failures) |
| OPEN | ✗ Reject immediately | → HALF_OPEN (after timeout) |
| HALF_OPEN | ◐ Test recovery | → CLOSED (on success) or OPEN (on failure) |

## Real-world Example

```typescript
async function makeRequest(endpoint: string) {
  try {
    // Check if circuit is open
    const status = breaker.getStatus();
    if (status.endpoints.get(endpoint)?.state === 'OPEN') {
      throw new Error('Circuit is OPEN, service unavailable');
    }

    // Make actual request
    const response = await supabase.from('table').select();

    // Record success
    breaker.recordSuccess(endpoint);
    return response;

  } catch (error) {
    // Record failure
    breaker.recordFailure(endpoint);

    // Use fallback or cached data
    return getFallbackData();
  }
}
```

## Configuration

```typescript
const config = {
  failureThreshold: 5,      // Failures before opening
  successThreshold: 3,      // Successes before closing
  timeout: 60000,           // Wait before retry (ms)
  errorRateThreshold: 50,   // Error rate % to open
};

const result = await breaker.execute({
  action: 'check',
  endpoints: ['auth', 'health'],
  config: config,
});
```

## Manual Control

```typescript
// Force open (block traffic)
await breaker.execute({
  action: 'manual_open',
  targetEndpoint: 'auth',
});

// Force close (resume traffic)
await breaker.execute({
  action: 'manual_close',
  targetEndpoint: 'auth',
});

// Reset to initial state
await breaker.execute({
  action: 'reset',
  targetEndpoint: 'auth',
});
```

## Convenience Function

```typescript
import { runCircuitBreaker } from './supabase-archon-index';

// Quick health check
const result = await runCircuitBreaker({
  endpoints: ['auth', 'health', 'realtime'],
  config: { failureThreshold: 3 },
});

if (result.data?.metrics.systemHealth === 'critical') {
  // Alert ops team
}
```

## Metrics Explained

```typescript
interface CircuitBreakerMetrics {
  totalEndpoints: 4,           // Endpoints monitored
  openCircuits: 1,             // Circuits in OPEN state
  halfOpenCircuits: 0,         // Circuits in HALF_OPEN state
  closedCircuits: 3,           // Circuits in CLOSED state
  averageErrorRate: 15.5,      // % errors (0-100)
  systemHealth: 'degraded',    // healthy/degraded/critical
}
```

## Alerts

```typescript
// When circuit opens
{
  level: 'critical',
  endpoint: 'auth',
  action: 'opened',
  message: 'Circuit opened: 5 consecutive failures',
  timestamp: '2024-02-06T10:30:45Z'
}

// When circuit closes
{
  level: 'info',
  endpoint: 'auth',
  action: 'closed',
  message: 'Circuit closed: recovery successful',
  timestamp: '2024-02-06T10:31:50Z'
}
```

## Health Status

| Status | Condition | Action |
|--------|-----------|--------|
| HEALTHY | No open circuits, error rate < 5% | None needed |
| DEGRADED | Some open circuits or error rate 5-25% | Monitor |
| CRITICAL | >50% circuits open or error > 50% | Investigate |

## Testing

```bash
# Run test suite
npx ts-node test-circuit-breaker.ts

# Output: 10 tests covering all functionality
```

## Common Patterns

### Pattern 1: Protect Database Queries
```typescript
async function queryDatabase(table: string) {
  const status = breaker.getStatus();

  if (status.endpoints.get('db')?.state === 'OPEN') {
    // Use cache instead
    return getCachedData(table);
  }

  try {
    const data = await supabase.from(table).select();
    breaker.recordSuccess('db');
    return data;
  } catch (e) {
    breaker.recordFailure('db');
    return getCachedData(table);
  }
}
```

### Pattern 2: Monitor Multiple Services
```typescript
const result = await breaker.execute({
  endpoints: [
    'auth',
    'realtime',
    'functions',
    'storage',
  ],
  action: 'check',
});

// Check each endpoint
result.data?.metrics.endpoints.forEach((metrics, name) => {
  console.log(`${name}: ${metrics.state} (${metrics.errorRate.toFixed(1)}%)`);
});
```

### Pattern 3: Gradual Degradation
```typescript
if (breaker.getStatus().systemHealth === 'critical') {
  // Disable non-essential features
  disableAnalytics();
  disableNotifications();

  // Keep core functionality
  enableCaching();
  simplifyUI();
}
```

## Troubleshooting

### Circuit stuck OPEN?
```typescript
// Check time since failure
const metrics = breaker.getStatus();
const endpoint = metrics.endpoints.get('auth');
console.log('Last failure:', endpoint?.lastFailureTime);
console.log('State:', endpoint?.state);

// Reset if needed
breaker.recordSuccess('auth'); // Record 3+ successes
```

### Too sensitive?
```typescript
// Increase thresholds
config.failureThreshold = 10;    // More failures needed
config.errorRateThreshold = 70;  // Higher error rate
config.timeout = 120000;          // Longer wait time
```

### Too lenient?
```typescript
// Decrease thresholds
config.failureThreshold = 2;     // Fewer failures needed
config.errorRateThreshold = 30;  // Lower error rate
config.timeout = 30000;           // Shorter wait time
```

## API Quick Reference

```typescript
// Main execution
await breaker.execute(params)

// Record events
breaker.recordFailure(endpoint)
breaker.recordSuccess(endpoint)

// Get status
breaker.getStatus()

// All methods return strongly typed results
```

## Files

- **Implementation:** `supabase-circuit-breaker.ts` (631 lines)
- **Tests:** `test-circuit-breaker.ts` (338 lines)
- **Guide:** `CIRCUIT_BREAKER_S14_GUIDE.md` (492 lines)
- **This file:** `S14_QUICK_START.md`

## Related Skills

- **S-13:** Health Dashboard - Get real-time health metrics
- **S-01:** Schema Sentinel - Monitor schema changes
- **S-08:** Query Doctor - Analyze query performance

## Key Concepts

**Fail-Fast:** When OPEN, reject immediately instead of timing out
**Circuit Breaker:** Analogous to electrical circuit breaker - stops flow when dangerous
**Half-Open:** Careful testing phase to see if service recovered
**Error Rate:** Percentage of failed requests (0-100%)
**Cascade:** When one failure causes others (prevented by this skill)

## Next Steps

1. Integrate with your request handlers
2. Set thresholds based on your SLAs
3. Add alerts for state changes
4. Monitor recommendations
5. Review logs when circuits open

---

For detailed guide: See `CIRCUIT_BREAKER_S14_GUIDE.md`
For full API: See `supabase-circuit-breaker.ts`
For tests: See `test-circuit-breaker.ts`
