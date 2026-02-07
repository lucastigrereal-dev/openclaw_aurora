# ESTRUTURA DEFINITIVA DO OPENCLAW

**Versão:** 2.0 CANÔNICA
**Data:** 2026-02-07
**Status:** APROVADA

---

## 1. VISÃO GERAL

```
┌─────────────────────────────────────────────────────────────────┐
│                         OPENCLAW                                 │
│                   (Sistema Completo)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│   │   COCKPIT   │    │  TELEGRAM   │    │     API     │         │
│   │ (Dashboard) │    │    (Bot)    │    │   (REST)    │         │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│          │                  │                  │                 │
│          └──────────────────┼──────────────────┘                 │
│                             │                                    │
│                             ▼                                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    AURORA MONITOR                        │   │
│   │              (Vigia, Protege, Auto-Heal)                 │   │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │   │
│   │  │Watchdog │ │ Circuit │ │  Rate   │ │ Anomaly │        │   │
│   │  │         │ │ Breaker │ │ Limiter │ │Detector │        │   │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │   │
│   └──────────────────────┬──────────────────────────────────┘   │
│                          │ autoriza/bloqueia                     │
│                          ▼                                       │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   OPERATOR CORE                          │   │
│   │              (Planeja, Decide, Executa)                  │   │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │   │
│   │  │ Router  │ │Guardrail│ │Executor │ │Registry │        │   │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │   │
│   └──────────────────────┬──────────────────────────────────┘   │
│                          │ chama                                 │
│            ┌─────────────┴─────────────┐                        │
│            ▼                           ▼                        │
│   ┌─────────────────┐         ┌─────────────────┐               │
│   │   CORE SKILLS   │         │      HUBS       │               │
│   │  (Capacidades)  │         │   (Domínios)    │               │
│   │                 │         │                 │               │
│   │ • AI (Claude)   │         │ • Enterprise    │               │
│   │ • EXEC (Bash)   │         │ • Supabase      │               │
│   │ • FILE (R/W)    │         │ • Social Media  │               │
│   │ • WEB (Fetch)   │         │ • Vendas (fut.) │               │
│   │ • COMM (Tg)     │         │ • Clínica (fut.)│               │
│   │ • UTIL          │         │                 │               │
│   └─────────────────┘         └─────────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. ESTRUTURA DE PASTAS DEFINITIVA

```
openclaw/
│
├── core/                           # NÚCLEO (sagrado)
│   │
│   ├── operator/                   # Runtime - DECIDE
│   │   ├── operator.ts             # Entry point principal
│   │   ├── router.ts               # Intenção → Plano
│   │   ├── guardrail.ts            # Regras e limites
│   │   ├── executor.ts             # Executa steps
│   │   ├── registry.ts             # Registra skills/hubs
│   │   ├── state.ts                # Sessão e checkpoints
│   │   ├── logger.ts               # Logs estruturados
│   │   ├── contracts/              # Interfaces e tipos
│   │   │   ├── skill.interface.ts
│   │   │   ├── hub.interface.ts
│   │   │   ├── execution.interface.ts
│   │   │   └── aurora.interface.ts # Contrato Operator↔Aurora
│   │   └── index.ts
│   │
│   └── skills/                     # Capacidades - FAZ
│       ├── base.ts                 # Classe base Skill
│       ├── ai/
│       │   ├── claude.ts
│       │   ├── gpt.ts
│       │   ├── ollama.ts
│       │   └── index.ts
│       ├── exec/
│       │   ├── bash.ts
│       │   ├── extended.ts         # Python, PS, Node
│       │   └── index.ts
│       ├── file/
│       │   ├── ops.ts
│       │   ├── advanced.ts
│       │   └── index.ts
│       ├── web/
│       │   ├── fetch.ts
│       │   ├── scrape.ts
│       │   └── index.ts
│       ├── browser/
│       │   ├── control.ts
│       │   └── index.ts
│       ├── comm/
│       │   ├── telegram.ts
│       │   └── index.ts
│       ├── util/
│       │   ├── misc.ts
│       │   └── index.ts
│       └── index.ts                # Export all skills
│
├── aurora/                         # MONITOR (guardião)
│   ├── core/
│   │   ├── monitor.ts              # Serviço principal
│   │   ├── config.ts               # Configurações
│   │   └── metrics.ts              # Definição de métricas
│   ├── collectors/
│   │   ├── process.ts              # CPU, RAM, Disco
│   │   ├── execution.ts            # Tempo, erros, loops
│   │   └── channel.ts              # Latência, quedas
│   ├── protection/
│   │   ├── circuit-breaker.ts      # Corta em falha
│   │   ├── rate-limiter.ts         # Limita taxa
│   │   └── guardrail-enforcer.ts   # Aplica regras
│   ├── detectors/
│   │   ├── anomaly.ts              # Detecta anomalias
│   │   ├── loop.ts                 # Detecta loops
│   │   └── risk.ts                 # Calcula score risco
│   ├── healing/
│   │   ├── watchdog.ts             # Vigia processos
│   │   ├── auto-healer.ts          # Tenta recuperar
│   │   └── checkpoint.ts           # Salva estado
│   ├── alerts/
│   │   ├── alert-manager.ts        # Gerencia alertas
│   │   ├── telegram.ts             # Notifica Telegram
│   │   └── webhook.ts              # Notifica webhook
│   ├── contracts/
│   │   ├── authorization.ts        # Pedido de autorização
│   │   ├── response.ts             # Resposta Aurora
│   │   └── events.ts               # Eventos em tempo real
│   └── index.ts
│
├── hubs/                           # DOMÍNIOS (setores)
│   │
│   ├── enterprise/                 # Fábrica de Apps
│   │   ├── orchestrator.ts
│   │   ├── types.ts
│   │   ├── config.ts
│   │   ├── personas/
│   │   │   ├── produto.ts          # S-01
│   │   │   ├── arquitetura.ts      # S-02
│   │   │   ├── engenharia.ts       # S-03
│   │   │   ├── qa.ts               # S-04
│   │   │   ├── ops.ts              # S-05
│   │   │   ├── security.ts         # S-06
│   │   │   ├── dados.ts            # S-07
│   │   │   ├── design.ts           # S-08
│   │   │   └── performance.ts      # S-09
│   │   ├── workflows/
│   │   │   ├── full.ts
│   │   │   ├── mvp-only.ts
│   │   │   ├── code-only.ts
│   │   │   ├── test-only.ts
│   │   │   ├── incident-response.ts
│   │   │   └── feature-add.ts
│   │   ├── templates/
│   │   ├── shared/
│   │   ├── tests/
│   │   └── index.ts
│   │
│   ├── supabase-archon/            # Gestão de BD
│   │   ├── orchestrator.ts
│   │   ├── types.ts
│   │   ├── skills/
│   │   │   ├── schema/
│   │   │   │   ├── schema-sentinel.ts
│   │   │   │   ├── schema-differ.ts
│   │   │   │   └── migration-planner.ts
│   │   │   ├── security/
│   │   │   │   ├── rls-auditor.ts
│   │   │   │   ├── secrets-scanner.ts
│   │   │   │   └── permission-diff.ts
│   │   │   ├── performance/
│   │   │   │   ├── index-optimizer.ts
│   │   │   │   ├── query-doctor.ts
│   │   │   │   ├── query-cache.ts
│   │   │   │   └── slow-query-logger.ts
│   │   │   ├── reliability/
│   │   │   │   ├── backup-driller.ts
│   │   │   │   ├── replication-monitor.ts
│   │   │   │   ├── deadlock-detector.ts
│   │   │   │   └── circuit-breaker.ts
│   │   │   ├── maintenance/
│   │   │   │   ├── vacuum-scheduler.ts
│   │   │   │   ├── table-bloat-detector.ts
│   │   │   │   └── partition-manager.ts
│   │   │   ├── monitoring/
│   │   │   │   ├── health-dashboard.ts
│   │   │   │   ├── cost-analyzer.ts
│   │   │   │   ├── edge-function-monitor.ts
│   │   │   │   └── compliance-reporter.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── index.ts
│   │
│   ├── social-media/               # Gestão de Redes
│   │   ├── orchestrator.ts
│   │   ├── types.ts
│   │   ├── config.ts
│   │   ├── skills/
│   │   │   ├── content/
│   │   │   │   ├── caption-ai.ts
│   │   │   │   ├── hashtag-ai.ts
│   │   │   │   └── video-enricher.ts
│   │   │   ├── publishing/
│   │   │   │   ├── publer.ts
│   │   │   │   ├── planner.ts
│   │   │   │   └── approval-workflow.ts
│   │   │   ├── analytics/
│   │   │   │   ├── collector.ts
│   │   │   │   ├── reporter.ts
│   │   │   │   └── quota-enforcer.ts
│   │   │   ├── management/
│   │   │   │   ├── inventory.ts
│   │   │   │   ├── database-manager.ts
│   │   │   │   └── observability.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── index.ts
│   │
│   └── _template/                  # Template para novos hubs
│       ├── orchestrator.ts
│       ├── types.ts
│       ├── skills/
│       ├── tests/
│       ├── README.md
│       └── index.ts
│
├── apps/                           # INTERFACES (entradas)
│   │
│   ├── cockpit/                    # Dashboard Web
│   │   ├── client/                 # React + Vite
│   │   │   ├── src/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── services/
│   │   │   │   └── App.tsx
│   │   │   └── package.json
│   │   ├── server/                 # Node.js backend
│   │   │   └── index.ts
│   │   └── shared/                 # Tipos compartilhados
│   │
│   ├── telegram/                   # Bot Telegram
│   │   ├── bot.ts
│   │   ├── commands/
│   │   ├── handlers/
│   │   └── index.ts
│   │
│   ├── api/                        # REST API
│   │   ├── server.ts
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── index.ts
│   │
│   └── websocket/                  # Real-time server
│       ├── server.ts
│       ├── events/
│       └── index.ts
│
├── docs/                           # DOCUMENTAÇÃO
│   ├── ESTRUTURA_DEFINITIVA.md     # Este arquivo
│   ├── HUBS_PURPOSE_GUIDE.md
│   ├── AURORA_CONTRACTS.md
│   ├── OPERATOR_GUIDE.md
│   └── MIGRATION_PLAN.md
│
├── scripts/                        # SCRIPTS DE SUPORTE
│   ├── migrate.ts                  # Migração de estrutura
│   ├── doctor.ts                   # Diagnóstico do sistema
│   ├── build.ts                    # Build customizado
│   └── test-all.ts                 # Roda todos os testes
│
├── config/                         # CONFIGURAÇÕES
│   ├── default.ts
│   ├── development.ts
│   ├── production.ts
│   └── index.ts
│
├── main.ts                         # ENTRY POINT
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. SEPARAÇÃO DE RESPONSABILIDADES

