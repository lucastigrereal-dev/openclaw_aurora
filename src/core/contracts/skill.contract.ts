/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SKILL CONTRACT - As Capacidades Atômicas do OpenClaw
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este contrato define COMO os Skills funcionam.
 *
 * O QUE É UM SKILL:
 * Skill é uma capacidade atômica - faz UMA coisa bem.
 * É a menor unidade de execução do sistema.
 *
 * RESPONSABILIDADES DE UM SKILL:
 * ✅ Executar uma ação específica
 * ✅ Retornar resultado estruturado
 * ✅ Reportar erros de forma padronizada
 * ✅ Respeitar timeouts
 *
 * O QUE UM SKILL NÃO FAZ:
 * ❌ Orquestrar outros skills
 * ❌ Tomar decisões de negócio
 * ❌ Acessar Aurora diretamente
 * ❌ Conhecer contexto de hub
 *
 * CATEGORIAS DE SKILLS:
 * - AI: Claude, GPT, Ollama
 * - EXEC: Bash, Python, PowerShell, Node
 * - FILE: Read, Write, Watch, Search
 * - WEB: Fetch, Scrape
 * - BROWSER: Automation
 * - COMM: Telegram, Email
 * - UTIL: Helpers diversos
 */

import { Permission, RiskLevel } from './operator.contract';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS BASE
// ════════════════════════════════════════════════════════════════════════════

/** Categoria do skill */
export type SkillCategory = 'ai' | 'exec' | 'file' | 'web' | 'browser' | 'comm' | 'util';

/** Status do skill */
export type SkillStatus = 'ready' | 'busy' | 'error' | 'disabled';

/** Status de uma execução */
export type SkillExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';

// ════════════════════════════════════════════════════════════════════════════
// DEFINIÇÃO DO SKILL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Metadados de um skill
 */
export interface SkillMetadata {
  /** Nome único (ex: "claude", "bash", "file-read") */
  name: string;

  /** Nome para exibição */
  display_name: string;

  /** Categoria */
  category: SkillCategory;

  /** Descrição */
  description: string;

  /** Versão */
  version: string;

  /** Métodos disponíveis */
  methods: MethodDefinition[];

  /** Permissões que o skill precisa */
  permissions: Permission[];

  /** Nível de risco padrão */
  default_risk_level: RiskLevel;

  /** Timeout padrão (ms) */
  default_timeout_ms: number;

  /** Suporta execução em paralelo? */
  supports_parallel: boolean;

  /** É stateless? */
  stateless: boolean;

  /** Requer configuração? */
  requires_config: boolean;

  /** Schema de configuração */
  config_schema?: Record<string, ParameterSchema>;
}

/**
 * Definição de um método do skill
 */
export interface MethodDefinition {
  /** Nome do método */
  name: string;

  /** Descrição */
  description: string;

  /** Parâmetros de entrada */
  params: Record<string, ParameterSchema>;

  /** Schema do retorno */
  returns: ReturnSchema;

  /** Nível de risco específico deste método */
  risk_level?: RiskLevel;

  /** Timeout específico */
  timeout_ms?: number;

  /** Exemplos de uso */
  examples?: MethodExample[];
}

/**
 * Schema de parâmetro
 */
export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'buffer';
  description: string;
  required: boolean;
  default?: any;
  enum?: any[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: ParameterSchema; // Para arrays
  properties?: Record<string, ParameterSchema>; // Para objects
}

/**
 * Schema de retorno
 */
export interface ReturnSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'buffer' | 'void';
  description: string;
  properties?: Record<string, ParameterSchema>;
  items?: ParameterSchema;
}

/**
 * Exemplo de uso do método
 */
export interface MethodExample {
  description: string;
  params: Record<string, any>;
  expected_output?: any;
}

// ════════════════════════════════════════════════════════════════════════════
// EXECUÇÃO DO SKILL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Request para executar um skill
 */
export interface SkillExecutionRequest {
  /** ID único da execução */
  execution_id: string;

  /** Nome do skill */
  skill: string;

  /** Método a chamar */
  method: string;

  /** Parâmetros */
  params: Record<string, any>;

  /** Timeout override (ms) */
  timeout_ms?: number;

  /** Número de retentativas se falhar */
  max_retries?: number;

  /** Contexto do operator */
  operator_context: {
    plan_id: string;
    step_id: string;
    origin: string;
  };
}

/**
 * Resultado da execução do skill
 */
export interface SkillExecutionResult {
  /** ID da execução */
  execution_id: string;

