# Social Hub Skills - Quick Reference

## 🎯 All 14 Skills Overview

### Basic Skills (Original)
1. **social-hub-planner** - 30-day content planning
2. **social-hub-publer** - Basic Publer stub
3. **social-hub-caption-ai** - Caption generation with Claude
4. **social-hub-hashtag-ai** - Hashtag optimization
5. **social-hub-inventory** - Video inventory management
6. **social-hub-analytics** - Basic analytics stub
7. **social-hub-orchestrator** - Workflow orchestration

### Enterprise Skills (NEW)
8. **social-hub-publer-v2** - Production Publer API
9. **social-hub-video-enricher** - Claude Vision video analysis
10. **social-hub-quota-enforcer** - Post quotas & limits
11. **social-hub-analytics-collector** - Instagram Graph API
12. **social-hub-approval-workflow** - Approval queue + Telegram
13. **social-hub-database-manager** - PostgreSQL management
14. **social-hub-observability** - Logging + metrics + errors

---

## 📋 Quick Usage Examples

### Publer V2 - Schedule Post
```typescript
const result = await registry.execute('social-hub-publer-v2', {
  publisherApiKey: 'cb8e8eda...',
  post: {
    pagina: '@lucasrsmotta',
    data: '2026-02-10',
    hora: '18:00',
    videoPath: '/path/to/video.mp4',
    legenda: 'Amazing content!',
    hashtags: ['#instagram', '#viral']
  }
});
```

### Video Enricher - Analyze Video
```typescript
const result = await registry.execute('social-hub-video-enricher', {
  anthropicApiKey: 'sk-ant-...',
  videoPath: '/path/to/video.mp4',
  pagina: '@lucasrsmotta',
  analysisDepth: 'standard'
});

// Access results
const hooks = result.data.enrichment.hooks;
const captions = result.data.enrichment.captions;
const hashtags = result.data.enrichment.hashtags.primary;
```

### Quota Enforcer - Check Quotas
```typescript
const result = await registry.execute('social-hub-quota-enforcer', {
  socialHubPath: '/path/to/social-hub',
  operation: 'check',
  post: {
    pagina: '@lucasrsmotta',
    data: '2026-02-10',
    grupoConteudo: 'maternidade_dicas',
    tema: 'maternidade'
  }
});

if (!result.data.allowed) {
  console.error('Blocked:', result.data.violations);
}
```

### Analytics Collector - Collect Metrics
```typescript
// Collect single post
const result = await registry.execute('social-hub-analytics-collector', {
  instagramAccessToken: 'IGQ...',
  instagramBusinessAccountId: '123456',
  operation: 'collect',
  postId: 'instagram_post_id'
});

// Analyze performance
const analysis = await registry.execute('social-hub-analytics-collector', {
  instagramAccessToken: 'IGQ...',
  instagramBusinessAccountId: '123456',
  operation: 'analyze',
  dateRange: {
    startDate: '2026-01-01',
    endDate: '2026-02-01'
  }
});
```

### Approval Workflow - Submit & Approve
```typescript
// Submit for approval
const submit = await registry.execute('social-hub-approval-workflow', {
  socialHubPath: '/path/to/social-hub',
  operation: 'submit',
  post: {
    id: 'post-123',
    pagina: '@lucasrsmotta',
    videoPath: '/path/to/video.mp4',
    legenda: 'Caption here',
    hashtags: ['#tag1'],
    scheduledDate: '2026-02-10',
    scheduledTime: '18:00'
  },
  telegramConfig: {
    botToken: 'YOUR_BOT_TOKEN',
    chatId: 'YOUR_CHAT_ID'
  }
});

// Auto-process queue
const process = await registry.execute('social-hub-approval-workflow', {
  socialHubPath: '/path/to/social-hub',
  operation: 'auto-process'
});
```

### Database Manager - Initialize & Migrate
```typescript
// Initialize schema
const init = await registry.execute('social-hub-database-manager', {
  operation: 'init',
  connectionString: 'postgresql://...'
});

// Migrate from CSV
const migrate = await registry.execute('social-hub-database-manager', {
  operation: 'migrate',
  connectionString: 'postgresql://...',
  socialHubPath: '/path/to/social-hub'
});

// Query data
const query = await registry.execute('social-hub-database-manager', {
  operation: 'query',
  connectionString: 'postgresql://...',
  data: {
    query: 'SELECT * FROM posts WHERE pagina = $1 LIMIT 10',
    params: ['@lucasrsmotta']
  }
});
```

### Observability - Log & Monitor
```typescript
// Initialize
const init = await registry.execute('social-hub-observability', {
  operation: 'init',
  config: {
    logLevel: 'info',
    sentryDSN: 'https://...',
    logDir: '/tmp/social-hub-logs'
  }
});

// Log message
await registry.execute('social-hub-observability', {
  operation: 'log',
  logData: {
    level: 'info',
    message: 'Post scheduled successfully',
    metadata: { postId: 'post-123' }
  }
});

// Track error
await registry.execute('social-hub-observability', {
  operation: 'error',
  errorData: {
    error: new Error('Upload failed'),
    context: { videoPath: '/path/to/video.mp4' },
    user: 'system'
  }
});

// Health check
const health = await registry.execute('social-hub-observability', {
  operation: 'health'
});
```

