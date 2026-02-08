# 🎯 SCRIPT COMPLETO PARA CLAUDE OPUS DESKTOP

**Cole este texto inteiro no Claude Opus Desktop (que tem acesso ao PC do Lucas)**

---

## 📍 CONTEXTO COMPLETO

### Quem é o Lucas
- Usuário: Lucas (lucastigrereal-dev no GitHub)
- PC: Windows com WSL
- Caminho do projeto: `C:\Users\lucas\openclaw_aurora` (Windows) ou `/mnt/c/Users/lucas/openclaw_aurora` (WSL)

### O Que é o OpenClaw Aurora
- Sistema de automação com 59 skills
- Bot Telegram para executar comandos
- Dashboard visual (Cockpit)
- Monitor de segurança (Aurora)

### Repositórios e URLs
```
GitHub:     https://github.com/lucastigrereal-dev/openclaw_aurora
Dashboard:  https://openclaw-aurora.vercel.app (Vercel)
Backend:    https://openclawaurora-production.up.railway.app (Railway - OFFLINE)
Bot:        @Krhon_bot (Telegram) - NÃO @Prometheus!
```

### O Problema Atual
1. O GPT reorganizou mas **DELETOU** skills (de 59 para 11)
2. **2 versões desincronizadas**:
   - Windows local: commit 444be53 (GPT, 11 skills) ❌ ERRADO
   - GitHub remoto: commit 8aeac77 (59 skills) ✅ CORRETO
3. Bot errado configurado (Prometheus ao invés de Krhon)
4. Railway está OFFLINE

### Arquitetura Desejada (Conversa com Opus anterior)
```
- Aurora = MONITOR (observa, não executa)
- Operator Core = EXECUTOR (executa skills)
- Core Skills = Fundação (AI, exec, file, web, browser, comm, util)
- Hubs = Domínios específicos (social-media, enterprise, marketing)
- Apps = Interfaces (Cockpit Dashboard)
```

---

## 🗂️ CAMINHOS IMPORTANTES

```bash
# Projeto principal
WINDOWS: C:\Users\lucas\openclaw_aurora
WSL:     /mnt/c/Users/lucas/openclaw_aurora

# Arquivos críticos
.env                          # Tokens e configs (CRIAR SE NÃO EXISTIR)
package.json                  # Scripts npm
tsconfig.json                 # Config TypeScript
telegram-bot.ts               # Bot principal
skill-executor-v2.ts          # Executor de skills
aurora-monitor-ts/            # Monitor Aurora
dashboard/                    # Dashboard React (Cockpit)
skills/                       # Todas as 59 skills

# Deploy
Vercel:   dashboard/          # Deploy automático
Railway:  raiz do projeto     # Backend + Bot
```

---

## 🔧 PASSO 1: DIAGNÓSTICO INICIAL

```bash
# Entrar no projeto (WSL)
cd /mnt/c/Users/lucas/openclaw_aurora

# OU no PowerShell
cd C:\Users\lucas\openclaw_aurora

# Ver commit atual
git log --oneline -1
# Se mostrar 444be53 = versão GPT (errada)
# Se mostrar 8aeac77 = versão correta

# Contar skills
ls skills/*.ts | wc -l
# Deve ter 59, não 11!

# Ver remote
git remote -v
# Deve mostrar: github.com/lucastigrereal-dev/openclaw_aurora

# Ver status
git status
```

---

## 💾 PASSO 2: BACKUP ANTES DE TUDO

```bash
# Criar branch de backup do trabalho do GPT
git checkout -b backup-gpt-refactor-$(date +%Y%m%d)
git add -A
git commit -m "backup: GPT refactor before reverting"

# Voltar para main
git checkout main
```

---

## ⏪ PASSO 3: REVERTER PARA 59 SKILLS

```bash
# Buscar versão correta do GitHub
git fetch origin main

# Resetar para versão do GitHub (59 skills)
git reset --hard origin/main

# Confirmar
git log --oneline -1
# Deve mostrar: 8aeac77 fix: Centralizar 'A' no logo Aurora do Cockpit

# Contar skills novamente
ls skills/*.ts | wc -l
# Agora deve mostrar ~46 arquivos (59 skills registradas)
```

---

## 📁 PASSO 4: REORGANIZAR ESTRUTURA

### Criar Pastas

```bash
# Estrutura core
mkdir -p core/operator-runtime
mkdir -p core/core-skills/ai
mkdir -p core/core-skills/exec
mkdir -p core/core-skills/file
mkdir -p core/core-skills/web
mkdir -p core/core-skills/browser
mkdir -p core/core-skills/comm
mkdir -p core/core-skills/util

# Estrutura hubs
mkdir -p hubs/social-media
mkdir -p hubs/enterprise
mkdir -p hubs/marketing
mkdir -p hubs/content
mkdir -p hubs/analytics

# Apps
mkdir -p apps
```

### Mover Arquivos