### 3.1 O QUE CADA COMPONENTE FAZ

| Componente | Verbo | Responsabilidade |
|------------|-------|------------------|
| **Core/Operator** | DECIDE | Planeja, roteia, executa steps |
| **Core/Skills** | FAZ | Executa ações atômicas (AI, File, Web...) |
| **Aurora** | VIGIA | Monitora, protege, alerta, corta |
| **Hubs** | ORQUESTRA | Coordena workflows de domínio |
| **Apps** | CONECTA | Interface humano ↔ sistema |

### 3.2 O QUE CADA UM NÃO FAZ

| Componente | Proibido |
|------------|----------|
| **Core/Operator** | Não conhece regras de negócio específicas |
| **Core/Skills** | Não decide, não orquestra |
| **Aurora** | Não executa tasks, não planeja |
| **Hubs** | Não importa outros hubs diretamente |
| **Apps** | Não executa lógica, só repassa |

---

## 4. CONTRATO OPERATOR ↔ AURORA

### 4.1 Pedido de Autorização (Operator → Aurora)

```typescript
interface AuthorizationRequest {
  execution_id: string;           // ID único
  origin: 'cockpit' | 'telegram' | 'api' | 'internal';
  plan: ExecutionStep[];          // Lista de steps
  resources: {
    files: string[];              // Arquivos envolvidos
    repos: string[];              // Repositórios
    external: string[];           // APIs externas
  };
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  permissions_needed: Permission[];
  limits: {
    max_time_ms: number;
    max_retries: number;
    max_files_changed: number;
  };
  mode: 'dry-run' | 'real';       // Simulação ou real
  user_id?: string;
  context?: Record<string, any>;
}
```

