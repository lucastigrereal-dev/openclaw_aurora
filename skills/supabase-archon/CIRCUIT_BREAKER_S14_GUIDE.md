# Circuit Breaker Pattern - Skill S-14

## Overview

The Circuit Breaker skill (S-14) implements the Circuit Breaker pattern to prevent cascade failures in Supabase connections. It monitors error rates and automatically manages connection states to isolate failures and enable graceful degradation.

**Status:** Production Ready
**Version:** 1.0.0
**Category:** UTIL
**Risk Level:** LOW

## Circuit States

The Circuit Breaker operates with three distinct states:

### 1. CLOSED (Normal Operation)
- System accepts all requests
- Failures are counted but forwarded
- Success resets failure counter
- **Transition to OPEN:** When failure threshold or error rate exceeded

### 2. OPEN (Failure Detected)
- System rejects requests immediately without attempting to execute
- Prevents cascade failures
- Fails fast to save resources
- **Transition to HALF_OPEN:** After timeout period expires

### 3. HALF_OPEN (Recovery Testing)
- Limited number of requests allowed
- Tests if service has recovered
- On success: moves to CLOSED
- On failure: returns to OPEN and resets timeout

## Key Features

### Error Rate Monitoring
```typescript
// Tracks real-time error rates for each endpoint
- Failure count (consecutive failures)
- Success count (consecutive successes)
- Total requests and failures
- Error rate percentage (0-100%)
```

### Auto-Open Circuit
```typescript
// Opens circuit when:
- Consecutive failures >= failureThreshold (default: 5)
- Error rate >= errorRateThreshold (default: 50%)
```

### Half-Open Retry Logic
```typescript
// After timeout period:
1. Circuit transitions from OPEN to HALF_OPEN
2. Allows successThreshold number of requests (default: 3)
3. If all succeed: circuit CLOSES
4. If any fail: circuit returns to OPEN
```

### Fallback Strategies
```typescript
- Immediate rejection when OPEN (fail-fast)
- Gradual recovery testing in HALF_OPEN
- State management and time-based transitions
```

### Real-time Dashboard
```typescript
// Metrics include:
- Individual endpoint metrics
- System-wide health status (healthy/degraded/critical)
- Alert generation for state changes
- Recommendations for remediation
```

## Usage

### Basic Usage

```typescript
import { SupabaseCircuitBreaker } from './supabase-circuit-breaker';

const breaker = new SupabaseCircuitBreaker();

// Check circuit status
const result = await breaker.execute({
  action: 'check',
  endpoints: ['auth', 'health', 'realtime', 'functions'],
});

console.log(result.data?.metrics);
// {
//   totalEndpoints: 4,
//   openCircuits: 0,
//   halfOpenCircuits: 0,
//   closedCircuits: 4,
//   averageErrorRate: 2.5,
//   systemHealth: 'healthy'
// }
```

### Record Failures and Successes

```typescript
// Record a failure
const failureAlert = breaker.recordFailure('auth');
// failureAlert?.action === 'opened' when circuit opens

// Record a success
const successAlert = breaker.recordSuccess('auth');
// successAlert?.action === 'closed' when circuit closes
```

### Manual Control

```typescript
// Manually open a circuit
await breaker.execute({
  action: 'manual_open',
  targetEndpoint: 'realtime',
});

// Manually close a circuit
await breaker.execute({
  action: 'manual_close',
  targetEndpoint: 'realtime',
});

// Reset an endpoint
await breaker.execute({
  action: 'reset',
  targetEndpoint: 'auth',
});
```

### Health Report

```typescript
const report = await breaker.execute({
  action: 'health_report',
  endpoints: ['auth', 'health', 'realtime'],
});

console.log(report.data?.recommendations);
// [
//   'System is healthy. No action required.',
//   '1 circuit(s) are open. Check endpoint health.'
// ]
```

## Configuration

### Default Configuration

