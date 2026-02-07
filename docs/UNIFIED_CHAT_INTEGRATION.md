# 🔗 Unified Chat - Cockpit ↔ Telegram

**Status:** ✅ Design Ready (Implementation Pending)
**Feature:** Chat sincronizado entre Cockpit e Telegram
**Sync:** Real-time bidirecional

---

## 🎯 Visão Geral

Unificar o chat do **Cockpit HTML** com o **Telegram Bot** para que:

✅ Mensagem no Cockpit → Aparece no Telegram
✅ Mensagem no Telegram → Aparece no Cockpit
✅ Histórico sincronizado
✅ Mesmos skills executáveis dos dois lados
✅ Status de execução em tempo real

---

## 🏗️ Arquitetura

```
┌────────────────────────────────────────────────────────────────┐
│                    UNIFIED CHAT BACKEND                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Unified Chat Server (New)                              │ │
│  │  ├─ Message broker (Redis/In-Memory)                    │ │
│  │  ├─ Chat history DB                                     │ │
│  │  ├─ Session management                                  │ │
│  │  └─ Sync engine (Bidirectional)                         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                      ↑         ↑                                │
│         ┌────────────┘         └────────────┐                 │
│         │                                    │                 │
└─────────┼────────────────────────────────────┼─────────────────┘
          │                                    │
          ↓                                    ↓
    ┌──────────────┐                  ┌───────────────┐
    │  Telegram    │                  │   Cockpit     │
    │  Bot (WebSocket)                │   (Browser)   │
    │              │                  │               │
    │  /ask query  │◄─────────────────►│ Type query   │
    │  Message ✅  │                  │ Message ✅    │
    │  Status 📊   │◄─────────────────►│ Status 📊    │
    │  Exec skill  │                  │ Click button  │
    └──────────────┘                  └───────────────┘
```

---

## 📋 Fluxo de Mensagens

### Cockpit → Telegram

```
1. User types in Cockpit chat
2. sendChat(message)
3. WebSocket sends to backend
4. Backend stores in DB
5. Backend broadcasts to Telegram via Bot API
6. Telegram receives message
7. Both show: "Via Cockpit: [message]"
```

### Telegram → Cockpit

```
1. User sends message in Telegram
2. Bot receives (via grammy)
3. Backend stores in DB
4. Backend broadcasts to Cockpit via WebSocket
5. Cockpit receives via ws.onmessage
6. Both show: "Via Telegram: [message]"
```

---

## 🔧 Implementação

### Passo 1: Criar Unified Chat Service

```typescript
// src/services/unified-chat.ts

export class UnifiedChatService {
  private db: ChatDatabase;
  private wsClients: Set<WebSocket> = new Set();
  private telegramBotToken: string;
  private telegramChatId: string;

  async sendMessage(message: {
    from: 'telegram' | 'cockpit';
    userId: string;
    userName: string;
    text: string;
    timestamp: Date;
  }) {
    // 1. Armazenar no DB
    await this.db.saveMessage(message);

    // 2. Broadcast para WebSocket (Cockpit)
    if (message.from === 'telegram') {
      this.broadcastToWebSocket({
        type: 'chat',
        source: 'telegram',
        user: message.userName,
        message: message.text,
        timestamp: message.timestamp
      });
    }

    // 3. Enviar para Telegram (se veio do Cockpit)
    if (message.from === 'cockpit') {
      await this.sendToTelegram({
        chatId: this.telegramChatId,
        text: `💻 Cockpit: ${message.text}`,
        parseMode: 'HTML'
      });
    }
  }

  async broadcastToWebSocket(data: any) {
    this.wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  async sendToTelegram(options: {
    chatId: string;
    text: string;
    parseMode?: string;
  }) {
    // Usar skill telegram.send
    await this.telegramSkill.execute({
      chatId: options.chatId,
      text: options.text,
      parseMode: options.parseMode || 'HTML'
    });
  }
}
```

### Passo 2: Modificar Cockpit para Unified Chat

```javascript
// Em OPENCLAW-COCKPIT.html - adicionar source tracking

function sendChat(message) {
    const input = document.getElementById('chatInput');
    const text = message || input.value;

    if (!text.trim()) return;

    // Add user message with SOURCE
    addUserMessage(text, 'cockpit');

    // Enviar via WebSocket com source
    const messageData = {
        type: 'chat',
        id: `msg-${Date.now()}`,
        message: text,
        model: 'claude',
        source: 'cockpit',  // ← NEW
        userName: 'Cockpit User',  // ← NEW
        timestamp: new Date()  // ← NEW
    };

    ws.send(JSON.stringify(messageData));
}

function addUserMessage(text, source) {
    const messagesDiv = document.getElementById('chatMessages');
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';

    // Adicionar badge de source
    const sourceEmoji = source === 'cockpit' ? '💻' : '📱';
    userMsg.innerHTML = `
        <div class="message-header">
            ${sourceEmoji} ${source === 'cockpit' ? 'Cockpit' : 'Telegram'}
        </div>
        <div class="message-content">${escapeHtml(text)}</div>
    `;

    messagesDiv.appendChild(userMsg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
```

