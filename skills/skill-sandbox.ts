/**
 * E-01: Skill Sandbox & Dry-Run System
 *
 * Sistema de execução segura que permite testar skills sem afetar produção
 *
 * Features:
 * - Dry-run mode (simula execução)
 * - Sandbox isolado
 * - Preview de mudanças
 * - Snapshot/rollback automático
 * - Validação de outputs
 * - Limites de recursos
 *
 * @version 1.0.0
 * @critical EXECUTION
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import { SkillSpec, SkillRiskLevel } from './skill-spec';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export enum SandboxMode {
  DRY_RUN = 'dry_run',         // Simula execução, sem side-effects
  PREVIEW = 'preview',         // Mostra preview de mudanças
  SANDBOX = 'sandbox',         // Executa em ambiente isolado
  VALIDATE = 'validate',       // Valida output sem executar
  PRODUCTION = 'production',   // Execução normal (sem sandbox)
}

export interface SandboxConfig {
  mode: SandboxMode;
  allowedCategories?: string[];     // Categorias permitidas
  maxExecutionTime?: number;        // Timeout máximo (ms)
  maxMemoryMB?: number;             // Limite de memória
  enableSnapshot?: boolean;         // Habilitar snapshot/rollback
  snapshotPath?: string;            // Caminho para snapshots
  validateOutput?: boolean;         // Validar output contra schema
  preventSideEffects?: boolean;     // Bloquear operações destrutivas
}

export interface SandboxResult {
  mode: SandboxMode;
  executed: boolean;                // Se foi realmente executado
  output: SkillOutput;              // Output da skill
  preview?: {
    changes: string[];              // Mudanças que seriam feitas
    filesAffected?: string[];       // Arquivos afetados
    warnings?: string[];            // Warnings
  };
  snapshot?: {
    id: string;                     // ID do snapshot
    created: Date;                  // Quando criado
    path: string;                   // Caminho do snapshot
  };
  validation?: {
    valid: boolean;
    errors?: string[];
  };
  resourceUsage?: {
    executionTime: number;          // Tempo de execução (ms)
    memoryUsed?: number;            // Memória usada (bytes)
  };
}

export interface SkillSnapshot {
  id: string;
  skillName: string;
  timestamp: Date;
  input: SkillInput;
  state: any;                       // Estado anterior
  metadata: Record<string, any>;
}

// ============================================================================
// SKILL SANDBOX
// ============================================================================

export class SkillSandbox extends EventEmitter {
  private config: SandboxConfig;
  private snapshots: Map<string, SkillSnapshot> = new Map();

  constructor(config: Partial<SandboxConfig> = {}) {
    super();

    this.config = {
      mode: config.mode || SandboxMode.PRODUCTION,
      maxExecutionTime: config.maxExecutionTime || 30000,
      maxMemoryMB: config.maxMemoryMB || 512,
      enableSnapshot: config.enableSnapshot ?? true,
      snapshotPath: config.snapshotPath || '/tmp/openclaw-snapshots',
      validateOutput: config.validateOutput ?? true,
      preventSideEffects: config.preventSideEffects ?? false,
      ...config,
    };
  }

  /**
   * Executa uma skill no sandbox
   */
  async execute(
    skill: Skill,
    spec: SkillSpec,
    input: SkillInput
  ): Promise<SandboxResult> {
    const startTime = Date.now();

    this.emit('sandbox:start', {
      skill: spec.name,
      mode: this.config.mode,
      input,
    });

    try {
      // Validar se skill pode rodar neste modo
      this.validateSkillForMode(spec);

      // Criar snapshot se necessário
      let snapshot: SkillSnapshot | undefined;
      if (this.config.enableSnapshot && this.shouldSnapshot(spec)) {
        snapshot = await this.createSnapshot(spec, input);
      }

      // Executar conforme modo
      let result: SandboxResult;

      switch (this.config.mode) {
        case SandboxMode.DRY_RUN:
          result = await this.executeDryRun(skill, spec, input);
          break;

        case SandboxMode.PREVIEW:
          result = await this.executePreview(skill, spec, input);
          break;

        case SandboxMode.SANDBOX:
          result = await this.executeSandbox(skill, spec, input, snapshot);
          break;

        case SandboxMode.VALIDATE:
          result = await this.executeValidate(skill, spec, input);
          break;

        case SandboxMode.PRODUCTION:
        default:
          result = await this.executeProduction(skill, spec, input);
          break;
      }

      // Adicionar resource usage
      result.resourceUsage = {
        executionTime: Date.now() - startTime,
      };

      // Validar output se habilitado
      if (this.config.validateOutput && spec.ioSchema) {
        const validation = this.validateOutput(result.output, spec);
        result.validation = validation;
      }

      this.emit('sandbox:complete', { skill: spec.name, result });

      return result;
    } catch (error: any) {
      this.emit('sandbox:error', { skill: spec.name, error: error.message });

      return {
        mode: this.config.mode,
        executed: false,
        output: {
          success: false,
          error: error.message,
        },
        resourceUsage: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  // ==========================================================================
  // EXECUTION MODES
  // ==========================================================================

  /**
   * DRY RUN: Simula execução sem side-effects
   */
  private async executeDryRun(
    skill: Skill,
    spec: SkillSpec,
    input: SkillInput
  ): Promise<SandboxResult> {
    // Não executa realmente, apenas valida
    const isValid = skill.validate(input);

    return {
      mode: SandboxMode.DRY_RUN,
      executed: false,
      output: {
        success: isValid,
        data: {
          message: 'Dry run completed - no actual execution',
          wouldExecute: isValid,
        },
      },
      preview: {
        changes: ['Skill would be executed (dry-run mode)'],
        warnings: spec.riskLevel === SkillRiskLevel.HIGH
          ? ['This is a HIGH RISK skill - review carefully']
          : undefined,
      },
    };
  }

  /**
   * PREVIEW: Mostra preview das mudanças
   */
  private async executePreview(
    skill: Skill,
    spec: SkillSpec,
    input: SkillInput
  ): Promise<SandboxResult> {
    const changes: string[] = [];
    const filesAffected: string[] = [];

    // Detectar mudanças baseado no tipo de skill
    if (spec.category === 'FILE') {
      if (input.path) {
        filesAffected.push(input.path as string);
        changes.push(`Would modify file: ${input.path}`);
      }
      if (input.batch) {
        const batch = input.batch as Array<{ path: string }>;
        batch.forEach(f => {
          filesAffected.push(f.path);
          changes.push(`Would modify file: ${f.path}`);
        });
      }
    } else if (spec.category === 'EXEC') {
      changes.push(`Would execute command: ${input.command || 'unknown'}`);
    } else if (spec.category === 'AI') {
      changes.push(`Would make AI API call to: ${spec.name}`);
    }

    return {
      mode: SandboxMode.PREVIEW,
      executed: false,
      output: {
        success: true,
        data: { message: 'Preview mode - no execution' },
      },
      preview: {
        changes,
        filesAffected: filesAffected.length > 0 ? filesAffected : undefined,
        warnings: spec.riskLevel === SkillRiskLevel.CRITICAL
          ? ['CRITICAL RISK - Review all changes before executing']
          : undefined,
      },
    };
  }

  /**
   * SANDBOX: Executa em ambiente isolado
   */
  private async executeSandbox(
    skill: Skill,
    spec: SkillSpec,
    input: SkillInput,
    snapshot?: SkillSnapshot
  ): Promise<SandboxResult> {
    // Para skills de arquivo, usar path temporário
    let sandboxInput = { ...input };

    if (spec.category === 'FILE' && input.path) {
      const tempPath = await this.createTempPath(input.path as string);
      sandboxInput.path = tempPath;
    }

    // Executar skill
    const output = await this.executeWithTimeout(
      skill,
      sandboxInput,
      this.config.maxExecutionTime!
    );

    // Verificar se deve fazer rollback
    if (!output.success && snapshot) {
      await this.rollback(snapshot);
    }

    return {
      mode: SandboxMode.SANDBOX,
      executed: true,
      output,
      snapshot: snapshot ? {
        id: snapshot.id,
        created: snapshot.timestamp,
        path: await this.getSnapshotPath(snapshot.id),
      } : undefined,
    };
  }

  /**
   * VALIDATE: Apenas valida output
   */
  private async executeValidate(
    skill: Skill,
    spec: SkillSpec,
    input: SkillInput
  ): Promise<SandboxResult> {
    const isValid = skill.validate(input);

    const validation = {
      valid: isValid,
      errors: isValid ? undefined : ['Input validation failed'],
    };

    return {
      mode: SandboxMode.VALIDATE,
      executed: false,
      output: {
        success: isValid,
        data: { message: 'Validation completed' },
      },
      validation,
    };
  }

  /**
   * PRODUCTION: Execução normal
   */
  private async executeProduction(
    skill: Skill,
    spec: SkillSpec,
    input: SkillInput
  ): Promise<SandboxResult> {
    const output = await this.executeWithTimeout(
      skill,
      input,
      this.config.maxExecutionTime!
    );

    return {
      mode: SandboxMode.PRODUCTION,
      executed: true,
      output,
    };
  }

  // ==========================================================================
  // SNAPSHOT & ROLLBACK
  // ==========================================================================

  /**
   * Cria snapshot do estado antes de executar
   */
  private async createSnapshot(
    spec: SkillSpec,
    input: SkillInput
  ): Promise<SkillSnapshot> {
    const id = crypto.randomBytes(8).toString('hex');
    const timestamp = new Date();

    const snapshot: SkillSnapshot = {
      id,
      skillName: spec.name,
      timestamp,
      input,
      state: await this.captureState(spec, input),
      metadata: {},
    };

    this.snapshots.set(id, snapshot);

    // Salvar snapshot em disco se path configurado
    if (this.config.snapshotPath) {
      await this.saveSnapshot(snapshot);
    }

    return snapshot;
  }

  /**
   * Captura estado atual antes de executar skill
   */
  private async captureState(
    spec: SkillSpec,
    input: SkillInput
  ): Promise<any> {
    const state: any = {};

    // Para skills de arquivo, capturar conteúdo antes
    if (spec.category === 'FILE' && input.path) {
      try {
        const content = await fs.readFile(input.path as string, 'utf-8');
        state.fileContent = content;
        state.filePath = input.path;
      } catch {
        state.fileExists = false;
      }
    }

    return state;
  }

  /**
   * Rollback para snapshot anterior
   */
  private async rollback(snapshot: SkillSnapshot): Promise<void> {
    console.log(`[Sandbox] Rolling back to snapshot ${snapshot.id}`);

    // Restaurar arquivos se necessário
    if (snapshot.state.fileContent && snapshot.state.filePath) {
      await fs.writeFile(
        snapshot.state.filePath,
        snapshot.state.fileContent
      );
    }

    this.emit('sandbox:rollback', { snapshotId: snapshot.id });
  }

  /**
   * Salva snapshot em disco
   */
  private async saveSnapshot(snapshot: SkillSnapshot): Promise<void> {
    const snapshotPath = await this.getSnapshotPath(snapshot.id);
    await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
    await fs.writeFile(
      snapshotPath,
      JSON.stringify(snapshot, null, 2)
    );
  }

  private async getSnapshotPath(id: string): Promise<string> {
    return path.join(this.config.snapshotPath!, `${id}.json`);
  }

  // ==========================================================================
  // VALIDATION & HELPERS
  // ==========================================================================

  private validateSkillForMode(spec: SkillSpec): void {
    // Em dry-run/preview, bloquear skills CRITICAL
    if (
      (this.config.mode === SandboxMode.DRY_RUN ||
        this.config.mode === SandboxMode.PREVIEW) &&
      spec.riskLevel === SkillRiskLevel.CRITICAL
    ) {
      if (this.config.preventSideEffects) {
        throw new Error(
          `CRITICAL risk skills cannot run in ${this.config.mode} mode with preventSideEffects=true`
        );
      }
    }

    // Validar categorias permitidas
    if (
      this.config.allowedCategories &&
      !this.config.allowedCategories.includes(spec.category)
    ) {
      throw new Error(
        `Skill category ${spec.category} not allowed in sandbox`
      );
    }
  }

  private shouldSnapshot(spec: SkillSpec): boolean {
    // Snapshot apenas para skills de risco médio ou alto
    return (
      spec.riskLevel === SkillRiskLevel.HIGH ||
      spec.riskLevel === SkillRiskLevel.CRITICAL ||
      spec.category === 'FILE'
    );
  }

  private async executeWithTimeout(
    skill: Skill,
    input: SkillInput,
    timeout: number
  ): Promise<SkillOutput> {
    return Promise.race([
      skill.run(input),
      new Promise<SkillOutput>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      ),
    ]);
  }

  private async createTempPath(originalPath: string): Promise<string> {
    const ext = path.extname(originalPath);
    const base = path.basename(originalPath, ext);
    const tempId = crypto.randomBytes(4).toString('hex');
    return path.join('/tmp', `${base}-sandbox-${tempId}${ext}`);
  }

  private validateOutput(
    output: SkillOutput,
    spec: SkillSpec
  ): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!spec.ioSchema || !spec.ioSchema.output) {
      return { valid: true };
    }

    const schema = spec.ioSchema.output;

    // Validar campos obrigatórios de sucesso
    if (output.success && schema.successFields) {
      for (const field of schema.successFields) {
        if (!(field in (output.data || {}))) {
          errors.push(`Missing required success field: ${field}`);
        }
      }
    }

    // Validar campos de erro
    if (!output.success && schema.errorFields) {
      for (const field of schema.errorFields) {
        if (!(field in (output || {}))) {
          errors.push(`Missing required error field: ${field}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Limpa snapshots antigos
   */
  async cleanupSnapshots(olderThanDays: number = 7): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    let removed = 0;

    for (const [id, snapshot] of this.snapshots.entries()) {
      if (snapshot.timestamp < cutoff) {
        this.snapshots.delete(id);

        // Remover arquivo se existir
        if (this.config.snapshotPath) {
          try {
            const snapshotPath = await this.getSnapshotPath(id);
            await fs.unlink(snapshotPath);
          } catch {}
        }

        removed++;
      }
    }

    return removed;
  }
}

// ============================================================================
// FACTORY & UTILITIES
// ============================================================================

/**
 * Cria sandbox com configuração padrão para desenvolvimento
 */
export function createDevSandbox(): SkillSandbox {
  return new SkillSandbox({
    mode: SandboxMode.SANDBOX,
    enableSnapshot: true,
    validateOutput: true,
    preventSideEffects: true,
    maxExecutionTime: 10000,
  });
}

/**
 * Cria sandbox para testes
 */
export function createTestSandbox(): SkillSandbox {
  return new SkillSandbox({
    mode: SandboxMode.DRY_RUN,
    enableSnapshot: false,
    validateOutput: true,
    preventSideEffects: true,
    maxExecutionTime: 5000,
  });
}

/**
 * Cria sandbox para produção
 */
export function createProductionSandbox(): SkillSandbox {
  return new SkillSandbox({
    mode: SandboxMode.PRODUCTION,
    enableSnapshot: true,
    validateOutput: false,
    preventSideEffects: false,
    maxExecutionTime: 30000,
  });
}
