/**
 * patch.apply - P1 Skill
 * Aplica patches em arquivos com backup de segurança
 *
 * Segurança:
 * - Só escreve dentro de ./apps/{appName}/...
 * - Cria backup com timestamp antes de alterar
 * - Valida path traversal
 * - Limite de tamanho do arquivo
 */

import { Skill, SkillInput, SkillOutput } from '../base';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TIPOS
// ============================================================================

export interface PatchOperation {
  file: string;           // Caminho relativo ao appLocation
  operation: 'replace' | 'insert' | 'delete' | 'full_replace';
  search?: string;        // Texto a buscar (para replace/delete)
  replacement?: string;   // Texto de substituição
  line?: number;          // Linha para insert
  content?: string;       // Conteúdo completo (para full_replace)
}

export interface PatchApplyInput {
  appLocation: string;
  patches: PatchOperation[];
  dryRun?: boolean;       // Apenas simular
  createBackup?: boolean; // Default: true
}

export interface PatchResult {
  file: string;
  operation: string;
  status: 'applied' | 'skipped' | 'failed';
  backupFile?: string;
  error?: string;
}

export interface PatchApplyOutput {
  patchesApplied: PatchResult[];
  successCount: number;
  failedCount: number;
  skippedCount: number;
  backupDir?: string;
}

// ============================================================================
// CONFIGURAÇÃO DE SEGURANÇA
// ============================================================================

const SECURITY_CONFIG = {
  maxFileSize: 500 * 1024, // 500KB max
  maxPatchSize: 100 * 1024, // 100KB max para patch
  blockedPatterns: ['..', '/etc/', '/var/', 'C:\\Windows', 'C:\\Program'],
  allowedExtensions: [
    '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt',
    '.css', '.scss', '.less', '.html', '.yml', '.yaml',
    '.sh', '.bash', '.env', '.env.example', '.gitignore',
  ],
};

// ============================================================================
// SKILL
// ============================================================================

export class PatchApplySkill extends Skill {
  constructor() {
    super(
      {
        name: 'patch.apply',
        description: 'Aplica patches em arquivos com backup de segurança',
        version: '1.0.0',
        category: 'FILE',
        author: 'OpenClaw',
        tags: ['p1', 'patch', 'apply', 'fix', 'edit'],
      },
      {
        timeout: 60000,
        retries: 0,
        requiresApproval: false, // Auto-aprovado no P1 para loop de correção
      }
    );
  }

  validate(input: SkillInput): boolean {
    const params = input.params as PatchApplyInput;
    return !!(params?.appLocation && params?.patches && Array.isArray(params.patches));
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const params = input.params as PatchApplyInput;
    const { appLocation, patches, dryRun = false, createBackup = true } = params;

    console.log(`[patch.apply] Applying ${patches.length} patches to ${appLocation}`);
    console.log(`[patch.apply] Dry run: ${dryRun}, Create backup: ${createBackup}`);

    // Validar que appLocation existe e está em ./apps/
    const appLocationResolved = path.resolve(appLocation);
    if (!this.isValidAppLocation(appLocationResolved)) {
      return this.error(`Invalid app location: ${appLocation}. Must be inside ./apps/`);
    }

    if (!fs.existsSync(appLocationResolved)) {
      return this.error(`App location does not exist: ${appLocation}`);
    }

    // Criar diretório de backup
    let backupDir: string | undefined;
    if (createBackup && !dryRun) {
      backupDir = path.join(appLocationResolved, '.backups', `backup-${Date.now()}`);
      try {
        fs.mkdirSync(backupDir, { recursive: true });
        console.log(`[patch.apply] Backup dir: ${backupDir}`);
      } catch (err) {
        console.warn(`[patch.apply] Could not create backup dir: ${err}`);
      }
    }

    const results: PatchResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const patch of patches) {
      const result = await this.applyPatch(patch, appLocationResolved, backupDir, dryRun);
      results.push(result);

      if (result.status === 'applied') successCount++;
      else if (result.status === 'failed') failedCount++;
      else skippedCount++;
    }

    const output: PatchApplyOutput = {
      patchesApplied: results,
      successCount,
      failedCount,
      skippedCount,
      backupDir,
    };

    console.log(`[patch.apply] Completed: ${successCount} applied, ${failedCount} failed, ${skippedCount} skipped`);

    if (failedCount > 0) {
      return this.error(`Some patches failed: ${failedCount}/${patches.length}`, { data: output });
    }

