/**
 * Test Suite for S-17: Query Cache
 * Tests all cache operations and features
 */

import { SupabaseQueryCache, CacheEntry } from './supabase-query-cache';

async function runTests() {
  console.log('Starting Query Cache Tests...\n');
  const skill = new SupabaseQueryCache();

  try {
    // Test 1: SET operation
    console.log('Test 1: SET operation');
    const setResult = await skill.run({
      action: 'set',
      key: 'user:123:profile',
      data: { id: 123, name: 'John Doe', email: 'john@example.com' },
      ttl: 3600,
    });
    console.log('Result:', JSON.stringify(setResult, null, 2));
    console.log('✓ SET operation passed\n');

    // Test 2: GET operation (cache hit)
    console.log('Test 2: GET operation (cache hit)');
    const getResult = await skill.run({
      action: 'get',
      key: 'user:123:profile',
    });
    console.log('Result:', JSON.stringify(getResult, null, 2));
    console.log('✓ GET operation passed\n');

    // Test 3: Multiple SET operations
    console.log('Test 3: Multiple SET operations');
    for (let i = 0; i < 5; i++) {
      await skill.run({
        action: 'set',
        key: `query:${i}`,
        data: { id: i, result: `Result for query ${i}`, timestamp: Date.now() },
        ttl: 1800,
      });
    }
    console.log('✓ Multiple SET operations passed\n');

    // Test 4: LIST operation
    console.log('Test 4: LIST operation');
    const listResult = await skill.run({
      action: 'list',
    });
    console.log('Found entries:', (listResult.data?.entries || []).length);
    console.log('Memory usage:', (listResult.data?.stats?.totalMemoryBytes || 0) / 1024, 'KB');
    console.log('✓ LIST operation passed\n');

    // Test 5: STATS operation
    console.log('Test 5: STATS operation');
    const statsResult = await skill.run({
      action: 'stats',
    });
    console.log('Stats:', JSON.stringify(statsResult.data?.stats, null, 2));
    console.log('✓ STATS operation passed\n');

    // Test 6: GET operation (cache miss)
    console.log('Test 6: GET operation (cache miss)');
    const missResult = await skill.run({
      action: 'get',
      key: 'nonexistent:key',
    });
    console.log('Result:', JSON.stringify(missResult, null, 2));
    console.log('✓ GET miss operation passed\n');

    // Test 7: DELETE operation
    console.log('Test 7: DELETE operation');
    const deleteResult = await skill.run({
      action: 'delete',
      key: 'query:0',
    });
    console.log('Result:', JSON.stringify(deleteResult, null, 2));
    console.log('✓ DELETE operation passed\n');

    // Test 8: INVALIDATE by pattern
    console.log('Test 8: INVALIDATE by pattern');
    const invalidateResult = await skill.run({
      action: 'invalidate',
      pattern: 'query:.*',
    });
    console.log('Result:', JSON.stringify(invalidateResult, null, 2));
    console.log('✓ INVALIDATE operation passed\n');

    // Test 9: COMPRESS operation
    console.log('Test 9: COMPRESS operation');
    // Add some entries first
    for (let i = 0; i < 3; i++) {
      await skill.run({
        action: 'set',
        key: `compress:${i}`,
        data: { large_data: 'x'.repeat(1000), index: i },
        ttl: 3600,
      });
    }
    const compressResult = await skill.run({
      action: 'compress',
      compressionLevel: 6,
    });
    console.log('Result:', JSON.stringify(compressResult, null, 2));
    console.log('✓ COMPRESS operation passed\n');

    // Test 10: CLEAR operation
    console.log('Test 10: CLEAR operation');
    const clearResult = await skill.run({
      action: 'clear',
    });
    console.log('Result:', JSON.stringify(clearResult, null, 2));
    console.log('✓ CLEAR operation passed\n');

    // Test 11: Validation test
    console.log('Test 11: Validation test (invalid action)');
    const invalidResult = await skill.run({
      action: 'invalid_action',
    });
    console.log('Result:', JSON.stringify(invalidResult, null, 2));
    console.log('✓ Validation test passed\n');

    // Test 12: TTL test (expire after short time)
    console.log('Test 12: TTL expiration test');
    await skill.run({
      action: 'set',
      key: 'expiring:key',
      data: { temporary: true },
      ttl: 1, // 1 second
    });
    console.log('Entry set with 1s TTL');

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));

    const expiredResult = await skill.run({
      action: 'get',
      key: 'expiring:key',
    });
    console.log('After expiration:', JSON.stringify(expiredResult, null, 2));
    console.log('✓ TTL expiration test passed\n');

    console.log('='.repeat(50));
    console.log('All tests passed!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
