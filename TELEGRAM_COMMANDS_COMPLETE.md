# 🤖 OpenClaw Aurora - Telegram Command Reference

**Status:** ✅ Ready to Use
**Bot:** Full Executor
**Skills:** 38+
**Interface:** Telegram Only (No Cockpit needed)

---

## 🚀 Começar Agora

### 1. Setup Token Telegram

```bash
# Crie um bot: fale com @BotFather no Telegram
# /newbot → escolha nome → guarde o token

# Adicione ao .env:
echo "TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyzABC" >> .env
echo "TELEGRAM_CHAT_ID=seu_numero_de_chat_aqui" >> .env
```

**Como pegar seu CHAT_ID:**
1. Envie qualquer mensagem para o bot
2. Abra: `https://api.telegram.org/bot{TOKEN}/getUpdates`
3. Procure por `"id"` - esse é seu CHAT_ID

### 2. Iniciar Bot

```bash
npm run bot
```

**Esperado:**
```
[Bot] Telegram bot iniciado ✅
[Bot] Admin ID: seu_chat_id
[Bot] 38 skills carregadas
[Bot] Aguardando mensagens...
```

### 3. Ir pro Telegram e Comandar!

```
/start
```

---

## 📱 TODOS OS COMANDOS

### 🎯 COMANDOS ESSENCIAIS

| Comando | Uso | Exemplo |
|---------|-----|---------|
| `/start` | Ver todos os comandos | `/start` |
| `/help` | Ajuda detalhada | `/help` |
| `/status` | Status do sistema | `/status` |

---

## 💬 CHAT COM IA

### Claude AI

```
/ask [sua pergunta]

Exemplos:
/ask create a complete todo app with Node.js and React
/ask explain machine learning in simple terms
/ask generate SQL query to get top 10 products
/ask create mvp for ecommerce platform
```

**Resposta do Claude:**
```
[Bot] 🤔 Claude is thinking...
[Bot] ✅ Claude says:
[Resposta completa]
```

### GPT (OpenAI)

```
/gpt [sua pergunta]

Exemplos:
/gpt what is blockchain
/gpt write a python function to sort arrays
/gpt generate business ideas
```

---

## 🏭 HUB ENTERPRISE - EXECUTAR PERSONAS

### Orquestrador (Rodar tudo junto)

```
/orchestrator [workflow] [intent]

Workflows:
- full: Completo (Produto → Arquitetura → Engenharia → QA → Security → Ops)
- mvp: Apenas MVP
- code: Apenas código
- test: Apenas testes
- incident: Resposta a incidentes
- feature: Adicionar feature

Exemplos:
/orchestrator full create a complete todo app
/orchestrator mvp build ecommerce platform
/orchestrator code REST API for products database
/orchestrator test validate authentication system
/orchestrator incident high cpu usage in production
/orchestrator feature add payment processing
```

**Saída esperada:**
```
🔄 Running workflow: full
├─ [Produto] MVP definition (25%)
├─ [Arquitetura] Architecture design (50%)
├─ [Engenharia] Code generation (75%)
├─ [QA] Testing (90%)
├─ [Security] Security audit (100%)
└─ [Ops] Deployment (100%)

✅ Workflow completed!
📁 App location: /apps/todo_app
📋 Summary: Generated complete application with 8000+ lines of code
```

---

### Persona: PRODUTO

```
/produto [subskill] [details]

Subskills:
1. mvp - MVP definition
2. stories - Generate user stories
3. criteria - Acceptance criteria
4. roadmap - Product roadmap
5. report - Stakeholder report

Exemplos:
/produto mvp Create a SaaS tool for project management
/produto stories E-commerce platform with cart and checkout
/produto criteria User authentication and authorization system
/produto roadmap Todo app with mobile sync
/produto report Executive summary for startup funding
```

**Saída esperada:**
```
📋 MVP Definition
├─ Scope (In):
│  ├─ User registration & login
│  ├─ Product catalog
│  ├─ Shopping cart
│  └─ Checkout process
├─ Scope (Out):
│  ├─ Advanced analytics
│  ├─ Multi-currency support
│  └─ Loyalty program
├─ Features:
│  ├─ [P0] User authentication
│  ├─ [P0] Product search
│  ├─ [P1] Product reviews
│  └─ [P2] Wishlist
└─ Risks:
   ├─ Payment integration complexity
   └─ Scalability with many users
```

---

### Persona: ARQUITETURA

```
/arquitetura [subskill] [details]

Subskills:
1. design - Architecture design
2. stack - Tech stack selection
3. api - API contracts (OpenAPI/GraphQL)
4. scaling - Scaling strategy
5. schema - Database schema design
6. security - Security review

Exemplos:
/arquitetura design ecommerce platform with 10k users
/arquitetura stack Node.js PostgreSQL React requirements
/arquitetura api REST API for product management system
/arquitetura scaling Plan scaling for 1M users/month
/arquitetura schema Design database for blog platform
/arquitetura security Review authentication system
```

