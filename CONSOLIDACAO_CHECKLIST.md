# ✅ CHECKLIST DE CONSOLIDAÇÃO - OpenClaw Aurora

**Data:** 06/02/2026
**Status:** Fases 1-4, 6, 8 COMPLETAS | Fases 5, 5B, 7 PENDENTES

---

## 📋 CHECKLIST GERAL

### ✅ JÁ FEITO (Local no Linux)
```
[✅] FASE 1: Backup criado (backup/pre-consolidacao-20260206)
[✅] FASE 2: Branch main criada e ativa
[✅] FASE 3: 304 arquivos commitados (código + relatórios)
[✅] FASE 4: Tokens removidos de deploy-now.ps1
[✅] FASE 6: deploy.yml atualizado (só main no trigger)
[✅] FASE 8: CANONICAL_MAP.md criado e documentado
```

### ⏳ PENDENTE (Windows + Manual)

```
[⏳] FASE 5: git push origin main -u (Windows)
[⏳] FASE 5B: Atualizar GitHub Secrets (CRÍTICO!)
[⏳] FASE 7: Arquivar repo OPencclaw_aurora_completo (Manual)
[⏳] FASE 9: Revogar tokens antigos (Railways + Vercel)
[⏳] FASE 10: Trocar Default Branch no GitHub
```

---

## 🪟 FASE 5: PUSH DO WINDOWS

**No seu PowerShell Windows:**

```powershell
cd C:\Users\lucas\openclaw_aurora

# Verificar branch
git branch --show-current
# Output esperado: main

# Verificar commits
git log --oneline -5
# Output esperado: 7559600, e296c0a, 2f33f8c, ...

# Fazer push
git push origin main -u

# Verificar que subiu
git log --oneline -3
git branch -vv
```

**Esperado:**
```
main → origin/main [ahead 0, behind 0]
```

---

## 🔐 FASE 5B: ATUALIZAR GITHUB SECRETS (CRÍTICO!)

**URL:** https://github.com/lucastigrereal-dev/openclaw_aurora/settings/secrets/actions

### Secrets Necessários

| Secret Name | Valor | Fonte | Observação |
|------------|-------|-------|-----------|
| **RAILWAY_TOKEN** | `<novo-token>` | Railway Dashboard | ⚠️ **NOVO** - Revogar token antigo |
| **VERCEL_TOKEN** | `<novo-token>` | Vercel Settings | ⚠️ **NOVO** - Revogar token antigo |
| **VERCEL_ORG_ID** | `lucas-projects-ffa9a1fb` | Vercel Dashboard | Mesmo de antes |
| **VERCEL_PROJECT_ID** | `prj_xxxxx...` | Vercel Project | ⚠️ **VERIFICAR** |
| **WEBSOCKET_URL** | `wss://openclawaurora-production.up.railway.app/api/v1/ws` | Railway URL | Mesmo de antes |

### Como Encontrar Cada Secret

#### 1. RAILWAY_TOKEN (Novo)
```
1. Abrir: https://dashboard.railway.app
2. Settings (engrenagem no canto inferior)
3. API Tokens
4. Create New Token
5. Copiar o token gerado
```

#### 2. VERCEL_TOKEN (Novo)
```
1. Abrir: https://vercel.com/account/tokens
2. Create Token
3. Name: openclaw-aurora-github-actions
4. Scope: Full Account
5. Copiar o token
```

#### 3. VERCEL_ORG_ID
```
Já temos: lucas-projects-ffa9a1fb
Não precisa mudar (usar mesmo de antes)
```

#### 4. VERCEL_PROJECT_ID (Verificar!)
```
1. Abrir: https://vercel.com/dashboard
2. Selecionar projeto: openclaw-aurora
3. Settings → General
4. Procurar: Project ID
5. Copiar o valor (ex: prj_xxxxx...)
```

#### 5. WEBSOCKET_URL
```
Já temos: wss://openclawaurora-production.up.railway.app/api/v1/ws
Não precisa mudar (usar mesmo)
```

### Adicionar Secrets no GitHub

**Para cada secret acima:**

```
1. Abrir: https://github.com/lucastigrereal-dev/openclaw_aurora/settings/secrets/actions
2. Clicar: "New repository secret"
3. Name: (ex. RAILWAY_TOKEN)
4. Value: (colar o valor)
5. Click: "Add secret"
```

**Checklist de Adição:**
```
[  ] RAILWAY_TOKEN adicionado
[  ] VERCEL_TOKEN adicionado
[  ] VERCEL_ORG_ID adicionado (ou deixar igual)
[  ] VERCEL_PROJECT_ID adicionado
[  ] WEBSOCKET_URL adicionado (ou deixar igual)
```

### Validar Secrets

Depois de adicionar, clique em cada um pra ver se tem um ✅ verde:

```
✅ RAILWAY_TOKEN        (Updated 2 minutes ago)
✅ VERCEL_TOKEN          (Updated 1 minute ago)
✅ VERCEL_ORG_ID         (Updated just now)
✅ VERCEL_PROJECT_ID     (Updated just now)
✅ WEBSOCKET_URL         (Updated just now)
```

---

## 📝 FASE 7: ARQUIVAR REPO FANTASMA

**Manual no GitHub:**