```bash
# === CORE SKILLS ===
# AI
mv skills/ai-claude.ts core/core-skills/ai/
mv skills/ai-gpt.ts core/core-skills/ai/
mv skills/ai-ollama.ts core/core-skills/ai/
mv skills/ai-router.ts core/core-skills/ai/

# Exec
mv skills/exec-bash.ts core/core-skills/exec/
mv skills/exec-extended.ts core/core-skills/exec/

# File
mv skills/file-ops.ts core/core-skills/file/
mv skills/file-ops-advanced.ts core/core-skills/file/

# Web
mv skills/web-fetch.ts core/core-skills/web/

# Browser
mv skills/browser-control.ts core/core-skills/browser/

# Comm
mv skills/comm-telegram.ts core/core-skills/comm/

# Util
mv skills/util-misc.ts core/core-skills/util/

# === HUBS ===
# Social Media (16 arquivos)
mv skills/social-hub-*.ts hubs/social-media/
mv skills/social-media.ts hubs/social-media/

# Enterprise
cp -r hub_enterprise_mvp/* hubs/enterprise/

# Marketing
mv skills/marketing-captacao.ts hubs/marketing/

# Content
mv skills/content-ia.ts hubs/content/

# Analytics
mv skills/analytics-roi.ts hubs/analytics/
mv skills/reviews-reputation.ts hubs/analytics/

# === OPERATOR RUNTIME ===
cp skill-executor-v2.ts core/operator-runtime/
cp telegram-bot.ts core/operator-runtime/
mv skills/intent-router.ts core/operator-runtime/

# === APPS ===
mv dashboard apps/cockpit-dashboard

# === AURORA (já está organizado) ===
# Manter aurora-monitor-ts/ onde está ou renomear:
# mv aurora-monitor-ts aurora
```

---

## ⚙️ PASSO 5: CONFIGURAR .ENV

```bash
# Criar arquivo .env na raiz do projeto
cat > .env << 'EOF'
# ========================================
# OPENCLAW AURORA - CONFIGURAÇÕES
# ========================================

# Telegram Bot - KRHON (NÃO PROMETHEUS!)
TELEGRAM_BOT_TOKEN=COLE_O_TOKEN_DO_KRHON_AQUI
TELEGRAM_CHAT_ID=SEU_CHAT_ID_AQUI

# Ambiente
NODE_ENV=development
PORT=3000

# Railway (para deploy)
RAILWAY_ENVIRONMENT=production

# Vercel (dashboard usa essas)
VITE_API_URL=https://openclawaurora-production.up.railway.app
VITE_WS_URL=wss://openclawaurora-production.up.railway.app

# OpenAI/Claude (se usar)
OPENAI_API_KEY=sua_key_aqui
ANTHROPIC_API_KEY=sua_key_aqui
EOF

echo "⚠️  IMPORTANTE: Edite o .env e cole os tokens corretos!"
```

**O Lucas precisa fornecer:**
- Token do bot @Krhon_bot (pegar com @BotFather no Telegram)
- Chat ID dele
- API keys se quiser usar AI skills

---

## 📦 PASSO 6: INSTALAR DEPENDÊNCIAS

```bash
# Instalar tudo
npm install

# Se der erro, tentar com força
rm -rf node_modules package-lock.json
npm install
```

---

## 🧪 PASSO 7: TESTAR LOCAL

### Testar Skills
```bash
npm run smoke:skills
# Deve mostrar: ✅ 59 skills registradas
```

### Testar CLI
```bash
npm run cli
# Comandos: /skills, /stats, /help, /exit
```

### Testar Bot Telegram
```bash
npm run bot
# Deve conectar como @Krhon_bot
# Se der erro de token, verificar .env
```

### Testar Boot Completo
```bash
npm run opencloud
# Ou se não existir:
npm run dev
```

### Resultado Esperado
```
╔═══════════════════════════════════════════════════════════════╗
║         OPENCLOUD AURORA - SISTEMA COMPLETO                   ║
╚═══════════════════════════════════════════════════════════════╝

✅ [Skills Registry] 59 skills registradas
✅ [Aurora Monitor] Circuit Breaker, Rate Limiter, Watchdog ativos
✅ [WebSocket] ws://localhost:18789
✅ [Telegram Bot] Bot ativo (@Krhon_bot)
```

---

## 🚂 PASSO 8: DEPLOY NO RAILWAY

### Verificar Railway CLI
```bash
# Instalar Railway CLI se não tiver
npm install -g @railway/cli

# Login
railway login

# Verificar projeto
railway status
```

### Configurar Variáveis no Railway
```bash
# Adicionar variáveis de ambiente
railway variables set TELEGRAM_BOT_TOKEN="token_do_krhon"
railway variables set TELEGRAM_CHAT_ID="seu_chat_id"
railway variables set NODE_ENV="production"
```

### Deploy
```bash
# Fazer deploy
railway up

# Ver logs
railway logs
```

### OU pelo Dashboard Railway
1. Acesse: https://railway.app/dashboard
2. Selecione projeto: openclawaurora
3. Vá em Variables
4. Adicione as variáveis do .env
5. Clique em Deploy

