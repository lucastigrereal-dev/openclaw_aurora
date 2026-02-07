# PLANO DE MIGRAÇÃO: Estrutura OpenClaw Aurora

**Versão:** 1.0
**Data:** 2026-02-07
**Status:** APROVADO PARA REVISÃO

---

## 📊 DIAGNÓSTICO ATUAL

### Estrutura Presente
```
/openclaw_aurora/
├── skills/                          ← PROBLEMA: Tudo misturado aqui
│   ├── ai-claude.ts                 ← Core Skill
│   ├── ai-gpt.ts                    ← Core Skill
│   ├── ai-ollama.ts                 ← Core Skill
│   ├── exec-bash.ts                 ← Core Skill
│   ├── exec-extended.ts             ← Core Skill
│   ├── file-ops.ts                  ← Core Skill
│   ├── file-ops-advanced.ts         ← Core Skill
│   ├── web-fetch.ts                 ← Core Skill
│   ├── comm-telegram.ts             ← Core Skill
│   ├── util-misc.ts                 ← Core Skill
│   ├── intent-router.ts             ← RUNTIME (não é skill)
│   ├── guardrail.ts                 ← RUNTIME (não é skill)
│   ├── registry-v2.ts               ← RUNTIME (não é skill)
│   ├── skill-base.ts                ← Base class
│   ├── sandbox-runner.ts            ← RUNTIME
│   ├── skill-scaffolder.ts          ← Utility
│   ├── index.ts                     ← Registry
│   ├── social-hub-*.ts (16 arquivos) ← HUB ESPALHADO!
│   ├── hub-enterprise/              ← Hub OK (pasta)
│   └── supabase-archon/             ← Hub OK (pasta, bloqueado)
├── aurora-monitor-ts/               ← Monitor OK (pasta separada)
├── dashboard/                       ← Cockpit OK (pasta separada)
└── hub_enterprise_mvp/              ← MVP standalone (bash scripts)
```

### Problemas Identificados

| # | Problema | Impacto |
|---|----------|---------|
| 1 | Core Skills misturados com Hubs | Confusão de responsabilidades |
| 2 | Runtime (router, guardrail) dentro de /skills | Arquitetura incorreta |
| 3 | Social Hub como 16 arquivos soltos | Impossível manter |
| 4 | Supabase Archon bloqueado no tsconfig | 30 skills inacessíveis |
| 5 | Guardrail não listado no tsconfig | Não compila |
| 6 | Sem separação clara core/hubs | Difícil escalar |

---

## 🎯 ESTRUTURA ALVO

```
/openclaw_aurora/
├── core/
│   ├── runtime/                     ← Orquestração (NÃO FAZ, DECIDE)
│   │   ├── operator.ts              ← Entry point principal
│   │   ├── router.ts                ← intent-router renomeado
│   │   ├── guardrail.ts             ← Segurança
│   │   ├── registry.ts              ← registry-v2 renomeado
│   │   ├── executor.ts              ← skill-executor-v2 movido
│   │   ├── sandbox.ts               ← sandbox-runner renomeado
│   │   └── index.ts                 ← Exports
│   │
│   └── skills/                      ← Capacidades fundamentais (FAZ)
│       ├── ai/
│       │   ├── claude.ts
│       │   ├── gpt.ts
│       │   ├── ollama.ts
│       │   └── index.ts
│       ├── exec/
│       │   ├── bash.ts
│       │   ├── extended.ts
│       │   └── index.ts
│       ├── file/
│       │   ├── ops.ts
│       │   ├── advanced.ts
│       │   └── index.ts
│       ├── web/
│       │   ├── fetch.ts
│       │   └── index.ts
│       ├── comm/
│       │   ├── telegram.ts
│       │   └── index.ts
│       ├── util/
│       │   ├── misc.ts
│       │   └── index.ts
│       ├── base.ts                  ← skill-base renomeado
│       └── index.ts                 ← Export all skills
│
├── hubs/
│   ├── enterprise/                  ← hub-enterprise movido
│   │   ├── orchestrator.ts
│   │   ├── types.ts
│   │   ├── personas/
│   │   ├── shared/
│   │   ├── tests/
│   │   └── index.ts
│   │
│   ├── supabase/                    ← supabase-archon movido
│   │   ├── orchestrator.ts
│   │   ├── skills/ (30 skills)
│   │   ├── tests/
│   │   └── index.ts
│   │
│   └── social/                      ← social-hub-*.ts consolidados
│       ├── orchestrator.ts
│       ├── skills/
│       │   ├── caption-ai.ts
│       │   ├── hashtag-ai.ts
│       │   ├── publer.ts
│       │   ├── analytics.ts
│       │   └── ... (12 skills)
│       ├── tests/
│       └── index.ts
│
├── monitor/                         ← aurora-monitor-ts movido
│   └── aurora/
│       ├── alerts/
│       ├── collectors/
│       ├── detectors/
│       ├── healing/
│       ├── protection/
│       └── index.ts
│
├── cockpit/                         ← dashboard renomeado
│   ├── client/
│   ├── server/
│   └── shared/
│
├── main.ts                          ← Entry point (importa core/runtime)
├── telegram-bot.ts
├── websocket-server.ts
└── package.json
```

