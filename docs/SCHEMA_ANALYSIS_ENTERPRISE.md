# 📊 ANÁLISE DE SCHEMA - AUDIT CIRÚRGICO

## STATUS ATUAL: INFRA PRONTA, DADOS VAZIOS

### Current CSV Schemas (CORRETOS)

#### videos.csv
```
id, content_group_id, hash_arquivo, file_local, file_drive, duracao_seg,
tema, pilar, formato, paginas_sugeridas, gancho, legenda_base, cta, hashtags,
status, score_prioridade, usage_count, last_used_at, observacoes
```

✅ **Diagnóstico:** Schema já está bom e completo.
⚠️ **Problema:** CSV VAZIO (0 linhas de dados)

#### posts.csv
```
post_id, video_id, content_group_id, pagina, data, hora, slot, collab_with,
gancho_usado, legenda_final, cta_usada, hashtags_usadas, file_to_upload, status,
publer_job_id, tentativas_agendar, erro_ultimo, aprovado, aprovado_por,
aprovado_em, janela_ref
```

✅ **Diagnóstico:** Schema também bem pensado.
⚠️ **Problema:** CSV VAZIO (0 linhas de dados)

---

## COMPARAÇÃO: PROPOSTO (Aurora) vs ATUAL

| Conceito | Aurora Propõe | Você Já Tem | Status |
|----------|---------------|------------|--------|
| **Content Groups** | `content_group_id` | ✅ Já tem | MATCH |
| **Anti-repetição 45d** | `last_used_at` | ✅ Já tem | MATCH |
| **Quotas/Slots** | `slot` | ✅ Já tem | MATCH |
| **Collab Orquestration** | `collab_with` | ✅ Já tem | MATCH |
| **Approval Workflow** | `aprovado`, `aprovado_por`, `aprovado_em` | ✅ Já tem | MATCH |
| **Idempotência** | `publer_job_id` | ✅ Já tem | MATCH |
| **Retry Logic** | `tentativas_agendar`, `erro_ultimo` | ✅ Já tem | MATCH |
| **Pilar + Tema** | Diversidade garantida | ✅ Já tem | MATCH |

---

## ⚠️ GAPS IDENTIFICADOS (Precisa adicionar)

### 1️⃣ **videos.csv - FALTAM CAMPOS**

Adicionar:
```csv
recycled_count              # Quantas vezes foi reciclado
last_recycled_at            # Quando foi reciclado pela última vez
energy_level                # low|mid|high (para variar)
visual_quality_score        # 0-100 (blur, composição, iluminação)
perceptual_hash             # Para detectar duplicatas visuais
performance_score           # Baseado em histórico de engagement
video_type                  # original_lucas | infantil_viral | cuidados_mulher
```

### 2️⃣ **posts.csv - FALTAM CAMPOS**

Adicionar:
```csv
predicted_engagement        # ML: engagement rate estimado
predicted_reach             # ML: reach estimado
approved_at_step            # De qual step foi aprovado (planning|generation|before_schedule)
recycled_from               # Se é reciclagem, referência ao post original
metricas_24h                # JSON com dados reais após publicação
performance_score           # Score de viral baseado em métricas
sentiment_risk              # low|medium|high (análise de moderação)
brand_compliance_score      # 0-100 (respeito a guidelines)
```

### 3️⃣ **NEW TABLE NEEDED: collab_pool.csv**

```csv
handle,category,priority,usage_count,last_used_at,revenue_share,next_available_date
@agenteviajabrasil,fixed,high,45,2026-02-05,15%,2026-01-01
@oinatalrn,rotating,medium,12,2026-02-02,8%,2026-02-02
@oquecomeremnatal,rotating,medium,10,2026-02-01,8%,2026-02-04
@resolutis,rotating,medium,18,2026-02-05,10%,2026-02-02
@mamae.de.dois,satellite,high,78,2026-02-05,12%,2026-01-01
@familia.motta,satellite,high,82,2026-02-05,12%,2026-01-01
```

### 4️⃣ **NEW TABLE NEEDED: approval_rules.csv**

```csv
page_handle,rule_type,rule_value,auto_approve,sample_percentage
@lucasrsmotta,energy_min,low,true,0
@lucasrsmotta,predicted_engagement_min,3.0,true,0
@mamae.de.dois,tipo_forbidden,infantil_viral,false,100
@mamae.de.dois,predicted_engagement_min,2.5,false,50
@familia.motta,sample_percentage,,false,30
@oinatalrn,sample_percentage,,false,25
```

---

## CHECKLIST: O QUE VOCÊ PRECISA FAZER AGORA

### PRIORITY 1: Dados 100% funcionais

- [ ] Populara `videos.csv` com seus 3 tipos (original_lucas, infantil_viral, cuidados_mulher)
  - Mínimo: 50 vídeos por tipo = 150 total
  - Ou pelo menos: 20/15/10 (totalizando 45 vídeos)

- [ ] Preencher `collab_pool.csv` com suas colaboradoras reais

- [ ] Preencher `approval_rules.csv` com políticas para suas páginas

### PRIORITY 2: Schemas com novos campos

- [ ] Adicionar colunas em videos.csv (energy_level, visual_quality_score, etc)

- [ ] Adicionar colunas em posts.csv (predicted_engagement, metricas_24h, etc)

### PRIORITY 3: Geração inicial de 30 dias

- [ ] Rodar planner (preenchendo posts.csv com 30 dias)
- [ ] Validar: todas páginas têm 30 dias preenchidos
- [ ] Validar: 45-day rule não foi violada
- [ ] Validar: collab distribuições estão certas

### PRIORITY 4: Aprovação e agendamento

- [ ] Aplicar approval_rules (auto-approve, sampling, etc)
- [ ] Gerar captions + hashtags com AI
- [ ] Agendar no Publer (batch import ou API)
- [ ] Verificar publer_job_id populados e status = "scheduled"

---

## RECOMENDAÇÃO FINAL

**Estrutura mínima para "30 dias prontos":**

1. `videos.csv` com 50+ vídeos (mix dos 3 tipos)
2. `posts.csv` gerado pelo Planner (390 posts)
3. `collab_pool.csv` com suas 4+ colaboradoras
4. `approval_rules.csv` com políticas
5. Scripts executados:
   - Planner: gera posts.csv
   - CaptionAI: preenche legendas
   - HashtagAI: preenche hashtags
   - Publer: agenda todos

**Tempo estimado:** 2-3 horas de setup + validação

---

**Versão:** 1.0.0
**Data:** 07/02/2026
**Status:** SCHEMA VALIDADO ✅ | DADOS FALTANDO ⚠️
