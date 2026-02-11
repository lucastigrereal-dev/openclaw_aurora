/**
 * Skill: akasha-hub
 * Bridge entre OpenClaw Aurora (TypeScript) e Akasha Hub (Python)
 * 4 sub-skills: scan, extract, query, oracle + lock
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { Skill, SkillInput, SkillOutput } from './skill-base';

const AKASHA_BASE = path.join(__dirname, '..', 'akasha-hub', 'scripts');

/**
 * Helper: executa script Python isolando apenas variáveis AKASHA_*
 */
function runPython(scriptPath: string, args: string[] = [], timeoutMs: number = 120000): Promise<SkillOutput> {
  return new Promise((resolve) => {
    // Isolar env: apenas AKASHA_*, OPENAI_API_KEY, GOOGLE_DRIVE_CREDENTIALS, PATH
    const safeEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (
        key.startsWith('AKASHA_') ||
        key === 'OPENAI_API_KEY' ||
        key === 'GOOGLE_DRIVE_CREDENTIALS' ||
        key === 'PATH' ||
        key === 'PYTHONPATH' ||
        key === 'HOME' ||
        key === 'USERPROFILE' ||
        key === 'HOMEDRIVE' ||
        key === 'HOMEPATH' ||
        key === 'SystemRoot' ||
        key === 'TEMP' ||
        key === 'TMP'
      ) {
        safeEnv[key] = value || '';
      }
    }

    const proc = spawn('python3', [scriptPath, ...args], {
      env: safeEnv,
      cwd: path.dirname(scriptPath),
      timeout: timeoutMs,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          data: { output: stdout.trim(), stderr: stderr.trim() },
        });
      } else {
        resolve({
          success: false,
          error: `Process exited with code ${code}: ${stderr.trim() || stdout.trim()}`,
          data: { stdout: stdout.trim(), stderr: stderr.trim(), code },
        });
      }
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        error: `Failed to spawn: ${err.message}`,
      });
    });
  });
}

// ============================================
// SKILL: akasha.scan
// ============================================
export class AkashaScanSkill extends Skill {
  constructor() {
    super({
      name: 'akasha.scan',
      description: 'Escaneia Google Drive e cataloga arquivos no Supabase',
      version: '1.0.0',
      category: 'AKASHA',
      tags: ['akasha', 'scanner', 'drive', 'catalog'],
    }, {
      timeout: 300000, // 5 min
      retries: 1,
    });
  }

  validate(input: SkillInput): boolean {
    return true; // scan always works
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const args: string[] = [];

    if (input.folderId) args.push('--folder-id', input.folderId);
    if (input.batchSize) args.push('--batch-size', String(input.batchSize));
    if (input.dryRun) args.push('--dry-run');
    if (input.stats) args.push('--stats');
    if (input.noRecursive) args.push('--no-recursive');

    const scriptPath = path.join(AKASHA_BASE, 'scanner', 'scan_drive.py');
    return runPython(scriptPath, args, this.config.timeout);
  }
}

// ============================================
// SKILL: akasha.extract
// ============================================
export class AkashaExtractSkill extends Skill {
  constructor() {
    super({
      name: 'akasha.extract',
      description: 'Extrai texto e classifica conteudo de arquivos catalogados',
      version: '1.0.0',
      category: 'AKASHA',
      tags: ['akasha', 'extract', 'pdf', 'whisper', 'classify'],
    }, {
      timeout: 600000, // 10 min (video extraction can be slow)
      retries: 1,
    });
  }

  validate(input: SkillInput): boolean {
    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const args: string[] = [];

    if (input.limit) args.push('--limit', String(input.limit));
    if (input.fileType) args.push('--file-type', input.fileType);
    if (input.speedMode) args.push('--speed-mode', input.speedMode);
    if (input.dryRun) args.push('--dry-run');

    const scriptPath = path.join(AKASHA_BASE, 'extract', 'extract.py');
    return runPython(scriptPath, args, this.config.timeout);
  }
}

// ============================================
// SKILL: akasha.query
// ============================================
export class AkashaQuerySkill extends Skill {
  constructor() {
    super({
      name: 'akasha.query',
      description: 'Busca hibrida (keyword + semantica) na base de conhecimento',
      version: '1.0.0',
      category: 'AKASHA',
      tags: ['akasha', 'query', 'search', 'semantic'],
    }, {
      timeout: 60000,
      retries: 2,
    });
  }

  validate(input: SkillInput): boolean {
    return !!(input.query || input.prompt);
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const query = input.query || input.prompt;
    const args: string[] = [query];

    if (input.mode) args.push('--mode', input.mode);
    if (input.limit) args.push('--limit', String(input.limit));
    if (input.verbose) args.push('--verbose');
    if (input.json) args.push('--json');

    const scriptPath = path.join(AKASHA_BASE, 'query', 'query.py');
    return runPython(scriptPath, args, this.config.timeout);
  }
}

// ============================================
// SKILL: akasha.oracle
// ============================================
export class AkashaOracleSkill extends Skill {
  constructor() {
    super({
      name: 'akasha.oracle',
      description: 'RAG Q&A — responde perguntas com base nos documentos (anti-alucinacao)',
      version: '1.0.0',
      category: 'AKASHA',
      tags: ['akasha', 'oracle', 'rag', 'qa'],
    }, {
      timeout: 120000,
      retries: 2,
    });
  }

  validate(input: SkillInput): boolean {
    return !!(input.question || input.prompt);
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const question = input.question || input.prompt;
    const args: string[] = [question];

    if (input.complexity) args.push('--complexity', input.complexity);
    if (input.limit) args.push('--limit', String(input.limit));
    if (input.mode) args.push('--mode', input.mode);
    if (input.json) args.push('--json');

    const scriptPath = path.join(AKASHA_BASE, 'query', 'oracle.py');
    return runPython(scriptPath, args, this.config.timeout);
  }
}

// ============================================
// SKILL: akasha.lock
// ============================================
export class AkashaLockSkill extends Skill {
  constructor() {
    super({
      name: 'akasha.lock',
      description: 'Progress Lock Anti-TDAH — forca foco em uma tarefa por vez',
      version: '1.0.0',
      category: 'AKASHA',
      tags: ['akasha', 'lock', 'focus', 'productivity'],
    }, {
      timeout: 30000,
      retries: 1,
    });
  }

  validate(input: SkillInput): boolean {
    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const command = input.command || 'status';
    const args: string[] = [command];

    if (input.task) args.push('--task', input.task);
    if (input.desc) args.push('--desc', input.desc);
    if (input.minutes) args.push('--minutes', String(input.minutes));
    if (input.notes) args.push('--notes', input.notes);
    if (input.reason) args.push('--reason', input.reason);

    const scriptPath = path.join(AKASHA_BASE, 'progress-lock', 'lock_manager.py');
    return runPython(scriptPath, args, this.config.timeout);
  }
}

// ============================================
// EXPORTS: All Akasha skills as array
// ============================================
export const akashaSkills = [
  new AkashaScanSkill(),
  new AkashaExtractSkill(),
  new AkashaQuerySkill(),
  new AkashaOracleSkill(),
  new AkashaLockSkill(),
];
