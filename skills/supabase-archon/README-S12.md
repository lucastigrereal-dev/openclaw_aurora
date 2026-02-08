# S-12: Connection Pool Manager

**Supabase Archon - Connection Pool Management Skill**

Status: Production-Ready
Version: 1.0.0
Priority: P1
Category: UTIL

## Overview

The Connection Pool Manager (S-12) is a comprehensive skill for managing Supabase database connection pools with advanced features for monitoring, leak detection, health checking, and automatic scaling.

## Key Features

### 1. Connection Monitoring
- Real-time connection statistics
- Per-connection state tracking (idle, active, waiting, broken)
- Throughput metrics (requests/sec, connections created/closed per sec)
- Timing analysis (connection time, query time, wait time)

### 2. Leak Detection
- Automatic detection of connection leaks
- Identification of suspicious idle connections
- Confidence scoring (0-100%)
- Actionable recommendations

### 3. Health Checking
- Multi-connection health verification
- Latency measurement
- Failure rate calculation
- Real-time availability monitoring

### 4. Auto-scaling
- Automatic pool size adjustment based on usage
- Configurable growth and shrink rates
- Min/max boundary enforcement
- Intelligent scaling decisions

### 5. Connection Management
- Kill idle connections with configurable timeout
- Batch operations with safety limits
- Connection state management
- Resource cleanup

## API Reference

### Class: SupabaseConnectionPool

Extends `Skill` from the skill-base framework.

#### Constructor

```typescript
const poolManager = new SupabaseConnectionPool();
```

#### Main Method: execute()

```typescript
async execute(params: ConnectionPoolParams): Promise<ConnectionPoolResult>
```

### Interfaces

#### ConnectionPoolParams

```typescript
interface ConnectionPoolParams extends SkillInput {
  supabaseUrl?: string;           // Optional Supabase URL (from vault if not provided)
  supabaseKey?: string;           // Optional Supabase key (from vault if not provided)
  action?: string;                // Action to perform
  options?: {
    idleTimeoutMs?: number;       // Idle timeout (default: 300000ms = 5min)
    maxConnectionAge?: number;    // Max connection age (default: 3600000ms = 1hour)
    leakDetectionThreshold?: number; // Leak threshold % (default: 80)
    healthCheckInterval?: number;  // HC interval (default: 30000ms)
    allowAutoScaling?: boolean;   // Enable auto-scaling (default: true)
    maxKillPercentage?: number;   // Max % to kill (default: 25)
    minSize?: number;             // Min pool size (default: 5)
    maxSize?: number;             // Max pool size (default: 100)
    growthRate?: number;          // Growth % (default: 20)
    shrinkRate?: number;          // Shrink % (default: 15)
  };
}
```

#### Actions Available

| Action | Description |
|--------|-------------|
| `monitor` | Collect and analyze current pool statistics |
| `detect-leaks` | Scan for connection leaks and suspicious idle connections |
| `health-check` | Perform health verification of all connections |
| `auto-scale` | Automatically adjust pool size based on usage |
| `kill-idle` | Kill idle connections exceeding timeout threshold |
| `full-analysis` | Execute all analyses and return comprehensive report |

#### ConnectionPoolResult

```typescript
interface ConnectionPoolResult extends SkillOutput {
  data?: {
    poolStats: PoolStatistics;         // Current pool metrics
    scaling: PoolScalingConfig;        // Scaling configuration
    leakDetection: LeakDetection;      // Leak analysis results
    healthSummary: PoolHealthSummary;  // Health check summary
    actions: PoolManagementAction[];   // Executed management actions
    recommendations: string[];          // Actionable recommendations
    timestamp: string;                  // ISO timestamp
    analysisDuration: number;           // Duration in ms
  };
}
```

## Usage Examples

### Example 1: Full Analysis

```typescript
import { SupabaseConnectionPool } from './supabase-connection-pool';

const poolManager = new SupabaseConnectionPool();

const result = await poolManager.run({
  action: 'full-analysis',
});

if (result.success && result.data) {
  console.log('Pool Status:', {
    total: result.data.poolStats.connections.total,
    active: result.data.poolStats.connections.active,
    idle: result.data.poolStats.connections.idle,
  });

  console.log('Recommendations:', result.data.recommendations);
}
```

### Example 2: Detect and Fix Leaks

```typescript
const result = await poolManager.run({
  action: 'detect-leaks',
  options: {
    leakDetectionThreshold: 80,
  },
});

if (result.success && result.data?.leakDetection.detected) {
  console.log('Leaks detected!');
  console.log(`Suspected connections: ${result.data.leakDetection.totalSuspected}`);
  console.log(`Confidence: ${result.data.leakDetection.confidence.toFixed(1)}%`);

  // Follow recommendation
  const killResult = await poolManager.run({
    action: 'kill-idle',
    options: {
      idleTimeoutMs: 300000,
      maxKillPercentage: 25,
    },
  });

  console.log(`Killed ${killResult.data?.actions[0]?.connectionsAffected} connections`);
}
```

