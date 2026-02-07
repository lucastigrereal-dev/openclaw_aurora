# 🎬 COMO COMPILAR VÍDEOS → videos.csv

**Status:** Você separa vídeos em pasta → Script gera CSV automaticamente

---

## 📋 PASSO 1: Organizar Vídeos em Pasta

Crie uma estrutura assim:

```
VIDEOS_PARA_COMPILAR/
├── 001_infantil_viral_funny.mp4
├── 002_infantil_viral_crianca.mp4
├── 003_receita_gastronomia.mp4
├── 004_maternidade_rotina.mp4
├── 005_saude_mulher_dicas.mp4
├── 006_humor_familia.mp4
└── ... (mais vídeos)
```

**Dica:** Use nomes descritivos! O script tenta inferir:
- `infantil_viral` ou `infantil` → video_type
- `receita`, `gastronomia` → tema
- `saude`, `mulher` → tema
- `humor`, `riso` → tema
- `maternidade`, `familia` → tema
- `autoridade`, `lucas` → video_type

---

## 🚀 PASSO 2: Rodar Script de Compilação

```bash
# Abra terminal na pasta do projeto
cd /mnt/c/Users/lucas/openclaw_aurora

# Execute (substitua PASTA por seu caminho)
python compile_videos.py /path/to/VIDEOS_PARA_COMPILAR --output videos.csv
```

**Exemplo real:**
```bash
python compile_videos.py ~/Videos/instagram_content --output videos.csv
```

**O que o script faz:**
- ✅ Escaneia todos os vídeos recursivamente
- ✅ Calcula MD5 hash (para deduplicação)
- ✅ Extrai duração (ffprobe)
- ✅ Infere tipo/tema/pilar do nome do arquivo
- ✅ Gera videos.csv
- ✅ Mostra resumo

---

## 📊 EXEMPLO DE OUTPUT

```
📹 Escaneando: /Users/videos

  ▶️  001_infantil_viral.mp4... ✅ (45s, 120.5MB, infantil_viral)
  ▶️  002_receita.mp4... ✅ (67s, 150.2MB, original_lucas)
  ▶️  003_maternidade.mp4... ✅ (52s, 98.3MB, infantil_viral)
  ...

💾 Salvando em: videos.csv

✅ 50 vídeos salvos em videos.csv

================================================================================
📊 RESUMO DOS VÍDEOS COMPILADOS
================================================================================

📁 Por Tipo:
  • infantil_viral: 25
  • original_lucas: 15
  • cuidados_mulher: 10

🎨 Por Tema:
  • gastronomia: 12
  • maternidade: 18
  • humor: 10
  • saude_mulher: 10

⚡ Por Energia:
  • high: 25
  • mid: 15
  • low: 10

📏 Estatísticas:
  • Total: 50 vídeos
  • Duração: 50 minutos
  • Tamanho: 5234.2 MB

✅ PRÓXIMOS PASSOS:
1. Verifique videos.csv
2. Ajuste 'gancho', 'legenda_base', 'cta', 'paginas_sugeridas'
3. Ajuste 'visual_quality_score' (0-100)
4. Execute o Planner com este CSV

================================================================================
```

---

## ✏️ PASSO 3: Ajustar videos.csv

O CSV gerado tem valores automáticos. Você pode ajustar:

### Colunas a ajustar manualmente:

| Campo | O Que | Como |
|-------|-------|------|
| `gancho` | Hook viral (máx 12 palavras) | "Você NÃO vai acreditar..." |
| `legenda_base` | Legenda base | Descrição curta |
| `cta` | Call-to-action | "Comenta aqui!" |
| `paginas_sugeridas` | Quais páginas usar | @handle1\|@handle2 |
| `score_prioridade` | Prioridade (0-100) | Videos melhores = 80+ |
| `visual_quality_score` | Qualidade visual | 0-100 (blur, composição) |

### Exemplo:

