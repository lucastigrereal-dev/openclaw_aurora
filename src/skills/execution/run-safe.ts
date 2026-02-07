/**
 * exec.run_safe - P0 Core Skill
 * Executa comandos de forma segura com lista branca
 *
 * Segurança:
 * - Lista branca de comandos permitidos
 * - Timeout de 5 minutos por comando
 * - Captura stdout + stderr
 * - Bloqueia comandos destrutivos
 */

import { Skill, SkillInput, SkillOutput } from '../base';
import { spawn, SpawnOptions } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TIPOS
// ============================================================================

export interface CommandPlan {
  cmd: string;       // Comando a executar
  args?: string[];   // Argumentos
  cwd?: string;      // Diretório de trabalho (relativo ao appLocation)
  description?: string;
}

export interface RunSafeInput {
  appLocation: string;  // Caminho absoluto do app
  commands: CommandPlan[];
  logDir?: string;      // Onde salvar logs (default: ./runs/{executionId}/logs)
  executionId?: string;
}

export interface CommandResult {
  cmd: string;
  args: string[];
  status: 'success' | 'failed' | 'timeout' | 'blocked';
  exitCode?: number;
  stdout: string;
  stderr: string;
  duration: number;
  logFile?: string;
}

export interface RunSafeOutput {
  commandsRun: CommandResult[];
  totalCommands: number;
  successCount: number;
  failedCount: number;
  blockedCount: number;
}

// ============================================================================
// CONFIGURAÇÃO DE SEGURANÇA
// ============================================================================

const SECURITY_CONFIG = {
  timeoutMs: 5 * 60 * 1000, // 5 minutos
  maxCommands: 10,

  // Lista branca de comandos permitidos
  allowedCommands: [
    'npm',
    'npx',
    'pnpm',
    'yarn',
    'node',
    'tsc',
  ],

  // Subcomandos permitidos para npm/pnpm/yarn
  allowedNpmSubcommands: [
    'install',
    'ci',
    'run',
    'test',
    'build',
    'start',
    'lint',
    'format',
    'typecheck',
  ],

  // Args bloqueados (mesmo em comandos permitidos)
  blockedArgs: [
    'rm', 'del', 'remove', 'uninstall',
    '--force', '-f',
    '--global', '-g',
    'publish',
    'link',
    'exec',
    'eval',
    '--eval',
    '-e',
  ],

  // Patterns completamente bloqueados
  blockedPatterns: [
    'rm ', 'rm -',
    'del ', 'del /',
    'format ',
    'mkfs',
    'dd if=',
    '> /dev/',
    'curl | sh',
    'wget | sh',
    'chmod 777',
    'sudo',
    'su ',
  ],
};

// ============================================================================
// SKILL
// ============================================================================

export class ExecRunSafeSkill extends Skill {
  constructor() {
    super(
      {
        name: 'exec.run_safe',
        description: 'Executa comandos de forma segura com lista branca',
        version: '1.0.0',
        category: 'EXEC',
        author: 'OpenClaw',
        tags: ['p0', 'exec', 'shell', 'safe'],
      },
      {
        timeout: SECURITY_CONFIG.timeoutMs * 2, // Buffer extra
        retries: 0,
        requiresApproval: false,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const params = input.params as RunSafeInput;

    if (!params?.appLocation) {
      console.error('[exec.run_safe] Missing appLocation');
      return false;
    }

    if (!params?.commands || !Array.isArray(params.commands)) {
      console.error('[exec.run_safe] Missing or invalid commands array');
      return false;
    }

    if (params.commands.length > SECURITY_CONFIG.maxCommands) {
      console.error(`[exec.run_safe] Too many commands: ${params.commands.length} > ${SECURITY_CONFIG.maxCommands}`);
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const params = input.params as RunSafeInput;
    const { appLocation, commands } = params;
    const executionId = params.executionId || `run-${Date.now()}`;
    const logDir = params.logDir || `./runs/${executionId}/logs`;

    console.log(`[exec.run_safe] Starting execution: ${executionId}`);
    console.log(`[exec.run_safe] App location: ${appLocation}`);
    console.log(`[exec.run_safe] Commands to run: ${commands.length}`);

    // Criar diretório de logs
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (err) {
      console.warn(`[exec.run_safe] Could not create log dir: ${err}`);
    }

    const commandsRun: CommandResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    let blockedCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const result = await this.runCommand(command, appLocation, logDir, i);

      commandsRun.push(result);

      if (result.status === 'success') {
        successCount++;
      } else if (result.status === 'blocked') {
        blockedCount++;
      } else {
        failedCount++;
      }

      // Se falhou, não continuar (fail fast)
      if (result.status === 'failed' || result.status === 'timeout') {
        console.warn(`[exec.run_safe] Command failed, stopping execution`);
        break;
      }
    }

    const output: RunSafeOutput = {
      commandsRun,
      totalCommands: commands.length,
      successCount,
      failedCount,
      blockedCount,
    };

    console.log(`[exec.run_safe] Completed: ${successCount} success, ${failedCount} failed, ${blockedCount} blocked`);

    if (failedCount > 0 || blockedCount === commands.length) {
      return this.error(`Execution failed: ${failedCount} failed, ${blockedCount} blocked`);
    }

    return this.success(output);
  }

  private async runCommand(
    command: CommandPlan,
    appLocation: string,
    logDir: string,
    index: number
  ): Promise<CommandResult> {
    const { cmd, args = [], cwd, description } = command;
    const startTime = Date.now();

    // Validação de segurança
    const securityCheck = this.checkSecurity(cmd, args);
    if (!securityCheck.allowed) {
      console.warn(`[exec.run_safe] BLOCKED: ${cmd} ${args.join(' ')} - ${securityCheck.reason}`);
      return {
        cmd,
        args,
        status: 'blocked',
        stdout: '',
        stderr: `BLOCKED: ${securityCheck.reason}`,
        duration: 0,
      };
    }

    // Resolver diretório de trabalho
    const workDir = cwd ? path.resolve(appLocation, cwd) : appLocation;

    // Verificar se diretório existe
    if (!fs.existsSync(workDir)) {
      return {
        cmd,
        args,
        status: 'failed',
        exitCode: 1,
        stdout: '',
        stderr: `Working directory does not exist: ${workDir}`,
        duration: 0,
      };
    }

    console.log(`[exec.run_safe] Running: ${cmd} ${args.join(' ')}`);
    console.log(`[exec.run_safe] In: ${workDir}`);

    // Executar comando
    return new Promise<CommandResult>((resolve) => {
      const logFile = path.join(logDir, `step-${index}-${cmd}.log`);
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const spawnOptions: SpawnOptions = {
        cwd: workDir,
        shell: true,
        env: { ...process.env, CI: 'true' },
      };

      const child = spawn(cmd, args, spawnOptions);

      // Timeout
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 5000);
      }, SECURITY_CONFIG.timeoutMs);

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        process.stdout.write(text);
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        process.stderr.write(text);
      });

