# OpenClaw Aurora Cockpit - Testing & Usage Guide

## Quick Start

### 1. Start the WebSocket Server

```bash
# Install dependencies (if needed)
npm install

# Start the server in development mode
npm run dev

# Or with ts-node directly
ts-node websocket-server.ts
```

Expected output:
```
[WebSocket] Server started on port 8080
[WebSocket] Accepts: ws://localhost:8080 or ws://localhost:8080/api/v1/ws
[WebSocket] Chat and commands enabled
```

### 2. Open the Cockpit

Open `OPENCLAW-COCKPIT.html` in your browser:

```bash
# Option 1: Direct file URL
open file:///path/to/OPENCLAW-COCKPIT.html

# Option 2: With custom WebSocket URL
open file:///path/to/OPENCLAW-COCKPIT.html?ws=ws://custom-host:8080

# Option 3: With custom API URL
open file:///path/to/OPENCLAW-COCKPIT.html?api=http://custom-host:8080

# Option 4: Both custom URLs
open file:///path/to/OPENCLAW-COCKPIT.html?ws=ws://custom-host:8080&api=http://custom-host:8080
```

### 3. Check Browser Console

Open DevTools (F12) → Console to see connection logs:

```
[Cockpit] Initializing with WebSocket URL: ws://localhost:8080
[Cockpit] Attempting to connect to ws://localhost:8080
[Cockpit] Connected to WebSocket server
✅ Conectado ao servidor OpenClaw Aurora!
👋 Bem-vindo ao OpenClaw Aurora Hub Central! Digite "list" para ver skills disponíveis...
```

## Testing Scenarios

### Scenario 1: Verify REST Endpoints

#### 1.1 Get All Hubs
```bash
curl http://localhost:8080/api/hubs
```

Expected response:
```json
{
  "success": true,
  "hubs": [
    {
      "id": "hub-enterprise",
      "name": "Hub Enterprise",
      "description": "Fábrica de aplicações com 9 personas",
      "personas": 9
    },
    ...
  ]
}
```

#### 1.2 Get Hub Enterprise Skills
```bash
curl http://localhost:8080/api/hubs/hub-enterprise
```

Expected response:
```json
{
  "success": true,
  "hubId": "hub-enterprise",
  "skills": [
    {
      "name": "hub.enterprise.orchestrator",
      "persona": "orchestrator",
      "description": "Orquestrador principal"
    },
    ...
  ]
}
```

#### 1.3 Get System Status
```bash
curl http://localhost:8080/api/status
```

Expected response:
```json
{
  "success": true,
  "status": {
    "uptime": 3600000,
    "activeSessions": 1,
    "messagesProcessed": 0,
    "skillsExecuted": 0,
    "memoryUsage": "45mb",
    "cpuUsage": "N/A",
    "timestamp": 1707257400000
  }
}
```

#### 1.4 Health Check
```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1707257400000
}
```

### Scenario 2: Test WebSocket Chat Commands

In the cockpit chat, type these commands:

#### 2.1 List Available Skills
```
list all skills
```

Expected response in chat:
```
📚 Skills Disponíveis:
• hub.enterprise.orchestrator: Orquestrador principal
• hub.enterprise.produto: MVP definition, user stories, roadmap
• hub.enterprise.arquitetura: Architecture design, tech stack selection
...
```

#### 2.2 Get System Status
```
status
```

Expected response:
```
📊 Status do Sistema:
• Uptime: 1h 23m
• Sessões Ativas: 1
• Mensagens Processadas: 5
• Skills Executados: 0
• Memória: 45mb
• CPU: N/A
```

#### 2.3 Execute Hub Enterprise Skill
```
create mvp for ecommerce app
```

Expected response:
```
🚀 Executando: hub.enterprise.produto/mvp_definition
🔄 produto.mvp_definition (15%)
... (progress updates)
✅ Execução concluída!
```

### Scenario 3: Test WebSocket Connection Status

#### 3.1 Verify Connection Indicator
- Look at top-right corner of cockpit
- Should show: 🟢 ONLINE
- If offline: 🔴 OFFLINE or 🟡 ERROR

#### 3.2 Test Reconnection
```bash
# In terminal running server, press Ctrl+C to stop
# Watch cockpit for reconnect message
# Should see: "⚠️ Reconectando... (tentativa 1/5)"
# Restart server with: npm run dev
# Should see: "✅ Conectado ao servidor OpenClaw Aurora!"
```

### Scenario 4: Test Hub Tabs

Click each tab to verify switching:

- ✅ **Hub Enterprise** - Shows all 9 personas
- ✅ **Social Hub** - Shows social media personas
- ✅ **Supabase Archon** - Shows database tools
- ✅ **Aurora Monitor** - Shows monitoring tools
- ✅ **GuardrailSkill** - Shows security tools

Each tab should update the chat with a message like:
```
✨ Switched to hub-enterprise hub
```

### Scenario 5: Test Skill Execution Buttons

#### 5.1 Hub Enterprise → Produto Persona

Click "MVP Definition" button and verify:
- Chat shows user message: `Executando: hub.enterprise.produto/mvp_definition`
- Chat shows execution status: `🚀 Executando: hub.enterprise.produto/mvp_definition`

Expected behavior:
- If connected: WebSocket message sent
- If disconnected: Message queued

#### 5.2 Click Multiple Buttons

