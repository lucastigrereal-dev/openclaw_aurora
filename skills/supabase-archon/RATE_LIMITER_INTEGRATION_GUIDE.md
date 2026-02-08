# Rate Limiter Integration Guide (S-15)

## Quick Start

### Installation & Import

```typescript
import { SupabaseRateLimiter } from './supabase-rate-limiter';

// Create instance (typically as singleton in your app)
const rateLimiter = new SupabaseRateLimiter();
```

### Basic Usage Pattern

```typescript
// Check if request is allowed
const result = await rateLimiter.execute({
  action: 'check',
  identifier: 'user-id-or-ip',
  cost: 1,
  limiter: 'token-bucket'
});

if (result.data?.check?.allowed) {
  // Process the request
  processRequest();
} else {
  // Return 429 Too Many Requests
  res.status(429).json({
    error: 'Rate limit exceeded',
    retryAfter: result.data?.check?.retryAfter
  });
}
```

---

## Express/Fastify Middleware

### Express Middleware

```typescript
import express from 'express';
import { SupabaseRateLimiter } from './supabase-rate-limiter';

const rateLimiter = new SupabaseRateLimiter();
const app = express();

/**
 * Rate limiting middleware
 */
function rateLimitMiddleware(limiterType: 'token-bucket' | 'sliding-window' | 'quota' = 'token-bucket') {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // Identify the user/IP
      const identifier = req.user?.id || req.ip || 'unknown';

      // Determine cost based on endpoint
      const cost = req.path.includes('/bulk') ? 5 : 1;

      // Check rate limit
      const result = await rateLimiter.execute({
        action: 'check',
        identifier,
        cost,
        limiter: limiterType
      });

      // Set rate limit headers
      if (result.data?.check) {
        res.setHeader('X-RateLimit-Remaining', result.data.check.remaining);
        res.setHeader('X-RateLimit-Reset', new Date(result.data.check.resetAt).toISOString());
      }

      if (!result.data?.check?.allowed) {
        const retryAfter = result.data?.check?.retryAfter || 60;
        res.setHeader('Retry-After', retryAfter);

        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter,
          message: `Please retry after ${retryAfter} seconds`
        });
      }

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      next(); // Allow request if rate limiter fails
    }
  };
}

// Apply middleware
app.use('/api/', rateLimitMiddleware('token-bucket'));

// Protected endpoints
app.post('/api/query', (req, res) => {
  res.json({ success: true, data: [] });
});

app.post('/api/bulk-insert', (req, res) => {
  res.json({ success: true, count: 100 });
});
```

### Fastify Plugin

```typescript
import fastify from 'fastify';
import { SupabaseRateLimiter } from './supabase-rate-limiter';

const rateLimiter = new SupabaseRateLimiter();
const app = fastify();

/**
 * Rate limiting Fastify plugin
 */
async function rateLimitPlugin(fastifyApp: any, options: any) {
  fastifyApp.addHook('preHandler', async (request: any, reply: any) => {
    if (!request.url.startsWith('/api/')) {
      return; // Skip non-API routes
    }

    try {
      const identifier = request.user?.id || request.ip || 'unknown';
      const cost = request.url.includes('/bulk') ? 5 : 1;

      const result = await rateLimiter.execute({
        action: 'check',
        identifier,
        cost,
        limiter: options.limiterType || 'token-bucket'
      });

      // Set rate limit headers
      if (result.data?.check) {
        reply.header('X-RateLimit-Remaining', result.data.check.remaining);
        reply.header('X-RateLimit-Reset', new Date(result.data.check.resetAt).toISOString());
      }

      if (!result.data?.check?.allowed) {
        const retryAfter = result.data?.check?.retryAfter || 60;
        reply.header('Retry-After', retryAfter);

        return reply.code(429).send({
          error: 'Rate limit exceeded',
          retryAfter
        });
      }
    } catch (error) {
      console.error('Rate limit error:', error);
      // Allow request if rate limiter fails
    }
  });
}

// Register plugin
await app.register(rateLimitPlugin, { limiterType: 'token-bucket' });
```

---

## Integration with Supabase Operations

### Protecting Database Queries

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(URL, KEY);
const rateLimiter = new SupabaseRateLimiter();

/**
 * Wrapper for database queries with rate limiting
 */
