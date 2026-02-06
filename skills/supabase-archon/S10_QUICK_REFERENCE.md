# Skill S-10: Vacuum Scheduler - Quick Reference

**Status:** ✅ READY | **Version:** 1.0.0 | **Category:** UTIL

---

## Import & Register

```typescript
import { SupabaseVacuumScheduler } from './supabase-vacuum-scheduler';

const scheduler = new SupabaseVacuumScheduler();
await scheduler.run(params);
```

---

## Quick Actions

### 1. Schedule Maintenance
```typescript
await scheduler.run({
  action: 'schedule',
  aggressiveness: 'medium'
})
// → Returns: VacuumSchedule[] + recommendations
```

### 2. Fix Bloat
```typescript
await scheduler.run({
  action: 'detect-bloat'
})
// → Returns: BloatedTableInfo[] + remediation plan
```

### 3. Tune Database
```typescript
await scheduler.run({
  action: 'tune-autovac',
  aggressiveness: 'high'
})
// → Returns: OptimalAutoVacSettings
```

### 4. Check Health
```typescript
await scheduler.run({
  action: 'monitor-tuples'
})
// → Returns: DeadTupleStats[] + alerts
```

### 5. Analyze Stats
```typescript
await scheduler.run({
  action: 'analyze'
})
// → Returns: DeadTupleStats[] + recommendations
```

---

## Parameters

```typescript
{
  action: 'schedule'|'analyze'|'detect-bloat'|'tune-autovac'|'monitor-tuples',
  aggressiveness?: 'low'|'medium'|'high',    // Default: 'medium'
  tableName?: string,                        // Specific table
  dryRun?: boolean                           // Preview mode (no changes)
}
```

---

## Response Format

```typescript
{
  success: boolean,
  data: {
    action: string,
    schedules?: VacuumSchedule[],
    bloatedTables?: BloatedTableInfo[],
    settings?: AutoVacSettings,
    deadTupleStats?: DeadTupleStats[],
    recommendations?: string[],
    status: 'success'|'failed'
  },
  duration: number,
  error?: string
}
```

---

## Aggressiveness Levels

| Level | Naptime | Frequency | Threshold | Use Case |
|-------|---------|-----------|-----------|----------|
| **low** | 5 min | Weekly | 100 rows | Dev/staging |
| **medium** | 1 min | Daily | 50 rows | Production |
| **high** | 10 sec | Hourly | 20 rows | High-churn |

---

## Bloat Thresholds

| Level | Action | Priority |
|-------|--------|----------|
| **> 30%** | Full VACUUM + REINDEX | CRITICAL |
| **20-30%** | REINDEX | HIGH |
| **10-20%** | ANALYZE | MEDIUM |
| **< 10%** | Monitor | LOW |

---

## Dead Tuple Alerts

| Ratio | Alert | Action |
|-------|-------|--------|
| **> 25%** | CRITICAL | Immediate VACUUM |
| **15-25%** | WARNING | Schedule VACUUM soon |
| **< 15%** | OK | Continue monitoring |

---

## Examples

### Schedule Aggressive Maintenance
```typescript
const result = await scheduler.run({
  action: 'schedule',
  aggressiveness: 'high',
  dryRun: false
});
console.log(`Created ${result.data?.schedules?.length} schedules`);
```

### Preview Without Changes
```typescript
const plan = await scheduler.run({
  action: 'tune-autovac',
  aggressiveness: 'high',
  dryRun: true  // Just show what would happen
});
```

### Fix Single Table
```typescript
const result = await scheduler.run({
  action: 'detect-bloat',
  tableName: 'users'
});

for (const table of result.data?.bloatedTables || []) {
  console.log(`${table.tableName}: ${table.recommendedAction}`);
}
```

### Monitor with Alerts
```typescript
const result = await scheduler.run({
  action: 'monitor-tuples'
});

const alerts = result.data?.recommendations?.filter(r =>
  r.includes('CRITICAL') || r.includes('WARNING')
);

if (alerts?.length) {
  console.error('Database health issues:', alerts);
  // Trigger incident response
}
```

---

## Files

