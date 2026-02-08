/**
 * FILE.CREATE - Advanced Version
 * Versão exponencialmente melhorada com recursos enterprise
 */

import { Skill, SkillInput, SkillOutput } from '../base';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

interface FileCreateAdvancedInput extends SkillInput {
  path: string;
  content: string;

  // Conflict resolution
  overwrite?: boolean;
  conflictStrategy?: 'error' | 'rename' | 'suffix' | 'backup' | 'skip';

  // Validation & formatting
  validate?: 'json' | 'yaml' | 'xml' | 'typescript' | 'python' | 'none';
  autoFormat?: boolean;

  // Metadata
  encoding?: BufferEncoding;
  permissions?: string; // '0644', '0755', etc.
  addHeader?: boolean;
  metadata?: {
    author?: string;
    description?: string;
    tags?: string[];
  };

  // Safety & logging
  dryRun?: boolean;
  backup?: boolean;
  atomic?: boolean; // Atomic write (temp file + rename)

  // Batch operations
  batch?: Array<{ path: string; content: string }>;

  // Templates
  template?: 'typescript-class' | 'python-script' | 'markdown' | 'json-config' | 'none';
  templateVars?: Record<string, any>;
}

// ============================================================================
// FILE.CREATE ADVANCED
// ============================================================================

export class FileCreateAdvancedSkill extends Skill {
  private creationLog: Array<{ path: string; timestamp: Date; size: number }> = [];