```typescript
const defaultConfig = {
  failureThreshold: 5,        // Failures to open circuit
  successThreshold: 3,        // Successes to close from HALF_OPEN
  timeout: 60000,             // Wait time before HALF_OPEN (ms)
  errorRateThreshold: 50,     // Error rate % to open
  monitoringWindow: 60000,    // Analysis window (ms)
};
```

### Custom Configuration

```typescript
const customConfig = {
  failureThreshold: 3,        // More aggressive
  successThreshold: 2,        // Faster recovery
  timeout: 30000,             // Quicker retry
  errorRateThreshold: 30,     // Lower threshold
};

const result = await breaker.execute({
  action: 'check',
  endpoints: ['auth', 'health'],
  config: customConfig,
});
```

## API Reference

### Skill Execution

```typescript
interface CircuitBreakerParams extends SkillInput {
  supabaseUrl?: string;                    // Optional: from vault
  supabaseKey?: string;                    // Optional: from vault
  endpoints?: string[];                    // Endpoints to monitor
  config?: CircuitBreakerConfig;           // Custom config
  action?: 'check' | 'reset' | 'manual_open'
           | 'manual_close' | 'health_report';
  targetEndpoint?: string;                 // For specific actions
}
```

### Result Format

```typescript
interface CircuitBreakerResult extends SkillOutput {
  data?: {
    metrics: CircuitBreakerMetrics;        // Endpoint metrics
    alerts: CircuitBreakerAlert[];         // State change alerts
    recommendations: string[];             // Recommendations
    timestamp: string;                     // ISO timestamp
    duration: number;                      // Execution time (ms)
  };
}
```

### Metrics Structure

```typescript
interface CircuitBreakerMetrics {
  timestamp: string;
  totalEndpoints: number;
  endpoints: Map<string, EndpointMetrics>;
  openCircuits: number;
  halfOpenCircuits: number;
  closedCircuits: number;
  averageErrorRate: number;                // 0-100
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

interface EndpointMetrics {
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: string;
  lastSuccessTime?: string;
  totalRequests: number;
  totalFailures: number;
  errorRate: number;
  stateChangeTime?: string;
}
```

## Alert Types

### Circuit Opened Alert
```typescript
{
  level: 'critical',
  endpoint: 'auth',
  action: 'opened',
  message: 'Circuit opened: 5 consecutive failures...',
  timestamp: '2024-02-06T...'
}
```

### Circuit Closed Alert
```typescript
{
  level: 'info',
  endpoint: 'auth',
  action: 'closed',
  message: 'Circuit closed: 3 consecutive successes...',
  timestamp: '2024-02-06T...'
}
```

### Half-Open Alert
```typescript
{
  level: 'warning',
  endpoint: 'realtime',
  action: 'half_open',
  message: 'Circuit entering HALF_OPEN: testing recovery...',
  timestamp: '2024-02-06T...'
}
```

## Health Status Calculation

- **HEALTHY**: No open circuits, error rate < 5%
- **DEGRADED**: Some open circuits or error rate 5-25%
- **CRITICAL**: >50% circuits open or error rate > 50%

## Integration Examples

### With Health Dashboard (S-13)

```typescript
import { runHealthDashboard } from './supabase-archon-index';
import { SupabaseCircuitBreaker } from './supabase-circuit-breaker';

// Get health metrics
const health = await runHealthDashboard();

// Use circuit breaker to handle failures
const breaker = new SupabaseCircuitBreaker();

if (health.data?.metrics.queries.slow_queries > 10) {
  breaker.recordFailure('queries');
}
```

### Monitoring Multiple Endpoints

```typescript
const ENDPOINTS = [
  'health',
  'auth',
  'realtime',
  'functions',
  'storage',
];

const result = await breaker.execute({
  action: 'check',
  endpoints: ENDPOINTS,
  config: {
    failureThreshold: 4,
    errorRateThreshold: 40,
  },
});

// React to different health states
if (result.data?.metrics.systemHealth === 'critical') {
  // Trigger alerts
  // Scale down non-essential services
  // Notify on-call engineers
}
```

## Testing

Run the comprehensive test suite:

```bash
npx ts-node test-circuit-breaker.ts
```

