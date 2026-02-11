# 🔗 Integração Kommo CRM ↔ OpenClaw Aurora

> **Status**: ✅ Implementação completa | ⏳ Aguardando configuração de credenciais

---

## 🎯 O que foi implementado

Sistema completo de integração entre Kommo CRM e OpenClaw Aurora para qualificação automática de leads do Instituto Rodovanski.

**Capacidades:**
- ✅ Receber webhooks do Kommo (leads, contatos, notas, tarefas)
- ✅ Normalizar payloads via transform customizado
- ✅ Calcular score de qualificação (0-100)
- ✅ Classificar urgência (baixa, média, alta, crítica)
- ✅ Detectar quando escalar para humano
- ✅ Armazenar tudo no Supabase
- ✅ Usar Haiku 4.5 (econômico, ~$2-3/mês para 15 leads/dia)

**O que NÃO faz (ainda):**
- ❌ Enviar respostas automáticas (apenas registra)
- ❌ Follow-ups automáticos (configurável no futuro)

---

## 📁 Arquivos criados

```
openclaw_aurora/
├── .env.kommo                    # Variáveis de ambiente (PREENCHER)
├── .env.kommo.example            # Template de exemplo
├── .openclaw.json                # Config do OpenClaw + Hooks
│
├── ~/.openclaw/
│   └── hooks/
│       ├── transforms/
│       │   └── kommo-transform.js    # Normaliza payloads do Kommo
│       └── logs/                     # Logs dos webhooks
│
├── agents/
│   └── sdr-kommo/
│       └── SOUL.md               # SOUL do SDR Agent
│
├── supabase/
│   └── migrations/
│       └── 20260211_kommo_integration.sql   # Tabelas do Supabase
│
├── scripts/
│   ├── test-kommo-webhook.sh     # Testa webhooks localmente
│   └── get-kommo-pipeline-ids.js # Extrai IDs do Kommo
│
└── docs/
    ├── GUIA_OAUTH_KOMMO.md       # Guia passo-a-passo OAuth
    └── CHECKLIST_INTEGRACAO_KOMMO.md  # Checklist completo
```

---

## 🚀 Quick Start (5 passos)

### 1️⃣ Configurar OAuth no Kommo

**Abrir**: `docs/GUIA_OAUTH_KOMMO.md` → seguir passo-a-passo

**Resumo:**
1. Ir em: https://rodovanski.kommo.com → Configurações → Integrações
2. Criar integração: "OpenClaw Aurora SDR"
3. Anotar: `CLIENT_ID`, `CLIENT_SECRET`, `ACCESS_TOKEN`, `REFRESH_TOKEN`
4. Preencher `.env.kommo`

---

### 2️⃣ Extrair Pipeline IDs

```bash
# Preencher credenciais OAuth em .env.kommo
node scripts/get-kommo-pipeline-ids.js

# Copiar IDs gerados de .env.kommo.pipeline_ids para .env.kommo
```

---

### 3️⃣ Configurar Supabase

```bash
# Criar projeto em: https://supabase.com
# Anotar: SUPABASE_URL e SUPABASE_SERVICE_KEY

# Rodar migration (opção 1: CLI)
psql -h db.xxx.supabase.co -U postgres -f supabase/migrations/20260211_kommo_integration.sql

# Rodar migration (opção 2: Dashboard)
# Ir em: Supabase → SQL Editor → colar conteúdo da migration → Run
```

**Preencher `.env.kommo`:**
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...
```

---

### 4️⃣ Testar Localmente

```bash
# Carregar variáveis de ambiente
source .env.kommo

# Iniciar gateway Aurora
openclaw gateway start
# (ou comando equivalente do OpenClaw)

# Em outro terminal, rodar testes
./scripts/test-kommo-webhook.sh

# Verificar logs
tail -f ~/.openclaw/logs/gateway.log

