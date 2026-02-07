# 🚀 OpenClaw Aurora Cockpit - Quick Start (30 seconds)

## 1️⃣ Start Server
```bash
npm run dev
```
Wait for: `[WebSocket] Server started on port 8080`

## 2️⃣ Open Cockpit
```bash
# Mac
open file:///$(pwd)/OPENCLAW-COCKPIT.html

# Linux
xdg-open file:///$(pwd)/OPENCLAW-COCKPIT.html

# Windows
start file:///C:/path/to/OPENCLAW-COCKPIT.html
```

## 3️⃣ Check Connection
Look for **🟢 ONLINE** badge in top-right corner

## 4️⃣ Try Commands

### See Available Skills
```
list
```
Expected: List of 17+ Hub Enterprise skills

### Get System Status
```
status
```
Expected: Uptime, memory, active sessions

### Execute a Skill
Click any **Hub Card** button or type:
```
create mvp for ecommerce
```

## ✅ You're Done!

The cockpit is now:
- ✅ Connected to WebSocket server
- ✅ Ready to execute skills
- ✅ Showing real-time status
- ✅ Queuing messages if disconnected
- ✅ Auto-reconnecting if needed

## 🎨 Hub Tabs

| Tab | Contains | Skills |
|-----|----------|--------|
| 🏢 **Enterprise** | 9 personas | MVP, architecture, code, tests, deploy, security, analytics, design, performance |
| 📱 **Social** | Content creation | Posts, schedules, analytics |
| 🗄️ **Supabase** | Database tools | Tables, schemas, RLS |
| 📊 **Aurora** | Monitoring | Metrics, alerts |
| 🔐 **Guardrail** | Security | Validation, rate limiting |

## 📊 Monitor in Browser Console

Press **F12** and type:
```javascript
// Check connection
console.log(isConnected); // true/false

// Send message manually
sendChat('test message');

// Check WebSocket state
console.log(ws.readyState); // 1 = open
```

## ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| Red/gray status badge | Server not running. Run `npm run dev` |
| Messages not sending | Check status badge, then try: `initWebSocket('ws://localhost:8080')` |
| Can't open file | Use browser address bar: `file:///path/to/OPENCLAW-COCKPIT.html` |
| Errors in console | Run `npm run build` first to check for TypeScript errors |

## 📚 More Info

- **Integration Details:** See HUB_COCKPIT_INTEGRATION.md
- **Full Testing Guide:** See COCKPIT_TESTING_GUIDE.md
- **Complete Summary:** See COCKPIT_INTEGRATION_SUMMARY.md
- **REST API Docs:** See HUB_COCKPIT_INTEGRATION.md (API Reference section)

## 🎯 Common Tasks

### Create a New App
```
Type in chat: "Create a complete e-commerce app with MVP and full implementation"
Watch: Real-time progress as all 9 personas work through the workflow
Result: Complete app code in apps/ directory
```

### List What Skills Are Available
```
Type: "list all skills"
Get: All 17+ Hub Enterprise skills with descriptions
```

### Check System Health
```
Type: "status"
Get: Uptime, memory usage, active sessions, skills executed
```

### Run Specific Persona
```
Click: Any button on Hub Enterprise tab
Example: Click "MVP Definition" to run produto persona
```

---

**Ready?** Press `npm run dev` and open the HTML file! 🎉
