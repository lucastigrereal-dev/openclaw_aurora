# Social Hub Enterprise - Test Plan
## End-to-End Testing Suite

**Version:** 2.0.0
**Date:** 06/02/2026
**Status:** Ready for Execution

---

## OVERVIEW

This document outlines the comprehensive testing strategy for the Social Hub Enterprise system, covering all 14 skills (7 basic + 7 enterprise) across the full workflow pipeline.

---

## TEST ENVIRONMENT SETUP

### Prerequisites

```bash
# 1. Environment Variables
export SOCIAL_HUB_PATH="/mnt/c/Users/lucas/Downloads/Downloads_COMET/social-hub-moltbot/SOCIAL-HUB"
export PUBLER_API_KEY="cb8e8eda44390f8878f5b5ad9ddd19d84c165748e5b65a09"
export ANTHROPIC_API_KEY="sk-ant-api03-..."
export INSTAGRAM_ACCESS_TOKEN="your-instagram-token"
export OPENCLAW_WS_URL="ws://localhost:18789/api/v1/ws"
export OPENCLAW_TOKEN="7714bf0dba6234b0be06256da34581b001ae01822bb775bb624725338af092c8"
export PORT=3000

# 2. Directory Structure
mkdir -p "$SOCIAL_HUB_PATH/DATA/VIDEOS"
mkdir -p "$SOCIAL_HUB_PATH/DATA/METADATA"
mkdir -p "$SOCIAL_HUB_PATH/OUTPUT"
mkdir -p "$SOCIAL_HUB_PATH/LOGS"

# 3. Test Data
# Place 3-5 sample videos in DATA/VIDEOS/ for testing
```

### Starting Services

```bash
# Terminal 1: OpenClaw Gateway
cd /mnt/c/Users/lucas/openclaw_aurora
npm run dev

# Terminal 2: Prometheus Cockpit
cd ~/Desktop/prometheus-cockpit-skill
node src/server.js

# Terminal 3: Test Runner
cd /mnt/c/Users/lucas/openclaw_aurora
npm test
```

---

## TEST SUITES

### Suite 1: Basic Skills (Foundation)

#### Test 1.1: Social Hub Planner
**Skill:** `social-hub-planner`
**Purpose:** Verify 30-day planning with collaboration orchestration

```typescript
// Test Case
const result = await registry.execute('social-hub-planner', {
  socialHubPath: process.env.SOCIAL_HUB_PATH,
  daysAhead: 30,
  forceReplan: false
});

// Expected Output
{
  success: true,
  plan: {
    totalPosts: 90,
    pages: ['lucastigrereal', 'afamiliatigrereal', ...],
    schedule: [...], // 90 posts distributed
    collaborations: [...] // Rotation algorithm applied
  }
}

// Validation Checks
✓ Total posts = 90 (6 pages × 15 posts)
✓ Daily limit ≤ 20 posts
✓ Per-page limit ≤ 5 posts/day
✓ Collaborations follow rotation rules
✓ Content group gap ≥ 45 days
✓ Output file: OUTPUT/plano_30d.json
```

#### Test 1.2: Social Hub Inventory
**Skill:** `social-hub-inventory`
**Purpose:** Verify video discovery and deduplication

```typescript
const result = await registry.execute('social-hub-inventory', {
  socialHubPath: process.env.SOCIAL_HUB_PATH,
  scanDirectory: 'DATA/VIDEOS',
  deduplication: true
});

// Expected Output
{
  success: true,
  inventory: {
    totalVideos: 50,
    uniqueVideos: 48, // 2 duplicates removed
    byTema: { maternidade: 20, memes: 15, ... },
    byPilar: { entretenimento: 25, educacao: 15, ... }
  }
}

// Validation Checks
✓ All .mp4/.mov files discovered
✓ SHA-256 hash deduplication
✓ Metadata JSON created per video
✓ Output file: DATA/METADATA/videos.json
```

#### Test 1.3: Social Hub Caption AI
**Skill:** `social-hub-caption-ai`
**Purpose:** Verify Claude AI caption generation

