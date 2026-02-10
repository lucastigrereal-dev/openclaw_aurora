/**
 * Base Skill System - OpenClaw Aurora
 * Sistema de skills extensível com proteção Aurora Monitor
 */

import { EventEmitter } from 'events';

// ============================================================================
// TIPOS BASE
// ============================================================================

export interface SkillMetadata {
  name: string;
  description: string;
  version: string;
  category: SkillCategory;
  author?: string;
  tags?: string[];
}

export type SkillCategory =
  | 'EXEC'      // Execução de comandos (bash, python)
  | 'BROWSER'   // Automação de browser
  | 'FILE'      // Operações de arquivo
  | 'VISION'    // OCR, análise de imagem
  | 'MEMORY'    // Armazenamento/memória
  | 'WEB'       // Web scraping, APIs
  | 'AI'        // Chamadas a LLMs
  | 'COMM'      // Comunicação (Telegram, Discord, etc)
  | 'UTIL';     // Utilitários diversos

export interface SkillInput {
  [key: string]: any;
}

export interface SkillOutput {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

export interface SkillConfig {
  timeout?: number;        // Timeout em ms (default: 30000)
  retries?: number;        // Número de retries (default: 3)
  requiresApproval?: boolean; // Requer aprovação do usuário
}

// ============================================================================
// CLASSE BASE SKILL
// ============================================================================

export abstract class Skill extends EventEmitter {
  public readonly metadata: SkillMetadata;
  public readonly config: SkillConfig;
  private _enabled: boolean = true;

  constructor(metadata?: SkillMetadata, config: Partial<SkillConfig> = {}) {
    super();
    this.metadata = metadata as SkillMetadata;
    this.config = {
      timeout: config.timeout ?? 30000,
      retries: config.retries ?? 3,
      requiresApproval: config.requiresApproval ?? false,
    };
  }

  // Método abstrato que cada skill implementa
  abstract execute(input: SkillInput): Promise<SkillOutput>;

  // Validação de input (pode ser sobrescrita)
  validate(input: SkillInput): boolean {
    return true;
  }

  // Helper to get skill name from metadata or direct property
  get skillName(): string {
    return this.metadata?.name || (this as any).name || 'unknown';
  }

  // Execução com wrapper de métricas
  async run(input: SkillInput): Promise<SkillOutput> {
    if (!this._enabled) {
      return { success: false, error: 'Skill is disabled' };
    }

    if (!this.validate(input)) {
      return { success: false, error: 'Invalid input' };
    }

    const startTime = Date.now();
    this.emit('start', { skill: this.skillName, input });

    try {
      const result = await this.execute(input);
      result.duration = Date.now() - startTime;
      this.emit('complete', { skill: this.skillName, result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('error', { skill: this.skillName, error: errorMessage });
      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime
      };
    }
  }

  enable(): void {
    this._enabled = true;
    this.emit('enabled', { skill: this.skillName });
  }

  disable(): void {
    this._enabled = false;
    this.emit('disabled', { skill: this.skillName });
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  // Helper methods para compatibilidade com skills antigas
  protected error(msg: string, data?: any): SkillOutput {
    return {
      success: false,
      data: data,
      error: msg
    };
  }

  protected success(data: any): SkillOutput {
    return {
      success: true,
      data: data
    };
  }

  getInfo() {
    return {
      ...this.metadata,
      config: this.config,
      enabled: this._enabled,
    };
  }
}

// ============================================================================
// REGISTRO DE SKILLS
// ============================================================================

export class SkillRegistry extends EventEmitter {
  private skills: Map<string, Skill> = new Map();

  register(skill: Skill): void {
    // Support both patterns: skill.metadata.name (Skill) and skill.name (SkillBase direct props)
    const name = skill.metadata?.name || (skill as any).name;
    if (!name) {
      console.warn('[Skills] Skipped: skill has no name');
      return;
    }

    // Patch metadata from direct properties if missing
    if (!skill.metadata) {
      (skill as any).metadata = {
        name: (skill as any).name,
        description: (skill as any).description || '',
        version: '1.0.0',
        category: ((skill as any).category || 'UTIL').toUpperCase(),
      };
    }

    this.skills.set(name, skill);

    // Propaga eventos da skill
    skill.on('start', (data) => this.emit('skill:start', data));
    skill.on('complete', (data) => this.emit('skill:complete', data));
    skill.on('error', (data) => this.emit('skill:error', data));

    this.emit('skill:registered', { name });
    console.log(`[Skills] Registered: ${name}`);
  }

  unregister(name: string): boolean {
    const removed = this.skills.delete(name);
    if (removed) {
      this.emit('skill:unregistered', { name });
    }
    return removed;
  }

  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  getByCategory(category: SkillCategory): Skill[] {
    return this.getAll().filter(s => s.metadata.category === category);
  }

  async execute(name: string, input: SkillInput): Promise<SkillOutput> {
    const skill = this.get(name);
    if (!skill) {
      return { success: false, error: `Skill not found: ${name}` };
    }
    return skill.run(input);
  }

  listAll(): SkillMetadata[] {
    return this.getAll().map(s => s.metadata);
  }

  getStats() {
    const all = this.getAll();
    const byCategory: Record<string, number> = {};

    all.forEach(s => {
      byCategory[s.metadata.category] = (byCategory[s.metadata.category] || 0) + 1;
    });

    return {
      total: all.length,
      enabled: all.filter(s => s.isEnabled()).length,
      disabled: all.filter(s => !s.isEnabled()).length,
      byCategory,
    };
  }
}

// Singleton global
let registryInstance: SkillRegistry | null = null;

export function getSkillRegistry(): SkillRegistry {
  if (!registryInstance) {
    registryInstance = new SkillRegistry();
  }
  return registryInstance;
}

// ============================================================================
// ALIASES PARA COMPATIBILIDADE COM SKILLS ANTIGAS
// ============================================================================

/**
 * Alias para compatibilidade com skills antigas que usam SkillBase
 * @deprecated Use Skill instead
 */
export const SkillBase = Skill;

/**
 * Alias para compatibilidade com skills antigas que usam SkillResult
 * @deprecated Use SkillOutput instead
 */
export type SkillResult = SkillOutput;
