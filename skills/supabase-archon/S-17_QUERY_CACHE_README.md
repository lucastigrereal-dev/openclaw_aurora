# S-17: Supabase Query Cache

**Intelligent Query Result Caching with Smart Invalidation, TTL Management, and Memory Optimization**

## Overview

The Query Cache skill (S-17) provides comprehensive caching capabilities for Supabase queries with intelligent memory management, pattern-based invalidation, automatic compression, and detailed performance metrics.

## Features

### Core Capabilities

1. **Query Result Caching**
   - Cache any query result with configurable TTL
   - Automatic expiration based on time-to-live
   - Fast in-memory lookup with O(1) retrieval

2. **Smart Invalidation**
   - Pattern-based cache invalidation using regex
   - Batch invalidation of related entries
   - Support for custom invalidation rules

3. **TTL Management**
   - Configurable time-to-live per cache entry
   - Automatic expiration without polling
   - Flexible TTL from seconds to hours

4. **Memory Management**
   - Configurable maximum memory limit (default: 100 MB)
   - Least Recently Used (LRU) eviction policy
   - Real-time memory usage tracking

5. **Cache Compression**
   - Optional compression of cache entries
   - Configurable compression level (1-9)
   - Transparency ratio reporting

6. **Performance Metrics**
   - Hit rate and miss rate tracking
   - Entry count and memory statistics
   - Detailed cache statistics API

## Installation & Setup

### Files Created

```
/mnt/c/Users/lucas/openclaw_aurora/skills/supabase-archon/
├── supabase-query-cache.ts          # Main skill implementation
├── test-query-cache.ts              # Test suite
└── S-17_QUERY_CACHE_README.md       # This file
```

### Dependencies

- `skill-base.ts` - Base Skill class
- `supabase-logger.ts` - Logging utilities

### TypeScript Version

Compatible with TypeScript 4.5+

## API Reference

### Operations

#### 1. SET - Cache a Query Result

```typescript
const result = await skill.run({
  action: 'set',
  key: 'user:123:profile',
  data: { id: 123, name: 'John Doe', email: 'john@example.com' },
  ttl: 3600  // 1 hour
});
```

**Parameters:**
- `action: 'set'` - Operation type
- `key: string` - Unique cache key
- `data: any` - Data to cache
- `ttl: number` - Time-to-live in seconds (default: 3600)

**Response:**
```typescript
{
  success: true,
  data: {
    cached: true,
    entry: {
      key: string,
      createdAt: number,
      expiresAt: number,
      ttl: number,
      sizeBytes: number,
      hitCount: number
    },
    summary: string
  }
}
```

#### 2. GET - Retrieve Cached Result

```typescript
const result = await skill.run({
  action: 'get',
  key: 'user:123:profile'
});
```

**Parameters:**
- `action: 'get'` - Operation type
- `key: string` - Cache key to retrieve

**Response:**
```typescript
{
  success: true,
  data: {
    cached: true,
    entry: {
      key: string,
      data: any,  // Actual cached data
      hitCount: number,
      lastAccessAt: number
    },
    summary: string
  }
}
```

#### 3. DELETE - Remove Cache Entry

```typescript
const result = await skill.run({
  action: 'delete',
  key: 'user:123:profile'
});
```

**Parameters:**
- `action: 'delete'` - Operation type
- `key: string` - Cache key to delete

**Response:**
```typescript
{
  success: boolean,
  data: {
    summary: string
  }
}
```

#### 4. INVALIDATE - Pattern-Based Invalidation

```typescript
const result = await skill.run({
  action: 'invalidate',
  pattern: 'user:123:.*'  // Regex pattern
});
```

**Parameters:**
- `action: 'invalidate'` - Operation type
- `pattern: string | RegExp` - Pattern to match keys

**Response:**
```typescript
{
  success: true,
  data: {
    evicted: number,  // Count of invalidated entries
    summary: string
  }
}
```

#### 5. STATS - Get Cache Statistics

```typescript
const result = await skill.run({
  action: 'stats'
});
```

**Parameters:**
- `action: 'stats'` - Operation type

**Response:**
```typescript
{
  success: true,
  data: {
    stats: {
      totalEntries: number,
      totalMemoryBytes: number,
      hitRate: number,        // Percentage
      missRate: number,       // Percentage
      evictionCount: number,
      compressionRatio: number,
      avgTTL: number,
      oldestEntry: number,    // Timestamp
      newestEntry: number     // Timestamp
    },
    summary: string
  }
}
```

