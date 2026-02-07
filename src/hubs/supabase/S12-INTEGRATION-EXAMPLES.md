# S-12 Connection Pool Manager - Integration Examples

**Real-world usage patterns and integration scenarios**

## Table of Contents

1. [Standalone Usage](#standalone-usage)
2. [Skill Registry Integration](#skill-registry-integration)
3. [Monitoring Workflows](#monitoring-workflows)
4. [Alert Systems](#alert-systems)
5. [Automation Patterns](#automation-patterns)
6. [Combined Skills](#combined-skills)
7. [Advanced Configurations](#advanced-configurations)

---

## Standalone Usage

### Example 1: Simple Monitoring

```typescript
import { SupabaseConnectionPool } from './skills/supabase-archon/supabase-connection-pool';

async function simpleMonitoring() {
  const poolManager = new SupabaseConnectionPool();

  const result = await poolManager.run({
    action: 'monitor',
  });

  if (result.success && result.data) {
    const stats = result.data.poolStats;

    console.log(`
      Pool Status:
      - Total: ${stats.connections.total}
      - Active: ${stats.connections.active}
      - Idle: ${stats.connections.idle}
      - Throughput: ${stats.throughput.requestsPerSecond.toFixed(0)} req/s
      - Avg Query Time: ${stats.timing.avgQueryTime.toFixed(2)}ms
    `);
  }
}

simpleMonitoring().catch(console.error);
```

### Example 2: Periodic Health Checks

```typescript
const poolManager = new SupabaseConnectionPool();

async function periodicHealthCheck() {
  setInterval(async () => {
    const result = await poolManager.run({
      action: 'health-check',
    });

    if (result.success && result.data) {
      const health = result.data.healthSummary;
      const healthPercentage = (health.healthy / health.totalChecked) * 100;

      console.log(`[${new Date().toISOString()}] Health: ${healthPercentage.toFixed(1)}%`);

      if (healthPercentage < 95) {
        console.warn(`Pool health degraded: ${health.unhealthy} unhealthy connections`);
      }
    }
  }, 60000); // Every minute
}

periodicHealthCheck();
```

### Example 3: Leak Detection with Auto-Fix

```typescript
async function autoFixLeaks() {
  const poolManager = new SupabaseConnectionPool();

  const detectionResult = await poolManager.run({
    action: 'detect-leaks',
    options: {
      leakDetectionThreshold: 80,
    },
  });

  if (detectionResult.success && detectionResult.data?.leakDetection.detected) {
    console.log('Leaks detected! Auto-fixing...');

    const killResult = await poolManager.run({
      action: 'kill-idle',
      options: {
        idleTimeoutMs: 300000,
        maxKillPercentage: 30,
      },
    });

    if (killResult.success && killResult.data?.actions.length > 0) {
      const action = killResult.data.actions[0];
      console.log(`Killed ${action.connectionsAffected} connections`);
    }
  }
}

autoFixLeaks().catch(console.error);
```

---

## Skill Registry Integration

### Example 4: Registry Registration

```typescript
import { getSkillRegistry } from './skills/skill-base';
import { SupabaseConnectionPool } from './skills/supabase-archon/supabase-connection-pool';

async function registerPoolManager() {
  const registry = getSkillRegistry();
  const poolManager = new SupabaseConnectionPool();

  // Register skill
  registry.register(poolManager);

  // Execute via registry
  const result = await registry.execute('supabase-connection-pool', {
    action: 'full-analysis',
  });

  console.log('Registry execution result:', result.success);

  // List all registered skills
  const allSkills = registry.listAll();
  const poolSkill = allSkills.find(s => s.name === 'supabase-connection-pool');
  console.log('Pool Manager skill registered:', poolSkill !== undefined);
}

registerPoolManager().catch(console.error);
```

### Example 5: Event-Based Monitoring

```typescript
const poolManager = new SupabaseConnectionPool();

// Listen to skill events
poolManager.on('start', (data) => {
  console.log(`[START] ${data.skill}`);
});

poolManager.on('complete', (data) => {
  console.log(`[COMPLETE] ${data.skill} - Duration: ${data.result.duration}ms`);

  if (data.result.success && data.result.data) {
    console.log('Recommendations:', data.result.data.recommendations);
  }
});

poolManager.on('error', (data) => {
  console.error(`[ERROR] ${data.skill} - ${data.error}`);
});

// Enable/disable skill
poolManager.enable();

// Run analysis
await poolManager.run({ action: 'monitor' });

// Check status
console.log('Enabled:', poolManager.isEnabled());
console.log('Info:', poolManager.getInfo());
```

---

## Monitoring Workflows

### Example 6: 24/7 Monitoring System

```typescript
class PoolMonitoringSystem {
  private poolManager = new SupabaseConnectionPool();
  private alerts: Array<{
    timestamp: string;
    type: string;
    message: string;
  }> = [];

  async start() {
    // Full analysis every 5 minutes
    setInterval(() => this.runFullAnalysis(), 5 * 60 * 1000);

    // Quick health check every 30 seconds
    setInterval(() => this.runHealthCheck(), 30 * 1000);

    // Leak detection every 30 minutes
    setInterval(() => this.detectLeaks(), 30 * 60 * 1000);

    console.log('Pool monitoring system started');
  }

  private async runFullAnalysis() {
    const result = await this.poolManager.run({
      action: 'full-analysis',
    });

    if (!result.success) {
      this.addAlert('full-analysis', `Failed: ${result.error}`);
      return;
    }

    const data = result.data!;
    console.log(`[ANALYSIS] Pool: ${data.poolStats.connections.total} connections`);

    // Check recommendations
    for (const rec of data.recommendations) {
      console.log(`[RECOMMENDATION] ${rec}`);
      this.addAlert('recommendation', rec);
    }
  }

  private async runHealthCheck() {
    const result = await this.poolManager.run({
      action: 'health-check',
    });

    if (!result.success) return;

    const health = result.data!.healthSummary;
    const healthPercent = (health.healthy / health.totalChecked) * 100;

    console.log(`[HEALTH] ${healthPercent.toFixed(1)}% - Latency: ${health.avgLatency.toFixed(2)}ms`);

    if (health.failureRate > 5) {
      this.addAlert('health', `High failure rate: ${health.failureRate.toFixed(2)}%`);
    }
  }

  private async detectLeaks() {
    const result = await this.poolManager.run({
      action: 'detect-leaks',
    });

    if (!result.success) return;

    const leaks = result.data!.leakDetection;

    if (leaks.detected) {
      this.addAlert('leaks', `Detected with ${leaks.confidence.toFixed(1)}% confidence`);

      // Auto-fix
      await this.poolManager.run({
        action: 'kill-idle',
        options: { maxKillPercentage: 20 },
      });
    }
  }

  private addAlert(type: string, message: string) {
    this.alerts.push({
      timestamp: new Date().toISOString(),
      type,
      message,
    });

    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }
  }

  getAlerts() {
    return this.alerts;
  }
}

// Usage
const monitor = new PoolMonitoringSystem();
monitor.start();
```

---

## Alert Systems

### Example 7: Slack Integration

```typescript
import fetch from 'node-fetch';

class PoolAlertManager {
  private poolManager = new SupabaseConnectionPool();
  private slackWebhook = process.env.SLACK_WEBHOOK_URL;

  async checkAndAlert() {
    const result = await this.poolManager.run({
      action: 'full-analysis',
    });

    if (!result.success) {
      await this.sendAlert('error', `Pool check failed: ${result.error}`);
      return;
    }

    const data = result.data!;

    // Check for critical issues
    if (data.leakDetection.detected && data.leakDetection.confidence > 80) {
      await this.sendAlert(
        'warning',
        `Connection leak detected (${data.leakDetection.confidence.toFixed(0)}% confidence)`
      );
    }

    if (data.healthSummary.failureRate > 10) {
      await this.sendAlert(
        'critical',
        `High connection failure rate: ${data.healthSummary.failureRate.toFixed(1)}%`
      );
    }

    if (data.poolStats.connections.active / data.poolStats.connections.total > 0.95) {
      await this.sendAlert(
        'warning',
        `Pool usage critical: ${(data.poolStats.connections.active / data.poolStats.connections.total * 100).toFixed(0)}%`
      );
    }
  }

  private async sendAlert(level: string, message: string) {
    if (!this.slackWebhook) return;

    const color = {
      info: '#36a64f',
      warning: '#ff9900',
      critical: '#ff0000',
    }[level] || '#999999';

    const payload = {
      attachments: [
        {
          color,
          title: `Pool Manager Alert - ${level.toUpperCase()}`,
          text: message,
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    try {
      await fetch(this.slackWebhook, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }
}

// Usage
const alertManager = new PoolAlertManager();
await alertManager.checkAndAlert();
```

### Example 8: Email Alerts

```typescript
class EmailAlertManager {
  private poolManager = new SupabaseConnectionPool();

  async sendDailyReport() {
    const result = await this.poolManager.run({
      action: 'full-analysis',
    });

    if (!result.success) return;

    const data = result.data!;
    const report = this.generateReport(data);

    // Send email
    // ... (email implementation)

    console.log('Daily report sent');
  }

  private generateReport(data: any): string {
    return `
      SUPABASE POOL MANAGER DAILY REPORT
      ${new Date().toISOString()}

      CONNECTION STATISTICS
      - Total: ${data.poolStats.connections.total}
      - Active: ${data.poolStats.connections.active}
      - Idle: ${data.poolStats.connections.idle}
      - Broken: ${data.poolStats.connections.broken}

      PERFORMANCE METRICS
      - Requests/sec: ${data.poolStats.throughput.requestsPerSecond.toFixed(0)}
      - Avg Query Time: ${data.poolStats.timing.avgQueryTime.toFixed(2)}ms
      - Max Wait Time: ${data.poolStats.timing.maxWaitTime.toFixed(2)}ms

      HEALTH STATUS
      - Healthy: ${data.healthSummary.healthy}/${data.healthSummary.totalChecked}
      - Failure Rate: ${data.healthSummary.failureRate.toFixed(2)}%
      - Avg Latency: ${data.healthSummary.avgLatency.toFixed(2)}ms

      LEAK DETECTION
      - Status: ${data.leakDetection.detected ? 'DETECTED' : 'CLEAR'}
      - Confidence: ${data.leakDetection.confidence.toFixed(1)}%

      RECOMMENDATIONS
      ${data.recommendations.map(r => `- ${r}`).join('\n')}
    `;
  }
}
```

---

## Automation Patterns

### Example 9: Auto-Scaling Orchestration

```typescript
class AutoScalingOrchestrator {
  private poolManager = new SupabaseConnectionPool();

  async optimizePoolSize() {
    // Current state
    const currentState = await this.poolManager.quickPoolStatus({});
    if (!currentState) return;

    const usagePercent = (currentState.connections.active / currentState.connections.total) * 100;

    console.log(`Current usage: ${usagePercent.toFixed(1)}%`);

    // Determine strategy
    if (usagePercent > 85) {
      console.log('Usage high - scaling up');
      await this.scaleUp();
    } else if (usagePercent < 30 && currentState.connections.total > 10) {
      console.log('Usage low - scaling down');
      await this.scaleDown();
    } else {
      console.log('Usage optimal - no scaling needed');
    }
  }

  private async scaleUp() {
    const result = await this.poolManager.run({
      action: 'auto-scale',
      options: {
        growthRate: 30,
        minSize: 10,
        maxSize: 150,
      },
    });

    if (result.success && result.data?.actions.length > 0) {
      const action = result.data.actions[0];
      console.log(`Scaled up: +${action.connectionsAffected} connections`);
    }
  }

  private async scaleDown() {
    const result = await this.poolManager.run({
      action: 'auto-scale',
      options: {
        shrinkRate: 20,
        minSize: 5,
        maxSize: 150,
      },
    });

    if (result.success && result.data?.actions.length > 0) {
      const action = result.data.actions[0];
      console.log(`Scaled down: -${action.connectionsAffected} connections`);
    }
  }
}
```

### Example 10: Maintenance Windows

```typescript
class MaintenanceScheduler {
  private poolManager = new SupabaseConnectionPool();

  async performMaintenance() {
    console.log('Starting pool maintenance...');

    try {
      // Step 1: Detect leaks
      console.log('Step 1: Detecting leaks...');
      const leakResult = await this.poolManager.run({
        action: 'detect-leaks',
      });

      if (leakResult.success && leakResult.data?.leakDetection.detected) {
        // Step 2: Kill idle connections
        console.log('Step 2: Killing idle connections...');
        await this.poolManager.run({
          action: 'kill-idle',
          options: { idleTimeoutMs: 300000 },
        });
      }

      // Step 3: Health check
      console.log('Step 3: Running health check...');
      const healthResult = await this.poolManager.run({
        action: 'health-check',
      });

      // Step 4: Auto-scale if needed
      console.log('Step 4: Optimizing pool size...');
      await this.poolManager.run({
        action: 'auto-scale',
      });

      // Step 5: Full analysis
      console.log('Step 5: Full analysis...');
      const fullResult = await this.poolManager.run({
        action: 'full-analysis',
      });

      if (fullResult.success && fullResult.data) {
        console.log('Maintenance complete');
        console.log('Recommendations:', fullResult.data.recommendations);
      }
    } catch (error) {
      console.error('Maintenance failed:', error);
    }
  }
}

// Schedule maintenance
const scheduler = new MaintenanceScheduler();
setInterval(() => scheduler.performMaintenance(), 4 * 60 * 60 * 1000); // Every 4 hours
```

---

## Combined Skills

### Example 11: Pool Manager + Health Dashboard

```typescript
import { SupabaseConnectionPool } from './supabase-connection-pool';
import { SupabaseHealthDashboard } from './supabase-health-dashboard';

class CombinedMonitoring {
  private poolManager = new SupabaseConnectionPool();
  private healthDashboard = new SupabaseHealthDashboard();

  async comprehensiveMonitoring() {
    // Get pool metrics
    const poolResult = await this.poolManager.run({
      action: 'full-analysis',
    });

    // Get health metrics
    const healthResult = await this.healthDashboard.run({
      includeMetrics: ['all'],
    });

    if (!poolResult.success || !healthResult.success) {
      console.error('Monitoring failed');
      return;
    }

    const poolData = poolResult.data!;
    const healthData = healthResult.data!;

    // Combined analysis
    console.log(`
      COMPREHENSIVE SYSTEM STATUS

      CONNECTION POOL:
      - Status: ${poolData.leakDetection.detected ? 'LEAKING' : 'HEALTHY'}
      - Size: ${poolData.poolStats.connections.total}
      - Usage: ${(poolData.poolStats.connections.active / poolData.poolStats.connections.total * 100).toFixed(1)}%

      OVERALL HEALTH:
      - Score: ${healthData.score}/100
      - Active Alerts: ${healthData.alerts.length}

      RECOMMENDATIONS:
      ${poolData.recommendations.slice(0, 3).map(r => `- ${r}`).join('\n')}
    `);
  }
}
```

---

## Advanced Configurations

### Example 12: Custom Options for Different Workloads

```typescript
class WorkloadOptimizer {
  private poolManager = new SupabaseConnectionPool();

  async optimizeForWorkload(type: 'light' | 'medium' | 'heavy') {
    const configs = {
      light: {
        minSize: 3,
        maxSize: 20,
        growthRate: 15,
        shrinkRate: 20,
        idleTimeoutMs: 600000, // 10 min
      },
      medium: {
        minSize: 5,
        maxSize: 100,
        growthRate: 20,
        shrinkRate: 15,
        idleTimeoutMs: 300000, // 5 min
      },
      heavy: {
        minSize: 20,
        maxSize: 300,
        growthRate: 40,
        shrinkRate: 10,
        idleTimeoutMs: 120000, // 2 min
      },
    };

    const config = configs[type];

    console.log(`Optimizing for ${type} workload`);

    const result = await this.poolManager.run({
      action: 'auto-scale',
      options: config,
    });

    if (result.success) {
      console.log('Optimization complete');
    }
  }
}

// Usage
const optimizer = new WorkloadOptimizer();
await optimizer.optimizeForWorkload('heavy');
```

### Example 13: Conditional Workflow

```typescript
async function intelligentPoolManagement() {
  const poolManager = new SupabaseConnectionPool();

  // Get current state
  const state = await poolManager.run({
    action: 'full-analysis',
  });

  if (!state.success) {
    console.error('Failed to get pool state');
    return;
  }

  const data = state.data!;

  // Decision tree
  if (data.leakDetection.detected) {
    console.log('Leaks detected - initiating cleanup');
    await poolManager.run({ action: 'kill-idle' });
  }

  if (data.healthSummary.failureRate > 10) {
    console.log('Health issues detected - running diagnostics');
    // Could trigger S-13 Health Dashboard for deep dive
  }

  if (data.poolStats.connections.active / data.poolStats.connections.total > 0.9) {
    console.log('Pool near capacity - scaling up');
    await poolManager.run({
      action: 'auto-scale',
      options: { growthRate: 50 },
    });
  }

  // Apply recommendations
  for (const rec of data.recommendations) {
    console.log(`Action item: ${rec}`);
  }
}
```

---

## Summary

These integration examples show the versatility of the Connection Pool Manager:

- **Standalone**: Simple, direct usage
- **Registry-based**: Centralized skill management
- **Monitoring**: Continuous oversight
- **Alerts**: Integration with notification systems
- **Automation**: Orchestrated optimization
- **Advanced**: Complex workflows and configurations

All patterns follow OpenClaw Aurora's skill framework conventions and best practices.
