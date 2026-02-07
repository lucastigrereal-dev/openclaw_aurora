# 🚀 Complete Setup: Conversar com Aurora Pelo Telegram

**Objective:** Usar Telegram como interface principal do OpenClaw Aurora (Khron)
**Status:** ✅ Pronto Agora
**Interfaces:** Telegram (primary) + Cockpit (visual) + WhatsApp (futuro)

---

## 🎯 O Que Você Quer

```
Você quer conversar com Aurora/Khron pelo Telegram

Telegram Bot ←→ OpenClaw Aurora (mesma coisa que Khron)
    ↓
    Executar skills
    Chat com IA
    Rodar código
    Monitorar sistema
    Tudo via Telegram
```

---

## 🚀 SETUP EM 5 MINUTOS

### Passo 1: Obter Token Telegram (2 min)

1. Abra Telegram e procure: `@BotFather`
2. Digite: `/newbot`
3. Escolha um nome (ex: "AuroraBot" ou "KhronBot")
4. **Guarde o TOKEN**

### Passo 2: Configurar .env (1 min)

```bash
# Abra .env e adicione:
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyzABC
TELEGRAM_CHAT_ID=seu_numero_aqui
```

**Como pegar CHAT_ID:**
```bash
# Depois que criar o bot, abra:
https://api.telegram.org/bot{SEU_TOKEN}/getUpdates

# Envie uma mensagem para o bot
# Procure por "id" no JSON que aparecer
# Esse número é seu CHAT_ID
```

### Passo 3: Iniciar Bot (1 min)

```bash
npm run bot
```

**Esperado:**
```
[Bot] Telegram bot iniciado ✅
[Bot] Token: configurado
[Bot] Admin: seu_chat_id
[Bot] 38 skills carregadas
[Bot] Aguardando mensagens...
```

### Passo 4: Ir Pro Telegram (1 min)

Procure pelo bot que você criou e envie:

```
/start
```

### Passo 5: Começar a Usar! (Imediato)

```
/ask create a todo app
/status
/orchestrator full ecommerce platform
```

---

## 💬 EXEMPLOS DE USO

### Chat com Claude/GPT

```
Você no Telegram:
/ask create complete ecommerce platform with Stripe

Aurora Bot:
🤔 Claude is thinking...
✅ Claude says:
[Resposta completa com MVP, arquitetura, código, etc]
```

### Executar Persona do Aurora

```
Você:
/produto mvp Create todo app with authentication

Aurora:
📋 MVP Definition
├─ Scope (In):
│  ├─ User registration
│  ├─ Task CRUD
│  └─ Task sharing
├─ Scope (Out):
│  ├─ Advanced analytics
│  └─ Mobile app
└─ Estimated: 6-8 weeks
```

### Rodar Workflow Completo

```
Você:
/orchestrator full Create SaaS platform for project management

Aurora:
🔄 Running complete workflow...
├─ [Produto] MVP definition (25%)
├─ [Arquitetura] Architecture design (50%)
├─ [Engenharia] Code generation (75%)
├─ [QA] Testing (90%)
├─ [Security] Security audit (100%)
└─ ✅ Complete!

📁 App location: /apps/saas_project_management
📊 Summary: 8000+ lines of production-ready code
```

### Executar Code Direto

```
Você:
/exec npm install express cors dotenv

Aurora:
npm notice...
✅ Pacotes instalados com sucesso

Você:
/py print("Hello Aurora!")

Aurora:
Hello Aurora!
✅ Python executado com sucesso
```

### Monitorar Sistema

```
Você:
/status

Aurora:
📊 System Status
├─ Uptime: 2d 14h 32m
├─ CPU: 12%
├─ Memory: 456MB / 2GB
├─ Active Skills: 3
├─ Messages Today: 142
├─ Errors: 0
└─ Health: 🟢 HEALTHY
```

---

## 📱 TODOS OS COMANDOS PRINCIPAIS

### IA Chat
- `/ask [pergunta]` - Claude responde
- `/gpt [pergunta]` - GPT responde

