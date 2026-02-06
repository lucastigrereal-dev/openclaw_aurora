# Permission Diff Engine - Usage Examples

## Table of Contents
1. [Basic Usage](#basic-usage)
2. [Advanced Scenarios](#advanced-scenarios)
3. [Integration with OpenClaw](#integration-with-openclaw)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Real-world Use Cases](#real-world-use-cases)

## Basic Usage

### Example 1: Simple Permission Check

```typescript
import { SupabasePermissionDiff } from './supabase-permission-diff';

async function checkPermissions() {
  const skill = new SupabasePermissionDiff();

  // Execute with defaults
  const result = await skill.run({
    // Credentials from vault
  });

  if (result.success) {
    const data = result.data!;

    console.log(`Found ${data.changes.length} changes`);
    console.log(`Escalations: ${data.escalations.length}`);

    // Show summary
    console.log(JSON.stringify(data.summary, null, 2));
  } else {
    console.error('Error:', result.error);
  }
}

checkPermissions();
```

### Example 2: Detailed Change Analysis

```typescript
async function analyzeChanges() {
  const skill = new SupabasePermissionDiff();
  const result = await skill.run({});

  if (result.success) {
    const { changes, escalations } = result.data!;

    // Group changes by type
    const byType = changes.reduce((acc, change) => {
      if (!acc[change.type]) {
        acc[change.type] = [];
      }
      acc[change.type].push(change);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('Changes by Type:');
    Object.entries(byType).forEach(([type, items]) => {
      console.log(`\n${type.toUpperCase()}: ${items.length} changes`);
      items.forEach(item => {
        console.log(`  - ${item.action}: ${item.objectName}`);
      });
    });

    // Show critical changes
    const critical = changes.filter(c => c.severity === 'critical');
    if (critical.length > 0) {
      console.log(`\n⚠️  CRITICAL CHANGES: ${critical.length}`);
      critical.forEach(c => {
        console.log(`  - ${c.grantee} → ${c.privilege} on ${c.objectName}`);
      });
    }
  }
}

analyzeChanges();
```

## Advanced Scenarios

### Example 3: With Custom Baseline

```typescript
async function compareWithBaseline(baselineFile: string) {
  const skill = new SupabasePermissionDiff();

  const result = await skill.run({
    baselinePath: baselineFile,
    detectEscalations: true,
  });

  if (result.success) {
    const { changes, summary } = result.data!;

    // Summary report
    console.log('Permission Diff Report');
    console.log('====================');
    console.log(`Baseline: ${result.data!.baselineTimestamp}`);
    console.log(`Current:  ${result.data!.timestamp}`);
    console.log();
    console.log(`Total Changes:      ${summary.totalChanges}`);
    console.log(`Added Grants:       ${summary.addedGrants}`);
    console.log(`Removed Grants:     ${summary.removedGrants}`);
    console.log(`Modified Roles:     ${summary.modifiedRoles}`);
    console.log(`Escalations Found:  ${result.data!.escalations.length}`);

    return changes;
  }
}

// Usage
const changes = await compareWithBaseline('./baselines/prod-baseline.json');
```

### Example 4: Export Changes to CSV

```typescript
import * as fs from 'fs';

async function exportChanges(outputFile: string) {
  const skill = new SupabasePermissionDiff();
  const result = await skill.run({});

  if (result.success) {
    const csv = skill.exportChanges(result.data!.changes, 'csv');
    fs.writeFileSync(outputFile, csv);

    console.log(`✓ Changes exported to ${outputFile}`);

    // Show preview
    const lines = csv.split('\n');
    console.log(`\nFirst 5 rows:`);
    lines.slice(0, 5).forEach(line => console.log(line));
  }
}

exportChanges('permission-changes.csv');
```

### Example 5: Export to JSON

```typescript
import * as fs from 'fs';

async function exportToJSON(outputFile: string) {
  const skill = new SupabasePermissionDiff();
  const result = await skill.run({});

  if (result.success) {
    const json = skill.exportChanges(result.data!.changes, 'json');
    fs.writeFileSync(outputFile, json);

    console.log(`✓ Changes exported to ${outputFile}`);

    // Verify
    const data = JSON.parse(json);
    console.log(`\nExported ${data.length} changes`);
    console.log(`Types: ${[...new Set(data.map(c => c.type))].join(', ')}`);
  }
}

exportToJSON('permission-changes.json');
```

### Example 6: Escalation Alert

```typescript
async function checkEscalations() {
  const skill = new SupabasePermissionDiff();
  const result = await skill.run({
    detectEscalations: true,
  });

  if (result.success && result.data!.escalations.length > 0) {
    console.log('⚠️  SECURITY ALERT: Permission Escalations Detected!');
    console.log('==================================================\n');

    const escalations = result.data!.escalations;

    escalations.forEach((esc, i) => {
      console.log(`${i + 1}. ${esc.grantee}`);
      console.log(`   Object: ${esc.objectName}`);
      console.log(`   Privilege: ${esc.privilege}`);
      console.log(`   Severity: ${esc.severity}`);
      console.log();
    });

    // Potential webhook/email alert here
    return escalations;
  }
}

checkEscalations();
```

### Example 7: Save New Baseline

```typescript
async function updateBaseline(backupPath?: string) {
  const skill = new SupabasePermissionDiff();

  // Optional: backup current baseline
  if (backupPath && fs.existsSync('./permissions-baseline.json')) {
    fs.copyFileSync(
      './permissions-baseline.json',
      backupPath
    );
    console.log('✓ Old baseline backed up');
  }

  // Save current state as new baseline
  const success = await skill.saveBaseline({
    baselinePath: './permissions-baseline.json',
  });

  if (success) {
    console.log('✓ Baseline updated successfully');
  }
}

updateBaseline(`./baselines/backup-${new Date().toISOString()}.json`);
```

## Integration with OpenClaw

### Example 8: Registry Integration

```typescript
import { getSkillRegistryV2 } from '../skill-registry-v2';

async function runViaRegistry() {
  const registry = getSkillRegistryV2();

  // Execute via registry
  const result = await registry.execute('supabase-permission-diff', {
    detectEscalations: true,
  });

  if (result.success) {
    console.log('Permission Diff Results:');
    console.log(JSON.stringify(result.data, null, 2));
  }
}

runViaRegistry();
```

### Example 9: With Event Listeners

```typescript
async function monitorWithEvents() {
  const skill = new SupabasePermissionDiff();

  // Listen to lifecycle events
  skill.on('start', (data) => {
    console.log('Started:', data.skill);
  });

  skill.on('complete', (data) => {
    console.log('Completed:', data.skill);
    console.log('Duration:', data.result.duration, 'ms');
  });

  skill.on('error', (data) => {
    console.error('Error in:', data.skill);
    console.error('Message:', data.error);
  });

  // Run with event monitoring
  const result = await skill.run({});

  if (result.success) {
    console.log('✓ Analysis complete');
  }
}

monitorWithEvents();
```

## Monitoring & Alerts

### Example 10: Automated Daily Check

```typescript
import * as schedule from 'node-schedule';

function setupDailyPermissionCheck() {
  // Run every day at 2 AM
  schedule.scheduleJob('0 2 * * *', async () => {
    console.log('Running daily permission check...');

    const skill = new SupabasePermissionDiff();
    const result = await skill.run({ detectEscalations: true });

    if (result.success) {
      const { changes, escalations } = result.data!;

      if (changes.length > 0) {
        // Send notification
        await notifySecurityTeam({
          changes: changes.length,
          escalations: escalations.length,
          summary: result.data!.summary,
        });
      }
    }
  });

  console.log('Daily check scheduled');
}

async function notifySecurityTeam(data: any) {
  console.log('Sending alert to security team...');
  // TODO: Implement actual notification (Telegram, Slack, Email)
}

setupDailyPermissionCheck();
```

### Example 11: Webhook Integration

```typescript
import fetch from 'node-fetch';

async function sendWebhook(webhookUrl: string) {
  const skill = new SupabasePermissionDiff();
  const result = await skill.run({});

  if (result.success && result.data!.changes.length > 0) {
    const payload = {
      timestamp: new Date().toISOString(),
      changes: result.data!.changes,
      summary: result.data!.summary,
      escalations: result.data!.escalations,
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('✓ Webhook delivered');
      }
    } catch (error) {
      console.error('Webhook failed:', error);
    }
  }
}

sendWebhook('https://your-webhook.example.com/permission-diff');
```

## Real-world Use Cases

### Example 12: Compliance Audit Report

```typescript
async function generateAuditReport(reportPath: string) {
  const skill = new SupabasePermissionDiff();
  const result = await skill.run({});

  if (result.success) {
    const { changes, escalations, summary } = result.data!;

    const report = {
      title: 'Permission Audit Report',
      date: new Date().toISOString(),
      summary: {
        ...summary,
        riskLevel: escalations.length > 0 ? 'HIGH' : 'LOW',
      },
      changes: changes.map(c => ({
        timestamp: c.timestamp,
        type: c.type,
        action: c.action,
        object: c.objectName,
        grantee: c.grantee,
        privilege: c.privilege,
        severity: c.severity,
      })),
      recommendations: generateRecommendations(escalations),
    };

    // Save report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`✓ Audit report saved to ${reportPath}`);
  }
}

function generateRecommendations(escalations: any[]): string[] {
  const recommendations = [];

  if (escalations.length > 0) {
    recommendations.push('CRITICAL: Review and remediate detected escalations immediately');

    const publicEscalations = escalations.filter(e => e.grantee === 'public');
    if (publicEscalations.length > 0) {
      recommendations.push(`Revoke dangerous privileges from public role (${publicEscalations.length} cases)`);
    }

    const anonEscalations = escalations.filter(e => e.grantee === 'anon');
    if (anonEscalations.length > 0) {
      recommendations.push(`Review anonymous user permissions (${anonEscalations.length} cases)`);
    }
  }

  return recommendations;
}

generateAuditReport('./audit-report.json');
```

### Example 13: Before/After Migration Check

```typescript
async function checkBeforeAfter(baselinePath: string, newBaselinePath: string) {
  const skill = new SupabasePermissionDiff();

  // Before check (against old baseline)
  console.log('Checking before migration...');
  const beforeResult = await skill.run({
    baselinePath: baselinePath,
  });

  if (!beforeResult.success) {
    console.error('Before check failed:', beforeResult.error);
    return;
  }

  const beforeChanges = beforeResult.data!.changes.length;

  // ... perform migration ...

  // After check (against new baseline)
  console.log('Checking after migration...');
  const afterResult = await skill.run({
    baselinePath: newBaselinePath,
  });

  if (!afterResult.success) {
    console.error('After check failed:', afterResult.error);
    return;
  }

  const afterChanges = afterResult.data!.changes.length;

  // Compare
  console.log('Migration Impact Report');
  console.log('======================');
  console.log(`Before migration: ${beforeChanges} changes`);
  console.log(`After migration:  ${afterChanges} changes`);
  console.log();

  if (afterChanges === 0) {
    console.log('✓ Migration completed with no unexpected changes');
  } else if (afterChanges > beforeChanges) {
    console.log('⚠️  WARNING: More changes after migration');
    console.log(afterResult.data!.changes);
  }
}

checkBeforeAfter('./baseline-before.json', './baseline-after.json');
```

### Example 14: Continuous Monitoring Setup

```typescript
async function setupContinuousMonitoring() {
  const skill = new SupabasePermissionDiff();
  const baselineFile = './baselines/current-baseline.json';
  let lastCheckTime = Date.now();

  // Run every 5 minutes
  const intervalId = setInterval(async () => {
    const result = await skill.run({
      baselinePath: baselineFile,
      detectEscalations: true,
    });

    if (result.success) {
      const { changes, escalations } = result.data!;

      if (changes.length > 0) {
        console.log(`[${new Date().toISOString()}] Found ${changes.length} changes`);

        if (escalations.length > 0) {
          console.log(`⚠️  ESCALATIONS: ${escalations.length}`);
          // Alert immediately
          await alertSecurityTeam(escalations);
        }
      }
    }

    lastCheckTime = Date.now();
  }, 300000); // 5 minutes

  return () => clearInterval(intervalId);
}

// Usage
const stopMonitoring = await setupContinuousMonitoring();

// Stop later if needed
// stopMonitoring();
```

## Tips & Best Practices

### Performance Tips
1. Schedule checks during off-peak hours
2. Save baselines after approved changes only
3. Batch multiple checks together
4. Cache baseline if not changing frequently

### Security Tips
1. Keep baseline files in secure locations
2. Export changes for audit trails
3. Review escalations immediately
4. Document all permission changes
5. Use version control for baselines

### Operational Tips
1. Set up automated alerts for escalations
2. Review changes daily
3. Schedule baseline updates quarterly
4. Keep audit logs for compliance
5. Test before deploying to production

---

For more information, see [PERMISSION_DIFF_GUIDE.md](./PERMISSION_DIFF_GUIDE.md)
