# 🔴 OpenClaw Operator Core - Análise Completa de Capacidades

**Versão:** 2.0.0
**Data:** 2026-02-07
**Status:** Production Ready
**Total de Skills Operacionais:** 53+

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Inteligência Artificial](#1-inteligência-artificial-ai)
3. [Execução e Automação](#2-execução-e-automação-exec)
4. [Controle de Navegador](#3-controle-de-navegador-browser)
5. [Controle de Desktop](#4-controle-de-desktop-autopc)
6. [Operações de Arquivo](#5-operações-de-arquivo-file)
7. [Web e HTTP](#6-web-e-http-web)
8. [Comunicação](#7-comunicação-comm)
9. [Geração de Conteúdo](#8-geração-de-conteúdo-content)
10. [Analytics e ROI](#9-analytics-e-roi-analytics)
11. [Marketing e Captação](#10-marketing-e-captação-marketing)
12. [Reviews e Reputação](#11-reviews-e-reputação-reviews)
13. [Social Media](#12-social-media-social)
14. [Utilitários](#13-utilitários-util)
15. [Segurança e Proteção](#14-segurança-e-proteção-guardrail)
16. [Resumo por Categoria](#resumo-por-categoria)
17. [Dependências Externas](#dependências-externas)

---

## Visão Geral

O **OpenClaw Operator Core** é o coração do sistema OpenClaw Aurora - uma plataforma de automação enterprise completa que fornece operações fundamentais para todos os hubs especializados.

**Características principais:**
- ✅ **53+ skills operacionais** cobrindo 14 categorias
- ✅ **Integração com 10+ APIs** externas (Claude, GPT, Google, Meta, etc.)
- ✅ **Cross-platform** (Windows, Mac, Linux)
- ✅ **Enterprise-grade**: atomic operations, validation, rate limiting
- ✅ **Fallback gracioso**: funciona mesmo sem API keys (modo mock)
- ✅ **Segurança integrada**: validação de inputs, anti-patterns, resource limits

---

## 1. Inteligência Artificial (AI)

### 1.1 ai-claude.ts - Claude API Integration

**Classe:** `AIClaudeSkill`

**Capacidades:**
- ✅ Integração completa com API da Anthropic (Claude)
- ✅ Suporte a múltiplos modelos (default: `claude-3-5-sonnet-20241022`)
- ✅ System prompts personalizáveis
- ✅ Controle de temperatura e max_tokens
- ✅ Rate limiting: 2 minutos timeout, 3 retries

**Dependências:**
- `ANTHROPIC_API_KEY` (variável de ambiente)
- Anthropic API v2023-06-01

**Casos de Uso:**
- Processamento de linguagem natural
- Análise de texto complexo
- Geração de conteúdo
- Assistência em decisões

**Exemplo de Input:**
```json
{
  "prompt": "Analise esta estrutura de projeto",
  "systemPrompt": "Você é um arquiteto de software",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

---

### 1.2 ai-gpt.ts - OpenAI GPT Integration

**Classe:** `AIGPTSkill`

**Capacidades:**
- ✅ Integração com OpenAI Chat Completions API
- ✅ Modelo padrão: `gpt-4o`
- ✅ Suporte a system prompts
- ✅ Controle fino de temperatura e tokens
- ✅ 120s timeout, 3 retries

**Dependências:**
- `OPENAI_API_KEY` (variável de ambiente)
- OpenAI v1 API

**Casos de Uso:**
- Geração de texto criativo
- Chatbots conversacionais
- Análise de dados e insights
- Code generation

---

### 1.3 ai-ollama.ts - Local LLM Integration

**Classe:** `AIOllamaSkill`

**Capacidades:**
- ✅ Modelos locais via Ollama
- ✅ Modelo padrão: `llama3.2`
- ✅ Suporte a streaming
- ✅ 5 minutos timeout para modelos pesados
- ✅ Métricas detalhadas (eval_count, total_duration)
- ✅ `listModels()` - Lista modelos disponíveis localmente

**Dependências:**
- `OLLAMA_URL` (default: `http://localhost:11434`)
- Ollama instalado localmente

**Casos de Uso:**
- IA offline (sem internet)
- Privacidade de dados (dados não saem do ambiente)
- Baixo custo operacional (sem API fees)
- Desenvolvimento e testes

---

## 2. Execução e Automação (EXEC)

### 2.1 exec-bash.ts - Shell Command Execution

**Classe:** `ExecBashSkill`

**Capacidades:**
- ✅ Executa comandos bash com segurança
- ✅ Blacklist de comandos perigosos (rm -rf /, mkfs, dd, fork bomb)
- ✅ Working directory customizável
- ✅ 60s timeout, max buffer 10MB
- ✅ Captura stdout/stderr separadamente

**Segurança:**
- `requiresApproval: true` para comandos perigosos
- Validação automática de comandos bloqueados
- Blacklist: `rm -rf /`, `mkfs`, `dd`, `:(){ :|:& };:`

**Casos de Uso:**
- Automação DevOps
- Deployment scripts
- Manutenção de sistemas
- Git operations
- Package management

**Exemplo:**
```json
{
  "command": "git status",
  "cwd": "/path/to/repo"
}
```

---

## 3. Controle de Navegador (BROWSER)

### 3.1 browser-control.ts - Puppeteer Automation

**8 Skills Especializadas:**

#### BrowserOpenSkill
- Abre URLs em navegador headless/GUI
- Suporte a wait selectors e eventos (load, networkidle)
- Captura de título da página

#### BrowserClickSkill
- Clique em elementos (CSS selector ou coordenadas X/Y)
- Suporte a botões (left, right, middle)
- Double-click e multi-click

#### BrowserTypeSkill
- Digita texto em campos
- Clear antes de digitar (opcional)
- Delay entre keystrokes customizável

#### BrowserScreenshotSkill
- Screenshot completo ou de elemento específico
- Suporte a fullPage
- Save em arquivo local

#### BrowserExtractSkill
- Extrai texto/atributos de elementos
- Single ou múltiplos elementos (querySelectorAll)
- Suporte a atributos HTML

#### BrowserPdfSkill
- Gera PDF da página atual
- Formatos: A4, Letter, etc.
- Orientação landscape/portrait

#### BrowserWaitSkill
- Espera por seletores, tempo ou navegação
- Timeout customizável

#### BrowserCloseSkill
- Fecha página individual ou navegador inteiro

**Dependências:**
- Puppeteer (npm package)

**Casos de Uso:**
- Web scraping avançado
- Testes automatizados E2E
- RPA (Robotic Process Automation)
- Captura de conteúdo dinâmico
- Geração de PDFs de sites

---

## 4. Controle de Desktop (AUTOPC)

### 4.1 autopc-control.ts - Desktop Automation

**7 Skills Cross-Platform (Windows, Mac, Linux):**

#### AutoPCClickSkill
- Clique em coordenadas da tela
- Suporte a botões e multi-click
- PowerShell (Win), AppleScript (Mac), xdotool (Linux)

#### AutoPCMoveSkill
- Move mouse para coordenadas

#### AutoPCTypeSkill
- Digita texto no foco atual
- Delay entre teclas

#### AutoPCPressSkill
- Teclas especiais (Enter, Tab, Esc, F1-F12)
- Atalhos (Ctrl+C, Ctrl+V, Alt+Tab)
- Mapeamento cross-platform

#### AutoPCScreenshotSkill
- Screenshot completo ou região específica
- PowerShell (Win), screencapture (Mac), import/scrot (Linux)

#### AutoPCWindowSkill
- Gerencia janelas (focus, minimize, maximize, close)
- Lista janelas abertas
- Busca por título ou PID

#### AutoPCScrollSkill
- Scroll vertical/horizontal
- Quantidade customizável

**Casos de Uso:**
- RPA desktop
- Automação de tarefas repetitivas
- Testing de aplicações desktop
- Captura de tela automatizada
- Integração de sistemas legados

---

## 5. Operações de Arquivo (FILE)

### 5.1 file-ops.ts - Basic File Operations

**5 Skills Básicas:**

#### FileReadSkill
- Lê conteúdo de arquivos
- Encoding customizável
- Retorna stats (size, modified)

#### FileWriteSkill
- Escreve em arquivos
- Modo append opcional
- Cria diretórios automaticamente
- `requiresApproval: true`

#### FileListSkill
- Lista arquivos recursivamente
- Pattern matching (regex)
- Retorna stats de cada arquivo

#### FileDeleteSkill
- Deleta arquivos/diretórios
- Modo recursive
- Proteção contra system directories
- `requiresApproval: true`

#### FileCreateSkill
- Cria novos arquivos sem sobrescrever
- Modo overwrite opcional

---

### 5.2 file-ops-advanced.ts - Enterprise File Operations

#### FileCreateAdvancedSkill

**Capacidades Enterprise:**

**Conflict Resolution:**
- `error` - Erro se arquivo existir
- `rename` - Renomeia automaticamente
- `suffix` - Adiciona sufixo numérico
- `backup` - Faz backup do existente
- `skip` - Pula criação

**Validation:**
- JSON validation
- YAML validation
- XML validation
- TypeScript syntax check
- Python syntax check

**Auto-formatting:**
- Formata automaticamente por tipo de arquivo
- Preserva estilo de código

**Templates:**
- `typescript-class` - Classe TypeScript boilerplate
- `python-script` - Script Python boilerplate
- `markdown` - Documento Markdown estruturado
- `json-config` - Arquivo de configuração JSON

**Advanced Features:**
- ✅ **Atomic writes** (temp file + rename)
- ✅ **Batch operations** (múltiplos arquivos de uma vez)
- ✅ **File headers** com metadata automática
- ✅ **Checksums** SHA-256 para validação
- ✅ **Dry run mode** (simula sem criar)
- ✅ **Permissions** customizáveis (chmod)
- ✅ **Creation log** interno para auditoria

**Casos de Uso:**
- Geração de código scaffolding
- DevOps automation
- Template-based file generation
- Batch file processing
- Compliance e auditoria

---

## 6. Web e HTTP (WEB)

### 6.1 web-fetch.ts - HTTP Client

**2 Skills:**

#### WebFetchSkill
- Requisições HTTP completas (GET, POST, PUT, DELETE)
- Headers customizáveis
- Response types: json, text, blob
- 30s timeout, 3 retries
- User-Agent: `OpenClaw-Aurora/1.0`

#### WebScrapeSkill
- Extração básica de HTML
- Extrai título, meta description, links
- Remoção de scripts/styles
- Texto puro (até 10k caracteres)
- Até 100 links extraídos

**Casos de Uso:**
- Integração com APIs REST
- Web scraping básico
- Monitoring de endpoints
- Data fetching
- Webhooks

---

## 7. Comunicação (COMM)

### 7.1 comm-telegram.ts - Telegram Bot Integration

**2 Skills:**

#### TelegramSendSkill
- Envia mensagens de texto
- Envia fotos com caption
- Envia documentos
- Parse modes (HTML, Markdown)
- Reply to messages
- 30s timeout, 3 retries

#### TelegramGetUpdatesSkill
- Polling de mensagens
- Long polling (até 60s)
- Offset para controle de updates
- Limit customizável

**Dependências:**
- `TELEGRAM_BOT_TOKEN`

**Casos de Uso:**
- Notificações automáticas
- Alertas de sistema
- Chatbots
- Monitoring e status updates
- Comunicação com equipe

---

## 8. Geração de Conteúdo (CONTENT)

### 8.1 content-ia.ts - AI Content Generation

**4 Skills Especializadas:**

#### ContentBlogSkill
- Artigos SEO otimizados
- Palavras-chave customizáveis
- Tom: professional, educational, friendly
- FAQ automático
- Meta description
- Markdown output
- Fallback template sem IA

#### ContentImageSkill
- Integração DALL-E 3
- Styles: professional, minimalist, vibrant
- Sizes: 1024x1024, 1080x1080, 1080x1920
- Platforms: instagram_post, instagram_story, facebook
- Prompt suggestion (se sem API key)
- Download e save automático

#### ContentVideoSkill
- Roteiros completos com timestamps
- Tipos: educational, testimonial, tour, procedure, tips
- Descrição SEO para plataformas
- Tags/hashtags
- Thumbnail description
- Duração customizável

#### ContentEmailSkill
- Templates: welcome, promotion, newsletter, followup, reactivation, birthday
- HTML responsivo
- Personalização (nome, desconto, serviço)
- CTA buttons
- Color scheme customizável

**Dependências:**
- `ANTHROPIC_API_KEY` (opcional, tem fallback)
- `OPENAI_API_KEY` (opcional para imagens)

**Casos de Uso:**
- Marketing automation
- Content marketing
- Email campaigns
- Social media content
- SEO optimization

---

## 9. Analytics e ROI (ANALYTICS)

### 9.1 analytics-roi.ts - Marketing Analytics

**4 Skills:**

#### AnalyticsDashboardSkill
- Overview de métricas por canal
- Record de métricas customizadas
- Histórico de métricas
- In-memory database

#### AnalyticsROISkill
- Cálculo de ROI por canal
- CPL (Cost Per Lead)
- CPA (Cost Per Acquisition)
- LTV (Lifetime Value)
- Taxa de conversão
- Comparação entre canais
- Record de campanhas

#### AnalyticsConversionSkill
- Funil de conversão completo
- Taxa por canal
- Estimativas de etapas intermediárias

#### AnalyticsReportSkill
- Relatórios mensais/trimestrais
- ASCII art visual
- Recomendações automáticas baseadas em ROI
- Export para arquivo

**Casos de Uso:**
- Business intelligence
- Análise de campanhas
- Tomada de decisões
- Otimização de investimentos
- Performance tracking

---

## 10. Marketing e Captação (MARKETING)

### 10.1 marketing-captacao.ts - Lead Generation

**4 Skills:**

#### MarketingLandingSkill
- Gera landing pages responsivas
- Formulário de captação integrado
- WhatsApp float button
- Benefícios customizáveis
- CTA personalizável
- Color scheme
- Submit via webhook/API

#### MarketingLeadsSkill (CRM)

**Actions:** add, update, get, list, search, stats, delete

**Funcionalidades:**
- Lead scoring automático (0-100)
- Estágios: new, contacted, interested, scheduled, patient, lost
- Tags e notas
- Busca por nome/telefone/email
- Stats: conversão, distribuição por estágio/source

#### MarketingFunnelSkill
- Visualização de funil
- Move leads entre estágios
- Relatório visual com ASCII
- Taxa de conversão

#### MarketingAdsSkill
- Gerencia Google Ads e Meta Ads
- Actions: create, pause, resume, stats, budget, keywords
- Mock mode com sugestões (se sem API key)
- Audience targeting

**Dependências:**
- `GOOGLE_ADS_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID` (opcional)
- `META_ADS_TOKEN`, `META_ADS_ACCOUNT_ID` (opcional)

**Casos de Uso:**
- Marketing automation
- Lead nurturing
- Campaign management
- CRM básico
- Funnel optimization

---

## 11. Reviews e Reputação (REVIEWS)

### 11.1 reviews-reputation.ts - Reputation Management

**3 Skills:**

#### ReviewsGoogleSkill
- Fetch reviews do Google My Business
- Auto-reply com IA (Claude)
- Fallback templates (positivo/negativo)
- Stats: média, distribuição, taxa de resposta

#### ReviewsRequestSkill
- Envia pedidos de avaliação pós-consulta
- Canais: WhatsApp, Email, SMS
- Mensagens personalizadas
- Link direto para Google Reviews
- Delay scheduling

#### ReviewsReportSkill
- Relatório de reputação com ASCII art
- Distribuição visual por estrelas
- Taxa de resposta
- Export para arquivo

**Dependências:**
- `GOOGLE_BUSINESS_TOKEN`, `GOOGLE_PLACE_ID`
- `GOOGLE_REVIEW_LINK`

**Casos de Uso:**
- Gestão de reputação online
- Customer success
- Pedidos automatizados de review
- Resposta automática a avaliações
- Monitoring de satisfação

---

## 12. Social Media (SOCIAL)

### 12.1 social-media.ts - Social Media Management

**5 Skills:**

#### SocialPostSkill
- Posta em Instagram, Facebook, TikTok
- Suporte a imagens e vídeos
- Hashtags automáticas
- Multi-platform (all)
- Histórico de posts com métricas

#### SocialScheduleSkill
- Agenda posts com data/hora
- Calendário editorial
- Actions: add, list, cancel, calendar
- Status tracking (pending, posted, failed)

#### SocialCaptionSkill
- Gera legendas com IA (Claude)
- Tom: professional, friendly, educational, promotional
- 15-20 hashtags relevantes
- Emojis opcionais
- CTA customizável
- Otimizado por plataforma

#### SocialReelsSkill
- Roteiros de Reels/Shorts (15s, 30s, 60s)
- Estilos: tutorial, antes_depois, depoimento, dica_rapida, bastidores
- Cenas com timestamps
- Sugestão de música
- Hashtags e legenda

#### SocialAnalyticsSkill
- Métricas de engajamento (likes, comments, shares, reach)
- Taxa de engajamento
- Integração com Instagram/Facebook Insights
- Posts agendados pendentes

**Dependências:**
- `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ID`
- `FACEBOOK_PAGE_TOKEN`, `FACEBOOK_PAGE_ID`
- `TIKTOK_ACCESS_TOKEN`

**Casos de Uso:**
- Social media management
- Content scheduling
- Engagement tracking
- Multi-platform posting
- Analytics e performance

---

## 13. Utilitários (UTIL)

### 13.1 util-misc.ts - Utility Functions

**5 Skills:**

#### UtilSleepSkill
- Aguarda tempo específico (até 10 minutos)
- Input: ms ou seconds

#### UtilDatetimeSkill
- **Operations:** now, parse, add, diff
- Múltiplos formatos (ISO, timestamp, unix)
- Timezone support
- Date arithmetic (add days, hours, minutes)
- Diff entre datas

#### UtilUUIDSkill
- Gera UUIDs v4
- Batch generation (até 100)

#### UtilHashSkill
- Hashing de dados
- Algorithms: sha256, md5, sha1, etc.
- Encodings: hex, base64
- Suporte a objetos (JSON.stringify)

#### UtilJSONSkill
- **Operations:** parse, stringify, get, validate
- Path access (ex: "user.name")
- Pretty-print com indent

**Casos de Uso:**
- Helpers gerais
- Data processing
- ID generation
- Data validation
- Timestamps e scheduling

---

## 14. Segurança e Proteção (GUARDRAIL)

### 14.1 guardrail.ts - Security & Validation

#### GuardrailSkill

**Proteção contra:**
- ✅ SQL Injection
- ✅ XSS (Cross-Site Scripting)
- ✅ Path Traversal
- ✅ Command Injection

**Resource Limits:**
- Max memory: 512MB
- Max CPU: 80%
- Max requests/min: 100
- Max execution time: 30s
- Max file upload: 50MB

**Funcionalidades:**
- `validateInput()` - Valida contra anti-patterns
- `checkRateLimit()` - Rate limiting por identificador
- `checkResourceLimits()` - Monitora recursos
- `getStatus()` - Status completo do guardrail

**Métricas:**
- Violations counter
- Blocked requests counter
- Real-time resource usage
- Active/inactive status

**Casos de Uso:**
- Security layer para todos os skills
- Input sanitization
- DoS protection
- Resource management
- Compliance e auditoria

---

## Resumo Por Categoria

### 📊 Distribuição de Skills

| Categoria | Skills | Descrição |
|-----------|--------|-----------|
| **Inteligência Artificial** | 3 | Claude, GPT, Ollama |
| **Execução** | 1 | Bash execution |
| **Browser Automation** | 8 | Puppeteer control completo |
| **Desktop Automation** | 7 | Cross-platform control |
| **File Operations** | 6 | Básicas (5) + Advanced (1) |
| **Web & HTTP** | 2 | Fetch + Scrape |
| **Comunicação** | 2 | Telegram bot |
| **Content Generation** | 4 | Blog, Image, Video, Email |
| **Analytics** | 4 | Dashboard, ROI, Conversion, Report |
| **Marketing** | 4 | Landing, Leads, Funnel, Ads |
| **Reviews** | 3 | Google, Request, Report |
| **Social Media** | 5 | Post, Schedule, Caption, Reels, Analytics |
| **Utilitários** | 5 | Sleep, Datetime, UUID, Hash, JSON |
| **Segurança** | 1 | Guardrail protection |
| **TOTAL** | **53+** | Skills operacionais |

---

## Dependências Externas

### APIs de IA
```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OLLAMA_URL=http://localhost:11434
```

### Comunicação
```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
```

### Marketing & Ads
```env
GOOGLE_ADS_TOKEN=...
GOOGLE_ADS_CUSTOMER_ID=...
META_ADS_TOKEN=...
META_ADS_ACCOUNT_ID=...
GOOGLE_BUSINESS_TOKEN=...
GOOGLE_PLACE_ID=...
GOOGLE_REVIEW_LINK=https://...
```

### Social Media
```env
INSTAGRAM_ACCESS_TOKEN=...
INSTAGRAM_BUSINESS_ID=...
FACEBOOK_PAGE_TOKEN=...
FACEBOOK_PAGE_ID=...
TIKTOK_ACCESS_TOKEN=...
```

### Bibliotecas Node.js
- Puppeteer (browser control)
- Native: crypto, fs, child_process
- Axios / node-fetch (HTTP)

---

## Conclusão

O **OpenClaw Operator Core** é uma plataforma de automação enterprise completa com:

✅ **53+ skills funcionais** cobrindo IA, automação, marketing, analytics e segurança
✅ **Integração com 10+ APIs externas** (Claude, GPT, Telegram, Google, Meta, etc.)
✅ **Cross-platform support** (Windows, Mac, Linux)
✅ **Enterprise features**: atomic operations, validation, rate limiting, guardrails
✅ **Marketing automation completo**: desde captação de leads até gestão de reputação
✅ **Fallback gracioso**: todos os skills funcionam mesmo sem API keys (modo mock/template)
✅ **Segurança por padrão**: validação de inputs, anti-patterns, resource limits

### Casos de Uso Principais

1. **Automação de Marketing** para clínicas/empresas
2. **RPA** (Robotic Process Automation) desktop e web
3. **Content Generation** e social media management
4. **Lead Nurturing** e CRM automation
5. **Analytics** e business intelligence
6. **Gestão de Reputação** online
7. **DevOps** e deployment automation

---

**OpenClaw Operator Core** - O foundation master do OpenClaw Aurora 🚀