**Saída esperada:**
```
🏗️ Architecture Design
├─ Pattern: Microservices
├─ Components:
│  ├─ API Gateway (Kong)
│  ├─ Auth Service (Auth0)
│  ├─ Product Service (Node.js)
│  ├─ Order Service (Go)
│  └─ Payment Service (Python)
├─ Tech Stack:
│  ├─ Backend: Node.js, Go, Python
│  ├─ Database: PostgreSQL, MongoDB, Redis
│  ├─ Frontend: React, TypeScript
│  └─ Infrastructure: Docker, Kubernetes, AWS
└─ Scalability:
   ├─ Horizontal scaling via Kubernetes
   ├─ Database sharding strategy
   └─ Caching layer (Redis)
```

---

### Persona: ENGENHARIA

```
/engenharia [subskill] [details]

Subskills:
1. scaffold - App scaffolding
2. database - Database setup + migrations
3. cicd - CI/CD pipeline
4. api - Generate API endpoints
5. auth - Setup authentication
6. monitoring - Monitoring setup
7. tests - Generate tests

Exemplos:
/engenharia scaffold Create Node.js Express TypeScript app
/engenharia database PostgreSQL for ecommerce with migrations
/engenharia cicd GitHub Actions pipeline with testing
/engenharia api Generate REST endpoints for product CRUD
/engenharia auth JWT authentication with refresh tokens
/engenharia monitoring Prometheus + Grafana setup
/engenharia tests Generate Jest unit tests
```

**Saída esperada:**
```
💻 App Scaffolding
📁 Project structure created:
├─ src/
│  ├─ server.ts
│  ├─ routes/
│  │  ├─ auth.ts
│  │  ├─ products.ts
│  │  └─ orders.ts
│  ├─ models/
│  ├─ middleware/
│  └─ utils/
├─ migrations/
├─ tests/
├─ package.json
├─ docker-compose.yml
├─ .github/workflows/ci.yml
└─ README.md

✅ Ready to use:
npm install
npm run dev
```

---

### Persona: QA

```
/qa [subskill] [details]

Subskills:
1. smoke - Smoke tests
2. integration - Integration tests
3. performance - Performance tests (k6)
4. security - Security tests (OWASP ZAP)
5. accessibility - WCAG compliance
6. coverage - Coverage report

Exemplos:
/qa smoke Test API health check
/qa integration Test user registration flow
/qa performance Load test 1000 concurrent users
/qa security Scan for OWASP top 10 vulnerabilities
/qa accessibility Check WCAG 2.1 AA compliance
/qa coverage Generate code coverage report
```

**Saída esperada:**
```
🧪 Smoke Tests
├─ Tests: 12 total
├─ ✅ Passed: 11
├─ ❌ Failed: 1
├─ Coverage: 78%
└─ Failed Tests:
   └─ POST /api/auth/login - Invalid JWT secret

⚠️ BLOCKER: Fix JWT configuration before deployment
```

---

### Persona: OPS

```
/ops [subskill] [details]

Subskills:
1. provision - Provision infrastructure
2. cicd - Setup CI/CD
3. deploy - Deploy to production
4. monitoring - Setup monitoring
5. logging - Setup logging (ELK/Loki)
6. backup - Automated backups
7. incident - Incident response

Exemplos:
/ops provision AWS infrastructure for ecommerce app
/ops cicd GitHub Actions with automated testing
/ops deploy Blue-green deployment strategy
/ops monitoring Prometheus + Grafana dashboards
/ops logging ELK stack for centralized logging
/ops backup Daily automated backups with retention
/ops incident CPU spike incident response runbook
```

**Saída esperada:**
```
🚀 Deployment
├─ Strategy: Blue-Green
├─ Current:
│  ├─ Blue (v1.2.0): 3 instances - healthy
│  └─ Green (v1.3.0): 3 instances - starting
├─ Health Check:
│  ├─ Blue: ✅ 100% healthy
│  └─ Green: 🔄 Starting (95%)
├─ Traffic:
│  ├─ Blue: 100% → 90%
│  └─ Green: 0% → 10%
└─ Rollback: Available (< 5 minutes)

✅ Deployment successful!
```

---

### Persona: SECURITY

```
/security [subskill] [details]

Subskills:
1. audit - Full security audit
2. scan - Vulnerability scanning
3. pentest - Penetration testing
4. compliance - Compliance check (LGPD/GDPR)
5. secrets - Secrets rotation
6. access - Access control review

Exemplos:
/security audit Complete security assessment
/security scan Check for CVE vulnerabilities
/security pentest Simulate attacks on API
/security compliance Check LGPD compliance
/security secrets Rotate all credentials
/security access Review RBAC permissions
```

