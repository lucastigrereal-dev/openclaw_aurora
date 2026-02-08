# 🎯 SCRIPT PARA CLAUDE OPUS DESKTOP

**Cole este texto inteiro no Claude Opus Desktop (que tem acesso ao seu PC)**

---

## CONTEXTO PARA O OPUS

Olá Opus! O Lucas precisa da sua ajuda para corrigir o repositório OpenClaw Aurora.

### O Que Aconteceu
1. O GPT reorganizou o projeto mas **DELETOU skills** (de 59 para 11)
2. Existem **2 versões desincronizadas**:
   - Windows local: commit 444be53 (GPT, 11 skills) ❌
   - GitHub remoto: commit 8aeac77 (59 skills) ✅
3. O bot Telegram está como @Prometheus mas deveria ser @Krhon

### O Que Precisa Ser Feito
1. **REVERTER** para a versão do GitHub (59 skills)
2. **REORGANIZAR** a estrutura (SEM deletar nada)
3. **CONFIGURAR** o bot correto (Krhon)

---

## PASSO 1: DIAGNÓSTICO

Execute estes comandos para entender a situação atual:

```bash
cd C:\Users\lucas\openclaw_aurora
# ou no WSL:
cd /mnt/c/Users/lucas/openclaw_aurora

# Ver commit atual
git log --oneline -1

# Ver quantas skills existem
find . -name "*.ts" -path "*/skills/*" | wc -l

# Ver remote
git remote -v

# Ver status
git status
```

---

## PASSO 2: BACKUP DO TRABALHO DO GPT

Antes de reverter, salve o que o GPT fez (pode ser útil depois):

```bash
# Criar branch de backup
git checkout -b backup-gpt-refactor

# Commitar qualquer mudança pendente
git add -A
git commit -m "backup: GPT refactor with 11 skills"

# Voltar para main
git checkout main
```

---

## PASSO 3: REVERTER PARA VERSÃO DO GITHUB (59 SKILLS)

```bash
# Buscar versão do GitHub
git fetch origin

# Resetar para versão do GitHub
git reset --hard origin/main

# Verificar
git log --oneline -1
# Deve mostrar: 8aeac77 ou similar
```

---

## PASSO 4: REORGANIZAR ESTRUTURA (SEM DELETAR)

Agora reorganize seguindo esta arquitetura:

### Estrutura Desejada

```
openclaw_aurora/
├── core/
│   ├── operator-runtime/      ← Executor (intent-router, guardrail, executor)
│   │   ├── intent-router.ts
│   │   ├── skill-executor-v2.ts
│   │   ├── telegram-bot.ts
│   │   └── state-manager.ts
│   │
│   └── core-skills/           ← Skills fundamentais
│       ├── ai/
│       │   ├── ai-claude.ts
│       │   ├── ai-gpt.ts
│       │   └── ai-ollama.ts
│       ├── exec/
│       │   ├── exec-bash.ts
│       │   └── exec-extended.ts
│       ├── file/
│       │   ├── file-ops.ts
│       │   └── file-ops-advanced.ts
│       ├── web/
│       │   └── web-fetch.ts
│       ├── browser/
│       │   └── browser-control.ts
│       ├── comm/
│       │   └── comm-telegram.ts
│       └── util/
│           └── util-misc.ts
│
├── hubs/                      ← Domínios específicos
│   ├── social-media/          ← Todos os social-hub-*.ts
│   │   ├── planner.ts
│   │   ├── publer.ts
│   │   ├── caption-ai.ts
│   │   ├── analytics.ts
│   │   └── ... (16 arquivos)
│   ├── enterprise/            ← Conteúdo do hub_enterprise_mvp/
│   │   ├── personas/
│   │   ├── router/
│   │   └── guardioes/
│   ├── marketing/
│   │   └── marketing-captacao.ts
│   ├── content/
│   │   └── content-ia.ts
│   └── analytics/
│       └── analytics-roi.ts
│
├── aurora/                    ← Monitor (já está ok em aurora-monitor-ts/)
│   └── (symlink ou mover aurora-monitor-ts/ para cá)
│
├── apps/
│   └── cockpit-dashboard/     ← Mover dashboard/ para cá
│
├── .env                       ← Configurações
├── package.json
└── tsconfig.json
```

### Comandos para Reorganizar