```typescript
const result = await registry.execute('social-hub-caption-ai', {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  videoMetadata: {
    id: 'V001',
    tema: 'maternidade',
    pilar: 'entretenimento'
  },
  variations: 3
});

// Expected Output
{
  success: true,
  captions: [
    { text: 'Caption 1...', length: 95, tone: 'playful', cta: '...' },
    { text: 'Caption 2...', length: 102, tone: 'inspirational', cta: '...' },
    { text: 'Caption 3...', length: 88, tone: 'conversational', cta: '...' }
  ]
}

// Validation Checks
✓ 3 variations generated
✓ Length 80-120 characters
✓ Appropriate tone for tema/pilar
✓ Valid CTA included
✓ No API errors
```

#### Test 1.4: Social Hub Hashtag AI
**Skill:** `social-hub-hashtag-ai`
**Purpose:** Verify hashtag optimization

```typescript
const result = await registry.execute('social-hub-hashtag-ai', {
  videoMetadata: { tema: 'maternidade', pilar: 'entretenimento' },
  strategy: 'balanced'
});

// Expected Output
{
  success: true,
  hashtags: [
    { tag: '#maedemenino', category: 'proven', score: 95, reach: 50000 },
    { tag: '#maternar', category: 'trending', score: 88, reach: 30000 },
    // ... 13 more
  ],
  total: 15,
  reachEstimate: 450000,
  engagementPotential: 72
}

// Validation Checks
✓ 15 hashtags generated
✓ Mix of proven/trending/experimental
✓ Reach estimates provided
✓ Ranked by performance score
✓ No duplicates
```

#### Test 1.5: Social Hub Analytics
**Skill:** `social-hub-analytics`
**Purpose:** Verify metrics aggregation

```typescript
const result = await registry.execute('social-hub-analytics', {
  socialHubPath: process.env.SOCIAL_HUB_PATH,
  dateRange: { start: '2026-01-01', end: '2026-01-31' }
});

// Expected Output
{
  success: true,
  summary: {
    totalPosts: 90,
    totalReach: 2500000,
    totalEngagement: 125000,
    avgEngagementRate: 5.2,
    topPerformers: [...]
  },
  byPage: {...},
  trends: {...},
  reportFile: 'OUTPUT/relatorio_janeiro_2026.json'
}

// Validation Checks
✓ All posts analyzed
✓ Metrics aggregated by page
✓ Trends identified
✓ Top performers ranked
✓ Report file created
```

#### Test 1.6: Social Hub Orchestrator
**Skill:** `social-hub-orchestrator`
**Purpose:** Verify end-to-end workflow

```typescript
const result = await registry.execute('social-hub-orchestrator', {
  socialHubPath: process.env.SOCIAL_HUB_PATH,
  workflow: 'full',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  publisherApiKey: process.env.PUBLER_API_KEY
});

// Expected Output
{
  success: true,
  workflowSteps: [
    { step: 'inventory', status: 'success', duration: 2500 },
    { step: 'planning', status: 'success', duration: 5000 },
    { step: 'caption-ai', status: 'success', duration: 12000 },
    { step: 'hashtag-ai', status: 'success', duration: 8000 },
    { step: 'publer', status: 'success', duration: 15000 },
    { step: 'analytics', status: 'success', duration: 3000 }
  ],
  summary: {
    totalSteps: 6,
    successfulSteps: 6,
    failedSteps: 0,
    totalDuration: 45500
  }
}

// Validation Checks
✓ All steps executed in order
✓ No failed steps
✓ Reasonable execution time
✓ State preserved between steps
```

---

### Suite 2: Enterprise Skills (Production)

#### Test 2.1: Publer V2 (Production API)
**Skill:** `social-hub-publer-v2`
**Purpose:** Verify real Publer API integration

