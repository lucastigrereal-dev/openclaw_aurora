# S-16 Cache Warmer - Architecture & Design

## System Architecture

### Class Hierarchy

```
Skill (from skill-base.ts)
    │
    └─── SupabaseCacheWarmer
            ├── Metadata
            ├── Logger
            ├── Cache Registry
            ├── Refresh Schedules
            └── Mock Data
```

### Component Diagram

```
┌─────────────────────────────────────────────────────┐
│         SupabaseCacheWarmer Skill                   │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  Public Methods (execute entry point)       │  │
│  │  ├─ run()                                   │  │
│  │  └─ execute()                               │  │
│  └─────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌─────────────────────────────────────────────┐  │
│  │  Action Handlers                            │  │
│  │  ├─ identifyHotQueries()                    │  │
│  │  ├─ warmCache()                             │  │
│  │  ├─ getAnalytics()                          │  │
│  │  ├─ detectStaleCache()                      │  │
│  │  └─ scheduleRefresh()                       │  │
│  └─────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌─────────────────────────────────────────────┐  │
│  │  Support Methods                            │  │
│  │  └─ generateRecommendations()               │  │
│  └─────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌─────────────────────────────────────────────┐  │
│  │  Data Sources                               │  │
│  │  ├─ cacheRegistry (Map)                     │  │
│  │  ├─ refreshSchedules (Map)                  │  │
│  │  ├─ mockHotQueries (Array)                  │  │
│  │  └─ mockCacheMetrics (Array)                │  │
│  └─────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌─────────────────────────────────────────────┐  │
│  │  Logger (SupabaseLogger)                    │  │
│  │  ├─ debug()                                 │  │
│  │  ├─ info()                                  │  │
│  │  ├─ warn()                                  │  │
│  │  └─ error()                                 │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Identify Hot Queries Flow

```
                    Input: CacheWarmerParams
                              ↓
                    ┌─────────────────────┐
                    │  validate(input)    │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ identifyHotQueries()│
                    └──────────┬──────────┘
                               ↓
                ┌──────────────────────────────┐
                │  Sort by priority score      │
                └──────────┬───────────────────┘
                           ↓
            ┌──────────────────────────────────┐
            │  Filter by maxCacheSize          │
            └──────────┬───────────────────────┘
                       ↓
          ┌────────────────────────────────────┐
          │  generateRecommendations()         │
          └──────────┬───────────────────────┘
                     ↓
        ┌──────────────────────────────────┐
        │  Return CacheWarmerResult        │
        │  ├─ hotQueries[]                 │
        │  ├─ estimatedTotalSize           │
        │  ├─ summary                      │
        │  └─ recommendations[]            │
        └──────────────────────────────────┘
```

### Cache Warming Flow

```
                    Input: CacheWarmerParams
                     (queryIds optional)
                              ↓
                    ┌─────────────────────┐
                    │  warmCache()        │
                    └──────────┬──────────┘
                               ↓
        ┌──────────────────────────────────┐
        │  Filter queries to warm          │
        │  (specific or all hot queries)   │
        └──────────┬───────────────────────┘
                   ↓
    ┌──────────────────────────────────────┐
    │  For each query:                     │
    │  ├─ Add to cacheRegistry             │
    │  └─ Accumulate totalSize             │
    └──────────┬───────────────────────────┘
               ↓
  ┌────────────────────────────────────────┐
  │  Return CacheWarmerResult              │
  │  ├─ preWarmedCount                     │
  │  ├─ estimatedTotalSize                 │
  │  └─ summary                            │
  └────────────────────────────────────────┘
```

### Analytics Retrieval Flow

```
                    Input: CacheWarmerParams
                              ↓
                    ┌─────────────────────┐
                    │  getAnalytics()     │
                    └──────────┬──────────┘
                               ↓
            ┌──────────────────────────────┐
            │  Calculate totals:           │
            │  ├─ totalHits                │
            │  ├─ totalMisses              │
            │  └─ overallHitRate           │
            └──────────┬───────────────────┘
                       ↓
            ┌──────────────────────────────┐
            │  Identify slow queries       │
            │  (avgResponseTime > avg*1.5) │
            └──────────┬───────────────────┘
                       ↓
          ┌────────────────────────────────┐
          │  Generate recommendations:     │
          │  ├─ If hitRate < 80%           │
          │  └─ If slow queries exist      │
          └──────────┬───────────────────┘
                     ↓
        ┌──────────────────────────────────┐
        │  Return CacheWarmerResult        │
        │  ├─ metrics[]                    │
        │  ├─ summary                      │
        │  └─ recommendations[]            │
        └──────────────────────────────────┘
