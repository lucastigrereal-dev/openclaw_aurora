# S-28: Cost Analyzer - Usage Examples

## Quick Start

### 1. Basic Cost Analysis

```typescript
import { SupabaseCostAnalyzer } from './supabase-cost-analyzer';

const analyzer = new SupabaseCostAnalyzer();

const result = await analyzer.run({
  currentPlan: 'pro',
  includeOptimizations: true,
});

console.log('Monthly Cost:', result.data?.breakdown.total);
```

### 2. Using Convenience Function

```typescript
import { registerSupabaseArchonSkills, runCostAnalyzer } from './supabase-archon';

// Register all skills
registerSupabaseArchonSkills();

// Run Cost Analyzer
const result = await runCostAnalyzer({
  currentPlan: 'pro',
  projectMonths: 24,
});

if (result.success) {
  console.log('Cost analysis complete!');
}
```

## Detailed Examples

### Example 1: Full Cost Analysis with All Details

```typescript
import { SupabaseCostAnalyzer } from './supabase-cost-analyzer';

async function analyzeProjectCosts() {
  const analyzer = new SupabaseCostAnalyzer();

  const result = await analyzer.run({
    currentPlan: 'pro',
    includeOptimizations: true,
    projectMonths: 12,
  });

  if (!result.success) {
    console.error('Analysis failed:', result.error);
    return;
  }

  const data = result.data!;

  // Display cost breakdown
  console.log('=== COST BREAKDOWN ===');
  console.log(`Database: $${data.breakdown.database.estimatedMonthlyCost.toFixed(2)}`);
  console.log(`  - Size: ${data.breakdown.database.usedGb}GB`);
  console.log(`  - Tier: ${data.breakdown.database.tier}`);

  console.log(`\nEgress: $${data.breakdown.egress.estimatedMonthlyCost.toFixed(2)}`);
  console.log(`  - Transferred: ${data.breakdown.egress.gbTransferred}GB`);
  console.log(`  - Overage: ${data.breakdown.egress.overage}GB`);

  console.log(`\nFunctions: $${data.breakdown.functions.estimatedMonthlyCost.toFixed(2)}`);
  console.log(`  - Invocations: ${data.breakdown.functions.monthlyInvocations.toLocaleString()}`);
  console.log(`  - Overage: ${data.breakdown.functions.overageInvocations.toLocaleString()}`);

  console.log(`\nOther: $${data.breakdown.other.toFixed(2)}`);
  console.log(`\nTOTAL: $${data.breakdown.total.toFixed(2)}/month`);

  // Display plan analysis
  console.log('\n=== PLAN ANALYSIS ===');
  console.log(`Current Plan: ${data.planAnalysis.currentPlan}`);
  console.log(`Recommended Plan: ${data.planAnalysis.recommendedPlan}`);
  console.log(`Optimal: ${data.planAnalysis.isCurrentPlanOptimal ? 'Yes' : 'No'}`);
  console.log(`Monthly Cost: $${data.planAnalysis.estimatedMonthlyCost.toFixed(2)}`);
  console.log(`Yearly Cost: $${data.planAnalysis.estimatedYearlyCost.toFixed(2)}`);

  if (!data.planAnalysis.isCurrentPlanOptimal) {
    console.log(`\nPotential Savings: $${data.planAnalysis.costDifferenceIfSwitched.toFixed(2)}/month`);
  }

  // Display projections
  console.log('\n=== COST PROJECTIONS ===');
  console.log(`Next Month: $${data.projectedCosts.monthly.toFixed(2)}`);
  console.log(`Next Quarter: $${data.projectedCosts.quarterly.toFixed(2)}`);
  console.log(`Next Year: $${data.projectedCosts.yearly.toFixed(2)}`);

  // Display trends
  console.log('\n=== COST TRENDS ===');
  console.log(`Period: ${data.costTrends.period}`);
  console.log(`Monthly Average: $${data.costTrends.monthlyAverage.toFixed(2)}`);
  console.log(`Growth Rate: ${data.costTrends.growthRate.toFixed(2)}%`);

  // Display optimizations
  if (data.optimizations.length > 0) {
    console.log('\n=== OPTIMIZATION RECOMMENDATIONS ===');
    data.optimizations.forEach((opt, i) => {
      console.log(`\n${i + 1}. ${opt.recommendation}`);
      console.log(`   Category: ${opt.category}`);
      console.log(`   Priority: ${opt.priority}`);
      console.log(`   Estimated Savings: $${opt.estimatedSavings.toFixed(2)}/month`);
      console.log(`   Complexity: ${opt.implementationComplexity}`);
      console.log(`   Time to Implement: ${opt.timeToImplement}`);
    });
  }

  // Display alerts
  if (data.alerts.length > 0) {
    console.log('\n=== ALERTS ===');
    data.alerts.forEach((alert) => {
      const icon = alert.level === 'critical' ? '🚨' : alert.level === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`${icon} [${alert.level.toUpperCase()}] ${alert.message}`);
    });
  }

  console.log(`\nAnalysis completed in ${data.analysisDuration}ms`);
}

// Run the analysis
analyzeProjectCosts().catch(console.error);
```