### 4.2 Resposta da Aurora (Aurora → Operator)

```typescript
interface AuthorizationResponse {
  allowed: boolean;
  level: 'green' | 'yellow' | 'orange' | 'red';
  imposed_limits?: {
    max_time_ms?: number;
    max_retries?: number;
    rate_limit?: number;          // ações por segundo
  };
  rules?: string[];               // Ex: "sem apagar arquivos"
  requires_confirmation?: boolean;
  message: string;                // Humano-legível
  reason?: string;                // Técnico
  risk_score: number;             // 0-100
}
```

### 4.3 Eventos em Tempo Real (Aurora → Operator)

```typescript
type AuroraEvent =
  | { type: 'HEALTH'; status: 'ok' | 'degraded' | 'critical' }
  | { type: 'ALERT'; metric: string; value: number; threshold: number }
  | { type: 'LIMIT'; action: string; reason: string }
  | { type: 'PAUSE'; reason: string; awaiting: 'human' | 'timeout' }
  | { type: 'CUT'; reason: string; checkpoint_id: string }
  | { type: 'RESUME'; from_checkpoint: string };
```

---

## 5. MÉTRICAS QUE AURORA VIGIA

### 5.1 Saúde do Processo

| Métrica | Threshold Amarelo | Threshold Vermelho | Ação |
|---------|-------------------|-------------------|------|
| CPU (%) | > 80% por 60s | > 90% por 120s | Limita → Corta |
| RAM (%) | > 85% | > 95% | Alerta → Corta |
| RAM crescendo | +10% em 180s | +20% em 180s | Alerta → Corta (vazamento) |
| Disco (%) | > 90% | > 95% | Alerta → Bloqueia escrita |