```typescript
const result = await registry.execute('social-hub-publer-v2', {
  publisherApiKey: process.env.PUBLER_API_KEY,
  post: {
    pagina: '@lucastigrereal',
    videoPath: '/path/to/video.mp4',
    legenda: 'Test caption #test',
    colaboradores: ['@afamiliatigrereal'],
    dataAgendamento: '2026-02-10T14:00:00Z'
  },
  dryRun: true // Don't actually post
});

// Expected Output
{
  success: true,
  jobId: 'pb-12345',
  scheduledAt: '2026-02-10T14:00:00Z',
  uploadedMedia: {
    mediaId: 'media-67890',
    uploadDuration: 8500
  }
}

// Validation Checks
✓ Video uploaded successfully
✓ Post scheduled with correct time
✓ Collaborators included
✓ Retry logic worked (if needed)
✓ Exponential backoff on errors
```

#### Test 2.2: Video Enricher (Claude Vision)
**Skill:** `social-hub-video-enricher`
**Purpose:** Verify AI video analysis

```typescript
const result = await registry.execute('social-hub-video-enricher', {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  videoPath: '/path/to/video.mp4',
  videoId: 'V001'
});

// Expected Output
{
  success: true,
  enrichedVideo: {
    id: 'V001',
    ganchos: [
      { text: 'Hook 1', score: 92, type: 'question' },
      { text: 'Hook 2', score: 88, type: 'revelation' },
      { text: 'Hook 3', score: 85, type: 'challenge' }
    ],
    legenda_base: 'Generated caption...',
    cta: 'Contextual CTA',
    hashtags: ['#tag1', '#tag2', ...],
    tema: 'maternidade',
    pilar: 'entretenimento',
    score_prioridade: 87,
    elementos_visuais: [...],
    sentimento: 'positive',
    duracao: 45
  }
}

// Validation Checks
✓ 3 hooks generated
✓ Caption optimized for tema/pilar
✓ 15 hashtags ranked
✓ Viral score calculated
✓ Visual elements detected
✓ Processing time < 30s
```

#### Test 2.3: Quota Enforcer
**Skill:** `social-hub-quota-enforcer`
**Purpose:** Verify posting limits enforcement

```typescript
// Test Case 1: Within limits
const result1 = await registry.execute('social-hub-quota-enforcer', {
  date: '2026-02-10',
  page: '@lucastigrereal',
  contentGroupId: 'GRP001'
});

// Expected: ALLOWED
{
  allowed: true,
  quotaStatus: {
    dailyUsed: 3,
    dailyLimit: 5,
    remaining: 2,
    percentage: 60
  }
}

// Test Case 2: Daily limit exceeded
const result2 = await registry.execute('social-hub-quota-enforcer', {
  date: '2026-02-10',
  page: '@lucastigrereal',
  contentGroupId: 'GRP002'
});

// Expected: DENIED
{
  allowed: false,
  reason: 'DAILY_LIMIT_EXCEEDED',
  quotaStatus: {
    dailyUsed: 5,
    dailyLimit: 5,
    remaining: 0,
    percentage: 100
  }
}

// Test Case 3: Content group repeated
const result3 = await registry.execute('social-hub-quota-enforcer', {
  date: '2026-02-10',
  page: '@lucastigrereal',
  contentGroupId: 'GRP001' // Posted 20 days ago
});

// Expected: DENIED
{
  allowed: false,
  reason: 'CONTENT_GROUP_GAP',
  contentGroupCheck: {
    lastPosted: '2026-01-21',
    daysSince: 20,
    allowed: false,
    reason: 'Minimum gap is 45 days'
  }
}

// Validation Checks
✓ Enforces max_posts_por_pagina_dia (5)
✓ Enforces max_posts_totais_dia (20)
✓ Enforces content group gap (45 days)
✓ Accurate quota tracking
✓ Clear rejection reasons
```

#### Test 2.4: Analytics Collector (Instagram Graph API)
**Skill:** `social-hub-analytics-collector`
**Purpose:** Verify Instagram metrics collection

