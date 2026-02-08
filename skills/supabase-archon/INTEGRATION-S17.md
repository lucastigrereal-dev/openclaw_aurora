# S-17 Query Cache - Integration Guide

Quick start guide for integrating S-17 Query Cache into your Supabase Archon environment.

## 1. Basic Usage

### Option A: Direct Instantiation

```typescript
import { SupabaseQueryCache } from './supabase-archon/supabase-query-cache';

const cache = new SupabaseQueryCache();

// Use it
const result = await cache.run({
  action: 'set',
  key: 'user:123',
  data: { id: 123, name: 'John' },
  ttl: 3600
});

console.log(result);
```

### Option B: Via Skill Registry

```typescript
import { getSkillRegistry } from './skills/skill-base';
import { SupabaseQueryCache } from './supabase-archon/supabase-query-cache';

// Register the skill
const registry = getSkillRegistry();
const cache = new SupabaseQueryCache();
registry.register(cache);

// Execute via registry
const result = await registry.execute('supabase-query-cache', {
  action: 'get',
  key: 'user:123'
});
```

## 2. Common Patterns

### Pattern 1: Cache Query Results

```typescript
async function getCachedUser(userId: string) {
  // Try cache first
  const cached = await cache.run({
    action: 'get',
    key: `user:${userId}`
  });

  if (cached.success) {
    console.log('Cache hit!');
    return cached.data.entry.data;
  }

  // Fetch from database
  const user = await db.users.findOne(userId);

  // Cache the result
  await cache.run({
    action: 'set',
    key: `user:${userId}`,
    data: user,
    ttl: 3600  // 1 hour
  });

  return user;
}
```

### Pattern 2: Invalidate on Update

```typescript
async function updateUser(userId: string, updates: any) {
  // Update database
  await db.users.update(userId, updates);

  // Clear related caches
  await cache.run({
    action: 'invalidate',
    pattern: `user:${userId}:.*`
  });

  console.log(`Caches for user ${userId} invalidated`);
}
```

### Pattern 3: Monitor Cache Health

```typescript
async function checkCacheHealth() {
  const stats = await cache.run({ action: 'stats' });

  const health = {
    entries: stats.data.stats.totalEntries,
    memoryMB: (stats.data.stats.totalMemoryBytes / 1024 / 1024).toFixed(2),
    hitRate: stats.data.stats.hitRate,
    missRate: stats.data.stats.missRate,
    avgTTL: stats.data.stats.avgTTL,
  };

  console.log('Cache Health:', health);

  // Take action if needed
  if (stats.data.stats.totalMemoryBytes > 80 * 1024 * 1024) {
    console.log('Compressing cache...');
    await cache.run({
      action: 'compress',
      compressionLevel: 8
    });
  }

  return health;
}
```

### Pattern 4: Warming the Cache

```typescript
async function warmCache() {
  const hotData = [
    { key: 'config:app', ttl: 86400 },
    { key: 'settings:global', ttl: 86400 },
    { key: 'leaderboard:weekly', ttl: 3600 },
  ];

  for (const item of hotData) {
    const data = await fetchData(item.key);
    await cache.run({
      action: 'set',
      key: item.key,
      data,
      ttl: item.ttl
    });
  }

  console.log('Cache warmed');
}
```

## 3. Integration with Existing Code

### In Controllers

```typescript
import { SupabaseQueryCache } from '../skills/supabase-archon/supabase-query-cache';

const cache = new SupabaseQueryCache();

export async function getUserProfile(req, res) {
  try {
    const userId = req.params.userId;

    // Try cache
    const cached = await cache.run({
      action: 'get',
      key: `user:${userId}:profile`
    });

    if (cached.success) {
      return res.json(cached.data.entry.data);
    }

    // Fetch from DB
    const profile = await db.getUserProfile(userId);

    // Cache for 1 hour
    await cache.run({
      action: 'set',
      key: `user:${userId}:profile`,
      data: profile,
      ttl: 3600
    });

    return res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### In Services

```typescript
export class UserService {
  private cache = new SupabaseQueryCache();

  async getUser(id: string) {
    // First try cache
    const cached = await this.cache.run({
      action: 'get',
      key: `user:${id}`
    });

    if (cached.success) {
      return cached.data.entry.data;
    }

    // Fetch and cache
    const user = await this.fetchUserFromDB(id);
    await this.cache.run({
      action: 'set',
      key: `user:${id}`,
      data: user,
      ttl: 3600
    });

    return user;
  }

  async updateUser(id: string, data: any) {
    await this.updateUserInDB(id, data);

    // Invalidate cache
    await this.cache.run({
      action: 'invalidate',
      pattern: `user:${id}:.*`
    });
  }
}
```

## 4. Configuration

### Memory Limits

```typescript
// Create with custom memory limit (50 MB instead of default 100 MB)
const cache = new SupabaseQueryCache();

// Note: Memory limit is hardcoded to 100MB in v1.0
// To change, modify the constructor:
// this.cacheEngine = new CacheEngine(50 * 1024 * 1024); // 50 MB
```

### TTL Recommendations

```typescript
// Short-lived (user-specific, session data)
const shortTTL = 300;        // 5 minutes

// Medium-lived (frequently accessed data)
const mediumTTL = 3600;      // 1 hour