### Passo 3: Modificar Telegram Bot para Unified Chat

```typescript
// Em telegram-bot.ts - adicionar integração com unified chat

const unifiedChat = new UnifiedChatService();

bot.on('message', async (ctx) => {
  const message = {
    from: 'telegram',
    userId: ctx.from?.id.toString() || 'unknown',
    userName: ctx.from?.first_name || 'Telegram User',
    text: ctx.message?.text || '',
    timestamp: new Date()
  };

  // Enviar para o serviço unificado
  await unifiedChat.sendMessage(message);

  // Processar comando se for skill
  if (message.text.startsWith('/')) {
    // ... processar comando
  }
});
```

### Passo 4: Adicionar Chat History DB

```typescript
// src/database/chat-history.ts

export class ChatHistoryDB {
  async saveMessage(message: ChatMessage) {
    // Salvar em SQLite, PostgreSQL ou Redis
    const record = {
      id: uuid(),
      source: message.from,
      userId: message.userId,
      userName: message.userName,
      text: message.text,
      timestamp: message.timestamp,
      resolved: false
    };

    await this.db.insert('chat_messages', record);
  }

  async getHistory(limit: number = 50) {
    return await this.db.query(
      'SELECT * FROM chat_messages ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
  }

  async getMessagesByDate(date: Date) {
    return await this.db.query(
      'SELECT * FROM chat_messages WHERE DATE(timestamp) = ? ORDER BY timestamp',
      [formatDate(date)]
    );
  }
}
```

---

## 🎯 Features Implementados

### 1. Unified Message History

```
┌─────────────────────────────────────────┐
│ Chat History (Unified)                  │
├─────────────────────────────────────────┤
│ 📱 Telegram: Create a todo app         │ 14:32
│ 💻 Cockpit: Let me generate MVP        │ 14:33
│ 📱 Telegram: With authentication        │ 14:34
│ 💻 Cockpit: Executing...                │ 14:35
│ 📱 Telegram: ✅ Done!                  │ 14:36
└─────────────────────────────────────────┘
```

### 2. Bidirectional Message Sync

```
Telegram                          Cockpit
   │                                │
   ├─ Type message ────────────────►│
   │                                │
   ◄────── Response appears ────────┤
   │                                │
   └─ Execute skill ─────────────►  │
                                    │
   ◄────── Status updates ──────────┘
```

### 3. Real-time Status Updates

```
Telegram shows:
🔄 Processing: produto.mvp_definition (15%)
🔄 Processing: produto.mvp_definition (45%)
✅ Complete: MVP definition ready

Cockpit shows:
🔄 Processing: produto.mvp_definition (15%)
🔄 Processing: produto.mvp_definition (45%)
✅ Complete: MVP definition ready
```

### 4. Shared Skill Execution

```
Either platform can:
- Execute Hub Enterprise skills
- Run code (bash, python, node)
- Control browser
- Get system status
- View logs
- Trigger alerts
```

---

## 💾 Database Schema

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  source VARCHAR(20),  -- 'telegram' or 'cockpit'
  user_id VARCHAR(255),
  user_name VARCHAR(255),
  text TEXT,
  timestamp DATETIME,
  resolved BOOLEAN DEFAULT FALSE,
  skill_executed VARCHAR(255) NULL,
  result TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_timestamp ON chat_messages(timestamp);
