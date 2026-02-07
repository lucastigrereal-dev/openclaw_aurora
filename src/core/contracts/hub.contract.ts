/**
 * ══════════════════════════════════════════════════════════════════════════════
 * HUB CONTRACT - Os Domínios do OpenClaw
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este contrato define COMO os Hubs funcionam.
 *
 * O QUE É UM HUB:
 * Hub é um "setor" ou "domínio" especializado.
 * Ele orquestra workflows complexos usando core skills.
 *
 * RESPONSABILIDADES DE UM HUB:
 * ✅ Definir workflows específicos do domínio
 * ✅ Orquestrar múltiplos skills em sequência
 * ✅ Manter estado do workflow
 * ✅ Retornar resultados estruturados
 *
 * O QUE UM HUB NÃO FAZ:
 * ❌ Importar outros hubs
 * ❌ Bypassar o Operator
 * ❌ Ignorar Aurora
 * ❌ Fazer operações atômicas (isso é skill)
 *
 * EXEMPLOS DE HUBS:
 * - Enterprise: Fábrica de apps (9 personas, 6 workflows)
 * - Supabase Archon: Gestão de banco de dados (30 skills)
 * - Social Media: Gestão de redes sociais (16 skills)
 * - Vendas: Gestão comercial (futuro)
 * - Clínica: Gestão de consultório (futuro)
 */

import { Permission, RiskLevel } from './operator.contract';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS BASE
// ════════════════════════════════════════════════════════════════════════════

/** Status do hub */
export type HubStatus = 'active' | 'blocked' | 'deprecated' | 'experimental';

/** Status de um workflow */
export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

/** Categoria do hub */
export type HubCategory =
  | 'development'    // Enterprise, código, deploy
  | 'data'           // Supabase, analytics, ETL
  | 'content'        // Social media, marketing
  | 'business'       // Vendas, CRM
  | 'operations'     // DevOps, infra
  | 'personal'       // Produtividade, estudo
  | 'custom';        // Definido pelo usuário

// ════════════════════════════════════════════════════════════════════════════
// MANIFEST DO HUB
// ════════════════════════════════════════════════════════════════════════════

/**
 * Manifest obrigatório de cada hub.
 * Deve existir em `hubs/<nome>/manifest.json` ou exportado do index.ts
 */
export interface HubManifest {
  /** Nome único do hub (sem espaços, lowercase) */
  name: string;

  /** Nome para exibição */
  display_name: string;

  /** Descrição curta (1 linha) */
  description: string;

  /** Versão semântica */
  version: string;

  /** Categoria do hub */
  category: HubCategory;

  /** Status atual */
  status: HubStatus;

  /** Autor */
  author: string;

  /** Workflows disponíveis */
  workflows: WorkflowDefinition[];

  /** Skills que o hub usa (core skills) */
  dependencies: HubDependency[];

  /** Permissões que o hub precisa */
  permissions_required: Permission[];

  /** Nível de risco padrão */
  default_risk_level: RiskLevel;

  /** Configurações do hub */
  config_schema?: HubConfigSchema;

  /** Personas (se aplicável, como no Hub Enterprise) */
  personas?: PersonaDefinition[];

  /** Metadados extras */
  metadata?: Record<string, any>;
}

/**
 * Definição de um workflow
 */
export interface WorkflowDefinition {
  /** ID do workflow */
  id: string;

  /** Nome para exibição */
  name: string;

  /** Descrição */
  description: string;

  /** Steps do workflow */
  steps: WorkflowStepDefinition[];

  /** Parâmetros de entrada */
  input_schema: Record<string, ParameterDefinition>;

  /** Schema do output */
  output_schema: Record<string, any>;

  /** Nível de risco deste workflow específico */
  risk_level: RiskLevel;

  /** Tempo estimado (ms) */
  estimated_duration_ms: number;

  /** Pode ser cancelado no meio? */
  cancellable: boolean;

  /** Pode ser retomado de checkpoint? */
  resumable: boolean;
}

/**
 * Definição de um step dentro do workflow
 */
export interface WorkflowStepDefinition {
  /** ID do step */
  id: string;

  /** Ordem (0-indexed) */
  order: number;

  /** Descrição */
  description: string;

  /** Tipo de ação */
  action_type: 'skill' | 'persona' | 'condition' | 'parallel' | 'wait';

  /** Target (skill ou persona) */
  target?: string;

  /** Depende de quais steps anteriores */
  depends_on?: string[];

  /** É opcional? */
  optional: boolean;

  /** Pode falhar sem quebrar o workflow? */
  fail_safe: boolean;
}

