# Social Hub Enterprise - Deployment Checklist

## Pre-Deployment Checklist

### ✅ Code Implementation
- [x] All 7 enterprise skills implemented
- [x] Skills registered in social-hub-index.ts
- [x] TypeScript types defined
- [x] Error handling implemented
- [x] Validation logic added
- [x] Logging integrated
- [x] Documentation created

### 📦 Dependencies Installation

```bash
# Core dependencies
npm install --save \
  @anthropic-ai/sdk@^0.20.0 \
  @sentry/node@^7.0.0 \
  axios@^1.6.0 \
  form-data@^4.0.0 \
  pg@^8.11.0 \
  prom-client@^15.0.0 \
  winston@^3.11.0

# Dev dependencies (if not already installed)
npm install --save-dev \
  @types/node@^20.0.0 \
  @types/pg@^8.0.0 \
  typescript@^5.0.0
```

**Status:** ⬜ Not installed yet

### 🔧 System Requirements

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 14+ installed and running
- [ ] ffmpeg installed (for video enricher)
- [ ] Git installed
- [ ] Minimum 1GB free disk space

**Verify installations:**
```bash
node --version    # Should be 18+
psql --version    # Should be 14+
ffmpeg -version   # Should be present
```

### 🌍 Environment Variables

Create `.env` file in project root:

```bash
# === REQUIRED ===
PUBLER_API_KEY=cb8e8eda44390f8878f5b5ad9ddd19d84c165748e5b65a09
ANTHROPIC_API_KEY=sk-ant-your-key-here
SOCIAL_HUB_PATH=/mnt/c/Users/lucas/Downloads/Downloads_COMET/social-hub-moltbot/SOCIAL-HUB

# === OPTIONAL BUT RECOMMENDED ===
# Instagram Graph API
INSTAGRAM_ACCESS_TOKEN=your_access_token_here
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_account_id_here

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/social_hub

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=123456789

# Sentry (Error Tracking)
SENTRY_DSN=https://your-sentry-dsn@o123456.ingest.sentry.io/123456

# Node Environment
NODE_ENV=production
```

**Status:** ⬜ Not configured

### 📁 Directory Structure

Ensure these directories exist:

```bash
mkdir -p ${SOCIAL_HUB_PATH}/DATA
mkdir -p ${SOCIAL_HUB_PATH}/VIDEOS
mkdir -p /tmp/social-hub-logs
mkdir -p /tmp/video-frames
```

**Create required files if they don't exist:**

```bash
# Posts history (if not exists)
touch ${SOCIAL_HUB_PATH}/DATA/posts_history.csv
echo "pagina,data,grupoConteudo,tema,publerJobId" > ${SOCIAL_HUB_PATH}/DATA/posts_history.csv

# Videos inventory (if not exists)
touch ${SOCIAL_HUB_PATH}/DATA/videos_inventory.csv
echo "filename,filepath,tema,pilar,viralPotential" > ${SOCIAL_HUB_PATH}/DATA/videos_inventory.csv

# Approval queue
echo "[]" > ${SOCIAL_HUB_PATH}/DATA/approval_queue.json
```

**Status:** ⬜ Not created

---

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE social_hub;

# Create user (if needed)
CREATE USER social_hub_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE social_hub TO social_hub_user;

# Exit
\q
```

**Status:** ⬜ Not created

### 2. Initialize Schema

```typescript
// Run this via Node.js
import { getSkillRegistryV2 } from './skills/skill-registry-v2';
import { registerSocialHubSkills } from './skills/social-hub-index';

registerSocialHubSkills();
const registry = getSkillRegistryV2();

const result = await registry.execute('social-hub-database-manager', {
  operation: 'init',
  connectionString: process.env.DATABASE_URL
});

console.log('Schema initialized:', result.success);
```

**Or via CLI:**
```bash
node -e "
import('./skills/social-hub-index.js').then(async m => {
  m.registerSocialHubSkills();
  const registry = m.getSkillRegistryV2();
  const result = await registry.execute('social-hub-database-manager', {
    operation: 'init'
  });
  console.log('Result:', result);
});
"
```

**Status:** ⬜ Not initialized

### 3. Migrate CSV Data

```typescript
const migrate = await registry.execute('social-hub-database-manager', {
  operation: 'migrate',
  connectionString: process.env.DATABASE_URL,
  socialHubPath: process.env.SOCIAL_HUB_PATH
});

