# 🚀 ROADMAP: EVOLUÇÃO DO OPENCLAW AURORA
## Análise Estratégica + Plano de Implementação

**Versão**: 1.0
**Data**: 2026-02-05
**Status Atual**: 19 skills ativas, sistema base sólido
**Objetivo**: Transformar OpenClaw em sistema auto-evolutivo enterprise-grade

---

## 📊 ANÁLISE: O QUE JÁ TEMOS

### ✅ FUNDAÇÃO (Parcialmente Implementada)

| Módulo | Status | Arquivo | Completude |
|--------|--------|---------|------------|
| **Skill Base** | ✅ PRONTO | `skills/skill-base.ts` | 90% |
| **Skill Registry** | 🟡 BÁSICO | `skills/skill-base.ts` | 40% |
| **Skill Executor** | ✅ PRONTO | `skill-executor.ts` | 85% |
| **Aurora Monitor** | ✅ PRONTO | `aurora-openclaw-integration.ts` | 95% |
| **Circuit Breaker** | ✅ PRONTO | Aurora Monitor | 100% |
| **Approval Workflow** | 🟡 BÁSICO | `skill-executor.ts` | 50% |

**O que funciona bem**:
- ✅ Sistema de eventos (EventEmitter)
- ✅ Validação de inputs
- ✅ Métricas e duração
- ✅ Proteção com Circuit Breaker (AI skills)
- ✅ Approval básico (timeout 60s)
- ✅ Histórico de execuções (1000 últimas)

**O que falta**:
- ❌ Versionamento de skills (semver)
- ❌ Sistema de dependências
- ❌ Status (draft/stable/deprecated)
- ❌ Nível de risco
- ❌ Policy Kit (regras contextuais)
- ❌ Plugin system

---

## 📋 MATRIZ: PROPOSTA vs REALIDADE

### 1) FUNDAÇÃO

| ID | Skill Proposta | Existe? | Completude | Prioridade |
|----|---------------|---------|------------|------------|
| F-01 | SkillSpec Contract | 🟡 Parcial | 40% | 🔴 CRÍTICA |
| F-02 | Registry v2 | ❌ Não | 0% | 🔴 CRÍTICA |
| F-03 | Skill Pack Loader | ❌ Não | 0% | 🟡 MÉDIA |
| F-04 | Policy Kit | ❌ Não | 0% | 🟢 BAIXA |

**Análise F-01 (SkillSpec Contract)**:
- **Existe**: `SkillMetadata` + `SkillConfig` em skill-base.ts
- **Falta**: version, status, dependencies, risk, capabilities
- **Impacto**: ALTO - sem isso, skills viram freestyle
- **Esforço**: BAIXO - apenas extend interfaces

**Análise F-02 (Registry v2)**:
- **Existe**: `SkillRegistry` básico
- **Falta**: versionamento, dependências, status lifecycle
- **Impacto**: ALTO - base para auto-evolução
- **Esforço**: MÉDIO - refactor do registry atual

**Análise F-03 (Pack Loader)**:
- **Existe**: Registro manual em index.ts
- **Falta**: carregamento dinâmico de pacotes
- **Impacto**: MÉDIO - escalabilidade
- **Esforço**: MÉDIO

**Análise F-04 (Policy Kit)**:
- **Existe**: `requiresApproval` básico
- **Falta**: regras contextuais (horário, usuário, ambiente)
- **Impacto**: MÉDIO - segurança granular
- **Esforço**: ALTO

### 2) ORQUESTRAÇÃO

| ID | Skill Proposta | Existe? | Completude | Prioridade |
|----|---------------|---------|------------|------------|
| O-01 | Intent Router Pro | ❌ Não | 0% | 🔴 CRÍTICA |
| O-02 | Skill Planner | ❌ Não | 0% | 🟡 MÉDIA |
| O-03 | Middleware Engine | ❌ Não | 0% | 🟢 BAIXA |
| O-04 | Approval Composer | 🟡 Parcial | 30% | 🟡 MÉDIA |

**Análise O-01 (Intent Router)**:
- **Existe**: Telegram bot tem NLP básico
- **Falta**: classificação inteligente PT-BR/EN
- **Impacto**: ALTO - UX automática
- **Esforço**: MÉDIO - integrar Claude/GPT