### 5.2 Saúde de Execução

| Métrica | Threshold Amarelo | Threshold Vermelho | Ação |
|---------|-------------------|-------------------|------|
| Tempo de tarefa | > 3x esperado | > 5x esperado | Alerta → Corta tarefa |
| Erros/minuto | > 5 | > 10 | Alerta → Modo seguro |
| Loop detectado | 10x mesma ação | 20x mesma ação | Alerta → Corta |
| Taxa de sucesso | < 80% | < 50% | Alerta → Pausa |

### 5.3 Segurança

| Situação | Ação Imediata |
|----------|---------------|
| Comando destrutivo (rm -rf, DROP) | BLOQUEIA + pede confirmação |
| Mudança > 200 arquivos | PAUSA + pede validação |
| Credencial em log | CORTA + sanitiza + alerta crítico |
| Operação em produção sem flag | BLOQUEIA |
| Acesso a .env, secrets | LOG ESPECIAL + validação |

### 5.4 Score de Risco (0-100)

```
0-29:  VERDE   → Executa normal
30-59: AMARELO → Executa com alertas
60-79: LARANJA → Pede confirmação humana
80-100: VERMELHO → Bloqueia/Corta
```

---

## 6. FLUXO OPERACIONAL COMPLETO

```
┌──────────────────────────────────────────────────────────────────┐
│                         FLUXO OPENCLAW                           │
└──────────────────────────────────────────────────────────────────┘

1. ENTRADA
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ Cockpit │    │Telegram │    │   API   │
   └────┬────┘    └────┬────┘    └────┬────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ▼
2. AURORA: PRIMEIRA VALIDAÇÃO
   ┌─────────────────────────────────────┐
   │  Rate Limiter: OK?                  │──NO──▶ 429 Too Many
   │  Circuit Breaker: Fechado?          │──NO──▶ 503 Unavailable
   │  Guardrail: Input seguro?           │──NO──▶ 400 Bad Request
   └──────────────────┬──────────────────┘
                      │ OK
                      ▼
3. OPERATOR: PLANEJA
   ┌─────────────────────────────────────┐
   │  Router: Intenção → Tipo            │
   │  Planner: Tipo → Steps              │
   │  Registry: Steps → Skills/Hubs      │
   └──────────────────┬──────────────────┘
                      │
                      ▼
4. AURORA: AUTORIZAÇÃO DO PLANO
   ┌─────────────────────────────────────┐
   │  Analisa recursos envolvidos        │
   │  Calcula score de risco             │
   │  Define limites                     │
   │  Retorna: ALLOWED / BLOCKED / ASK   │
   └──────────────────┬──────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       ALLOWED      ASK        BLOCKED
          │           │           │
          │     ┌─────▼─────┐     │
          │     │  Humano   │     │
          │     │ confirma? │     │
          │     └─────┬─────┘     │
          │       SIM │ NÃO       │
          │           │   │       │
          ▼           ▼   ▼       ▼
5. OPERATOR: EXECUTA           PARA
   ┌─────────────────────────────────────┐
   │  Para cada step:                    │
   │    1. Notifica Aurora: "iniciando"  │
   │    2. Executa skill/hub             │
   │    3. Aurora monitora em tempo real │
   │    4. Se ALERT: ajusta              │
   │    5. Se CUT: para e salva          │
   │    6. Notifica Aurora: "terminou"   │
   └──────────────────┬──────────────────┘
                      │
                      ▼
6. FINALIZAÇÃO
   ┌─────────────────────────────────────┐
   │  Salva checkpoint                   │
   │  Gera relatório                     │
   │  Atualiza métricas                  │
   │  Devolve resultado                  │
   └─────────────────────────────────────┘
```