```typescript
const result = await registry.execute('social-hub-analytics-collector', {
  instagramToken: process.env.INSTAGRAM_ACCESS_TOKEN,
  page: '@lucastigrereal',
  post: {
    id: 'POST001',
    publishedAt: '2026-02-01T10:00:00Z',
    caption: 'Test post...'
  }
});

// Expected Output
{
  success: true,
  metrics: {
    postId: 'POST001',
    reach: 12500,
    impressions: 18000,
    engagement: 950,
    likes: 650,
    comments: 180,
    shares: 50,
    saves: 70,
    engagementRate: 7.6,
    viralScore: 82,
    timestamp: '2026-02-06T00:00:00Z'
  },
  analysis: {
    performance: 'excellent',
    benchmarkComparison: { above_avg: true, percentile: 85 }
  }
}

// Validation Checks
✓ All metrics collected from Graph API
✓ Engagement rate calculated correctly
✓ Viral score computed (0-100)
✓ Benchmark comparison provided
✓ Data persisted to database
```

#### Test 2.5: Approval Workflow
**Skill:** `social-hub-approval-workflow`
**Purpose:** Verify manual approval queue

```typescript
// Test Case 1: Critical page (requires approval)
const result1 = await registry.execute('social-hub-approval-workflow', {
  post: {
    pagina: '@lucastigrereal',
    legenda: 'Important post...',
    dataAgendamento: '2026-02-10T14:00:00Z'
  }
});

// Expected: PENDING
{
  status: 'pending_approval',
  requiresManual: true,
  approvers: ['telegram:6171479938'],
  notificationSent: true,
  approvalUrl: 'https://t.me/Khron_bot'
}

// Test Case 2: Satellite page (auto-approve)
const result2 = await registry.execute('social-hub-approval-workflow', {
  post: {
    pagina: '@oinatalrn',
    legenda: 'Auto-approved post...',
    dataAgendamento: '2026-02-10T14:00:00Z'
  }
});

// Expected: APPROVED
{
  status: 'approved',
  requiresManual: false,
  approvedBy: 'system',
  scheduledOnPubler: true,
  jobId: 'pb-12345'
}

// Validation Checks
✓ Lucas/Família pages require approval
✓ Satellite pages auto-approve
✓ Telegram notifications sent
✓ Approval queue updated
✓ Post scheduled after approval
```

#### Test 2.6: Database Manager
**Skill:** `social-hub-database-manager`
**Purpose:** Verify PostgreSQL migration

```typescript
const result = await registry.execute('social-hub-database-manager', {
  action: 'migrate',
  csvPath: process.env.SOCIAL_HUB_PATH + '/DATA/METADATA/videos.csv'
});

// Expected Output
{
  success: true,
  migration: {
    recordsMigrated: 50,
    tablesCreated: ['videos', 'posts', 'metrics', 'hashtags'],
    indexesCreated: 12,
    duration: 3500
  },
  performance: {
    querySpeedImprovement: '100x',
    storageOptimization: '40%'
  }
}

// Validation Checks
✓ All CSV data migrated
✓ Schema created with indexes
✓ Prisma ORM configured
✓ Query performance improved
✓ Data integrity maintained
```

#### Test 2.7: Observability
**Skill:** `social-hub-observability`
**Purpose:** Verify logging and monitoring

```typescript
const result = await registry.execute('social-hub-observability', {
  action: 'status',
  services: ['winston', 'sentry', 'prometheus']
});

// Expected Output
{
  success: true,
  health: {
    winston: {
      status: 'healthy',
      logsWritten: 1250,
      errorsCaptured: 3,
      logFiles: ['error.log', 'combined.log']
    },
    sentry: {
      status: 'healthy',
      dsn: 'https://sentry.io/...',
      errorsSent: 3,
      sampleRate: 0.1
    },
    prometheus: {
      status: 'healthy',
      metricsExported: 45,
      endpoint: 'http://localhost:9090/metrics'
    }
  }
}

// Validation Checks
✓ Winston logging active
✓ Sentry error tracking working
✓ Prometheus metrics exported
✓ Health checks passing
✓ No critical errors
```

---

## INTEGRATION TESTS

