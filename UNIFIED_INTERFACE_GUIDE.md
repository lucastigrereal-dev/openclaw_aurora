# 🔄 Unified Interface: Telegram = Cockpit Chat

**Objetivo:** O chat do Telegram é o MESMO chat do Cockpit
**Status:** ✅ Design Ready
**Sincronização:** Bidirecional em tempo real
**Interfaces:** Telegram (mobile/desktop) + Cockpit HTML (desktop)

---

## 🎯 Conceito

```
┌─────────────────────────────────────────────────┐
│          UNIFIED CHAT SERVICE                   │
│     (Backend único compartilhado)                │
└─────────────────────────────────────────────────┘
           ↑                          ↑
           │                          │
    ┌──────┴─────┐          ┌────────┴────────┐
    │  Telegram   │          │  Cockpit HTML   │
    │   Mobile    │◄────────►│   Desktop       │
    │  Desktop    │  WebSocket│   Browser      │
    └─────────────┘ Real-time └─────────────────┘
```

**Mesmas mensagens em ambos os lugares!**

---

## 🔧 Como Funciona?

### Cenário 1: Você manda mensagem no Telegram

```
1. Você escreve no Telegram:
   "create a todo app"

2. Bot Telegram envia para backend:
   → Unified Chat Service

3. Serviço armazena a mensagem

4. Serviço envia para TODOS os clientes:
   → Telegram (mostra que você enviou)
   → Cockpit WebSocket (mostra mensagem vindo do Telegram)

5. Claude responde

6. Resposta aparece em:
   → Telegram chat
   → Cockpit chat
```

### Cenário 2: Você manda mensagem no Cockpit

```
1. Você digita no Cockpit:
   "create a todo app"

2. Cockpit envia via WebSocket para backend:
   → Unified Chat Service

3. Serviço armazena

4. Serviço envia para TODOS:
   → Cockpit (mostra mensagem)
   → Telegram (via bot API)

5. Claude responde

6. Resposta aparece em ambos
```

---

## 🚀 Implementação Rápida (30 minutos)

### Passo 1: Criar Serviço Unificado

```typescript
// src/services/unified-chat.ts

import { Bot } from 'grammy';
import { WebSocketServer, WebSocket } from 'ws';

export class UnifiedChatService {
  private wsSessions: Map<string, WebSocket> = new Map();
  private messageHistory: any[] = [];
  private bot: Bot;

  constructor(botToken: string) {
    this.bot = new Bot(botToken);
    this.setupBot();
  }

  // Quando mensagem chega do Telegram
  async handleTelegramMessage(message: {
    text: string;
    userId: string;
    userName: string;
  }) {
    console.log(`[Telegram] ${message.userName}: ${message.text}`);

    // Armazenar
    const stored = {
      id: `msg-${Date.now()}`,
      from: 'telegram',
      user: message.userName,
      userId: message.userId,
      text: message.text,
      timestamp: new Date(),
      status: 'sent'
    };

    this.messageHistory.push(stored);

    // Broadcast para WebSocket (Cockpit)
    this.broadcastToWebSocket({
      type: 'chat_message',
      data: stored
    });

    // Processar com IA
    const response = await this.processWithAI(message.text);

    // Enviar resposta para AMBOS
    await this.sendToTelegram(message.userId, response);
    this.broadcastToWebSocket({
      type: 'chat_response',
      data: {
        id: `resp-${Date.now()}`,
        from: 'ai',
        text: response,
        timestamp: new Date()
      }
    });
  }

  // Quando mensagem chega do Cockpit (WebSocket)
  async handleWebSocketMessage(message: {
    text: string;
    source: 'cockpit';
    sessionId: string;
  }) {
    console.log(`[Cockpit] ${message.text}`);

    // Armazenar
    const stored = {
      id: `msg-${Date.now()}`,
      from: 'cockpit',
      user: 'Browser User',
      text: message.text,
      timestamp: new Date(),
      status: 'sent'
    };

    this.messageHistory.push(stored);

    // Broadcast para WebSocket (para outros clientes)
    this.broadcastToWebSocket({
      type: 'chat_message',
      data: stored
    });

    // Enviar para Telegram (via bot)
    const telegramMessage = `💻 Browser: ${message.text}`;
    await this.sendToTelegramChat(telegramMessage);

    // Processar com IA
    const response = await this.processWithAI(message.text);

    // Enviar resposta para AMBOS
    await this.sendToTelegramChat(response);
    this.broadcastToWebSocket({
      type: 'chat_response',
      data: {
        id: `resp-${Date.now()}`,
        from: 'ai',
        text: response,
        timestamp: new Date()
      }
    });
  }

  // Broadcast para todos os WebSocket clientes
  private broadcastToWebSocket(data: any) {
    this.wsSessions.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }

  // Enviar para Telegram (privado)
  private async sendToTelegram(userId: string, text: string) {
    await this.bot.api.sendMessage(userId, text, {
      parse_mode: 'HTML'
    });
  }

  // Enviar para Telegram chat geral
  private async sendToTelegramChat(text: string) {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    await this.bot.api.sendMessage(chatId, text, {
      parse_mode: 'HTML'
    });
  }

  private setupBot() {
    this.bot.on('message', async (ctx) => {
      await this.handleTelegramMessage({
        text: ctx.message.text || '',
        userId: ctx.from.id.toString(),
        userName: ctx.from.first_name || 'User'
      });
    });
  }
}
```