**Análise O-02 (Skill Planner)**:
- **Existe**: Skills executam isoladas
- **Falta**: encadeamento automático
- **Impacto**: MÉDIO - workflows complexos
- **Esforço**: ALTO

**Análise O-04 (Approval Composer)**:
- **Existe**: Sistema básico de aprovação
- **Falta**: trilhas customizáveis por risco
- **Impacto**: MÉDIO - governança
- **Esforço**: MÉDIO

### 3) EXECUÇÃO

| ID | Skill Proposta | Existe? | Completude | Prioridade |
|----|---------------|---------|------------|------------|
| E-01 | Sandbox Runner | ❌ Não | 0% | 🔴 CRÍTICA |
| E-02 | Replay Runner | ❌ Não | 0% | 🟢 BAIXA |
| E-03 | Skill Scaffolder | ❌ Não | 0% | 🔴 CRÍTICA |
| E-04 | Dependency Installer | ❌ Não | 0% | 🟢 BAIXA |

**Análise E-01 (Sandbox/Dry-run)**:
- **Existe**: Nada
- **Falta**: Modo simulação
- **Impacto**: ALTO - testes seguros
- **Esforço**: MÉDIO
- **ROI**: ALTÍSSIMO - previne catástrofes

**Análise E-03 (Scaffolder)**:
- **Existe**: Criação manual
- **Falta**: Gerador automático
- **Impacto**: ALTO - velocidade de desenvolvimento
- **Esforço**: MÉDIO
- **ROI**: ALTÍSSIMO - criar skill em 30s vs 3h

### 4) ANALYTICS

| ID | Skill Proposta | Existe? | Completude | Prioridade |
|----|---------------|---------|------------|------------|
| A-01 | Unified Metrics | 🟡 Parcial | 60% | 🟡 MÉDIA |
| A-02 | Funnel Analyzer | ❌ Não | 0% | 🟢 BAIXA |
| A-03 | Hack Analyzer | ❌ Não | 0% | 🟢 BAIXA |
| A-04 | Alert Rules | 🟡 Parcial | 40% | 🟡 MÉDIA |

**Análise A-01 (Metrics)**:
- **Existe**: Aurora Monitor + métricas básicas
- **Falta**: Schema unificado, custos, ROI
- **Impacto**: MÉDIO
- **Esforço**: BAIXO

**Análise A-04 (Alerts)**:
- **Existe**: AlertManager no Aurora
- **Falta**: Regras acionáveis customizáveis
- **Impacto**: MÉDIO
- **Esforço**: BAIXO

### 5) AUTO-EVOLUÇÃO

| ID | Skill Proposta | Existe? | Completude | Prioridade |
|----|---------------|---------|------------|------------|
| AE-01 | Gap Detector | ❌ Não | 0% | 🟢 BAIXA |
| AE-02 | Proposal Generator | ❌ Não | 0% | 🟢 BAIXA |
| AE-03 | Auto-Builder | ❌ Não | 0% | 🟢 BAIXA |
| AE-04 | Self-Documentation | ❌ Não | 0% | 🟢 BAIXA |

**Análise Geral**:
- **Impacto**: FUTURO - visão de longo prazo
- **Esforço**: ALTO - IA generativa
- **Pré-requisitos**: Todas as fases anteriores
- **Prioridade**: Fase 5+ (após fundação sólida)

---

## 🎯 PRIORIZAÇÃO: MATRIZ IMPACTO x ESFORÇO

```
IMPACTO
  ↑
  │  F-01 SkillSpec  │  E-01 Sandbox    │
  │  F-02 Registry   │  E-03 Scaffolder │
  │  O-01 Intent     │                  │
  ├──────────────────┼──────────────────┤
  │  A-01 Metrics    │  F-03 Pack Load  │
  │  A-04 Alerts     │  O-02 Planner    │
  │  O-04 Approval   │  F-04 Policy     │
  ├──────────────────┼──────────────────┤
  │  E-02 Replay     │  AE-* (Futuro)   │
  │  A-02 Funnel     │                  │
  │  A-03 Hacks      │                  │
  └──────────────────┴──────────────────→
         BAIXO           ALTO        ESFORÇO
```

### 🏆 TOP PRIORIDADES (Quick Wins + Game Changers)

**SPRINT 1 - FUNDAÇÃO CRÍTICA** (1 semana):
1. **F-01 SkillSpec Contract** - 2 dias
2. **F-02 Registry v2** - 3 dias

