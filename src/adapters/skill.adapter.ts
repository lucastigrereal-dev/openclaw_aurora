/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SKILL ADAPTER - Ponte entre skills existentes e o novo contrato
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este adapter permite usar os skills existentes (que estendem Skill de skill-base.ts)
 * através da nova interface ISkill definida nos contratos.
 *
 * COMO FUNCIONA:
 * 1. Recebe uma instância de Skill existente
 * 2. Expõe ela através da interface ISkill do contrato
 * 3. Converte requests/responses entre os formatos
 */

import {
  ISkill,
  SkillMetadata,
  SkillExecutionRequest,
  SkillExecutionResult,
  SkillStatus,
  SkillError,
  SkillMetrics,
} from '../contracts/skill.contract';
import { generateId } from '../contracts/types';
import { Skill, SkillOutput, getSkillRegistry, SkillRegistry } from '../skills/skill-base';

// ════════════════════════════════════════════════════════════════════════════
// SKILL ADAPTER
// ════════════════════════════════════════════════════════════════════════════

/**
 * Adapta um Skill existente para a nova interface ISkill
 */
export class SkillAdapter implements ISkill {
  private skill: Skill;
  private _metadata: SkillMetadata;

  constructor(skill: Skill) {
    this.skill = skill;
    this._metadata = this.convertMetadata(skill);
  }

  get metadata(): SkillMetadata {
    return this._metadata;
  }

  async initialize(config?: Record<string, any>): Promise<void> {
    // Skills existentes não tem initialize separado
    // Configuração é passada no construtor
    if (config) {
      console.log(`[SkillAdapter] Config for ${this.skill.metadata.name}:`, config);
    }
  }

  async execute(request: SkillExecutionRequest): Promise<SkillExecutionResult> {
    const startedAt = new Date();

    try {
      // Converte request para formato existente
      const input = {
        ...request.params,
        _execution_id: request.execution_id,
        _operator_context: request.operator_context,
      };

      // Executa o skill existente via .run() que já tem métricas
      const result: SkillOutput = await this.skill.run(input);

      // Converte resposta para novo formato
      return this.convertResult(request.execution_id, result, startedAt);
    } catch (error) {
      return this.errorResult(request.execution_id, error, startedAt);
    }
  }

  validateParams(method: string, params: Record<string, any>): { valid: boolean; errors?: Array<{ field: string; message: string; code: string }> } {
    // Usa validação existente do skill
    const isValid = this.skill.validate(params);
    if (isValid) {
      return { valid: true };
    }
    return {
      valid: false,
      errors: [{ field: 'input', message: 'Validation failed', code: 'INVALID_INPUT' }],
    };
  }

  getStatus(): SkillStatus {
    return this.skill.isEnabled() ? 'ready' : 'disabled';
  }

  async cancelExecution(execution_id: string): Promise<void> {
    // Skills existentes não suportam cancelamento
    console.warn(`[SkillAdapter] Cancel not supported for ${this.skill.metadata.name}`);
  }

