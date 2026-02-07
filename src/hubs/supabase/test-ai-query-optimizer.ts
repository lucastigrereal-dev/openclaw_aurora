/**
 * Test Suite - AI Query Optimizer (S-30)
 *
 * Tests the AI Query Optimizer skill with various query scenarios
 */

import { SupabaseAIQueryOptimizer } from './supabase-ai-query-optimizer';

async function runTests() {
  const optimizer = new SupabaseAIQueryOptimizer();

  console.log('\n========================================');
  console.log('AI Query Optimizer (S-30) - Test Suite');
  console.log('========================================\n');

  // Test 1: SELECT * Query
  console.log('Test 1: SELECT * with no WHERE clause');
  console.log('Query: SELECT * FROM users');
  const result1 = await optimizer.run({
    query: 'SELECT * FROM users',
    analyzeIndexes: true,
    analyzeJoins: true,
    predictPerformance: true,
    includeLearnedPatterns: true,
  });
  printResult(result1);

  // Test 2: Complex JOIN Query
  console.log('\nTest 2: Complex multi-JOIN query');
  const complexQuery = `
    SELECT u.id, u.name, o.order_date, p.product_name
    FROM users u
    JOIN orders o ON u.id = o.user_id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE u.status = 'active'
  `;
  const result2 = await optimizer.run({
    query: complexQuery,
    analyzeIndexes: true,
    analyzeJoins: true,
    predictPerformance: true,
  });
  printResult(result2);

  // Test 3: LIKE Pattern Query
  console.log('\nTest 3: Query with LIKE pattern');
  const likeQuery = "SELECT * FROM products WHERE name LIKE '%laptop%'";
  const result3 = await optimizer.run({
    query: likeQuery,
    analyzeIndexes: true,
    predictPerformance: true,
  });
  printResult(result3);

  // Test 4: Nested Subqueries
  console.log('\nTest 4: Query with nested subqueries');
  const nestedQuery = `
    SELECT u.name FROM users u
    WHERE u.id IN (
      SELECT user_id FROM orders
      WHERE order_date > '2024-01-01'
      AND id IN (
        SELECT order_id FROM order_items
        WHERE quantity > 5
      )
    )
  `;
  const result4 = await optimizer.run({
    query: nestedQuery,
    analyzeIndexes: true,
    predictPerformance: true,
  });
  printResult(result4);

  // Test 5: Optimized Query
  console.log('\nTest 5: Already optimized query');
  const optimizedQuery = `
    SELECT u.id, u.name, u.email
    FROM users u
    WHERE u.status = 'active' AND u.created_at > '2024-01-01'
    ORDER BY u.created_at DESC
    LIMIT 100
  `;
  const result5 = await optimizer.run({
    query: optimizedQuery,
    analyzeIndexes: true,
    predictPerformance: true,
  });
  printResult(result5);

  console.log('\n========================================');
  console.log('Test Suite Complete');
  console.log('========================================\n');
}

function printResult(result: any) {
  if (result.success && result.data) {
    const data = result.data;
    console.log(`Status: ✓ Success`);
    console.log(`Score: ${data.overallScore}/100`);
    console.log(`Confidence: ${data.confidenceLevel}`);
    console.log(`Summary: ${data.summary}`);

    if (data.optimization) {
      console.log(`\nOptimization:`);
      console.log(`  Confidence: ${(data.optimization.confidence * 100).toFixed(1)}%`);
      console.log(`  Speedup: ${data.optimization.estimatedSpeedup.toFixed(2)}x`);
      console.log(`  Reasoning: ${data.optimization.reasoning}`);
    }

    if (data.indexSuggestions && data.indexSuggestions.length > 0) {
      console.log(`\nIndex Suggestions (${data.indexSuggestions.length}):`);
      data.indexSuggestions.forEach((idx: any, i: number) => {
        console.log(`  ${i + 1}. ${idx.tableName}(${idx.columnNames.join(', ')})`);
        console.log(`     Priority: ${idx.priority}, Impact: ${idx.expectedImpact}%`);
      });
    }

    if (data.joinOptimizations && data.joinOptimizations.length > 0) {
      console.log(`\nJoin Optimizations (${data.joinOptimizations.length}):`);
      data.joinOptimizations.forEach((opt: any, i: number) => {
        console.log(`  ${i + 1}. Cost reduction: ${opt.estimatedCostReduction}%`);
        console.log(`     Reasoning: ${opt.reasoning}`);
      });
    }

    if (data.performancePrediction) {
      console.log(`\nPerformance Prediction:`);
      console.log(`  Duration: ~${data.performancePrediction.estimatedDuration}ms`);
      console.log(`  Rows Scanned: ${data.performancePrediction.estimatedRowsScanned}`);
      console.log(`  Memory: ${data.performancePrediction.estimatedMemoryUsage}`);
      console.log(`  Scalability: ${data.performancePrediction.scalabilityRating}/100`);
      if (data.performancePrediction.riskFactors.length > 0) {
        console.log(`  Risks: ${data.performancePrediction.riskFactors.join(', ')}`);
      }
    }
  } else {
    console.log(`Status: ✗ Failed`);
    console.log(`Error: ${result.error}`);
  }
}

// Run tests
runTests().catch(console.error);