### Example 2: Quick Cost Estimate

```typescript
import { SupabaseCostAnalyzer } from './supabase-cost-analyzer';

async function getQuickCostEstimate() {
  const analyzer = new SupabaseCostAnalyzer();

  // Get estimated monthly cost
  const monthlyCost = await analyzer.quickEstimate({ currentPlan: 'pro' });

  console.log(`Estimated monthly cost: $${monthlyCost.toFixed(2)}`);

  // Format for display
  const formattedCost = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(monthlyCost);

  console.log(`Formatted: ${formattedCost}`);

  return monthlyCost;
}

getQuickCostEstimate();
```

### Example 3: Monitoring Cost Alerts

```typescript
import { SupabaseCostAnalyzer } from './supabase-cost-analyzer';

async function monitorCosts() {
  const analyzer = new SupabaseCostAnalyzer();

  // Check for critical alerts
  const hasCritical = await analyzer.hasCriticalCostAlerts({ currentPlan: 'pro' });

  if (hasCritical) {
    console.error('⚠️ CRITICAL COST ALERTS DETECTED!');
    console.error('Please review your usage and consider optimizations.');

    // Run full analysis to see details
    const result = await analyzer.run({ currentPlan: 'pro' });

    if (result.success && result.data) {
      result.data.alerts
        .filter((a) => a.level === 'critical')
        .forEach((alert) => {
          console.error(`- ${alert.message}`);
        });
    }
  } else {
    console.log('✓ No critical cost alerts');
  }
}

monitorCosts();
```

### Example 4: Getting Top Optimizations

```typescript
import { SupabaseCostAnalyzer } from './supabase-cost-analyzer';

async function displayTopSavings() {
  const analyzer = new SupabaseCostAnalyzer();

  // Get top 5 optimizations
  const topOpts = await analyzer.getTopOptimizations({ currentPlan: 'pro' }, 5);

  console.log('=== TOP COST SAVING OPPORTUNITIES ===\n');

  let totalPotentialSavings = 0;

  topOpts.forEach((opt, i) => {
    const priority = opt.priority === 'high' ? '🔴' : opt.priority === 'medium' ? '🟡' : '🟢';

    console.log(`${i + 1}. ${priority} ${opt.recommendation}`);
    console.log(`   Savings: $${opt.estimatedSavings.toFixed(2)}/month`);
    console.log(`   Time to implement: ${opt.timeToImplement}`);
    console.log(`   Complexity: ${opt.implementationComplexity}`);

    totalPotentialSavings += opt.estimatedSavings;

    if (i < topOpts.length - 1) {
      console.log();
    }
  });

  console.log(`\n💰 Total potential savings: $${totalPotentialSavings.toFixed(2)}/month`);
  console.log(`📈 Yearly savings: $${(totalPotentialSavings * 12).toFixed(2)}`);
}

displayTopSavings();
```

### Example 5: Comparing Plans

```typescript
import { SupabaseCostAnalyzer } from './supabase-cost-analyzer';

async function comparePlans() {
  const analyzer = new SupabaseCostAnalyzer();
  const plans = ['free', 'pro', 'enterprise'] as const;

  console.log('=== PLAN COMPARISON ===\n');
  console.log('Plan        | Monthly Cost | Yearly Cost | Optimal?');
  console.log('------------|--------------|-------------|----------');

  for (const plan of plans) {
    const result = await analyzer.run({ currentPlan: plan });

    if (result.success && result.data) {
      const monthly = result.data.planAnalysis.estimatedMonthlyCost;
      const yearly = result.data.planAnalysis.estimatedYearlyCost;
      const optimal = result.data.planAnalysis.isCurrentPlanOptimal ? 'Yes' : 'No';

      console.log(
        `${plan.padEnd(10)} | $${monthly.toFixed(2).padStart(10)} | $${yearly.toFixed(2).padStart(10)} | ${optimal}`
      );
    }
  }
}

comparePlans();
```

### Example 6: Budget Forecasting