### Passo 2: Atualizar Telegram Bot

```typescript
// telegram-bot.ts

import { UnifiedChatService } from './src/services/unified-chat';

const unifiedChat = new UnifiedChatService(BOT_TOKEN);

bot.on('message', async (ctx) => {
  // Deixar o serviço unificado lidar
  await unifiedChat.handleTelegramMessage({
    text: ctx.message.text || '',
    userId: ctx.from.id.toString(),
    userName: ctx.from.first_name || 'User'
  });
});
```

### Passo 3: Atualizar Cockpit

```javascript
// Em OPENCLAW-COCKPIT.html

// Quando recebe mensagem do Telegram
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'chat_message') {
    const msg = data.data;

    if (msg.from === 'telegram') {
      addMessageToChat({
        source: '📱 Telegram',
        user: msg.user,
        text: msg.text,
        timestamp: msg.timestamp
      });
    } else if (msg.from === 'cockpit') {
      addMessageToChat({
        source: '💻 Browser',
        user: msg.user,
        text: msg.text,
        timestamp: msg.timestamp
      });
    }
  }

  if (data.type === 'chat_response') {
    addMessageToChat({
      source: '🤖 Aurora',
      text: data.data.text,
      timestamp: data.data.timestamp
    });
  }
};

// Quando você envia do Cockpit
function sendChat(message) {
  const input = document.getElementById('chatInput');
  const text = message || input.value;

  if (!text.trim()) return;

  // Enviar pro serviço unificado
  ws.send(JSON.stringify({
    type: 'unified_chat',
    action: 'send_message',
    text: text,
    source: 'cockpit',
    sessionId: sessionId
  }));

  input.value = '';
}

// Função para adicionar mensagem
function addMessageToChat(msg) {
  const messagesDiv = document.getElementById('chatMessages');
  const msgEl = document.createElement('div');

  msgEl.innerHTML = `
    <div class="message ${msg.source.includes('🤖') ? 'bot' : 'user'}">
      <div class="message-header">${msg.source} ${msg.user || ''}</div>
      <div class="message-content">${msg.text}</div>
      <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
    </div>
  `;

  messagesDiv.appendChild(msgEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
```

---

## 📱 Como Usar

### Option 1: Telegram (Mobile/Desktop)

```
Telegram → Bot do Aurora

/start

Você: /ask create a todo app

Bot responde com mesmo conteúdo que aparece no Cockpit

+ Recebe updates em tempo real
+ Mobile-friendly
+ Histórico sincronizado
```

### Option 2: Cockpit (Desktop)

```
Browser → file:///...OPENCLAW-COCKPIT.html

Type in chat: "create a todo app"

Resposta aparece no Cockpit

+ Interface visual
+ Ver múltiplos hubs
+ Mesma resposta que no Telegram
```

### Option 3: AMBOS Juntos!

```
Telegram (mobile):
[Você envia mensagem]
↓
Cockpit (desktop):
[Vê a mensagem que você enviou]
[Vê a resposta em tempo real]
↓
Telegram (mobile):
[Recebe resposta]

Tudo sincronizado! 🔄
```

---

## 🎨 Mockup do Chat Unificado

### Telegram

```
Aurora Bot 🤖
━━━━━━━━━━━━━━━━━━

📱 Telegram User
criar um app todo

🤖 Aurora Bot
Vou ajudar! Deixa eu usar os personas...
[Produto] MVP definition
[Arquitetura] Architecture design
...✅ Completo!

💻 Browser User
show, qual é a próxima?

🤖 Aurora Bot
Você quer rodar os testes?
```

### Cockpit HTML