**SPRINT 2 - SEGURANÇA & VELOCIDADE** (1 semana):
3. **E-01 Sandbox Runner** - 3 dias
4. **E-03 Skill Scaffolder** - 2 dias

**SPRINT 3 - INTELIGÊNCIA** (1 semana):
5. **O-01 Intent Router Pro** - 3 dias
6. **A-01 Unified Metrics Schema** - 2 dias

---

## 📅 ROADMAP DE IMPLEMENTAÇÃO

### 🎯 FASE 1: FUNDAÇÃO SÓLIDA (Semanas 1-2)

**Objetivo**: Governança + Padronização

#### SPRINT 1.1 - SkillSpec Contract (2 dias)

**Arquivo**: `skills/skill-spec.ts`

**Entregáveis**:
```typescript
interface SkillSpec {
  // Metadata atual (já existe)
  name: string;
  description: string;
  version: string;  // NEW: semver (1.0.0, 2.1.3)
  category: SkillCategory;
  tags: string[];

  // NEW: Lifecycle
  status: 'draft' | 'stable' | 'deprecated';
  deprecationDate?: Date;
  replacedBy?: string;

  // NEW: Dependencies
  dependencies: {
    skills?: string[];     // Requires other skills
    packages?: string[];   // npm/pip packages
    apis?: string[];      // External APIs
  };

  // NEW: Risk & Security
  risk: 'low' | 'medium' | 'high' | 'critical';
  permissions: string[]; // ['file.write', 'exec.sudo']

  // NEW: Capabilities
  capabilities: {
    idempotent: boolean;  // Pode rodar 2x sem efeito colateral
    cacheable: boolean;
    atomic: boolean;      // Tudo ou nada
    reversible: boolean;  // Tem undo
  };

  // NEW: Performance
  sla: {
    timeout: number;
    avgLatency?: number;
    successRate?: number;
  };
}
```

**Testes**:
- ✅ Skill com dependências circular → rejeita
- ✅ Skill deprecated → warning
- ✅ Skill high risk sem aprovação → bloqueia

#### SPRINT 1.2 - Registry v2 (3 dias)

**Arquivo**: `skills/registry-v2.ts`

**Entregáveis**:
```typescript
class SkillRegistryV2 extends EventEmitter {
  private skills: Map<string, SkillSpec>;
  private versions: Map<string, Map<string, SkillSpec>>; // name -> version -> spec

  register(skill: SkillSpec): void {
    // Valida dependências
    // Registra versão
    // Emite evento
  }

  get(name: string, version?: string): SkillSpec | null {
    // Se version não passado, pega latest stable
  }

  getDependencyTree(name: string): string[] {
    // Retorna árvore de dependências
  }

  validateDependencies(name: string): boolean {
    // Checa se todas as deps estão disponíveis
  }

  deprecate(name: string, reason: string, replacedBy?: string): void {
    // Marca como deprecated
  }

  getByStatus(status: 'draft' | 'stable' | 'deprecated'): SkillSpec[] {}
  getByRisk(risk: 'low' | 'medium' | 'high' | 'critical'): SkillSpec[] {}
}
```

**Migração**:
- Atualizar todas as 19 skills existentes para SkillSpec
- Manter compatibilidade com SkillMetadata antigo

---

### 🎯 FASE 2: EXECUÇÃO SEGURA (Semanas 3-4)

**Objetivo**: Testes sem risco + Produtividade

#### SPRINT 2.1 - Sandbox Runner (3 dias)

**Arquivo**: `skills/sandbox-runner.ts`

**Entregáveis**:
```typescript
class SandboxRunner {
  async runDryRun(skill: string, input: SkillInput): Promise<DryRunResult> {
    // Intercepta chamadas externas
    // Retorna "would have done X"
  }

  private mockFileWrite(path: string, content: string): DryRunAction {
    return {
      type: 'file.write',
      action: 'Would write to ${path}',
      sideEffect: 'Creates/overwrites file',
      reversible: false
    };
  }

  private mockTelegramSend(message: string): DryRunAction {
    return {
      type: 'telegram.send',
      action: 'Would send message',
      preview: message.slice(0, 100),
      recipients: ['@user']
    };
  }

  getImpact(): DryRunImpact {
    return {
      filesAffected: 3,
      apisCalled: ['telegram'],
      riskyActions: ['file.write'],
      estimatedCost: 0.002 // USD
    };
  }
}
```