  /** Status final */
  status: SkillExecutionStatus;

  /** Resultado (se sucesso) */
  output?: any;

  /** Erro (se falhou) */
  error?: SkillError;

  /** Métricas da execução */
  metrics: SkillMetrics;

  /** Retentativas feitas */
  retries: number;

  /** Timestamps */
  started_at: Date;
  completed_at: Date;
}

/**
 * Erro de skill
 */
export interface SkillError {
  /** Código do erro */
  code: string;

  /** Mensagem */
  message: string;

  /** Detalhes técnicos */
  details?: any;

  /** É recuperável? */
  recoverable: boolean;

  /** Sugestão de retry */
  retry_after_ms?: number;

  /** Stack trace */
  stack?: string;
}

/**
 * Métricas de execução
 */
export interface SkillMetrics {
  /** Duração total (ms) */
  duration_ms: number;

  /** Bytes lidos */
  bytes_read?: number;

  /** Bytes escritos */
  bytes_written?: number;

  /** Tokens usados (para AI skills) */
  tokens_used?: number;

  /** Requisições feitas (para web skills) */
  requests_made?: number;

  /** Memória usada (bytes) */
  memory_used?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// INTERFACE DO SKILL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Interface que todo skill DEVE implementar
 */
export interface ISkill {
  /** Metadados do skill */
  readonly metadata: SkillMetadata;

  /**
   * Inicializa o skill com configuração opcional
   */
  initialize(config?: Record<string, any>): Promise<void>;

  /**
   * Executa um método do skill
   */
  execute(request: SkillExecutionRequest): Promise<SkillExecutionResult>;

  /**
   * Valida parâmetros antes de executar
   */
  validateParams(method: string, params: Record<string, any>): ValidationResult;

  /**
   * Obtém status atual do skill
   */
  getStatus(): SkillStatus;

  /**
   * Cancela uma execução em andamento
   */
  cancelExecution(execution_id: string): Promise<void>;

  /**
   * Shutdown graceful
   */
  shutdown(): Promise<void>;
}

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// ════════════════════════════════════════════════════════════════════════════
// CLASSE BASE ABSTRATA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Classe base que facilita a criação de novos skills.
 * Todos os core skills devem estender esta classe.
 */
export abstract class BaseSkill implements ISkill {
  abstract readonly metadata: SkillMetadata;

  protected config: Record<string, any> = {};
  protected status: SkillStatus = 'ready';
  protected activeExecutions: Map<string, AbortController> = new Map();

  async initialize(config?: Record<string, any>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.status = 'ready';
  }

  abstract execute(request: SkillExecutionRequest): Promise<SkillExecutionResult>;