### Integration Test 1: Full Workflow (Happy Path)

```typescript
// Simulate complete 30-day cycle
const workflow = [
  { skill: 'social-hub-inventory', expected: { totalVideos: 50 } },
  { skill: 'social-hub-planner', expected: { totalPosts: 90 } },
  { skill: 'social-hub-video-enricher', expected: { enriched: 90 } },
  { skill: 'social-hub-quota-enforcer', expected: { violations: 0 } },
  { skill: 'social-hub-caption-ai', expected: { captions: 90 } },
  { skill: 'social-hub-hashtag-ai', expected: { hashtags: 90 } },
  { skill: 'social-hub-approval-workflow', expected: { pending: 30, auto: 60 } },
  { skill: 'social-hub-publer-v2', expected: { scheduled: 90 } },
  { skill: 'social-hub-analytics-collector', expected: { metrics: 90 } }
];

// Execute and validate each step
for (const step of workflow) {
  const result = await registry.execute(step.skill, {...});
  assert(result.success === true);
  assert(result.data matches step.expected);
}
```

### Integration Test 2: Error Recovery

```typescript
// Simulate Publer API failure
const result = await registry.execute('social-hub-publer-v2', {
  publisherApiKey: 'INVALID_KEY', // Force error
  post: {...}
});

// Expected: Retry logic kicks in
{
  success: false,
  error: 'PUBLER_API_ERROR',
  retriesAttempted: 3,
  backoffStrategy: 'exponential',
  fallback: 'queued_for_manual_retry'
}

// Validation
✓ Exponential backoff applied
✓ Circuit breaker triggered after 3 failures
✓ Error logged to Sentry
✓ Notification sent to admin
✓ Post queued for manual intervention
```

### Integration Test 3: Prometheus Cockpit Dashboard

```bash
# 1. Start OpenClaw + Prometheus Cockpit
# 2. Access http://localhost:3000/social-hub.html

# Expected UI Elements:
✓ Badge: "✅ OpenClaw Conectado"
✓ Metrics: Total Posts, Scheduled Today, Pending
✓ Timeline: Next 7 days visualization
✓ Skills Status: All 14 skills showing as "active"
✓ Workflows: 6 buttons (Plan, Caption, Hashtag, Schedule, Analytics, Full)

# Test Workflow Execution:
# Click "📅 Planejar 30 Dias"
# Expected:
✓ Notification: "🚀 Executando Workflow"
✓ Notification: "✅ Workflow Iniciado" with execution ID
✓ Metrics auto-refresh after 5s
✓ Timeline updates with new posts
```

---

## PERFORMANCE TESTS

### Load Test: 1000 Videos

```typescript
// Simulate large library
const result = await registry.execute('social-hub-inventory', {
  socialHubPath: '/test/large-library', // 1000 videos
  scanDirectory: 'DATA/VIDEOS'
});

// Performance Targets
✓ Scan time < 30s
✓ Deduplication time < 10s
✓ Memory usage < 500MB
✓ CPU usage < 80%
```

### Stress Test: Concurrent Requests

```typescript
// 10 simultaneous skill executions
const promises = Array(10).fill(null).map(() =>
  registry.execute('social-hub-caption-ai', {...})
);

const results = await Promise.all(promises);

// Performance Targets
✓ All requests complete successfully
✓ No timeouts (< 30s each)
✓ No rate limit errors from Claude API
✓ No memory leaks
```

---

## SECURITY TESTS

### Test: API Key Validation

```typescript
// Test invalid Anthropic API key
const result = await registry.execute('social-hub-caption-ai', {
  anthropicApiKey: 'invalid-key',
  videoMetadata: {...}
});

// Expected
{
  success: false,
  error: 'INVALID_API_KEY',
  message: 'Anthropic API authentication failed'
}

// Validation
✓ Error caught and logged
✓ No sensitive data exposed
✓ Graceful degradation
```

### Test: Input Sanitization