/**
 * Dependência de skill
 */
export interface HubDependency {
  /** Nome do skill */
  skill: string;

  /** Versão mínima (se aplicável) */
  min_version?: string;

  /** Métodos usados */
  methods: string[];

  /** Obrigatório ou opcional */
  required: boolean;
}

/**
 * Definição de parâmetro
 */
export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  enum?: any[];
  min?: number;
  max?: number;
  pattern?: string;
}

/**
 * Schema de configuração do hub
 */
export interface HubConfigSchema {
  properties: Record<string, ParameterDefinition>;
  required: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// PERSONAS (para hubs como Enterprise)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Definição de uma persona
 */
export interface PersonaDefinition {
  /** ID da persona */
  id: string;

  /** Nome (ex: "S-01 Produto") */
  name: string;

  /** Role/papel */
  role: string;

  /** Descrição do que faz */
  description: string;

  /** Subskills que a persona executa */
  subskills: SubskillDefinition[];

  /** Skills core que a persona usa */
  core_skills_used: string[];

  /** Ordem de execução no workflow */
  execution_order?: number;

  /** Pode rodar em paralelo com outras personas? */
  parallelizable: boolean;
}

/**
 * Subskill de uma persona
 */
export interface SubskillDefinition {
  id: string;
  name: string;
  description: string;
  output_type: string;
}

// ════════════════════════════════════════════════════════════════════════════
// EXECUÇÃO DE HUB
// ════════════════════════════════════════════════════════════════════════════

/**
 * Request para executar um workflow do hub
 */
export interface HubExecutionRequest {
  /** ID único da execução */
  execution_id: string;

  /** Nome do hub */
  hub: string;

  /** ID do workflow */
  workflow: string;

  /** Parâmetros de entrada */
  params: Record<string, any>;

  /** Configuração override */
  config_override?: Record<string, any>;

  /** Contexto do operator */
  operator_context: {
    plan_id: string;
    step_id: string;
    session_id: string;
  };

  /** Limites impostos pela Aurora */
  aurora_limits?: {
    max_duration_ms: number;
    max_retries: number;
  };
}

/**
 * Resultado da execução do hub
 */
export interface HubExecutionResult {
  /** ID da execução */
  execution_id: string;

  /** Status final */
  status: 'completed' | 'failed' | 'cancelled' | 'partial';

  /** Resultado do workflow */
  output: Record<string, any>;

  /** Resultados por step */
  step_results: HubStepResult[];

  /** Resultados por persona (se aplicável) */
  persona_results?: PersonaResult[];

  /** Erro (se falhou) */
  error?: HubError;

  /** Artefatos gerados */
  artifacts?: HubArtifact[];

  /** Métricas */
  metrics: HubMetrics;

  /** Estado para checkpoint */
  checkpoint_state?: Record<string, any>;
}

export interface HubStepResult {
  step_id: string;
  status: 'completed' | 'failed' | 'skipped';
  output?: any;
  error?: string;
  duration_ms: number;
}

export interface PersonaResult {
  persona_id: string;
  status: 'completed' | 'failed' | 'skipped';
  subskill_results: SubskillResult[];
  total_duration_ms: number;
}

export interface SubskillResult {
  subskill_id: string;
  output: any;
  quality_score?: number;
}

export interface HubError {
  code: string;
  message: string;
  step_id?: string;
  persona_id?: string;
  recoverable: boolean;
  details?: any;
}

export interface HubArtifact {
  type: 'file' | 'directory' | 'report' | 'code' | 'data';
  name: string;
  path: string;
  size_bytes?: number;
  mime_type?: string;
}

export interface HubMetrics {
  total_duration_ms: number;
  steps_executed: number;
  steps_failed: number;
  personas_executed?: number;
  tokens_used?: number;
  files_created?: number;
  files_modified?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// INTERFACE DO HUB
// ════════════════════════════════════════════════════════════════════════════

/**
 * Interface que todo hub DEVE implementar
 */
export interface IHub {
  /** Manifest do hub */
  readonly manifest: HubManifest;

  /**
   * Inicializa o hub com configuração
   */
  initialize(config?: Record<string, any>): Promise<void>;

  /**
   * Executa um workflow
   */
  executeWorkflow(request: HubExecutionRequest): Promise<HubExecutionResult>;

  /**
   * Lista workflows disponíveis
   */
  listWorkflows(): WorkflowDefinition[];

  /**
   * Obtém detalhes de um workflow
   */
  getWorkflow(workflow_id: string): WorkflowDefinition | null;

  /**
   * Valida parâmetros de entrada de um workflow
   */
  validateParams(workflow_id: string, params: Record<string, any>): ValidationResult;