console.log('Migration status:', migrate.data.migrationStatus);
```

**Status:** ⬜ Not migrated

---

## Testing Phase

### Test 1: Observability Initialization

```typescript
const obs = await registry.execute('social-hub-observability', {
  operation: 'init',
  config: {
    logLevel: 'info',
    sentryDSN: process.env.SENTRY_DSN,
    logDir: '/tmp/social-hub-logs'
  }
});

console.log('Observability initialized:', obs.success);
```

**Expected:** `{ success: true, data: { initialized: true } }`

**Status:** ⬜ Not tested

### Test 2: Video Enricher (DRY RUN)

```typescript
// Use a sample video
const enrich = await registry.execute('social-hub-video-enricher', {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  videoPath: '/path/to/sample/video.mp4',
  pagina: '@memes.do.lucas',
  analysisDepth: 'quick'
});

console.log('Enrichment:', enrich.data?.enrichment);
```

**Expected:** Hooks, captions, and hashtags generated

**Status:** ⬜ Not tested

### Test 3: Quota Enforcer

```typescript
const quota = await registry.execute('social-hub-quota-enforcer', {
  socialHubPath: process.env.SOCIAL_HUB_PATH,
  operation: 'check',
  post: {
    pagina: '@memes.do.lucas',
    data: new Date().toISOString().split('T')[0],
    grupoConteudo: 'memes_diversos',
    tema: 'humor'
  }
});

console.log('Quota check:', quota.data);
```

**Expected:** `{ allowed: true, quotaStatus: {...} }`

**Status:** ⬜ Not tested

### Test 4: Approval Workflow

```typescript
const approval = await registry.execute('social-hub-approval-workflow', {
  socialHubPath: process.env.SOCIAL_HUB_PATH,
  operation: 'submit',
  post: {
    id: 'test-' + Date.now(),
    pagina: '@memes.do.lucas',
    videoPath: '/path/to/video.mp4',
    legenda: 'Test caption',
    hashtags: ['#test'],
    scheduledDate: '2026-02-10',
    scheduledTime: '18:00'
  }
});

console.log('Approval:', approval.data);
```

**Expected:** `{ status: 'auto-approved' }` for satellite pages

**Status:** ⬜ Not tested

### Test 5: Publer V2 (DRY RUN)

```typescript
const schedule = await registry.execute('social-hub-publer-v2', {
  publisherApiKey: process.env.PUBLER_API_KEY,
  post: {
    pagina: '@memes.do.lucas',
    data: '2026-02-10',
    hora: '18:00',
    videoPath: '/path/to/video.mp4',
    legenda: 'Test post',
    hashtags: ['#test']
  },
  dryRun: true
});

console.log('Dry run result:', schedule.data);
```

**Expected:** `{ success: true, status: 'pending' }`

**Status:** ⬜ Not tested

### Test 6: Analytics Collector (If Instagram configured)

```typescript
const analytics = await registry.execute('social-hub-analytics-collector', {
  instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
  instagramBusinessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
  operation: 'analyze',
  dateRange: {
    startDate: '2026-01-01',
    endDate: '2026-02-01'
  }
});

console.log('Analytics:', analytics.data?.analysis);
```

**Expected:** Performance analysis with trends

**Status:** ⬜ Not tested (requires Instagram credentials)

### Test 7: Database Manager Query

```typescript
const query = await registry.execute('social-hub-database-manager', {
  operation: 'query',
  data: {
    query: 'SELECT COUNT(*) as total FROM videos'
  }
});

console.log('Videos in database:', query.data?.results);
```

**Expected:** Row count

**Status:** ⬜ Not tested

---

## Production Deployment

### 1. Build TypeScript

```bash
# Compile TypeScript
npx tsc

# Or if you have build script
npm run build
```

**Status:** ⬜ Not built

### 2. Configure Log Rotation

```bash
# Create logrotate config
sudo tee /etc/logrotate.d/social-hub << EOF
/tmp/social-hub-logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 $USER $USER
}
EOF

# Test configuration
sudo logrotate -d /etc/logrotate.d/social-hub
```

**Status:** ⬜ Not configured

### 3. Set Up Database Backups

```bash
# Create backup script
cat > /usr/local/bin/backup-social-hub.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/social-hub"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > $BACKUP_DIR/social_hub_$TIMESTAMP.sql
# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-social-hub.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/backup-social-hub.sh" | crontab -
```

**Status:** ⬜ Not configured

### 4. Set Up Monitoring

```bash
# Install monitoring agent (example: Prometheus Node Exporter)
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xvfz node_exporter-1.7.0.linux-amd64.tar.gz
sudo cp node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/
sudo useradd -rs /bin/false node_exporter

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl start node_exporter
sudo systemctl enable node_exporter
```

**Status:** ⬜ Not configured

### 5. Configure Alerts

Set up alerts for:
- [ ] Database connection failures
- [ ] Publer API failures (>5% error rate)
- [ ] Quota violations
- [ ] Disk space <10%
- [ ] Memory usage >80%
- [ ] Failed video uploads

**Status:** ⬜ Not configured

---

## Performance Optimization

### 1. Database Indexes

```sql
-- Verify indexes exist
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';