### Personas Aurora
- `/produto [subskill] [details]` - Persona Produto
- `/arquitetura [subskill] [details]` - Persona Arquitetura
- `/engenharia [subskill] [details]` - Persona Engenharia
- `/qa [subskill] [details]` - Persona QA
- `/ops [subskill] [details]` - Persona Ops
- `/security [subskill] [details]` - Persona Security
- `/dados [subskill] [details]` - Persona Dados
- `/design [subskill] [details]` - Persona Design
- `/performance [subskill] [details]` - Persona Performance

### Workflows Completos
- `/orchestrator full [intent]` - Completo (Produto→Ops)
- `/orchestrator mvp [intent]` - Apenas MVP
- `/orchestrator code [intent]` - Apenas código
- `/orchestrator test [intent]` - Apenas testes
- `/orchestrator incident [tipo]` - Incident response

### Code Execution
- `/exec [comando]` - Bash
- `/ps [comando]` - PowerShell
- `/py [código]` - Python
- `/node [código]` - Node.js

### System
- `/status` - Status geral
- `/metrics` - Métricas detalhadas
- `/health` - Health check
- `/help` - Ver todos os comandos

---

## 🔗 Sincronizar com Cockpit (Optional)

Se quiser usar AMBOS (Telegram + Browser):

```bash
# Terminal 1: Bot
npm run bot

# Terminal 2: Cockpit (opcional)
# Abra no navegador:
file:///mnt/c/Users/lucas/openclaw_aurora/OPENCLAW-COCKPIT.html
```

**Benefício:**
- Usar Telegram no celular
- Usar Cockpit no desktop
- Ambos sincronizados em tempo real
- Ver histórico nos dois lugares

---

## 📊 Casos de Uso

### Usar no Trabalho (Mobile)

```
Você:
/ask create REST API for products

Telegram (no celular):
[Resposta aparece]
[Lê no intervalo]
[Continua depois]
```

### Usar em Casa (Desktop)

```
Você:
/orchestrator full ecommerce

Telegram (no desktop):
[Vê progresso em tempo real]
[Usa ao mesmo tempo que Cockpit]
[Histórico sincronizado]
```

### Colaborar

```
Pessoa A (Telegram):
/ask create auth system

Pessoa B (também via Telegram):
[Vê a mesma conversa]
[Continua a discussão]
```

---

## 🎯 Fluxo Completo Típico

### Cenário: Criar App Completo

**Passo 1: Define Requisitos (Telegram)**
```
/ask I need a SaaS platform for managing tasks

Aurora: [explica o que fazer]
```

**Passo 2: Gera MVP (Telegram)**
```
/produto mvp SaaS platform for task management

Aurora: [retorna MVP specification]
```

**Passo 3: Design Arquitetura (Telegram)**
```
/arquitetura design SaaS with 50k users expected

Aurora: [retorna architecture diagrams]
```

**Passo 4: Gera Código (Telegram)**
```
/engenharia scaffold Node.js Express TypeScript app

Aurora: [cria estrutura de app]
```

**Passo 5: Setup Database (Telegram)**
```
/engenharia database PostgreSQL with migrations

Aurora: [cria migrations]
```

**Passo 6: Testa (Telegram)**
```
/qa smoke Test API endpoints

Aurora: [roda smoke tests]
```

**Passo 7: Deploy (Telegram)**
```
/ops deploy Deploy to production AWS

Aurora: [faz deployment]
```

**✅ App em produção! Tudo pelo Telegram!**

---

## 💾 Histórico & Persistência

Todas as mensagens são salvas:

```
/history                # Ver histórico
/history 20             # Últimas 20 mensagens
/history search "todo"  # Buscar por palavra
```

---

## ⚙️ Configuração Avançada

### Variáveis de Ambiente

```bash
# Obrigatório
TELEGRAM_BOT_TOKEN=seu_token

# Recomendado
TELEGRAM_CHAT_ID=seu_chat_id

# Opcional
TELEGRAM_ADMIN_IDS=id1,id2,id3    # Múltiplos admins
LOG_LEVEL=info                     # debug/info/warn/error
SKILL_TIMEOUT=30000               # Timeout em ms
MAX_RETRIES=3                      # Tentar N vezes
RATE_LIMIT=10/min                 # Max mensagens/min
```

### Criar Arquivo .env

```bash
# .env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyzABC
TELEGRAM_CHAT_ID=987654321
LOG_LEVEL=info
SKILL_TIMEOUT=60000
```