---

## 🌐 PASSO 9: VERIFICAR VERCEL (DASHBOARD)

O Dashboard faz deploy automático quando você faz push.

```bash
# Após commitar, verificar Vercel
# Acesse: https://openclaw-aurora.vercel.app

# Se precisar redeplorar manualmente:
cd apps/cockpit-dashboard
npx vercel --prod
```

---

## 📤 PASSO 10: COMMIT E PUSH

```bash
# Adicionar tudo
git add -A

# Commit
git commit -m "refactor: reorganize to core/hubs/aurora/apps structure

- Preserved all 59 skills
- Core skills moved to core/core-skills/
- Hub skills moved to hubs/
- Dashboard moved to apps/cockpit-dashboard/
- Aurora monitor preserved
- Bot configured for @Krhon_bot

Structure:
- core/operator-runtime/ (executor)
- core/core-skills/ (ai, exec, file, web, browser, comm, util)
- hubs/ (social-media, enterprise, marketing, content, analytics)
- aurora-monitor-ts/ (monitor)
- apps/cockpit-dashboard/ (UI)"

# Push para GitHub
git push origin main
```

---

## ✅ CHECKLIST FINAL

```
PREPARAÇÃO
[ ] Backup do GPT criado (branch backup-gpt-refactor-*)
[ ] Revertido para 59 skills (git reset --hard origin/main)

REORGANIZAÇÃO
[ ] Pastas core/ criadas
[ ] Pastas hubs/ criadas
[ ] Pastas apps/ criadas
[ ] Core skills movidos
[ ] Hub skills movidos
[ ] Dashboard movido
[ ] Imports atualizados (se necessário)

CONFIGURAÇÃO
[ ] .env criado com tokens corretos
[ ] Token do @Krhon_bot configurado
[ ] Dependências instaladas (npm install)

TESTES LOCAL
[ ] npm run smoke:skills → 59 skills ✅
[ ] npm run cli → funciona ✅
[ ] npm run bot → @Krhon_bot conectado ✅

DEPLOY
[ ] git push origin main ✅
[ ] Railway deploy ✅ (backend online)
[ ] Vercel auto-deploy ✅ (dashboard online)

VERIFICAÇÃO FINAL
[ ] https://openclaw-aurora.vercel.app → Dashboard OK
[ ] Bot @Krhon_bot respondendo no Telegram
[ ] Railway logs sem erros
```

---

## 🆘 SE DER ERRO

### Reverter para GitHub
```bash
git reset --hard origin/main
```

### Reverter para backup GPT
```bash
git checkout backup-gpt-refactor-YYYYMMDD
```

### Railway não sobe
```bash
# Ver logs
railway logs

# Verificar variáveis
railway variables

# Redeplorar
railway up --detach
```

### Bot não conecta
```bash
# Verificar token
cat .env | grep TELEGRAM

# Testar token manualmente
curl "https://api.telegram.org/bot<TOKEN>/getMe"
```

---

## 📊 ESTRUTURA FINAL ESPERADA

```
openclaw_aurora/
├── core/
│   ├── operator-runtime/
│   │   ├── intent-router.ts
│   │   ├── skill-executor-v2.ts
│   │   └── telegram-bot.ts
│   └── core-skills/
│       ├── ai/          (4 arquivos)
│       ├── exec/        (2 arquivos)
│       ├── file/        (2 arquivos)
│       ├── web/         (1 arquivo)
│       ├── browser/     (1 arquivo)
│       ├── comm/        (1 arquivo)
│       └── util/        (1 arquivo)
│
├── hubs/
│   ├── social-media/    (17 arquivos)
│   ├── enterprise/      (do hub_enterprise_mvp)
│   ├── marketing/       (1 arquivo)
│   ├── content/         (1 arquivo)
│   └── analytics/       (2 arquivos)
│
├── aurora-monitor-ts/   (Monitor Aurora - já organizado)
│   └── src/
│       ├── protection/
│       ├── healing/
│       └── detectors/
│
├── apps/
│   └── cockpit-dashboard/  (Dashboard React)
│
├── skills/              (arquivos restantes não categorizados)
│   ├── index.ts
│   ├── skill-base.ts
│   └── skill-health-check.ts
│
├── .env                 (⚠️ NÃO COMMITAR - tem tokens!)
├── package.json
├── tsconfig.json
└── start-opencloud.ts
```

---

## 🎯 RESUMO EXECUTIVO

```
1. REVERTER:     git reset --hard origin/main (volta 59 skills)
2. REORGANIZAR:  Mover arquivos para core/hubs/aurora/apps
3. CONFIGURAR:   .env com token @Krhon_bot
4. TESTAR:       npm run bot (local)
5. DEPLOY:       git push + railway up
6. VERIFICAR:    Dashboard + Bot funcionando
```

---

**Opus, o Lucas precisa que você execute esses passos no PC dele. Ele tem acesso total via Windows/WSL. Boa sorte! 🚀**
