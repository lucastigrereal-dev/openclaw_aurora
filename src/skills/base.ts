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

  constructor(metadata: SkillMetadata, config: Partial<SkillConfig> = {}) {
    super();
    this.metadata = metadata;
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

  // Execução com wrapper de métricas
  async run(input: SkillInput): Promise<SkillOutput> {
    if (!this._enabled) {
      return { success: false, error: 'Skill is disabled' };
    }

    if (!this.validate(input)) {
      return { success: false, error: 'Invalid input' };
    }

    const startTime = Date.now();
    this.emit('start', { skill: this.metadata.name, input });

    try {
      const result = await this.execute(input);
      result.duration = Date.now() - startTime;
      this.emit('complete', { skill: this.metadata.name, result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('error', { skill: this.metadata.name, error: errorMessage });
      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime
      };
    }
  }

  protected success(data?: any, metadata?: any): SkillOutput {
    return {
      success: true,
      data,
      ...(metadata || {}),
    };
  }

  protected error(error: string | Error, metadata?: any): SkillOutput {
    const errorMessage = error instanceof Error ? error.message : error;
    return {
      success: false,
      error: errorMessage,
      ...(metadata || {}),
    };
  }

  enable(): void {
    this._enabled = true;
    this.emit('enabled', { skill: this.metadata.name });
  }

  disable(): void {
    this._enabled = false;
    this.emit('disabled', { skill: this.metadata.name });
  }

  isEnabled(): boolean {
    return this._enabled;
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
    this.skills.set(skill.metadata.name, skill);

    // Propaga eventos da skill
    skill.on('start', (data) => this.emit('skill:start', data));
    skill.on('complete', (data) => this.emit('skill:complete', data));
    skill.on('error', (data) => this.emit('skill:error', data));

    this.emit('skill:registered', { name: skill.metadata.name });
    console.log(`[Skills] Registered: ${skill.metadata.name}`);
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

// Note: RegistryV2 available at skills/infrastructure/registry-v2.ts
// Re-export disabled due to migration - use direct import if needed