```

### Stale Detection Flow

```
                    Input: CacheWarmerParams
                              ↓
                    ┌─────────────────────┐
                    │ detectStaleCache()  │
                    └──────────┬──────────┘
                               ↓
        ┌──────────────────────────────────┐
        │  STALE_THRESHOLD = 3600000ms     │
        │  (1 hour)                        │
        └──────────┬───────────────────────┘
                   ↓
    ┌──────────────────────────────────────┐
    │  Filter stale metrics:               │
    │  staleness > STALE_THRESHOLD         │
    └──────────┬───────────────────────────┘
               ↓
      ┌────────────────────────────────────┐
      │  Extract stale query IDs           │
      │  Map to full metric data           │
      └──────────┬───────────────────────┘
                 ↓
    ┌──────────────────────────────────────┐
    │  Return CacheWarmerResult            │
    │  ├─ staleQueries[]                   │
    │  ├─ metrics[]                        │
    │  └─ recommendations[]                │
    └──────────────────────────────────────┘
```

### Refresh Scheduling Flow

```
                    Input: CacheWarmerParams
                    (queryIds, refreshIntervalMs)
                              ↓
                    ┌─────────────────────┐
                    │ scheduleRefresh()   │
                    └──────────┬──────────┘
                               ↓
            ┌──────────────────────────────┐
            │  Calculate:                  │
            │  ├─ now = current time       │
            │  ├─ nextRefresh = now +      │
            │  │               interval    │
            │  └─ refreshInterval          │
            └──────────┬───────────────────┘
                       ↓
            ┌──────────────────────────────┐
            │  For each query ID:          │
            │  ├─ Create schedule object   │
            │  ├─ Store in refreshSchedules│
            │  └─ Add to result            │
            └──────────┬───────────────────┘
                       ↓
          ┌────────────────────────────────┐
          │  Return CacheWarmerResult      │
          │  ├─ schedules[]                │
          │  └─ summary                    │
          └────────────────────────────────┘
```

## Type System Architecture

### Input/Output Chain

```
CacheWarmerParams (extends SkillInput)
        ↓
┌──────────────────────────────┐
│  SkillInput                  │
│  {                           │
│    [key: string]: any        │
│  }                           │
└──────────────────────────────┘
        ↓
   execute()
        ↓
CacheWarmerResult (extends SkillOutput)
        ↓
┌──────────────────────────────┐
│  SkillOutput                 │
│  {                           │
│    success: boolean          │
│    data?: any                │
│    error?: string            │
│    duration?: number         │
│  }                           │
└──────────────────────────────┘
```

### Related Type Hierarchy

```
CacheWarmerParams
├── Base Properties (from SkillInput)
├── action: string
├── supabaseUrl?: string
├── supabaseKey?: string
├── timewindowDays?: number
├── targetHitRate?: number
├── maxCacheSize?: number
├── refreshIntervalMs?: number
└── queryIds?: string[]

CacheWarmerResult
├── Base Properties (from SkillOutput)
│   ├── success: boolean
│   ├── error?: string
│   └── duration?: number
└── data?: {
    ├── hotQueries?: CacheHotQuery[]
    ├── metrics?: CacheMetric[]
    ├── schedules?: CacheRefreshSchedule[]
    ├── preWarmedCount?: number
    ├── estimatedTotalSize?: number
    ├── staleQueries?: string[]
    ├── summary: string
    └── recommendations?: string[]
}

CacheHotQuery
├── queryId: string
├── sql: string
├── accessCount: number
├── avgExecutionTime: number
├── lastAccessed: string (ISO)
├── estimatedSize: number
└── priority: number (1-100)

CacheMetric
├── queryId: string
├── hitCount: number
├── missCount: number
├── hitRate: number (0-100)
├── avgResponseTime: number
└── staleness: number (ms)

CacheRefreshSchedule
├── queryId: string
├── refreshIntervalMs: number
├── lastRefreshedAt: string (ISO)
├── nextRefreshAt: string (ISO)
└── isScheduled: boolean
```

## Method Call Hierarchy

### Public Entry Points

```
Skill.run()  (inherited from base)
    ↓
    ├─ validate()
    │   ├─ Check action exists
    │   └─ Return boolean
    │
    ├─ execute()  (abstract, implemented here)
    │   ├─ Log action start
    │   ├─ Switch on action
    │   ├─ Call handler method
    │   ├─ Log result
    │   └─ Return CacheWarmerResult
    │
    └─ Error handling
        ├─ Catch exceptions
        ├─ Log error
        └─ Return error result

execute() action handlers:
├─ identifyHotQueries()
│   ├─ Parse input
│   ├─ Sort by priority
│   ├─ Filter by size
│   ├─ generateRecommendations()
│   └─ Return result
│
├─ warmCache()
│   ├─ Parse input
│   ├─ Filter queries
│   ├─ Initialize metrics
│   └─ Return result
│
├─ getAnalytics()
│   ├─ Calculate totals
│   ├─ Identify slow queries
│   ├─ Generate recommendations
│   └─ Return result
│
├─ detectStaleCache()
│   ├─ Filter stale entries
│   ├─ Map to metrics
│   ├─ Generate recommendations
│   └─ Return result
│
└─ scheduleRefresh()
    ├─ Calculate times
    ├─ Create schedules
    ├─ Store in registry
    └─ Return result
