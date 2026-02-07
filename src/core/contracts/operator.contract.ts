/**
 * ══════════════════════════════════════════════════════════════════════════════
 * OPERATOR CONTRACT - O Cérebro do OpenClaw
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este contrato define COMO o Operator funciona.
 *
 * RESPONSABILIDADES DO OPERATOR:
 * ✅ Receber intenções (de qualquer app)
 * ✅ Rotear para skill ou hub correto
 * ✅ Criar plano de execução
 * ✅ Pedir autorização à Aurora ANTES de executar
 * ✅ Executar steps respeitando limites da Aurora
 * ✅ Salvar checkpoints
 * ✅ Devolver resultado
 *
 * O QUE O OPERATOR NÃO FAZ:
 * ❌ Conhecer regras de negócio (isso é dos Hubs)
 * ❌ Ignorar Aurora
 * ❌ Executar sem plano
 * ❌ Chamar apps diretamente
 */

// ════════════════════════════════════════════════════════════════════════════
// TIPOS BASE
// ════════════════════════════════════════════════════════════════════════════

/** Origem do pedido */
export type RequestOrigin = 'cockpit' | 'telegram' | 'api' | 'websocket' | 'internal' | 'cli';

/** Modo de execução */
export type ExecutionMode = 'dry-run' | 'real';

/** Status de um step */
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';

/** Status da execução completa */
export type ExecutionStatus = 'queued' | 'authorized' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

/** Tipo de ação que um step pode fazer */
export type StepActionType =
  | 'skill'      // Chama um core skill
  | 'hub'        // Chama um hub
  | 'conditional'// Decisão baseada em resultado anterior
  | 'parallel'   // Executa múltiplos steps em paralelo
  | 'wait'       // Aguarda evento ou tempo
  | 'checkpoint' // Salva estado
  | 'rollback';  // Desfaz alterações

// ════════════════════════════════════════════════════════════════════════════
// INTENÇÃO (entrada do usuário)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Representa a intenção do usuário.
 * É o que chega do app (Cockpit, Telegram, API, etc).
 */
export interface UserIntent {
  /** ID único da intenção */
  intent_id: string;

  /** De onde veio */
  origin: RequestOrigin;

  /** Texto bruto do usuário */
  raw_input: string;

  /** Tipo classificado (após passar pelo Router) */
  classified_type?: IntentType;

  /** Entidades extraídas do texto */
  entities?: Record<string, any>;

  /** Contexto da sessão */
  session_context?: SessionContext;

  /** Quem pediu */
  user_id?: string;

  /** Quando */
  timestamp: Date;

  /** Metadados extras */
  metadata?: Record<string, any>;
}

/**
 * Tipos de intenção classificados pelo Router
 */
export type IntentType =
  // Core Skills
  | 'ai:generate'
  | 'ai:analyze'
  | 'ai:summarize'
  | 'exec:command'
  | 'exec:script'
  | 'file:read'
  | 'file:write'
  | 'file:search'
  | 'web:fetch'
  | 'web:scrape'
  | 'browser:automate'
  | 'comm:send'
  | 'comm:notify'
  // Hubs
  | 'hub:enterprise'
  | 'hub:supabase'
  | 'hub:social'
  | 'hub:custom'
  // Sistema
  | 'system:status'
  | 'system:help'
  | 'system:cancel'
  // Desconhecido
  | 'unknown';

/**
 * Contexto da sessão atual
 */
export interface SessionContext {
  session_id: string;
  conversation_history?: ConversationMessage[];
  active_hub?: string;
  active_workflow?: string;
  variables?: Record<string, any>;
  last_checkpoint_id?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// ════════════════════════════════════════════════════════════════════════════
// PLANO DE EXECUÇÃO
// ════════════════════════════════════════════════════════════════════════════

/**
 * Plano de execução gerado pelo Operator.
 * Contém todos os steps necessários para atender a intenção.
 */
export interface ExecutionPlan {
  /** ID único do plano */
  plan_id: string;

  /** Intenção que gerou esse plano */
  intent_id: string;

  /** Lista de steps a executar */
  steps: ExecutionStep[];

  /** Recursos que serão tocados */
  resources: ResourceManifest;

  /** Nível de risco calculado */
  risk_level: RiskLevel;

  /** Permissões necessárias */
  permissions_required: Permission[];

  /** Limites sugeridos */
  suggested_limits: ExecutionLimits;

  /** Modo de execução */
  mode: ExecutionMode;

  /** Hub envolvido (se houver) */
  hub?: string;

  /** Workflow do hub (se houver) */
  workflow?: string;

  /** Estimativa de tempo (ms) */
  estimated_duration_ms?: number;

