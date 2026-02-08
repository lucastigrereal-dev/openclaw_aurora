# Deadlock Detector (S-20) - Quick Start

## Installation

The skill is already created and located at:
```
skills/supabase-archon/supabase-deadlock-detector.ts
```

## Basic Usage

```typescript
import { SupabaseDeadlockDetector } from './supabase-deadlock-detector';

const detector = new SupabaseDeadlockDetector();

// Check for deadlocks
const result = await detector.execute({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-api-key',
});

console.log('Has deadlocks:', result.data?.has_deadlocks);
```

## Common Tasks

### Task 1: Quick Deadlock Check (30 seconds)

```typescript
const hasDeadlock = await detector.hasDeadlock({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
});

if (hasDeadlock) {
  console.log('Deadlock detected - investigation needed');
}
```

### Task 2: Get Resolution Recommendation (30 seconds)

```typescript
const recommendation = await detector.getRecommendation({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
});

console.log('Recommended action:', recommendation);
// Output: "Use strategy: kill_latest on PIDs 1001, 1002"
```

### Task 3: Auto-Resolve Deadlock (1-3 seconds)

```typescript
const resolvedCount = await detector.autoResolve({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  resolutionStrategy: 'kill_latest',
});

console.log(`Resolved ${resolvedCount} deadlocks`);
```

### Task 4: Full Analysis with History (3-5 seconds)

```typescript
const result = await detector.execute({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  analyzeHistory: true,
  lookbackHours: 24,
  includeGraph: true,
  includePrevention: true,
});

const analysis = result.data?.analysis;
console.log(`Deadlocks this session: ${analysis?.deadlock_count}`);
console.log(`Resolution strategies: ${analysis?.strategies.length}`);
console.log(`Prevention tips: ${analysis?.prevention_tips.length}`);
console.log(`Historical events: ${analysis?.history.length}`);
```

## Parameters Cheat Sheet

```typescript
// Minimal (just detect)
{ supabaseUrl: 'url', supabaseKey: 'key' }

// With graph and prevention
{
  supabaseUrl: 'url',
  supabaseKey: 'key',
  includeGraph: true,
  includePrevention: true
}

// Auto-resolve with strategy
{
  supabaseUrl: 'url',
  supabaseKey: 'key',
  autoResolve: true,
  resolutionStrategy: 'kill_latest'
}

// Full analysis
{
  supabaseUrl: 'url',
  supabaseKey: 'key',
  analyzeHistory: true,
  lookbackHours: 24,
  includeGraph: true,
  includePrevention: true
}
```

## Resolution Strategies

### kill_latest (Recommended for quick recovery)
- **Risk:** Low
- **Best for:** Urgent recovery, minimal data loss
- **Impact:** Kills most recent waiting transaction

### kill_oldest (For long-running query issues)
- **Risk:** Medium
- **Best for:** Identifying problematic queries
- **Impact:** Kills oldest transaction in deadlock

### kill_least_progress (For lock contention)
- **Risk:** Medium
- **Best for:** Heavy lock contention scenarios
- **Impact:** Kills transaction holding most locks

## What You Get Back

### If no deadlock:
```json
{
  "success": true,
  "data": {
    "has_deadlocks": false,
    "resolved_count": 0,
    "timestamp": "2026-02-06T12:00:00Z",
    "check_duration": 150
  }
}
```

### If deadlock detected:
```json
{
  "success": true,
  "data": {
    "has_deadlocks": true,
    "analysis": {
      "deadlock_count": 3,
      "transactions": [...],
      "graph": {...},
      "strategies": [...],
      "prevention_tips": [...],
      "history": [...],
      "recommended_action": "Use strategy: kill_latest on PIDs 1001, 1002"
    },
    "resolved_count": 0,
    "timestamp": "2026-02-06T12:00:00Z",
    "check_duration": 2500
  }
}
```

## Integration Examples

### With Express.js

```typescript
app.get('/api/health/deadlock', async (req, res) => {
  const detector = new SupabaseDeadlockDetector();
  const result = await detector.execute({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
  });

  if (result.data?.has_deadlocks) {
    res.status(503).json({
      status: 'degraded',
      issue: 'Database deadlock detected',
      recommendation: result.data.analysis?.recommended_action,
    });
  } else {
    res.status(200).json({ status: 'healthy' });
  }
});
```

### With Cron Job

```typescript
// Run every 5 minutes
schedule.scheduleJob('*/5 * * * *', async () => {
  const detector = new SupabaseDeadlockDetector();
  const hasDeadlock = await detector.hasDeadlock({...});

  if (hasDeadlock) {
    await alertService.warn('Deadlock detected', {
      url: process.env.SUPABASE_URL,
    });
  }
});
```

### With Health Dashboard

```typescript
import { SupabaseHealthDashboard } from './supabase-health-dashboard';
import { SupabaseDeadlockDetector } from './supabase-deadlock-detector';

async function getSystemHealth() {
  const [health, deadlock] = await Promise.all([
    healthDashboard.execute({...}),
    deadlockDetector.execute({...}),
  ]);

  const score = health.data.score *
    (deadlock.data.has_deadlocks ? 0.5 : 1.0);

  return { health: score, deadlock: deadlock.data };
}
```

## Troubleshooting

### Getting "credentials not found"
- Ensure `SUPABASE_URL` and `SUPABASE_KEY` in vault
- Or pass explicitly: `supabaseUrl`, `supabaseKey` params

### Deadlock detection too frequent
- Check if your app has lock contention issues
- See prevention tips in full analysis
- May need transaction timeout review

### Auto-resolve seems too aggressive
- Start with `autoResolve: false`
- Review recommendations first
- Then enable with `resolutionStrategy: 'kill_latest'`

## Performance Tips

1. **Cache detection results** (5-minute TTL recommended)
   ```typescript
   const cached = cache.get('deadlock-check');
   if (!cached || Date.now() - cached.timestamp > 300000) {
     cache.set('deadlock-check', await detector.execute({...}));
   }
   ```

2. **Disable expensive options** when not needed
   ```typescript
   // Only enable graph/history on demand
   includeGraph: onDemandAnalysis,
   analyzeHistory: onDemandAnalysis
   ```

3. **Batch deadlock checks** with health dashboard
   ```typescript
   const [health, deadlock] = await Promise.all([...]);
   ```

## See Also

- **Full Documentation:** `DEADLOCK-DETECTOR-S20-GUIDE.md`
- **Health Dashboard:** `supabase-health-dashboard.ts` (S-13)
- **Query Doctor:** `supabase-query-doctor.ts` (S-06)

---

**Last Updated:** 2026-02-06
**Version:** 1.0.0
**Skill ID:** S-20