**Saída esperada:**
```
🔐 Security Audit
├─ Score: 85/100
├─ Vulnerabilities:
│  ├─ 🔴 Critical: 0
│  ├─ 🟠 High: 2
│  ├─ 🟡 Medium: 5
│  └─ 🔵 Low: 12
├─ Findings:
│  └─ [HIGH] SQL Injection in /api/search
│     Location: src/routes/products.ts:42
│     Fix: Use parameterized queries
└─ Compliance:
   ├─ LGPD: ✅ Compliant
   ├─ GDPR: ✅ Compliant
   └─ SOC2: 🟡 Partial
```

---

### Persona: DADOS

```
/dados [subskill] [details]

Subskills:
1. dashboard - Create Grafana dashboard
2. analytics - Setup analytics (Google Analytics)
3. pipeline - Setup data pipeline (ETL)
4. optimize - Query optimization
5. quality - Data quality checks
6. report - Generate reports

Exemplos:
/dados dashboard Create sales metrics dashboard
/dados analytics Setup Google Analytics tracking
/dados pipeline ETL pipeline from PostgreSQL to Warehouse
/dados optimize Optimize slow database queries
/dados quality Data validation rules
/dados report Generate daily sales report
```

---

### Persona: DESIGN

```
/design [subskill] [details]

Subskills:
1. wireframes - Create wireframes
2. design_system - Design system
3. flows - User flows
4. accessibility - WCAG audit
5. prototype - Interactive prototype

Exemplos:
/design wireframes Wireframes for todo app (home, task, dashboard)
/design design_system Create Figma design system
/design flows User journey for checkout process
/design accessibility Check WCAG 2.1 AA compliance
/design prototype Create interactive prototype
```

---

### Persona: PERFORMANCE

```
/performance [subskill] [details]

Subskills:
1. audit - Performance audit
2. load - Load testing (k6)
3. capacity - Capacity planning
4. slo - SLO/SLA monitoring
5. optimize - Query optimization
6. caching - Caching strategy

Exemplos:
/performance audit Identify performance bottlenecks
/performance load Test 5000 concurrent users
/performance capacity Plan for 10x growth
/performance slo Monitor 99.9% uptime SLA
/performance optimize Slow database queries
/performance caching Redis caching strategy
```

---

## 💻 EXECUTAR CODE

### Bash

```
/exec [comando bash]

Exemplos:
/exec ls -la
/exec npm install express cors
/exec git status
/exec docker ps
/exec curl https://api.github.com
```

### PowerShell

```
/ps [comando powershell]

Exemplos:
/ps Get-Process
/ps Get-ChildItem -Path C:\
/ps Test-Connection google.com
```

### Python

```
/py [código python]

Exemplos:
/py print("hello world")
/py import requests; print(requests.get('https://google.com').status_code)
/py for i in range(10): print(i)
```

### Node.js

```
/node [código javascript]

Exemplos:
/node console.log("hello world")
/node const fs = require('fs'); console.log(fs.readdirSync('.'))
/node console.log(new Date().toISOString())
```

---

## 🌐 CONTROLAR BROWSER

```
/open [url]           # Abrir URL
/click [seletor]      # Clicar elemento
/type [seletor] [txt] # Digitar texto
/screenshot           # Screenshot

Exemplos:
/open https://google.com
/click input[name="q"]
/type input[name="q"] hello world
/screenshot
```

---

## 🖥️ AUTOPC (Controlar Mouse/Teclado)

```
/click-pc [x] [y]     # Clicar em posição
/type-pc [texto]      # Digitar
/move-pc [x] [y]      # Mover mouse
/screenshot-pc        # Screenshot da tela

Exemplos:
/click-pc 500 300     # Clicar em x=500, y=300
/type-pc hello world
/move-pc 1024 768
/screenshot-pc
```

---

## 📊 MONITORAMENTO

```
/status               # Status geral do sistema
/metrics              # Métricas detalhadas
/logs [linhas]        # Ver últimos logs
/health               # Health check
/uptime               # Tempo de atividade
/resources            # Uso de recursos
```

**Saída esperada:**
```
📊 System Status
├─ Uptime: 2d 14h 32m
├─ CPU: 12% (4 cores)
├─ Memory: 456MB / 2GB (22%)
├─ Disk: 125GB / 500GB (25%)
├─ Active Skills: 3
├─ Messages Today: 142
├─ Errors: 0
└─ Health: 🟢 HEALTHY

📈 Metrics:
├─ telegram.messages: 142
├─ telegram.latency: 145ms avg
├─ skill.executions: 23
├─ skill.success_rate: 98.2%
├─ api.calls: 567
└─ database.queries: 1,234
```

