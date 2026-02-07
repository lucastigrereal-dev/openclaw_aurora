# S-12 Connection Pool Manager - Quick Start Guide

**Get up and running with the Connection Pool Manager in 5 minutes**

## Installation & Setup

### 1. Prerequisites
- OpenClaw Aurora skill framework installed
- Supabase credentials configured in environment or vault
- Node.js 18+ with TypeScript

### 2. Basic Setup

```typescript
import { SupabaseConnectionPool } from './skills/supabase-archon/supabase-connection-pool';

// Create instance
const poolManager = new SupabaseConnectionPool();

// Run immediately
const result = await poolManager.run({ action: 'monitor' });
console.log(result);
```

## 30-Second Examples

### Monitor Pool Status
```typescript
const result = await poolManager.run({
  action: 'monitor',
});

console.log(`Active connections: ${result.data?.poolStats.connections.active}`);
console.log(`Total connections: ${result.data?.poolStats.connections.total}`);
```

### Detect Connection Leaks
```typescript
const result = await poolManager.run({
  action: 'detect-leaks',
});

if (result.data?.leakDetection.detected) {
  console.log('Leaks found! Confidence:', result.data.leakDetection.confidence);
}
```

### Check Health
```typescript
const result = await poolManager.run({
  action: 'health-check',
});

console.log(`Health: ${result.data?.healthSummary.healthy}/${result.data?.healthSummary.totalChecked}`);
console.log(`Latency: ${result.data?.healthSummary.avgLatency.toFixed(2)}ms`);
```

### Auto-scale Pool
```typescript
const result = await poolManager.run({
  action: 'auto-scale',
});

console.log(`Current: ${result.data?.scaling.currentSize}`);
console.log(`Target: ${result.data?.scaling.targetSize}`);
```

### Kill Idle Connections
```typescript
const result = await poolManager.run({
  action: 'kill-idle',
  options: {
    idleTimeoutMs: 300000,  // 5 minutes
  },
});

console.log(`Connections killed: ${result.data?.actions[0]?.connectionsAffected}`);
```

### Full Analysis
```typescript
const result = await poolManager.run({
  action: 'full-analysis',
});

console.log('Recommendations:', result.data?.recommendations);
console.log('Duration:', `${result.data?.analysisDuration}ms`);
```

## Common Tasks

### Task 1: Monitor Every 5 Minutes
```typescript
const poolManager = new SupabaseConnectionPool();

setInterval(async () => {
  const result = await poolManager.run({ action: 'monitor' });
  if (result.success) {
    console.log(`Pool: ${result.data?.poolStats.connections.active}/${result.data?.poolStats.connections.total} active`);
  }
}, 5 * 60 * 1000);
```

### Task 2: Alert on Leaks
```typescript
const hasRisk = await poolManager.hasLeakRisk({});
if (hasRisk) {
  console.warn('CONNECTION LEAK DETECTED');
  // Kill idle connections
  await poolManager.run({ action: 'kill-idle' });
}
```

### Task 3: Get Recommendations
```typescript
const recommendations = await poolManager.getRecommendations({});
recommendations.forEach(rec => {
  console.log(`Suggestion: ${rec}`);
});
```

### Task 4: Custom Configuration
```typescript
const result = await poolManager.run({
  action: 'full-analysis',
  options: {
    minSize: 10,           // Minimum pool size
    maxSize: 200,          // Maximum pool size
    growthRate: 30,        // Grow 30% when scaling up
    shrinkRate: 10,        // Shrink 10% when scaling down
    idleTimeoutMs: 600000, // 10 minutes idle timeout
  },
});
```

## Event Handling

```typescript
const poolManager = new SupabaseConnectionPool();

poolManager.on('start', () => {
  console.log('Analysis started');
});

poolManager.on('complete', (data) => {
  console.log(`Analysis completed in ${data.result.duration}ms`);
});

poolManager.on('error', (data) => {
  console.error(`Error: ${data.error}`);
});

await poolManager.run({ action: 'monitor' });
```

## Integration with Skill Registry