CREATE INDEX idx_source ON chat_messages(source);
CREATE INDEX idx_user_id ON chat_messages(user_id);
```

---

## 🔄 Sync Engine

### WebSocket Message Format

```json
{
  "type": "unified_chat",
  "action": "message_sync",
  "data": {
    "id": "msg-123",
    "source": "telegram",
    "userName": "João Silva",
    "text": "Create MVP",
    "timestamp": "2026-02-06T14:32:00Z"
  }
}
```

### Telegram Bot Message Format

```json
{
  "type": "unified_chat",
  "action": "message_sync",
  "data": {
    "id": "msg-124",
    "source": "cockpit",
    "userName": "Browser User",
    "text": "Generating code...",
    "timestamp": "2026-02-06T14:33:00Z"
  }
}
```

---

## 🚀 Como Implementar?

### Fase 1: Backend Service (2 hours)
```bash
1. Create unified-chat.ts service
2. Create chat-history.ts database
3. Modify websocket-server.ts for sync
4. Modify telegram-bot.ts for sync
```

### Fase 2: Frontend Updates (1 hour)
```bash
1. Update OPENCLAW-COCKPIT.html chat UI
2. Add source badges (Cockpit/Telegram)
3. Add chat history viewer
4. Add timestamp display
```

### Fase 3: Testing (1 hour)
```bash
1. Test Cockpit → Telegram message
2. Test Telegram → Cockpit message
3. Test history persistence
4. Test skill execution sync
```

---

## 🎨 UI Changes

### Cockpit Chat Panel (Updated)

```html
<div class="chat-messages" id="chatMessages">
  <div class="message bot">
    <div class="message-header">🤖 Aurora Bot</div>
    <div class="message-content">Olá! Como posso ajudar?</div>
    <div class="message-meta">14:30</div>
  </div>

  <div class="message user" data-source="telegram">
    <div class="message-header">📱 João Silva (Telegram)</div>
    <div class="message-content">Create a todo app</div>
    <div class="message-meta">14:31</div>
  </div>

  <div class="message user" data-source="cockpit">
    <div class="message-header">💻 Browser User (Cockpit)</div>
    <div class="message-content">Let me generate MVP</div>
    <div class="message-meta">14:32</div>
  </div>
</div>
```

### CSS

```css
.message[data-source="telegram"] {
  border-left: 3px solid #0088cc;  /* Telegram blue */
}

.message[data-source="cockpit"] {
  border-left: 3px solid #00ff88;  /* Aurora green */
}

.message-header {
  font-size: 0.9em;
  font-weight: bold;
  color: #ccc;
  margin-bottom: 4px;
}

.message-meta {
  font-size: 0.8em;
  color: #888;
  margin-top: 4px;
  text-align: right;
}
```

---

## 📊 Sincronização em Tempo Real

```
Timeline de Sincronização:

T+0ms: User types in Cockpit
T+10ms: Message sent via WebSocket
T+20ms: Backend receives & validates
T+30ms: Message stored in DB
T+40ms: Broadcast to Telegram
T+50ms: Telegram API sends message
T+100ms: Telegram shows message
T+110ms: WebSocket broadcasts to other Cockpit clients
T+120ms: All clients updated
```

---

## 🔐 Segurança

### Autenticação Unificada

```typescript
interface User {
  id: string;
  name: string;
  source: 'telegram' | 'cockpit';
  telegramId?: string;
  sessionId?: string;
  isAdmin: boolean;
  permissions: string[];
}
```

### Rate Limiting Unificado

```
Telegram: 10 messages/min
Cockpit:  20 messages/min
Shared:   30 messages/min total per user
```

---

## 🎯 Benefícios

✅ **Unified Experience**: Same chat, two interfaces
✅ **Mobile + Desktop**: Use Telegram on phone, Cockpit on desktop
✅ **Persistent History**: All messages stored
✅ **Shared Execution**: Start skill on Telegram, monitor on Cockpit
✅ **Real-time Sync**: Changes visible instantly
✅ **Better Collaboration**: See who sent message from where

---

## 📝 Checklist Implementação

- [ ] Create UnifiedChatService class
- [ ] Create ChatHistoryDB class
- [ ] Modify websocket-server.ts for message sync
- [ ] Modify telegram-bot.ts for message sync
- [ ] Update OPENCLAW-COCKPIT.html chat UI
- [ ] Add message source badges
- [ ] Add timestamp display
- [ ] Add chat history viewer
- [ ] Test Cockpit → Telegram sync
- [ ] Test Telegram → Cockpit sync
- [ ] Test skill execution sync
- [ ] Test history persistence
- [ ] Deploy to production
- [ ] Document in README

---

## 💡 Exemplos de Uso

### Scenario 1: Mobile to Desktop

```
Mobile (Telegram):
/ask create a todo app

Desktop (Cockpit):
[Sees message from Telegram user]
[Clicks MVP Definition button]
[Progress shown in Telegram and Cockpit simultaneously]

Mobile (Telegram):
[Receives execution updates in real-time]
```

### Scenario 2: Desktop to Mobile

```
Desktop (Cockpit):
Type: Run security tests

Mobile (Telegram):
[Receives: "Cockpit: Run security tests"]
[Can reply with additional requirements]

Desktop (Cockpit):
[Sees Telegram response and adjusts]
```

---

## 🚀 Próximos Passos

1. **Design**: Aprovação da arquitetura (✅ Done)
2. **Implementation**: Implementar serviço unificado (~3 hours)
3. **Testing**: Testes completos (~1 hour)
4. **Deployment**: Deploy em produção
5. **Monitoring**: Monitorar sincronização

---

**Status:** ✅ Design Approved, Ready for Implementation
**Complexity:** Medium (3-4 hours of development)
**Impact:** High (Unified experience for all users)
