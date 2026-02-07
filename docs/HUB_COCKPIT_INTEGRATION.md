# Hub Cockpit + WebSocket Server Integration Guide

## Overview

The OPENCLAW-COCKPIT.html is a comprehensive dashboard for managing all Hub Enterprise skills. This guide explains how to connect it to the WebSocket server for real-time skill execution.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   OPENCLAW-COCKPIT.html                     │
│  ┌───────────────┬──────────────────────────────────────┐  │
│  │  Hub Tabs     │  Interactive Chat Panel              │  │
│  │  - Enterprise │  - Send commands                     │  │
│  │  - Social     │  - Real-time responses               │  │
│  │  - Supabase   │  - Execute skills                    │  │
│  │  - Aurora     │  - View results                      │  │
│  │  - Guardrail  │                                      │  │
│  └───────────────┴──────────────────────────────────────┘  │
│                           ↓                                  │
│               WebSocket Connection (ws://)                   │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│              WebSocket Server (websocket-server.ts)         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Message Handler                                     │  │
│  │  - chat: Process user messages with AI              │  │
│  │  - execute_skill: Run hub skills                    │  │
│  │  - command: list_skills, get_status, get_history  │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Skill Registry + Hub Enterprise                     │  │
│  │  - hub-enterprise-orchestrator                       │  │
│  │  - 9 personas × 5-7 subskills each                   │  │
│  │  - Aurora Monitor for metrics                        │  │
│  │  - GuardrailSkill for validation                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## WebSocket Message Protocol

### 1. Chat Messages
Send user input to AI for intelligent responses

```json
{
  "type": "chat",
  "id": "msg-123",
  "message": "Create a todo app with Node.js backend",
  "model": "claude"
}
```

**Response:**
```json
{
  "type": "chat",
  "id": "msg-123",
  "response": "I'll help you create a todo app...",
  "status": "complete"
}
```

### 2. Skill Execution
Execute specific hub skills directly

```json
{
  "type": "execute_skill",
  "id": "exec-456",
  "skill": "hub.enterprise.orchestrator",
  "input": {
    "workflow": "full",
    "userIntent": "Create an e-commerce platform",
    "appName": "ecommerce_app",
    "constraints": {
      "budget": 50000,
      "timeline": "3 months",
      "team": 4
    }
  }
}
```

**Response:**
```json
{
  "type": "execute_skill",
  "id": "exec-456",
  "status": "in-progress",
  "progress": 0.15,
  "currentStep": "produto.mvp_definition"
}

// ... progress updates ...

{
  "type": "execute_skill",
  "id": "exec-456",
  "status": "complete",
  "result": {
    "appName": "ecommerce_app",
    "workflowSteps": [...],
    "appLocation": "apps/ecommerce_app"
  }
}
```

### 3. Commands
Query system state and skill information

```json
{
  "type": "command",
  "id": "cmd-789",
  "command": "list_skills"
}
```

**Responses:**

#### list_skills
```json
{
  "type": "command",
  "id": "cmd-789",
  "command": "list_skills",
  "skills": [
    {
      "name": "hub.enterprise.orchestrator",
      "category": "HUB",
      "description": "Hub Enterprise - Fábrica de aplicações"
    },
    {
      "name": "hub.enterprise.produto",
      "category": "HUB",
      "description": "Hub Enterprise - Persona Produto (MVP)"
    },
    // ... 8 more personas
  ]
}
```

#### get_status
```json
{
  "type": "command",
  "id": "cmd-789",
  "command": "get_status",
  "status": {
    "uptime": 3600000,
    "activeSessions": 5,
    "messagesProcessed": 142,
    "skillsExecuted": 23,
    "memoryUsage": "145mb",
    "cpuUsage": "12%"
  }
}
```

## Cockpit Integration Implementation

### Step 1: Update OPENCLAW-COCKPIT.html

Replace the demo `sendChat` function with real WebSocket integration:

```javascript
// Add at top of script section
let ws = null;
let messageQueue = [];
let isConnected = false;

// Initialize WebSocket connection
function initWebSocket(wsUrl = 'ws://localhost:8080') {
    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Connected to WebSocket server');
            isConnected = true;
            updateStatus('online');

            // Send any queued messages
            messageQueue.forEach(msg => ws.send(msg));
            messageQueue = [];
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateStatus('error');
        };

        ws.onclose = () => {
            console.log('Disconnected from WebSocket server');
            isConnected = false;
            updateStatus('offline');
            // Attempt reconnect after 3 seconds
            setTimeout(() => initWebSocket(wsUrl), 3000);
        };
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        updateStatus('error');
    }
}

// Handle incoming WebSocket messages
function handleWebSocketMessage(data) {
    const messagesDiv = document.getElementById('chatMessages');

    switch (data.type) {
        case 'chat':
            if (data.response) {
                addBotMessage(data.response, data.id);
            }
            break;

        case 'execute_skill':
            if (data.status === 'in-progress') {
                addBotMessage(`🔄 ${data.currentStep} (${Math.round(data.progress * 100)}%)`, data.id);
            } else if (data.status === 'complete') {
                addBotMessage(`✅ Skill execution complete!\n\nApp location: ${data.result.appName}`, data.id);
            } else if (data.status === 'error') {
                addBotMessage(`❌ Error: ${data.error}`, data.id);
            }
            break;

        case 'command':
            if (data.command === 'list_skills') {
                const skillsList = data.skills
                    .map(s => `• ${s.name}: ${s.description}`)
                    .join('\n');
                addBotMessage(`📚 Available Skills:\n\n${skillsList}`, data.id);
            }
            break;
    }
}

// Send chat message via WebSocket
function sendChatWebSocket(message) {
    const messageData = {
        type: 'chat',
        id: `msg-${Date.now()}`,
        message: message,
        model: 'claude'
    };

    if (isConnected && ws) {
        ws.send(JSON.stringify(messageData));
    } else {
        messageQueue.push(JSON.stringify(messageData));
    }
}

// Execute skill directly
function executeSkill(skillName, input) {
    const execData = {
        type: 'execute_skill',
        id: `exec-${Date.now()}`,
        skill: skillName,
        input: input
    };

    if (isConnected && ws) {
        ws.send(JSON.stringify(execData));
    } else {
        messageQueue.push(JSON.stringify(execData));
    }
}

// Update connection status badge
function updateStatus(status) {
    const badge = document.querySelector('.status-badge');
    if (badge) {
        badge.className = `status-badge status-${status === 'online' ? 'active' : status === 'offline' ? 'error' : 'warning'}`;
        badge.textContent = status.toUpperCase();
    }
}

// Initialize on page load
window.addEventListener('load', () => {
    initWebSocket();
    document.getElementById('chatInput').focus();
});
```

### Step 2: Update Hub Card Action Buttons

Add quick-execute buttons to hub cards:

```javascript
function executeHubSkill(hubName, subskill) {
    const input = {
        subskill: subskill,
        appName: `app_${hubName}_${Date.now()}`
    };

    const skillName = `hub.enterprise.${hubName}`;

    addUserMessage(`Execute: ${skillName}/${subskill}`);
    executeSkill(skillName, input);
}
```

### Step 3: Enhance Chat Input

Update the sendChat function to route to WebSocket:

```javascript
function sendChat(message) {
    const input = document.getElementById('chatInput');
    const messagesDiv = document.getElementById('chatMessages');

    // Get message from input or parameter
    const text = message || input.value;

    if (!text.trim()) return;

    // Add user message to display
    addUserMessage(text);

    // Clear input
    input.value = '';

    // Auto-scroll to bottom
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Send via WebSocket
    if (isConnected) {
        sendChatWebSocket(text);
    } else {
        addBotMessage('⚠️ Not connected to server. Attempting to reconnect...', 'system');
    }
}

function addUserMessage(text) {
    const messagesDiv = document.getElementById('chatMessages');
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    userMsg.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
    messagesDiv.appendChild(userMsg);
}

function addBotMessage(text, id) {
    const messagesDiv = document.getElementById('chatMessages');
    const botMsg = document.createElement('div');
    botMsg.className = 'message bot';
    botMsg.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
    botMsg.id = id || `bot-${Date.now()}`;
    messagesDiv.appendChild(botMsg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
```

## Running the Integration

### 1. Start WebSocket Server
```bash
npm run dev
# or
ts-node websocket-server.ts
```

The server will start on `ws://localhost:8080`

### 2. Open Cockpit
```bash
# Open in browser
open OPENCLAW-COCKPIT.html
# or
firefox OPENCLAW-COCKPIT.html
```

### 3. Start Using

- Type commands in the chat: `list all skills`
- Click hub cards to execute skills
- Send orchestrator commands: `create full app`
- Monitor real-time progress

## Example Commands

### List all available hub skills
```
list all skills
```

### Create a complete app
```
create full e-commerce app with 3 months timeline and 5 person team
```

### Run just MVP definition
```
mvp definition for todo app
```

### Get system status
```
system status
```

### Execute specific persona
```
run qa smoke tests for myapp
```

## Debugging

### Check WebSocket Connection
Open browser DevTools (F12) and in Console:
```javascript
// Should show connection status
console.log(ws.readyState); // 1 = OPEN, 0 = CONNECTING, 2 = CLOSING, 3 = CLOSED
```

### Monitor Messages
In console:
```javascript
// Add logging to all messages
ws.addEventListener('message', (e) => {
    console.log('Received:', JSON.parse(e.data));
});
```

### Server Logs
Check terminal where server is running for debug output:
```
[WebSocket] Client connected via path: / (1 total)
[Chat] Processing message: "list all skills"
[Command] Executing: list_skills
[WebSocket] Sending response to client
```

## Next Steps

1. **Add persistence**: Store chat history in localStorage
2. **Add authentication**: JWT tokens for WebSocket connection
3. **Add real-time metrics**: Dashboard showing running workflows
4. **Add file uploads**: For seeding data into new apps
5. **Add template library**: Pre-built app configurations
6. **Add notifications**: Toast alerts for skill completions
7. **Add dark/light mode**: Toggle theme preference
8. **Add keyboard shortcuts**: Speed up common commands

## API Reference

See `websocket-server.ts` for complete message handler implementation and response formats.