```typescript
import { getSkillRegistry } from './skills/skill-base';

const registry = getSkillRegistry();

// Register the skill
const poolManager = new SupabaseConnectionPool();
registry.register(poolManager);

// Execute via registry
const result = await registry.execute('supabase-connection-pool', {
  action: 'monitor',
});
```

## Environment Setup

### Option 1: Environment Variables
```bash
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_KEY="eyJ..."
```

### Option 2: Pass Credentials
```typescript
const result = await poolManager.run({
  action: 'monitor',
  supabaseUrl: 'https://xxx.supabase.co',
  supabaseKey: 'eyJ...',
});
```

### Option 3: Vault (Recommended)
Credentials are automatically loaded from vault if available.

## Testing

Run the test suite:

```bash
# Copy test file
cp skills/supabase-archon/test-connection-pool.ts .

# Run tests
npx ts-node test-connection-pool.ts
```

Expected output:
```
=== Supabase Connection Pool Manager Tests ===

Test 1: Full Analysis
Success: true
Pool Stats: { total: 35, active: 22, idle: 13 }
Recommendations: [...]
Analysis Duration: 45ms

Test 2: Leak Detection
Success: true
Leaks Detected: false
Confidence: 35.2%
...
```

## Debugging

### Enable Logging
The skill logs all operations in JSON format:

```
{"timestamp":"2025-02-06T10:30:45.123Z","skill":"connection-pool-manager","level":"info","message":"Connection Pool Manager iniciado","context":{"action":"full-analysis"}}
{"timestamp":"2025-02-06T10:30:46.456Z","skill":"connection-pool-manager","level":"info","message":"Connection Pool analysis completed","context":{"action":"full-analysis","poolSize":42}}
```

### Check Success Status
```typescript
const result = await poolManager.run({ action: 'monitor' });
if (!result.success) {
  console.error('Failed:', result.error);
}
```

### Validate Input
```typescript
// These are invalid
await poolManager.run({
  action: 'invalid-action', // Will fail validation
});

// These are valid
await poolManager.run({
  action: 'monitor', // OK
});
```

## Performance Notes

- **Execution time**: Typically 50-200ms depending on pool size
- **Timeout**: 60 seconds per execution
- **Memory**: Minimal overhead, efficient mock data
- **Retries**: Automatic 2 retries on failure

## Common Options

```typescript
// Light monitoring (basic stats only)
{ action: 'monitor' }

// Heavy analysis (all checks + recommendations)
{ action: 'full-analysis' }

// Safety-first cleanup
{
  action: 'kill-idle',
  options: { maxKillPercentage: 10 }
}

// Aggressive scaling
{
  action: 'auto-scale',
  options: { growthRate: 50, shrinkRate: 5 }
}
```

## Troubleshooting

### "Supabase credentials not found"
- Check environment variables: `SUPABASE_URL`, `SUPABASE_KEY`
- Or pass explicitly: `supabaseUrl`, `supabaseKey`

### "Skill is disabled"
- Enable: `poolManager.enable()`

### No action happened
- Check: `result.success` is `true`
- Verify: `action` is one of: monitor, detect-leaks, health-check, auto-scale, kill-idle, full-analysis

## Next Steps

1. **Read the full documentation**: `README-S12.md`
2. **Explore other skills**: Check S-13 Health Dashboard for complementary monitoring
3. **Integrate into workflows**: Use with OpenClaw Aurora orchestration
4. **Customize for your needs**: Adjust thresholds and scaling parameters

## Quick Reference

| Action | Purpose | Speed |
|--------|---------|-------|
| `monitor` | Get current stats | Fast |
| `detect-leaks` | Find connection leaks | Fast |
| `health-check` | Verify connection health | Medium |
| `auto-scale` | Adjust pool size | Fast |
| `kill-idle` | Remove unused connections | Medium |
| `full-analysis` | Complete analysis | Slow |

## Support

- **Issues**: Check error messages in `result.error`
- **Logs**: Monitor JSON logs for detailed context
- **Registry**: Use skill registry for centralized execution
- **Events**: Listen to skill events for real-time monitoring

Happy monitoring!
