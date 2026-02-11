# ✅ Checklist de Integração Kommo ↔ OpenClaw Aurora

> **Status**: Implementação concluída, aguardando configuração de credenciais e testes

---

## 📋 FASE 1: Preparação Local (COMPLETO ✅)

- [x] **Token de segurança do webhook gerado**
  - Token: `kRkMC0tsz2vjNzHVLFIuzH_FJGOGOaEqNsRH2relqNs`
  - Salvo em: `.env.kommo`

- [x] **Estrutura de pastas criada**
  - `~/.openclaw/hooks/transforms/` ✓
  - `~/.openclaw/hooks/logs/` ✓

- [x] **Transform function implementada**
  - Arquivo: `~/.openclaw/hooks/transforms/kommo-transform.js` ✓
  - Normaliza todos os eventos do Kommo (leads, contacts, notes, tasks) ✓

- [x] **Migrations SQL do Supabase criadas**
  - Arquivo: `supabase/migrations/20260211_kommo_integration.sql` ✓
  - Tabelas: `kommo_leads`, `kommo_eventos`, `kommo_interacoes`, `kommo_config` ✓
  - Functions, triggers, views, indexes ✓

- [x] **SOUL.md do SDR Agent criado**
  - Arquivo: `agents/sdr-kommo/SOUL.md` ✓
  - Regras de negócio do Instituto Rodovanski ✓
  - Workflows por tipo de evento ✓
  - Critérios de escalação ✓

- [x] **Configuração do OpenClaw criada**
  - Arquivo: `.openclaw.json` ✓
  - 6 mappings de webhooks configurados ✓
  - Agent SDR configurado ✓
  - Gateway e logging configurados ✓

- [x] **Scripts e documentação criados**
  - `scripts/test-kommo-webhook.sh` ✓
  - `scripts/get-kommo-pipeline-ids.js` ✓
  - `docs/GUIA_OAUTH_KOMMO.md` ✓
  - `docs/CHECKLIST_INTEGRACAO_KOMMO.md` (este arquivo) ✓

---

## 📋 FASE 2: Configuração de Credenciais (PENDENTE ⏳)

### 2.1 — Criar OAuth App no Kommo

- [ ] Acessar: https://rodovanski.kommo.com → Configurações → Integrações
- [ ] Criar integração: "OpenClaw Aurora SDR"
- [ ] Configurar Redirect URI: `http://localhost:18789/kommo/callback` (local)
- [ ] Marcar permissões: Contacts, Leads, Tasks, Notes (todas R/W)
- [ ] Anotar `CLIENT_ID` e `CLIENT_SECRET`
- [ ] Instalar a integração na conta
- [ ] Anotar `ACCESS_TOKEN` e `REFRESH_TOKEN`

**📖 Guia completo**: `docs/GUIA_OAUTH_KOMMO.md`

### 2.2 — Extrair Pipeline IDs

- [ ] Preencher `.env.kommo` com credenciais OAuth
- [ ] Rodar: `node scripts/get-kommo-pipeline-ids.js`
- [ ] Copiar variáveis de `.env.kommo.pipeline_ids` para `.env.kommo`
- [ ] Mapear estágios relevantes (novo, qualificando, proposta, ganho, perdido)

### 2.3 — Configurar Supabase

- [ ] Criar projeto no Supabase: https://supabase.com
- [ ] Anotar `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`
- [ ] Rodar migration: `psql -h db.xxx.supabase.co -U postgres -f supabase/migrations/20260211_kommo_integration.sql`
- [ ] Ou usar Supabase Dashboard → SQL Editor → colar e executar migration
- [ ] Verificar tabelas criadas: `kommo_leads`, `kommo_eventos`, `kommo_interacoes`, `kommo_config`

### 2.4 — Preencher .env.kommo

Verificar se todas as variáveis estão preenchidas:

```bash
# OAuth Kommo
KOMMO_DOMAIN=rodovanski
KOMMO_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
KOMMO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KOMMO_ACCESS_TOKEN=eyJ0eXAi...
KOMMO_REFRESH_TOKEN=def502...

# Pipeline IDs
KOMMO_PIPELINE_ID=12345678
KOMMO_STAGE_NOVO=11111111
KOMMO_STAGE_PRIMEIRO_CONTATO=22222222
KOMMO_STAGE_QUALIFICANDO=33333333
KOMMO_STAGE_PROPOSTA=44444444
KOMMO_STAGE_NEGOCIANDO=55555555
KOMMO_STAGE_AGENDADO=66666666
KOMMO_STAGE_GANHO=77777777
KOMMO_STAGE_PERDIDO=88888888

# Webhook Token (já preenchido)
KOMMO_WEBHOOK_TOKEN=kRkMC0tsz2vjNzHVLFIuzH_FJGOGOaEqNsRH2relqNs

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...

# SDR Config (já preenchido)
SDR_HORARIO_INICIO=08:00
SDR_HORARIO_FIM=20:00
SDR_TIMEZONE=America/Sao_Paulo
SDR_MAX_FOLLOWUPS=4
```

---

## 📋 FASE 3: Testes Locais (PENDENTE ⏳)

### 3.1 — Iniciar Gateway Aurora

- [ ] Carregar variáveis de ambiente: `source .env.kommo`
- [ ] Iniciar gateway: `openclaw gateway start` (ou comando equivalente)
- [ ] Verificar logs: `tail -f ~/.openclaw/logs/gateway.log`
- [ ] Confirmar que está rodando em: `http://localhost:18789`

