# Skill S-21: Replication Monitor - Quick Reference

## File Location
```
/mnt/c/Users/lucas/openclaw_aurora/skills/supabase-archon/supabase-replication-monitor.ts
```

## Quick Import
```typescript
import { SupabaseReplicationMonitor } from './skills/supabase-archon/supabase-replication-monitor';
```

## Instantiation & Basic Usage
```typescript
// Create instance
const monitor = new SupabaseReplicationMonitor();

// Run monitoring
const result = await monitor.run({
  includeMetrics: ['all']
});

// Access results
if (result.success && result.data) {
  console.log(result.data.metrics);
  console.log(result.data.alerts);
  console.log(`Health Score: ${result.data.metrics.overallHealth}/100`);
}
```

## Core Interfaces Quick Reference

### ReplicaStatus
```typescript
interface ReplicaStatus {
  name: string;           // "standby-1", "standby-2", etc.
  state: 'streaming' | 'catchup' | 'disconnected' | 'unknown';
  lag_bytes: number;      // Bytes behind
  lag_ms: number;         // Milliseconds behind
  write_lsn: string;      // Primary server LSN position
  flush_lsn: string;      // Confirmed flush LSN
  replay_lsn: string;     // Replayed LSN on standby
  sync_priority: number;  // Synchronization priority
  reply_time: string;     // Last heartbeat timestamp
  is_healthy: boolean;    // Overall health status
}
```

### WALMetrics
```typescript
interface WALMetrics {
  current_lsn: string;           // Current LSN
  wal_files_size_gb: number;     // Total size
  archived_wal_files: number;    // Count archived
  unarchivedWalFiles: number;    // Count not archived
  wal_archiving_enabled: boolean;// Is archiving on?
  wal_keep_size_mb: number;      // Retention size
}
```

### ReplicationBreakStatus
```typescript
interface ReplicationBreakStatus {
  detected: boolean;
  severity: 'none' | 'warning' | 'critical';
  breakType: 'lag_threshold' | 'disconnect' | 'wal_not_available' | 'sync_failure' | 'none';
  affectedReplicas: string[];
  message: string;
  detectedAt: string;
  suggestedAction: string;
}
```

### FailoverStatus
```typescript
interface FailoverStatus {
  autoFailoverEnabled: boolean;
  lastFailover: string | null;
  failoverInProgress: boolean;
  primaryServer: string;
  candidates: string[];
  readyForFailover: boolean;
}
```

## Input Parameters

```typescript
interface ReplicationMonitorParams {
  supabaseUrl?: string;              // Project URL (or from vault)
  supabaseKey?: string;              // API key (or from vault)
  lagThresholdMs?: number;           // Default: 1000ms
  disconnectTimeoutMs?: number;      // Default: 30000ms
  checkInterval?: number;            // Interval in ms
  includeMetrics?: ('replicas' | 'wal' | 'breaks' | 'failover' | 'all')[];
  enableContinuousMonitoring?: boolean;
}
```

## Common Patterns

### 1. Quick Health Check
```typescript
const monitor = new SupabaseReplicationMonitor();
const result = await monitor.execute({});
console.log(`Health: ${result.data?.metrics.overallHealth}/100`);
```

### 2. Check for Critical Issues
```typescript
const hasCriticalLag = await monitor.hasCriticalLag({});
const hasDisconnected = await monitor.hasDisconnectedReplicas({});

if (hasCriticalLag || hasDisconnected) {
  // Take action
}
```

### 3. Specific Metrics Only
```typescript
const result = await monitor.execute({
  includeMetrics: ['replicas', 'failover']
});
```

### 4. Custom Thresholds
```typescript
const result = await monitor.execute({
  lagThresholdMs: 500,  // More aggressive
  includeMetrics: ['all']
});
```

### 5. Continuous Monitoring
```typescript
await monitor.execute({
  enableContinuousMonitoring: true,
  checkInterval: 30000  // Every 30 seconds
});

monitor.on('replication-status', (data) => {
  console.log(`Status: ${data.metrics.overallHealth}/100`);
  if (data.alerts.length > 0) {
    console.log('Alerts:', data.alerts);
  }
});

// Later: stop monitoring
monitor.stopContinuousMonitoring();
```

### 6. Alert Processing
```typescript
const result = await monitor.execute({});
if (result.data) {
  const criticalAlerts = result.data.alerts.filter(a => a.level === 'critical');

  for (const alert of criticalAlerts) {
    console.log(`[CRITICAL] ${alert.type}: ${alert.message}`);
  }
}
```

