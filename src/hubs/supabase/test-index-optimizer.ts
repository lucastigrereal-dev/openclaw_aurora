/**
 * Test Suite for Supabase Index Optimizer (S-09)
 * Tests all index optimization capabilities
 *
 * @version 1.0.0
 */

import { SupabaseIndexOptimizer } from './supabase-index-optimizer';
import { IndexOptimizerParams } from './supabase-index-optimizer';

async function runTests() {
  const optimizer = new SupabaseIndexOptimizer();

  console.log('========================================');
  console.log('Supabase Index Optimizer - Test Suite');
  console.log('========================================\n');

  // Test 1: Analyze Index Usage
  console.log('Test 1: Analyze Current Index Usage');
  console.log('-'.repeat(40));
  const analyzeResult = await optimizer.run({
    action: 'analyze',
  } as IndexOptimizerParams);
  console.log(JSON.stringify(analyzeResult, null, 2));
  console.log('\n');

  // Test 2: Recommend Indexes from Slow Queries
  console.log('Test 2: Recommend Indexes from Slow Queries');
  console.log('-'.repeat(40));
  const recommendResult = await optimizer.run({
    action: 'recommend',
  } as IndexOptimizerParams);
  console.log(JSON.stringify(recommendResult, null, 2));
  console.log('\n');

  // Test 3: Dry Run Index Creation
  console.log('Test 3: Dry Run Index Creation');
  console.log('-'.repeat(40));
  const dryRunResult = await optimizer.run({
    action: 'create',
    dryRun: true,
  } as IndexOptimizerParams);
  console.log(JSON.stringify(dryRunResult, null, 2));
  console.log('\n');

  // Test 4: Detect Unused Indexes
  console.log('Test 4: Detect Unused Indexes');
  console.log('-'.repeat(40));
  const unusedResult = await optimizer.run({
    action: 'detect_unused',
  } as IndexOptimizerParams);
  console.log(JSON.stringify(unusedResult, null, 2));
  console.log('\n');

  // Test 5: Evaluate Index Efficiency
  console.log('Test 5: Evaluate Index Efficiency');
  console.log('-'.repeat(40));
  const efficiencyResult = await optimizer.run({
    action: 'evaluate_efficiency',
  } as IndexOptimizerParams);
  console.log(JSON.stringify(efficiencyResult, null, 2));
  console.log('\n');

  // Test 6: Invalid Action (Error Handling)
  console.log('Test 6: Invalid Action (Error Handling)');
  console.log('-'.repeat(40));
  const errorResult = await optimizer.run({
    action: 'invalid_action',
  } as any);
  console.log(JSON.stringify(errorResult, null, 2));
  console.log('\n');

  // Test 7: Get Skill Info
  console.log('Test 7: Skill Information');
  console.log('-'.repeat(40));
  console.log(JSON.stringify(optimizer.getInfo(), null, 2));
  console.log('\n');

  console.log('========================================');
  console.log('All tests completed!');
  console.log('========================================');
}

// Run tests
runTests().catch(console.error);