#### 6. CLEAR - Remove All Entries

```typescript
const result = await skill.run({
  action: 'clear'
});
```

**Parameters:**
- `action: 'clear'` - Operation type

**Response:**
```typescript
{
  success: true,
  data: {
    evicted: number,  // Count of cleared entries
    summary: string
  }
}
```

#### 7. COMPRESS - Compress Cache Entries

```typescript
const result = await skill.run({
  action: 'compress',
  compressionLevel: 6  // 1-9 (default: 6)
});
```

**Parameters:**
- `action: 'compress'` - Operation type
- `compressionLevel: number` - Compression level 1-9

**Response:**
```typescript
{
  success: true,
  data: {
    compressed: number,  // Count of compressed entries
    stats: CacheStats,
    summary: string
  }
}
```

#### 8. LIST - List All Cache Entries

```typescript
const result = await skill.run({
  action: 'list'
});
```

**Parameters:**
- `action: 'list'` - Operation type

**Response:**
```typescript
{
  success: true,
  data: {
    entries: CacheEntry[],
    stats: CacheStats,
    summary: string
  }
}
```

## Usage Examples

### Example 1: Caching User Profile

```typescript
import { SupabaseQueryCache } from './supabase-query-cache';

const cache = new SupabaseQueryCache();

// Fetch and cache user profile
const userProfile = await fetchUserProfile(123);
await cache.run({
  action: 'set',
  key: 'user:123:profile',
  data: userProfile,
  ttl: 3600  // Cache for 1 hour
});

// Retrieve from cache
const cached = await cache.run({
  action: 'get',
  key: 'user:123:profile'
});

if (cached.success) {
  console.log('User profile from cache:', cached.data.entry.data);
}
```

### Example 2: Invalidating Related Cache Entries

```typescript
// When user profile is updated, invalidate related cache
await cache.run({
  action: 'invalidate',
  pattern: 'user:123:.*'  // Invalidates all keys starting with "user:123:"
});
```

### Example 3: Monitoring Cache Performance

```typescript
// Get cache statistics
const stats = await cache.run({
  action: 'stats'
});

console.log('Cache hit rate:', stats.data.stats.hitRate, '%');
console.log('Memory used:', stats.data.stats.totalMemoryBytes / 1024 / 1024, 'MB');
console.log('Total entries:', stats.data.stats.totalEntries);
```

### Example 4: Optimizing Memory Usage

```typescript
// Compress cache to reduce memory footprint
const compressed = await cache.run({
  action: 'compress',
  compressionLevel: 6
});

console.log('Entries compressed:', compressed.data.compressed);
console.log('Compression ratio:', compressed.data.stats.compressionRatio);
```

## Cache Key Naming Conventions

Recommended key patterns for consistent organization:

```typescript
// User data
'user:{userId}:profile'
'user:{userId}:preferences'
'user:{userId}:settings'

// Query results
'query:{tableId}:{hash}'
'query:users:all:page:1'
'query:posts:search:keyword'

// Computed values
'computed:{type}:{identifier}'
'computed:leaderboard:weekly'
'computed:stats:daily'
```

## Performance Characteristics

### Time Complexity
- **GET**: O(1)
- **SET**: O(1)
- **DELETE**: O(1)
- **INVALIDATE**: O(n) where n = total entries
- **LIST**: O(n) where n = total entries

### Space Complexity
- **Overall**: O(n) where n = number of cached entries
- **Max Memory**: Configurable (default 100 MB)

### Memory Estimation
- Empty cache: ~1 KB
- Per entry overhead: ~200 bytes
- Per 1000 entries: ~200 KB overhead

## Best Practices

### 1. TTL Selection

```typescript
// Short-lived data
{
  action: 'set',
  key: 'temp:data',
  data: tempData,
  ttl: 60  // 1 minute
}

// Medium-lived data
{
  action: 'set',
  key: 'user:123:profile',
  data: profile,
  ttl: 3600  // 1 hour
}

// Long-lived data
{
  action: 'set',
  key: 'config:app:settings',
  data: settings,
  ttl: 86400  // 1 day
}
```

### 2. Invalidation Strategy

