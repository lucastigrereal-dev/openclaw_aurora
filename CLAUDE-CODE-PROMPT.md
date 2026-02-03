# PROMPT PARA CLAUDE CODE - WINDOWS

Cole este prompt inteiro no Claude Code no seu PC Windows:

---

## PROMPT INÍCIO (COPIE A PARTIR DAQUI)

```
Preciso que você faça o deploy completo do OpenClaw Aurora no meu Windows. Siga EXATAMENTE estes passos:

## 1. VERIFICAR PRÉ-REQUISITOS

Execute estes comandos para verificar se Node.js e Git estão instalados:

```powershell
node --version
git --version
```

Se algum não estiver instalado, me avise.

## 2. CRIAR PASTA E CLONAR REPOSITÓRIO

```powershell
cd $env:USERPROFILE
git clone https://github.com/lucastigrereal-dev/openclaw_aurora.git
cd openclaw_aurora
git checkout claude/monitoring-crash-prevention-Qx84d
```

## 3. INSTALAR DEPENDÊNCIAS

```powershell
npm install
```

## 4. VERIFICAR/CRIAR ARQUIVO .ENV

O arquivo .env deve conter:

```env
# Telegram Bot (já configurado no .env do repo)
TELEGRAM_BOT_TOKEN=<usa_o_que_ja_tem_no_.env>
TELEGRAM_CHAT_ID=<usa_o_que_ja_tem_no_.env>

# Claude (Anthropic) - já configurado no .env do repo
ANTHROPIC_API_KEY=<usa_o_que_ja_tem_no_.env>

# OpenAI GPT - já configurado no .env do repo
OPENAI_API_KEY=<usa_o_que_ja_tem_no_.env>

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_ENABLED=false

# Aurora Monitor
AURORA_PORT=18790
```

## 5. CRIAR SCRIPTS DE INICIALIZAÇÃO

Crie o arquivo START-AURORA.bat na pasta do projeto com:

```batch
@echo off
cd /d "%USERPROFILE%\openclaw_aurora"
echo ========================================
echo    OPENCLAW AURORA - INICIANDO
echo ========================================
echo.
npx ts-node start-all.ts
pause
```

Crie o arquivo START-WEBSOCKET.bat:

```batch
@echo off
cd /d "%USERPROFILE%\openclaw_aurora"
echo Iniciando apenas WebSocket Server...
npx ts-node main.ts
pause
```

Crie o arquivo TEST-SKILLS.bat:

```batch
@echo off
cd /d "%USERPROFILE%\openclaw_aurora"
echo Testando Skills...
npx ts-node test-skills.ts
pause
```

## 6. INICIAR O SISTEMA

```powershell
cd $env:USERPROFILE\openclaw_aurora
npx ts-node start-all.ts
```

## RESULTADO ESPERADO

Após iniciar, você deve ver:
- WebSocket Server rodando em ws://localhost:18789
- Bot Telegram conectado
- 17 Skills ativas
- Circuit Breaker e Watchdog funcionando

## COMO CONECTAR O DASHBOARD

O Dashboard prometheus-cockpit-jarvis deve ser configurado para conectar em:
ws://localhost:18789

Mensagens que o dashboard pode enviar:

Chat com IA:
{"type": "chat", "id": "1", "message": "Olá KRONOS!", "model": "claude"}

Executar skill:
{"type": "execute_skill", "id": "1", "skill": "ai.claude", "input": {"prompt": "teste"}}

Listar skills:
{"type": "command", "id": "1", "command": "list_skills"}

Status:
{"type": "command", "id": "1", "command": "get_status"}

Execute todos os passos acima em sequência. Me avise quando terminar cada etapa.
```

## PROMPT FIM (COPIE ATÉ AQUI)

---

# ALTERNATIVA: COMANDO ÚNICO

Se preferir rodar tudo de uma vez no PowerShell (sem Claude Code):

```powershell
# Executa deploy completo
cd $env:USERPROFILE; git clone https://github.com/lucastigrereal-dev/openclaw_aurora.git; cd openclaw_aurora; git checkout claude/monitoring-crash-prevention-Qx84d; npm install; npx ts-node start-all.ts
```

---

# ESTRUTURA FINAL

Após o deploy, você terá:

```
C:\Users\SeuUsuario\openclaw_aurora\
├── .env                          # Configurações (já tem as chaves)
├── START-AURORA.bat              # Clique duplo para iniciar
├── START-WEBSOCKET.bat           # Só WebSocket
├── TEST-SKILLS.bat               # Testar skills
├── start-all.ts                  # Script principal
├── websocket-server.ts           # WebSocket + Chat
├── telegram-bot.ts               # Bot Telegram
├── skill-executor.ts             # Executor de skills
├── aurora-openclaw-integration.ts # Monitor de proteção
└── skills/
    ├── ai-claude.ts              # Skill Claude
    ├── ai-gpt.ts                 # Skill GPT
    ├── ai-ollama.ts              # Skill Ollama
    ├── comm-telegram.ts          # Skill Telegram
    ├── exec-bash.ts              # Skill Bash
    ├── file-ops.ts               # Skills de arquivo
    ├── web-fetch.ts              # Skills web
    └── util-misc.ts              # Utilitários
```

---

# PORTAS UTILIZADAS

| Porta | Serviço |
|-------|---------|
| 18789 | WebSocket Server (Dashboard + Chat) |
| 18790 | Aurora Monitor (interno) |

---

# COMANDOS ÚTEIS

```powershell
# Iniciar sistema completo
cd $env:USERPROFILE\openclaw_aurora
npx ts-node start-all.ts

# Só WebSocket (sem Telegram)
npx ts-node main.ts

# Testar skills
npx ts-node test-skills.ts

# Ver skills disponíveis
npm run skills:list
```