  constructor() {
    super(
      {
        name: 'file.create.advanced',
        description: 'Cria arquivos com recursos avançados (validação, templates, atomic writes, backup)',
        version: '2.0.0',
        category: 'FILE',
        tags: ['file', 'create', 'advanced', 'enterprise', 'atomic', 'validation'],
      },
      {
        timeout: 30000,
        requiresApproval: false,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const adv = input as FileCreateAdvancedInput;

    // Batch ou single file
    if (adv.batch) {
      return adv.batch.every(f => !!f.path && f.content !== undefined);
    }

    return !!adv.path && adv.content !== undefined;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const adv = input as FileCreateAdvancedInput;

    try {
      // Batch mode
      if (adv.batch && adv.batch.length > 0) {
        return await this.executeBatch(adv);
      }

      // Single file mode
      return await this.executeSingle(adv);

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // SINGLE FILE CREATION
  // ==========================================================================

  private async executeSingle(input: FileCreateAdvancedInput): Promise<SkillOutput> {
    const {
      path: filePath,
      content,
      overwrite = false,
      conflictStrategy = 'error',
      validate,
      autoFormat = false,
      encoding = 'utf-8',
      permissions,
      addHeader = false,
      metadata,
      dryRun = false,
      backup = false,
      atomic = true,
      template,
      templateVars,
    } = input;

    // 1. Sanitize & validate path
    const sanitizedPath = this.sanitizePath(filePath);
    const absolutePath = path.resolve(sanitizedPath);

    // Prevenir path traversal
    if (!this.isPathSafe(absolutePath)) {
      return {
        success: false,
        error: `Unsafe path: ${absolutePath}`,
      };
    }

    // 2. Apply template if specified
    let finalContent = content;
    if (template && template !== 'none') {
      finalContent = this.applyTemplate(template, content, templateVars);
    }

    // 3. Add header with metadata
    if (addHeader && metadata) {
      finalContent = this.addFileHeader(finalContent, metadata, path.extname(absolutePath));
    }

    // 4. Validate content
    if (validate && validate !== 'none') {
      const validationResult = this.validateContent(finalContent, validate);
      if (!validationResult.valid) {
        return {
          success: false,
          error: `Validation failed: ${validationResult.error}`,
        };
      }
    }

    // 5. Auto-format content
    if (autoFormat) {
      finalContent = this.autoFormatContent(finalContent, path.extname(absolutePath));
    }

    // 6. Check if file exists
    const exists = await fs.access(absolutePath).then(() => true).catch(() => false);

    if (exists && !overwrite) {
      // Handle conflict
      const conflictResult = await this.handleConflict(
        absolutePath,
        conflictStrategy,
        backup
      );

      if (!conflictResult.success) {
        return conflictResult;
      }

      // Update path if renamed
      if (conflictResult.data?.newPath) {
        return await this.writeFile(
          conflictResult.data.newPath,
          finalContent,
          encoding,
          permissions,
          atomic,
          dryRun
        );
      }
    }

    // 7. Backup if overwriting
    if (exists && overwrite && backup) {
      await this.backupFile(absolutePath);
    }

    // 8. Write file (atomic or direct)
    return await this.writeFile(
      absolutePath,
      finalContent,
      encoding,
      permissions,
      atomic,
      dryRun
    );
  }

  // ==========================================================================
  // BATCH CREATION
  // ==========================================================================

  private async executeBatch(input: FileCreateAdvancedInput): Promise<SkillOutput> {
    const { batch, dryRun = false } = input;

    if (!batch || batch.length === 0) {
      return {
        success: false,
        error: 'Batch array is empty',
      };
    }

    const results: Array<{ path: string; success: boolean; error?: string }> = [];

    for (const fileSpec of batch) {
      const singleInput: FileCreateAdvancedInput = {
        ...input,
        path: fileSpec.path,
        content: fileSpec.content,
        batch: undefined, // Remove batch to avoid recursion
      };

      const result = await this.executeSingle(singleInput);

      results.push({
        path: fileSpec.path,
        success: result.success,
        error: result.error,
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return {
      success: failCount === 0,
      data: {
        total: batch.length,
        success: successCount,
        failed: failCount,
        results,
        dryRun,
      },
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private sanitizePath(filePath: string): string {
    // Remove caracteres perigosos
    return filePath
      .replace(/\.\./g, '') // Remove ..
      .replace(/[<>:"|?*]/g, '') // Remove caracteres inválidos no Windows
      .trim();
  }

  private isPathSafe(absolutePath: string): boolean {
    // Bloquear paths do sistema
    const dangerousPaths = [
      '/etc',
      '/root',
      '/sys',
      '/proc',
      '/boot',
      '/usr/bin',
      '/usr/sbin',
      'C:\\Windows',
      'C:\\Program Files',
    ];

    return !dangerousPaths.some(dangerous =>
      absolutePath.startsWith(dangerous) ||
      absolutePath.includes(dangerous)
    );
  }

  private applyTemplate(
    template: string,
    content: string,
    vars?: Record<string, any>
  ): string {
    const templates: Record<string, (c: string, v?: any) => string> = {
      'typescript-class': (c, v) => `/**
 * ${v?.className || 'MyClass'}
 * ${v?.description || 'Auto-generated class'}
 */

export class ${v?.className || 'MyClass'} {
  constructor() {
    // TODO: Initialize
  }

${c}
}
`,
      'python-script': (c, v) => `#!/usr/bin/env python3
"""
${v?.description || 'Auto-generated script'}

Author: ${v?.author || 'Unknown'}
Created: ${new Date().toISOString()}
"""

${c}

if __name__ == '__main__':
    main()
`,
      'markdown': (c, v) => `# ${v?.title || 'Document'}

**Author:** ${v?.author || 'Unknown'}
**Date:** ${new Date().toLocaleDateString()}

${c}
`,
      'json-config': (c, v) => JSON.stringify(
        {
          name: v?.name || 'config',
          version: v?.version || '1.0.0',
          description: v?.description || '',
          config: JSON.parse(c),
        },
        null,
        2
      ),
    };

    return templates[template]?.(content, vars) || content;
  }

  private addFileHeader(
    content: string,
    metadata: any,
    ext: string
  ): string {
    const commentStyles: Record<string, { start: string; end: string }> = {
      '.ts': { start: '/**\n', end: '\n */\n\n' },
      '.tsx': { start: '/**\n', end: '\n */\n\n' },
      '.js': { start: '/**\n', end: '\n */\n\n' },
      '.py': { start: '"""\n', end: '\n"""\n\n' },
      '.md': { start: '<!--\n', end: '\n-->\n\n' },
      '.html': { start: '<!--\n', end: '\n-->\n\n' },
    };

    const style = commentStyles[ext] || { start: '# ', end: '\n\n' };

    const header = [
      metadata.description && `Description: ${metadata.description}`,
      metadata.author && `Author: ${metadata.author}`,
      `Created: ${new Date().toISOString()}`,
      metadata.tags && `Tags: ${metadata.tags.join(', ')}`,
    ]
      .filter(Boolean)
      .map(line => ` * ${line}`)
      .join('\n');

    return `${style.start}${header}${style.end}${content}`;
  }

  private validateContent(
    content: string,
    type: string
  ): { valid: boolean; error?: string } {
    try {
      switch (type) {
        case 'json':
          JSON.parse(content);
          break;

        case 'yaml':
          // Basic YAML validation (check for common errors)
          if (content.includes('\t')) {
            return { valid: false, error: 'YAML cannot contain tabs' };
          }
          break;

        case 'xml':
          // Basic XML validation
          if (!content.includes('<') || !content.includes('>')) {
            return { valid: false, error: 'Invalid XML structure' };
          }
          break;

        case 'typescript':
        case 'python':
          // Basic syntax check
          if (content.trim().length === 0) {
            return { valid: false, error: 'Empty content' };
          }
          break;
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  private autoFormatContent(content: string, ext: string): string {
    // Formatação básica por tipo de arquivo
    switch (ext) {
      case '.json':
        try {
          return JSON.stringify(JSON.parse(content), null, 2);
        } catch {
          return content;
        }

      case '.md':
        // Normalize line endings
        return content.replace(/\r\n/g, '\n').trim() + '\n';

      default:
        return content;
    }
  }

  private async handleConflict(
    absolutePath: string,
    strategy: string,
    backup: boolean
  ): Promise<SkillOutput> {
    switch (strategy) {
      case 'skip':
        return {
          success: false,
          error: 'File exists and strategy is skip',
        };

      case 'rename': {
        const newPath = await this.findAvailablePath(absolutePath);
        return {
          success: true,
          data: { newPath },
        };
      }

      case 'suffix': {
        const timestamp = Date.now();
        const ext = path.extname(absolutePath);
        const base = absolutePath.slice(0, -ext.length);
        const newPath = `${base}.${timestamp}${ext}`;
        return {
          success: true,
          data: { newPath },
        };
      }

      case 'backup':
        if (backup) {
          await this.backupFile(absolutePath);
          return { success: true };
        }
        return {
          success: false,
          error: 'Backup requested but backup flag not set',
        };

      case 'error':
      default:
        return {
          success: false,
          error: `File already exists: ${absolutePath}`,
        };
    }
  }

  private async findAvailablePath(originalPath: string): Promise<string> {
    const ext = path.extname(originalPath);
    const base = originalPath.slice(0, -ext.length);

    let counter = 1;
    let newPath = `${base} (${counter})${ext}`;

    while (await fs.access(newPath).then(() => true).catch(() => false)) {
      counter++;
      newPath = `${base} (${counter})${ext}`;
    }

    return newPath;
  }

  private async backupFile(absolutePath: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(absolutePath);
    const base = absolutePath.slice(0, -ext.length);
    const backupPath = `${base}.backup-${timestamp}${ext}`;

    await fs.copyFile(absolutePath, backupPath);
  }

  private async writeFile(
    absolutePath: string,
    content: string,
    encoding: BufferEncoding,
    permissions?: string,
    atomic: boolean = true,
    dryRun: boolean = false
  ): Promise<SkillOutput> {
    // Dry run - não escreve realmente
    if (dryRun) {
      return {
        success: true,
        data: {
          path: absolutePath,
          size: Buffer.byteLength(content, encoding),
          dryRun: true,
          message: 'Would create file (dry run mode)',
        },
      };
    }

    // Criar diretório
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

    if (atomic) {
      // Atomic write: write to temp, then rename
      const tempPath = `${absolutePath}.tmp-${crypto.randomBytes(4).toString('hex')}`;

      try {
        await fs.writeFile(tempPath, content, encoding);

        if (permissions) {
          await fs.chmod(tempPath, parseInt(permissions, 8));
        }

        await fs.rename(tempPath, absolutePath);
      } catch (error) {
        // Cleanup temp file on error
        await fs.unlink(tempPath).catch(() => {});
        throw error;
      }
    } else {
      // Direct write
      await fs.writeFile(absolutePath, content, encoding);

      if (permissions) {
        await fs.chmod(absolutePath, parseInt(permissions, 8));
      }
    }

    const stats = await fs.stat(absolutePath);

    // Log creation
    this.creationLog.push({
      path: absolutePath,
      timestamp: new Date(),
      size: stats.size,
    });

    return {
      success: true,
      data: {
        path: absolutePath,
        size: stats.size,
        created: stats.birthtime,
        encoding,
        atomic,
        checksum: await this.calculateChecksum(absolutePath),
      },
    };
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  // Método para obter log de criações
  getCreationLog(): Array<{ path: string; timestamp: Date; size: number }> {
    return [...this.creationLog];
  }

  clearCreationLog(): void {
    this.creationLog = [];
  }
}
