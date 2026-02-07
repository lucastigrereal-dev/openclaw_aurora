# ⚡ QUICK START - DEPOIS DO AUDIT

**Status:** Você tem tudo pronto. Agora é só popular e executar.

---

## 📋 3 ARQUIVOS QUE VOCÊ PRECISA PREENCHER

### 1. videos.csv (50+ vídeos)
```bash
# Copie o template:
cp TEMPLATE_videos.csv ./videos.csv

# Abra em Excel/Google Sheets
# Adicione seus vídeos (mínimo 50)
# Salve em: social-hub/SOCIAL-HUB/DATA/METADATA/videos.csv
```

**Estrutura básica que você PRECISA:**
```
id,content_group_id,file_local,duracao_seg,tema,pilar,status,energy_level,video_type
VID-001,GRP-001,/path/video1.mp4,60,maternidade,entretenimento,ready,high,infantil_viral
VID-002,GRP-002,/path/video2.mp4,45,gastronomia,educacao,ready,mid,original_lucas
```

### 2. collab_pool.csv (suas colaboradoras)
```bash
cp TEMPLATE_collab_pool.csv ./collab_pool.csv
```

**O mínimo:**
```
handle,category,priority,status
@agenteviajabrasil,fixed,1,active
@oinatalrn,rotating,2,active
@resolutis,rotating,2,active
@mamae.de.dois,satellite_internal,1,active
@familia.motta,satellite_internal,1,active
```

### 3. approval_rules.csv (suas políticas)
```bash
cp TEMPLATE_approval_rules.csv ./approval_rules.csv
```

**O mínimo:**
```
page_handle,rule_type,auto_approve,sample_percentage
@lucasrsmotta,auto_all,true,0
@mamae.de.dois,forbidden_type,false,100
@familia.motta,min_predicted_engagement,true,30
```

---

## 🚀 SEQUÊNCIA DE EXECUÇÃO (Passo a Passo)

### PASSO 1: Preparar ambiente
```bash
cd /mnt/c/Users/lucas/openclaw_aurora

# Verificar .env está correto
cat .env | grep PUBLER_API_KEY
# Deve estar preenchido!

# Instalar dependências (se não tiver)
npm install
```

### PASSO 2: Gerar 30 dias de planejamento
```bash
npm run hub:plan 30 false

# O que acontece:
# - Lê videos.csv (seus vídeos)
# - Lê collab_pool.csv (colaboradoras)
# - Aplica hub-config.yaml (horários, quotas)
# - Cria posts.csv com 390 posts (13/dia × 30 dias)
# - Salva em: ./DATA/METADATA/posts.csv

# Verificar resultado:
wc -l ./DATA/METADATA/posts.csv
# Deve ser ~391 linhas (390 posts + header)

ls -lh ./DATA/METADATA/posts.csv
# Deve ter tamanho > 0
```

### PASSO 3: Gerar legendas com AI
```bash
npm run hub:generate captions

# O que acontece:
# - Lê posts.csv
# - Para cada post, chama Claude AI
# - Gera 3 variações de legenda
# - Escolhe a melhor (highest score)
# - Popula coluna legenda_final

# Verificar:
head -1 ./DATA/METADATA/posts.csv | grep legenda_final
# Deve ter a coluna

tail -1 ./DATA/METADATA/posts.csv | grep -o "." | wc -l
# Deve ter texto de legenda
```

### PASSO 4: Gerar hashtags com AI
```bash
npm run hub:generate hashtags

# O que acontece:
# - Lê posts.csv + videos.csv
# - Para cada post, chama Claude AI
# - Gera 30 hashtags ranqueadas
# - Mix: 70% proven, 20% trending, 10% experimental
# - Popula coluna hashtags_usadas

# Verificar:
tail -1 ./DATA/METADATA/posts.csv | cut -d',' -f 'hashtags_usadas'
# Deve ter #tag1 #tag2 #tag3 ...
```

### PASSO 5: Aplicar regras de aprovação
```bash
npm run hub:approve --apply-rules

# O que acontece:
# - Lê approval_rules.csv
# - Para cada página, aplica política:
#   @lucasrsmotta: aprova 100%
#   @mamae.de.dois: aprova 50% (você revisa 50% depois)
#   Satélites: aprova 25-50% em amostra
# - Popula coluna aprovado (true/false)
# - Se false, vai para seu queue de aprovação manual

# Se tiver posts para revisar (aprovado=false):
npm run hub:dashboard
# Abre localhost:3000 com interface de aprovação
```

### PASSO 6: Validar antes de agendar (CRITICAL!)
```bash
npm run hub:validate

# O que checa:
# ✓ Todas páginas têm 30 dias?
# ✓ Quotas foram respeitadas?
# ✓ 45-day rule não foi violada?
# ✓ Todas captions preenchidas?
# ✓ Todas hashtags preenchidas?
# ✓ Collab distribuição está OK?

# Se passar, continua. Se falhar, mostra erros.
```

### PASSO 7: TESTE EM DRY-RUN (Simula agendamento)
```bash
npm run hub:schedule --dry-run true

# O que acontece:
# - Conecta no Publer (FAKE)
# - Tenta agendar cada post
# - Mostra erros SEM agendar de verdade
# - Valida formatos de vídeo, captions, etc

# Verificar output:
# [OK] 390/390 posts validados
# [READY] Posts prontos para agendamento

# Se passou, você pode fazer o real!
```