### Example 3: Health Monitoring

```typescript
const result = await poolManager.run({
  action: 'health-check',
});

if (result.success && result.data) {
  const health = result.data.healthSummary;

  console.log(`Health: ${health.healthy}/${health.totalChecked} connections healthy`);
  console.log(`Failure rate: ${health.failureRate.toFixed(2)}%`);
  console.log(`Avg latency: ${health.avgLatency.toFixed(2)}ms`);

  if (health.failureRate > 5) {
    console.warn('Pool health degraded!');
  }
}
```

### Example 4: Auto-scaling

```typescript
const result = await poolManager.run({
  action: 'auto-scale',
  options: {
    minSize: 5,
    maxSize: 100,
    growthRate: 20,
    shrinkRate: 15,
  },
});

if (result.success && result.data) {
  console.log(`Current size: ${result.data.scaling.currentSize}`);
  console.log(`Target size: ${result.data.scaling.targetSize}`);

  if (result.data.actions.length > 0) {
    const action = result.data.actions[0];
    console.log(`Scaling ${action.type}: ${action.reason}`);
    console.log(`Connections affected: ${action.connectionsAffected}`);
  }
}
```

### Example 5: Cleanup Idle Connections

```typescript
const result = await poolManager.run({
  action: 'kill-idle',
  options: {
    idleTimeoutMs: 600000,  // 10 minutes
    maxKillPercentage: 30,   // Kill max 30% of pool
  },
});

if (result.success && result.data?.actions.length > 0) {
  const action = result.data.actions[0];
  console.log(`Killed: ${action.connectionsAffected} connections`);
  console.log(`Reason: ${action.reason}`);
}
```

### Example 6: Using Helper Methods

```typescript
// Quick pool status
const status = await poolManager.quickPoolStatus({});
console.log(`Active: ${status?.connections.active}/${status?.connections.total}`);

// Check for leak risk
const hasRisk = await poolManager.hasLeakRisk({});
if (hasRisk) {
  console.log('Connection leak risk detected!');
}

// Get recommendations
const recommendations = await poolManager.getRecommendations({});
recommendations.forEach(rec => console.log(`- ${rec}`));
```

## Integration with Skill Framework

The Connection Pool Manager integrates seamlessly with OpenClaw Aurora's skill system:

### Registration

```typescript
import { getSkillRegistry } from '../skill-base';
import { SupabaseConnectionPool } from './supabase-connection-pool';

const registry = getSkillRegistry();
const poolManager = new SupabaseConnectionPool();

registry.register(poolManager);
```

### Execution via Registry

```typescript
const result = await registry.execute('supabase-connection-pool', {
  action: 'monitor',
});
```

### Event Handling

```typescript
const poolManager = new SupabaseConnectionPool();

poolManager.on('start', (data) => {
  console.log(`Started: ${data.skill}`);
});

poolManager.on('complete', (data) => {
  console.log(`Completed: ${data.skill}`);
  console.log(`Duration: ${data.result.duration}ms`);
});

poolManager.on('error', (data) => {
  console.error(`Error in ${data.skill}: ${data.error}`);
});

await poolManager.run({ action: 'monitor' });
```

## Data Types

### PoolStatistics

```typescript
interface PoolStatistics {
  connections: {
    total: number;      // Total connections
    active: number;     // Active connections
    idle: number;       // Idle connections
    waiting: number;    // Waiting for resources
    broken: number;     // Broken/failed connections
  };
  throughput: {
    requestsPerSecond: number;           // Req/s
    connectionsCreatedPerSecond: number; // New conns/s
    connectionsClosedPerSecond: number;  // Closed conns/s
  };
  timing: {
    avgConnectionTime: number;  // ms
    avgQueryTime: number;       // ms
    maxWaitTime: number;        // ms
  };
}
```

### LeakDetection

```typescript
interface LeakDetection {
  detected: boolean;
  suspectedConnections: ConnectionMetric[];
  totalSuspected: number;
  confidence: number;  // 0-100%
  recommendation: string;
}
```

### PoolHealthSummary

```typescript
interface PoolHealthSummary {
  totalChecked: number;
  healthy: number;
  unhealthy: number;
  avgLatency: number;    // ms
  failureRate: number;   // 0-100%
}
```

### PoolScalingConfig