---

## 🔗 SOCIAL HUB

```
/social [subskill] [details]

Subskills:
1. generate - Gerar conteúdo
2. schedule - Agendar posts
3. analytics - Ver analytics

Exemplos:
/social generate Create 5 LinkedIn posts about AI
/social schedule Schedule Instagram stories for tomorrow
/social analytics View engagement metrics for this week
```

---

## 🗄️ SUPABASE

```
/supabase [subskill] [details]

Exemplos:
/supabase create-table Create users table
/supabase setup-rls Setup Row Level Security
/supabase create-index Create performance indexes
```

---

## 🔐 GUARDRAIL

```
/validate [input]     # Validar input de segurança

Exemplos:
/validate SELECT * FROM users; DROP TABLE users;
# Detecta: SQL Injection ❌ Blocked
```

---

## 📱 DICAS E TRUQUES

### 1. Mensagens Longas

Se a resposta é muito longa, o bot envia em partes:
```
[1/3] Primeira parte...
[2/3] Segunda parte...
[3/3] Última parte...
```

### 2. Status em Tempo Real

Operações longas mostram progresso:
```
🔄 Processing: MVP definition (15%)
🔄 Processing: MVP definition (45%)
🔄 Processing: MVP definition (75%)
✅ Complete!
```

### 3. Histórico

Todas as mensagens são salvas:
```
/history              # Ver histórico
/history 20           # Últimas 20 mensagens
/history search term  # Buscar
```

### 4. Configurações

```
/config                # Ver configurações
/config timeout 60     # Mudar timeout
/config max-retries 5  # Tentar 5 vezes
```

---

## ⚙️ VARIÁVEIS DE AMBIENTE

```bash
# Obrigatório
TELEGRAM_BOT_TOKEN=seu_token

# Recomendado
TELEGRAM_CHAT_ID=seu_chat_id
TELEGRAM_ADMIN_IDS=id1,id2,id3

# Opcional
LOG_LEVEL=info
SKILL_TIMEOUT=30000      # 30 segundos
MAX_RETRIES=3
RATE_LIMIT=10/min
```

---

## 🚨 TROUBLESHOOTING

### Bot não responde

```bash
# Verificar token
echo $TELEGRAM_BOT_TOKEN

# Verificar se está rodando
ps aux | grep telegram

# Reiniciar
npm run bot
```

### Erro: "Bot was blocked"

```
# Abra chat com @BotFather
/unblock
# Depois desbloqueie o bot
```

### Erro: Rate limit

```
Aguarde 1 minuto ou aumentar em .env:
RATE_LIMIT=20/min
```

---

## 🎯 WORKFLOW COMPLETO (Exemplo)

### Criar App Completo

```
Passo 1: MVP Definition
/produto mvp Create ecommerce platform with Stripe integration

Passo 2: Architecture Design
/arquitetura design ecommerce with 100k users

Passo 3: Generate Code
/engenharia scaffold Node.js Express TypeScript app
/engenharia api REST endpoints for products and orders
/engenharia auth JWT + refresh token implementation
/engenharia database PostgreSQL schema with migrations

Passo 4: Setup Infrastructure
/ops provision AWS infrastructure with VPC
/ops cicd GitHub Actions with testing and deployment

Passo 5: Testing
/qa smoke Test API endpoints
/qa integration Test user flows
/qa performance Load test 5k concurrent users
/qa security OWASP vulnerability scan

Passo 6: Deployment
/ops deploy Blue-green deployment to production

Passo 7: Monitoring
/monitoring dashboard Prometheus + Grafana
/monitoring logging ELK stack

✅ Pronto! App em produção!
```

---

## 🎉 Resumo

| Feature | Status |
|---------|--------|
| Chat IA (Claude/GPT) | ✅ Pronto |
| 9 Personas | ✅ Pronto |
| 55+ Subskills | ✅ Pronto |
| Code Execution | ✅ Pronto |
| Browser Control | ✅ Pronto |
| AutoPC | ✅ Pronto |
| Monitoring | ✅ Pronto |
| Security | ✅ Pronto |
| Histórico | ✅ Pronto |

---

## 🚀 COMECE AGORA

```bash
# 1. Setup
echo "TELEGRAM_BOT_TOKEN=seu_token" >> .env
echo "TELEGRAM_CHAT_ID=seu_chat_id" >> .env

# 2. Iniciar
npm run bot

# 3. Ir pro Telegram
/start

# 4. Comandar tudo!
/ask create a todo app
/orchestrator full Build complete ecommerce
/status
```

---

**Tudo pronto para você comandar o Aurora pelo Telegram!** 🚀🤖

Qualquer dúvida, chama!
