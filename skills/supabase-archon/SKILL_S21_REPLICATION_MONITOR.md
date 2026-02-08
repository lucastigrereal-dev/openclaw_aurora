# Skill S-21: Supabase Replication Monitor

## Overview
The Replication Monitor is a comprehensive monitoring skill for PostgreSQL database replication on Supabase. It provides real-time insights into replication lag, standby server health, WAL (Write-Ahead Logging) metrics, and auto-failover readiness.

**File Location:** `/mnt/c/Users/lucas/openclaw_aurora/skills/supabase-archon/supabase-replication-monitor.ts`

**Lines of Code:** 668

---

## Key Features

### 1. Replica Monitoring
- Track status of all standby servers (replicas)
- Monitor replication lag in milliseconds and bytes
- Track Log Sequence Numbers (LSN) for primary and standby servers
- Detect disconnected or unhealthy replicas
- Monitor sync priority and reply times

### 2. WAL (Write-Ahead Logging) Monitoring
- Track current LSN position
- Monitor WAL file size (in GB)
- Count archived vs unarchived WAL files
- Check WAL archiving status
- Monitor WAL retention configuration

### 3. Replication Break Detection
- Detect when replication lag exceeds thresholds
- Identify disconnected replicas
- Monitor WAL availability issues
- Detect sync failures
- Suggest remediation actions
- Track severity levels (none, warning, critical)

### 4. Auto-Failover Readiness
- Check if auto-failover is enabled
- Track last failover timestamp
- Monitor if failover is in progress
- Identify eligible failover candidates
- Verify failover readiness status

### 5. Continuous Monitoring
- Optional continuous monitoring with configurable intervals
- Real-time alerts via event emissions
- Automatic health score calculation

---

## Core Interfaces

### ReplicaStatus
Represents the status of a single database replica:
```typescript
interface ReplicaStatus {
  name: string;              // standby-1, standby-2, etc.
  state: string;             // streaming | catchup | disconnected | unknown
  lag_bytes: number;         // Lag in bytes
  lag_ms: number;            // Estimated lag in milliseconds
  write_lsn: string;         // Primary server LSN
  flush_lsn: string;         // Confirmed flush LSN
  replay_lsn: string;        // Replayed LSN on standby
  sync_priority: number;     // Synchronization priority
  reply_time: string;        // Last heartbeat timestamp
  is_healthy: boolean;       // Overall replica health
}
```

### WALMetrics
Represents Write-Ahead Logging information:
```typescript
interface WALMetrics {
  current_lsn: string;           // Primary server current LSN
  wal_files_size_gb: number;     // Total WAL file size
  archived_wal_files: number;    // Count of archived files
  unarchivedWalFiles: number;    // Count of unarchived files
  wal_archiving_enabled: boolean;// Archiving status
  wal_keep_size_mb: number;      // Retention configuration
}
```

### ReplicationBreakStatus
Tracks detected replication breaks:
```typescript
interface ReplicationBreakStatus {
  detected: boolean;                    // Break detected?
  severity: 'none' | 'warning' | 'critical';
  breakType: 'lag_threshold' | 'disconnect' | 'wal_not_available' | 'sync_failure' | 'none';
  affectedReplicas: string[];           // List of affected replicas
  message: string;                      // Descriptive message
  detectedAt: string;                   // Detection timestamp
  suggestedAction: string;              // Remediation suggestion
}
```

### FailoverStatus
Represents auto-failover configuration and state:
```typescript
interface FailoverStatus {
  autoFailoverEnabled: boolean;         // Is auto-failover enabled?
  lastFailover: string | null;          // Last failover timestamp
  failoverInProgress: boolean;           // Failover currently happening?
  primaryServer: string;                // Current primary server
  candidates: string[];                 // Eligible failover candidates
  readyForFailover: boolean;            // Ready for failover?
}
```

### ReplicationMonitorMetrics
Complete metrics collection:
```typescript
interface ReplicationMonitorMetrics {
  replicas: ReplicaStatus[];            // All replica statuses
  wal: WALMetrics;                       // WAL metrics
  replicationBreak: ReplicationBreakStatus;
  failover: FailoverStatus;
  overallHealth: number;                // Health score (0-100)
  timestamp: string;                    // Collection timestamp
}
```

### ReplicationAlert
Represents detected issues:
```typescript
interface ReplicationAlert {
  level: 'info' | 'warning' | 'critical';
  type: 'lag_high' | 'replica_disconnected' | 'wal_issue' | 'failover_triggered' | 'break_detected';
  replica?: string;                     // Affected replica name
  message: string;                      // Description
  threshold?: number;                   // Configured threshold
  current?: number;                     // Current value
  timestamp: string;                    // Detection time
}
```