---

## 🐛 Troubleshooting

### Problema: Bot não responde

**Solução:**
```bash
# Verificar token
echo $TELEGRAM_BOT_TOKEN

# Verificar se está rodando
npm run bot

# Verif logs
# Deve aparecer: [Bot] Telegram bot iniciado
```

### Problema: "Unauthorized" ou "Forbidden"

**Solução:**
```bash
# Token incorreto? Peça novo com @BotFather
# /newbot → crie novo

# CHAT_ID incorreto? Pegue de novo:
https://api.telegram.org/bot{TOKEN}/getUpdates
# Procure por "id"
```

### Problema: Rate limit

**Solução:**
```bash
# Aguarde 1 minuto ou aumente em .env:
RATE_LIMIT=20/min
```

### Problema: Comando não reconhecido

**Solução:**
```bash
# Listar comandos:
/help

# Ou:
/start
```

---

## 🔐 Segurança

### Autenticação

Apenas você pode usar:
```bash
TELEGRAM_CHAT_ID=seu_chat_id_privado
```

### Rate Limiting

Proteção automática:
- Max 10 mensagens/min por padrão
- Aumentar se necessário em `.env`

### Sandbox Execution

Código executa isolado:
- Timeout de 30 segundos
- Sem acesso a arquivos sensíveis
- Sem permissão root

---

## 📈 Monitoramento

Ver estatísticas:

```
/metrics

📈 Últimas Métricas:
├─ telegram.messages: 142 today
├─ telegram.latency: 145ms avg
├─ skill.executions: 23
├─ skill.success_rate: 98.2%
├─ api.calls: 567
└─ database.queries: 1,234
```

---

## 🚀 AGORA VOCÊ ESTÁ PRONTO!

### 3 Passos Para Começar:

```bash
# 1. Configurar
echo "TELEGRAM_BOT_TOKEN=seu_token" >> .env
echo "TELEGRAM_CHAT_ID=seu_chat_id" >> .env

# 2. Iniciar
npm run bot

# 3. Ir Pro Telegram e Usar
/start
/ask create a todo app
```

---

## 💡 Próximos Passos (Futuro)

### WhatsApp (Mesma coisa)
```bash
# Integrar WhatsApp com mesmo backend
# Same commands como Telegram
```

### Discord
```bash
# Discord server para grupo
# Colaboração em equipe
```

### Slack
```bash
# Integração com workspace
# Notificações automáticas
```

---

## 🎉 Resumo

| Feature | Status |
|---------|--------|
| **Telegram Bot** | ✅ Ready |
| **38+ Skills** | ✅ Ready |
| **IA Chat (Claude/GPT)** | ✅ Ready |
| **Code Execution** | ✅ Ready |
| **All 9 Personas** | ✅ Ready |
| **System Monitoring** | ✅ Ready |
| **Histórico Sincronizado** | ✅ Ready |
| **Cockpit Sincronizado** | ✅ Ready |
| **WhatsApp** | 🔜 Soon |

---

## 📞 Suporte

### Documentação Completa

1. **TELEGRAM_COMMANDS_COMPLETE.md** - Todos os comandos
2. **TELEGRAM_AURORA_INTEGRATION.md** - Integração detalhada
3. **UNIFIED_INTERFACE_GUIDE.md** - Sincronização Cockpit
4. **HUBS_COMPLETE_INVENTORY.md** - Todos os hubs e skills

---

## ✅ Checklist de Setup

- [ ] Criar bot com @BotFather
- [ ] Copiar token
- [ ] Pegar CHAT_ID
- [ ] Adicionar ao .env
- [ ] Rodar `npm run bot`
- [ ] Enviar `/start` no Telegram
- [ ] Testar `/ask create a todo app`
- [ ] Testar `/status`
- [ ] Pronto para usar!

---

**🎉 Você está 100% pronto para usar Aurora pelo Telegram!**

```
Qualquer hora, qualquer lugar:
/ask [sua pergunta]
/orchestrator full [seu projeto]
/status

Tudo via Telegram! 🚀
```

---

**Tá pronto?** Começar agora? 🤖

```bash
npm run bot
```

Depois é só abrir Telegram e usar!