      child.on('close', (exitCode) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;

        // Salvar log
        try {
          const logContent = [
            `Command: ${cmd} ${args.join(' ')}`,
            `Exit Code: ${exitCode}`,
            `Duration: ${duration}ms`,
            `Timed Out: ${timedOut}`,
            '',
            '=== STDOUT ===',
            stdout,
            '',
            '=== STDERR ===',
            stderr,
          ].join('\n');
          fs.writeFileSync(logFile, logContent, 'utf8');
        } catch (err) {
          console.warn(`[exec.run_safe] Could not write log: ${err}`);
        }

        if (timedOut) {
          resolve({
            cmd,
            args,
            status: 'timeout',
            exitCode: exitCode ?? 124,
            stdout,
            stderr,
            duration,
            logFile,
          });
        } else if (exitCode === 0) {
          resolve({
            cmd,
            args,
            status: 'success',
            exitCode: 0,
            stdout,
            stderr,
            duration,
            logFile,
          });
        } else {
          resolve({
            cmd,
            args,
            status: 'failed',
            exitCode: exitCode ?? 1,
            stdout,
            stderr,
            duration,
            logFile,
          });
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        resolve({
          cmd,
          args,
          status: 'failed',
          exitCode: 1,
          stdout,
          stderr: `Spawn error: ${err.message}`,
          duration: Date.now() - startTime,
        });
      });
    });
  }

  private checkSecurity(cmd: string, args: string[]): { allowed: boolean; reason?: string } {
    const fullCmd = `${cmd} ${args.join(' ')}`.toLowerCase();

    // Verificar patterns bloqueados
    for (const pattern of SECURITY_CONFIG.blockedPatterns) {
      if (fullCmd.includes(pattern.toLowerCase())) {
        return { allowed: false, reason: `Blocked pattern: ${pattern}` };
      }
    }

    // Verificar comando base
    const baseCmd = cmd.toLowerCase();
    if (!SECURITY_CONFIG.allowedCommands.includes(baseCmd)) {
      return { allowed: false, reason: `Command not in whitelist: ${cmd}` };
    }

    // Para npm/pnpm/yarn, verificar subcomando
    if (['npm', 'pnpm', 'yarn'].includes(baseCmd)) {
      const subCmd = args[0]?.toLowerCase();
      if (subCmd && !SECURITY_CONFIG.allowedNpmSubcommands.includes(subCmd)) {
        return { allowed: false, reason: `npm subcommand not allowed: ${subCmd}` };
      }
    }

    // Verificar args bloqueados
    for (const arg of args) {
      const argLower = arg.toLowerCase();
      for (const blocked of SECURITY_CONFIG.blockedArgs) {
        if (argLower === blocked || argLower.startsWith(blocked)) {
          return { allowed: false, reason: `Blocked argument: ${arg}` };
        }
      }
    }

    return { allowed: true };
  }
}

// Factory
export function createExecRunSafeSkill(): ExecRunSafeSkill {
  return new ExecRunSafeSkill();
}
