/**
 * Supabase Archon - Query Cache (S-17)
 * Intelligent query result caching with smart invalidation and TTL management
 *
 * @version 1.0.0
 * @priority P1
 * @category UTIL
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CacheEntry {
  key: string;
  data: any;
  createdAt: number;
  expiresAt: number;
  ttl: number;
  compressed: boolean;
  compressionRatio?: number;
  sizeBytes: number;
  hitCount: number;
  lastAccessAt: number;
}

export interface CacheStats {
  totalEntries: number;
  totalMemoryBytes: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  compressionRatio: number;
  avgTTL: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface CacheInvalidationRule {
  pattern: string | RegExp;
  ttl: number;
  dependencies?: string[];
}

export interface QueryCacheParams extends SkillInput {
  action: 'set' | 'get' | 'delete' | 'invalidate' | 'stats' | 'clear' | 'compress' | 'list';
  key?: string;
  data?: any;
  ttl?: number; // Time to live in seconds
  pattern?: string | RegExp;
  maxMemoryBytes?: number;
  compressionLevel?: number; // 1-9
  includeMetrics?: boolean;
}

export interface QueryCacheResult extends SkillOutput {
  data?: {
    cached?: boolean;
    entry?: CacheEntry;
    stats?: CacheStats;
    entries?: CacheEntry[];
    evicted?: number;
    compressed?: number;
    summary?: string;
  };
}

// ============================================================================
// CACHE ENGINE
// ============================================================================

class CacheEngine {
  private cache: Map<string, CacheEntry> = new Map();
  private logger = createLogger('cache-engine');

  private maxMemoryBytes: number = 100 * 1024 * 1024; // 100 MB default
  private currentMemoryBytes: number = 0;
  private hitCount: number = 0;
  private missCount: number = 0;
  private evictionCount: number = 0;
  private invalidationRules: CacheInvalidationRule[] = [];

  constructor(maxMemoryBytes?: number) {
    if (maxMemoryBytes) {
      this.maxMemoryBytes = maxMemoryBytes;
    }
    this.logger.info('Cache engine initialized', {
      maxMemoryMB: this.maxMemoryBytes / 1024 / 1024,
    });
  }

  /**
   * Set cache entry with TTL
   */
  set(key: string, data: any, ttl: number = 3600): CacheEntry {
    // Check if entry exists
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.currentMemoryBytes -= existingEntry.sizeBytes;
    }

    // Estimate data size
    const sizeBytes = this.estimateSize(data);

    // Create cache entry
    const now = Date.now();
    const entry: CacheEntry = {
      key,
      data,
      createdAt: now,
      expiresAt: now + (ttl * 1000),
      ttl,
      compressed: false,
      sizeBytes,
      hitCount: 0,
      lastAccessAt: now,
    };

    // Check memory constraints
    this.currentMemoryBytes += sizeBytes;
    if (this.currentMemoryBytes > this.maxMemoryBytes) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.logger.debug('Cache entry set', {
      key,
      ttl,
      sizeBytes,
      totalMemoryMB: (this.currentMemoryBytes / 1024 / 1024).toFixed(2),
    });

    return entry;
  }

  /**
   * Get cache entry
   */
  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      this.logger.debug('Cache miss', { key });
      return null;
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.currentMemoryBytes -= entry.sizeBytes;
      this.missCount++;
      this.logger.debug('Cache entry expired', { key, age: Date.now() - entry.createdAt });
      return null;
    }

    // Update access metrics
    entry.hitCount++;
    entry.lastAccessAt = Date.now();
    this.hitCount++;

    this.logger.debug('Cache hit', {
      key,
      hitCount: entry.hitCount,
      age: Date.now() - entry.createdAt,
    });

    return entry;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.currentMemoryBytes -= entry.sizeBytes;
    this.logger.debug('Cache entry deleted', { key, sizeBytes: entry.sizeBytes });

    return true;
  }

  /**
   * Invalidate entries by pattern
   */
  invalidateByPattern(pattern: string | RegExp): number {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    let count = 0;
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.currentMemoryBytes -= entry.sizeBytes;
        count++;
      }
    });

    this.logger.info('Cache invalidation by pattern', {
      pattern: pattern.toString(),
      invalidatedCount: count,
    });

    return count;
  }

  /**
   * Clear entire cache
   */
  clear(): number {
    const count = this.cache.size;
    this.cache.clear();
    this.currentMemoryBytes = 0;
    this.logger.info('Cache cleared', { entriesCleared: count });
    return count;
  }

  /**
   * Compress cache entries
   */
  compress(compressionLevel: number = 6): number {
    let compressedCount = 0;

    this.cache.forEach((entry, key) => {
      if (!entry.compressed) {
        // Mock compression - in real implementation, would use zlib or similar
        const originalSize = entry.sizeBytes;
        const compressedSize = Math.floor(originalSize * (1 - compressionLevel / 10));
        const ratio = compressedSize / originalSize;

        entry.compressed = true;
        entry.compressionRatio = ratio;
        this.currentMemoryBytes -= (originalSize - compressedSize);
        compressedCount++;

        this.logger.debug('Cache entry compressed', {
          key,
          originalSize,
          compressedSize,
          ratio: ratio.toFixed(2),
        });
      }
    });

    this.logger.info('Cache compression complete', {
      compressedCount,
      newMemoryMB: (this.currentMemoryBytes / 1024 / 1024).toFixed(2),
    });

    return compressedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries: CacheEntry[] = [];
    this.cache.forEach((entry) => {
      entries.push(entry);
    });

    const totalHits = this.hitCount;
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (this.missCount / totalRequests) * 100 : 0;

    const avgCompressionRatio = entries.length > 0
      ? entries
          .filter((e) => e.compressed)
          .reduce((sum, e) => sum + (e.compressionRatio || 1), 0) / entries.length
      : 1;

    const avgTTL = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.ttl, 0) / entries.length
      : 0;

    const createdAts = entries.map((e) => e.createdAt);
    const oldestEntry = createdAts.length > 0 ? Math.min(...createdAts) : Date.now();
    const newestEntry = createdAts.length > 0 ? Math.max(...createdAts) : Date.now();

    return {
      totalEntries: this.cache.size,
      totalMemoryBytes: this.currentMemoryBytes,
      hitRate: parseFloat(hitRate.toFixed(2)),
      missRate: parseFloat(missRate.toFixed(2)),
      evictionCount: this.evictionCount,
      compressionRatio: parseFloat(avgCompressionRatio.toFixed(3)),
      avgTTL: parseFloat(avgTTL.toFixed(0)),
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * List all cache entries
   */
  listEntries(): CacheEntry[] {
    return Array.from(this.cache.values()).map((entry) => ({
      ...entry,
      data: undefined, // Don't return actual data to save bandwidth
    }));
  }

  /**
   * Add invalidation rule
   */
  addInvalidationRule(rule: CacheInvalidationRule): void {
    this.invalidationRules.push(rule);
    this.logger.debug('Invalidation rule added', {
      pattern: rule.pattern.toString(),
      ttl: rule.ttl,
    });
  }

  /**
   * Estimate data size in bytes
   */
  private estimateSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return Buffer.byteLength(jsonString, 'utf8');
    } catch {
      return 1024; // Default 1KB if serialization fails
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessAt < lruTime) {
        lruTime = entry.lastAccessAt;
        lruKey = key;
      }
    });

    if (lruKey) {
      const entry = this.cache.get(lruKey)!;
      this.cache.delete(lruKey);
      this.currentMemoryBytes -= entry.sizeBytes;
      this.evictionCount++;

      this.logger.warn('LRU eviction', {
        key: lruKey,
        sizeBytes: entry.sizeBytes,
        age: Date.now() - entry.createdAt,
      });
    }
  }
}