```
1. Abrir: https://github.com/lucastigrereal-dev/OPencclaw_aurora_completo/settings
2. Scroll até "Danger Zone"
3. Clicar: "Archive this repository"
4. Confirmar: digitando o nome do repo
```

**Status Esperado:**
```
[Archived]  This repository is now archived and read-only.
```

---

## 🔐 FASE 9: REVOGAR TOKENS ANTIGOS

### Railway

```
1. Abrir: https://dashboard.railway.app
2. Settings → API Tokens
3. Procurar token antigo: ad44146e-e0a2-4a56-886a-244b47c9aec6
4. Clicar: "Delete" (ícone de lixo)
5. Confirmar
```

**⚠️ Aviso:** Isso vai quebrar qualquer coisa que usa o token antigo. Garantir que o novo está nos GitHub Secrets ANTES de revogar.

### Vercel

```
1. Abrir: https://vercel.com/account/tokens
2. Procurar token antigo: 1xZDeGW1lg5RvNoUzOexBXas
3. Clicar no token
4. Clicar: "Delete"
5. Confirmar
```

---

## 🌿 FASE 10: TROCAR DEFAULT BRANCH

**No GitHub:**

```
1. Abrir: https://github.com/lucastigrereal-dev/openclaw_aurora/settings
2. Procurar: "Default branch"
3. Clicar no dropdown: main (muda de claude/monitoring-crash-prevention-Qx84d)
4. Clicar: "Update"
```

**Esperado:**
```
Default branch: main
🔔 Ensure all pull requests target the correct branch
```

---

## 🧪 TESTE DE DEPLOY (Após tudo acima)

### 1. Trigger GitHub Actions

```
1. Abrir: https://github.com/lucastigrereal-dev/openclaw_aurora/actions
2. Selecionar workflow: "Deploy OpenClaw Aurora"
3. Clicar: "Run workflow" (azul)
4. Confirmar
```

### 2. Monitorar Build

```
Status esperado após 2-3 min:
✅ deploy-backend (Railway) - SUCCESS
✅ deploy-dashboard (Vercel) - SUCCESS

Se falhar:
❌ Abrir logs (clique no job)
❌ Verificar se secrets estão corretos
❌ Verificar se Railway/Vercel estão up
```

### 3. Validar Produção

```
Railway Backend:
curl https://openclawaurora-production.up.railway.app/health
# Esperado: 200 OK + JSON com status

Vercel Dashboard:
curl https://openclaw-aurora.vercel.app
# Esperado: 200 OK + HTML da página

WebSocket:
Abrir dashboard no navegador
Status esperado: "Connected to WebSocket" ✅
```

---

## 📊 RESUMO EXECUTIVO

### O que foi feito
```
✅ Backup de segurança criado
✅ Branch main criada e consolidada
✅ Código + relatórios commitados
✅ Tokens removidos de arquivo (usando env vars)
✅ CI/CD atualizado (deploy.yml)
✅ Documentação completada (CANONICAL_MAP.md)
```

### O que falta (YOU)
```
⏳ Push dos commits (git push origin main -u)
⏳ Atualizar 5 GitHub Secrets
⏳ Arquivar repo OPencclaw_aurora_completo
⏳ Revogar tokens antigos
⏳ Trocar default branch pra main
⏳ Testar deploy automático
```

### Tempo Total
```
Local (Linux):      ~20 minutos ✅ CONCLUÍDO
Windows (Push):     ~5 minutos
Manual (GitHub):    ~10 minutos
Revogar tokens:     ~5 minutos
Teste:              ~5 minutos
─────────────────────────
TOTAL:             ~45 minutos
```

---

## 🚨 AVISOS IMPORTANTES

### 1. Tokens no Histórico Git
```
⚠️ Os tokens AINDA estão em commits antigos (c1a8f75, 6be945d)
✅ Mas a partir de agora o arquivo é seguro
🔐 Revogar tokens antigos remove o risco imediato
```

### 2. GitHub Actions Pode Falhar
```
Se falhar no primeiro push:
1. Verifique os secrets no GitHub
2. Verifique que Railway/Vercel estão online
3. Clique em "Re-run jobs" no GitHub Actions
```

### 3. Backup Seguro
```
[✅] backup/pre-consolidacao-20260206 existe
✅ Se algo der ruim, volta nela: git checkout backup/pre-consolidacao-20260206
```

---

## ✅ PRÓXIMAS AÇÕES - ORDEM EXATA

```
1️⃣  Windows: git push origin main -u
2️⃣  GitHub: Adicionar 5 secrets (RAILWAY_TOKEN, VERCEL_TOKEN, etc)
3️⃣  GitHub: Arquivar OPencclaw_aurora_completo
4️⃣  Railway: Revogar token antigo
5️⃣  Vercel: Revogar token antigo
6️⃣  GitHub: Trocar default branch pra main
7️⃣  GitHub Actions: Trigger manual deploy
8️⃣  Teste: Verificar Railway + Vercel + WebSocket
9️⃣  PRONTO! 🚀
```

---

**Criado por:** Claude Code
**Data:** 06/02/2026
**Arquivo:** CONSOLIDACAO_CHECKLIST.md
**Status:** Pronto pra você executar no Windows
