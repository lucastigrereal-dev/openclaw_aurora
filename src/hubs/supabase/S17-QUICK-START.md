# S-17 Query Cache - Quick Start Guide

## TL;DR - Get Started in 30 Seconds

```typescript
import { SupabaseQueryCache } from './supabase-query-cache';

const cache = new SupabaseQueryCache();

// Cache something
await cache.run({
  action: 'set',
  key: 'user:123',
  data: { id: 123, name: 'John' },
  ttl: 3600  // 1 hour
});

// Retrieve it
const result = await cache.run({
  action: 'get',
  key: 'user:123'
});

console.log(result.data.entry.data); // { id: 123, name: 'John' }
```

## 8 Core Operations

| Operation | Purpose | Example |
|-----------|---------|---------|
| **set** | Store data with TTL | `{ action: 'set', key: 'user:123', data: {...}, ttl: 3600 }` |
| **get** | Retrieve cached data | `{ action: 'get', key: 'user:123' }` |
| **delete** | Remove single entry | `{ action: 'delete', key: 'user:123' }` |
| **invalidate** | Pattern-based removal | `{ action: 'invalidate', pattern: 'user:123:.*' }` |
| **stats** | Cache metrics | `{ action: 'stats' }` |
| **clear** | Remove all entries | `{ action: 'clear' }` |
| **compress** | Reduce memory usage | `{ action: 'compress', compressionLevel: 6 }` |
| **list** | Show all entries | `{ action: 'list' }` |

## Common Patterns

### Pattern 1: Get with Fallback
```typescript
const cached = await cache.run({ action: 'get', key: 'user:123' });

if (cached.success) {
  return cached.data.entry.data;
}

// Not in cache, fetch and store
const user = await fetchUser(123);
await cache.run({
  action: 'set',
  key: 'user:123',
  data: user,
  ttl: 3600
});
return user;
```

### Pattern 2: Invalidate on Update
```typescript
// Update database
await updateUser(123, newData);

// Clear cache
await cache.run({
  action: 'invalidate',
  pattern: 'user:123:.*'
});
```

### Pattern 3: Monitor Health
```typescript
const stats = await cache.run({ action: 'stats' });
console.log({
  entries: stats.data.stats.totalEntries,
  hitRate: stats.data.stats.hitRate + '%',
  memory: (stats.data.stats.totalMemoryBytes / 1024 / 1024).toFixed(2) + 'MB'
});
```

## Response Structure

Success response:
```typescript
{
  success: true,
  data: {
    cached: true,
    entry: {
      key: string,
      data?: any,
      sizeBytes: number,
      hitCount: number,
      ttl: number,
      // ... other fields
    },
    stats?: CacheStats,
    summary: string
  },
  duration?: number
}
```

Error response:
```typescript
{
  success: false,
  error: 'Error message',
  duration?: number
}
```

## TTL Guidelines

- **Seconds**: 60 - 300 (temporary, per-request data)
- **5-30 minutes**: 300 - 1800 (session, user data)
- **1-4 hours**: 3600 - 14400 (frequently accessed)
- **1 day**: 86400 (relatively static data)

```typescript
// Quick reference
const TTL = {
  temporary: 60,
  session: 1800,
  medium: 3600,
  daily: 86400
};

await cache.run({
  action: 'set',
  key: 'data:key',
  data: someData,
  ttl: TTL.medium
});
```

## Key Naming Best Practices

Use prefixes and hierarchy:
```
user:{userId}:profile
user:{userId}:settings
user:{userId}:posts:page:1

query:users:all:page:1
query:posts:search:{keyword}

config:app:settings
config:features:enabled

computed:leaderboard:weekly
computed:stats:monthly
```

## Files & Locations

```
/mnt/c/Users/lucas/openclaw_aurora/skills/supabase-archon/
├── supabase-query-cache.ts          (635 lines) - Main implementation
├── test-query-cache.ts              (154 lines) - Test suite
├── S-17_QUERY_CACHE_README.md       - Full documentation
├── INTEGRATION-S17.md               - Integration guide
├── DELIVERY-S17-QUERY-CACHE.md      - Project summary
└── S17-QUICK-START.md              - This file
```

## Run Tests

```bash
cd /mnt/c/Users/lucas/openclaw_aurora
npx ts-node skills/supabase-archon/test-query-cache.ts
```

Expected: All 12 tests pass in <500ms

## TypeScript Support

- ✓ Full type safety
- ✓ Interface-based APIs
- ✓ Strict mode compatible
- ✓ No external dependencies (except logger)

## Performance Notes

- Memory: Default 100 MB limit
- LRU eviction when limit reached
- Hit rate: Best with consistent key usage
- Compression: Useful for large payloads

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cache misses | Check key consistency, verify TTL not expired |
| High memory | Use compression or reduce TTL |
| Low hit rate | Increase TTL, verify cache keys |
| Slow performance | Check memory usage, enable compression |

## Complete Example

```typescript
import { SupabaseQueryCache } from './supabase-query-cache';

class UserService {
  private cache = new SupabaseQueryCache();

  async getUser(id: string) {
    // Try cache
    const cached = await this.cache.run({
      action: 'get',
      key: `user:${id}`
    });

    if (cached.success) {
      return cached.data.entry.data;
    }

    // Fetch from DB
    const user = await db.users.findById(id);

    // Cache for 1 hour
    await this.cache.run({
      action: 'set',
      key: `user:${id}`,
      data: user,
      ttl: 3600
    });

    return user;
  }

  async updateUser(id: string, updates: any) {
    // Update DB
    const user = await db.users.update(id, updates);

    // Invalidate cache
    await this.cache.run({
      action: 'invalidate',
      pattern: `user:${id}:.*`
    });

    return user;
  }

  async getCacheStats() {
    return await this.cache.run({
      action: 'stats'
    });
  }
}

// Usage
const service = new UserService();
const user = await service.getUser('123');
await service.updateUser('123', { name: 'Jane' });
const stats = await service.getCacheStats();
```

## Next Steps

1. **Review Full Docs**: Read `S-17_QUERY_CACHE_README.md`
2. **Integration**: See `INTEGRATION-S17.md`
3. **Run Tests**: Execute test suite
4. **Start Using**: Add to your code
5. **Monitor**: Use stats operation regularly

## Support

- Full API Reference: `S-17_QUERY_CACHE_README.md`
- Integration Patterns: `INTEGRATION-S17.md`
- Project Details: `DELIVERY-S17-QUERY-CACHE.md`
- Test Examples: `test-query-cache.ts`

---

**Status**: Production Ready
**Version**: 1.0.0
**Last Updated**: 2026-02-06