```typescript
// Invalidate all related entries when data changes
async function updateUserProfile(userId, newData) {
  await updateDatabase(userId, newData);

  // Invalidate all user-related caches
  await cache.run({
    action: 'invalidate',
    pattern: `user:${userId}:.*`
  });
}
```

### 3. Memory Management

```typescript
// Monitor and compress when needed
const stats = await cache.run({ action: 'stats' });

if (stats.data.stats.totalMemoryBytes > 80 * 1024 * 1024) {
  // Use compression when approaching 80% of limit
  await cache.run({
    action: 'compress',
    compressionLevel: 8
  });
}
```

### 4. Error Handling

```typescript
const result = await cache.run({
  action: 'get',
  key: 'user:123:profile'
});

if (!result.success) {
  console.log('Cache miss or error:', result.error);
  // Fetch from database instead
  const data = await fetchFromDatabase();

  // Cache for next time
  await cache.run({
    action: 'set',
    key: 'user:123:profile',
    data,
    ttl: 3600
  });
}
```

## Monitoring & Debugging

### Check Cache Health

```typescript
const stats = await cache.run({ action: 'stats' });

const health = {
  totalEntries: stats.data.stats.totalEntries,
  memoryMB: (stats.data.stats.totalMemoryBytes / 1024 / 1024).toFixed(2),
  hitRate: stats.data.stats.hitRate,
  evictions: stats.data.stats.evictionCount,
  avgTTL: stats.data.stats.avgTTL,
};

console.log('Cache Health:', health);
```

### List All Entries

```typescript
const list = await cache.run({ action: 'list' });

list.data.entries.forEach(entry => {
  console.log({
    key: entry.key,
    sizeKB: (entry.sizeBytes / 1024).toFixed(2),
    age: Date.now() - entry.createdAt,
    hits: entry.hitCount,
    compressed: entry.compressed
  });
});
```

## Limitations & Considerations

1. **In-Memory Only**: Cache is cleared when process restarts
2. **Single Process**: Not shared between multiple processes
3. **No Persistence**: Data is not persisted to disk
4. **Max Memory**: Enforced through LRU eviction
5. **No Async Data**: Must be JSON-serializable

## Integration with Supabase

### Example: Caching Query Results

```typescript
import { createClient } from '@supabase/supabase-js';
import { SupabaseQueryCache } from './supabase-query-cache';

const supabase = createClient(URL, KEY);
const cache = new SupabaseQueryCache();

async function getUserWithCache(userId) {
  // Try cache first
  const cached = await cache.run({
    action: 'get',
    key: `user:${userId}`
  });

  if (cached.success) {
    return cached.data.entry.data;
  }

  // Fetch from Supabase
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;

  // Cache result
  await cache.run({
    action: 'set',
    key: `user:${userId}`,
    data,
    ttl: 3600
  });

  return data;
}
```

## Testing

Run the test suite:

```bash
npx ts-node skills/supabase-archon/test-query-cache.ts
```

Tests cover:
- SET/GET operations
- TTL expiration
- Pattern-based invalidation
- Compression
- Memory management
- Cache statistics

## Troubleshooting

### Cache Misses

If you're experiencing unexpected cache misses:
1. Check key naming consistency
2. Verify TTL hasn't expired
3. Monitor memory usage (LRU eviction)
4. Check pattern invalidation rules

### High Memory Usage

If cache is using too much memory:
1. Reduce TTL values
2. Use compression
3. Check for large entries
4. Implement selective caching

### Performance Issues

If queries seem slower than expected:
1. Check hit rate with STATS
2. Verify cache keys are correct
3. Consider TTL too short
4. Profile memory usage

## Future Enhancements

- [ ] Persistent storage backend
- [ ] Distributed cache support
- [ ] Cache warming strategies
- [ ] Metrics export (Prometheus)
- [ ] Advanced compression algorithms
- [ ] Cache layer tiering
- [ ] Custom eviction policies
- [ ] Real-time invalidation events

## Version History

### v1.0.0 (Current)
- Initial release
- Core caching operations
- Memory management
- Pattern-based invalidation
- Compression support
- Performance metrics

## Support & Documentation

For issues or questions:
1. Check test suite for examples
2. Review best practices section
3. Check logs via supabase-logger
4. Validate input parameters

## License

Part of OpenClaw Aurora - Supabase Archon Suite