```typescript
import { SupabaseCostAnalyzer } from './supabase-cost-analyzer';

async function forecastBudget(months: number) {
  const analyzer = new SupabaseCostAnalyzer();

  const result = await analyzer.run({
    currentPlan: 'pro',
    projectMonths: months,
  });

  if (!result.success || !result.data) {
    console.error('Forecasting failed');
    return;
  }

  const data = result.data;

  console.log(`=== ${months}-MONTH BUDGET FORECAST ===\n`);

  // Create a simple table
  const months_data = [];
  let runningTotal = 0;

  for (let i = 1; i <= Math.min(months, 12); i++) {
    const monthCost = data.breakdown.total * Math.pow(1.05, i - 1);
    runningTotal += monthCost;

    months_data.push({
      month: i,
      cost: monthCost,
      cumulative: runningTotal,
    });
  }

  console.log('Month | Monthly Cost | Cumulative');
  console.log('------|--------------|------------');

  months_data.forEach(({ month, cost, cumulative }) => {
    console.log(`${month.toString().padStart(5)} | $${cost.toFixed(2).padStart(10)} | $${cumulative.toFixed(2).padStart(10)}`);
  });

  console.log(`\nTotal Projected Cost (${months} months): $${runningTotal.toFixed(2)}`);
}

// Forecast for 6 months
forecastBudget(6);
```

### Example 7: Event Handling

```typescript
import { SupabaseCostAnalyzer } from './supabase-cost-analyzer';

async function analyzeWithEvents() {
  const analyzer = new SupabaseCostAnalyzer();

  // Listen to skill events
  analyzer.on('start', (data) => {
    console.log(`📊 Analysis started: ${data.skill}`);
  });

  analyzer.on('complete', (data) => {
    console.log(`✅ Analysis completed in ${data.result.duration}ms`);
  });

  analyzer.on('error', (data) => {
    console.error(`❌ Analysis error: ${data.error}`);
  });

  analyzer.on('enabled', (data) => {
    console.log(`🟢 Skill enabled: ${data.skill}`);
  });

  analyzer.on('disabled', (data) => {
    console.log(`🔴 Skill disabled: ${data.skill}`);
  });

  // Run analysis
  const result = await analyzer.run({ currentPlan: 'pro' });

  return result;
}

analyzeWithEvents();
```

### Example 8: Conditional Logic Based on Costs

```typescript
import { SupabaseCostAnalyzer } from './supabase-cost-analyzer';

async function makeDecisions() {
  const analyzer = new SupabaseCostAnalyzer();

  const result = await analyzer.run({
    currentPlan: 'pro',
    includeOptimizations: true,
  });

  if (!result.success || !result.data) {
    console.error('Analysis failed');
    return;
  }

  const data = result.data;

  // Decision 1: Should we upgrade?
  if (data.planAnalysis.recommendedPlan !== data.planAnalysis.currentPlan) {
    console.log(`
      💡 RECOMMENDATION: Switch to ${data.planAnalysis.recommendedPlan} plan
      Potential savings: $${data.planAnalysis.costDifferenceIfSwitched.toFixed(2)}/month
    `);
  }

  // Decision 2: Which area needs optimization?
  const costAreas = [
    {
      name: 'Database',
      cost: data.breakdown.database.estimatedMonthlyCost,
    },
    {
      name: 'Egress',
      cost: data.breakdown.egress.estimatedMonthlyCost,
    },
    {
      name: 'Functions',
      cost: data.breakdown.functions.estimatedMonthlyCost,
    },
  ];

  const mostExpensive = costAreas.sort((a, b) => b.cost - a.cost)[0];
  console.log(`\n📌 Largest expense: ${mostExpensive.name} ($${mostExpensive.cost.toFixed(2)}/month)`);

  // Decision 3: Should we implement optimizations?
  const totalSavings = data.optimizations.reduce((sum, opt) => sum + opt.estimatedSavings, 0);

  if (totalSavings > 20) {
    console.log(`\n💰 Total possible savings: $${totalSavings.toFixed(2)}/month`);
    console.log('Consider implementing high-priority optimizations');
  }

  // Decision 4: Is budget stable?
  const growthRate = data.costTrends.growthRate;

  if (growthRate > 10) {
    console.log('\n⚠️ WARNING: Costs are growing rapidly!');
    console.log('Consider implementing growth controls immediately');
  }
}

makeDecisions();
```

### Example 9: Exporting Cost Report