Tests cover:
- Initialization
- Endpoint registration
- Failure tracking
- Success tracking
- State transitions
- Reset functionality
- Manual control
- Metrics calculation
- Recommendations
- Error rate calculation

## Real-world Scenarios

### Scenario 1: Database Connection Failure
```
1. Database connection pool exhausted
2. Circuit records failures
3. After 5 consecutive failures, circuit OPENS
4. Requests rejected immediately (fail-fast)
5. After 60 seconds, circuit enters HALF_OPEN
6. Test queries attempt recovery
7. If 3 succeed, circuit CLOSES
```

### Scenario 2: API Rate Limiting
```
1. Supabase API returns 429 (rate limited)
2. Circuit tracks high error rate
3. When error rate > 50%, circuit OPENS
4. Prevents thundering herd problem
5. Gives API time to recover
```

### Scenario 3: Cascading Failures
```
1. Auth service fails
2. Other services depend on auth
3. Circuit breaker isolates auth endpoint
4. Other services use fallbacks/caching
5. Prevents full system outage
```

## Logging

All circuit breaker events are logged with structured JSON format:

```json
{
  "timestamp": "2024-02-06T10:30:45.123Z",
  "skill": "circuit-breaker",
  "level": "error",
  "message": "Circuit OPENED",
  "context": {
    "endpoint": "auth",
    "failureCount": 5,
    "errorRate": 75.5
  }
}
```

## Best Practices

1. **Set Appropriate Thresholds**
   - Use failureThreshold based on acceptable downtime
   - Error rate threshold should reflect SLA requirements
   - Timeout should allow sufficient recovery time

2. **Monitor Continuously**
   - Run circuit breaker checks frequently
   - Integrate with dashboards
   - Set up alerts for state changes

3. **Combine with Retry Logic**
   - Use circuit breaker for outer boundary
   - Use exponential backoff for inner retries
   - Avoid retrying when circuit is OPEN

4. **Test Graceful Degradation**
   - Have fallback strategies ready
   - Cache data when available
   - Provide degraded functionality

5. **Document Thresholds**
   - Document why specific thresholds chosen
   - Review periodically
   - Adjust based on monitoring data

## Troubleshooting

### Circuit Stuck in OPEN State
```typescript
// Check time since last failure
const metrics = breaker.getStatus();
const endpoint = metrics.endpoints.get('auth');

if (endpoint.state === 'OPEN') {
  const timeSinceFailure = Date.now() -
    new Date(endpoint.lastFailureTime).getTime();

  if (timeSinceFailure > config.timeout) {
    // Should be HALF_OPEN, check logs
    breaker.resetEndpoint('auth');
  }
}
```

### High False Positive Rate
```typescript
// Increase failure threshold
const config = {
  failureThreshold: 10,  // More tolerant
  errorRateThreshold: 60, // Higher threshold
  timeout: 120000,        // Longer timeout
};
```

### Recovery Not Happening
```typescript
// Ensure success threshold is reasonable
const config = {
  successThreshold: 2,    // Lower threshold
  timeout: 30000,         // Shorter timeout
};
```

## Future Enhancements

- [ ] Metrics persistence (Redis/Database)
- [ ] Distributed circuit breaker coordination
- [ ] Automatic threshold tuning
- [ ] Advanced analytics dashboard
- [ ] Integration with observability platforms
- [ ] Custom fallback handler functions
- [ ] Circuit breaker groups/chains

## Related Skills

- **S-13 Health Dashboard:** Real-time health monitoring
- **S-01 Schema Sentinel:** Schema change monitoring
- **S-08 Query Doctor:** Query performance analysis
- **S-11 Backup Driller:** Backup validation

## Support

For issues or questions:
1. Check logs: `console.log(JSON.parse(logEntry))`
2. Review metrics: `breaker.getStatus()`
3. Test manually: `test-circuit-breaker.ts`
4. Consult: Supabase Archon documentation

---

**Version:** 1.0.0
**Last Updated:** 2024-02-06
**Maintained by:** Supabase Archon Project
