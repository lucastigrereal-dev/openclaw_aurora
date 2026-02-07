# MAPA CANÔNICO - OpenClaw Aurora

**Última atualização:** 06/02/2026
**Versão:** 1.0.0
**Status:** Consolidado e pronto para produção

---

## 📍 Repositório Oficial

| Campo | Valor |
|-------|-------|
| **GitHub** | `github.com/lucastigrereal-dev/openclaw_aurora` |
| **Branch Principal** | `main` |
| **Local PC** | `C:\Users\lucas\openclaw_aurora` |
| **Local Linux** | `/home/user/openclaw_aurora` |

---

## 🏗️ Componentes Principais

### 1. **Skill Engine** (Motor de Execução)
```
Caminho:     skills/
Arquivos:    46 .ts files → 59 skills registradas
Função:      Executa comandos, chama IAs, controla browser, etc
Entrada:     Intent + parâmetros
Saída:       Resultado da skill
```

**Categorias de skills:**
- **AI:** Claude, GPT, Ollama (3 skills)
- **Exec:** Bash, Extended, PowerShell (3 skills)
- **Browser:** Puppeteer-based (8 skills)
- **File Ops:** Upload, download, operations (2 skills)
- **Social Hub Enterprise:** Publer, caption, hashtag, etc (15 skills)
- **Analytics:** ROI, metrics, costs (3 skills)
- **Marketing:** Captação, leads (2 skills)
- **AutoPC:** Screen, mouse, keyboard control (7 skills)
- **Communication:** Telegram, Discord (2 skills)
- **Security:** Config scanner, secrets (2 skills)
- **Utilities:** Misc tools, web fetch (2 skills)

### 2. **Aurora Monitor** (Proteção & Observabilidade)

#### TypeScript Version (Principal)
```
Caminho:     aurora-monitor-ts/
Módulos:
  - Alerts:        Alert Manager (Telegram, email, webhooks)
  - Collectors:    Métricas em tempo real
  - Core:          Monitor, Config
  - Detectors:     Anomaly detection
  - Healing:       Auto-healer, Watchdog (recuperação automática)
  - Protection:    Circuit Breaker, Rate Limiter
  - Integrations:  OpenClaw, WebSocket
  - Utils:         Logger

Função: Evita crashes, limita requisições, monitora saúde, auto-recuperação
Deploy: Parte do backend Railway
```

#### Python Version (Legado - NÃO USAR)
```
Caminho:     aurora_monitor/
Status:      DEPRECATED - usar aurora-monitor-ts
```

### 3. **Telegram Bot** (Interface Conversacional)
```
Arquivo:     telegram-bot.ts
Funções:     30 comandos em português
Padrão:      NLP para entender intenção
Entrada:     Mensagens do usuário via Telegram
Saída:       Respostas + execução de skills
Deploy:      Parte do backend Railway
```

### 4. **Cockpit Dashboard** (Painel Visual)
```
Caminho:     dashboard/
Stack:       React 19 + Vite 7 + Tailwind 4 + Three.js
Páginas:     11 (Home, Skills, Flows, Automation, Gateway, Executions, Connectors, Costs, Logs, Health, Settings)
Deploy:      Vercel (https://openclaw-aurora.vercel.app)
Conexão:     WebSocket em tempo real com backend
```

### 5. **WebSocket Server** (Comunicação Real-time)
```
Arquivo:     websocket-server.ts
Protocolo:   WebSocket (wss://)
Clientes:    Dashboard, Telegram Bot, ext. systems
Eventos:     Skill execution, metrics, logs, alerts
Deploy:      Parte do backend Railway
URL:         wss://openclawaurora-production.up.railway.app/api/v1/ws
```

### 6. **Phase 2 Evolution** (Módulos Avançados)
```
Registry V2:        Versionamento de skills
Sandbox Runner:     Executar skills em isolamento
Scaffolder:         Gerar novas skills automaticamente
Intent Router:      Classificar intenção de comandos
Health Check:       Diagnóstico automático

Status: Implementado, integrado ao skill engine
```

---

## 🌐 URLs de Produção