```typescript
import { SupabaseCostAnalyzer } from './supabase-cost-analyzer';

async function generateReport() {
  const analyzer = new SupabaseCostAnalyzer();

  const result = await analyzer.run({
    currentPlan: 'pro',
    includeOptimizations: true,
    projectMonths: 12,
  });

  if (!result.success || !result.data) {
    console.error('Report generation failed');
    return;
  }

  const data = result.data;

  // Create report object
  const report = {
    title: 'Supabase Cost Analysis Report',
    generatedAt: data.timestamp,
    analysis: {
      currentPlan: data.planAnalysis.currentPlan,
      monthlyBudget: data.breakdown.total,
      yearlyBudget: data.breakdown.total * 12,
    },
    breakdown: {
      database: data.breakdown.database.estimatedMonthlyCost,
      egress: data.breakdown.egress.estimatedMonthlyCost,
      functions: data.breakdown.functions.estimatedMonthlyCost,
    },
    recommendations: data.optimizations.map((opt) => ({
      action: opt.recommendation,
      savings: opt.estimatedSavings,
      priority: opt.priority,
      timeToImplement: opt.timeToImplement,
    })),
    projections: data.projectedCosts,
    alerts: data.alerts,
  };

  // Output as JSON
  console.log(JSON.stringify(report, null, 2));

  // Or export to file (example)
  // fs.writeFileSync('cost-report.json', JSON.stringify(report, null, 2));

  return report;
}

generateReport();
```

### Example 10: Scheduled Cost Monitoring

```typescript
import { SupabaseCostAnalyzer } from './supabase-cost-analyzer';

async function startCostMonitoring(intervalMinutes: number = 60) {
  const analyzer = new SupabaseCostAnalyzer();

  console.log(`📊 Starting cost monitoring (every ${intervalMinutes} minutes)`);

  // Monitor immediately
  await checkCosts();

  // Set up interval
  setInterval(checkCosts, intervalMinutes * 60 * 1000);

  async function checkCosts() {
    const result = await analyzer.run({ currentPlan: 'pro' });

    if (!result.success || !result.data) {
      console.error('❌ Cost check failed');
      return;
    }

    const data = result.data;
    const timestamp = new Date(data.timestamp).toLocaleTimeString();

    console.log(`\n[${timestamp}] Cost Check:`);
    console.log(`  Monthly: $${data.breakdown.total.toFixed(2)}`);

    // Alert if costs are high
    const hasCritical = data.alerts.some((a) => a.level === 'critical');
    if (hasCritical) {
      console.warn('  ⚠️ CRITICAL ALERTS DETECTED');
    } else {
      console.log('  ✓ No critical alerts');
    }
  }
}

// Start monitoring every 60 minutes
startCostMonitoring(60);
```

## Real-World Scenarios

### Scenario 1: Growing Startup

```typescript
// Problem: Costs are increasing rapidly as user base grows
// Solution: Monthly monitoring with trend analysis

async function monitorGrowth() {
  const analyzer = new SupabaseCostAnalyzer();

  const result = await analyzer.run({
    currentPlan: 'pro',
    projectMonths: 24, // 2-year forecast
    includeOptimizations: true,
  });

  if (result.data) {
    console.log('Growth Analysis:');
    console.log(`Current: $${result.data.breakdown.total.toFixed(2)}/month`);
    console.log(`Projected (6mo): $${(result.data.breakdown.total * 1.34).toFixed(2)}/month`);
    console.log(`Projected (12mo): $${(result.data.breakdown.total * 1.79).toFixed(2)}/month`);

    const highPriorityOptimizations = result.data.optimizations.filter((o) => o.priority === 'high');
    console.log(`\nRecommended optimizations: ${highPriorityOptimizations.length}`);
  }
}
```

### Scenario 2: Cost Optimization Project

```typescript
// Problem: Need to reduce costs by 30%
// Solution: Implement high-priority optimizations

async function optimizeCosts(targetReduction: number) {
  const analyzer = new SupabaseCostAnalyzer();

  const result = await analyzer.run({
    currentPlan: 'pro',
    includeOptimizations: true,
  });

  if (!result.data) return;

  // Sort by savings
  const sorted = result.data.optimizations.sort((a, b) => b.estimatedSavings - a.estimatedSavings);

  let accumulated = 0;
  const plan = [];

  for (const opt of sorted) {
    accumulated += opt.estimatedSavings;
    plan.push(opt);

    if (accumulated >= targetReduction) break;
  }

  console.log(`Cost Reduction Plan (Target: $${targetReduction}/month):`);
  console.log(`Accumulated Savings: $${accumulated.toFixed(2)}/month\n`);

  plan.forEach((opt, i) => {
    console.log(`${i + 1}. ${opt.recommendation}`);
    console.log(`   Savings: $${opt.estimatedSavings.toFixed(2)}`);
    console.log(`   Time: ${opt.timeToImplement}`);
  });
}

optimizeCosts(50); // Target $50/month savings
```

---

**More examples and advanced use cases coming soon!**
