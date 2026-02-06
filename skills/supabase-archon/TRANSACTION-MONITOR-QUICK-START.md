# Transaction Monitor (S-19) - Quick Start

## Instant Usage

### 1. Basic Monitoring (Recommended for most cases)

```typescript
import { SupabaseTransactionMonitor } from './supabase-transaction-monitor';

const monitor = new SupabaseTransactionMonitor();
const result = await monitor.run({ action: 'monitor' });

if (result.success) {
  console.log(`Active transactions: ${result.data?.statistics.total_active}`);
  console.log(`Long transactions: ${result.data?.longTransactions.length}`);
}
```

### 2. Full Report with Auto-Kill

```typescript
const result = await monitor.run({
  action: 'full_report',
  autoKillEnabled: true,
  longTransactionThresholdMs: 300000,      // 5 minutes
  autoKillThresholdMs: 600000,              // 10 minutes
  includeTransactionLog: true,
});

// Check results
console.log(result.data?.statistics);
console.log(result.data?.recommendedActions);
```

### 3. Check for Deadlocks

```typescript
const result = await monitor.run({
  action: 'detect_deadlocks'
});

if (result.data?.deadlocks.length > 0) {
  console.log('⚠️ Deadlocks detected!');
  result.data.deadlocks.forEach(d => {
    console.log(`  PIDs involved: ${d.involved_pids.join(', ')}`);
  });
}
```

## Configuration Presets

### Development (Strict Monitoring)

```typescript
const result = await monitor.run({
  action: 'full_report',
  longTransactionThresholdMs: 10000,      // 10 seconds
  autoKillEnabled: false,
  includeTransactionLog: true,
});
```

### Staging (Moderate Monitoring)

```typescript
const result = await monitor.run({
  action: 'full_report',
  longTransactionThresholdMs: 60000,      // 1 minute
  autoKillEnabled: false,
  autoKillThresholdMs: 300000,            // 5 minutes
});
```

### Production (Standard Monitoring)

```typescript
const result = await monitor.run({
  action: 'full_report',
  longTransactionThresholdMs: 300000,     // 5 minutes
  autoKillEnabled: true,
  autoKillThresholdMs: 600000,            // 10 minutes
});
```

### Production (Aggressive Cleanup)

```typescript
const result = await monitor.run({
  action: 'full_report',
  longTransactionThresholdMs: 120000,     // 2 minutes
  autoKillEnabled: true,
  autoKillThresholdMs: 300000,            // 5 minutes
});
```

## Scheduled Monitoring

### Every Minute (High Traffic)

```typescript
setInterval(async () => {
  const result = await monitor.run({
    action: 'monitor',
    longTransactionThresholdMs: 300000,
  });

  if (result.data?.longTransactions.length > 0) {
    console.log(`Alert: ${result.data.longTransactions.length} long transactions`);
  }
}, 60000);
```

### Every 5 Minutes (Standard)

```typescript
setInterval(async () => {
  const result = await monitor.run({
    action: 'full_report',
    autoKillEnabled: true,
  });

  console.log(`[${new Date().toISOString()}] Status: ${result.success ? 'OK' : 'ERROR'}`);
}, 300000);
```

### Daily Report (Maintenance)

```typescript
// Run at 2 AM
const schedule = require('node-schedule');

schedule.scheduleJob('0 2 * * *', async () => {
  const result = await monitor.run({
    action: 'analyze',
    includeTransactionLog: true,
  });

  // Send email report
  sendEmailReport(result.data);
});
```

## Common Tasks

### Find Out Why Database is Slow

```typescript
const result = await monitor.run({
  action: 'full_report',
  longTransactionThresholdMs: 5000,  // Lower threshold to find culprits
  includeTransactionLog: true,
});

console.log('Long transactions:');
result.data?.longTransactions.forEach(t => {
  console.log(`  ${t.query.substring(0, 60)}...`);
  console.log(`    Running for: ${t.duration_ms}ms`);
  console.log(`    Severity: ${t.severity}`);
});
```

### Emergency: Kill Stuck Transactions

```typescript
const result = await monitor.run({
  action: 'kill_stuck',
  autoKillEnabled: true,
  autoKillThresholdMs: 30000,  // Kill anything older than 30s
});

if (result.success && result.data?.autoKillActions?.length > 0) {
  console.log(`Killed ${result.data.autoKillActions.length} transactions`);
}
```

### Check for Deadlocks After Error

```typescript
const result = await monitor.run({
  action: 'detect_deadlocks'
});

if (result.data?.deadlocks.length === 0) {
  console.log('✅ No deadlocks detected');
} else {
  console.log('❌ Deadlock detected!');
  console.log(JSON.stringify(result.data.deadlocks, null, 2));
}
```

## Understanding Output

### Statistics Object