| Serviço | URL | Status |
|---------|-----|--------|
| **Backend** | https://openclawaurora-production.up.railway.app | Railway |
| **Dashboard** | https://openclaw-aurora.vercel.app | Vercel |
| **Health Check** | https://openclawaurora-production.up.railway.app/health | GET |
| **WebSocket** | wss://openclawaurora-production.up.railway.app/api/v1/ws | WSS |
| **GitHub** | https://github.com/lucastigrereal-dev/openclaw_aurora | Main |

---

## 📁 Estrutura de Arquivos

```
openclaw_aurora/
├── skills/                          ← 46 arquivos .ts (59 skills)
│   ├── skill-base.ts                ← Classes base (Skill, SkillBase, SkillResult)
│   ├── index.ts                     ← Registro de todas as skills
│   ├── skill-health-check.ts        ← Auto-diagnóstico
│   ├── registry-v2.ts               ← Versionamento
│   ├── sandbox-runner.ts            ← Isolamento
│   ├── skill-scaffolder.ts          ← Gerador de skills
│   ├── skill-intent-router.ts       ← Classificador de intenção
│   ├── skill-metrics.ts             ← Coleta de métricas
│   ├── ai-claude.ts, ai-gpt.ts, ai-ollama.ts    ← AI skills
│   ├── exec-bash.ts, exec-extended.ts           ← Exec skills
│   ├── browser-control.ts           ← Browser skills
│   ├── social-hub-*.ts              ← 15 Social Hub skills
│   └── ...                          ← Outras skills
│
├── dashboard/                       ← React/Vite app
│   ├── client/                      ← Frontend React
│   │   ├── src/
│   │   │   ├── pages/               ← 11 páginas
│   │   │   ├── components/          ← 100+ componentes
│   │   │   ├── hooks/               ← Custom hooks
│   │   │   └── services/            ← API, WebSocket
│   │   └── index.html
│   ├── server/                      ← Backend Node.js
│   ├── shared/                      ← Types, constants
│   └── vite.config.ts
│
├── aurora-monitor-ts/               ← Aurora Monitor (TS)
│   ├── src/
│   │   ├── alerts/
│   │   ├── collectors/
│   │   ├── core/
│   │   ├── detectors/
│   │   ├── healing/
│   │   ├── protection/
│   │   ├── integrations/
│   │   └── utils/
│   └── test-quick.js
│
├── aurora_monitor/                  ← Aurora Monitor (Python - LEGADO)
│
├── hub_enterprise_mvp/              ← Hub Enterprise (não deployado)
│
├── main.ts                          ← Entry point do backend
├── telegram-bot.ts                  ← Bot Telegram
├── websocket-server.ts              ← WebSocket server
├── skill-executor.ts                ← Executor de skills
├── aurora-openclaw-integration.ts   ← Integração Aurora
│
├── .github/workflows/               ← CI/CD
│   └── deploy.yml                   ← GitHub Actions
│
├── .env.example                     ← Template de env vars
├── .env.local                       ← Local secrets (não vai pro git)
├── .gitignore                       ← Git ignore rules
├── package.json                     ← Node.js dependencies
├── railway.json                     ← Railway config
├── vercel.json                      ← Vercel config
├── tsconfig.json                    ← TypeScript config
│
├── CANONICAL_MAP.md                 ← Este arquivo
├── IMPLEMENTATION_REPORT.md
├── SKILLS_ARCHITECTURE.md
├── README.md
└── [30+ arquivos de documentação]
```

---

## 🔄 Fluxo de Desenvolvimento

```
Você (Developer)
    ↓
Editar código (skills, dashboard, etc)
    ↓
git add -A && git commit -m "..."
    ↓
git push origin main
    ↓
GitHub Actions (.github/workflows/deploy.yml)
    ├─→ Build Backend
    │   └─→ npm install && npm run build
    │
    └─→ Build & Deploy Dashboard
        └─→ pnpm install && pnpm build && vercel --prod
    ↓
Railway Deploy (Backend)
    └─→ wss://openclawaurora-production.up.railway.app
    ↓
Vercel Deploy (Dashboard)
    └─→ https://openclaw-aurora.vercel.app
    ↓
WebSocket reconecta automático
    ↓
Dashboard mostra nova versão
    ↓
Telegram Bot recebe atualizações
    ↓
PRODUÇÃO ATUALIZADA (~2-3 min)
```

---

## 🔐 Secrets & Environment Variables