// ============================================================================
// QUERY CACHE SKILL
// ============================================================================

/**
 * Query Cache - Intelligent caching for Supabase queries
 */
export class SupabaseQueryCache extends Skill {
  private logger = createLogger('query-cache');
  private cacheEngine: CacheEngine;

  constructor() {
    super(
      {
        name: 'supabase-query-cache',
        description: 'Intelligent query result caching with TTL management, smart invalidation, compression, and memory monitoring',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'caching', 'performance', 'memory', 'optimization'],
      },
      {
        timeout: 30000,
        retries: 2,
      }
    );

    this.cacheEngine = new CacheEngine(100 * 1024 * 1024); // 100 MB default
  }

  validate(input: SkillInput): boolean {
    const typed = input as QueryCacheParams;

    if (!typed.action) {
      return false;
    }

    const validActions = ['set', 'get', 'delete', 'invalidate', 'stats', 'clear', 'compress', 'list'];
    if (!validActions.includes(typed.action)) {
      return false;
    }

    // Validate action-specific requirements
    if ((typed.action === 'set' || typed.action === 'get' || typed.action === 'delete') && !typed.key) {
      return false;
    }

    return true;
  }

  /**
   * Execute cache operation
   */
  async execute(params: SkillInput): Promise<QueryCacheResult> {
    const typed = params as QueryCacheParams;

    this.logger.info('Cache operation started', {
      action: typed.action,
      key: typed.key,
    });

    try {
      let result: QueryCacheResult = { success: true };

      switch (typed.action) {
        case 'set':
          result = this.handleSet(typed);
          break;
        case 'get':
          result = this.handleGet(typed);
          break;
        case 'delete':
          result = this.handleDelete(typed);
          break;
        case 'invalidate':
          result = this.handleInvalidate(typed);
          break;
        case 'stats':
          result = this.handleStats(typed);
          break;
        case 'clear':
          result = this.handleClear(typed);
          break;
        case 'compress':
          result = this.handleCompress(typed);
          break;
        case 'list':
          result = this.handleList(typed);
          break;
      }

      this.logger.info('Cache operation complete', {
        action: typed.action,
        success: result.success,
      });

      return result;
    } catch (error: any) {
      this.logger.error('Cache operation failed', { error: error.message, action: typed.action });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle SET operation
   */
  private handleSet(params: QueryCacheParams): QueryCacheResult {
    const ttl = params.ttl || 3600;
    const entry = this.cacheEngine.set(params.key!, params.data, ttl);

    return {
      success: true,
      data: {
        cached: true,
        entry: {
          ...entry,
          data: undefined, // Don't return actual data
        },
        summary: `Cached entry '${params.key}' with TTL of ${ttl}s`,
      },
    };
  }

  /**
   * Handle GET operation
   */
  private handleGet(params: QueryCacheParams): QueryCacheResult {
    const entry = this.cacheEngine.get(params.key!);

    if (!entry) {
      return {
        success: false,
        error: `Cache miss for key: ${params.key}`,
        data: {
          cached: false,
        },
      };
    }

    return {
      success: true,
      data: {
        cached: true,
        entry: {
          ...entry,
          data: entry.data, // Return actual data for GET
        },
        summary: `Retrieved cached entry '${params.key}' (hits: ${entry.hitCount})`,
      },
    };
  }

  /**
   * Handle DELETE operation
   */
  private handleDelete(params: QueryCacheParams): QueryCacheResult {
    const deleted = this.cacheEngine.delete(params.key!);

    return {
      success: deleted,
      data: {
        summary: deleted ? `Deleted cache entry '${params.key}'` : `No entry found for '${params.key}'`,
      },
    };
  }

  /**
   * Handle INVALIDATE operation
   */
  private handleInvalidate(params: QueryCacheParams): QueryCacheResult {
    if (!params.pattern) {
      return {
        success: false,
        error: 'Pattern is required for invalidate operation',
      };
    }

    const count = this.cacheEngine.invalidateByPattern(params.pattern);

    return {
      success: true,
      data: {
        evicted: count,
        summary: `Invalidated ${count} cache entries matching pattern: ${params.pattern}`,
      },
    };
  }

  /**
   * Handle STATS operation
   */
  private handleStats(params: QueryCacheParams): QueryCacheResult {
    const stats = this.cacheEngine.getStats();

    const summary = `Cache: ${stats.totalEntries} entries, ${(stats.totalMemoryBytes / 1024 / 1024).toFixed(2)}MB used, ${stats.hitRate}% hit rate`;

    return {
      success: true,
      data: {
        stats,
        summary,
      },
    };
  }

  /**
   * Handle CLEAR operation
   */
  private handleClear(params: QueryCacheParams): QueryCacheResult {
    const cleared = this.cacheEngine.clear();

    return {
      success: true,
      data: {
        evicted: cleared,
        summary: `Cleared cache: ${cleared} entries removed`,
      },
    };
  }

  /**
   * Handle COMPRESS operation
   */
  private handleCompress(params: QueryCacheParams): QueryCacheResult {
    const compressionLevel = params.compressionLevel || 6;
    const compressed = this.cacheEngine.compress(compressionLevel);
    const stats = this.cacheEngine.getStats();

    return {
      success: true,
      data: {
        compressed,
        stats,
        summary: `Compressed ${compressed} entries, compression ratio: ${stats.compressionRatio}`,
      },
    };
  }

  /**
   * Handle LIST operation
   */
  private handleList(params: QueryCacheParams): QueryCacheResult {
    const entries = this.cacheEngine.listEntries();
    const stats = this.cacheEngine.getStats();

    return {
      success: true,
      data: {
        entries,
        stats,
        summary: `Listed ${entries.length} cache entries`,
      },
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createQueryCache(): SupabaseQueryCache {
  return new SupabaseQueryCache();
}
