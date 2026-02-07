# PROMPT COMPLETO PARA CLAUDE CODE - WINDOWS

Cole este prompt no Claude Code do seu Windows para deploy completo:

---

## PROMPT (COPIE TUDO ABAIXO)

```
Faça o deploy completo do OpenClaw Aurora com Dashboard no meu Windows.

## PASSO 1 - Clonar repositório principal
cd C:\Users\lucas
git clone https://github.com/lucastigrereal-dev/openclaw_aurora.git
cd openclaw_aurora
git checkout claude/monitoring-crash-prevention-Qx84d

## PASSO 2 - Instalar dependências do backend
npm install

## PASSO 3 - Verificar arquivo .env
O .env deve ter:
- TELEGRAM_BOT_TOKEN
- ANTHROPIC_API_KEY (opcional)
- OPENAI_API_KEY (opcional)
- OLLAMA_URL=http://172.28.240.1:11434
- OLLAMA_ENABLED=true

Se não existir, crie baseado no .env.example

## PASSO 4 - Instalar dependências do dashboard
cd dashboard-prometheus
npm install -g pnpm
pnpm install
cd ..

## PASSO 5 - Criar scripts de inicialização

Crie START-BACKEND.bat:
@echo off
cd /d "C:\Users\lucas\openclaw_aurora"
echo Iniciando Backend OpenClaw Aurora...
npx ts-node start-all.ts
pause

Crie START-DASHBOARD.bat:
@echo off
cd /d "C:\Users\lucas\openclaw_aurora\dashboard-prometheus"
echo Iniciando Dashboard...
pnpm dev
pause

Crie START-TUDO.bat:
@echo off
cd /d "C:\Users\lucas\openclaw_aurora"
echo ========================================
echo    OPENCLAW AURORA - SISTEMA COMPLETO
echo ========================================
start "Backend" cmd /c "npx ts-node start-all.ts"
timeout /t 5
start "Dashboard" cmd /c "cd dashboard-prometheus && pnpm dev"
echo.
echo Backend: ws://localhost:18789
echo Dashboard: http://localhost:5173
echo.
pause

## PASSO 6 - Iniciar o sistema

Opção A - Só backend (WebSocket + Skills + Telegram):
npx ts-node start-all.ts

Opção B - Backend + Dashboard:
Execute START-TUDO.bat

## RESULTADO ESPERADO

Backend rodando em:
- WebSocket: ws://localhost:18789
- Bot Telegram: conectado
- 17 Skills: ativas
- Aurora Monitor: Circuit Breaker + Rate Limiter

Dashboard rodando em:
- URL: http://localhost:5173
- Chat com KRONOS disponível no canto inferior direito

## COMO USAR O CHAT

1. Abra http://localhost:5173 no navegador
2. Clique no avatar pulsante no canto inferior direito
3. Selecione o modelo (Ollama, Claude, GPT)
4. Digite sua mensagem e envie

Execute todos os passos e me avise quando terminar.
```

---

## ESTRUTURA FINAL

```
C:\Users\lucas\openclaw_aurora\
├── .env                    # Configurações
├── package.json            # Backend deps
├── start-all.ts            # Inicia backend
├── start-unified.ts        # Inicia backend + dashboard
├── websocket-server.ts     # WebSocket + Chat
├── telegram-bot.ts         # Bot Telegram
├── skill-executor.ts       # Executor de skills
├── aurora-openclaw-integration.ts  # Monitor
├── skills/                 # 17 skills
│   ├── ai-claude.ts
│   ├── ai-gpt.ts
│   ├── ai-ollama.ts
│   └── ...
├── dashboard-prometheus/   # Dashboard React
│   ├── package.json
│   ├── client/
│   │   └── src/
│   │       ├── components/
│   │       │   └── AuroraAvatar.tsx  # Chat
│   │       ├── services/
│   │       │   └── openclawWebSocket.ts
│   │       └── pages/
│   └── ...
├── START-BACKEND.bat       # Script backend
├── START-DASHBOARD.bat     # Script dashboard
└── START-TUDO.bat          # Script completo
```

---

## PORTAS

| Porta | Serviço |
|-------|---------|
| 18789 | WebSocket (Backend) |
| 5173  | Dashboard (Vite) |

---

## COMANDOS

```powershell
# Só backend
cd C:\Users\lucas\openclaw_aurora
npx ts-node start-all.ts

# Só dashboard
cd C:\Users\lucas\openclaw_aurora\dashboard-prometheus
pnpm dev

# Tudo junto
START-TUDO.bat
```