## Alert Types

| Type | Level | Trigger |
|------|-------|---------|
| `lag_high` | warning/critical | Replication lag exceeds threshold |
| `replica_disconnected` | critical | Replica state becomes disconnected |
| `wal_issue` | warning/critical | WAL file size exceeds threshold |
| `failover_triggered` | critical | Failover is in progress |
| `break_detected` | warning/critical | Replication break detected |

## Health Score Ranges

| Score | Status | Action |
|-------|--------|--------|
| 80-100 | Healthy | Normal monitoring |
| 60-79 | Warning | Monitor closely |
| 40-59 | Critical | Investigate issues |
| 0-39 | Severe | Immediate action needed |

## Configuration Examples

### Development (Relaxed Thresholds)
```typescript
{
  lagThresholdMs: 5000,
  disconnectTimeoutMs: 60000,
  includeMetrics: ['all']
}
```

### Production (Strict Thresholds)
```typescript
{
  lagThresholdMs: 100,
  disconnectTimeoutMs: 10000,
  enableContinuousMonitoring: true,
  checkInterval: 10000,
  includeMetrics: ['all']
}
```

## Output Structure

```typescript
interface ReplicationMonitorResult {
  success: boolean;
  error?: string;
  duration?: number;
  data?: {
    metrics: {
      replicas: ReplicaStatus[];
      wal: WALMetrics;
      replicationBreak: ReplicationBreakStatus;
      failover: FailoverStatus;
      overallHealth: number;        // 0-100
      timestamp: string;
    };
    alerts: ReplicationAlert[];
    timestamp: string;
    checkDuration: number;
  };
}
```

## Helper Methods

### quickReplicationCheck()
```typescript
const check = await monitor.quickReplicationCheck({});
console.log({
  healthy: check.healthy,           // boolean
  healthScore: check.healthScore,   // 0-100
  criticalIssues: check.criticalIssues  // string[]
});
```

### hasCriticalLag()
```typescript
if (await monitor.hasCriticalLag({})) {
  console.log('Replication lag is critical!');
}
```

### hasDisconnectedReplicas()
```typescript
if (await monitor.hasDisconnectedReplicas({})) {
  console.log('Some replicas are disconnected!');
}
```

## Monitoring Integration

### With Event System
```typescript
const monitor = new SupabaseReplicationMonitor();

monitor.on('replication-status', (data) => {
  // Emitted during continuous monitoring
  console.log('Metrics:', data.metrics);
});

monitor.on('error', (data) => {
  console.error('Monitoring error:', data.error);
});
```

### SkillRegistry Integration
```typescript
const registry = getSkillRegistry();
const monitor = new SupabaseReplicationMonitor();
registry.register(monitor);

// Execute via registry
const result = await registry.execute('supabase-replication-monitor', {
  includeMetrics: ['all']
});
```

## Metadata

```
Name:     supabase-replication-monitor
Version:  1.0.0
Category: UTIL
Timeout:  30 seconds
Retries:  2
Tags:     supabase, replication, monitoring, failover, wal, high-availability
```

## Mock Data Note

The skill currently uses mock data for:
- Replica metrics collection
- WAL metrics collection
- Replication break detection
- Failover status checking

All marked with TODO comments for real implementation.

## Production Checklist

- [ ] Implement real replica metrics collection (pg_stat_replication)
- [ ] Implement real WAL metrics collection
- [ ] Implement real replication break detection
- [ ] Configure real failover detection
- [ ] Test with production Supabase instance
- [ ] Set appropriate thresholds for environment
- [ ] Configure alert recipients
- [ ] Set up continuous monitoring
- [ ] Document runbook and procedures
- [ ] Create monitoring dashboard

## Support Files

- **Main File:** `/mnt/c/Users/lucas/openclaw_aurora/skills/supabase-archon/supabase-replication-monitor.ts`
- **Documentation:** `/mnt/c/Users/lucas/openclaw_aurora/skills/supabase-archon/SKILL_S21_REPLICATION_MONITOR.md`
- **Summary:** `/mnt/c/Users/lucas/openclaw_aurora/S21_CREATION_SUMMARY.txt`

---

**Status:** Production-Ready with Mock Data
**Last Updated:** 2026-02-06
**Author:** Supabase Archon
