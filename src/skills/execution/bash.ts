/**
 * Skill: exec.bash
 * Executa comandos bash com segurança
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Skill, SkillInput, SkillOutput } from '../base';

const execAsync = promisify(exec);

export class ExecBashSkill extends Skill {
  // Comandos bloqueados por segurança
  private blockedCommands = [
    'rm -rf /',
    'mkfs',
    'dd if=',
    ':(){ :|:& };:',
    'chmod -R 777 /',
    'mv /* ',
  ];

  constructor() {
    super(
      {
        name: 'exec.bash',
        description: 'Executa comandos bash com segurança',
        version: '1.0.0',
        category: 'EXEC',
        tags: ['bash', 'shell', 'command', 'terminal'],
      },
      {
        timeout: 60000,
        retries: 1,
        requiresApproval: true, // Comandos perigosos requerem aprovação
      }
    );
  }

  validate(input: SkillInput): boolean {
    if (!input.command || typeof input.command !== 'string') {
      return false;
    }

    // Verifica comandos bloqueados
    const cmd = input.command.toLowerCase();
    for (const blocked of this.blockedCommands) {
      if (cmd.includes(blocked.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { command, cwd, timeout } = input;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || process.cwd(),
        timeout: timeout || this.config.timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      return {
        success: true,
        data: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          command,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        data: {
          stdout: error.stdout?.trim() || '',
          stderr: error.stderr?.trim() || '',
          code: error.code,
        },
      };
    }
  }
}