```

## State Management

### Instance State

```typescript
class SupabaseCacheWarmer {
  // Private state
  private logger = createLogger('cache-warmer')
  private cacheRegistry: Map<string, CacheMetric>
  private refreshSchedules: Map<string, CacheRefreshSchedule>
  private mockHotQueries: CacheHotQuery[]
  private mockCacheMetrics: CacheMetric[]
}
```

### State Initialization

```
Constructor
    ↓
initializeMockData()
    ├─ Set now = current time
    ├─ Set oneHourAgo
    ├─ Initialize mockHotQueries array
    │   ├─ Q001-Q005 sample data
    │   └─ Realistic metrics
    └─ Initialize mockCacheMetrics array
        ├─ Hit/miss ratios
        ├─ Response times
        └─ Staleness values
```

## Error Handling Strategy

```
Try-Catch Block (lines 162-172)
    ├─ execute(params)
    │   └─ May throw Error
    │
    ├─ Catch Error
    │   ├─ Log error.message
    │   └─ Log error context
    │
    └─ Return error result
        ├── success: false
        ├── error: error.message
        └── duration: elapsed time

Input Validation (lines 142-149)
    ├─ validate(input)
    │   ├─ Check action exists
    │   ├─ Validate action in list
    │   └─ Return boolean
    │
    └─ If invalid
        └─ Return error result
```

## Logging Architecture

```
createLogger('cache-warmer')
    ├── SupabaseLogger instance
    └── Methods:
        ├─ info(message, context)
        │   └─ Line 87: "Cache Warmer analyzing"
        │   └─ Line 114: "Analysis complete"
        │   └─ Line 177: "Identifying hot queries"
        │   etc.
        │
        ├─ debug(message, context)
        │   └─ Line 95: "Query normalized"
        │   └─ Line 99: "Analysis complete"
        │
        └─ error(message, context)
            └─ Line 130: "Cache Warmer failed"
```

## Performance Considerations

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| identifyHotQueries | O(n log n) | Sorting by priority |
| warmCache | O(n) | Linear iteration |
| getAnalytics | O(n) | Reduce operations |
| detectStaleCache | O(n) | Filter operation |
| scheduleRefresh | O(n) | Linear iteration |

### Space Complexity

| Data Structure | Complexity | Size |
|---|---|---|
| cacheRegistry | O(n) | Up to 100s of queries |
| refreshSchedules | O(n) | Up to 100s of queries |
| mockHotQueries | O(1) | Fixed 5 items |
| mockCacheMetrics | O(1) | Fixed 5 items |

### Memory Usage

- Per query: ~500 bytes (metadata)
- Cache registry entry: ~200 bytes
- Schedule entry: ~300 bytes
- Safe limit: 1-5MB for skill instance

## Testing Architecture

```
Test Suite (test-cache-warmer.ts)
    ├─ runTests()
    │   ├─ Create SupabaseCacheWarmer instance
    │   └─ Run 6 tests
    │
    ├─ Test 1: identify_hot_queries
    │   └─ Assert: hotQueries returned
    │
    ├─ Test 2: warm_cache
    │   └─ Assert: preWarmedCount > 0
    │
    ├─ Test 3: get_analytics
    │   └─ Assert: metrics with hit rates
    │
    ├─ Test 4: detect_stale
    │   └─ Assert: stale queries identified
    │
    ├─ Test 5: schedule_refresh
    │   └─ Assert: schedules created
    │
    └─ Test 6: invalid action
        └─ Assert: error returned
```

## Extension Points

### For Future Development

```typescript
// 1. Connect to real database
async identifyHotQueries(params) {
  // Replace mock with: SELECT ... FROM query_logs
}

// 2. Integrate with cache backend (Redis)
async warmCache(params) {
  // Replace mock with: redis.setex(key, ttl, value)
}

// 3. Add persistence layer
async scheduleRefresh(params) {
  // Replace in-memory with: database.insert(schedules)
}

// 4. Add real-time metrics
async getAnalytics(params) {
  // Replace mock with: prometheus.query(...)
}

// 5. Add ML-based optimization
generateRecommendations(queries) {
  // Add ML model for prediction
}
```

## Integration Points

```
OpenClaw Aurora Ecosystem
        ↓
    SkillRegistry
        ↓
SupabaseCacheWarmer
        ↓
    ├─ skill-base (inheritance)
    ├─ supabase-logger (logging)
    ├─ supabase-vault-config (credentials)
    └─ Other Archon skills
        ├─ Query Doctor (query analysis)
        ├─ Schema Sentinel (schema changes)
        └─ RLS Auditor (permissions)
```

## Summary

The Cache Warmer architecture follows:
- Single Responsibility Principle (each action is discrete)
- Type Safety (full TypeScript coverage)
- Extensibility (clear extension points)
- Testability (injectable logging, mock data)
- Error Handling (comprehensive try-catch)
- Logging (instrumented throughout)
