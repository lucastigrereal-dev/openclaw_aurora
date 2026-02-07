# 🎯 OpenClaw Hubs - Propósito e Arquitetura

**Versão:** 2.0.0
**Data:** 2026-02-07
**Status:** Production Ready

---

## 📚 Índice

1. [Visão Geral](#visão-geral)
2. [OpenClaw Operator Core](#openclaw-operator-core)
3. [Hub Enterprise](#hub-enterprise)
4. [Hub Supabase Archon](#hub-supabase-archon)
5. [Hub Social Media](#hub-social-media)
6. [Fluxo de Execução](#fluxo-de-execução)
7. [Como Criar Novos Hubs](#como-criar-novos-hubs)

---

## Visão Geral

OpenClaw Aurora é um sistema de hubs especializados, onde:

- **🔴 OPENCLAW OPERATOR CORE** = O mestre, fornece operações fundamentais
- **🟢 HUBS** = Especializações que utilizam o Operator Core

```
                    OPENCLAW OPERATOR CORE
                    (AI, EXEC, FILE, WEB, etc)
                              ↓
         ┌────────────────────┼────────────────────┐
         ↓                    ↓                    ↓
    HUB ENTERPRISE        HUB SUPABASE         HUB SOCIAL
    (Projetos)           (Database)           (Social Media)
```

---

## 🔴 OpenClaw Operator Core

### O Quê?
O coração do OpenClaw. Um conjunto de skills fundamentais e atomizados que executam operações básicas.

### Por Quê?
- **Modularização**: Cada skill é independente e reutilizável
- **Reusabilidade**: Todos os hubs utilizam os mesmos skills
- **Simplicidade**: Operações simples e bem definidas
- **Confiabilidade**: Base sólida para outros hubs

### Para Quê?
Fornecer operações atômicas que qualquer hub possa chamar para:
- Executar código (EXEC: bash, python, powershell, node)
- Processar com IA (AI: Claude, GPT, Ollama)
- Interagir com browsers (BROWSER: click, type, screenshot, extract)
- Automatizar desktop (AUTOPC: mouse, keyboard, windows)
- Manipular arquivos (FILE: read, write, list, delete)
- Integração web (WEB: fetch, scrape, post)
- Comunicação (COMM: telegram)
- Utilitários (UTIL: datetime, uuid, hash, json)

### Localização
```
/skills/ (raiz)
├── ai-*.ts (Claude, GPT, Ollama)
├── exec-*.ts (Bash, Python, PowerShell, Node)
├── browser-*.ts (Web automation)
├── autopc-*.ts (Desktop automation)
├── file-*.ts (File operations)
├── web-*.ts (Web integration)
├── comm-*.ts (Telegram)
└── util-*.ts (Utilities)
```

### Status
✅ **OPERACIONAL** - Compilado e funcionando

### Exemplos de Uso
```typescript
// Hub Enterprise chamando Operator Core
const aiResult = await operatorCore.callSkill('ai-claude', {
  prompt: 'Design a database schema'
});

const fileResult = await operatorCore.callSkill('file-ops', {
  action: 'write',
  path: './schema.sql',
  content: aiResult.data
});

const webResult = await operatorCore.callSkill('web-fetch', {
  url: 'https://api.github.com/repos',
  method: 'POST',
  data: { schema: aiResult.data }
});
```

---

## 🟢 Hub Enterprise

### O Quê?
Um hub de orquestração de projetos com 9 personas especializadas + 1 orchestrator.

### Por Quê?
- **Projetos Complexos**: Coordenar múltiplos aspectos de um projeto
- **Personas Especializadas**: Cada persona é especialista em seu domínio
- **Workflow Inteligente**: Rotear automaticamente para a persona correta
- **Resultado Completo**: Gerar deliverables de múltiplos ângulos

### Para Quê?
Entregar projetos completos de software, do conceito até a produção:
- **Produto** → MVP definition, feature scoping, requirements
- **Arquitetura** → System design, tech stack, scalability
- **Engenharia** → Code generation, scaffolding, CI/CD
- **QA** → Testing, validation, quality checks
- **Ops** → Deployment, monitoring, incident management
- **Security** → Audits, vulnerability scanning, compliance
- **Dados** → Dashboards, analytics, data pipelines
- **Design** → Wireframes, design systems, accessibility
- **Performance** → Profiling, optimization, SLO monitoring

### 6 Workflows Executáveis
```
1. full ..................... Todas as 9 personas (projeto completo)
2. mvp-only .................. Apenas MVP
3. code-only ................. Apenas desenvolvimento
4. test-only ................. Apenas QA e testes
5. incident-response ......... Correções de emergência
6. feature-add ............... Novas features
```

### Localização
```
/skills/hub-enterprise/
├── hub-enterprise-orchestrator.ts (Coordenador)
├── hub-enterprise-index.ts (Registry)
├── personas/
│   ├── hub-enterprise-produto.ts
│   ├── hub-enterprise-arquitetura.ts
│   ├── hub-enterprise-engenharia.ts
│   ├── hub-enterprise-qa.ts
│   ├── hub-enterprise-ops.ts
│   ├── hub-enterprise-security.ts
│   ├── hub-enterprise-dados.ts
│   ├── hub-enterprise-design.ts
│   └── hub-enterprise-performance.ts
└── shared/
    ├── hub-enterprise-config.ts
    ├── hub-enterprise-logger.ts
    └── hub-enterprise-templates.ts
```

### Status
✅ **OPERACIONAL** - Compilado e funcionando perfeitamente

### Exemplo de Workflow
```typescript
// Requisição: "Criar um blog completo"
const workflow = await hubEnterprise.executeWorkflow('full', {
  projectType: 'blog',
  requirements: 'Um blog moderno com posts, comentários e analytics'
});

// Resultado:
// ├─ Produto: MVP definido, features priorizadas
// ├─ Arquitetura: Tech stack proposto, diagrama de sistema
// ├─ Engenharia: Código gerado, scaffolding completo
// ├─ QA: Plano de testes, checklist
// ├─ Ops: Deployment pipeline, monitoring
// ├─ Security: Audit, recomendações
// ├─ Dados: Dashboard schema, analytics
// ├─ Design: Wireframes, design system
// └─ Performance: Benchmarks, otimizações
```

---

## 🟢 Hub Supabase Archon

### O Quê?
Um hub especializado em gerenciamento e otimização de bancos de dados Supabase/PostgreSQL com 30+ microskills.

### Por Quê?
- **Complexidade de Database**: Gerenciar BD requer expertise específica
- **Problemas Comuns**: Query optimization, index management, replication, etc.
- **Automação**: Automatizar tarefas repetitivas de DBA
- **Monitoramento**: Detectar e resolver problemas proativamente

### Para Quê?
Gerenciar ciclo completo de banco de dados:

**Performance & Optimization:**
- Index Optimizer → Encontrar e criar índices melhores
- Query Cache → Cache inteligente de queries
- Slow Query Logger → Detectar queries lentas
- Query Doctor → Diagnosticar e sugerir otimizações
- AI Query Optimizer → Otimizar com IA

**Database Health:**
- Health Dashboard → Status geral do BD
- Statistics Collector → Coletar estatísticas
- Vacuum Scheduler → Limpeza e manutenção
- Table Bloat Detector → Detectar fragmentação
- Disk Usage Monitor → Monitorar uso de disco

**Replication & Backup:**
- Replication Monitor → Monitorar replicação
- Backup Driller → Executar e validar backups
- Migration Planner → Planejar migrações

**Monitoring & Debugging:**
- Transaction Monitor → Monitorar transações
- Lock Monitor → Detectar deadlocks
- Deadlock Detector → Analisar e resolver deadlocks
- Connection Pool → Gerenciar conexões

**Security & Compliance:**
- RLS Auditor → Auditoria de Row Level Security
- Permission Diff → Comparar permissões
- Secrets Scanner → Detectar secrets expostos
- Compliance Reporter → Relatórios de conformidade
- Data Auditor → Auditoria de dados

**Cost Management:**
- Cost Analyzer → Analisar custos
- Rate Limiter → Controlar taxa de requisições
- Circuit Breaker → Proteção de sobrecarga

**Database Schema:**
- Schema Differ → Comparar schemas
- Partition Manager → Gerenciar partições
- Edge Function Monitor → Monitorar edge functions

### Localização
```
/skills/supabase-archon/
├── supabase-archon-index.ts (Registry)
├── supabase-ai-query-optimizer.ts
├── supabase-index-optimizer.ts
├── supabase-query-cache.ts
├── supabase-slow-query-logger.ts
├── supabase-health-dashboard.ts
├── supabase-replication-monitor.ts
├── supabase-backup-driller.ts
├── supabase-migration-planner.ts
├── supabase-transaction-monitor.ts
├── supabase-deadlock-detector.ts
├── supabase-lock-monitor.ts
├── supabase-rls-auditor.ts
├── supabase-permission-diff.ts
├── supabase-secrets-scanner.ts
├── supabase-compliance-reporter.ts
├── supabase-cost-analyzer.ts
├── supabase-rate-limiter.ts
├── supabase-circuit-breaker.ts
├── supabase-schema-differ.ts
├── supabase-partition-manager.ts
├── supabase-edge-function-monitor.ts
├── supabase-vacuum-scheduler.ts
├── supabase-statistics-collector.ts
├── supabase-data-auditor.ts
├── supabase-connection-pool.ts
├── supabase-table-bloat-detector.ts
├── supabase-disk-usage-monitor.ts
└── +mais skills especializadas
```

### Status
⚠️ **BLOQUEADO** - Não está sendo compilado (tsconfig exclui)

### Por Que Bloqueado?
- Estava causando 60+ erros de compilação
- API desatualizada
- Dependências quebradas
- Precisa de refatoração antes de usar

### Como Ativar?
```bash
# 1. Ajustar tsconfig.json para incluir supabase-archon
# 2. Atualizar skills para nova API
# 3. Resolver dependências
# 4. Testar
# 5. Commit
```

### Exemplo de Uso (Quando Ativado)
```typescript
// Requisição: "Otimizar database"
const optimization = await hubSupabase.optimize({
  database: 'production',
  focus: ['slow-queries', 'index-optimization', 'replication']
});

// Resultado:
// ├─ Slow queries identificadas
// ├─ Índices sugeridos
// ├─ Plano de implementação
// ├─ Estimativa de melhoria
// └─ Instruções de deployment
```

---

## 🟢 Hub Social Media

### O Quê?
Um hub especializado em gerenciamento de redes sociais com 14+ skills.

### Por Quê?
- **Complexidade Social**: Múltiplas plataformas, políticas diferentes
- **Automação**: Automatizar posting, scheduling, analytics
- **Orquestração**: Coordenar posts em várias plataformas simultaneamente
- **Analytics**: Entender performance de conteúdo

### Para Quê?
Gerenciar presença completa em redes sociais:

**Content Creation:**
- Caption AI → Gerar captions com IA
- Hashtag AI → Gerar hashtags relevantes
- Video Enricher → Enriquecer vídeos com metadados
- Image Processing → Processar imagens

**Scheduling & Publishing:**
- Planner → Planejar calendário de posts
- Orchestrator → Coordenar publicação em múltiplas plataformas
- Publer Integration → Integração com Publer
- Approval Workflow → Workflow de aprovação

**Monitoring & Analytics:**
- Analytics Collector → Coletar dados de performance
- Analytics → Análise de engagement e reach
- Observability → Monitoramento de sistema

**Database & Inventory:**
- Database Manager → Gerenciar dados de posts
- Inventory → Inventário de conteúdo

**Governance:**
- Quota Enforcer → Controlar limites de posting
- Config → Configuração centralizada

### Localização
```
/skills/
├── social-hub-orchestrator.ts
├── social-hub-index.ts
├── social-hub-config.ts
├── social-hub-analytics.ts
├── social-hub-analytics-collector.ts
├── social-hub-caption-ai.ts
├── social-hub-hashtag-ai.ts
├── social-hub-publer.ts
├── social-hub-publer-v2.ts
├── social-hub-video-enricher.ts
├── social-hub-planner.ts
├── social-hub-approval-workflow.ts
├── social-hub-database-manager.ts
├── social-hub-inventory.ts
├── social-hub-observability.ts
├── social-hub-quota-enforcer.ts
└── social-media.ts (skill raiz)
```

**NOTA:** Atualmente disperso em `/skills/`. Deveria estar em `/skills/social-hub/`.

### Status
⚠️ **BLOQUEADO** - Não está sendo compilado (tsconfig exclui)

### Problemas:
- Skills dispersas na raiz
- Sem pasta própria
- Não está sendo compilado
- Precisa ser reorganizado

### Como Ativar?
```bash
# 1. Criar pasta /skills/social-hub/
# 2. Mover social-hub-*.ts para nova pasta
# 3. Criar social-hub-index.ts como registry
# 4. Atualizar tsconfig.json
# 5. Testar
# 6. Commit
```

### Exemplo de Workflow (Quando Ativado)
```typescript
// Requisição: "Schedule posts for next week"
const schedule = await hubSocial.schedulePosts({
  topics: ['Technology', 'AI', 'Automation'],
  platforms: ['twitter', 'linkedin', 'instagram'],
  frequency: 'daily',
  timeSlots: ['9am', '2pm', '6pm']
});

// Resultado:
// ├─ Conteúdo gerado
// ├─ Captions com IA
// ├─ Hashtags relevantes
// ├─ Schedule criado
// ├─ Aprovação pendente
// └─ Pronto para publicar
```

---

## Fluxo de Execução

### Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                     USUÁRIO                                  │
│              "Crie um projeto de blog"                       │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   HUB ENTERPRISE                             │
│              (Orchestrator recebe)                           │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │ Roteia para personas:         │
        ├──────────────────────────────┤
        ├─ Produto (MVP)               │
        ├─ Arquitetura (Tech stack)    │
        ├─ Engenharia (Code)           │
        ├─ QA (Tests)                  │
        └─ Ops (Deploy)                │
                       ↓
        ┌──────────────────────────────┐
        │ CADA PERSONA CHAMA            │
        │ OPERATOR CORE                │
        ├──────────────────────────────┤
        ├─ AI: "Gere MVP requirements" │
        ├─ FILE: "Salve em arquivo"    │
        ├─ WEB: "Poste no Git"         │
        └─ EXEC: "Execute testes"      │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              OPERATOR CORE (Executa)                         │
│         ├─ AI (Claude) → gera requisitos                     │
│         ├─ FILE ops → salva arquivo                          │
│         ├─ WEB fetch → publica no Git                        │
│         └─ EXEC bash → executa testes                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │ PERSONAS RECEBEM RESULTADOS   │
        │ E AGREGAM                    │
        └──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                HUB ENTERPRISE RETORNA                        │
│          ├─ MVP definido                                     │
│          ├─ Tech stack selecionado                           │
│          ├─ Código gerado                                    │
│          ├─ Testes criados                                   │
│          └─ Pipeline de deploy                               │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                     USUÁRIO                                  │
│         Recebe projeto completo pronto para uso              │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Hub Especializado

```
┌─────────────────────────────────────────────────────────────┐
│                     USUÁRIO                                  │
│          "Otimize meu database Supabase"                     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              HUB SUPABASE ARCHON                             │
│         (Recebe e processa requisição)                       │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │ Analisa database:             │
        ├──────────────────────────────┤
        ├─ Health Dashboard            │
        ├─ Slow Query Logger           │
        ├─ Index Optimizer             │
        └─ Statistics Collector        │
                       ↓
        ┌──────────────────────────────┐
        │ CHAMA OPERATOR CORE           │
        ├──────────────────────────────┤
        ├─ EXEC: "Rodar EXPLAIN"       │
        ├─ AI: "Analisar com Claude"   │
        ├─ FILE: "Salvar recomendações"│
        └─ WEB: "Postar plano"         │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              OPERATOR CORE (Executa)                         │
│         ├─ EXEC → executa queries                            │
│         ├─ AI → analisa com Claude                           │
│         ├─ FILE → salva relatório                            │
│         └─ WEB → publica no GitHub                           │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│            HUB SUPABASE RETORNA                              │
│    ├─ Problemas identificados                                │
│    ├─ Índices sugeridos                                      │
│    ├─ Queries otimizadas                                     │
│    └─ Plano de implementação                                 │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                     USUÁRIO                                  │
│       Recebe análise completa e recomendações                │
└─────────────────────────────────────────────────────────────┘
```

---

## Como Criar Novos Hubs

### Template de Hub

```typescript
// /skills/seu-novo-hub/seu-novo-hub-index.ts

import { Skill } from '../skill-base';

export class SeuNovoHubOrchestrator extends Skill {
  constructor() {
    super({
      name: 'seu-novo-hub-orchestrator',
      version: '1.0.0',
      description: 'Seu novo hub especializado',
      category: 'HUB',
      author: 'Your Name'
    });
  }

  async run(input: any) {
    // 1. Analisar requisição
    const analysis = this.analyzeInput(input);

    // 2. Chamar Operator Core skills
    const aiResult = await this.callOperatorCore('ai-claude', {
      prompt: analysis.prompt
    });

    const fileResult = await this.callOperatorCore('file-ops', {
      action: 'write',
      path: './result.json',
      content: aiResult.data
    });

    // 3. Processar e retornar
    return {
      success: true,
      data: {
        analysis: analysis,
        aiOutput: aiResult.data,
        filePath: fileResult.path
      }
    };
  }

  private analyzeInput(input: any) {
    // Sua lógica de análise
    return { prompt: '...' };
  }

  private async callOperatorCore(skillName: string, params: any) {
    // Chamar skill do Operator Core
    const operatorCore = await this.getOperatorCore();
    return operatorCore.callSkill(skillName, params);
  }
}
```

### Estrutura Recomendada

```
/skills/seu-novo-hub/
├── seu-novo-hub-orchestrator.ts (Coordenador)
├── seu-novo-hub-index.ts (Registry)
├── seu-novo-hub-config.ts (Configuração)
├── skills/
│   ├── skill-1.ts
│   ├── skill-2.ts
│   └── skill-3.ts
├── shared/
│   ├── helpers.ts
│   ├── types.ts
│   └── config.ts
├── tests/
│   └── seu-novo-hub.test.ts
└── README.md
```

### Passos para Criar

1. **Criar pasta** em `/skills/seu-novo-hub/`
2. **Criar orchestrator** que estende `Skill`
3. **Criar registry** em seu-novo-hub-index.ts
4. **Criar skills especializadas** conforme necessário
5. **Adicionar a tsconfig.json**
6. **Testar e validar**
7. **Documentar propósito**
8. **Commitar**

---

## Resumo Visual

```
┌────────────────────────────────────────────────────────────────┐
│                    OPENCLAW AURORA                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  🔴 OPERATOR CORE (O Mestre - Foundation)                      │
│  ├─ AI Skills (Claude, GPT, Ollama)                            │
│  ├─ EXEC Skills (Bash, Python, PowerShell, Node)               │
│  ├─ BROWSER Skills (Click, Type, Screenshot, Extract, PDF)     │
│  ├─ AUTOPC Skills (Desktop Automation)                         │
│  ├─ FILE Skills (Read, Write, List, Delete)                    │
│  ├─ WEB Skills (Fetch, Scrape, Post)                           │
│  ├─ COMM Skills (Telegram)                                     │
│  └─ UTIL Skills (Utilities)                                    │
│                                                                │
│  ┌──────────────────────────────────────────────────┐          │
│  │           🟢 HUBS (Especializações)              │          │
│  ├──────────────────────────────────────────────────┤          │
│  │                                                  │          │
│  │ 🟢 HUB ENTERPRISE ✅ (Projetos)                  │          │
│  │  └─ Orchestrator + 9 Personas                    │          │
│  │     └─ Usa: AI, EXEC, FILE, WEB, COMM          │          │
│  │                                                  │          │
│  │ 🟢 HUB SUPABASE ⚠️  (Database)                   │          │
│  │  └─ 30+ Microskills de Database                 │          │
│  │     └─ Usa: AI, EXEC, FILE                      │          │
│  │                                                  │          │
│  │ 🟢 HUB SOCIAL ⚠️  (Social Media)                 │          │
│  │  └─ 14+ Skills de Social Media                  │          │
│  │     └─ Usa: AI, FILE, WEB                       │          │
│  │                                                  │          │
│  │ 🟢 [Seus Novos Hubs] (Customizado)               │          │
│  │  └─ X+ Skills especializadas                     │          │
│  │     └─ Usa: [Skills do Operator Core]            │          │
│  │                                                  │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Conclusão

**OpenClaw Aurora é uma arquitetura em camadas:**

1. **Camada Base** = OpenClaw Operator Core (operações atômicas)
2. **Camada Hub** = Especializações que usam a camada base
3. **Camada Aplicação** = Seus próprios hubs customizados

Cada hub pode focar em seu domínio específico, reutilizando a foundation do Operator Core.

---

**Próximos passos sugeridos:**
1. ✅ Ativar Hub Supabase
2. ✅ Reorganizar Hub Social
3. ✅ Criar seus próprios hubs especializados

🚀 **OpenClaw está pronto para crescer!**