---

## 7. REGRAS DE DEPENDÊNCIA

### 7.1 Quem pode importar quem

```
                    ┌──────────────┐
                    │     APPS     │
                    │ (entrypoints)│
                    └──────┬───────┘
                           │ importa
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │  AURORA  │   │ OPERATOR │   │   HUBS   │
     └──────────┘   └────┬─────┘   └────┬─────┘
            ▲            │              │
            │            │ importa      │ importa
            │            ▼              ▼
            │      ┌───────────────────────┐
            │      │      CORE SKILLS      │
            │      └───────────────────────┘
            │                 ▲
            └─────────────────┘
                (Aurora vigia skills)
```

### 7.2 Proibições Absolutas

```
❌ Hub NÃO importa outro Hub
❌ Core Skill NÃO importa Hub
❌ Core Skill NÃO importa Aurora
❌ Aurora NÃO executa skills
❌ App NÃO executa lógica de negócio
```

---

## 8. MAPEAMENTO ATUAL → NOVA ESTRUTURA

### 8.1 Core Skills (de `/skills/` para `/core/skills/`)

| Arquivo Atual | Destino |
|---------------|---------|
| `ai-claude.ts` | `core/skills/ai/claude.ts` |
| `ai-gpt.ts` | `core/skills/ai/gpt.ts` |
| `ai-ollama.ts` | `core/skills/ai/ollama.ts` |
| `exec-bash.ts` | `core/skills/exec/bash.ts` |
| `exec-extended.ts` | `core/skills/exec/extended.ts` |
| `file-ops.ts` | `core/skills/file/ops.ts` |
| `file-ops-advanced.ts` | `core/skills/file/advanced.ts` |
| `web-fetch.ts` | `core/skills/web/fetch.ts` |
| `browser-control.ts` | `core/skills/browser/control.ts` |
| `comm-telegram.ts` | `core/skills/comm/telegram.ts` |
| `util-misc.ts` | `core/skills/util/misc.ts` |
| `skill-base.ts` | `core/skills/base.ts` |

### 8.2 Operator Runtime (de `/skills/` para `/core/operator/`)

| Arquivo Atual | Destino |
|---------------|---------|
| `intent-router.ts` | `core/operator/router.ts` |
| `guardrail.ts` | `core/operator/guardrail.ts` |
| `registry-v2.ts` | `core/operator/registry.ts` |
| `sandbox-runner.ts` | `core/operator/sandbox.ts` |
| `skill-executor-v2.ts` | `core/operator/executor.ts` |

### 8.3 Aurora Monitor (de `/aurora-monitor-ts/` para `/aurora/`)

| Pasta/Arquivo Atual | Destino |
|---------------------|---------|
| `aurora-monitor-ts/src/core/` | `aurora/core/` |
| `aurora-monitor-ts/src/alerts/` | `aurora/alerts/` |
| `aurora-monitor-ts/src/collectors/` | `aurora/collectors/` |
| `aurora-monitor-ts/src/detectors/` | `aurora/detectors/` |
| `aurora-monitor-ts/src/healing/` | `aurora/healing/` |
| `aurora-monitor-ts/src/protection/` | `aurora/protection/` |

### 8.4 Hubs (de `/skills/` para `/hubs/`)

| Pasta/Arquivo Atual | Destino |
|---------------------|---------|
| `skills/hub-enterprise/` | `hubs/enterprise/` |
| `skills/supabase-archon/` | `hubs/supabase-archon/` |
| `skills/social-hub-*.ts` (16 arquivos) | `hubs/social-media/skills/` |

