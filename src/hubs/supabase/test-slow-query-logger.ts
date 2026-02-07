/**
 * Test suite for Supabase Slow Query Logger (S-18)
 * Tests all capabilities: capture, analyze, patterns, N+1 detection, top queries, alerts
 *
 * @version 1.0.0
 */

import { SupabaseSlowQueryLogger, SlowQueryLoggerParams } from './supabase-slow-query-logger';

// ============================================================================
// TEST SETUP
// ============================================================================

const logger = new SupabaseSlowQueryLogger();

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('SUPABASE SLOW QUERY LOGGER - TEST SUITE');
  console.log('='.repeat(80) + '\n');

  try {
    // Test 1: Capture slow queries
    console.log('\nTest 1: CAPTURE SLOW QUERIES');
    console.log('-'.repeat(80));
    const captureParams: SlowQueryLoggerParams = {
      action: 'capture',
      threshold: 100,
      timeWindow: 3600000, // 1 hour
    };
    const captureResult = await logger.run(captureParams);
    console.log('Result:', JSON.stringify(captureResult, null, 2));

    // Test 2: Analyze queries
    console.log('\n\nTest 2: ANALYZE QUERIES');
    console.log('-'.repeat(80));
    const analyzeParams: SlowQueryLoggerParams = {
      action: 'analyze',
      threshold: 100,
    };
    const analyzeResult = await logger.run(analyzeParams);
    console.log('Result:', JSON.stringify(analyzeResult, null, 2));

    // Test 3: Detect patterns
    console.log('\n\nTest 3: DETECT QUERY PATTERNS');
    console.log('-'.repeat(80));
    const patternsParams: SlowQueryLoggerParams = {
      action: 'patterns',
      limit: 5,
    };
    const patternsResult = await logger.run(patternsParams);
    console.log('Result:', JSON.stringify(patternsResult, null, 2));

    // Test 4: Detect N+1 issues
    console.log('\n\nTest 4: DETECT N+1 PROBLEMS');
    console.log('-'.repeat(80));
    const nplus1Params: SlowQueryLoggerParams = {
      action: 'nplus1',
    };
    const nplus1Result = await logger.run(nplus1Params);
    console.log('Result:', JSON.stringify(nplus1Result, null, 2));

    // Test 5: Get top queries
    console.log('\n\nTest 5: GET TOP SLOW QUERIES');
    console.log('-'.repeat(80));
    const topParams: SlowQueryLoggerParams = {
      action: 'top_queries',
      limit: 5,
    };
    const topResult = await logger.run(topParams);
    console.log('Result:', JSON.stringify(topResult, null, 2));

    // Test 6: Check alerts
    console.log('\n\nTest 6: CHECK THRESHOLD BREACHES & ALERTS');
    console.log('-'.repeat(80));
    const alertsParams: SlowQueryLoggerParams = {
      action: 'alerts',
      threshold: 100,
      timeWindow: 3600000,
    };
    const alertsResult = await logger.run(alertsParams);
    console.log('Result:', JSON.stringify(alertsResult, null, 2));

    // Test 7: Validation test - invalid action
    console.log('\n\nTest 7: INPUT VALIDATION (invalid action)');
    console.log('-'.repeat(80));
    const invalidParams: SlowQueryLoggerParams = {
      action: 'invalid_action' as any,
    };
    const invalidResult = await logger.run(invalidParams);
    console.log('Result:', JSON.stringify(invalidResult, null, 2));

    // Test 8: Skill info
    console.log('\n\nTest 8: SKILL INFO');
    console.log('-'.repeat(80));
    const info = logger.getInfo();
    console.log('Skill Info:', JSON.stringify(info, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
