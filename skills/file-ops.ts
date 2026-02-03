/**
 * Skills de operações de arquivo
 * file.read, file.write, file.list, file.delete
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================================================
// FILE.READ
// ============================================================================

export class FileReadSkill extends Skill {
  constructor() {
    super(
      {
        name: 'file.read',
        description: 'Lê conteúdo de arquivos',
        version: '1.0.0',
        category: 'FILE',
        tags: ['file', 'read', 'filesystem'],
      },
      { timeout: 10000 }
    );
  }

  validate(input: SkillInput): boolean {
    return !!input.path && typeof input.path === 'string';
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { path: filePath, encoding = 'utf-8' } = input;

    try {
      const absolutePath = path.resolve(filePath);
      const content = await fs.readFile(absolutePath, encoding as BufferEncoding);
      const stats = await fs.stat(absolutePath);

      return {
        success: true,
        data: {
          content,
          path: absolutePath,
          size: stats.size,
          modified: stats.mtime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ============================================================================
// FILE.WRITE
// ============================================================================

export class FileWriteSkill extends Skill {
  constructor() {
    super(
      {
        name: 'file.write',
        description: 'Escreve conteúdo em arquivos',
        version: '1.0.0',
        category: 'FILE',
        tags: ['file', 'write', 'filesystem'],
      },
      {
        timeout: 10000,
        requiresApproval: true, // Escrita requer aprovação
      }
    );
  }

  validate(input: SkillInput): boolean {
    return !!input.path && input.content !== undefined;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { path: filePath, content, append = false } = input;

    try {
      const absolutePath = path.resolve(filePath);

      // Cria diretório se não existir
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });

      if (append) {
        await fs.appendFile(absolutePath, content);
      } else {
        await fs.writeFile(absolutePath, content);
      }

      const stats = await fs.stat(absolutePath);

      return {
        success: true,
        data: {
          path: absolutePath,
          size: stats.size,
          append,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ============================================================================
// FILE.LIST
// ============================================================================

export class FileListSkill extends Skill {
  constructor() {
    super(
      {
        name: 'file.list',
        description: 'Lista arquivos em diretório',
        version: '1.0.0',
        category: 'FILE',
        tags: ['file', 'list', 'directory', 'filesystem'],
      },
      { timeout: 10000 }
    );
  }

  validate(input: SkillInput): boolean {
    return !!input.path && typeof input.path === 'string';
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { path: dirPath, recursive = false, pattern } = input;

    try {
      const absolutePath = path.resolve(dirPath);
      const files = await this.listFiles(absolutePath, recursive, pattern);

      return {
        success: true,
        data: {
          path: absolutePath,
          files,
          count: files.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async listFiles(dir: string, recursive: boolean, pattern?: string): Promise<any[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: any[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (pattern && !entry.name.match(new RegExp(pattern))) {
        continue;
      }

      if (entry.isDirectory()) {
        files.push({ name: entry.name, path: fullPath, type: 'directory' });
        if (recursive) {
          const subFiles = await this.listFiles(fullPath, true, pattern);
          files.push(...subFiles);
        }
      } else {
        const stats = await fs.stat(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          type: 'file',
          size: stats.size,
          modified: stats.mtime,
        });
      }
    }

    return files;
  }
}

// ============================================================================
// FILE.DELETE
// ============================================================================

export class FileDeleteSkill extends Skill {
  constructor() {
    super(
      {
        name: 'file.delete',
        description: 'Deleta arquivos ou diretórios',
        version: '1.0.0',
        category: 'FILE',
        tags: ['file', 'delete', 'remove', 'filesystem'],
      },
      {
        timeout: 10000,
        requiresApproval: true, // Deleção SEMPRE requer aprovação
      }
    );
  }

  validate(input: SkillInput): boolean {
    return !!input.path && typeof input.path === 'string';
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { path: filePath, recursive = false } = input;

    try {
      const absolutePath = path.resolve(filePath);

      // Proteção contra deleção de diretórios críticos
      const dangerous = ['/', '/home', '/usr', '/etc', '/var', '/root'];
      if (dangerous.includes(absolutePath)) {
        throw new Error('Cannot delete system directories');
      }

      await fs.rm(absolutePath, { recursive, force: false });

      return {
        success: true,
        data: {
          deleted: absolutePath,
          recursive,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