| File | Size | Purpose |
|------|------|---------|
| `supabase-vacuum-scheduler.ts` | 19 KB | Main skill |
| `test-vacuum-scheduler.ts` | 8 KB | Test suite |
| `VACUUM_SCHEDULER_S10_GUIDE.md` | 18 KB | Full documentation |
| `S10_QUICK_REFERENCE.md` | This file | Quick reference |

---

## Configuration Profiles

### Low (Dev Environment)
```json
{
  "autovacuumNaptime": "5 minutes",
  "autovacuumVacuumThreshold": 100,
  "frequency": "weekly"
}
```

### Medium (Standard Production)
```json
{
  "autovacuumNaptime": "1 minute",
  "autovacuumVacuumThreshold": 50,
  "frequency": "daily"
}
```

### High (High-Traffic Production)
```json
{
  "autovacuumNaptime": "10 seconds",
  "autovacuumVacuumThreshold": 20,
  "frequency": "hourly"
}
```

---

## Integration

```typescript
// Register in skill registry
const registry = getSkillRegistry();
registry.register(scheduler);

// Execute via registry
await registry.execute('supabase-vacuum-scheduler', {
  action: 'detect-bloat'
});
```

---

## Error Handling

```typescript
const result = await scheduler.run(params);

if (!result.success) {
  console.error('Error:', result.error);
  // Handle error
} else {
  console.log('Action succeeded:', result.data?.status);
}
```

---

## Mock Data (Development)

All operations use mock data:
- 9 sample tables
- Bloat: 0-50%
- Dead tuples: 0-50,000
- No real database required

---

## Performance

| Metric | Value |
|--------|-------|
| Timeout | 120 seconds |
| Retries | 2 |
| Typical time | < 2 seconds |

---

## Related Skills

- **S-08:** Query Doctor (optimize queries)
- **S-11:** Backup Driller (safe maintenance)
- **S-13:** Health Dashboard (monitoring)
- **S-04:** Secrets Scanner (security)

---

## Common Workflows

### Workflow 1: Full Maintenance Cycle
```typescript
// 1. Check current state
const monitor = await scheduler.run({ action: 'monitor-tuples' });

// 2. Detect issues
const bloat = await scheduler.run({ action: 'detect-bloat' });

// 3. Create schedule
const schedule = await scheduler.run({
  action: 'schedule',
  aggressiveness: 'medium'
});

// 4. Tune settings
const tuned = await scheduler.run({
  action: 'tune-autovac',
  aggressiveness: 'high'
});
```

### Workflow 2: Emergency Response
```typescript
// Check for critical bloat
const result = await scheduler.run({
  action: 'detect-bloat'
});

if (result.data?.bloatedTables?.some(t => t.bloatPercentage > 30)) {
  // CRITICAL bloat detected
  // Trigger full VACUUM + REINDEX
  // Send alerts
}
```

### Workflow 3: Optimization
```typescript
// Plan changes without applying
const plan = await scheduler.run({
  action: 'tune-autovac',
  aggressiveness: 'high',
  dryRun: true
});

// Review recommendations
console.log(plan.data?.recommendations);

// If good, apply
const applied = await scheduler.run({
  action: 'tune-autovac',
  aggressiveness: 'high',
  dryRun: false
});
```

---

## Troubleshooting

### No credentials
```
Error: Supabase credentials not found
Solution: Set SUPABASE_URL and SUPABASE_KEY in environment
```

### Invalid action
```
Error: Unknown action: xxx
Solution: Use: schedule, analyze, detect-bloat, tune-autovac, monitor-tuples
```

### Timeout
```
Error: Operation timed out
Solution: Reduce dataset size or increase timeout
```

---

## Next Steps

1. Add real PostgreSQL queries (replace mock data)
2. Implement persistent schedule storage
3. Add webhook/email alerting
4. Integrate with monitoring dashboard
5. Add Prometheus metrics

---

**Learn More:** See `VACUUM_SCHEDULER_S10_GUIDE.md` for complete documentation

**Maintained by:** Lucas Tigre + Magnus + Aria (Virtual Developers)

**Last Updated:** 06/02/2026
