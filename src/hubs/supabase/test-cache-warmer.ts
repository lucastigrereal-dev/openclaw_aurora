/**
 * Test Suite for Cache Warmer (S-16)
 * Demonstrates usage of the SupabaseCacheWarmer skill
 */

import { SupabaseCacheWarmer, CacheWarmerParams } from './supabase-cache-warmer';

/**
 * Run example test scenarios
 */
async function runTests() {
  const warmer = new SupabaseCacheWarmer();

  console.log('Cache Warmer Skill Test Suite');
  console.log('=============================\n');

  // Test 1: Identify hot queries
  console.log('Test 1: Identify hot queries');
  console.log('----------------------------');
  const identifyResult = await warmer.run({
    action: 'identify_hot_queries',
    timewindowDays: 7,
    maxCacheSize: 10, // 10 MB limit
  } as CacheWarmerParams);
  console.log(JSON.stringify(identifyResult, null, 2));
  console.log('\n');

  // Test 2: Warm cache
  console.log('Test 2: Warm cache');
  console.log('------------------');
  const warmResult = await warmer.run({
    action: 'warm_cache',
  } as CacheWarmerParams);
  console.log(JSON.stringify(warmResult, null, 2));
  console.log('\n');

  // Test 3: Get analytics
  console.log('Test 3: Get cache analytics');
  console.log('---------------------------');
  const analyticsResult = await warmer.run({
    action: 'get_analytics',
  } as CacheWarmerParams);
  console.log(JSON.stringify(analyticsResult, null, 2));
  console.log('\n');

  // Test 4: Detect stale cache
  console.log('Test 4: Detect stale cache');
  console.log('---------------------------');
  const staleResult = await warmer.run({
    action: 'detect_stale',
  } as CacheWarmerParams);
  console.log(JSON.stringify(staleResult, null, 2));
  console.log('\n');

  // Test 5: Schedule refresh
  console.log('Test 5: Schedule cache refresh');
  console.log('-------------------------------');
  const scheduleResult = await warmer.run({
    action: 'schedule_refresh',
    queryIds: ['Q001', 'Q002', 'Q004'],
    refreshIntervalMs: 300000, // 5 minutes
  } as CacheWarmerParams);
  console.log(JSON.stringify(scheduleResult, null, 2));
  console.log('\n');

  // Test 6: Invalid action
  console.log('Test 6: Invalid action handling');
  console.log('-------------------------------');
  const invalidResult = await warmer.run({
    action: 'invalid_action',
  } as CacheWarmerParams);
  console.log(JSON.stringify(invalidResult, null, 2));
  console.log('\n');

  // Display skill info
  console.log('Skill Metadata');
  console.log('--------------');
  console.log(JSON.stringify(warmer.getInfo(), null, 2));
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };
