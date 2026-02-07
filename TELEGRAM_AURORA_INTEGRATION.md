# 🤖 Telegram + Aurora Monitor Integration

**Status:** ✅ Already Integrated
**Bot:** Full Executor (38 skills)
**Features:** Chat, Execute Skills, Monitor System

---

## 🎯 O que é?

O **Telegram Bot do OpenClaw Aurora** é uma interface alternativa ao Cockpit HTML que permite:

✅ Executar **38+ skills** via Telegram
✅ Conversar com **Claude/GPT** via chat
✅ Monitorar sistema em **tempo real**
✅ Executar **commands** (bash, python, node)
✅ Controlar **browser** remotamente
✅ Executar **AutoPC** (cliques, screenshots)
✅ Receber **alertas** do Aurora Monitor

---

## 🚀 Como Usar?

### 1. Configurar Token Telegram

**Criar Bot no Telegram:**
1. Abra `@BotFather` no Telegram
2. `/newbot`
3. Escolha um nome
4. Guarde o **token**

**Configurar no `.env`:**
```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyzABC
TELEGRAM_CHAT_ID=seu_chat_id_aqui
```

### 2. Iniciar Bot

```bash
npm run bot
# ou
ts-node telegram-bot.ts
```

Output esperado:
```
[Bot] Telegram bot iniciado
[Bot] Admin: seu_chat_id
[Bot] 38 skills carregadas
```

### 3. Conversar no Telegram

**Envie mensagens para o bot:**
```
/start                          # Ver todos os comandos
/ask qual é a capital do Brasil # Chat com Claude
/gpt qual é a capital do Brasil # Chat com GPT
/exec ls -la                    # Executar bash
```

---

## 💬 Comandos Disponíveis

### Chat IA

| Comando | Uso | Exemplo |
|---------|-----|---------|
| `/ask` | Claude responde | `/ask create mvp for ecommerce` |
| `/gpt` | GPT responde | `/gpt explain quantum computing` |
| `/chat` | Conversa contínua | `/chat hello` |

### Executar Skills

| Comando | Uso | Exemplo |
|---------|-----|---------|
| `/skill` | Executar skill | `/skill hub.enterprise.produto` |
| `/mvp` | MVP definition | `/mvp Create todo app` |
| `/code` | Gerar código | `/code REST API for products` |
| `/test` | Executar testes | `/test ecommerce_app` |

### Executar Code

| Comando | Uso | Exemplo |
|---------|-----|---------|
| `/exec` | Bash command | `/exec npm install express` |
| `/ps` | PowerShell | `/ps Get-Process` |
| `/py` | Python | `/py print("hello")` |
| `/node` | Node.js | `/node console.log("hello")` |

### Browser Control

| Comando | Uso | Exemplo |
|---------|-----|---------|
| `/open` | Abrir URL | `/open https://google.com` |
| `/click` | Clicar elemento | `/click button.submit` |
| `/type` | Digitar texto | `/type input#email usuario@email.com` |
| `/screenshot` | Tirar screenshot | `/screenshot` |

### AutoPC

| Comando | Uso | Exemplo |
|---------|-----|---------|
| `/click-pc` | Clicar na tela | `/click-pc 100 200` |
| `/type-pc` | Digitar | `/type-pc hello world` |
| `/move-pc` | Mover mouse | `/move-pc 500 300` |

### Monitoramento

| Comando | Uso | Exemplo |
|---------|-----|---------|
| `/status` | Status do sistema | `/status` |
| `/metrics` | Métricas | `/metrics` |
| `/logs` | Ver logs | `/logs 10` |
| `/health` | Health check | `/health` |

---

## 🔗 Diferenças: Telegram vs Cockpit

| Feature | Telegram | Cockpit |
|---------|----------|---------|
| **Interface** | Chat bot | Web UI |
| **Acesso** | Mobile/Desktop | Desktop only |
| **Skills** | 38+ | 17+ |
| **Chat IA** | ✅ Yes | ✅ Yes |
| **Code Execution** | ✅ Yes | ❌ No |
| **AutoPC** | ✅ Yes | ❌ No |
| **Browser Control** | ✅ Yes | ❌ No |
| **Real-time Stats** | ✅ Yes | ✅ Yes |
| **Message History** | ✅ Telegram | Memory only |
| **Offline Queue** | ✅ Yes | ✅ Yes |

---

## 🎮 Exemplos de Uso

### Exemplo 1: Criar App via Telegram

```
👤 Você:
/ask create a complete todo app with Node.js backend and React frontend

🤖 Bot:
Vou ajudar! Deixa eu usar as personas do Hub Enterprise...

[Produto] → MVP definition
[Arquitetura] → Tech stack selection
[Engenharia] → Code generation
[QA] → Smoke tests
[Ops] → Deployment config

✅ App criado em /apps/todo_app

👤 Você:
/skill hub.enterprise.orchestrator
full
ecommerce_app
Create a complete ecommerce platform

🤖 Bot:
🔄 Running full workflow...
[Produto] MVP definition (25%)
[Arquitetura] Architecture design (50%)
[Engenharia] Code generation (75%)
[QA] Testing (95%)
[Security] Security audit (100%)
[Ops] Deployment (100%)

✅ Complete ecommerce app ready!
Location: /apps/ecommerce_app
```

### Exemplo 2: Executar Code Direto

```
👤 Você:
/exec npm install express cors dotenv

🤖 Bot:
npm notice...
npm install notice...
✅ Pacotes instalados

👤 Você:
/py
import requests
resp = requests.get('https://api.github.com')
print(resp.status_code)

🤖 Bot:
200
✅ Código executado com sucesso
```

### Exemplo 3: Monitorar Sistema

```
👤 Você:
/status

🤖 Bot:
📊 Status do Sistema:
├─ Uptime: 2d 14h 32m
├─ CPU: 12%
├─ Memory: 456MB / 2GB
├─ Active Skills: 3
├─ Messages Today: 142
├─ Errors: 0
└─ Health: 🟢 HEALTHY

👤 Você:
/metrics

🤖 Bot:
📈 Últimas Métricas:
├─ telegram.messages: 142
├─ telegram.latency: 145ms
├─ skill.execution: 23
├─ skill.success_rate: 98.2%
├─ api.calls: 567
└─ database.queries: 1,234
```

---

## 🔌 Integração com Cockpit

Ambos **usam o mesmo backend WebSocket**!

```
Telegram Bot → WebSocket Server (port 8080)
                      ↓
                  SkillExecutor
                      ↓
                 Hub Enterprise
                      ↓
                   Personas

Cockpit HTML → WebSocket Server (port 8080)
                      ↓
                  SkillExecutor
                      ↓
                 Hub Enterprise
                      ↓
                   Personas
```

**Você pode:**
- ✅ Iniciar app via Telegram
- ✅ Monitorar via Cockpit
- ✅ Executar testes via Telegram
- ✅ Ver status em tempo real

Tudo sincronizado! 🔄

---

## 🛡️ Segurança

### Autenticação

```bash
TELEGRAM_BOT_TOKEN=seu_token_privado
TELEGRAM_CHAT_ID=seu_chat_id_so_seu
```

Apenas seu chat ID pode usar o bot!

### Rate Limiting

Integrado com **GuardrailSkill**:
- Max 10 requisições/min
- Auto-block em comportamento suspeito
- Log de todas as operações

### Sandbox Execution

Comandos executam em sandbox isolado:
- Sem acesso a arquivos sensíveis
- Timeout de 30 segundos
- Sem permissão de root

---

## 📊 38 Skills Disponíveis

### Hub Enterprise (10 skills)
- ✅ `hub.enterprise.orchestrator` - Orquestra workflows
- ✅ `hub.enterprise.produto` - MVP & planning
- ✅ `hub.enterprise.arquitetura` - Architecture design
- ✅ `hub.enterprise.engenharia` - Code generation
- ✅ `hub.enterprise.qa` - Testing
- ✅ `hub.enterprise.ops` - Deployment
- ✅ `hub.enterprise.security` - Security audit
- ✅ `hub.enterprise.dados` - Analytics
- ✅ `hub.enterprise.design` - UI/UX
- ✅ `hub.enterprise.performance` - Performance tuning

### Communication Skills (3 skills)
- ✅ `telegram.send` - Send Telegram message
- ✅ `slack.send` - Send Slack message
- ✅ `email.send` - Send email

### Browser Control (5 skills)
- ✅ `browser.open` - Open URL
- ✅ `browser.click` - Click element
- ✅ `browser.type` - Type text
- ✅ `browser.screenshot` - Take screenshot
- ✅ `browser.wait` - Wait for element

### AutoPC Control (4 skills)
- ✅ `autopc.click` - Click mouse
- ✅ `autopc.type` - Type text
- ✅ `autopc.move` - Move mouse
- ✅ `autopc.screenshot` - Screenshot

### Code Execution (5 skills)
- ✅ `exec.bash` - Execute bash
- ✅ `exec.powershell` - Execute PowerShell
- ✅ `exec.python` - Execute Python
- ✅ `exec.node` - Execute Node.js
- ✅ `exec.javascript` - Execute JavaScript

### Monitoring (3 skills)
- ✅ `monitor.status` - System status
- ✅ `monitor.metrics` - Get metrics
- ✅ `monitor.logs` - View logs

### Social Hub (3 skills)
- ✅ `social.generator` - Generate content
- ✅ `social.scheduler` - Schedule posts
- ✅ `social.analytics` - View analytics

### Other Skills (5+ skills)
- ✅ `supabase.*` - Database operations
- ✅ `guardrail.*` - Security validation
- ✅ `aurora.*` - Monitoring
- ✅ E mais...

**Total: 38+ skills**

---

## 🔄 Message Flow

```
User Message (Telegram)
    ↓
[telegram-bot.ts]
    ├─ Parse command
    ├─ Validate user (admin check)
    ├─ Check rate limits
    └─ Route to skill
    ↓
[SkillExecutor]
    ├─ Load skill
    ├─ Execute with timeout
    ├─ Capture output
    └─ Log metrics
    ↓
[Aurora Monitor]
    ├─ Track execution
    ├─ Record metrics
    ├─ Send alerts if needed
    └─ Update watchdog
    ↓
Response (Telegram)
    ├─ Format output
    ├─ Add emoji status
    ├─ Send message
    └─ Store in history
```

---

## 🚀 Quick Start

### 1. Configurar Token

```bash
# .env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyzABC
TELEGRAM_CHAT_ID=987654321
```

### 2. Iniciar Bot

```bash
npm run bot
```

### 3. Enviar Mensagem no Telegram

```
/start
/ask create a todo app
/status
```

### 4. Ver Logs

```bash
# Terminal onde bot está rodando
[Bot] User message: /ask create a todo app
[Chat] Processing...
[Skill] Executing: claude
[Monitor] Metric recorded
[Bot] Response sent ✅
```

---

## 📚 Documentação

| Doc | Propósito |
|-----|-----------|
| **TELEGRAM_AURORA_INTEGRATION.md** | Este documento |
| **telegram-bot.ts** | Código source do bot |
| **skills/comm-telegram.ts** | Skill de envio |
| **COCKPIT_README.md** | Alternativa Cockpit HTML |

---

## ⚙️ Configuração Avançada

### Variáveis de Ambiente

```bash
# Obrigatório
TELEGRAM_BOT_TOKEN=seu_token

# Opcional
TELEGRAM_CHAT_ID=seu_chat_id
TELEGRAM_ADMIN_IDS=id1,id2,id3
LOG_LEVEL=info
SKILL_TIMEOUT=30000
MAX_RETRIES=3
RATE_LIMIT=10/min
```

### Arquivo Config

```typescript
// telegram-bot.ts
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const RATE_LIMIT = 10; // mensagens/minuto
const TIMEOUT = 30000; // ms
```

---

## 🆚 Quando Usar?

### Use Telegram Quando:
- ✅ Quer algo **rápido** e **móvel**
- ✅ Precisa **executar code** direto
- ✅ Quer **alertas** de monitoramento
- ✅ Está **fora da máquina** (mobile)
- ✅ Prefere **chat natural**

### Use Cockpit Quando:
- ✅ Quer **interface visual** bonita
- ✅ Prefere **abas e navegar**
- ✅ Quer ver **múltiplas hubs** ao mesmo tempo
- ✅ Está **na máquina** (desktop)
- ✅ Quer **histórico visual** de chat

**O Melhor:** Use os **dois juntos**! 🚀

---

## 📞 Suporte

### Problema: Bot não responde

```bash
# Verificar token
echo $TELEGRAM_BOT_TOKEN

# Verificar se está rodando
lsof -i :8080

# Reiniciar
npm run bot
```

### Problema: Rate limit

```bash
# Aguarde 1 minuto ou aumentar em .env
RATE_LIMIT=20/min
```

### Problema: Command não funciona

```bash
# Garantir que é admin
/status  # deve retornar status

# Se não retornar, não é admin
# Use: TELEGRAM_CHAT_ID=seu_id
```

---

## 🎉 Resumo

| Aspecto | Status |
|--------|--------|
| **Bot Telegram** | ✅ Funcionando |
| **38+ Skills** | ✅ Disponíveis |
| **Chat IA** | ✅ Claude & GPT |
| **Code Execution** | ✅ Bash, Python, Node |
| **Browser Control** | ✅ Simulação |
| **AutoPC** | ✅ Cliques & Screenshots |
| **Monitoramento** | ✅ Métricas em tempo real |
| **Segurança** | ✅ Rate limiting & auth |
| **Sincronização** | ✅ Com Cockpit |

**Está pronto para usar!** 🚀

---

**Last Updated:** 2026-02-06
**Version:** 1.0.0
**Status:** ✅ Production Ready