-- Should see:
-- idx_videos_tema
-- idx_videos_pilar
-- idx_posts_pagina
-- idx_posts_scheduled
-- idx_posts_status
-- idx_posts_grupo_conteudo
-- idx_analytics_post_id
```

**Status:** ⬜ Not verified

### 2. Connection Pooling

```typescript
// Configure pg pool in database manager
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Status:** ⬜ Not configured

### 3. Cache Configuration

Consider adding Redis for:
- [ ] Video enrichment results (cache for 7 days)
- [ ] Analytics data (cache for 1 hour)
- [ ] Quota checks (cache for 5 minutes)

**Status:** ⬜ Not implemented (optional)

---

## Security Checklist

- [ ] Environment variables not committed to git
- [ ] Database password is strong (16+ characters)
- [ ] PostgreSQL only accessible from localhost
- [ ] API keys rotated regularly (quarterly)
- [ ] File permissions set correctly (640 for configs)
- [ ] Logs don't contain sensitive data
- [ ] Error messages don't expose system details
- [ ] Rate limiting enabled on Publer API calls
- [ ] Input validation on all user inputs
- [ ] SQL injection protection (parameterized queries)

**Status:** ⬜ Not reviewed

---

## Final Production Checklist

### Before Going Live

- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] Database initialized and migrated
- [ ] All 7 skills tested individually
- [ ] End-to-end workflow tested
- [ ] Logs directory created with proper permissions
- [ ] Backup system configured
- [ ] Monitoring alerts configured
- [ ] Documentation reviewed by team
- [ ] Rollback plan prepared

### Post-Deployment Monitoring (First 24 Hours)

- [ ] Check logs for errors: `tail -f /tmp/social-hub-logs/error.log`
- [ ] Verify posts are scheduled correctly
- [ ] Monitor Publer API success rate
- [ ] Check database growth rate
- [ ] Verify Telegram notifications work
- [ ] Monitor memory usage
- [ ] Check disk space usage
- [ ] Verify analytics collection working

### Weekly Maintenance

- [ ] Review error logs
- [ ] Check database size
- [ ] Rotate old backups
- [ ] Review quota usage
- [ ] Check for failed posts
- [ ] Update dependencies if needed
- [ ] Review Sentry errors

---

## Rollback Procedure

If something goes wrong:

1. **Stop processing:**
   ```bash
   # Stop any running workflows
   pkill -f social-hub
   ```

2. **Restore database:**
   ```bash
   # From latest backup
   psql $DATABASE_URL < /backups/social-hub/latest.sql
   ```

3. **Revert to previous version:**
   ```bash
   git checkout previous-commit-hash
   npm install
   npm run build
   ```

4. **Verify rollback:**
   ```bash
   # Run health check
   node -e "/* health check code */"
   ```

---

## Support & Resources

### Documentation
- `/mnt/c/Users/lucas/openclaw_aurora/SOCIAL_HUB_ENTERPRISE_IMPLEMENTATION.md`
- `/mnt/c/Users/lucas/openclaw_aurora/SKILLS_QUICK_REFERENCE.md`
- `/mnt/c/Users/lucas/openclaw_aurora/SKILLS_ARCHITECTURE.md`

### Logs Location
- Application logs: `/tmp/social-hub-logs/`
- Error logs: `/tmp/social-hub-logs/error.log`
- Combined logs: `/tmp/social-hub-logs/combined.log`

### Database
- Connection: `psql $DATABASE_URL`
- Backups: `/backups/social-hub/`

### API Endpoints
- Publer: `https://api.publer.io/v1`
- Instagram Graph: `https://graph.facebook.com/v18.0`
- Anthropic: `https://api.anthropic.com`

---

## Deployment Sign-Off

**Deployed by:** ___________________
**Date:** ___________________
**Environment:** ⬜ Development ⬜ Staging ⬜ Production
**Tested by:** ___________________
**Approved by:** ___________________

**Notes:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

**Version:** 1.0.0
**Last Updated:** 2026-02-06
**Status:** Ready for deployment