    return this.success(output);
  }

  private async applyPatch(
    patch: PatchOperation,
    appLocation: string,
    backupDir: string | undefined,
    dryRun: boolean
  ): Promise<PatchResult> {
    const { file, operation } = patch;

    // Validar path
    const fullPath = path.resolve(appLocation, file);

    // Verificar path traversal
    if (!fullPath.startsWith(appLocation)) {
      return {
        file,
        operation,
        status: 'failed',
        error: 'Path traversal detected',
      };
    }

    // Verificar patterns bloqueados
    for (const blocked of SECURITY_CONFIG.blockedPatterns) {
      if (file.includes(blocked)) {
        return {
          file,
          operation,
          status: 'failed',
          error: `Blocked pattern: ${blocked}`,
        };
      }
    }

    // Verificar extensão
    const ext = path.extname(file).toLowerCase();
    if (ext && !SECURITY_CONFIG.allowedExtensions.includes(ext)) {
      return {
        file,
        operation,
        status: 'failed',
        error: `Extension not allowed: ${ext}`,
      };
    }

    // Verificar se arquivo existe (exceto para full_replace que pode criar)
    if (!fs.existsSync(fullPath) && operation !== 'full_replace') {
      return {
        file,
        operation,
        status: 'failed',
        error: 'File does not exist',
      };
    }

    // Ler conteúdo atual
    let currentContent = '';
    if (fs.existsSync(fullPath)) {
      try {
        const stats = fs.statSync(fullPath);
        if (stats.size > SECURITY_CONFIG.maxFileSize) {
          return {
            file,
            operation,
            status: 'failed',
            error: `File too large: ${stats.size} > ${SECURITY_CONFIG.maxFileSize}`,
          };
        }
        currentContent = fs.readFileSync(fullPath, 'utf8');
      } catch (err) {
        return {
          file,
          operation,
          status: 'failed',
          error: `Could not read file: ${err}`,
        };
      }
    }

    // Aplicar operação
    let newContent: string;
    try {
      newContent = this.applyOperation(currentContent, patch);
    } catch (err) {
      return {
        file,
        operation,
        status: 'failed',
        error: `Operation failed: ${err}`,
      };
    }

    // Verificar se houve mudança
    if (newContent === currentContent) {
      return {
        file,
        operation,
        status: 'skipped',
        error: 'No changes detected',
      };
    }

    // Verificar tamanho do patch
    if (newContent.length > SECURITY_CONFIG.maxFileSize) {
      return {
        file,
        operation,
        status: 'failed',
        error: `Result too large: ${newContent.length} > ${SECURITY_CONFIG.maxFileSize}`,
      };
    }

    if (dryRun) {
      console.log(`[patch.apply] DRY RUN: Would modify ${file}`);
      return {
        file,
        operation,
        status: 'applied',
      };
    }

    // Criar backup
    let backupFile: string | undefined;
    if (backupDir && fs.existsSync(fullPath)) {
      try {
        const backupName = file.replace(/\//g, '__') + '.bak';
        backupFile = path.join(backupDir, backupName);
        fs.writeFileSync(backupFile, currentContent, 'utf8');
        console.log(`[patch.apply] Backup: ${backupFile}`);
      } catch (err) {
        console.warn(`[patch.apply] Could not create backup: ${err}`);
      }
    }

    // Escrever arquivo
    try {
      // Garantir que diretório existe
      const fileDir = path.dirname(fullPath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      fs.writeFileSync(fullPath, newContent, 'utf8');
      console.log(`[patch.apply] Applied: ${file} (${operation})`);

      return {
        file,
        operation,
        status: 'applied',
        backupFile,
      };
    } catch (err) {
      return {
        file,
        operation,
        status: 'failed',
        error: `Could not write file: ${err}`,
        backupFile,
      };
    }
  }

  private applyOperation(content: string, patch: PatchOperation): string {
    const { operation, search, replacement, line, content: fullContent } = patch;

    switch (operation) {
      case 'replace':
        if (!search) throw new Error('replace requires search');
        if (replacement === undefined) throw new Error('replace requires replacement');
        if (!content.includes(search)) throw new Error(`Search string not found: ${search.substring(0, 50)}...`);
        return content.replace(search, replacement);

      case 'insert':
        if (line === undefined) throw new Error('insert requires line');
        if (replacement === undefined) throw new Error('insert requires replacement');
        const lines = content.split('\n');
        const insertLine = Math.min(Math.max(0, line - 1), lines.length);
        lines.splice(insertLine, 0, replacement);
        return lines.join('\n');

      case 'delete':
        if (!search) throw new Error('delete requires search');
        if (!content.includes(search)) throw new Error(`Search string not found: ${search.substring(0, 50)}...`);
        return content.replace(search, '');

      case 'full_replace':
        if (fullContent === undefined) throw new Error('full_replace requires content');
        return fullContent;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private isValidAppLocation(appLocation: string): boolean {
    // Deve estar dentro de ./apps/ ou caminho absoluto que contém /apps/
    const appsDir = path.resolve('./apps');
    const normalized = path.normalize(appLocation);

    // Verificar se está dentro de apps/
    if (normalized.startsWith(appsDir)) return true;

    // Ou se contém /apps/ no path
    if (normalized.includes('/apps/') || normalized.includes('\\apps\\')) return true;

    return false;
  }
}

// Factory
export function createPatchApplySkill(): PatchApplySkill {
  return new PatchApplySkill();
}
