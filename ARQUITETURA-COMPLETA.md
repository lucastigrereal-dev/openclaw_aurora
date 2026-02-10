# 🏗️ OPENCLAW AURORA - ARQUITETURA COMPLETA

## 📋 ÍNDICE
1. [Estrutura de Diretórios](#estrutura)
2. [Fluxo de Inicialização](#fluxo-boot)
3. [Fluxo de Execução de Skills](#fluxo-skills)
4. [Arquitetura de Componentes](#arquitetura)
5. [Fluxo de Comunicação](#fluxo-comunicacao)
6. [Sistema de Skills](#skills)

---

## 📁 1. ESTRUTURA DE DIRETÓRIOS {#estrutura}

```
openclaw_aurora/
│
├─── 🎯 CORE (Arquivos principais)
│    ├── start-all.ts              # Ponto de entrada principal
│    ├── main.ts                   # Sistema OpenClaw Aurora completo
│    ├── telegram-bot.ts           # Bot Telegram com executor
│    ├── skill-executor.ts         # Motor de execução de skills
│    ├── skill-executor-v2.ts      # Versão 2 do executor
│    ├── skills.ts                 # Registry de skills
│    ├── websocket-server.ts       # Servidor WebSocket
│    ├── aurora-openclaw-integration.ts  # Integração Aurora
│    └── package.json              # Dependências e scripts
│
├─── 🧠 SKILLS (38+ Skills disponíveis)
│    ├── ai-claude.ts              # Claude/Anthropic AI
│    ├── ai-gpt.ts                 # OpenAI GPT
│    ├── ai-ollama.ts              # Ollama local
│    ├── analytics-roi.ts          # Análise de ROI
│    ├── autopc-control.ts         # Controle de PC
│    ├── browser-control.ts        # Automação de browser
│    ├── comm-telegram.ts          # Comunicação Telegram
│    ├── content-ia.ts             # Geração de conteúdo
│    ├── exec-bash.ts              # Execução de comandos
│    ├── exec-extended.ts          # Comandos avançados
│    ├── file-ops.ts               # Operações de arquivo
│    ├── file-ops-advanced.ts      # Ops avançadas de arquivo
│    ├── intent-router.ts          # Roteamento de intenções
│    ├── marketing-captacao.ts     # Marketing e captação
│    ├── reviews-reputation.ts     # Gestão de reviews
│    ├── sandbox-runner.ts         # Execução sandboxed
│    ├── security-config.ts        # Configuração de segurança
│    ├── skill-base.ts             # Base para skills
│    ├── skill-intent-router.ts    # Router de intenções
│    ├── skill-metrics.ts          # Métricas de skills
│    ├── skill-registry-v2.ts      # Registry v2
│    ├── skill-sandbox.ts          # Sandbox para skills
│    ├── skill-scaffolder.ts       # Gerador de skills
│    ├── index.ts                  # Exportações e registry
│    └── registry-v2.ts            # Sistema de registro v2
│
├─── 🎨 DASHBOARD (Interface Web)
│    ├── src/
│    │   ├── components/           # Componentes React
│    │   ├── pages/                # Páginas do dashboard
│    │   └── lib/                  # Utilitários
│    ├── package.json
│    ├── vite.config.ts
│    └── vercel.json               # Deploy Vercel
│
├─── 🏢 SRC (Arquitetura Enterprise)
│    ├── adapters/                 # Adaptadores de integração
│    │   ├── aurora.adapter.ts
│    │   ├── hub-social.adapter.ts
│    │   ├── hub-supabase.adapter.ts
│    │   ├── skill.adapter.ts
│    │   └── operator.adapter.ts
│    │
│    ├── api/                      # API REST
│    │   ├── server.ts
│    │   ├── openclaw-api.ts
│    │   └── index.ts
│    │
│    ├── core/                     # Núcleo do sistema
│    │   ├── contracts/            # Interfaces e contratos
│    │   │   ├── aurora.contract.ts
│    │   │   ├── hub.contract.ts
│    │   │   ├── skill.contract.ts
│    │   │   └── operator.contract.ts
│    │   │
│    │   └── operator/             # Sistema de operadores
│    │       └── guardrail.ts
│    │
│    └── apps/                     # Aplicações
│        └── monitor-daemon/       # Daemon de monitoramento
│
├─── 🔧 SCRIPTS (Utilitários)
│    ├── cli-chat.ts               # Chat CLI interativo
│    ├── migrate-structure.ts      # Migração de estrutura
│    ├── smoke-skills-count.ts     # Teste de contagem de skills
│    ├── smoke-test-p0.ts          # Smoke test fase 0
│    └── smoke-test-p1.ts          # Smoke test fase 1
│
├─── 🧪 TESTS (Testes)
│    └── [arquivos de teste]
│
├─── 📚 DOCS (Documentação)
│    └── [documentação]
│
├─── 🎭 PERSONAS (Agentes especializados)
│    └── [diferentes personas]
│
├─── 🏗️ HUB_ENTERPRISE_MVP
│    ├── orchestrate.sh            # Orquestração de serviços
│    ├── personas/                 # Personas enterprise
│    │   ├── qa/scripts/smoke_tests.sh
│    │   └── engenharia/scripts/gerar_esqueleto.sh
│    └── guardioes/                # Guardiões do sistema
│        ├── bombeiro.sh           # Recovery automático
│        └── sentinela.sh          # Monitoramento
│
├─── 📦 DIST (Build compilado)
│    └── [arquivos .js compilados]
│
├─── 🔐 CONFIG
│    ├── .env                      # Variáveis de ambiente
│    ├── .env.example              # Template de .env
│    ├── tsconfig.json             # Config TypeScript
│    ├── railway.json              # Config Railway
│    └── vercel.json               # Config Vercel
│
└─── 🚀 EXECUTÁVEIS (Scripts de início)
     ├── START-AURORA.bat          # Inicia sistema completo
     ├── START-WEBSOCKET.bat       # Só WebSocket
     ├── START-TELEGRAM.bat        # Só Telegram
     └── FIX-PATHS.ps1             # Correção de caminhos
```

---

## 🚀 2. FLUXO DE INICIALIZAÇÃO {#fluxo-boot}

```
┌─────────────────────────────────────────────────────────────┐
│                  USUÁRIO EXECUTA                             │
│              START-AURORA.bat ou npm start                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   start-all.ts                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  1. Load .env (dotenv/config)                      │    │
│  │  2. Import módulos principais                      │    │
│  │  3. Inicializa componentes em ordem                │    │
│  └────────────────────────────────────────────────────┘    │
└──────────┬───────────────────┬────────────────┬─────────────┘
           │                   │                │
           ▼                   ▼                ▼
    ┌──────────┐      ┌──────────────┐   ┌──────────┐
    │ EXECUTOR │      │   MONITOR    │   │ WEBSOCKET│
    │  Skills  │      │   Aurora     │   │  Server  │
    └─────┬────┘      └──────┬───────┘   └────┬─────┘
          │                  │                 │
          │                  │                 │
          ▼                  ▼                 ▼
    ┌──────────────────────────────────────────────┐
    │      Registry de 38+ Skills carregadas       │
    │    ✓ AI (Claude, GPT, Ollama)                │
    │    ✓ AutoPC (controle de sistema)           │
    │    ✓ Browser (automação web)                │
    │    ✓ File Ops (operações de arquivo)        │
    │    ✓ Marketing (captação, ROI)              │
    │    ✓ Security (configuração segura)         │
    │    ✓ Content (geração IA)                   │
    └──────────────────────────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │         Circuit Breakers Ativos              │
    │    • Proteção contra falhas em cascata       │
    │    • Timeout configurável por skill          │
    │    • Retry automático com backoff            │
    └──────────────────────────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │           Watchdogs Iniciados                │
    │    • Telegram Bot Watchdog (30s heartbeat)   │
    │    • WebSocket Watchdog                      │
    │    • Skill Executor Watchdog                 │
    └──────────────────────────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │         Iniciar Bot Telegram                 │
    │    • Conecta ao Telegram API                 │
    │    • Registra comandos (/start, /skills, etc)│
    │    • Middleware de autenticação              │
    │    • Event handlers configurados             │
    └──────────────────────────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │    ✅ SISTEMA TOTALMENTE OPERACIONAL         │
    │                                              │
    │    🟢 WebSocket Server - ws://localhost:18789│
    │    🟢 Telegram Bot - Conectado               │
    │    🟢 38+ Skills - Ativas                    │
    │    🟢 Circuit Breakers - Protegendo          │
    │    🟢 Watchdogs - Monitorando                │
    │    🟢 Dashboard - Pronto para conectar       │
    └──────────────────────────────────────────────┘
```

---

## ⚙️ 3. FLUXO DE EXECUÇÃO DE SKILLS {#fluxo-skills}

### 3.1 Via Telegram Bot

```
┌────────────────────────────────────────────────────────┐
│  Usuário manda mensagem no Telegram                    │
│  Exemplo: "/skill ai-claude gerar texto sobre IA"      │
└───────────────────┬────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   Telegram Bot       │
         │  (telegram-bot.ts)   │
         │                      │
         │  1. Recebe mensagem  │
         │  2. Parse comando    │
         │  3. Valida admin     │
         └─────────┬────────────┘
                   │
                   ▼
         ┌──────────────────────┐
         │  Security Check      │
         │                      │
         │  • Is Admin?         │
         │  • Skill allowed?    │
         │  • Rate limit OK?    │
         └─────────┬────────────┘
                   │
                   ▼
         ┌──────────────────────┐
         │  Skill Executor      │
         │  (skill-executor.ts) │
         │                      │
         │  1. Load skill       │
         │  2. Validate params  │
         │  3. Circuit check    │
         └─────────┬────────────┘
                   │
                   ▼
    ┌──────────────┴───────────────┐
    │                              │
    ▼                              ▼
┌─────────┐              ┌──────────────────┐
│ FAST    │              │   NEEDS APPROVAL │
│ EXECUTE │              │   (dangerous)    │
└────┬────┘              └────────┬─────────┘
     │                            │
     │                            ▼
     │                   ┌────────────────┐
     │                   │ Send approval  │
     │                   │ request to user│
     │                   └────────┬───────┘
     │                            │
     │                   ┌────────▼───────┐
     │                   │ Wait for       │
     │                   │ user response  │
     │                   └────────┬───────┘
     │                            │
     └────────────┬───────────────┘
                  │
                  ▼
       ┌──────────────────────┐
       │   Execute Skill      │
       │                      │
       │   Try-Catch wrapper  │
       │   Timeout protection │
       │   Circuit breaker    │
       └──────────┬───────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
   ┌─────────┐         ┌─────────┐
   │ SUCCESS │         │  ERROR  │
   └────┬────┘         └────┬────┘
        │                   │
        │                   ▼
        │            ┌──────────────┐
        │            │ Circuit open?│
        │            │ Retry needed?│
        │            └──────┬───────┘
        │                   │
        └─────────┬─────────┘
                  │
                  ▼
       ┌──────────────────────┐
       │  Broadcast Events    │
       │                      │
       │  • WebSocket clients │
       │  • Telegram chat     │
       │  • Monitoring system │
       └──────────┬───────────┘
                  │
                  ▼
       ┌──────────────────────┐
       │   Record Metrics     │
       │                      │
       │  • Execution time    │
       │  • Success/failure   │
       │  • Resource usage    │
       └──────────────────────┘
```

### 3.2 Via WebSocket (Dashboard)

```
┌────────────────────────────────────────────────┐
│  Dashboard UI envia comando via WebSocket      │
│  { type: 'execute_skill', skill: 'ai-claude' } │
└───────────────────┬────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ WebSocket Server     │
         │ (websocket-server.ts)│
         │                      │
         │ 1. Receive message   │
         │ 2. Parse JSON        │
         │ 3. Validate format   │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Route to Handler    │
         │                      │
         │  switch(msg.type) {  │
         │   case 'execute':    │
         │   case 'chat':       │
         │   case 'approval':   │
         │  }                   │
         └──────────┬───────────┘
                    │
                    ▼
         [MESMOS PASSOS DO FLUXO TELEGRAM]
                    │
                    ▼
         ┌──────────────────────┐
         │  Send Result via WS  │
         │                      │
         │  ws.send(JSON.stringify({│
         │    type: 'result',   │
         │    data: {...}       │
         │  }))                 │
         └──────────────────────┘
```

---

## 🏛️ 4. ARQUITETURA DE COMPONENTES {#arquitetura}

```
                    ╔══════════════════════════════════╗
                    ║      CAMADA DE INTERFACE         ║
                    ╚══════════════════════════════════╝
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  ┌──────────┐        ┌──────────┐         ┌──────────┐
  │ Telegram │        │WebSocket │         │   CLI    │
  │   Bot    │        │ Server   │         │  Chat    │
  │ (grammy) │        │   (ws)   │         │          │
  └────┬─────┘        └────┬─────┘         └────┬─────┘
       │                   │                     │
       └───────────────────┴─────────────────────┘
                           │
                    ╔══════▼══════════════════════════╗
                    ║   CAMADA DE CONTROLE (CORE)     ║
                    ╠═════════════════════════════════╣
                    ║                                 ║
                    ║  ┌───────────────────────┐     ║
                    ║  │ OpenClawAurora        │     ║
                    ║  │  (main.ts)            │     ║
                    ║  │                       │     ║
                    ║  │  • Event Bridge       │     ║
                    ║  │  • System Manager     │     ║
                    ║  │  • Config Handler     │     ║
                    ║  └───────────┬───────────┘     ║
                    ║              │                 ║
                    ╚══════════════▼═════════════════╝
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
            ┌──────────────┐ ┌──────────┐ ┌──────────────┐
            │   Skill      │ │  Aurora  │ │  WebSocket   │
            │  Executor    │ │ Monitor  │ │   Bridge     │
            │              │ │          │ │              │
            │• Execute     │ │• Watch   │ │• Broadcast   │
            │• Validate    │ │• Health  │ │• Handle msgs │
            │• Circuit     │ │• Metrics │ │• Auth        │
            │  Breaker     │ │• Recovery│ │              │
            └──────┬───────┘ └────┬─────┘ └──────┬───────┘
                   │              │              │
                   └──────────────┴──────────────┘
                                  │
                    ╔═════════════▼════════════════╗
                    ║   CAMADA DE SKILLS           ║
                    ╠══════════════════════════════╣
                    ║                              ║
                    ║  ┌────────────────────┐     ║
                    ║  │  Skill Registry    │     ║
                    ║  │  (skills/index.ts) │     ║
                    ║  └─────────┬──────────┘     ║
                    ║            │                ║
                    ║  ┌─────────▼──────────┐     ║
                    ║  │  38+ Skills        │     ║
                    ║  ├────────────────────┤     ║
                    ║  │ • AI Models        │     ║
                    ║  │ • AutoPC Control   │     ║
                    ║  │ • Browser Auto     │     ║
                    ║  │ • File Ops         │     ║
                    ║  │ • Marketing        │     ║
                    ║  │ • Security         │     ║
                    ║  │ • Content Gen      │     ║
                    ║  │ • Analytics        │     ║
                    ║  └────────────────────┘     ║
                    ║                              ║
                    ╚══════════════════════════════╝
                                  │
                    ╔═════════════▼════════════════╗
                    ║  CAMADA DE PROTEÇÃO          ║
                    ╠══════════════════════════════╣
                    ║                              ║
                    ║  ┌────────────────────┐     ║
                    ║  │ Circuit Breakers   │     ║
                    ║  │ • Open/Close/Half  │     ║
                    ║  │ • Retry Logic      │     ║
                    ║  │ • Fallback         │     ║
                    ║  └────────────────────┘     ║
                    ║                              ║
                    ║  ┌────────────────────┐     ║
                    ║  │ Watchdogs          │     ║
                    ║  │ • Heartbeat        │     ║
                    ║  │ • Auto Recovery    │     ║
                    ║  │ • Alert System     │     ║
                    ║  └────────────────────┘     ║
                    ║                              ║
                    ║  ┌────────────────────┐     ║
                    ║  │ Security Manager   │     ║
                    ║  │ • Auth             │     ║
                    ║  │ • Permissions      │     ║
                    ║  │ • Rate Limiting    │     ║
                    ║  └────────────────────┘     ║
                    ║                              ║
                    ╚══════════════════════════════╝
                                  │
                    ╔═════════════▼════════════════╗
                    ║   CAMADA DE DADOS            ║
                    ╠══════════════════════════════╣
                    ║                              ║
                    ║  ┌────────────────────┐     ║
                    ║  │ Metrics Store      │     ║
                    ║  │ • Executions       │     ║
                    ║  │ • Performance      │     ║
                    ║  │ • Errors           │     ║
                    ║  └────────────────────┘     ║
                    ║                              ║
                    ║  ┌────────────────────┐     ║
                    ║  │ Event Log          │     ║
                    ║  │ • Audit Trail      │     ║
                    ║  │ • Debug Info       │     ║
                    ║  └────────────────────┘     ║
                    ║                              ║
                    ╚══════════════════════════════╝
                                  │
                    ╔═════════════▼════════════════╗
                    ║   CAMADA EXTERNA             ║
                    ╠══════════════════════════════╣
                    ║                              ║
                    ║  • Claude API (Anthropic)    ║
                    ║  • OpenAI GPT API            ║
                    ║  • Ollama (Local)            ║
                    ║  • Telegram API              ║
                    ║  • File System               ║
                    ║  • OS Commands (exec)        ║
                    ║  • Browser (Puppeteer)       ║
                    ║                              ║
                    ╚══════════════════════════════╝
```

---

## 🔄 5. FLUXO DE COMUNICAÇÃO {#fluxo-comunicacao}

### 5.1 Comunicação entre Componentes

```
┌────────────────────────────────────────────────────────────┐
│                   EVENT BUS (Internal)                      │
│                                                             │
│  Todos os componentes emitem e ouvem eventos:              │
│                                                             │
│  ┌─────────────────────────────────────────────────┐      │
│  │  Events:                                         │      │
│  │  • execution:start                               │      │
│  │  • execution:complete                            │      │
│  │  • execution:error                               │      │
│  │  • approval:required                             │      │
│  │  • approval:approved                             │      │
│  │  • approval:denied                               │      │
│  │  • circuit:open                                  │      │
│  │  • circuit:close                                 │      │
│  │  • watchdog:alert                                │      │
│  │  • metric:recorded                               │      │
│  └─────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │ Executor │        │ Monitor  │        │WebSocket │
    │          │        │          │        │  Server  │
    │ Emite:   │        │ Emite:   │        │          │
    │ exec:*   │◄──────►│ watch:*  │◄──────►│ Broadcast│
    │          │        │ metric:* │        │ para ALL │
    │          │        │          │        │ clients  │
    └──────────┘        └──────────┘        └──────────┘
```

### 5.2 Fluxo WebSocket em Tempo Real

```
┌──────────────┐                          ┌──────────────┐
│  Dashboard   │                          │  WebSocket   │
│  (Browser)   │                          │   Server     │
└──────┬───────┘                          └──────┬───────┘
       │                                         │
       │  1. ws://localhost:18789                │
       ├────────────────────────────────────────►│
       │                                         │
       │  2. Connection established              │
       │◄────────────────────────────────────────┤
       │                                         │
       │  3. { type: 'subscribe', events: [...] }│
       ├────────────────────────────────────────►│
       │                                         │
       │                [Sistema Rodando]        │
       │                                         │
       │  4. Skill executado via Telegram        │
       │                                    ┌────┴────┐
       │                                    │Executor │
       │                                    │emite    │
       │                                    │evento   │
       │                                    └────┬────┘
       │                                         │
       │  5. { type: 'skill_execution',         │
       │       event: 'complete',                │
       │       data: {...} }                     │
       │◄────────────────────────────────────────┤
       │                                         │
       │  6. Dashboard atualiza UI em real-time │
       │                                         │
       │  7. Enviar comando do dashboard        │
       │     { type: 'execute_skill', ... }     │
       ├────────────────────────────────────────►│
       │                                         │
       │  8. { type: 'result', ... }            │
       │◄────────────────────────────────────────┤
       │                                         │
```

---

## 🎯 6. SISTEMA DE SKILLS {#skills}

### 6.1 Categorias de Skills

```
┌─────────────────────────────────────────────────────────┐
│                    38+ SKILLS ATIVAS                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🤖 AI & LLM (3 skills)                                 │
│     ├─ ai-claude         → Claude API (Anthropic)       │
│     ├─ ai-gpt            → OpenAI GPT                   │
│     └─ ai-ollama         → Ollama local models          │
│                                                          │
│  💻 SYSTEM CONTROL (3 skills)                           │
│     ├─ autopc-control    → Controle total do PC         │
│     ├─ exec-bash         → Executar comandos bash       │
│     └─ exec-extended     → Comandos avançados           │
│                                                          │
│  🌐 WEB & BROWSER (2 skills)                            │
│     ├─ browser-control   → Automação de navegador       │
│     └─ web-scraping      → Extração de dados web        │
│                                                          │
│  📁 FILE OPERATIONS (2 skills)                          │
│     ├─ file-ops          → CRUD de arquivos             │
│     └─ file-ops-advanced → Operações complexas          │
│                                                          │
│  📱 COMMUNICATION (1 skill)                             │
│     └─ comm-telegram     → Envio de mensagens           │
│                                                          │
│  📊 MARKETING & ANALYTICS (3 skills)                    │
│     ├─ analytics-roi     → Análise de ROI               │
│     ├─ marketing-captacao→ Captação de leads            │
│     └─ reviews-reputation→ Gestão de reputação          │
│                                                          │
│  ✍️ CONTENT CREATION (1 skill)                          │
│     └─ content-ia        → Geração de conteúdo IA       │
│                                                          │
│  🔒 SECURITY (1 skill)                                  │
│     └─ security-config   → Configuração de segurança    │
│                                                          │
│  🧪 DEVELOPMENT (5 skills)                              │
│     ├─ sandbox-runner    → Execução isolada             │
│     ├─ skill-sandbox     → Sandbox para skills          │
│     ├─ skill-scaffolder  → Gerador de novas skills      │
│     ├─ skill-metrics     → Métricas de performance      │
│     └─ skill-registry-v2 → Sistema de registro          │
│                                                          │
│  🧠 INTELLIGENCE (2 skills)                             │
│     ├─ intent-router     → Roteamento inteligente       │
│     └─ skill-intent-router→ Router de intenções         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Anatomia de uma Skill

```typescript
// Estrutura de uma skill típica

import { SkillDefinition, SkillContext } from './skill-base';

export const skillName: SkillDefinition = {

  // METADATA
  name: 'skill-name',
  description: 'O que a skill faz',
  category: 'ai' | 'system' | 'web' | 'file' | 'comm' | 'marketing',
  version: '1.0.0',
  author: 'Lucas Tigre',

  // SECURITY
  requiresApproval: boolean,        // Requer aprovação manual?
  isDangerous: boolean,             // É perigosa?
  allowedFor: ['admin', 'user'],    // Quem pode usar

  // CIRCUIT BREAKER
  circuitBreaker: {
    timeout: 30000,                 // Timeout em ms
    maxFailures: 3,                 // Max falhas antes de abrir
    resetTimeout: 60000,            // Tempo para tentar resetar
  },

  // PARAMETERS
  parameters: {
    param1: {
      type: 'string' | 'number' | 'boolean' | 'object',
      required: boolean,
      description: 'Descrição do parâmetro',
      default?: any,
    }
  },

  // EXECUTION
  execute: async (context: SkillContext) => {
    // 1. Validar parâmetros
    const { param1 } = context.params;

    // 2. Executar lógica
    const result = await doSomething(param1);

    // 3. Retornar resultado
    return {
      success: true,
      data: result,
      metadata: {
        executionTime: Date.now() - context.startTime,
      }
    };
  },

  // HOOKS (Opcional)
  hooks: {
    beforeExecute: async (context) => {
      // Executado antes
    },
    afterExecute: async (context, result) => {
      // Executado depois
    },
    onError: async (context, error) => {
      // Executado em erro
    }
  }
};
```

---

## 📊 7. ESTADOS E CICLO DE VIDA

```
┌─────────────────────────────────────────────────┐
│         CICLO DE VIDA DO SISTEMA                │
└─────────────────────────────────────────────────┘

  BOOT
    │
    ├──► Load .env
    ├──► Initialize modules
    ├──► Register skills
    ├──► Setup circuit breakers
    ├──► Start watchdogs
    │
    ▼
  READY
    │
    ├──► Listen WebSocket
    ├──► Connect Telegram
    ├──► Accept commands
    │
    ▼
  RUNNING
    │
    ├──► Execute skills
    ├──► Monitor health
    ├──► Record metrics
    ├──► Handle errors
    │
    ▼
  SHUTDOWN (Ctrl+C ou SIGTERM)
    │
    ├──► Stop accepting new requests
    ├──► Wait for running tasks
    ├──► Close connections
    ├──► Save metrics
    │
    ▼
  STOPPED


┌─────────────────────────────────────────────────┐
│       ESTADOS DO CIRCUIT BREAKER                │
└─────────────────────────────────────────────────┘

      CLOSED (Normal)
         │
         │ Failures >= maxFailures
         ▼
      OPEN (Bloqueado)
         │
         │ After resetTimeout
         ▼
      HALF_OPEN (Testando)
         │
    ┌────┴────┐
    │         │
Success?   Failure?
    │         │
    ▼         ▼
  CLOSED    OPEN
```

---

## 🔐 8. SEGURANÇA E PERMISSÕES

```
┌─────────────────────────────────────────────────┐
│          CAMADAS DE SEGURANÇA                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  1️⃣  AUTENTICAÇÃO                               │
│      • Telegram: Chat ID validado               │
│      • WebSocket: Token opcional                │
│      • CLI: Local only                          │
│                                                  │
│  2️⃣  AUTORIZAÇÃO                                │
│      • Admin vs User roles                      │
│      • Skill-level permissions                  │
│      • Rate limiting                            │
│                                                  │
│  3️⃣  APROVAÇÃO MANUAL                           │
│      • Skills perigosas requerem OK             │
│      • Timeout de 60s para aprovar              │
│      • Auto-deny após timeout                   │
│                                                  │
│  4️⃣  SANDBOX & ISOLAMENTO                       │
│      • Skills executam em contexto isolado      │
│      • Limites de recursos (CPU, mem, tempo)    │
│      • Validação de output                      │
│                                                  │
│  5️⃣  CIRCUIT BREAKERS                           │
│      • Previne cascading failures               │
│      • Auto-recovery                            │
│      • Fallback mechanisms                      │
│                                                  │
│  6️⃣  MONITORING & ALERTS                        │
│      • Watchdogs detectam anomalias             │
│      • Alertas via Telegram                     │
│      • Métricas em tempo real                   │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 📈 9. MÉTRICAS E OBSERVABILIDADE

```
┌─────────────────────────────────────────────────┐
│          MÉTRICAS COLETADAS                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 EXECUTION METRICS                           │
│     • Total skills executadas                   │
│     • Success rate (%)                          │
│     • Failure rate (%)                          │
│     • Average execution time                    │
│     • P50, P95, P99 latency                     │
│                                                  │
│  🔄 CIRCUIT BREAKER METRICS                     │
│     • States (closed/open/half-open)            │
│     • Open/close events                         │
│     • Failures count                            │
│     • Recovery time                             │
│                                                  │
│  💓 HEALTH METRICS                              │
│     • Heartbeats received                       │
│     • Missed heartbeats                         │
│     • Watchdog alerts                           │
│     • System uptime                             │
│                                                  │
│  📱 TELEGRAM METRICS                            │
│     • Messages received                         │
│     • Messages sent                             │
│     • Commands executed                         │
│     • Latency                                   │
│                                                  │
│  🌐 WEBSOCKET METRICS                           │
│     • Active connections                        │
│     • Messages in/out                           │
│     • Broadcast count                           │
│     • Connection errors                         │
│                                                  │
│  🎯 SKILL-SPECIFIC METRICS                      │
│     • Per-skill execution count                 │
│     • Per-skill success/failure                 │
│     • Per-skill average time                    │
│     • Per-skill resource usage                  │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🚀 10. DEPLOYMENT & SCALING

```
┌─────────────────────────────────────────────────┐
│         OPÇÕES DE DEPLOYMENT                    │
├─────────────────────────────────────────────────┤
│                                                  │
│  🏠 LOCAL (Windows)                             │
│     • npm start / START-AURORA.bat              │
│     • Desenvolvimento                           │
│     • Testes locais                             │
│                                                  │
│  ☁️  RAILWAY.app                                │
│     • Backend automático                        │
│     • railway.json configurado                  │
│     • Auto-deploy via GitHub                    │
│     • Variáveis de ambiente                     │
│                                                  │
│  ▲ VERCEL                                       │
│     • Dashboard (frontend)                      │
│     • vercel.json configurado                   │
│     • CDN global                                │
│     • Auto-deploy                               │
│                                                  │
│  🐳 DOCKER                                      │
│     • Dockerfile incluído                       │
│     • docker-compose.yml                        │
│     • Isolamento completo                       │
│                                                  │
│  🔧 PM2 (Process Manager)                       │
│     • Auto-restart                              │
│     • Cluster mode                              │
│     • Log management                            │
│     • Monitoramento                             │
│                                                  │
└─────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────┐
│         SCALING STRATEGY                        │
├─────────────────────────────────────────────────┤
│                                                  │
│  📈 VERTICAL SCALING                            │
│     • Mais CPU/RAM no servidor                  │
│     • Aumentar timeouts                         │
│     • Mais workers                              │
│                                                  │
│  📊 HORIZONTAL SCALING                          │
│     • Múltiplas instâncias                      │
│     • Load balancer                             │
│     • Redis para shared state                   │
│     • Message queue (RabbitMQ)                  │
│                                                  │
│  🎯 OPTIMIZATION                                │
│     • Skill caching                             │
│     • Result memoization                        │
│     • Lazy loading                              │
│     • Database connection pooling               │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 📝 11. COMANDOS RÁPIDOS

```bash
# ============================================================================
# DEVELOPMENT
# ============================================================================

# Iniciar sistema completo
npm start                    # Produção (dist/)
npm run dev                  # Desenvolvimento (ts-node)
npm run all                  # start-all.ts

# Iniciar componentes individuais
npm run bot                  # Só Telegram
npm run opencloud            # Só OpenCloud

# Dashboard
npm run dashboard            # Inicia dashboard (porta 5173)

# Testes
npm test                     # Testa todas as skills
npm run smoke                # Smoke test rápido
npm run smoke:skills         # Conta skills disponíveis

# Build
npm run build                # Compila TypeScript → dist/

# ============================================================================
# WINDOWS BATCH SCRIPTS
# ============================================================================

START-AURORA.bat             # Sistema completo
START-WEBSOCKET.bat          # Só WebSocket server
START-TELEGRAM.bat           # Só bot Telegram

# ============================================================================
# TROUBLESHOOTING
# ============================================================================

# Corrigir caminhos após mover pasta
.\FIX-PATHS.ps1

# Ver skills disponíveis
npm run skills:list

# Verificar dependências
npm install

# Limpar build
rm -rf dist && npm run build
```

---

## 🎓 12. PRÓXIMOS PASSOS

```
┌─────────────────────────────────────────────────┐
│         ROADMAP DE EVOLUÇÃO                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  ✅ CONCLUÍDO                                   │
│     • 38+ skills funcionais                     │
│     • Circuit breakers                          │
│     • Watchdogs                                 │
│     • Telegram bot                              │
│     • WebSocket server                          │
│     • Dashboard básico                          │
│                                                  │
│  🚧 EM DESENVOLVIMENTO                          │
│     • Dashboard avançado (React)                │
│     • Métricas em tempo real                    │
│     • API REST completa                         │
│     • Sistema de plugins                        │
│                                                  │
│  📋 PLANEJADO                                   │
│     • Multi-user support                        │
│     • Database integration (PostgreSQL)         │
│     • Advanced analytics                        │
│     • Skill marketplace                         │
│     • Web UI para criar skills                  │
│     • Integration com WhatsApp                  │
│     • Integration com Discord                   │
│     • Auto-scaling                              │
│     • Distributed execution                     │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 📚 RECURSOS ADICIONAIS

- **Documentação**: `/docs`
- **Exemplos**: `/examples`
- **Testes**: `/tests`
- **GitHub**: https://github.com/lucastigrereal-dev/openclaw_aurora
- **Issues**: GitHub Issues para bugs e features

---

**Última atualização**: 2026-02-10
**Versão**: 2.0.0
**Autor**: Lucas Tigre