async function queryWithRateLimit(userId: string, query: () => any) {
  // Check rate limit
  const result = await rateLimiter.execute({
    action: 'check',
    identifier: `user-${userId}`,
    cost: 1,
    limiter: 'quota'  // Use daily quota for DB queries
  });

  if (!result.data?.check?.allowed) {
    throw new Error(`Daily query limit exceeded. Reset in ${result.data?.check?.retryAfter}s`);
  }

  // Execute query
  return await query();
}

// Usage
async function getUserData(userId: string) {
  return queryWithRateLimit(userId, () =>
    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
  );
}

async function getBulkData(userId: string, ids: string[]) {
  return queryWithRateLimit(userId, () =>
    supabase
      .from('data')
      .select('*')
      .in('id', ids)
  );
}
```

### Protecting Real-Time Subscriptions

```typescript
/**
 * Rate limit real-time subscriptions
 */
async function subscribeWithRateLimit(
  userId: string,
  table: string,
  callback: (payload: any) => void
) {
  // Check if user can subscribe
  const result = await rateLimiter.execute({
    action: 'check',
    identifier: `user-${userId}`,
    cost: 2,  // Subscriptions cost more
    limiter: 'token-bucket'
  });

  if (!result.data?.check?.allowed) {
    throw new Error('Rate limit exceeded for subscriptions');
  }

  // Subscribe
  return supabase
    .on('*', { event: '*', schema: 'public', table }, callback)
    .subscribe();
}
```

---

## Tiered Rate Limiting

### Different Limits for Different User Types

```typescript
/**
 * Get rate limit config based on user tier
 */
function getConfigForUserTier(tier: 'free' | 'pro' | 'enterprise'): RateLimitConfig {
  const configs = {
    free: {
      capacity: 100,
      refillRate: 10,
      window: 60000,
      maxRequests: 100  // 100 requests/minute
    },
    pro: {
      capacity: 5000,
      refillRate: 100,
      window: 60000,
      maxRequests: 5000  // 5000 requests/minute
    },
    enterprise: {
      capacity: 100000,
      refillRate: 2000,
      window: 60000,
      maxRequests: 100000  // 100k requests/minute
    }
  };

  return configs[tier];
}

/**
 * Check rate limit with user tier
 */
async function checkWithTier(userId: string, tier: string) {
  const config = getConfigForUserTier(tier as any);

  return await rateLimiter.execute({
    action: 'configure',
    identifier: userId,
    limiter: 'token-bucket',
    config
  });
}
```

---

## Monitoring & Analytics

### Generate Reports

```typescript
/**
 * Get rate limiting metrics
 */
async function getMetrics() {
  const result = await rateLimiter.execute({
    action: 'analytics'
  });

  return result.data?.analytics;
}

/**
 * Log metrics periodically
 */
function setupMetricsLogging() {
  setInterval(async () => {
    const metrics = await getMetrics();

    console.log('Rate Limit Metrics:');
    console.log(`  Total Requests: ${metrics?.totalRequests}`);
    console.log(`  Blocked: ${metrics?.blockedRequests}`);
    console.log(`  Peak Rate: ${metrics?.peakRequestRate} req/s`);

    if (metrics?.topOffenders.length > 0) {
      console.log('  Top Offenders:');
      metrics.topOffenders.forEach(({ identifier, violations }) => {
        console.log(`    - ${identifier}: ${violations} violations`);
      });
    }
  }, 60000); // Every minute
}
```

### Webhook Alerts

```typescript
/**
 * Alert on quota violations
 */
async function monitorQuotasAndAlert() {
  const result = await rateLimiter.execute({
    action: 'analytics'
  });

  const analytics = result.data?.analytics;

  // Alert if too many quota violations
  if (analytics?.quotasExceeded && analytics.quotasExceeded.length > 5) {
    await sendAlert({
      title: 'High Rate Limit Violations',
      message: `${analytics.quotasExceeded.length} users exceeded quotas`,
      offenders: analytics.topOffenders,
      timestamp: new Date().toISOString()
    });
  }
}

// Setup periodic checks
setInterval(monitorQuotasAndAlert, 300000); // Every 5 minutes
```

---

## Advanced Patterns

### Dynamic Rate Limiting Based on Load

```typescript
/**
 * Adjust rate limits based on system load
 */