  async shutdown(): Promise<void> {
    this.skill.disable();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers de conversão
  // ──────────────────────────────────────────────────────────────────────────

  private convertMetadata(skill: Skill): SkillMetadata {
    const info = skill.getInfo();
    return {
      name: info.name,
      display_name: info.name,
      category: this.mapCategory(info.category),
      description: info.description,
      version: info.version,
      methods: [
        {
          name: 'execute',
          description: info.description,
          params: {},
          returns: { type: 'object', description: 'SkillOutput' },
        },
      ],
      permissions: [],
      default_risk_level: 'low',
      default_timeout_ms: info.config.timeout || 30000,
      supports_parallel: true,
      stateless: true,
      requires_config: false,
    };
  }

  private mapCategory(cat: string): 'ai' | 'exec' | 'file' | 'web' | 'browser' | 'comm' | 'util' {
    const map: Record<string, 'ai' | 'exec' | 'file' | 'web' | 'browser' | 'comm' | 'util'> = {
      AI: 'ai',
      EXEC: 'exec',
      FILE: 'file',
      WEB: 'web',
      BROWSER: 'browser',
      COMM: 'comm',
      UTIL: 'util',
      VISION: 'util',
      MEMORY: 'util',
    };
    return map[cat] || 'util';
  }

  private convertResult(execution_id: string, result: SkillOutput, startedAt: Date): SkillExecutionResult {
    const completedAt = new Date();
    const duration_ms = result.duration || (completedAt.getTime() - startedAt.getTime());

    if (result.success) {
      return {
        execution_id,
        status: 'completed',
        output: result.data,
        metrics: {
          duration_ms,
          tokens_used: result.data?.usage?.total_tokens,
        },
        retries: 0,
        started_at: startedAt,
        completed_at: completedAt,
      };
    }

    return {
      execution_id,
      status: 'failed',
      error: {
        code: 'SKILL_ERROR',
        message: result.error || 'Unknown error',
        recoverable: true,
      },
      metrics: { duration_ms },
      retries: 0,
      started_at: startedAt,
      completed_at: completedAt,
    };
  }

  private errorResult(execution_id: string, error: any, startedAt: Date): SkillExecutionResult {
    return {
      execution_id,
      status: 'failed',
      error: {
        code: 'EXCEPTION',
        message: error instanceof Error ? error.message : String(error),
        recoverable: true,
        stack: error instanceof Error ? error.stack : undefined,
      },
      metrics: { duration_ms: Date.now() - startedAt.getTime() },
      retries: 0,
      started_at: startedAt,
      completed_at: new Date(),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// REGISTRY ADAPTER
// ════════════════════════════════════════════════════════════════════════════

/**
 * Adapta o SkillRegistry existente para a interface do contrato
 */
export class SkillRegistryAdapter {
  private registry: SkillRegistry;
  private adapters: Map<string, SkillAdapter> = new Map();

  constructor(registry?: SkillRegistry) {
    this.registry = registry || getSkillRegistry();
  }

  /**
   * Obtém adapter para um skill
   */
  getAdapter(name: string): SkillAdapter | undefined {
    // Cache de adapters
    if (this.adapters.has(name)) {
      return this.adapters.get(name);
    }

    // Busca skill no registry existente
    const skill = this.registry.get(name);
    if (!skill) {
      return undefined;
    }

    // Cria e cacheia adapter
    const adapter = new SkillAdapter(skill);
    this.adapters.set(name, adapter);
    return adapter;
  }

  /**
   * Executa um skill via adapter
   */
  async execute(name: string, params: Record<string, any>, context?: any): Promise<SkillExecutionResult> {
    const adapter = this.getAdapter(name);
    if (!adapter) {
      return {
        execution_id: generateId('exec'),
        status: 'failed',
        error: {
          code: 'SKILL_NOT_FOUND',
          message: `Skill not found: ${name}`,
          recoverable: false,
        },
        metrics: { duration_ms: 0 },
        retries: 0,
        started_at: new Date(),
        completed_at: new Date(),
      };
    }

    const request: SkillExecutionRequest = {
      execution_id: generateId('exec'),
      skill: name,
      method: 'execute',
      params,
      operator_context: context || {
        plan_id: 'direct',
        step_id: 'direct',
        origin: 'internal',
      },
    };

    return adapter.execute(request);
  }

  /**
   * Lista todos os skills adaptados
   */
  listAll(): SkillMetadata[] {
    return this.registry.listAll().map((meta) => {
      const skill = this.registry.get(meta.name);
      if (skill) {
        const adapter = new SkillAdapter(skill);
        return adapter.metadata;
      }
      return {
        name: meta.name,
        display_name: meta.name,
        category: 'util' as const,
        description: meta.description,
        version: meta.version,
        methods: [],
        permissions: [],
        default_risk_level: 'low' as const,
        default_timeout_ms: 30000,
        supports_parallel: true,
        stateless: true,
        requires_config: false,
      };
    });
  }

  /**
   * Registra todos os skills existentes
   */
  getStats() {
    return this.registry.getStats();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

// Singleton
let registryAdapterInstance: SkillRegistryAdapter | null = null;

export function getSkillRegistryAdapter(): SkillRegistryAdapter {
  if (!registryAdapterInstance) {
    registryAdapterInstance = new SkillRegistryAdapter();
  }
  return registryAdapterInstance;
}

// Factory para criar adapter de skill específico
export function adaptSkill(skill: Skill): ISkill {
  return new SkillAdapter(skill);
}