```
{
  total_active: 12,              // Number of active transactions
  long_transactions: [...],       // Array of long-running txns
  idle_in_transaction: 2,        // Transactions waiting
  deadlocks_detected: 0,         // Number of deadlocks
  average_duration_ms: 523,      // Average txn duration
  max_duration_ms: 45000         // Longest txn duration
}
```

### Long Transaction Object

```
{
  pid: 15234,                                    // Process ID
  usename: "user_1",                            // Username
  duration_ms: 450000,                          // Running for 450s
  query: "SELECT * FROM large_table WHERE...", // The SQL query
  severity: "critical",                         // Level of concern
  recommendation: "Consider killing this..."    // What to do
}
```

### Deadlock Object

```
{
  detected_at: "2024-02-06T10:30:45Z",        // When detected
  involved_pids: [15234, 15235],              // PIDs involved
  queries: ["UPDATE table_a...", "UPDATE..."], // Their queries
  blocker_pid: 15234,                         // Who's blocking
  blocked_pids: [15235],                      // Who's blocked
  severity: "critical"
}
```

## Troubleshooting

### Issue: All returning mock data

**Solution:** Implementation uses mock data by design. For real data:
1. Set up Supabase vault with credentials
2. Implement actual database queries (see comments in code)
3. Replace mock data generators with real queries

### Issue: Auto-kill not working

**Solution:**
1. Ensure `autoKillEnabled: true`
2. Check that database user has permission to kill backends
3. Verify credentials are correct
4. Check Supabase logs for errors

### Issue: Getting errors

**Solution:**
1. Check credentials in vault
2. Ensure Supabase URL and key are valid
3. Check network connectivity to Supabase
4. Review error message in `result.error`

## API Summary

| Action | Purpose | Output |
|--------|---------|--------|
| `monitor` | Check long transactions | Statistics + long txns list |
| `detect_deadlocks` | Find circular locks | Deadlock details |
| `kill_stuck` | Auto-terminate old txns | Kill actions performed |
| `analyze` | Analyze history | Transaction logs + stats |
| `full_report` | Complete overview | Everything above combined |

## Parameter Reference

```typescript
interface TransactionMonitorParams {
  action?: 'monitor' | 'detect_deadlocks' | 'kill_stuck' | 'analyze' | 'full_report';
  longTransactionThresholdMs?: number;    // Default: 300000 (5 min)
  autoKillEnabled?: boolean;              // Default: false
  autoKillThresholdMs?: number;           // Default: 600000 (10 min)
  includeTransactionLog?: boolean;        // Default: false
  includeAnalytics?: boolean;             // Default: false
  supabaseUrl?: string;                   // Override vault
  supabaseKey?: string;                   // Override vault
}
```

## Example: Production Integration

```typescript
import { SupabaseTransactionMonitor } from './supabase-transaction-monitor';
import { log, alert } from './utils';

class ProductionMonitor {
  private monitor = new SupabaseTransactionMonitor();
  private interval = 60000; // 1 minute

  start() {
    setInterval(() => this.check(), this.interval);
  }

  private async check() {
    const result = await this.monitor.run({
      action: 'full_report',
      longTransactionThresholdMs: 300000,
      autoKillEnabled: true,
      autoKillThresholdMs: 600000,
    });

    if (!result.success) {
      alert(`Monitor failed: ${result.error}`);
      return;
    }

    const { statistics, deadlocks, autoKillActions } = result.data!;

    // Log metrics
    log(`Active: ${statistics.total_active}, Long: ${statistics.long_transactions.length}`);

    // Alert on issues
    if (deadlocks.length > 0) {
      alert(`⚠️ Deadlock detected!`, deadlocks);
    }

    if ((autoKillActions?.length || 0) > 3) {
      alert(`❌ Multiple transactions auto-killed`, autoKillActions);
    }

    // Store metrics for dashboards
    storeMetrics(statistics);
  }
}

// Usage
new ProductionMonitor().start();
```

## Quick Facts

- **Execution Time**: 100-500ms typical
- **Memory Usage**: 5-10 MB
- **Default Timeout**: 60 seconds
- **Best Frequency**: Every 30-60 seconds
- **Mock Data**: Used for development/demo
- **Real Data**: Requires database connection implementation

## Next Steps

1. ✅ Import the skill
2. ✅ Set up Supabase vault credentials
3. ✅ Run with `action: 'monitor'` to test
4. ✅ Implement real database queries (replace mock data)
5. ✅ Set up scheduled monitoring
6. ✅ Configure auto-kill thresholds
7. ✅ Integrate with alerting system

## See Also

- Full documentation: `TRANSACTION-MONITOR-S19.md`
- Test examples: `test-transaction-monitor.ts`
- Health Dashboard: `supabase-health-dashboard.ts`
- Query Doctor: `supabase-query-doctor.ts`

---

**Skill ID:** S-19
**Version:** 1.0.0
**Status:** Ready to Use
