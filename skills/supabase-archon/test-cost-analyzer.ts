/**
 * Test Suite: Supabase Cost Analyzer (S-28)
 *
 * Demonstrates all capabilities of the Cost Analyzer skill
 */

import { SupabaseCostAnalyzer } from './supabase-cost-analyzer';
import type { CostAnalyzerParams, CostAnalyzerResult } from './supabase-cost-analyzer';

/**
 * Teste 1: Análise de custo básica
 */
async function testBasicCostAnalysis() {
  console.log('\n========== TEST 1: Basic Cost Analysis ==========\n');

  const analyzer = new SupabaseCostAnalyzer();

  const result = await analyzer.run({
    currentPlan: 'pro',
    includeOptimizations: true,
    projectMonths: 12,
  } as CostAnalyzerParams);

  if (result.success && result.data) {
    console.log('Cost Breakdown:');
    console.log(`  Database: $${result.data.breakdown.database.estimatedMonthlyCost.toFixed(2)}/month`);
    console.log(`  Egress: $${result.data.breakdown.egress.estimatedMonthlyCost.toFixed(2)}/month`);
    console.log(`  Functions: $${result.data.breakdown.functions.estimatedMonthlyCost.toFixed(2)}/month`);
    console.log(`  Other: $${result.data.breakdown.other.toFixed(2)}/month`);
    console.log(`  TOTAL: $${result.data.breakdown.total.toFixed(2)}/month`);

    console.log('\nPlan Analysis:');
    console.log(`  Current Plan: ${result.data.planAnalysis.currentPlan}`);
    console.log(`  Recommended Plan: ${result.data.planAnalysis.recommendedPlan}`);
    console.log(`  Optimal: ${result.data.planAnalysis.isCurrentPlanOptimal}`);
    console.log(`  Monthly Cost: $${result.data.planAnalysis.estimatedMonthlyCost.toFixed(2)}`);
    console.log(`  Yearly Cost: $${result.data.planAnalysis.estimatedYearlyCost.toFixed(2)}`);

    console.log('\nProjected Costs:');
    console.log(`  Monthly: $${result.data.projectedCosts.monthly.toFixed(2)}`);
    console.log(`  Quarterly: $${result.data.projectedCosts.quarterly.toFixed(2)}`);
    console.log(`  Yearly: $${result.data.projectedCosts.yearly.toFixed(2)}`);

    console.log('\nOptimizations Recommended:');
    result.data.optimizations.forEach((opt, i) => {
      console.log(`  ${i + 1}. ${opt.recommendation}`);
      console.log(`     Priority: ${opt.priority}`);
      console.log(`     Estimated Savings: $${opt.estimatedSavings.toFixed(2)}/month`);
      console.log(`     Complexity: ${opt.implementationComplexity}`);
      console.log(`     Time to Implement: ${opt.timeToImplement}`);
    });

    console.log('\nAlerts:');
    if (result.data.alerts.length === 0) {
      console.log('  No alerts - costs are within expected ranges');
    } else {
      result.data.alerts.forEach((alert, i) => {
        console.log(`  ${i + 1}. [${alert.level.toUpperCase()}] ${alert.message}`);
      });
    }

    console.log('\nCost Trends:');
    console.log(`  Period: ${result.data.costTrends.period}`);
    console.log(`  Monthly Average: $${result.data.costTrends.monthlyAverage.toFixed(2)}`);
    console.log(`  Growth Rate: ${result.data.costTrends.growthRate.toFixed(2)}%`);

    console.log(`\nAnalysis Duration: ${result.data.analysisDuration}ms`);
  } else {
    console.error('Error:', result.error);
  }
}

/**
 * Teste 2: Validação de entrada
 */
async function testInputValidation() {
  console.log('\n========== TEST 2: Input Validation ==========\n');

  const analyzer = new SupabaseCostAnalyzer();

  // Teste com plano inválido
  console.log('Testing with invalid plan...');
  let result = await analyzer.run({
    currentPlan: 'invalid' as any,
  } as CostAnalyzerParams);

  if (!result.success) {
    console.log('✓ Invalid plan correctly rejected');
  }

  // Teste com months inválido
  console.log('Testing with invalid projectMonths...');
  result = await analyzer.run({
    currentPlan: 'pro',
    projectMonths: 100,
  } as CostAnalyzerParams);

  if (!result.success) {
    console.log('✓ Invalid projectMonths correctly rejected');
  }

  // Teste válido
  console.log('Testing with valid parameters...');
  result = await analyzer.run({
    currentPlan: 'pro',
    projectMonths: 12,
  } as CostAnalyzerParams);

  if (result.success) {
    console.log('✓ Valid parameters accepted');
  }
}