**Skills com Dry-run obrigatório**:
- ✅ file.write
- ✅ exec.bash (sudo)
- ✅ autopc.click
- ✅ All high/critical risk

#### SPRINT 2.2 - Skill Scaffolder (2 dias)

**Arquivo**: `skills/skill-scaffolder.ts`

**Entregáveis**:
```typescript
class SkillScaffolder {
  async generate(config: ScaffoldConfig): Promise<SkillScaffoldResult> {
    // Gera TypeScript boilerplate
    // Cria testes
    // Registra no index
  }
}

interface ScaffoldConfig {
  name: string;           // 'file.archive'
  category: SkillCategory; // 'FILE'
  inputs: {
    path: 'string',
    compression: "'zip' | 'tar.gz'"
  };
  outputs: {
    archivePath: 'string'
  };
  risk: 'low';
  requiresApproval: false;
}
```

**Resultado**:
```typescript
// Auto-generated: skills/file-archive.ts
export class FileArchiveSkill extends Skill {
  constructor() {
    super({
      name: 'file.archive',
      description: 'Archives files with compression',
      version: '1.0.0',
      category: 'FILE',
      status: 'draft',
      risk: 'low',
      // ... auto-generated SkillSpec
    });
  }

  validate(input: SkillInput): boolean {
    // Auto-generated validation
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    // TODO: Implement logic
    throw new Error('Not implemented');
  }
}

// Auto-generated: skills/__tests__/file-archive.test.ts
describe('FileArchiveSkill', () => {
  it('should validate inputs', () => { /* ... */ });
  it('should archive files', () => { /* ... */ });
});
```

**Comando CLI**:
```bash
npm run skill:generate -- \
  --name file.archive \
  --category FILE \
  --inputs path:string compression:zip|tar.gz \
  --outputs archivePath:string
```

---

### 🎯 FASE 3: INTELIGÊNCIA (Semanas 5-6)

**Objetivo**: Automação + Analytics

#### SPRINT 3.1 - Intent Router Pro (3 dias)

**Arquivo**: `skills/intent-router.ts`

**Entregáveis**:
```typescript
class IntentRouter {
  async classify(message: string, context?: Context): Promise<Intent> {
    // Usa Claude/GPT para classificar
  }
}

interface Intent {
  skill: string;          // 'file.read'
  confidence: number;     // 0.95
  params: SkillInput;     // { path: '/home/user/doc.txt' }
  alternatives: Intent[]; // Top 3 opções
  reasoning: string;      // "User wants to read a file based on..."
}

// Exemplo:
// Input: "me mostra o conteúdo do arquivo config.json"
// Output: {
//   skill: 'file.read',
//   confidence: 0.98,
//   params: { path: 'config.json' },
//   alternatives: [
//     { skill: 'file.list', confidence: 0.12 }
//   ]
// }
```

**Integração**:
- Telegram bot usa pra auto-executar
- Dashboard sugere skills
- API Gateway roteia automaticamente

#### SPRINT 3.2 - Unified Metrics Schema (2 dias)

**Arquivo**: `analytics/unified-metrics.ts`

**Entregáveis**:
```typescript
interface UnifiedMetric {
  // Identificação
  skill: string;
  version: string;
  executionId: string;

  // Performance
  latency: number;        // ms
  success: boolean;
  retries: number;

  // Contexto
  userId?: string;
  channel: 'telegram' | 'dashboard' | 'api';
  timestamp: number;

  // Custo
  cost?: {
    claude: number;    // USD
    gpt: number;
    total: number;
  };

  // Risk
  risk: 'low' | 'medium' | 'high';
  approved: boolean;

  // Business
  funnel?: {
    stage: 'awareness' | 'consideration' | 'decision';
    converted: boolean;
  };
}

class MetricsCollector {
  collect(metric: UnifiedMetric): void {
    // Salva em DB
    // Envia pro Prometheus
    // Atualiza dashboard
  }

  getReport(filters: MetricFilters): MetricReport {
    // Relatório customizado
  }
}
```

---

### 🎯 FASE 4: MATURIDADE (Semanas 7-8)

**Skills complementares**:
- A-04 Alert Rules Engine
- O-04 Approval Workflow Composer
- F-03 Skill Pack Loader
- E-02 Replay Runner