  /** Metadados */
  metadata?: Record<string, any>;
}

/**
 * Um step individual do plano
 */
export interface ExecutionStep {
  /** ID único do step */
  step_id: string;

  /** Ordem de execução (0-indexed) */
  order: number;

  /** Tipo de ação */
  action_type: StepActionType;

  /** Nome do skill ou hub a chamar */
  target: string;

  /** Método/ação específica */
  method: string;

  /** Parâmetros */
  params: Record<string, any>;

  /** Steps que precisam completar antes deste */
  depends_on?: string[];

  /** Condição para executar (referencia resultado de step anterior) */
  condition?: StepCondition;

  /** É reversível? */
  reversible: boolean;

  /** Comando de rollback (se reversível) */
  rollback_command?: RollbackCommand;

  /** Timeout específico para este step (ms) */
  timeout_ms?: number;

  /** Máximo de retentativas */
  max_retries?: number;

  /** Descrição humana */
  description: string;
}

export interface StepCondition {
  /** ID do step cujo resultado será avaliado */
  step_id: string;
  /** Campo do resultado a verificar */
  field: string;
  /** Operador */
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'exists';
  /** Valor esperado */
  value: any;
}

export interface RollbackCommand {
  target: string;
  method: string;
  params: Record<string, any>;
}

// ════════════════════════════════════════════════════════════════════════════
// RECURSOS E PERMISSÕES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Manifesto de recursos que serão tocados
 */
export interface ResourceManifest {
  /** Arquivos que serão lidos */
  files_read: string[];

  /** Arquivos que serão escritos */
  files_write: string[];

  /** Arquivos que serão deletados */
  files_delete: string[];

  /** Diretórios envolvidos */
  directories: string[];

  /** Repositórios git */
  repositories: string[];

  /** URLs externas */
  external_urls: string[];

  /** Bancos de dados */
  databases: string[];

  /** APIs externas */
  external_apis: string[];

  /** Serviços do sistema */
  system_services: string[];
}

/**
 * Nível de risco
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Permissões que podem ser requeridas
 */
export type Permission =
  | 'file:read'
  | 'file:write'
  | 'file:delete'
  | 'file:execute'
  | 'network:outbound'
  | 'network:inbound'
  | 'process:spawn'
  | 'process:kill'
  | 'database:read'
  | 'database:write'
  | 'database:admin'
  | 'git:read'
  | 'git:write'
  | 'git:push'
  | 'git:force'
  | 'system:read'
  | 'system:write'
  | 'system:admin'
  | 'credentials:read'
  | 'credentials:write'
  | 'ai:invoke'
  | 'browser:control'
  | 'comm:send';

/**
 * Limites de execução
 */
export interface ExecutionLimits {
  /** Tempo máximo total (ms) */
  max_duration_ms: number;

  /** Máximo de retentativas por step */
  max_retries_per_step: number;

  /** Máximo de arquivos que podem ser alterados */
  max_files_changed: number;

  /** Máximo de bytes que podem ser escritos */
  max_bytes_written: number;

  /** Máximo de requisições externas */
  max_external_requests: number;

  /** Máximo de processos spawned */
  max_processes: number;

  /** Rate limit (ações por segundo) */
  actions_per_second: number;
}

// ════════════════════════════════════════════════════════════════════════════
// RESULTADO DA EXECUÇÃO
// ════════════════════════════════════════════════════════════════════════════

/**
 * Resultado completo de uma execução
 */
export interface ExecutionResult {
  /** ID do plano executado */
  plan_id: string;

  /** Status final */
  status: ExecutionStatus;

  /** Resultado de cada step */
  step_results: StepResult[];

  /** Resultado final agregado */
  final_output: any;

  /** Erro (se falhou) */
  error?: ExecutionError;

  /** Métricas da execução */
  metrics: ExecutionMetrics;

  /** Checkpoint salvo (se houver) */
  checkpoint_id?: string;

  /** Pode retomar? */
  resumable: boolean;

  /** Rollback disponível? */
  rollback_available: boolean;

  /** Timestamp de início */
  started_at: Date;

  /** Timestamp de fim */
  completed_at: Date;
}

/**
 * Resultado de um step individual
 */
export interface StepResult {
  step_id: string;
  status: StepStatus;
  output?: any;
  error?: StepError;
  duration_ms: number;
  retries: number;
  started_at: Date;
  completed_at: Date;
}

export interface StepError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
}

export interface ExecutionError {
  code: string;
  message: string;
  step_id?: string;
  details?: any;
  stack?: string;
}

export interface ExecutionMetrics {
  total_duration_ms: number;
  steps_total: number;
  steps_completed: number;
  steps_failed: number;
  steps_skipped: number;
  files_changed: number;
  bytes_written: number;
  external_requests: number;
  ai_tokens_used: number;
  retries_total: number;
}