Test that multiple skill executions queue properly:
1. Click "MVP Definition"
2. Click "User Stories"
3. Click "Roadmap Planning"

Verify all are queued/executed in order.

### Scenario 6: Test Error Handling

#### 6.1 Disconnect Scenarios

**Scenario A: Start cockpit without server**
- Expected: "❌ Erro ao conectar: WebSocket is closed"
- Status badge: 🔴 OFFLINE
- Auto-reconnect timer starts

**Scenario B: Server crashes during chat**
- Type a message
- Kill server with Ctrl+C
- Message should queue
- Restart server
- Message should send

**Scenario C: Invalid message from server**
- Break server response format
- Cockpit should show error: `❌ Erro ao processar mensagem`
- Connection should remain open

### Scenario 7: Test Message Types

#### 7.1 Chat Messages
Send via chat: "Create a todo app"
- Type: chat
- Model: claude
- Expected: AI response

#### 7.2 Skill Execution
Click persona button or send command: "run qa tests"
- Type: execute_skill
- Skill: hub.enterprise.qa
- Expected: Progress updates

#### 7.3 Commands
Send: "list" or "status"
- Type: command
- Command: list_skills or get_status
- Expected: Formatted response

## Performance Testing

### Memory Usage
```bash
# Monitor server memory while:
# 1. Open cockpit
# 2. Send 100 messages
# 3. Execute 10 skills

node --max_old_space_size=512 -r ts-node/register websocket-server.ts
```

### Connection Limits
```bash
# Test multiple concurrent connections:
# Open cockpit in 5 different browser windows
# Send messages from all simultaneously
# Verify all receive responses
```

### Stress Test
```bash
# Send rapid messages:
# setInterval(() => sendChat('test'), 100), 10000)

# Expected: No crashes, all messages queued/processed
```

## Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome 90+ | ✅ | Full support |
| Firefox 88+ | ✅ | Full support |
| Safari 14+ | ✅ | Full support |
| Edge 90+ | ✅ | Full support |
| Mobile Chrome | ⚠️ | Chat hidden on small screens |

## Debugging

### Enable Verbose Logging

In browser console:
```javascript
// Show all WebSocket messages
ws.addEventListener('message', (e) => {
    console.log('WS Message:', e.data);
});

// Show all fetch calls
const originalFetch = fetch;
fetch = function(...args) {
    console.log('Fetch:', args[0]);
    return originalFetch.apply(this, args);
};
```

### Check WebSocket State
```javascript
// In console
console.log('WS Ready State:', ws.readyState);
// 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED

console.log('Is Connected:', isConnected);
console.log('Message Queue:', messageQueue);
console.log('Active Clients (server):', (assume 1 if connected));
```

### View Server Logs
```bash
# Terminal output from npm run dev shows:
[WebSocket] Client connected via path: / (1 total)
[Chat] Processing message: "test"
[Command] Executing: list_skills
[WebSocket] Sending response to client
```

## Common Issues

### Issue: Cannot connect to WebSocket

**Solution:**
```bash
# Check if server is running
lsof -i :8080

# Restart server
npm run dev

# Check firewall
sudo ufw allow 8080

# Try with explicit host
?ws=ws://127.0.0.1:8080
```

### Issue: Messages not sending

**Solution:**
```javascript
// Check in console:
console.log('isConnected:', isConnected); // should be true
console.log('ws.readyState:', ws.readyState); // should be 1
console.log('messageQueue:', messageQueue); // should be empty

// Force reconnect:
if (ws) ws.close();
initWebSocket('ws://localhost:8080');
```

### Issue: REST endpoints returning 404

**Solution:**
```bash
# Verify endpoints exist:
curl -v http://localhost:8080/health
curl -v http://localhost:8080/api/hubs

# Check Content-Type headers:
curl -i http://localhost:8080/api/status
# Should include: Content-Type: application/json
```

### Issue: Cockpit not responding to clicks

**Solution:**
```javascript
// In console, check if functions exist:
typeof sendChat // should be "function"
typeof executeSkill // should be "function"
typeof switchTab // should be "function"

// Try manual execution:
sendChat('test message');
```

## Integration Checklist

- [ ] WebSocket server starts without errors
- [ ] REST endpoints return valid JSON
- [ ] Cockpit loads without JS errors
- [ ] Connection status shows as ONLINE
- [ ] Chat messages send and receive
- [ ] List skills command works
- [ ] System status command works
- [ ] Hub tabs switch properly
- [ ] Skill buttons execute or queue
- [ ] Reconnection works on disconnect
- [ ] Error messages display correctly
- [ ] Browser console clean (no red errors)

## Next Steps

1. **Deploy to production:**
   - Use PM2 or systemd to manage server
   - Set environment variables for WebSocket port
   - Use HTTPS + WSS for production

2. **Add authentication:**
   - JWT tokens for WebSocket connections
   - OAuth integration for users

3. **Add persistence:**
   - Store chat history in database
   - Cache skill results

4. **Add analytics:**
   - Track skill execution times
   - Monitor error rates
   - Create dashboards

5. **Enhance UI:**
   - Add dark/light mode
   - Add keyboard shortcuts
   - Add syntax highlighting for code results

## Support

For issues or questions:
1. Check browser console (F12)
2. Check server terminal output
3. Review this guide's debugging section
4. Check GitHub issues for known problems