---

## 📋 PLANO DE MIGRAÇÃO DETALHADO

### FASE 1: Criar Estrutura Base (sem mover nada)

```bash
# 1.1 Criar diretórios
mkdir -p core/runtime
mkdir -p core/skills/ai
mkdir -p core/skills/exec
mkdir -p core/skills/file
mkdir -p core/skills/web
mkdir -p core/skills/comm
mkdir -p core/skills/util
mkdir -p hubs/enterprise
mkdir -p hubs/supabase
mkdir -p hubs/social/skills
mkdir -p monitor/aurora
mkdir -p cockpit
```

**Resultado:** Estrutura vazia pronta.

---

### FASE 2: Migrar Core Runtime

```bash
# 2.1 Mover arquivos de runtime
cp skills/intent-router.ts core/runtime/router.ts
cp skills/guardrail.ts core/runtime/guardrail.ts
cp skills/registry-v2.ts core/runtime/registry.ts
cp skills/sandbox-runner.ts core/runtime/sandbox.ts
cp skill-executor-v2.ts core/runtime/executor.ts
```

**2.2 Criar `core/runtime/index.ts`:**
```typescript
// core/runtime/index.ts
export * from './router';
export * from './guardrail';
export * from './registry';
export * from './sandbox';
export * from './executor';
```

---

### FASE 3: Migrar Core Skills

```bash
# 3.1 Mover AI skills
cp skills/ai-claude.ts core/skills/ai/claude.ts
cp skills/ai-gpt.ts core/skills/ai/gpt.ts
cp skills/ai-ollama.ts core/skills/ai/ollama.ts

# 3.2 Mover EXEC skills
cp skills/exec-bash.ts core/skills/exec/bash.ts
cp skills/exec-extended.ts core/skills/exec/extended.ts

# 3.3 Mover FILE skills
cp skills/file-ops.ts core/skills/file/ops.ts
cp skills/file-ops-advanced.ts core/skills/file/advanced.ts

# 3.4 Mover WEB skills
cp skills/web-fetch.ts core/skills/web/fetch.ts

# 3.5 Mover COMM skills
cp skills/comm-telegram.ts core/skills/comm/telegram.ts

# 3.6 Mover UTIL skills
cp skills/util-misc.ts core/skills/util/misc.ts

# 3.7 Mover base class
cp skills/skill-base.ts core/skills/base.ts
```

**3.8 Criar index.ts para cada subpasta:**
```typescript
// core/skills/ai/index.ts
export * from './claude';
export * from './gpt';
export * from './ollama';
```

**3.9 Criar `core/skills/index.ts`:**
```typescript
// core/skills/index.ts
export * from './base';
export * from './ai';
export * from './exec';
export * from './file';
export * from './web';
export * from './comm';
export * from './util';
```

---

### FASE 4: Migrar Hubs