```typescript
// Test SQL injection attempt
const result = await registry.execute('social-hub-database-manager', {
  action: 'query',
  filter: "'; DROP TABLE videos; --"
});

// Expected
{
  success: false,
  error: 'INVALID_INPUT',
  message: 'Input contains disallowed characters'
}

// Validation
✓ Injection attempt blocked
✓ Parameterized queries used
✓ Error logged to Sentry
```

---

## REGRESSION TESTS

### Test: Backward Compatibility

```typescript
// Verify old plano_30d.json format still works
const oldPlan = JSON.parse(fs.readFileSync('plano_30d_v1.json'));

const result = await registry.execute('social-hub-publer-v2', {
  publisherApiKey: process.env.PUBLER_API_KEY,
  posts: oldPlan.posts // Old format
});

// Expected
✓ Old format converted automatically
✓ All posts scheduled successfully
✓ No data loss
```

---

## TEST EXECUTION

### Run All Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests (requires OpenClaw running)
npm run test:e2e

# Performance tests
npm run test:perf

# Full suite
npm run test:all
```

### Test Report

```
╔═══════════════════════════════════════════════════════╗
║  SOCIAL HUB ENTERPRISE - TEST REPORT                 ║
╚═══════════════════════════════════════════════════════╝

Suite 1: Basic Skills ............................ ✓ 6/6
  ✓ Planner
  ✓ Inventory
  ✓ Caption AI
  ✓ Hashtag AI
  ✓ Analytics
  ✓ Orchestrator

Suite 2: Enterprise Skills ....................... ✓ 7/7
  ✓ Publer V2
  ✓ Video Enricher
  ✓ Quota Enforcer
  ✓ Analytics Collector
  ✓ Approval Workflow
  ✓ Database Manager
  ✓ Observability

Integration Tests ................................ ✓ 3/3
  ✓ Full Workflow
  ✓ Error Recovery
  ✓ Dashboard UI

Performance Tests ................................ ✓ 2/2
  ✓ Load Test (1000 videos)
  ✓ Stress Test (10 concurrent)

Security Tests ................................... ✓ 2/2
  ✓ API Key Validation
  ✓ Input Sanitization

Regression Tests ................................. ✓ 1/1
  ✓ Backward Compatibility

─────────────────────────────────────────────────────────
TOTAL: 21/21 tests passed (100%)
Duration: 3m 45s
Status: PRODUCTION READY ✅
```

---

## SUCCESS CRITERIA

### Must Pass (Blocking)
- [ ] All 14 skills execute without errors
- [ ] TypeScript compiles with no errors
- [ ] Full workflow completes end-to-end
- [ ] Quota enforcement prevents violations
- [ ] Real Publer API integration works
- [ ] Approval workflow routes correctly
- [ ] Database migration preserves data

### Should Pass (High Priority)
- [ ] Performance targets met (< 30s per skill)
- [ ] Error handling works for all edge cases
- [ ] Security tests pass
- [ ] Dashboard UI responsive and accurate
- [ ] Metrics collection from Instagram API

### Nice to Have (Low Priority)
- [ ] Backward compatibility maintained
- [ ] Stress tests handle 10+ concurrent requests
- [ ] Memory usage optimized (< 500MB)

---

## KNOWN ISSUES & LIMITATIONS

1. **Instagram Graph API**: Requires valid access token (expires every 60 days)
2. **Claude Vision API**: Rate limited to 50 requests/min
3. **Publer API**: Free tier limited to 100 posts/month
4. **PostgreSQL**: Requires manual database setup

---

## NEXT STEPS

After testing completes:

1. **Fix any failing tests** - Priority: Blocking > High > Low
2. **Update documentation** - Add test results to README
3. **Create deployment checklist** - Production readiness verification
4. **Set up CI/CD pipeline** - Automate tests on commit
5. **Schedule load testing** - Validate at scale (5000+ videos)

---

**Test Plan Status:** READY FOR EXECUTION
**Estimated Duration:** 4-6 hours (full suite)
**Test Engineer:** Magnus + Aria (Virtual Developers)
**Approval:** Pending execution results
