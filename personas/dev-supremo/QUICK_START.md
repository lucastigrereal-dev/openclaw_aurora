# Dev Supremo - Quick Start Guide

**Objective:** Get Dev Supremo running in 30 minutes

---

## ⚡ 5-Minute Setup

### Step 1: Navigate to Dev Supremo directory
```bash
cd /mnt/c/Users/lucas/openclaw_aurora/personas/dev-supremo
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Setup environment
```bash
# Create .env file
cat > .env << EOF
ANTHROPIC_API_KEY=your-api-key-here
DEBUG=true
LOG_LEVEL=debug
EOF
```

### Step 4: Run a test audit
```bash
npm run dev
```

**Expected output:**
```json
{
  "decision": "REJECTED",
  "confidence": 1.0,
  "reason": "Critical security issue: hardcoded password detected",
  "rule_triggered": "HARDCODED_CREDENTIALS",
  "evidence": ["Line 12: const password = 'super_secret_123'"],
  "suggestion": "Use environment variables...",
  "escalation_required": true,
  "timestamp": "2025-02-07T...",
  "review_id": "review_..."
}
```

If you see this → ✅ **Dev Supremo is working!**

---

## 🚀 First Real Usage (15 minutes)

### Method 1: Audit Your Own Code

```bash
# Create test file
cat > test-code.ts << 'EOF'
const password = "super_secret_123";
router.get('/api/users', (req, res) => {
  const query = "SELECT * FROM users WHERE id=" + req.params.id;
  db.query(query, (err, results) => {
    res.json(results);
  });
});
EOF

# Run audit
npx ts-node dev-supremo.ts < test-code.ts
```

### Method 2: Audit via API (if server running)

```bash
# Terminal 1: Start server
npm run server

# Terminal 2: Make request
curl -X POST http://localhost:3000/api/dev-supremo/audit \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const password = \"secret\";",
    "language": "javascript",
    "project_name": "test",
    "file_path": "test.js",
    "description": "Test code"
  }'
```

### Method 3: Slack Integration

```bash
# Setup Slack bot token (optional)
# Then message Dev Supremo:
/dev-supremo review code <paste your code>
```

---

## 📊 View Dashboard

```bash
# Terminal: Start simple HTTP server
npm run dashboard:serve

# Browser: Open
http://localhost:8000/dashboard.html
```

You'll see:
- ✅ Audit metrics
- ✅ Recent decisions
- ✅ Performance charts

---

## 🧪 Run Tests

```bash
# Run all tests
npm run test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## 📋 Common Commands

```bash
# Audit code for security issues
npm run audit:code

# Audit architecture design
npm run audit:architecture

# Audit LGPD/GDPR compliance
npm run audit:compliance

# Check metrics
npm run metrics

# Format code
npm run format

# Run linter
npm run lint
```

---

## 🐛 Troubleshooting

### "ANTHROPIC_API_KEY not found"
```bash
# Check .env file exists
cat .env

# If not, create it:
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

### "Cannot find module '@anthropic-ai/sdk'"
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### "API rate limit exceeded"
```bash
# Dev Supremo is limited to 100 calls/day
# Wait 24 hours or contact Anthropic for higher limits
```

### "Review taking > 1 minute"
```bash
# This is normal for first call (model loading)
# Subsequent calls should be < 30 seconds
# If persistent, check internet connection
```

---

## 📈 Next Steps After Setup

### Day 1: Understand How It Works
1. Read `README.md`
2. Run test audits on your code
3. Understand the decision format
4. Explore the dashboard

### Day 2: Integrate with Your Workflow
1. Setup GitHub Actions (copy `github-actions-workflow.yml` to `.github/workflows/`)
2. Test on a real PR
3. Get feedback from team

### Week 1: Fine-tune Rules
1. Collect false positives
2. Adjust thresholds
3. Add custom rules for your project
4. Measure improvements

### Weeks 2-4: Deploy to Production
1. Setup monitoring
2. Create Slack channel for alerts
3. Document for team
4. Start weekly reviews

---

## 📚 File Structure

```
dev-supremo/
├── dev-supremo.ts               # Main logic (1200 lines)
├── dev-supremo.config.json      # Configuration
├── package.json                 # Dependencies
├── README.md                     # Full documentation
├── QUICK_START.md              # This file
├── EVOLUTION_PLAN_30-60-90.md   # Roadmap
├── dashboard.html              # Web dashboard
├── github-actions-workflow.yml # CI/CD integration
└── tests/                      # Test files (coming soon)
```

---

## 🎯 Success Criteria (Your First Week)

```
✅ Dev Supremo installs without errors
✅ Can audit code and get decision in < 1 min
✅ Dashboard loads and shows metrics
✅ GitHub Actions workflow runs on PRs
✅ Slack integration works (if configured)
✅ Team gives feedback on usefulness
```

If all ✅ → Continue to Phase 2
If any ❌ → Debug + notify dev (me)

---

## 💬 Common Questions

**Q: Does it cost money?**
A: Yes, small amount. Anthropic charges ~$0.01 per audit. 100 audits = $1. Budget ~$50/month for enterprise usage.

**Q: Is it always right?**
A: No. Confidence < 0.7 triggers human review. Always pair with human judgment.

**Q: Can I customize the rules?**
A: Yes. Edit `dev-supremo.config.json` and add custom rules in `dev-supremo.ts`.

**Q: How long does an audit take?**
A: First call: 30-60 sec (model loading). Subsequent: < 10 sec.

**Q: Can I use this offline?**
A: No. Requires API access to Anthropic. But you can cache results.

**Q: What about false positives?**
A: Acceptable rate: < 10%. Track and tune rules weekly.

---

## 🚨 Emergency Procedures

### Dev Supremo is not responding
```bash
# Check API status
curl https://api.anthropic.com/health

# Restart server
npm run server &
```

### False positive storm
```bash
# Temporarily disable problematic rule
# Edit dev-supremo.config.json
# Set "enabled": false on rule
# Restart
```

### Need to approve something urgently
```bash
# Override (use sparingly)
# Set approval flag in PR or config
# Dev Supremo will log this for audit trail
```

---

## 📞 Support

- **Bug Report:** Open issue in repo
- **Feature Request:** Add to EVOLUTION_PLAN_30-60-90.md
- **Question:** Email dev@your-domain
- **Urgent:** Slack #dev-supremo

---

## 🎓 Learning Path

1. **Today:** Run through this guide
2. **Tomorrow:** Read full README.md
3. **Week 1:** Integrate with 1 project
4. **Week 2:** Collect metrics
5. **Week 3:** Fine-tune rules
6. **Week 4:** Review EVOLUTION_PLAN_30-60-90.md for next steps

---

## 🏁 You're Ready!

You now have a **working Dev Supremo** that can:
- ✅ Detect security vulnerabilities
- ✅ Check performance patterns
- ✅ Validate LGPD/GDPR compliance
- ✅ Review architecture decisions
- ✅ Integrate with GitHub + Slack
- ✅ Provide explainable decisions
- ✅ Scale with your team

**Next:** Use it on your first PR and see what happens.

---

**"The best code review is the one that prevents bugs from reaching production."**
— Dev Supremo

Let's go! 🚀