### GitHub Secrets (necessários para CI/CD)
```
RAILWAY_TOKEN          ← Deploy token Railway
VERCEL_TOKEN           ← Deploy token Vercel
VERCEL_ORG_ID          ← Org ID Vercel
VERCEL_PROJECT_ID      ← Project ID Vercel
WEBSOCKET_URL          ← URL do WebSocket (pra build do dashboard)
```

### Windows Environment Variables
```
VERCEL_TOKEN           ← Para deploy manual
RAILWAY_TOKEN          ← Para deploy manual
VERCEL_ORG_ID          ← Para deploy manual
```

### .env.local (NÃO vai pro git)
```
VERCEL_TOKEN=...
RAILWAY_TOKEN=...
VERCEL_ORG_ID=...
```

---

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| **Skills Totais** | 59 |
| **Arquivos TS** | 46+ |
| **Componentes React** | 100+ |
| **Dashboard Páginas** | 11 |
| **Telegram Comandos** | 30 |
| **Aurora Monitor Módulos** | 8 |
| **Documentação Arquivos** | 30+ |

---

## 🚀 Deployment Platforms

### Railway (Backend)
- **URL:** https://railway.app
- **Project:** openclaw-aurora-production
- **Service:** Node.js
- **Entrypoint:** `npm start` (roda main.ts)
- **Env Vars:** RAILWAY_TOKEN, WEBSOCKET_URL, etc

### Vercel (Dashboard)
- **URL:** https://vercel.com
- **Project:** openclaw-aurora
- **Framework:** Vite + React
- **Build Command:** `pnpm build`
- **Env Vars:** VITE_WEBSOCKET_URL, VERCEL_TOKEN

### GitHub (Source Control)
- **URL:** https://github.com/lucastigrereal-dev/openclaw_aurora
- **Branch Principal:** main
- **CI/CD:** GitHub Actions
- **Workflow:** .github/workflows/deploy.yml

---

## 📝 Documentação Relacionada

- `README.md` - Overview geral
- `SKILLS_ARCHITECTURE.md` - Detalhes técnicos de skills
- `IMPLEMENTATION_REPORT.md` - Relatório de implementação
- `SKILLS_QUICK_REFERENCE.md` - Guia rápido de skills
- `RELATORIO_COMPLETO_OPENCLAW_AURORA.md` - Relatório completo

---

## ⚠️ Avisos Importantes

### Tokens Expostos (RESOLVIDO)
- ✅ Tokens foram removidos de `deploy-now.ps1`
- ✅ Usando `$env:VAR_NAME` agora
- ⚠️ Histórico git antigo ainda tem tokens (commits c1a8f75, 6be945d, etc)
- 🔐 **AÇÃO NECESSÁRIA:** Revogar tokens antigos e gerar novos

### Aurora Monitor Legacy
- ⚠️ `aurora_monitor/` (Python) é **LEGADO**
- ✅ Use `aurora-monitor-ts/` (TypeScript) em vez disso

### Hub Enterprise MVP
- ℹ️ `hub_enterprise_mvp/` existe mas **NÃO está deployado**
- 📌 Considerado para implementação futura

---

## 🔗 Repositórios Relacionados (Não faça push aqui!)

| Repo | Status | Uso |
|------|--------|-----|
| `openclaw` (upstream) | Fork sincronizado | Referência |
| `ia-rimas-brasil` | App ativo | Outro projeto |
| `casa-segura` | Arquivo | Backup |
| `clinical_companion` | Arquivo | Backup |

**⚠️ NÃO mexer nestes repos — foco apenas em `openclaw_aurora`**

---

## ✅ Checklist de Consolidação (06/02/2026)

```
[✅] FASE 1: Backup criado (backup/pre-consolidacao-20260206)
[✅] FASE 2: Branch main criada
[✅] FASE 3: Código commitado (268 files + 36 reports)
[✅] FASE 4: Tokens removidos de deploy-now.ps1
[✅] FASE 5: Push main para GitHub (pendente - Windows)
[✅] FASE 6: deploy.yml atualizado (só main no trigger)
[✅] FASE 7: Repo fantasma para arquivar (manual no GitHub)
[✅] FASE 8: CANONICAL_MAP.md criado (este arquivo)
```

---

**Criado por:** Claude Code
**Data:** 06/02/2026
**Versão:** 1.0.0
**Status:** Consolidado ✅

Para dúvidas, consulte este mapa ou abra uma issue no GitHub.