# Verificar Supabase
# SELECT * FROM kommo_eventos ORDER BY created_at DESC LIMIT 10;
```

---

### 5️⃣ Deploy Railway (Produção)

```bash
# Adicionar variáveis no Railway (do .env.kommo)
railway env set KOMMO_CLIENT_ID=...
railway env set KOMMO_ACCESS_TOKEN=...
railway env set SUPABASE_URL=...
# (etc, todas as variáveis)

# Deploy
git add .
git commit -m "feat: Kommo integration"
git push railway master

# Configurar webhook no Kommo
# URL: https://seu-gateway.railway.app/hooks/kommo?token=kRkMC0tsz2vjNzHVLFIuzH_FJGOGOaEqNsRH2relqNs
# Eventos: leads.add, leads.update, notes.add, contacts.add
```

---

## 🧠 Como funciona

### Fluxo Completo

```
1. Lead criado no Kommo
   ↓
2. Kommo envia webhook POST /hooks/kommo?token=xxx
   ↓
3. OpenClaw Gateway recebe e valida token
   ↓
4. kommo-transform.js normaliza payload
   ↓
5. SDR Agent processa (claude-haiku-4-5)
   ├─ Calcula score de qualificação
   ├─ Classifica urgência
   ├─ Detecta keywords de escalação
   └─ Registra tudo no Supabase
   ↓
6. Dados salvos:
   ├─ kommo_leads (dados do lead)
   ├─ kommo_eventos (log do webhook)
   └─ kommo_interacoes (histórico)
```

### Exemplo de Processamento

**Input (webhook do Kommo):**
```json
{
  "leads": {
    "add": [{
      "id": 12345,
      "name": "Maria Silva",
      "phone": "+5511999999999",
      "email": "maria@gmail.com",
      "price": 6000,
      "pipeline_id": 7654321,
      "status_id": 9876543
    }]
  }
}
```

**Output (registrado no Supabase):**
```sql
-- Tabela: kommo_leads
kommo_id: 12345
name: Maria Silva
phone: +5511999999999
email: maria@gmail.com
score: 45  -- (15 tel + 10 email + 20 valor)
urgencia: media
precisa_aprovacao_humana: FALSE
```

---

## 📊 Schema do Supabase

### Tabela: `kommo_leads`
```sql
- kommo_id: BIGINT (ID do Kommo)
- name, phone, email: TEXT
- score: INTEGER (0-100)
- urgencia: TEXT (baixa|media|alta|critica)
- status_interno: TEXT (novo|qualificando|convertido|perdido)
- precisa_aprovacao_humana: BOOLEAN
- num_followups, num_interacoes: INTEGER
- created_at, updated_at: TIMESTAMPTZ
```

### Tabela: `kommo_eventos`
```sql
- event_type: TEXT (lead_created, lead_updated, note_added, etc)
- payload: JSONB (webhook completo)
- processado: BOOLEAN
- created_at: TIMESTAMPTZ
```

### Tabela: `kommo_interacoes`
```sql
- tipo: TEXT (boas_vindas, followup, qualificacao, escalacao)
- conteudo: TEXT
- direcao: TEXT (entrada|saida)
- canal: TEXT (whatsapp|telegram|kommo)
- created_at: TIMESTAMPTZ
```

### Views úteis
```sql
-- Leads ativos que precisam de atenção
SELECT * FROM v_leads_ativos;

-- Eventos não processados
SELECT * FROM v_eventos_pendentes;
```

---

## 🔧 Configuração de Horário

O SDR só processa eventos entre **08:00 - 20:00 BRT**.

**Alterar horário:**
```bash
# Em .env.kommo
SDR_HORARIO_INICIO=09:00
SDR_HORARIO_FIM=18:00
SDR_TIMEZONE=America/Sao_Paulo
```

---

## 🚨 Quando escala para humano

O SDR marca `precisa_aprovacao_humana = TRUE` quando detecta:

1. **Lead pergunta sobre valores**
   - Keywords: "preço", "valor", "custo", "quanto custa"

2. **Lead faz pergunta médica**
   - Keywords: "procedimento", "anestesia", "risco", "recuperação"

3. **Lead demonstra insatisfação**
   - Keywords: "reclamação", "insatisfeito", "problema"

4. **Score > 70**
   - Lead muito qualificado → humano fecha venda

**Monitorar leads que precisam de atenção:**
```sql
SELECT * FROM kommo_leads
WHERE precisa_aprovacao_humana = TRUE
  AND NOT humano_assumiu
