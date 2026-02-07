# OpenClaw Aurora - Estrutura Completa do Projeto

```
openclaw_aurora/
│
├── 📄 CONFIGURAÇÃO & DOCS
│   ├── README.md                    # Documentação principal
│   ├── DEPLOYMENT_REPORT.md         # Relatório de deploy
│   ├── INTEGRACAO.md                # Guia de integração
│   ├── CLAUDE-CODE-PROMPT.md        # Prompt para Claude Code
│   ├── EVOLUCAO_KHRON_AVALIACAO.md  # Avaliação do sistema
│   ├── package.json                 # Dependências Node.js
│   ├── tsconfig.json                # Config TypeScript
│   ├── railway.json                 # Config Railway
│   └── vercel.json                  # Config Vercel (root)
│
├── 📜 SCRIPTS DE DEPLOY
│   ├── deploy-now.ps1               # Deploy direto Windows
│   ├── deploy-windows.ps1           # Deploy completo Windows
│   └── deploy-auto.ps1              # Deploy automatizado
│
├── 🚀 ENTRY POINTS
│   ├── main.ts                      # Entrada principal
│   ├── start-all.ts                 # Iniciar todos serviços
│   ├── start-unified.ts             # Sistema unificado
│   ├── websocket-server.ts          # Servidor WebSocket :18789
│   ├── telegram-bot.ts              # Bot Telegram
│   ├── skill-executor.ts            # Executor de skills
│   ├── aurora-openclaw-integration.ts # Integração Aurora
│   └── test-skills.ts               # Testes de skills
│
├── 🛠️ SKILLS (17 habilidades)
│   └── skills/
│       ├── index.ts                 # Exporta todas skills
│       ├── skill-base.ts            # Classe base
│       ├── ai-claude.ts             # 🤖 Claude API
│       ├── ai-gpt.ts                # 🤖 OpenAI GPT
│       ├── ai-ollama.ts             # 🤖 Ollama local
│       ├── file-ops.ts              # 📁 Operações arquivo
│       ├── web-fetch.ts             # 🌐 HTTP requests
│       ├── comm-telegram.ts         # 📱 Telegram
│       ├── exec-bash.ts             # 💻 Comandos shell
│       └── util-misc.ts             # 🔧 Utilitários
│
├── 🛡️ AURORA MONITOR (Proteção & Monitoramento)
│   └── aurora-monitor-ts/
│       ├── package.json
│       ├── tsconfig.json
│       │
│       └── src/
│           ├── index.ts             # Exporta tudo
│           │
│           ├── core/                # 🎯 NÚCLEO
│           │   ├── monitor.ts       # Monitor principal
│           │   └── config.ts        # Configurações
│           │
│           ├── protection/          # 🛡️ PROTEÇÃO
│           │   ├── circuit-breaker.ts  # Disjuntor de falhas
│           │   └── rate-limiter.ts     # Limitador de taxa
│           │
│           ├── healing/             # 🩹 AUTO-CURA
│           │   ├── watchdog.ts      # Vigilante do sistema
│           │   └── auto-healer.ts   # Recuperação automática
│           │
│           ├── detectors/           # 🔍 DETECÇÃO
│           │   └── anomaly.ts       # Detector de anomalias
│           │
│           ├── collectors/          # 📊 COLETA
│           │   └── metrics.ts       # Coletor de métricas
│           │
│           ├── alerts/              # 🚨 ALERTAS
│           │   └── alert-manager.ts # Gerenciador de alertas
│           │
│           ├── integrations/        # 🔌 INTEGRAÇÕES
│           │   ├── openclaw.ts      # Integração OpenClaw
│           │   └── websocket-server.ts # Servidor WS
│           │
│           └── utils/               # 🔧 UTILITÁRIOS
│               └── logger.ts        # Sistema de logs
│
├── 🎨 DASHBOARD (prometheus-cockpit-jarvis)
│   └── dashboard/
│       ├── package.json
│       ├── vercel.json              # Config Vercel
│       ├── vite.config.ts           # Config Vite
│       ├── tsconfig.json
│       ├── components.json          # shadcn/ui config
│       │
│       ├── server/                  # 🖥️ SERVIDOR
│       │   └── index.ts             # Express server
│       │
│       ├── shared/                  # 📦 COMPARTILHADO
│       │   └── const.ts             # Constantes
│       │
│       └── client/                  # 🎨 FRONTEND
│           └── src/
│               ├── main.tsx         # Entry point React
│               ├── App.tsx          # App principal
│               ├── const.ts         # Constantes
│               │
│               ├── components/      # 🧩 COMPONENTES
│               │   │
│               │   ├── 🌟 PRINCIPAIS
│               │   ├── AuroraAvatar.tsx     # Chat com Aurora
│               │   ├── AuroraBackground.tsx # Background animado
│               │   ├── BootSequence.tsx     # Sequência de boot
│               │   ├── CockpitLayout.tsx    # Layout cockpit
│               │   ├── GameLayout.tsx       # Layout gamificado
│               │   ├── Layout.tsx           # Layout geral
│               │   │
│               │   ├── 📊 VISUALIZAÇÃO
│               │   ├── Card3D.tsx           # Cards 3D
│               │   ├── CircularGauge.tsx    # Medidores circulares
│               │   ├── CircularChart.tsx    # Gráficos circulares
│               │   ├── AnimatedBarChart.tsx # Barras animadas
│               │   ├── AnimatedLineChart.tsx# Linhas animadas
│               │   ├── BarChart.tsx         # Gráfico barras
│               │   ├── LineChart.tsx        # Gráfico linhas
│               │   ├── DynamicChart.tsx     # Gráfico dinâmico
│               │   ├── HexagonGrid.tsx      # Grid hexagonal
│               │   ├── MetricsCard.tsx      # Card de métricas
│               │   │
│               │   ├── 🎭 INTERATIVOS
│               │   ├── DraggableGrid.tsx    # Grid arrastável
│               │   ├── DraggablePanel.tsx   # Painel arrastável
│               │   ├── MouseTrackingCard.tsx# Card tracking mouse
│               │   ├── GlowingCard.tsx      # Card com brilho
│               │   ├── PanelCarousel.tsx    # Carrossel
│               │   │
│               │   ├── 📡 STATUS
│               │   ├── WebSocketStatus.tsx  # Status WebSocket
│               │   ├── ActivityFeed.tsx     # Feed atividades
│               │   ├── ActivityFeedLive.tsx # Feed ao vivo
│               │   ├── ActivityPanel.tsx    # Painel atividades
│               │   ├── TopSkillsPanel.tsx   # Top skills
│               │   ├── NotificationBadge.tsx# Badge notificação
│               │   │
│               │   ├── 🎨 EFEITOS
│               │   ├── ParticleField.tsx    # Campo partículas
│               │   ├── WebGLBackground.tsx  # Background WebGL
│               │   │
│               │   ├── 🛠️ UTILITÁRIOS
│               │   ├── ErrorBoundary.tsx    # Tratamento erros
│               │   ├── ManusDialog.tsx      # Diálogo Manus
│               │   ├── Map.tsx              # Componente mapa
│               │   │
│               │   └── ui/                  # 🎨 shadcn/ui (50+ componentes)
│               │       ├── button.tsx
│               │       ├── card.tsx
│               │       ├── dialog.tsx
│               │       ├── input.tsx
│               │       ├── tabs.tsx
│               │       ├── ... (45+ mais)
│               │       └── tooltip.tsx
│               │
│               ├── pages/           # 📄 PÁGINAS
│               │   ├── Home.tsx            # Dashboard principal
│               │   ├── Skills.tsx          # Gerenciar skills
│               │   ├── Executions.tsx      # Execuções
│               │   ├── Flows.tsx           # Fluxos
│               │   ├── Automation.tsx      # Automação
│               │   ├── Connectors.tsx      # Conectores
│               │   ├── Gateway.tsx         # Gateway API
│               │   ├── Logs.tsx            # Logs
│               │   ├── Health.tsx          # Saúde sistema
│               │   ├── Costs.tsx           # Custos
│               │   └── NotFound.tsx        # 404
│               │
│               ├── contexts/        # 🔄 CONTEXTOS REACT
│               │   ├── SystemContext.tsx   # Estado sistema
│               │   ├── ThemeContext.tsx    # Tema dark/light
│               │   └── WebSocketContext.tsx# Contexto WS
│               │
│               ├── hooks/           # 🎣 HOOKS
│               │   ├── useWebSocket.ts     # Hook WebSocket
│               │   ├── useOpenClawWebSocket.ts # Hook OpenClaw WS
│               │   ├── useActivityFeed.ts  # Hook feed
│               │   ├── useMetricsAggregator.ts # Hook métricas
│               │   ├── useComposition.ts   # Hook composição
│               │   ├── usePersistFn.ts     # Hook persistência
│               │   └── useMobile.tsx       # Hook mobile
│               │
│               ├── services/        # 🔌 SERVIÇOS
│               │   ├── openclawWebSocket.ts    # Cliente WS OpenClaw
│               │   ├── metricsAggregator.ts    # Agregador métricas
│               │   └── mockOpenClawEvents.ts   # Eventos mock
│               │
│               └── lib/             # 📚 BIBLIOTECAS
│                   └── utils.ts     # Utilitários (cn, clsx)
│
├── ⚙️ CONFIG
│   └── config/
│       └── default.json             # Configurações padrão
│
└── 🔄 GITHUB ACTIONS
    └── .github/
        └── workflows/
            └── deploy.yml           # CI/CD auto-deploy
```