/**
 * Teste 3: Comparação de planos
 */
async function testPlanComparison() {
  console.log('\n========== TEST 3: Plan Comparison ==========\n');

  const analyzer = new SupabaseCostAnalyzer();

  const plans = ['free', 'pro', 'enterprise'] as const;

  for (const plan of plans) {
    console.log(`\nAnalyzing ${plan.toUpperCase()} plan:`);

    const result = await analyzer.run({
      currentPlan: plan,
      includeOptimizations: true,
    } as CostAnalyzerParams);

    if (result.success && result.data) {
      console.log(`  Estimated Monthly: $${result.data.planAnalysis.estimatedMonthlyCost.toFixed(2)}`);
      console.log(`  Recommended Plan: ${result.data.planAnalysis.recommendedPlan}`);
      console.log(`  Is Optimal: ${result.data.planAnalysis.isCurrentPlanOptimal}`);

      if (result.data.planAnalysis.estimatedMonthlyCost > 0) {
        console.log(`  Top Optimization: ${result.data.optimizations[0]?.recommendation}`);
      }
    }
  }
}

/**
 * Teste 4: Métodos auxiliares
 */
async function testHelperMethods() {
  console.log('\n========== TEST 4: Helper Methods ==========\n');

  const analyzer = new SupabaseCostAnalyzer();
  const params = { currentPlan: 'pro' } as CostAnalyzerParams;

  // Quick estimate
  console.log('Quick Estimate:');
  const estimate = await analyzer.quickEstimate(params);
  console.log(`  Monthly Cost: $${estimate.toFixed(2)}`);

  // Check critical alerts
  console.log('\nCritical Alerts Check:');
  const hasCritical = await analyzer.hasCriticalCostAlerts(params);
  console.log(`  Has Critical Alerts: ${hasCritical}`);

  // Top optimizations
  console.log('\nTop 3 Optimizations:');
  const topOpts = await analyzer.getTopOptimizations(params, 3);
  topOpts.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt.recommendation}`);
    console.log(`     Savings: $${opt.estimatedSavings.toFixed(2)}/month`);
  });
}

/**
 * Teste 5: Skill metadata
 */
async function testSkillMetadata() {
  console.log('\n========== TEST 5: Skill Metadata ==========\n');

  const analyzer = new SupabaseCostAnalyzer();
  const info = analyzer.getInfo();

  console.log('Skill Information:');
  console.log(`  Name: ${info.name}`);
  console.log(`  Version: ${info.version}`);
  console.log(`  Description: ${info.description}`);
  console.log(`  Category: ${info.category}`);
  console.log(`  Author: ${info.author}`);
  console.log(`  Tags: ${info.tags?.join(', ')}`);
  console.log(`  Enabled: ${info.enabled}`);
  console.log(`  Timeout: ${info.config?.timeout}ms`);
  console.log(`  Retries: ${info.config?.retries}`);
}

/**
 * Teste 6: Desabilitar/Habilitar skill
 */
async function testSkillToggle() {
  console.log('\n========== TEST 6: Skill Toggle ==========\n');

  const analyzer = new SupabaseCostAnalyzer();

  console.log('Initial state: enabled =', analyzer.isEnabled());

  analyzer.disable();
  console.log('After disable(): enabled =', analyzer.isEnabled());

  const result = await analyzer.run({ currentPlan: 'pro' } as CostAnalyzerParams);
  console.log('Execution result when disabled:', result.success ? 'Success' : `Failed - ${result.error}`);

  analyzer.enable();
  console.log('After enable(): enabled =', analyzer.isEnabled());

  const result2 = await analyzer.run({ currentPlan: 'pro' } as CostAnalyzerParams);
  console.log('Execution result when enabled:', result2.success ? 'Success' : `Failed - ${result2.error}`);
}

/**
 * Executa todos os testes
 */
async function runAllTests() {
  console.log('\n████████████████████████████████████████████');
  console.log('█  SUPABASE COST ANALYZER (S-28) TEST SUITE  █');
  console.log('████████████████████████████████████████████\n');

  try {
    await testBasicCostAnalysis();
    await testInputValidation();
    await testPlanComparison();
    await testHelperMethods();
    await testSkillMetadata();
    await testSkillToggle();

    console.log('\n████████████████████████████████████████████');
    console.log('█  ALL TESTS COMPLETED SUCCESSFULLY!  ✓      █');
    console.log('████████████████████████████████████████████\n');
  } catch (error) {
    console.error('\n[ERROR] Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

export {
  testBasicCostAnalysis,
  testInputValidation,
  testPlanComparison,
  testHelperMethods,
  testSkillMetadata,
  testSkillToggle,
  runAllTests,
};