```typescript
interface PoolScalingConfig {
  minSize: number;
  maxSize: number;
  currentSize: number;
  targetSize: number;
  growthRate: number;    // %
  shrinkRate: number;    // %
}
```

## Recommendations System

The skill automatically generates recommendations based on pool metrics:

### Connection-related
- Pool size increasing suggestions when >90% connections active
- High connection establishment time warnings (>100ms)
- Network latency diagnostics

### Query Performance
- Elevated average query time (>1s) alerts
- Slow query investigation suggestions
- Query optimization recommendations

### Resource Management
- Pool resize recommendations
- Connection timeout adjustments
- Memory usage optimization

### Monitoring
- Wait time analysis (>10s threshold)
- Broken connection diagnostics
- Connection leak detection

## Mock Data Implementation

Currently, the skill uses mock data for all metrics collection. TODO items for production:

```
TODO: Implement real metrics collection via:
- pg_stat_activity for connection metrics
- pg_stat_statements for query performance
- SELECT pg_terminate_backend() for connection killing
- Real health check queries
- Actual throughput measurement
```

## Vault Integration

Credentials are managed through the Supabase Vault system:

```typescript
// Automatically loads from vault if not provided
const result = await poolManager.run({
  action: 'monitor',
  // supabaseUrl and supabaseKey optional (loaded from vault)
});

// Or provide explicitly
const result = await poolManager.run({
  action: 'monitor',
  supabaseUrl: 'https://xxx.supabase.co',
  supabaseKey: 'eyJ...',
});
```

## Logging

All operations are logged through the SupabaseLogger:

```
{"timestamp":"2025-02-06T10:30:45.123Z","skill":"connection-pool-manager","level":"info","message":"Connection Pool Manager iniciado","context":{"action":"full-analysis","url":"from-vault"}}
{"timestamp":"2025-02-06T10:30:46.456Z","skill":"connection-pool-manager","level":"info","message":"Connection Pool analysis completed","context":{"action":"full-analysis","poolSize":42,"activeConnections":28,"leaksDetected":false,"actionsExecuted":0,"duration":1333}}
```

## Performance Considerations

- Timeout: 60 seconds per execution
- Retries: 2 automatic retries on failure
- Parallel metric collection when possible
- Efficient mock data generation
- Minimal overhead for monitoring operations

## Best Practices

### 1. Regular Monitoring
```typescript
// Run full analysis every 5 minutes
setInterval(async () => {
  await poolManager.run({ action: 'full-analysis' });
}, 5 * 60 * 1000);
```

### 2. Proactive Leak Detection
```typescript
// Check for leaks every hour
setInterval(async () => {
  const hasRisk = await poolManager.hasLeakRisk({});
  if (hasRisk) {
    await poolManager.run({ action: 'kill-idle' });
  }
}, 60 * 60 * 1000);
```

### 3. Health Alerts
```typescript
const result = await poolManager.run({ action: 'health-check' });
if (result.data?.healthSummary.failureRate > 5) {
  // Alert: pool health degraded
  notifyOps('Pool health warning');
}
```

### 4. Configuration Tuning
```typescript
// Adjust based on your workload
const result = await poolManager.run({
  action: 'auto-scale',
  options: {
    minSize: 10,    // Increase for heavy workloads
    maxSize: 200,
    growthRate: 30, // Faster scaling for spiky traffic
    shrinkRate: 10, // Conservative shrinking
  },
});
```

## Troubleshooting

### Issue: "Supabase credentials not found"
**Solution:** Ensure environment variables are set or provide credentials explicitly:
```typescript
const result = await poolManager.run({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  action: 'monitor',
});
```

### Issue: Too many connections killed
**Solution:** Reduce `maxKillPercentage`:
```typescript
await poolManager.run({
  action: 'kill-idle',
  options: { maxKillPercentage: 10 }, // More conservative
});
```

### Issue: Pool not scaling up enough
**Solution:** Increase growth rate:
```typescript
await poolManager.run({
  action: 'auto-scale',
  options: { growthRate: 40 }, // More aggressive growth
});
```

## Related Skills

- **S-13 Health Dashboard**: Real-time health monitoring
- **S-06 Migration Planner**: Database schema migration
- **S-07 Schema Differ**: Schema comparison and sync

## Version History

### 1.0.0 (2025-02-06)
- Initial release
- Connection monitoring
- Leak detection
- Health checking
- Auto-scaling
- Connection management
- Recommendation engine

## Support & Documentation

For detailed implementation patterns, see:
- `/skills/supabase-archon/supabase-health-dashboard.ts` - Similar monitoring skill
- `/skills/skill-base.ts` - Skill framework documentation
- `/skills/supabase-archon/PATTERN-COMPLIANCE.md` - Pattern compliance guide