---

### 🎯 FASE 5: AUTO-EVOLUÇÃO (Futuro - Semanas 9+)

**Skills de IA avançada**:
- AE-01 Gap Detector
- AE-02 Proposal Generator
- AE-03 Auto-Builder
- AE-04 Self-Documentation

**Pré-requisitos**:
- ✅ Todas as fases anteriores
- ✅ LLM fine-tuned no codebase
- ✅ CI/CD automático
- ✅ Testes 90%+ coverage

---

## 📊 ESTIMATIVAS

### Tempo Total

| Fase | Sprints | Semanas | Skills |
|------|---------|---------|--------|
| Fase 1: Fundação | 2 | 2 | F-01, F-02 |
| Fase 2: Execução | 2 | 2 | E-01, E-03 |
| Fase 3: Inteligência | 2 | 2 | O-01, A-01 |
| Fase 4: Maturidade | 4 | 4 | A-04, O-04, F-03, E-02 |
| **TOTAL Fases 1-4** | **10** | **10 semanas** | **10 skills** |
| Fase 5: Auto-evolução | 4 | 4+ | AE-01→04 |

### Recursos Necessários

**Humanos**:
- 1 desenvolvedor TypeScript sênior (full-time)
- 1 QA/DevOps (part-time)

**Infraestrutura**:
- Nenhuma mudança (usa stack atual)
- Postgres para métricas (opcional)

**Custos de API**:
- Claude API: ~$50/mês (Intent Router + testes)
- GPT API: ~$30/mês (fallback)
- **Total**: ~$80/mês

---

## 🎯 MÉTRICAS DE SUCESSO

### Fase 1 - Fundação
- ✅ 100% skills migradas pra SkillSpec
- ✅ Registry v2 suporta versionamento
- ✅ Dependências validadas automaticamente

### Fase 2 - Execução
- ✅ Sandbox em 100% das skills high-risk
- ✅ Criar nova skill em < 5min (vs 3h atual)
- ✅ Zero produção quebrada por testes

### Fase 3 - Inteligência
- ✅ Intent Router 90%+ accuracy
- ✅ Métricas unificadas em dashboard
- ✅ ROI medido por skill

### Fase 4 - Maturidade
- ✅ Alertas automáticos funcionando
- ✅ Plugin system com 3+ packs externos
- ✅ Replay de 100 últimas execuções

---

## ✅ DECISÃO: APROVAÇÃO

### Recomendação: **APROVAR FASES 1-3**

**Justificativa**:
1. **ROI Comprovado**: Scaffolder sozinho paga o investimento
2. **Risco Controlado**: Sandbox previne catástrofes
3. **Fundação Necessária**: Sem F-01/F-02, sistema vira caos
4. **Competitivo**: Intent Router = UX de 2026

**Não Recomendado Agora**:
- ❌ Fase 5 (Auto-evolução) - muito cedo, precisa fundação primeiro
- ❌ Policy Kit (F-04) - over-engineering pra momento atual
- ❌ Hack Analyzer - marketing-specific, não core

### 🚦 PLANO DE EXECUÇÃO APROVADO

**VERDE PARA INICIAR**:
- ✅ SPRINT 1.1: F-01 SkillSpec Contract
- ✅ SPRINT 1.2: F-02 Registry v2
- ✅ SPRINT 2.1: E-01 Sandbox Runner
- ✅ SPRINT 2.2: E-03 Skill Scaffolder
- ✅ SPRINT 3.1: O-01 Intent Router
- ✅ SPRINT 3.2: A-01 Metrics Schema

**AMARELO (Avaliar após Fase 3)**:
- 🟡 Fase 4: Maturidade
- 🟡 Fase 5: Auto-evolução

**VERMELHO (Não priorizar)**:
- 🔴 Hack-specific analytics
- 🔴 Policy Kit complexo
- 🔴 Self-documentation automatizada

---

## 📝 PRÓXIMOS PASSOS

1. **Aprovação Formal**: Review deste roadmap
2. **Setup**: Criar branch `feat/skill-evolution`
3. **Sprint Planning**: Detalhar SPRINT 1.1
4. **Kick-off**: Iniciar F-01 SkillSpec Contract

---

**Documento aprovado por**: _______________________
**Data**: _______________________
**Notas**: _______________________