```bash
# 4.1 Hub Enterprise (já organizado, só mover)
cp -r skills/hub-enterprise/* hubs/enterprise/

# 4.2 Hub Supabase (já organizado, só mover)
cp -r skills/supabase-archon/* hubs/supabase/

# 4.3 Hub Social (precisa consolidar)
mkdir -p hubs/social/skills
cp skills/social-hub-orchestrator.ts hubs/social/orchestrator.ts
cp skills/social-hub-config.ts hubs/social/config.ts
cp skills/social-hub-index.ts hubs/social/index.ts
cp skills/social-hub-caption-ai.ts hubs/social/skills/caption-ai.ts
cp skills/social-hub-hashtag-ai.ts hubs/social/skills/hashtag-ai.ts
cp skills/social-hub-video-enricher.ts hubs/social/skills/video-enricher.ts
cp skills/social-hub-publer.ts hubs/social/skills/publer.ts
cp skills/social-hub-publer-v2.ts hubs/social/skills/publer-v2.ts
cp skills/social-hub-planner.ts hubs/social/skills/planner.ts
cp skills/social-hub-analytics.ts hubs/social/skills/analytics.ts
cp skills/social-hub-analytics-collector.ts hubs/social/skills/analytics-collector.ts
cp skills/social-hub-inventory.ts hubs/social/skills/inventory.ts
cp skills/social-hub-database-manager.ts hubs/social/skills/database-manager.ts
cp skills/social-hub-approval-workflow.ts hubs/social/skills/approval-workflow.ts
cp skills/social-hub-quota-enforcer.ts hubs/social/skills/quota-enforcer.ts
cp skills/social-hub-observability.ts hubs/social/skills/observability.ts
```

---

### FASE 5: Migrar Monitor e Cockpit

```bash
# 5.1 Monitor
cp -r aurora-monitor-ts/* monitor/aurora/

# 5.2 Cockpit
cp -r dashboard/* cockpit/
```

---

### FASE 6: Atualizar Imports

Este é o passo mais crítico. Todos os arquivos precisam ter imports atualizados.

**Mapeamento de imports:**

| Antigo | Novo |
|--------|------|
| `from './skills/ai-claude'` | `from './core/skills/ai/claude'` |
| `from './skills/intent-router'` | `from './core/runtime/router'` |
| `from './skills/guardrail'` | `from './core/runtime/guardrail'` |
| `from './skills/hub-enterprise'` | `from './hubs/enterprise'` |
| `from './skills/social-hub-*'` | `from './hubs/social/skills/*'` |
| `from './aurora-monitor-ts'` | `from './monitor/aurora'` |
| `from './dashboard'` | `from './cockpit'` |

**Script de atualização (Node.js):**
```javascript
// update-imports.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const mappings = [
  [/from ['"]\.\/skills\/ai-claude['"]/g, "from './core/skills/ai/claude'"],
  [/from ['"]\.\/skills\/ai-gpt['"]/g, "from './core/skills/ai/gpt'"],
  [/from ['"]\.\/skills\/ai-ollama['"]/g, "from './core/skills/ai/ollama'"],
  [/from ['"]\.\/skills\/exec-bash['"]/g, "from './core/skills/exec/bash'"],
  [/from ['"]\.\/skills\/exec-extended['"]/g, "from './core/skills/exec/extended'"],
  [/from ['"]\.\/skills\/file-ops['"]/g, "from './core/skills/file/ops'"],
  [/from ['"]\.\/skills\/web-fetch['"]/g, "from './core/skills/web/fetch'"],
  [/from ['"]\.\/skills\/comm-telegram['"]/g, "from './core/skills/comm/telegram'"],
  [/from ['"]\.\/skills\/util-misc['"]/g, "from './core/skills/util/misc'"],
  [/from ['"]\.\/skills\/intent-router['"]/g, "from './core/runtime/router'"],
  [/from ['"]\.\/skills\/guardrail['"]/g, "from './core/runtime/guardrail'"],
  [/from ['"]\.\/skills\/registry-v2['"]/g, "from './core/runtime/registry'"],
  [/from ['"]\.\/skills\/skill-base['"]/g, "from './core/skills/base'"],
  [/from ['"]\.\/skills\/hub-enterprise/g, "from './hubs/enterprise"],
  [/from ['"]\.\/skills\/supabase-archon/g, "from './hubs/supabase"],
  [/from ['"]\.\/skills\/social-hub-/g, "from './hubs/social/"],
];

glob.sync('**/*.ts', { ignore: ['node_modules/**', 'dist/**'] }).forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  mappings.forEach(([pattern, replacement]) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`Updated: ${file}`);
  }
});
```