```bash
# Criar estrutura de pastas
mkdir -p core/operator-runtime
mkdir -p core/core-skills/{ai,exec,file,web,browser,comm,util}
mkdir -p hubs/{social-media,enterprise,marketing,content,analytics}
mkdir -p apps

# Mover Core Skills
mv skills/ai-*.ts core/core-skills/ai/
mv skills/exec-*.ts core/core-skills/exec/
mv skills/file-*.ts core/core-skills/file/
mv skills/web-*.ts core/core-skills/web/
mv skills/browser-*.ts core/core-skills/browser/
mv skills/comm-*.ts core/core-skills/comm/
mv skills/util-*.ts core/core-skills/util/

# Mover Hub Social Media
mv skills/social-hub-*.ts hubs/social-media/

# Mover Hub Enterprise
mv hub_enterprise_mvp/* hubs/enterprise/

# Mover Hub Marketing/Content/Analytics
mv skills/marketing-*.ts hubs/marketing/
mv skills/content-*.ts hubs/content/
mv skills/analytics-*.ts hubs/analytics/
mv skills/reviews-*.ts hubs/analytics/

# Mover Operator Runtime
mv skill-executor-v2.ts core/operator-runtime/
mv telegram-bot.ts core/operator-runtime/
mv skills/intent-router.ts core/operator-runtime/

# Mover Dashboard
mv dashboard apps/cockpit-dashboard

# Renomear Aurora
mv aurora-monitor-ts aurora
```

---

## PASSO 5: ATUALIZAR IMPORTS

Depois de mover os arquivos, você precisa atualizar os imports em cada arquivo.

### Exemplo de Atualização

**Antes:**
```typescript
import { Skill } from './skill-base';
import { executeSkill } from '../skill-executor-v2';
```

**Depois:**
```typescript
import { Skill } from '../../core/core-skills/skill-base';
import { executeSkill } from '../../core/operator-runtime/skill-executor-v2';
```

### Script para Ajudar

```bash
# Listar todos os arquivos que precisam de update
grep -r "from '\./\|from \"\.\/" --include="*.ts" .

# Para cada arquivo, atualizar manualmente ou usar sed
```

---

## PASSO 6: CONFIGURAR BOT KRHON

Editar o arquivo `.env`:

```bash
# Criar ou editar .env
cat > .env << 'EOF'
# Telegram Bot - KRHON (não Prometheus!)
TELEGRAM_BOT_TOKEN=SEU_TOKEN_DO_KRHON_AQUI
TELEGRAM_CHAT_ID=SEU_CHAT_ID

# Outras configs
NODE_ENV=development
PORT=3000
EOF
```

**IMPORTANTE:** O Lucas precisa fornecer o token correto do bot Krhon!

---

## PASSO 7: ATUALIZAR PACKAGE.JSON

```json
{
  "scripts": {
    "dev": "ts-node core/operator-runtime/telegram-bot.ts",
    "bot": "ts-node --transpile-only core/operator-runtime/telegram-bot.ts",
    "opencloud": "ts-node start-opencloud.ts",
    "cli": "ts-node cli.ts",
    "build": "tsc",
    "test": "npm run smoke:skills",
    "smoke:skills": "ts-node test-skills.ts"
  }
}
```

---

## PASSO 8: CRIAR INDEX PARA CADA MÓDULO

### core/core-skills/index.ts
```typescript
// Core Skills Index
export * from './ai/ai-claude';
export * from './ai/ai-gpt';
export * from './ai/ai-ollama';
export * from './exec/exec-bash';
export * from './exec/exec-extended';
export * from './file/file-ops';
export * from './file/file-ops-advanced';
export * from './web/web-fetch';
export * from './browser/browser-control';
export * from './comm/comm-telegram';
export * from './util/util-misc';
```

### hubs/social-media/index.ts
```typescript
// Social Media Hub Index
export * from './social-hub-planner';
export * from './social-hub-publer';
export * from './social-hub-caption-ai';
export * from './social-hub-analytics';
// ... adicionar todos os 16 arquivos
```

---

## PASSO 9: TESTAR

```bash
# Verificar estrutura
tree -L 3 -I node_modules

# Instalar dependências
npm install

# Testar build
npm run build

# Testar bot
npm run bot

# Se tudo funcionar, commitar
git add -A
git commit -m "refactor: reorganize structure (core/hubs/aurora/apps) - 59 skills preserved"

# Push para GitHub
git push origin main
```

---

## CHECKLIST FINAL

- [ ] Backup do trabalho do GPT criado
- [ ] Revertido para 59 skills
- [ ] Estrutura reorganizada (core/hubs/aurora/apps)
- [ ] Imports atualizados
- [ ] Bot Krhon configurado no .env
- [ ] Package.json atualizado
- [ ] Index files criados
- [ ] Build funcionando
- [ ] Bot funcionando
- [ ] Commit e push feitos

---

## SE DER ERRO

Se algo quebrar durante a reorganização:

```bash
# Voltar para versão do GitHub
git reset --hard origin/main

# Ou voltar para backup do GPT
git checkout backup-gpt-refactor
```

---

## NOTAS IMPORTANTES

1. **NÃO DELETE SKILLS** - Apenas mova para pastas corretas
2. **AURORA = MONITOR** - Não executa, apenas observa
3. **OPERATOR = EXECUTOR** - Este que executa as skills
4. **59 SKILLS** - Todas devem ser preservadas
5. **BOT KRHON** - Usar o token correto

---

**Boa sorte, Opus! O Lucas conta com você para arrumar essa bagunça! 🚀**