  validateParams(method: string, params: Record<string, any>): ValidationResult {
    const methodDef = this.metadata.methods.find((m) => m.name === method);
    if (!methodDef) {
      return { valid: false, errors: [{ field: 'method', message: `Method ${method} not found`, code: 'UNKNOWN_METHOD' }] };
    }

    const errors: Array<{ field: string; message: string; code: string }> = [];

    for (const [paramName, schema] of Object.entries(methodDef.params)) {
      const value = params[paramName];

      // Check required
      if (schema.required && (value === undefined || value === null)) {
        errors.push({ field: paramName, message: `${paramName} is required`, code: 'REQUIRED' });
        continue;
      }

      if (value === undefined || value === null) continue;

      // Type check
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (schema.type !== actualType && !(schema.type === 'buffer' && Buffer.isBuffer(value))) {
        errors.push({ field: paramName, message: `${paramName} must be ${schema.type}`, code: 'INVALID_TYPE' });
      }

      // String validations
      if (schema.type === 'string' && typeof value === 'string') {
        if (schema.minLength && value.length < schema.minLength) {
          errors.push({ field: paramName, message: `${paramName} must be at least ${schema.minLength} characters`, code: 'MIN_LENGTH' });
        }
        if (schema.maxLength && value.length > schema.maxLength) {
          errors.push({ field: paramName, message: `${paramName} must be at most ${schema.maxLength} characters`, code: 'MAX_LENGTH' });
        }
        if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
          errors.push({ field: paramName, message: `${paramName} must match pattern ${schema.pattern}`, code: 'PATTERN' });
        }
      }

      // Number validations
      if (schema.type === 'number' && typeof value === 'number') {
        if (schema.min !== undefined && value < schema.min) {
          errors.push({ field: paramName, message: `${paramName} must be at least ${schema.min}`, code: 'MIN' });
        }
        if (schema.max !== undefined && value > schema.max) {
          errors.push({ field: paramName, message: `${paramName} must be at most ${schema.max}`, code: 'MAX' });
        }
      }

      // Enum validation
      if (schema.enum && !schema.enum.includes(value)) {
        errors.push({ field: paramName, message: `${paramName} must be one of: ${schema.enum.join(', ')}`, code: 'ENUM' });
      }
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  getStatus(): SkillStatus {
    return this.status;
  }

  async cancelExecution(execution_id: string): Promise<void> {
    const controller = this.activeExecutions.get(execution_id);
    if (controller) {
      controller.abort();
      this.activeExecutions.delete(execution_id);
    }
  }

  async shutdown(): Promise<void> {
    // Cancel all active executions
    this.activeExecutions.forEach((controller) => {
      controller.abort();
    });
    this.activeExecutions.clear();
    this.status = 'disabled';
  }

  /**
   * Helper para criar resultado de sucesso
   */
  protected successResult(execution_id: string, output: any, metrics: Partial<SkillMetrics>, started_at: Date): SkillExecutionResult {
    return {
      execution_id,
      status: 'completed',
      output,
      metrics: {
        duration_ms: Date.now() - started_at.getTime(),
        ...metrics,
      },
      retries: 0,
      started_at,
      completed_at: new Date(),
    };
  }

  /**
   * Helper para criar resultado de erro
   */
  protected errorResult(
    execution_id: string,
    error: SkillError,
    started_at: Date,
    retries: number = 0
  ): SkillExecutionResult {
    return {
      execution_id,
      status: 'failed',
      error,
      metrics: { duration_ms: Date.now() - started_at.getTime() },
      retries,
      started_at,
      completed_at: new Date(),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SKILLS EXISTENTES - METADADOS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Metadados dos core skills existentes
 */
export const CORE_SKILLS_METADATA: Record<string, Partial<SkillMetadata>> = {
  // ─────────────────────────────────────────────────────────────────────────
  // AI SKILLS
  // ─────────────────────────────────────────────────────────────────────────
  'ai/claude': {
    name: 'claude',
    display_name: 'Claude AI',
    category: 'ai',
    description: 'Anthropic Claude - análise, geração de texto, código',
    permissions: ['ai:invoke', 'network:outbound'],
    default_risk_level: 'low',
    default_timeout_ms: 60000,
    methods: [
      { name: 'generate', description: 'Gera texto', params: {}, returns: { type: 'string', description: 'Texto gerado' } },
      { name: 'analyze', description: 'Analisa conteúdo', params: {}, returns: { type: 'object', description: 'Análise' } },
      { name: 'code', description: 'Gera código', params: {}, returns: { type: 'string', description: 'Código gerado' } },
    ],
  },

  'ai/gpt': {
    name: 'gpt',
    display_name: 'OpenAI GPT',
    category: 'ai',
    description: 'OpenAI GPT - alternativa ao Claude',
    permissions: ['ai:invoke', 'network:outbound'],
    default_risk_level: 'low',
    default_timeout_ms: 60000,
  },

  'ai/ollama': {
    name: 'ollama',
    display_name: 'Ollama Local',
    category: 'ai',
    description: 'LLMs locais via Ollama',
    permissions: ['ai:invoke'],
    default_risk_level: 'low',
    default_timeout_ms: 120000,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EXEC SKILLS
  // ─────────────────────────────────────────────────────────────────────────
  'exec/bash': {
    name: 'bash',
    display_name: 'Bash Executor',
    category: 'exec',
    description: 'Executa comandos bash',
    permissions: ['process:spawn', 'file:read', 'file:write'],
    default_risk_level: 'medium',
    default_timeout_ms: 30000,
    methods: [
      { name: 'run', description: 'Executa comando', params: {}, returns: { type: 'object', description: 'stdout/stderr/code' } },
    ],
  },

  'exec/extended': {
    name: 'extended',
    display_name: 'Extended Executor',
    category: 'exec',
    description: 'Executa Python, PowerShell, Node',
    permissions: ['process:spawn', 'file:read', 'file:write', 'file:execute'],
    default_risk_level: 'medium',
    default_timeout_ms: 60000,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FILE SKILLS
  // ─────────────────────────────────────────────────────────────────────────
  'file/ops': {
    name: 'ops',
    display_name: 'File Operations',
    category: 'file',
    description: 'Read, write, delete, list files',
    permissions: ['file:read', 'file:write', 'file:delete'],
    default_risk_level: 'medium',
    default_timeout_ms: 10000,
    methods: [
      { name: 'read', description: 'Lê arquivo', params: {}, returns: { type: 'string', description: 'Conteúdo' } },
      { name: 'write', description: 'Escreve arquivo', params: {}, returns: { type: 'boolean', description: 'Sucesso' } },
      { name: 'delete', description: 'Deleta arquivo', params: {}, returns: { type: 'boolean', description: 'Sucesso' } },
      { name: 'list', description: 'Lista diretório', params: {}, returns: { type: 'array', description: 'Arquivos' } },
      { name: 'exists', description: 'Verifica existência', params: {}, returns: { type: 'boolean', description: 'Existe' } },
    ],
  },

  'file/advanced': {
    name: 'advanced',
    display_name: 'Advanced File Ops',
    category: 'file',
    description: 'Watch, search, diff, patch',
    permissions: ['file:read', 'file:write'],
    default_risk_level: 'low',
    default_timeout_ms: 30000,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // WEB SKILLS
  // ─────────────────────────────────────────────────────────────────────────
  'web/fetch': {
    name: 'fetch',
    display_name: 'Web Fetch',
    category: 'web',
    description: 'HTTP requests',
    permissions: ['network:outbound'],
    default_risk_level: 'low',
    default_timeout_ms: 30000,
    methods: [
      { name: 'get', description: 'GET request', params: {}, returns: { type: 'object', description: 'Response' } },
      { name: 'post', description: 'POST request', params: {}, returns: { type: 'object', description: 'Response' } },
      { name: 'put', description: 'PUT request', params: {}, returns: { type: 'object', description: 'Response' } },
      { name: 'delete', description: 'DELETE request', params: {}, returns: { type: 'object', description: 'Response' } },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BROWSER SKILLS
  // ─────────────────────────────────────────────────────────────────────────
  'browser/control': {
    name: 'control',
    display_name: 'Browser Control',
    category: 'browser',
    description: 'Automação de navegador',
    permissions: ['browser:control', 'network:outbound'],
    default_risk_level: 'medium',
    default_timeout_ms: 120000,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COMM SKILLS
  // ─────────────────────────────────────────────────────────────────────────
  'comm/telegram': {
    name: 'telegram',
    display_name: 'Telegram',
    category: 'comm',
    description: 'Enviar e receber mensagens Telegram',
    permissions: ['comm:send', 'network:outbound'],
    default_risk_level: 'low',
    default_timeout_ms: 10000,
    methods: [
      { name: 'send', description: 'Envia mensagem', params: {}, returns: { type: 'boolean', description: 'Sucesso' } },
      { name: 'getUpdates', description: 'Obtém mensagens', params: {}, returns: { type: 'array', description: 'Mensagens' } },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // UTIL SKILLS
  // ─────────────────────────────────────────────────────────────────────────
  'util/misc': {
    name: 'misc',
    display_name: 'Utilities',
    category: 'util',
    description: 'Helpers: sleep, hash, uuid, datetime, json',
    permissions: [],
    default_risk_level: 'low',
    default_timeout_ms: 5000,
    methods: [
      { name: 'sleep', description: 'Aguarda X ms', params: {}, returns: { type: 'void', description: '' } },
      { name: 'uuid', description: 'Gera UUID', params: {}, returns: { type: 'string', description: 'UUID' } },
      { name: 'hash', description: 'Gera hash', params: {}, returns: { type: 'string', description: 'Hash' } },
      { name: 'now', description: 'Timestamp atual', params: {}, returns: { type: 'string', description: 'ISO date' } },
      { name: 'parseJson', description: 'Parse JSON seguro', params: {}, returns: { type: 'object', description: 'Objeto' } },
    ],
  },
};

// ════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ════════════════════════════════════════════════════════════════════════════

/**
 * Interface do registry de skills
 */
export interface ISkillRegistry {
  /**
   * Registra um skill
   */
  register(skill: ISkill): void;

  /**
   * Obtém um skill pelo nome
   */
  get(name: string): ISkill | undefined;

  /**
   * Lista todos os skills
   */
  list(): SkillMetadata[];

  /**
   * Lista skills por categoria
   */
  listByCategory(category: SkillCategory): SkillMetadata[];

  /**
   * Verifica se skill existe
   */
  has(name: string): boolean;

  /**
   * Remove um skill
   */
  unregister(name: string): void;
}