  /**
   * Obtém status do hub
   */
  getStatus(): HubStatus;

  /**
   * Obtém configuração atual
   */
  getConfig(): Record<string, any>;

  /**
   * Atualiza configuração
   */
  updateConfig(updates: Record<string, any>): Promise<void>;

  /**
   * Cancela uma execução em andamento
   */
  cancelExecution(execution_id: string): Promise<void>;

  /**
   * Retoma de um checkpoint
   */
  resumeFromCheckpoint(execution_id: string, checkpoint: Record<string, any>): Promise<HubExecutionResult>;

  /**
   * Shutdown graceful
   */
  shutdown(): Promise<void>;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ════════════════════════════════════════════════════════════════════════════
// EVENTOS DO HUB
// ════════════════════════════════════════════════════════════════════════════

/**
 * Eventos que um hub pode emitir
 */
export type HubEvent =
  | { type: 'WORKFLOW_STARTED'; execution_id: string; workflow: string }
  | { type: 'STEP_STARTED'; execution_id: string; step_id: string }
  | { type: 'STEP_COMPLETED'; execution_id: string; step_id: string; result: HubStepResult }
  | { type: 'STEP_FAILED'; execution_id: string; step_id: string; error: string }
  | { type: 'PERSONA_STARTED'; execution_id: string; persona_id: string }
  | { type: 'PERSONA_COMPLETED'; execution_id: string; persona_id: string; result: PersonaResult }
  | { type: 'ARTIFACT_CREATED'; execution_id: string; artifact: HubArtifact }
  | { type: 'PROGRESS'; execution_id: string; percent: number; message: string }
  | { type: 'WORKFLOW_COMPLETED'; execution_id: string; result: HubExecutionResult }
  | { type: 'WORKFLOW_FAILED'; execution_id: string; error: HubError }
  | { type: 'WORKFLOW_CANCELLED'; execution_id: string };

export type HubEventHandler = (event: HubEvent) => void;

// ════════════════════════════════════════════════════════════════════════════
// TEMPLATES DE MANIFEST
// ════════════════════════════════════════════════════════════════════════════

/**
 * Template de manifest para criar novos hubs
 */
export const HUB_MANIFEST_TEMPLATE: HubManifest = {
  name: 'my-hub',
  display_name: 'My Hub',
  description: 'Descrição do meu hub',
  version: '1.0.0',
  category: 'custom',
  status: 'experimental',
  author: 'Seu Nome',
  workflows: [
    {
      id: 'main',
      name: 'Workflow Principal',
      description: 'Descrição do workflow',
      steps: [
        {
          id: 'step-1',
          order: 0,
          description: 'Primeiro step',
          action_type: 'skill',
          target: 'ai/claude',
          optional: false,
          fail_safe: false,
        },
      ],
      input_schema: {
        input: {
          type: 'string',
          description: 'Entrada do workflow',
          required: true,
        },
      },
      output_schema: {
        result: { type: 'string' },
      },
      risk_level: 'low',
      estimated_duration_ms: 5000,
      cancellable: true,
      resumable: true,
    },
  ],
  dependencies: [
    {
      skill: 'ai/claude',
      methods: ['generate'],
      required: true,
    },
  ],
  permissions_required: ['ai:invoke'],
  default_risk_level: 'low',
};

// ════════════════════════════════════════════════════════════════════════════
// HUBS EXISTENTES - REFERÊNCIA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Manifests dos hubs existentes (para referência)
 */
export const EXISTING_HUBS = {
  enterprise: {
    name: 'enterprise',
    display_name: 'Hub Enterprise',
    description: 'Fábrica de aplicações com 9 personas e 6 workflows',
    category: 'development' as HubCategory,
    workflows: ['full', 'mvp-only', 'code-only', 'test-only', 'incident-response', 'feature-add'],
    personas: ['produto', 'arquitetura', 'engenharia', 'qa', 'ops', 'security', 'dados', 'design', 'performance'],
  },

  'supabase-archon': {
    name: 'supabase-archon',
    display_name: 'Hub Supabase Archon',
    description: 'Gestão completa de banco de dados com 30 skills',
    category: 'data' as HubCategory,
    skill_count: 30,
    categories: ['schema', 'security', 'performance', 'reliability', 'maintenance', 'monitoring'],
  },

  'social-media': {
    name: 'social-media',
    display_name: 'Hub Social Media',
    description: 'Gestão de redes sociais com 16 skills',
    category: 'content' as HubCategory,
    skill_count: 16,
    categories: ['content', 'publishing', 'analytics', 'management'],
  },
};