---

## 📊 Estatísticas

| Categoria | Quantidade |
|-----------|------------|
| **Skills** | 17 |
| **Componentes UI** | 50+ |
| **Páginas** | 11 |
| **Hooks** | 7 |
| **Contextos** | 3 |
| **Arquivos TypeScript** | 100+ |

---

## 🔗 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUÁRIO                                  │
│                    (Browser/Telegram)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD (Vercel)                            │
│              https://openclaw-aurora.vercel.app                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ AuroraAvatar│  │ CircularGauge│ │ ActivityFeed           │  │
│  │   (Chat)    │  │  (Métricas)  │ │ (Eventos tempo real)   │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          └────────────────┼─────────────────────┘
                           │ WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Railway)                             │
│        https://openclawaurora-production.up.railway.app          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   AURORA MONITOR                          │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────────┐    │   │
│  │  │  Circuit   │ │   Rate     │ │     Watchdog       │    │   │
│  │  │  Breaker   │ │  Limiter   │ │  (Health Check)    │    │   │
│  │  └────────────┘ └────────────┘ └────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   SKILL EXECUTOR                          │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │   │
│  │  │ Claude │ │  GPT   │ │ Ollama │ │Telegram│ │  File  │  │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐                        │   │
│  │  │  Web   │ │  Bash  │ │  Utils │                        │   │
│  │  └────────┘ └────────┘ └────────┘                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL APIS                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐ │
│  │ Claude  │  │ OpenAI  │  │ Ollama  │  │ Telegram Bot API   │ │
│  │   API   │  │   API   │  │  Local  │  │                     │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🌐 URLs de Produção

| Serviço | URL |
|---------|-----|
| **Dashboard** | https://openclaw-aurora.vercel.app |
| **Backend** | https://openclawaurora-production.up.railway.app |
| **WebSocket** | wss://openclawaurora-production.up.railway.app/api/v1/ws |