ORDER BY score DESC, created_at ASC;
```

---

## 💰 Custo Estimado

**LLM (Haiku 4.5):**
- Classificação por lead: ~$0.001
- 15 leads/dia × 30 dias = **~$2-3/mês**

**Infraestrutura:**
- Railway: Grátis (Hobby Plan) ou $5/mês
- Supabase: Grátis (até 500MB) ou $25/mês (Pro)

**Total**: **~$2-8/mês** (dependendo do volume)

---

## 📈 Próximos Passos (Roadmap)

### Fase 1: Configuração (AGORA)
- [ ] Seguir `docs/GUIA_OAUTH_KOMMO.md`
- [ ] Seguir `docs/CHECKLIST_INTEGRACAO_KOMMO.md`

### Fase 2: Respostas Automáticas
- [ ] Configurar WhatsApp/Telegram
- [ ] Atualizar `.openclaw.json` → `deliver: true`
- [ ] Criar templates de mensagens

### Fase 3: Follow-ups Automáticos
- [ ] Implementar scheduler de follow-ups
- [ ] Respeitar limite de 4 follow-ups
- [ ] Intervalo de 48h entre follow-ups

### Fase 4: Otimizações
- [ ] Ajustar cálculo de score baseado em conversões reais
- [ ] Adicionar mais regras de classificação de intent
- [ ] Integrar com calendário para agendamentos
- [ ] Dashboard de métricas (Grafana?)

---

## 🐛 Troubleshooting

### Webhook não chega

1. Verificar se hooks está enabled: `grep hooks .openclaw.json`
2. Verificar token na URL do webhook
3. Verificar logs: `tail -f ~/.openclaw/logs/gateway.log`
4. Testar local: `./scripts/test-kommo-webhook.sh`

### Token inválido (401)

- Access token expira em 24h
- Usar refresh_token para renovar
- Ver: `docs/GUIA_OAUTH_KOMMO.md` → seção "Troubleshooting"

### Transform não executa

1. Verificar path: `ls ~/.openclaw/hooks/transforms/kommo-transform.js`
2. Verificar export: `grep "export function transformKommo" ~/.openclaw/hooks/transforms/kommo-transform.js`
3. Verificar logs por erros de parse

### Erro ao inserir no Supabase

1. Verificar `SUPABASE_SERVICE_KEY` (não usar anon key)
2. Verificar se migrations rodaram: `SELECT * FROM kommo_leads LIMIT 1;`
3. Verificar permissions/RLS

---

## 📚 Documentação de Referência

- **Kommo API**: https://www.amocrm.com/developers/content/api/account
- **OpenClaw Hooks**: (verificar docs do OpenClaw)
- **Supabase**: https://supabase.com/docs

---

## 🙋 Suporte

**Arquivos importantes:**
- `docs/GUIA_OAUTH_KOMMO.md` → Como configurar OAuth
- `docs/CHECKLIST_INTEGRACAO_KOMMO.md` → Checklist completo de todas as fases
- `agents/sdr-kommo/SOUL.md` → Regras de negócio do SDR

**Para dúvidas:**
1. Verificar checklist: `docs/CHECKLIST_INTEGRACAO_KOMMO.md`
2. Verificar logs: `tail -f ~/.openclaw/logs/gateway.log`
3. Testar localmente: `./scripts/test-kommo-webhook.sh`

---

**Versão**: 1.0
**Data**: 2026-02-11
**Implementado por**: Claude Code (Sonnet 4.5)
**Owner**: Instituto Rodovanski