### PASSO 8: AGENDAR DE VERDADE (Cuidado!)
```bash
# SÓ FAÇA DEPOIS QUE DRY-RUN PASSAR COMPLETO!

npm run hub:schedule --apply

# O que acontece:
# - MESMO processo do dry-run
# - MAS agora realmente envia pra Publer
# - Popula coluna publer_job_id
# - Muda status para "scheduled"
# - CUIDADO: 390 posts vão ser agendados!!!

# Monitorar:
tail -f ./logs/social-hub.log | grep "SCHEDULE"
# Mostra em tempo real qual post está sendo agendado
```

### PASSO 9: Verificar status
```bash
npm run hub:health

# Mostra:
# - Quantos posts agendados vs total
# - Erros encontrados
# - Próximo post vai sair em quantos minutos
# - Health do Publer API
# - Health do Instagram API
```

---

## 🔄 COMANDOS ÚTEIS (Dia a dia)

### Ver status rápido
```bash
npm run hub:status
# Mostra: 390 scheduled | 0 failed | 0 published (próximas 24h)
```

### Coletar métricas (próxima semana)
```bash
npm run hub:analytics --days 7
# Mostra engagement dos últimos 7 dias
# Exporta para analytics.json
```

### Reciclar top performers (próximo mês)
```bash
npm run hub:recycle --min-score 75 --days-ahead 75
# Encontra posts com score >= 75
# Reagenda uma variação 75 dias à frente
```

### Fazer backup
```bash
npm run hub:backup
# Cria backup de videos.csv, posts.csv, logs
# Salva em: ./BACKUPS/backup-YYYY-MM-DD.tar.gz
```

### Ver logs
```bash
tail -100 ./logs/social-hub.log
# Últimas 100 linhas de log

grep "ERROR" ./logs/social-hub.log
# Apenas erros
```

---

## ⏰ TEMPO ESTIMADO

| Tarefa | Tempo |
|--------|-------|
| Preencher videos.csv (50+ vídeos) | 1-2 horas |
| Preencher collab_pool.csv | 15 min |
| Preencher approval_rules.csv | 15 min |
| Rodar Planner | 1 min |
| Rodar Caption AI | 2-5 min |
| Rodar Hashtag AI | 2-5 min |
| Revisar aprovações (se sample > 0) | 30-60 min |
| Rodar validação | 1 min |
| DRY-RUN agendamento | 2-5 min |
| **TOTAL (primeira vez)** | **4-5 horas** |
| Rodar novamente (próx semana) | 10 min |

---

## 🆘 SE DER ERRO

### Erro: "PUBLER_API_KEY not configured"
```bash
# Verifique .env
cat .env | grep PUBLER_API_KEY

# Se vazio, preencha:
echo "PUBLER_API_KEY=seu_token_aqui" >> .env
```

### Erro: "videos.csv not found"
```bash
# Verificar path
ls -la ./DATA/METADATA/videos.csv

# Se não existe, copie template:
cp TEMPLATE_videos.csv ./DATA/METADATA/videos.csv
```

### Erro: "Column legenda_final not found"
```bash
# Significa que Caption AI não rodou
# Rodar de novo:
npm run hub:generate captions --force
```

### Erro: "Publer rate limit exceeded"
```bash
# Publer bloqueia muitos requests rápido
# Esperé 5 minutos e tente de novo:
sleep 300 && npm run hub:schedule --apply --batch-delay 5000
# Isso aguarda 5s entre cada post
```

---

## 📊 ESTRUTURA DE ARQUIVOS

```
openclaw_aurora/
├── .env                          # Seu ambiente (NUNCA commit)
├── hub-config.yaml               # Config operacional (você preenche)
├── TEMPLATE_videos.csv           # Template
├── TEMPLATE_collab_pool.csv      # Template
├── TEMPLATE_approval_rules.csv   # Template
├── DATA/
│   └── METADATA/
│       ├── videos.csv            # VOCÊ PREENCHE
│       ├── posts.csv             # Gerado pelo Planner
│       ├── collab_pool.csv       # VOCÊ PREENCHE
│       └── approval_rules.csv    # VOCÊ PREENCHE
├── LOGS/
│   └── social-hub.log            # Logs de execução
├── EXPORTS/
│   ├── analytics.json            # Métricas
│   └── backup-YYYY-MM-DD.tar.gz # Backups
└── skills/
    ├── social-hub-planner.ts
    ├── social-hub-publer.ts
    └── ... (outras skills)
```

---

## ✅ CHECKLIST ANTES DE AGENDAR

- [ ] .env tem PUBLER_API_KEY válida?
- [ ] videos.csv tem 50+ vídeos?
- [ ] collab_pool.csv preenchido?
- [ ] approval_rules.csv preenchido?
- [ ] hub-config.yaml tem horários corretos?
- [ ] Planner rodou e gerou 390 posts?
- [ ] Caption AI preencheu todas legendas?
- [ ] Hashtag AI preencheu todos hashtags?
- [ ] Validação passou 100%?
- [ ] DRY-RUN passou 100%?
- [ ] Você revisou 10-20 posts manualmente?
- [ ] Você tem backup dos CSVs originais?

**Só após TODOS checked = você pode fazer o `npm run hub:schedule --apply`**

---

**PRÓXIMO PASSO:** Você popula os 3 CSVs. Quando estiver pronto, manda mensagem que eu rodo tudo com você. 🚀