// Long-lived (relatively static data)
const longTTL = 86400;       // 1 day

// Example usage
await cache.run({
  action: 'set',
  key: 'session:xyz',
  data: sessionData,
  ttl: shortTTL
});
```

## 5. Error Handling

```typescript
async function safeCacheGet(key: string) {
  try {
    const result = await cache.run({
      action: 'get',
      key
    });

    if (!result.success) {
      console.warn(`Cache miss for ${key}:`, result.error);
      return null;
    }

    return result.data.entry.data;
  } catch (error) {
    console.error('Cache error:', error);
    // Fail gracefully - fetch from source
    return null;
  }
}
```

## 6. Monitoring & Alerts

```typescript
// Periodic health check
setInterval(async () => {
  const stats = await cache.run({ action: 'stats' });

  const data = stats.data.stats;

  // Alert if hit rate is too low
  if (data.hitRate < 50) {
    console.warn('Low cache hit rate:', data.hitRate);
  }

  // Alert if memory is high
  if (data.totalMemoryBytes > 90 * 1024 * 1024) {
    console.warn('Cache memory usage critical');
    // Compress or clear
    await cache.run({ action: 'compress', compressionLevel: 9 });
  }

  // Log stats
  console.log('Cache stats:', {
    entries: data.totalEntries,
    hitRate: data.hitRate + '%',
    memory: (data.totalMemoryBytes / 1024 / 1024).toFixed(2) + 'MB'
  });
}, 60000); // Every minute
```

## 7. Testing Integration

```typescript
import { SupabaseQueryCache } from './supabase-archon/supabase-query-cache';
import { describe, it, expect } from 'vitest';

describe('Cache Integration', () => {
  let cache: SupabaseQueryCache;

  beforeEach(() => {
    cache = new SupabaseQueryCache();
  });

  afterEach(async () => {
    await cache.run({ action: 'clear' });
  });

  it('should cache and retrieve data', async () => {
    const key = 'test:data';
    const data = { id: 1, value: 'test' };

    // Set
    const setResult = await cache.run({
      action: 'set',
      key,
      data,
      ttl: 3600
    });
    expect(setResult.success).toBe(true);

    // Get
    const getResult = await cache.run({
      action: 'get',
      key
    });
    expect(getResult.success).toBe(true);
    expect(getResult.data.entry.data).toEqual(data);
  });

  it('should handle cache misses', async () => {
    const result = await cache.run({
      action: 'get',
      key: 'nonexistent'
    });
    expect(result.success).toBe(false);
  });
});
```

## 8. Troubleshooting

### Cache Not Working?

1. **Check key consistency**
   ```typescript
   // Make sure you use the same key
   const key = `user:${userId}`;
   await cache.run({ action: 'set', key, data });
   const result = await cache.run({ action: 'get', key }); // Same key
   ```

2. **Check TTL**
   ```typescript
   // Is your TTL too short?
   ttl: 60 // Too short!
   ttl: 3600 // Better (1 hour)
   ```

3. **Monitor cache stats**
   ```typescript
   const stats = await cache.run({ action: 'stats' });
   console.log('Hit rate:', stats.data.stats.hitRate); // Should be >0
   ```

### Memory Issues?

1. **Compress the cache**
   ```typescript
   await cache.run({
     action: 'compress',
     compressionLevel: 8
   });
   ```

2. **Clear old entries**
   ```typescript
   await cache.run({ action: 'clear' });
   ```

3. **Reduce TTL values**
   ```typescript
   // Use shorter TTLs to auto-expire entries faster
   ttl: 1800 // 30 minutes instead of 1 hour
   ```

## 9. Advanced Patterns

### Multi-Tenant Cache

```typescript
async function getCachedUserData(tenantId: string, userId: string) {
  const key = `tenant:${tenantId}:user:${userId}`;
  // ... rest of caching logic
}

// Invalidate all data for a tenant
async function invalidateTenantCache(tenantId: string) {
  await cache.run({
    action: 'invalidate',
    pattern: `tenant:${tenantId}:.*`
  });
}
```

### Cascade Invalidation

```typescript
async function updatePost(postId: string, data: any) {
  await db.posts.update(postId, data);

  // Invalidate the post and related caches
  await cache.run({
    action: 'invalidate',
    pattern: `post:${postId}:.*`
  });

  // Also invalidate user's posts list
  const post = await db.posts.findOne(postId);
  await cache.run({
    action: 'invalidate',
    pattern: `user:${post.userId}:posts:.*`
  });
}
```

## 10. Best Practices Checklist

- [ ] Use consistent key naming conventions
- [ ] Set appropriate TTL values based on data freshness requirements
- [ ] Monitor cache hit rates
- [ ] Implement proper invalidation on data updates
- [ ] Handle cache misses gracefully
- [ ] Implement periodic health checks
- [ ] Compress cache when approaching memory limits
- [ ] Add error handling for all cache operations
- [ ] Test cache behavior in your test suite
- [ ] Document cache keys used in your application

## Support

For issues or questions:
1. Check `S-17_QUERY_CACHE_README.md` for detailed documentation
2. Review test examples in `test-query-cache.ts`
3. Check logs via `supabase-logger`
4. Refer to integration examples above