async function adjustRateLimitsBasedOnLoad(systemLoad: number) {
  const identifier = 'system-default';

  let config: RateLimitConfig;

  if (systemLoad > 0.8) {
    // High load - stricter limits
    config = {
      capacity: 500,
      refillRate: 50,
      window: 60000,
      maxRequests: 500
    };
  } else if (systemLoad > 0.5) {
    // Medium load - normal limits
    config = {
      capacity: 1000,
      refillRate: 100,
      window: 60000,
      maxRequests: 1000
    };
  } else {
    // Low load - generous limits
    config = {
      capacity: 5000,
      refillRate: 500,
      window: 60000,
      maxRequests: 5000
    };
  }

  await rateLimiter.execute({
    action: 'configure',
    identifier,
    limiter: 'token-bucket',
    config
  });
}
```

### Cost-Based Rate Limiting

```typescript
/**
 * Assign costs to different operations
 */
const operationCosts = {
  'simple-query': 1,
  'complex-query': 3,
  'full-scan': 10,
  'bulk-insert': 20,
  'delete-operation': 15,
  'export': 50
};

/**
 * Check rate limit with operation cost
 */
async function executeWithCost(userId: string, operation: keyof typeof operationCosts) {
  const cost = operationCosts[operation];

  const result = await rateLimiter.execute({
    action: 'check',
    identifier: userId,
    cost,
    limiter: 'token-bucket'
  });

  if (!result.data?.check?.allowed) {
    const waitSeconds = result.data?.check?.retryAfter || 60;
    throw new Error(
      `Operation '${operation}' blocked. Costs ${cost} tokens. Retry in ${waitSeconds}s`
    );
  }

  return true;
}
```

---

## Error Handling

### Graceful Degradation

```typescript
/**
 * Rate limiter with fallback
 */
async function checkRateLimitSafe(
  userId: string,
  limiterType: 'token-bucket' | 'sliding-window' = 'token-bucket'
) {
  try {
    const result = await rateLimiter.execute({
      action: 'check',
      identifier: userId,
      cost: 1,
      limiter: limiterType
    });

    return result.data?.check?.allowed ?? true;
  } catch (error) {
    // If rate limiter fails, allow the request
    console.error('Rate limiter error:', error);
    return true;
  }
}
```

---

## Testing

### Mock Rate Limiter

```typescript
/**
 * Mock for testing
 */
class MockRateLimiter {
  async execute(params: any) {
    return {
      success: true,
      data: {
        check: {
          allowed: true,
          remaining: 1000,
          resetAt: Date.now() + 60000
        },
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Use in tests
const rateLimiter = process.env.NODE_ENV === 'test'
  ? new MockRateLimiter()
  : new SupabaseRateLimiter();
```

---

## Performance Tips

1. **Use token-bucket for API endpoints** - Fastest algorithm
2. **Use quota for daily limits** - Lower memory overhead
3. **Cache identifier lookups** - Reduce Map lookups
4. **Implement request batching** - For bulk operations
5. **Monitor memory usage** - With many unique identifiers
6. **Regular cleanup** - Periodically reset old entries

---

## Troubleshooting

### Requests Always Blocked
- Check identifier format (must be consistent)
- Verify cost value (must be > 0)
- Check rate limit configuration

### High Memory Usage
- Limit number of unique identifiers
- Implement periodic cleanup
- Consider distributing across multiple instances

### Inconsistent Behavior
- Use same identifier for same user/IP
- Verify system clock is synchronized
- Check logger output for warnings

---

## Production Checklist

- [ ] Implement proper middleware integration
- [ ] Set up monitoring and alerts
- [ ] Configure appropriate limits for your use case
- [ ] Test with load testing tool
- [ ] Monitor memory usage
- [ ] Plan for distributed deployment (Redis backend)
- [ ] Document limits for API consumers
- [ ] Set up logging and analytics
- [ ] Train support team on handling rate limit issues
- [ ] Plan for emergency overrides

---

## Next Steps

1. **Basic Integration:** Use middleware pattern from this guide
2. **Monitoring:** Set up analytics logging and alerts
3. **Customization:** Adjust limits per user tier
4. **Scaling:** Plan Redis-based distributed rate limiting
5. **Optimization:** Profile and optimize based on real usage

For questions or issues, refer to the main documentation in `SKILL_S15_RATE_LIMITER_SUMMARY.md`.