### 8.5 Apps (consolidar interfaces)

| Arquivo/Pasta Atual | Destino |
|---------------------|---------|
| `dashboard/` | `apps/cockpit/` |
| `telegram-bot.ts` | `apps/telegram/bot.ts` |
| `websocket-server.ts` | `apps/websocket/server.ts` |

---

## 9. TSCONFIG ATUALIZADO

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "downlevelIteration": true,
    "baseUrl": ".",
    "paths": {
      "@core/*": ["core/*"],
      "@aurora/*": ["aurora/*"],
      "@hubs/*": ["hubs/*"],
      "@apps/*": ["apps/*"]
    }
  },
  "include": [
    "main.ts",
    "core/**/*.ts",
    "aurora/**/*.ts",
    "hubs/**/*.ts",
    "apps/**/*.ts",
    "config/**/*.ts",
    "scripts/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/__tests__/**"
  ]
}
```

---

## 10. CHECKLIST DE MIGRAÇÃO

### Fase 1: Criar Estrutura
- [ ] Criar `/core/operator/`
- [ ] Criar `/core/skills/{ai,exec,file,web,browser,comm,util}/`
- [ ] Criar `/aurora/`
- [ ] Criar `/hubs/{enterprise,supabase-archon,social-media}/`
- [ ] Criar `/apps/{cockpit,telegram,api,websocket}/`

### Fase 2: Mover Core
- [ ] Mover skills base para `/core/skills/`
- [ ] Mover runtime para `/core/operator/`
- [ ] Criar index.ts em cada subpasta

### Fase 3: Mover Aurora
- [ ] Mover aurora-monitor-ts para `/aurora/`
- [ ] Atualizar imports

### Fase 4: Mover Hubs
- [ ] Mover hub-enterprise para `/hubs/enterprise/`
- [ ] Mover supabase-archon para `/hubs/supabase-archon/`
- [ ] Consolidar social-hub-*.ts em `/hubs/social-media/`

### Fase 5: Mover Apps
- [ ] Mover dashboard para `/apps/cockpit/`
- [ ] Mover telegram-bot.ts para `/apps/telegram/`
- [ ] Mover websocket-server.ts para `/apps/websocket/`

### Fase 6: Atualizar Imports
- [ ] Rodar script de migração de imports
- [ ] Verificar compilação: `npx tsc --noEmit`

### Fase 7: Testes
- [ ] Testar cada core skill
- [ ] Testar cada hub
- [ ] Testar aurora
- [ ] Testar cada app

### Fase 8: Limpeza
- [ ] Backup da estrutura antiga
- [ ] Remover pastas antigas
- [ ] Commit final

---

## 11. RESUMO EXECUTIVO

```
┌─────────────────────────────────────────────────────────────────┐
│                     OPENCLAW - ANATOMIA                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🧠 CORE/OPERATOR    = Cérebro (decide, planeja, executa)       │
│  💪 CORE/SKILLS      = Músculos (faz ações atômicas)            │
│  🛡️  AURORA           = Sistema Nervoso (vigia, protege, cura)  │
│  🏭 HUBS             = Fábricas (domínios especializados)       │
│  👁️  APPS             = Olhos/Ouvidos (interfaces)              │
│                                                                  │
│  ────────────────────────────────────────────────────────────   │
│                                                                  │
│  📊 NÚMEROS ATUAIS:                                             │
│     • Core Skills: 12 skills em 7 categorias                    │
│     • Aurora: 14 módulos em 6 categorias                        │
│     • Hub Enterprise: 9 personas + 6 workflows                  │
│     • Hub Supabase: 30 skills em 6 categorias                   │
│     • Hub Social: 16 skills em 4 categorias                     │
│     • Apps: 4 interfaces (Cockpit, Telegram, API, WebSocket)    │
│                                                                  │
│  🎯 BENEFÍCIOS:                                                 │
│     ✅ Separação clara de responsabilidades                     │
│     ✅ Escala horizontal (adiciona hubs sem mexer no core)      │
│     ✅ Proteção real (Aurora corta antes de explodir)           │
│     ✅ Manutenção fácil (cada pasta é autocontida)              │
│     ✅ Debug simples (logs por camada)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

**Documento criado por:** Claude Opus 4.5
**Validado com:** Estrutura atual do projeto
**Próximo passo:** Executar migração ou aprovar plano