```csv
id,gancho,legenda_base,cta,paginas_sugeridas,score_prioridade,visual_quality_score
VID-00001,"Você NÃO vai acreditar",Dia maluco com as crianças,Comenta!,@lucasrsmotta|@mamae.de.dois,85,88
VID-00002,"Receita ESCONDIDA",Aprenda esse segredo,Salva!,@oquecomeremnatal,72,92
```

---

## 🎯 PRÓXIMAS AÇÕES DEPOIS DA COMPILAÇÃO

### 1️⃣ Verificar CSV
```bash
# Ver primeiras linhas
head -10 videos.csv

# Ver quantidade de vídeos
wc -l videos.csv
# Deve ser: número_de_vídeos + 1 (header)

# Ver resumo
tail -20 videos.csv
```

### 2️⃣ Copiar para SOCIAL-HUB (Python)
```bash
# Copiar para a pasta correta
cp videos.csv /mnt/c/Users/lucas/Downloads/Downloads_COMET/social-hub-moltbot/SOCIAL-HUB/DATA/METADATA/videos.csv
```

### 3️⃣ Rodar Planner
```bash
cd /path/to/SOCIAL-HUB
python SCRIPTS/hub_planejar_30d.py

# Deve gerar: posts.csv com 390 posts
```

---

## 🔧 REQUISITOS

Script precisa de:

```bash
# Python 3.7+
python --version

# ffprobe (para extrair duração)
# Linux/Mac:
brew install ffmpeg  # Mac
apt install ffmpeg   # Linux
choco install ffmpeg # Windows
```

**Se ffprobe não estiver instalado:**
- Script avisa ⚠️ mas continua
- Duração fica como 0 (você preenche depois)

---

## 💡 DICAS DE USO

### Padrão de Nomes Recomendado
```
000_TIPO_TEMA_DESCRIÇÃO.mp4

Exemplos:
  001_infantil_viral_riso.mp4
  002_original_lucas_autoridade.mp4
  003_cuidados_mulher_saude.mp4
  004_infantil_viral_maternidade.mp4
  005_infantil_viral_receita.mp4
```

### Organizar em Subpastas (Opcional)
```
VIDEOS/
├── infantil_viral/
│   ├── riso_crianca.mp4
│   ├── familia_mamae.mp4
│   └── ...
├── original_lucas/
│   ├── autoridade_dica.mp4
│   └── ...
└── cuidados_mulher/
    ├── saude_mulher.mp4
    └── ...
```

Script escaneia recursivamente, funciona igual!

---

## ⚡ COMANDO RÁPIDO (Copy-paste)

```bash
cd /mnt/c/Users/lucas/openclaw_aurora

# Substitute PASTA pelo seu caminho real
python compile_videos.py /path/to/sua/pasta/videos --output videos.csv

# Depois copiar
cp videos.csv /mnt/c/Users/lucas/Downloads/Downloads_COMET/social-hub-moltbot/SOCIAL-HUB/DATA/METADATA/videos.csv
```

---

## 🎬 FLUXO COMPLETO

```
Sua Pasta (50+ vídeos)
       ↓
compile_videos.py (script)
       ↓
videos.csv (gerado)
       ↓
Você ajusta (gancho, cta, etc)
       ↓
Copia para SOCIAL-HUB/DATA/METADATA
       ↓
hub_planejar_30d.py
       ↓
posts.csv (390 posts)
       ↓
Agendar no Publer
       ↓
✅ 30 dias prontos
```

---

## ❓ FAQ

**P: E se eu tiver 200 vídeos?**
A: Tudo bem! Script aguenta. Vai levar mais tempo na primeira rodada (calcular hashes), mas funciona.

**P: Posso rodar o script de novo depois?**
A: Sim! Ele sobrescreve o CSV. Dica: faça backup do CSV anterior se tiver ajustes manuais.

**P: E se um vídeo falhar?**
A: Script pula e continua. Você vê ⚠️ aviso, mas não tranca.

**P: Como sei se está pronto?**
A: Se vir ✅ RESUMO no final, está tudo certo!

---

**Quando tiver todos os vídeos separados → roda o script → avisa!** 🚀