---

## 🔧 Configuration Checklist

```bash
# Required
export PUBLER_API_KEY="cb8e8eda44390f8878f5b5ad9ddd19d84c165748e5b65a09"
export ANTHROPIC_API_KEY="sk-ant-..."
export SOCIAL_HUB_PATH="/path/to/social-hub"

# Optional but recommended
export INSTAGRAM_ACCESS_TOKEN="IGQ..."
export INSTAGRAM_BUSINESS_ACCOUNT_ID="123456"
export DATABASE_URL="postgresql://localhost:5432/social_hub"
export TELEGRAM_BOT_TOKEN="123456:ABC..."
export TELEGRAM_CHAT_ID="123456"
export SENTRY_DSN="https://..."
```

---

## 🚀 Complete Workflow

```typescript
import { getSkillRegistryV2 } from './skills/skill-registry-v2';
import { registerSocialHubSkills } from './skills/social-hub-index';

// 1. Setup
registerSocialHubSkills();
const registry = getSkillRegistryV2();

// 2. Enrich video
const enrichment = await registry.execute('social-hub-video-enricher', {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  videoPath: '/path/to/video.mp4'
});

const bestCaption = enrichment.data.enrichment.captions[0];
const hashtags = enrichment.data.enrichment.hashtags.primary;

// 3. Check quotas
const quotaCheck = await registry.execute('social-hub-quota-enforcer', {
  socialHubPath: process.env.SOCIAL_HUB_PATH,
  operation: 'check',
  post: {
    pagina: '@lucasrsmotta',
    data: '2026-02-10',
    grupoConteudo: enrichment.data.enrichment.classification.tema,
    tema: enrichment.data.enrichment.classification.tema
  }
});

if (!quotaCheck.data.allowed) {
  console.error('Quota exceeded');
  process.exit(1);
}

// 4. Submit for approval
const approval = await registry.execute('social-hub-approval-workflow', {
  socialHubPath: process.env.SOCIAL_HUB_PATH,
  operation: 'submit',
  post: {
    id: 'post-' + Date.now(),
    pagina: '@lucasrsmotta',
    videoPath: '/path/to/video.mp4',
    legenda: bestCaption.text,
    hashtags,
    scheduledDate: '2026-02-10',
    scheduledTime: '18:00'
  },
  telegramConfig: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID
  }
});

// 5. Schedule if approved
if (approval.data.status === 'auto-approved') {
  const scheduled = await registry.execute('social-hub-publer-v2', {
    publisherApiKey: process.env.PUBLER_API_KEY,
    post: {
      pagina: '@lucasrsmotta',
      data: '2026-02-10',
      hora: '18:00',
      videoPath: '/path/to/video.mp4',
      legenda: bestCaption.text,
      hashtags
    }
  });

  console.log('✓ Scheduled:', scheduled.data.publerJobId);
}

// 6. Log everything
await registry.execute('social-hub-observability', {
  operation: 'log',
  logData: {
    level: 'info',
    message: 'Workflow completed',
    metadata: {
      approvalId: approval.data.approvalId,
      viralPotential: enrichment.data.enrichment.viralPotential
    }
  }
});
```

---

## 📊 Skill Comparison

| Skill | Input | Output | Duration | Critical |
|-------|-------|--------|----------|----------|
| Publer V2 | Post details | Publer job ID | 30-120s | HIGH |
| Video Enricher | Video file | Hooks, captions, tags | 20-60s | HIGH |
| Quota Enforcer | Post metadata | Allowed/blocked | <1s | MEDIUM |
| Analytics Collector | Instagram creds | Metrics & analysis | 5-15s | MEDIUM |
| Approval Workflow | Post details | Approval status | <1s | MEDIUM |
| Database Manager | Operation type | DB result | 5-30s | HIGH |
| Observability | Log/metric data | Logged/tracked | <1s | MEDIUM |

---

## 🐛 Common Issues & Solutions

### Publer V2
**Issue:** Upload timeout
**Solution:** Increase timeout or check video size (max recommended: 100MB)

### Video Enricher
**Issue:** ffmpeg not found
**Solution:** Install ffmpeg or skill will fallback to metadata-only analysis

### Quota Enforcer
**Issue:** CSV file not found
**Solution:** Ensure `DATA/posts_history.csv` exists or it will start with empty history

### Analytics Collector
**Issue:** Invalid access token
**Solution:** Refresh Instagram Business access token (expires every 60 days)

### Approval Workflow
**Issue:** Telegram notification fails
**Solution:** Verify bot token and chat ID; skill continues even if notification fails

### Database Manager
**Issue:** Connection refused
**Solution:** Check PostgreSQL is running: `pg_isready`

### Observability
**Issue:** Winston not initializing
**Solution:** Falls back to console logging; check write permissions for log directory

---

## 📞 Support

For detailed documentation, see:
- `/mnt/c/Users/lucas/openclaw_aurora/SOCIAL_HUB_ENTERPRISE_IMPLEMENTATION.md`

For skill source code:
- `/mnt/c/Users/lucas/openclaw_aurora/skills/social-hub-*.ts`

**Total Skills:** 14
**Production Ready:** ✅ Yes
**Version:** 1.0.0
