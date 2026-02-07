/**
 * test.run - P1 Skill
 * Executa build/test via exec.run_safe e retorna resultados estruturados
 *
 * Usa internamente:
 * - exec.run_safe para execução segura
 * - analyze.error para parsing de erros
 */

import { Skill, SkillInput, SkillOutput } from '../base';
import { ExecRunSafeSkill, CommandPlan, CommandResult } from '../execution/run-safe';
import { AnalyzeErrorSkill, AnalyzeErrorOutput } from '../analyze/error';

// ============================================================================
// TIPOS
// ============================================================================

export interface TestRunInput {
  appLocation: string;
  command: 'build' | 'test' | 'typecheck' | 'lint';
  executionId?: string;
  logDir?: string;
}

export interface TestRunOutput {
  status: 'passed' | 'failed' | 'error';
  command: string;
  args: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  logFile?: string;
  // Se falhou, inclui análise de erro
  errorAnalysis?: AnalyzeErrorOutput;
}

// ============================================================================
// MAPEAMENTO DE COMANDOS
// ============================================================================

const COMMAND_MAP: Record<string, CommandPlan> = {
  build: { cmd: 'npm', args: ['run', 'build'], description: 'Build project' },
  test: { cmd: 'npm', args: ['test'], description: 'Run tests' },
  typecheck: { cmd: 'npx', args: ['tsc', '--noEmit'], description: 'Type check' },
  lint: { cmd: 'npm', args: ['run', 'lint'], description: 'Lint code' },
};

// ============================================================================
// SKILL
// ============================================================================

export class TestRunSkill extends Skill {
  private execRunSafe = new ExecRunSafeSkill();
  private analyzeError = new AnalyzeErrorSkill();

  constructor() {
    super(
      {
        name: 'test.run',
        description: 'Executa build/test e retorna resultados estruturados',
        version: '1.0.0',
        category: 'EXEC',
        author: 'OpenClaw',
        tags: ['p1', 'test', 'build', 'run', 'qa'],
      },
      {
        timeout: 300000, // 5 min
        retries: 0,
        requiresApproval: false,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const params = input.params as TestRunInput;
    return !!(
      params?.appLocation &&
      params?.command &&
      Object.keys(COMMAND_MAP).includes(params.command)
    );
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const params = input.params as TestRunInput;
    const { appLocation, command, executionId, logDir } = params;

    console.log(`[test.run] Running ${command} on ${appLocation}`);

    const commandPlan = COMMAND_MAP[command];
    if (!commandPlan) {
      return this.error(`Unknown command: ${command}`);
    }

    // Executar via exec.run_safe
    const execResult = await this.execRunSafe.run({
      params: {
        appLocation,
        commands: [commandPlan],
        executionId: executionId || `test-${Date.now()}`,
        logDir,
      },
    });

    // Extrair resultado do comando
    const cmdResult: CommandResult | undefined = execResult.data?.commandsRun?.[0];

    if (!cmdResult) {
      return this.error('No command result returned from exec.run_safe');
    }

    const output: TestRunOutput = {
      status: cmdResult.status === 'success' ? 'passed' : 'failed',
      command: cmdResult.cmd,
      args: cmdResult.args,
      exitCode: cmdResult.exitCode ?? 1,
      stdout: cmdResult.stdout,
      stderr: cmdResult.stderr,
      duration: cmdResult.duration,
      logFile: cmdResult.logFile,
    };

    // Se falhou, analisar erro
    if (output.status === 'failed') {
      console.log(`[test.run] Command failed with exit code ${output.exitCode}`);

      const analysisResult = await this.analyzeError.run({
        params: {
          appLocation,
          errorType: command === 'test' ? 'test' : 'build',
          stdout: cmdResult.stdout,
          stderr: cmdResult.stderr,
          exitCode: cmdResult.exitCode ?? 1,
        },
      });

      if (analysisResult.success) {
        output.errorAnalysis = analysisResult.data as AnalyzeErrorOutput;
        console.log(`[test.run] Error analysis: ${output.errorAnalysis.totalErrors} errors found`);
      }

      return this.error(`${command} failed with exit code ${output.exitCode}`, { data: output });
    }

    console.log(`[test.run] ${command} passed in ${(output.duration / 1000).toFixed(2)}s`);
    return this.success(output);
  }
}

// Factory
export function createTestRunSkill(): TestRunSkill {
  return new TestRunSkill();
}