```
═════════════════════════════════
         Aurora Chat Hub
═════════════════════════════════

📱 Telegram User: criar um app todo
  14:32

🤖 Aurora Bot: Vou ajudar! Deixa eu usar...
  14:33

💻 Browser User: show, qual é a próxima?
  14:34

🤖 Aurora Bot: Você quer rodar os testes?
  14:35

[Type your message...] [Send]
```

---

## 🔄 Sincronização em Tempo Real

```
Telegram                          Cockpit

User sends "hello"                ↓
    ↓
Backend ←──────────────────────→  WebSocket
    ↓
Message shows in Telegram  ←────→ Message shows in Cockpit
    ↓
AI processes                      ↓
    ↓
Response in Telegram ←───────────→ Response in Cockpit
    ↓
User sees in ~100ms (both)
```

---

## 📊 Database Schema

```sql
CREATE TABLE unified_messages (
  id VARCHAR(255) PRIMARY KEY,
  source VARCHAR(20),           -- 'telegram' or 'cockpit'
  user_id VARCHAR(255),
  user_name VARCHAR(255),
  message_text TEXT,
  is_response BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_source (source),
  INDEX idx_created_at (created_at)
);

-- Histórico completo sincronizado
```

---

## ✨ Features

✅ **Mensagens sincronizadas** - Ambos veem tudo
✅ **Histórico unificado** - Um banco de dados
✅ **Sem duplicação** - Envia uma vez, aparece em 2 lugares
✅ **Tempo real** - Updates instantâneos
✅ **Mobile + Desktop** - Use de qualquer lugar
✅ **Mesmo backend** - Mesmos skills executados
✅ **Authenticated** - Apenas você acessa

---

## 🚀 Implementação (Passo a Passo)

### 1. Backup
```bash
git add .
git commit -m "backup before unified chat implementation"
```

### 2. Criar Service
```bash
# Criar src/services/unified-chat.ts
# Copiar código acima
```

### 3. Atualizar Bot
```bash
# Modificar telegram-bot.ts
# Usar UnifiedChatService
```

### 4. Atualizar Cockpit
```bash
# Modificar OPENCLAW-COCKPIT.html
# Adicionar handlers para unified chat
```

### 5. Testar
```bash
npm run bot

# Telegram: enviar mensagem
# Cockpit: ver aparecer

# Cockpit: enviar mensagem
# Telegram: ver aparecer
```

### 6. Deploy
```bash
git add .
git commit -m "feat: unified chat interface - telegram and cockpit synced"
git push
```

---

## 💡 Exemplos de Uso

### Exemplo 1: Usar Telegram no trabalho

```
Mobile (Telegram):
"@aurora create a complete ecommerce app"

Volta pro laptop:
Desktop (Cockpit):
[Vê a mesma conversa]
[Vê o progresso da execução]
[Continua em qualquer lugar]
```

### Exemplo 2: Colaborar

```
Pessoa A (Telegram):
"criar api para produtos"

Pessoa B (Cockpit):
"vejo a mensagem de A"
"continuo a conversa"

Ambos veem tudo em tempo real
```

### Exemplo 3: Monitor & Debug

```
Telegram (mobile):
"/status"

Cockpit (desktop):
[Vê o resultado do status]
[Continua a navegação visual]

Ambas interfaces compartilham resultados
```

---

## 📋 Checklist Implementação

- [ ] Criar UnifiedChatService
- [ ] Criar ChatHistoryDB
- [ ] Modificar telegram-bot.ts
- [ ] Modificar OPENCLAW-COCKPIT.html
- [ ] Testar Telegram → Cockpit
- [ ] Testar Cockpit → Telegram
- [ ] Testar histórico sincronizado
- [ ] Testar skills compartilhados
- [ ] Deploy em produção
- [ ] Documentar para usuários

---

## 🎉 Resultado Final

**Um único chat que funciona em qualquer lugar:**

- 📱 **Telegram** - Mobile/Desktop rápido
- 💻 **Cockpit HTML** - Interface visual bonita
- 🔄 **Sincronizado** - Mensagens em tempo real
- 🚀 **Mesmos skills** - Execute de qualquer lugar
- 💾 **Histórico unificado** - Tudo salvo em um lugar

---

## 📞 Próximas Ações

**Quer implementar agora?**

Estimativa: **2-3 horas**

```
1. Setup (15 min) - Criar serviços
2. Integração Telegram (30 min) - Modificar bot
3. Integração Cockpit (45 min) - Modificar HTML
4. Testes (30 min) - Testar sincronização
5. Deploy (15 min) - Push para git
```

**Ready?** 🚀

---

**Status:** ✅ Design Ready, Implementation Ready
**Complexity:** Medium (2-3 hours)
**Impact:** High (Unified experience across platforms)