---

### FASE 7: Atualizar tsconfig.json

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
      "@hubs/*": ["hubs/*"],
      "@monitor/*": ["monitor/*"],
      "@cockpit/*": ["cockpit/*"]
    }
  },
  "include": [
    "*.ts",
    "core/**/*.ts",
    "hubs/**/*.ts",
    "monitor/**/*.ts",
    "cockpit/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/__tests__/**",
    "skills/**"  // Excluir pasta antiga após migração
  ]
}
```

---

### FASE 8: Limpeza

```bash
# 8.1 Backup da pasta antiga
mv skills skills.backup.$(date +%Y%m%d)

# 8.2 Backup outros
mv aurora-monitor-ts aurora-monitor-ts.backup
mv dashboard dashboard.backup

# 8.3 Testar compilação
npm run build

# 8.4 Se tudo OK, deletar backups
# rm -rf skills.backup.*
# rm -rf aurora-monitor-ts.backup
# rm -rf dashboard.backup
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Após Fase 7 (antes de deletar backups):

- [ ] `npm run build` compila sem erros
- [ ] `npm run test` passa todos os testes
- [ ] Telegram bot responde
- [ ] Hub Enterprise executa workflow
- [ ] Dashboard carrega
- [ ] Monitor Aurora inicia

### Comandos de Teste:

```bash
# Compilar
npx tsc --noEmit

# Testar skill individual
npx ts-node -e "import { ClaudeSkill } from './core/skills/ai/claude'; console.log(ClaudeSkill);"

# Testar hub
npx ts-node -e "import { HubEnterprise } from './hubs/enterprise'; console.log(HubEnterprise);"

# Iniciar bot
npx ts-node telegram-bot.ts
```

---

## 📊 MÉTRICAS DE SUCESSO

| Métrica | Antes | Depois |
|---------|-------|--------|
| Arquivos na raiz de /skills | 50+ | 0 |
| Hubs em pastas próprias | 2/3 | 3/3 |
| Core skills organizados | Não | Sim |
| Runtime separado | Não | Sim |
| tsconfig limpo | Não | Sim |
| Supabase compilando | Não | Sim |
| Social Hub compilando | Não | Sim |

---

## ⚠️ RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Imports quebrados | Alta | Script automático + testes |
| Circular dependencies | Média | Core não importa hubs |
| Testes falhando | Média | Rodar testes após cada fase |
| Downtime do bot | Alta durante migração | Fazer em horário off-peak |

---

## 🕐 ORDEM DE EXECUÇÃO RECOMENDADA

1. **Backup completo** antes de começar
2. **Fase 1-3** juntas (core primeiro)
3. **Testar core** isoladamente
4. **Fase 4** (hubs um por vez)
5. **Testar cada hub** após mover
6. **Fase 5** (monitor + cockpit)
7. **Fase 6** (imports - mais demorado)
8. **Fase 7** (tsconfig)
9. **Testes finais**
10. **Fase 8** (limpeza) - só se tudo passar

---

## 📝 NOTAS FINAIS

Este plano foi desenhado para:
- **Zero perda de funcionalidade**
- **Rollback fácil** (backups em cada fase)
- **Validação incremental** (testes entre fases)
- **Estrutura enterprise** que escala

A migração pode ser feita em **1 sessão** se executada sem interrupções, ou **dividida em dias** seguindo as fases.

---

**Aprovado por:** Claude Opus 4.5
**Próximo passo:** Confirmar com usuário antes de executar