### 3.2 — Testar Webhook Localmente

- [ ] Dar permissão de execução: `chmod +x scripts/test-kommo-webhook.sh`
- [ ] Rodar testes: `./scripts/test-kommo-webhook.sh`
- [ ] Verificar que todos os 7 testes retornam HTTP 200
- [ ] Verificar logs do gateway para ver se hooks foram acionados

### 3.3 — Validar Processamento no Supabase

- [ ] Conectar ao Supabase e verificar tabelas:

```sql
-- Ver eventos processados
SELECT * FROM kommo_eventos ORDER BY created_at DESC LIMIT 10;

-- Ver leads criados
SELECT * FROM kommo_leads WHERE kommo_id = 99999;

-- Ver interações
SELECT * FROM kommo_interacoes WHERE kommo_lead_id = 99999;
```

- [ ] Confirmar que dados foram inseridos corretamente
- [ ] Confirmar que score foi calculado
- [ ] Confirmar que urgência foi classificada

### 3.4 — Teste Manual com Kommo Real

- [ ] Criar um lead de teste no Kommo manualmente
- [ ] Verificar logs do Aurora: `tail -f ~/.openclaw/logs/gateway.log`
- [ ] Confirmar que webhook foi recebido e processado
- [ ] Verificar no Supabase se lead foi criado

---

## 📋 FASE 4: Deploy Produção (PENDENTE ⏳)

### 4.1 — Configurar Variáveis no Railway

- [ ] Acessar projeto no Railway: https://railway.app
- [ ] Adicionar todas as variáveis do `.env.kommo`
- [ ] Atualizar `KOMMO_CLIENT_ID` se necessário (criar novo OAuth App para produção)
- [ ] Atualizar Redirect URI para: `https://seu-gateway.railway.app/kommo/callback`

### 4.2 — Deploy do Gateway Aurora

- [ ] Fazer commit das mudanças: `git add . && git commit -m "feat: Kommo integration complete"`
- [ ] Push para Railway: `git push railway master` (ou workflow de CI/CD)
- [ ] Verificar logs de deploy
- [ ] Confirmar que gateway está rodando

### 4.3 — Configurar Webhook no Kommo (Produção)

- [ ] Acessar Kommo → Configurações → Integrações → OpenClaw Aurora SDR → Webhooks
- [ ] Adicionar webhook com URL de produção:
  ```
  https://seu-gateway.railway.app/hooks/kommo?token=kRkMC0tsz2vjNzHVLFIuzH_FJGOGOaEqNsRH2relqNs
  ```
- [ ] Marcar eventos:
  - `leads.add`
  - `leads.update`
  - `leads.status`
  - `notes.add`
  - `contacts.add`
  - `contacts.update`
- [ ] Salvar

### 4.4 — Teste de Produção

- [ ] Criar lead de teste no Kommo
- [ ] Verificar logs do Railway: `railway logs`
- [ ] Verificar Supabase (produção) para confirmar inserção
- [ ] Testar mudança de estágio
- [ ] Testar adição de nota

---

## 📋 FASE 5: Monitoramento e Manutenção (CONTÍNUO)

### 5.1 — Monitoramento Diário

- [ ] Verificar logs de erro: `grep ERROR ~/.openclaw/logs/gateway.log`
- [ ] Verificar eventos não processados:
  ```sql
  SELECT * FROM v_eventos_pendentes;
  ```
- [ ] Verificar leads que precisam de atenção:
  ```sql
  SELECT * FROM v_leads_ativos WHERE precisa_aprovacao_humana = TRUE;
  ```

### 5.2 — Manutenção Semanal

- [ ] Renovar access token do Kommo (se necessário)
- [ ] Revisar score médio dos leads
- [ ] Ajustar regras de escalação se necessário
- [ ] Analisar distribuição de urgência

### 5.3 — Otimizações Futuras

- [ ] Habilitar respostas automáticas (atualizar `deliver: true` em `.openclaw.json`)
- [ ] Configurar canal de resposta (WhatsApp/Telegram)
- [ ] Implementar follow-ups automáticos
- [ ] Ajustar cálculo de score baseado em taxa de conversão real
- [ ] Adicionar mais regras de classificação de intent
- [ ] Integrar com calendário para agendamentos

---

## 🎯 Resumo de Status

| Fase | Status | Bloqueadores |
|------|--------|--------------|
| 1. Preparação Local | ✅ 100% | Nenhum |
| 2. Credenciais | ⏳ 0% | Usuário precisa criar OAuth App no Kommo |
| 3. Testes Locais | ⏳ 0% | Depende da Fase 2 |
| 4. Deploy Produção | ⏳ 0% | Depende da Fase 3 |
| 5. Monitoramento | ⏳ 0% | Depende da Fase 4 |

---

## 📞 Suporte

**Problemas comuns:**
- Token inválido → Ver `docs/GUIA_OAUTH_KOMMO.md` seção "Troubleshooting"
- Webhook não chega → Verificar token na URL, verificar logs do gateway
- Erro ao inserir no Supabase → Verificar SERVICE_KEY, verificar migrations

**Documentação:**
- Kommo API: https://www.amocrm.com/developers/content/api/account
- OpenClaw Hooks: (verificar documentação do OpenClaw)
- Supabase: https://supabase.com/docs

---

**Última atualização**: 2026-02-11
**Versão**: 1.0
**Responsável**: Claude Code