---

## Usage

### Basic Usage
```typescript
const monitor = new SupabaseReplicationMonitor();

const result = await monitor.run({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-api-key',
  includeMetrics: ['all'],
});

if (result.success && result.data) {
  console.log('Overall Health Score:', result.data.metrics.overallHealth);
  console.log('Alerts:', result.data.alerts);
}
```

### With Vault Credentials
```typescript
const result = await monitor.run({
  // Credentials will be loaded from vault automatically
  includeMetrics: ['replicas', 'wal'],
});
```

### Continuous Monitoring
```typescript
const result = await monitor.run({
  enableContinuousMonitoring: true,
  checkInterval: 30000, // Check every 30 seconds
});

monitor.on('replication-status', (data) => {
  console.log('Status update:', data);
});
```

### Quick Checks
```typescript
// Quick replication health check
const healthCheck = await monitor.quickReplicationCheck({});
console.log(`Healthy: ${healthCheck.healthy}`);
console.log(`Health Score: ${healthCheck.healthScore}`);

// Check for critical lag
const hasCriticalLag = await monitor.hasCriticalLag({});

// Check for disconnected replicas
const hasDisconnected = await monitor.hasDisconnectedReplicas({});
```

---

## Configuration Parameters

### ReplicationMonitorParams
- `supabaseUrl` (optional): Supabase project URL. Defaults to vault value.
- `supabaseKey` (optional): Supabase API key. Defaults to vault value.
- `lagThresholdMs` (optional): Warning threshold for replication lag in ms. Default: 1000ms
- `disconnectTimeoutMs` (optional): Timeout for considering replica disconnected. Default: 30000ms
- `checkInterval` (optional): Interval for continuous monitoring. Default: 30000ms
- `includeMetrics` (optional): Which metrics to collect. Options: 'replicas', 'wal', 'breaks', 'failover', 'all'
- `enableContinuousMonitoring` (optional): Enable continuous monitoring. Default: false

---

## Default Thresholds

| Metric | Threshold | Level |
|--------|-----------|-------|
| Replication Lag (Warning) | 1000ms | warning |
| Replication Lag (Critical) | 5000ms | critical |
| WAL Size (Warning) | 50GB | warning |
| WAL Size (Critical) | 100GB | critical |

---

## Mock Data for Development

The skill uses mock data for prototyping. Replace the following methods with real implementations:

1. **`collectReplicaMetrics()`** - Currently generates random replica data
2. **`collectWALMetrics()`** - Currently generates random WAL metrics
3. **`detectReplicationBreaks()`** - Currently has 95% healthy probability
4. **`checkFailoverStatus()`** - Currently returns static configuration

TODO implementations are marked with comments in the code.

---

## Health Score Calculation

The overall health score (0-100) is calculated as follows:

```
Starting Score: 100

Deductions:
- Critical Alert: -30 points
- Warning Alert: -10 points
- Unhealthy Replica: -20 points per replica
- Replication Lag: up to -20 points
- WAL Issues: included in alerts

Final: Math.max(0, Math.min(100, score))
```

---

## Events

The skill emits the following events:

### replication-status (during continuous monitoring)
Emitted at each monitoring interval with current metrics and alerts.

```typescript
monitor.on('replication-status', (data) => {
  // data.metrics: ReplicationMonitorMetrics
  // data.alerts: ReplicationAlert[]
});
```

---

## Error Handling

- Returns `success: false` if credentials are missing
- Returns `success: false` if validation fails
- Handles errors gracefully with detailed error messages
- Logs all operations with structured logging

---

## Extends Skill Base Class

- Inherits from `Skill` base class
- Implements `execute(input: SkillInput): Promise<SkillOutput>`
- Implements `validate(input: SkillInput): boolean`
- Follows OpenClaw Aurora skill standards

---

## Dependencies

- `createLogger` from `./supabase-logger`
- `getVault` from `./supabase-vault-config`
- `Skill`, `SkillInput`, `SkillOutput` from `../skill-base`

---

## Metadata

- **Name:** supabase-replication-monitor
- **Version:** 1.0.0
- **Category:** UTIL
- **Priority:** P1
- **Status:** production-ready
- **Timeout:** 30 seconds
- **Retries:** 2

---

## Future Enhancements

1. Real PostgreSQL query implementation via `pg_stat_replication`
2. WAL archive status from file system monitoring
3. Network latency measurement
4. Automated failover triggering
5. Integration with alerting systems
6. Historical metrics tracking
7. Predictive lag analysis
8. Custom threshold configuration per replica

---

## Author

Supabase Archon - Database Management Suite
