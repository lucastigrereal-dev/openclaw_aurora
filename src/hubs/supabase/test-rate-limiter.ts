/**
 * Test Suite for Rate Limiter Skill (S-15)
 * Demonstrates usage patterns and capabilities
 */

import { SupabaseRateLimiter } from './supabase-rate-limiter';

/**
 * Run all test cases
 */
async function runTests() {
  const limiter = new SupabaseRateLimiter();

  console.log('\n========================================');
  console.log('  SUPABASE RATE LIMITER TEST SUITE (S-15)');
  console.log('========================================\n');

  // Test 1: Token Bucket - Basic Check
  console.log('TEST 1: Token Bucket - Basic Check');
  console.log('-----------------------------------');
  const result1 = await limiter.execute({
    action: 'check',
    identifier: 'user-alice',
    cost: 1,
    limiter: 'token-bucket'
  });
  console.log('Request allowed:', result1.data?.check?.allowed);
  console.log('Tokens remaining:', result1.data?.check?.remaining);
  console.log('Reset at:', new Date(result1.data?.check?.resetAt || 0).toISOString());
  console.log();

  // Test 2: Token Bucket - Multiple Requests
  console.log('TEST 2: Token Bucket - Multiple Requests');
  console.log('----------------------------------------');
  for (let i = 0; i < 3; i++) {
    const result = await limiter.execute({
      action: 'check',
      identifier: 'user-bob',
      cost: 10,
      limiter: 'token-bucket'
    });
    console.log(`Request ${i + 1}: Allowed=${result.data?.check?.allowed}, Remaining=${result.data?.check?.remaining}`);
  }
  console.log();

  // Test 3: Sliding Window - Rate Limiting
  console.log('TEST 3: Sliding Window - Rate Limiting');
  console.log('--------------------------------------');
  for (let i = 0; i < 5; i++) {
    const result = await limiter.execute({
      action: 'check',
      identifier: 'ip-192.168.1.1',
      cost: 1,
      limiter: 'sliding-window'
    });
    console.log(`Request ${i + 1}: Allowed=${result.data?.check?.allowed}, Remaining=${result.data?.check?.remaining}`);
  }
  console.log();

  // Test 4: Quota - Daily Limits
  console.log('TEST 4: Quota - Daily Limits');
  console.log('-----------------------------');
  const result4 = await limiter.execute({
    action: 'check',
    identifier: 'user-charlie',
    cost: 100,
    limiter: 'quota'
  });
  console.log('Daily quota check:');
  console.log('  Allowed:', result4.data?.check?.allowed);
  console.log('  Remaining:', result4.data?.check?.remaining);
  console.log('  Reset at:', new Date(result4.data?.check?.resetAt || 0).toISOString());
  console.log();

  // Test 5: Analytics Report
  console.log('TEST 5: Analytics Report');
  console.log('------------------------');
  const result5 = await limiter.execute({
    action: 'analytics'
  });
  const analytics = result5.data?.analytics;
  if (analytics) {
    console.log('Total requests:', analytics.totalRequests);
    console.log('Blocked requests:', analytics.blockedRequests);
    console.log('Average wait time:', analytics.averageWaitTime, 'ms');
    console.log('Peak request rate:', analytics.peakRequestRate, 'req/s');
    console.log('Quotas exceeded:', analytics.quotasExceeded.length);
    if (analytics.topOffenders.length > 0) {
      console.log('Top offenders:');
      analytics.topOffenders.forEach(offender => {
        console.log(`  - ${offender.identifier}: ${offender.violations} violations`);
      });
    }
  }
  console.log();

  // Test 6: Configure Custom Limits
  console.log('TEST 6: Configure Custom Limits');
  console.log('--------------------------------');
  const result6 = await limiter.execute({
    action: 'configure',
    identifier: 'premium-user',
    limiter: 'quota',
    config: {
      capacity: 50000,
      refillRate: 100,
      window: 86400000, // 24 hours
      maxRequests: 50000
    }
  });
  console.log('Configuration message:', result6.data?.message);
  console.log('Success:', result6.success);
  console.log();

  // Test 7: Refill Bucket
  console.log('TEST 7: Refill Bucket');
  console.log('---------------------');
  const result7 = await limiter.execute({
    action: 'refill',
    identifier: 'user-david',
    limiter: 'token-bucket'
  });
  console.log('Refill message:', result7.data?.message);
  console.log('Success:', result7.success);
  console.log();

  // Test 8: Reset Limits
  console.log('TEST 8: Reset Limits');
  console.log('--------------------');
  const result8 = await limiter.execute({
    action: 'reset',
    identifier: 'user-eve',
    limiter: 'token-bucket'
  });
  console.log('Reset message:', result8.data?.message);
  console.log('Success:', result8.success);
  console.log();

  // Test 9: Combined Check with Analytics
  console.log('TEST 9: Combined Check with Analytics');
  console.log('--------------------------------------');
  const result9 = await limiter.execute({
    action: 'check',
    identifier: 'api-client-1',
    cost: 2,
    limiter: 'sliding-window',
    includeAnalytics: true
  });
  console.log('Request allowed:', result9.data?.check?.allowed);
  console.log('Tokens remaining:', result9.data?.check?.remaining);
  console.log('Analytics included:', !!result9.data?.analytics);
  console.log('Total requests (analytics):', result9.data?.analytics?.totalRequests);
  console.log();

  // Test 10: Helper Methods
  console.log('TEST 10: Helper Methods');
  console.log('-----------------------');
  const isAllowed = await limiter.isRequestAllowed('user-frank', 1);
  console.log('isRequestAllowed("user-frank", 1):', isAllowed);

  const resetTime = await limiter.getResetTime('user-grace');
  console.log('getResetTime("user-grace"):', new Date(resetTime).toISOString());

  const status = await limiter.getLimitStatus('user-henry');
  console.log('getLimitStatus("user-henry"):', status);
  console.log();

  // Test 11: Skill Metadata
  console.log('TEST 11: Skill Metadata');
  console.log('------------------------');
  const info = limiter.getInfo();
  console.log('Name:', info.name);
  console.log('Version:', info.version);
  console.log('Category:', info.category);
  console.log('Enabled:', info.enabled);
  console.log('Tags:', info.tags?.join(', '));
  console.log();

  // Test 12: Validation
  console.log('TEST 12: Input Validation');
  console.log('-------------------------');
  const invalidAction = limiter.validate({ action: 'invalid-action' });
  console.log('Validates invalid action:', invalidAction);

  const invalidLimiter = limiter.validate({ limiter: 'invalid-limiter' });
  console.log('Validates invalid limiter:', invalidLimiter);

  const invalidCost = limiter.validate({ cost: -5 });
  console.log('Validates negative cost:', invalidCost);

  const validInput = limiter.validate({ action: 'check', cost: 1 });
  console.log('Validates correct input:', validInput);
  console.log();

  console.log('========================================');
  console.log('  TEST SUITE COMPLETED');
  console.log('========================================\n');
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error.message);
  process.exit(1);
});
