/**
 * file.materialize - P0 Core Skill
 * Materializa arquivos no disco de forma segura
 *
 * Segurança:
 * - Só escreve dentro de ./apps/{appName}/
 * - Bloqueia path traversal (..)
 * - Limite de 15 arquivos por execução
 * - Limite de 200KB por arquivo
 */

import { Skill, SkillInput, SkillOutput } from '../base';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TIPOS
// ============================================================================

export interface FilePlan {
  path: string;      // Caminho relativo dentro do app (ex: "src/index.ts")
  content: string;   // Conteúdo do arquivo
}

export interface MaterializeInput {
  appName: string;
  basePath?: string;  // Default: ./apps
  files: FilePlan[];
}

export interface MaterializeOutput {
  filesWritten: string[];
  filesSkipped: string[];
  errors: Array<{ path: string; error: string }>;
  totalBytes: number;
  appLocation: string;
}

// ============================================================================
// CONFIGURAÇÃO DE SEGURANÇA
// ============================================================================

const SECURITY_CONFIG = {
  maxFiles: 15,
  maxFileSizeBytes: 200 * 1024, // 200KB
  blockedPatterns: [
    '..', // path traversal
    '/etc/',
    '/var/',
    '/usr/',
    '/bin/',
    '/sbin/',
    'C:\\Windows',
    'C:\\Program Files',
  ],
  allowedExtensions: [
    '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt',
    '.css', '.scss', '.html', '.yaml', '.yml', '.env.example',
    '.gitignore', '.npmrc', '.eslintrc', '.prettierrc',
  ],
};

// ============================================================================
// SKILL
// ============================================================================

export class FileMaterializeSkill extends Skill {
  constructor() {
    super(
      {
        name: 'file.materialize',
        description: 'Materializa arquivos no disco de forma segura',
        version: '1.0.0',
        category: 'FILE',
        author: 'OpenClaw',
        tags: ['p0', 'file', 'write', 'materialize'],
      },
      {
        timeout: 60000,
        retries: 0,
        requiresApproval: false,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const params = input.params as MaterializeInput;

    if (!params?.appName) {
      console.error('[file.materialize] Missing appName');
      return false;
    }

    if (!params?.files || !Array.isArray(params.files)) {
      console.error('[file.materialize] Missing or invalid files array');
      return false;
    }

    if (params.files.length > SECURITY_CONFIG.maxFiles) {
      console.error(`[file.materialize] Too many files: ${params.files.length} > ${SECURITY_CONFIG.maxFiles}`);
      return false;
    }

    // Validar appName (sem caracteres perigosos)
    if (!/^[a-zA-Z0-9_-]+$/.test(params.appName)) {
      console.error('[file.materialize] Invalid appName (alphanumeric, _, - only)');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const params = input.params as MaterializeInput;
    const { appName, files } = params;
    const basePath = params.basePath || './apps';

    const appLocation = path.resolve(basePath, appName);
    const filesWritten: string[] = [];
    const filesSkipped: string[] = [];
    const errors: Array<{ path: string; error: string }> = [];
    let totalBytes = 0;

    console.log(`[file.materialize] Starting materialization for ${appName}`);
    console.log(`[file.materialize] App location: ${appLocation}`);
    console.log(`[file.materialize] Files to write: ${files.length}`);

    // Criar diretório base do app
    try {
      if (!fs.existsSync(appLocation)) {
        fs.mkdirSync(appLocation, { recursive: true });
        console.log(`[file.materialize] Created app directory: ${appLocation}`);
      }
    } catch (err) {
      return this.error(`Failed to create app directory: ${err}`);
    }

    // Processar cada arquivo
    for (const file of files) {
      const result = this.writeFile(appLocation, file);

      if (result.success) {
        filesWritten.push(result.fullPath!);
        totalBytes += result.bytes!;
      } else if (result.skipped) {
        filesSkipped.push(file.path);
      } else {
        errors.push({ path: file.path, error: result.error! });
      }
    }

    const output: MaterializeOutput = {
      filesWritten,
      filesSkipped,
      errors,
      totalBytes,
      appLocation,
    };

    console.log(`[file.materialize] Completed: ${filesWritten.length} written, ${filesSkipped.length} skipped, ${errors.length} errors`);

    if (errors.length > 0 && filesWritten.length === 0) {
      return this.error(`All files failed: ${JSON.stringify(errors)}`);
    }

    return this.success(output);
  }

  private writeFile(appLocation: string, file: FilePlan): {
    success: boolean;
    skipped?: boolean;
    fullPath?: string;
    bytes?: number;
    error?: string;
  } {
    const { path: relativePath, content } = file;

    // Validação de segurança: path traversal
    for (const blocked of SECURITY_CONFIG.blockedPatterns) {
      if (relativePath.includes(blocked)) {
        console.warn(`[file.materialize] BLOCKED path traversal attempt: ${relativePath}`);
        return { success: false, error: `Blocked pattern detected: ${blocked}` };
      }
    }

    // Validação: tamanho do arquivo
    const contentBytes = Buffer.byteLength(content, 'utf8');
    if (contentBytes > SECURITY_CONFIG.maxFileSizeBytes) {
      console.warn(`[file.materialize] File too large: ${relativePath} (${contentBytes} bytes)`);
      return { success: false, skipped: true, error: 'File too large' };
    }

    // Validação: extensão permitida
    const ext = path.extname(relativePath).toLowerCase();
    const hasNoExt = !ext || ext === '';
    const isAllowedExt = SECURITY_CONFIG.allowedExtensions.includes(ext);
    const isSpecialFile = ['package.json', 'tsconfig.json', '.gitignore', '.env.example', 'README.md', 'Dockerfile'].some(
      f => relativePath.endsWith(f)
    );

    if (!isAllowedExt && !isSpecialFile && !hasNoExt) {
      console.warn(`[file.materialize] Extension not allowed: ${ext}`);
      return { success: false, skipped: true, error: `Extension not allowed: ${ext}` };
    }

    // Construir caminho seguro
    const fullPath = path.resolve(appLocation, relativePath);

    // Verificar que ainda está dentro do appLocation
    if (!fullPath.startsWith(appLocation)) {
      console.error(`[file.materialize] Path escape detected: ${fullPath}`);
      return { success: false, error: 'Path escape detected' };
    }

    // Criar diretório pai se necessário
    const dir = path.dirname(fullPath);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      return { success: false, error: `Failed to create directory: ${err}` };
    }

    // Escrever arquivo
    try {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`[file.materialize] Written: ${relativePath} (${contentBytes} bytes)`);
      return { success: true, fullPath, bytes: contentBytes };
    } catch (err) {
      return { success: false, error: `Failed to write: ${err}` };
    }
  }
}

// Factory
export function createFileMaterializeSkill(): FileMaterializeSkill {
  return new FileMaterializeSkill();
}