// ════════════════════════════════════════════════════════════════════════════
// CHECKPOINT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Checkpoint para retomar execução
 */
export interface ExecutionCheckpoint {
  /** ID do checkpoint */
  checkpoint_id: string;

  /** ID do plano */
  plan_id: string;

  /** Steps já completados */
  completed_steps: string[];

  /** Step atual (se pausado no meio) */
  current_step?: string;

  /** Resultados até agora */
  partial_results: StepResult[];

  /** Variáveis do contexto */
  context_variables: Record<string, any>;

  /** Estado do hub (se aplicável) */
  hub_state?: Record<string, any>;

  /** Razão da pausa/falha */
  pause_reason?: string;

  /** Quando foi criado */
  created_at: Date;

  /** Expira em */
  expires_at: Date;
}

// ════════════════════════════════════════════════════════════════════════════
// INTERFACE DO OPERATOR
// ════════════════════════════════════════════════════════════════════════════

/**
 * Interface principal do Operator.
 * Qualquer implementação do Operator DEVE seguir este contrato.
 */
export interface IOperator {
  /**
   * Processa uma intenção do usuário.
   * Este é o ponto de entrada principal.
   */
  processIntent(intent: UserIntent): Promise<ExecutionResult>;

  /**
   * Cria um plano de execução para uma intenção.
   * Não executa, apenas planeja.
   */
  createPlan(intent: UserIntent): Promise<ExecutionPlan>;

  /**
   * Executa um plano já criado.
   * Requer autorização da Aurora.
   */
  executePlan(plan: ExecutionPlan): Promise<ExecutionResult>;

  /**
   * Retoma execução de um checkpoint.
   */
  resumeFromCheckpoint(checkpoint_id: string): Promise<ExecutionResult>;

  /**
   * Cancela uma execução em andamento.
   */
  cancelExecution(plan_id: string, reason: string): Promise<void>;

  /**
   * Faz rollback de uma execução.
   */
  rollbackExecution(plan_id: string): Promise<void>;

  /**
   * Obtém status de uma execução.
   */
  getExecutionStatus(plan_id: string): Promise<ExecutionStatus>;

  /**
   * Lista execuções ativas.
   */
  listActiveExecutions(): Promise<ExecutionPlan[]>;

  /**
   * Registra um skill no registry.
   */
  registerSkill(skill: SkillRegistration): void;

  /**
   * Registra um hub no registry.
   */
  registerHub(hub: HubRegistration): void;
}

/**
 * Registro de skill
 */
export interface SkillRegistration {
  name: string;
  category: string;
  methods: string[];
  permissions: Permission[];
  handler: SkillHandler;
}

/**
 * Registro de hub
 */
export interface HubRegistration {
  name: string;
  workflows: string[];
  permissions: Permission[];
  handler: HubHandler;
}

export type SkillHandler = (method: string, params: Record<string, any>) => Promise<any>;
export type HubHandler = (workflow: string, params: Record<string, any>) => Promise<any>;

// ════════════════════════════════════════════════════════════════════════════
// EVENTOS DO OPERATOR
// ════════════════════════════════════════════════════════════════════════════

/**
 * Eventos que o Operator emite
 */
export type OperatorEvent =
  | { type: 'INTENT_RECEIVED'; intent: UserIntent }
  | { type: 'PLAN_CREATED'; plan: ExecutionPlan }
  | { type: 'AUTHORIZATION_REQUESTED'; plan_id: string }
  | { type: 'AUTHORIZATION_GRANTED'; plan_id: string }
  | { type: 'AUTHORIZATION_DENIED'; plan_id: string; reason: string }
  | { type: 'EXECUTION_STARTED'; plan_id: string }
  | { type: 'STEP_STARTED'; plan_id: string; step_id: string }
  | { type: 'STEP_COMPLETED'; plan_id: string; step_id: string; result: StepResult }
  | { type: 'STEP_FAILED'; plan_id: string; step_id: string; error: StepError }
  | { type: 'EXECUTION_PAUSED'; plan_id: string; reason: string; checkpoint_id: string }
  | { type: 'EXECUTION_RESUMED'; plan_id: string; from_checkpoint: string }
  | { type: 'EXECUTION_COMPLETED'; plan_id: string; result: ExecutionResult }
  | { type: 'EXECUTION_FAILED'; plan_id: string; error: ExecutionError }
  | { type: 'EXECUTION_CANCELLED'; plan_id: string; reason: string }
  | { type: 'ROLLBACK_STARTED'; plan_id: string }
  | { type: 'ROLLBACK_COMPLETED'; plan_id: string };

export type OperatorEventHandler = (event: OperatorEvent) => void;
