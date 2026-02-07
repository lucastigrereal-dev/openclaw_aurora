/**
 * artifact.collect - P0 Core Skill
 * Coleta artefatos de execução e gera relatório
 *
 * Gera:
 * - report.json (estruturado)
 * - report.md (legível)
 * - Coleta logs de ./runs/{executionId}/logs/
 */

import { Skill, SkillInput, SkillOutput } from '../base';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TIPOS
// ============================================================================

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

export interface WorkflowStepSummary {
  persona: string;
  subskill: string;
  status: string;
  duration?: number;
  error?: string;
}

export interface CollectInput {
  executionId: string;
  appName: string;
  appLocation: string;
  workflow: string;
  filesWritten: string[];
  commandsRun: CommandResult[];
  workflowSteps: WorkflowStepSummary[];
  errors: Array<{ path?: string; error: string }>;
  startTime: number;
  endTime?: number;
}

export interface CollectOutput {
  runFolder: string;
  reportJson: string;
  reportMd: string;
  logsCollected: string[];
  summary: {
    filesCreated: number;
    commandsRun: number;
    commandsSuccess: number;
    commandsFailed: number;
    totalDuration: number;
    status: 'success' | 'partial' | 'failed';
  };
}

// ============================================================================
// SKILL
// ============================================================================

export class ArtifactCollectSkill extends Skill {
  constructor() {
    super(
      {
        name: 'artifact.collect',
        description: 'Coleta artefatos de execução e gera relatório',
        version: '1.0.0',
        category: 'UTIL',
        author: 'OpenClaw',
        tags: ['p0', 'artifact', 'report', 'logs'],
      },
      {
        timeout: 30000,
        retries: 0,
        requiresApproval: false,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const params = input.params as CollectInput;

    if (!params?.executionId) {
      console.error('[artifact.collect] Missing executionId');
      return false;
    }

    if (!params?.appName) {
      console.error('[artifact.collect] Missing appName');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const params = input.params as CollectInput;
    const {
      executionId,
      appName,
      appLocation,
      workflow,
      filesWritten = [],
      commandsRun = [],
      workflowSteps = [],
      errors = [],
      startTime,
    } = params;

    const endTime = params.endTime || Date.now();
    const runFolder = `./runs/${executionId}`;

    console.log(`[artifact.collect] Collecting artifacts for ${executionId}`);

    // Criar pasta de execução
    try {
      if (!fs.existsSync(runFolder)) {
        fs.mkdirSync(runFolder, { recursive: true });
      }
    } catch (err) {
      return this.error(`Failed to create run folder: ${err}`);
    }

    // Calcular métricas
    const commandsSuccess = commandsRun.filter(c => c.status === 'success').length;
    const commandsFailed = commandsRun.filter(c => c.status !== 'success').length;
    const totalDuration = endTime - startTime;

    let status: 'success' | 'partial' | 'failed' = 'success';
    if (errors.length > 0 || commandsFailed > 0) {
      status = commandsSuccess > 0 ? 'partial' : 'failed';
    }

    // Construir relatório
    const report = {
      meta: {
        executionId,
        appName,
        workflow,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        totalDuration,
        generatedAt: new Date().toISOString(),
      },
      appLocation,
      filesWritten,
      commandsRun: commandsRun.map(c => ({
        cmd: c.cmd,
        args: c.args,
        status: c.status,
        exitCode: c.exitCode,
        duration: c.duration,
        logFile: c.logFile,
        stdoutLength: c.stdout?.length || 0,
        stderrLength: c.stderr?.length || 0,
      })),
      workflowSteps,
      errors,
      summary: {
        filesCreated: filesWritten.length,
        commandsRun: commandsRun.length,
        commandsSuccess,
        commandsFailed,
        totalDuration,
        status,
      },
    };

    // Salvar report.json
    const reportJsonPath = path.join(runFolder, 'report.json');
    try {
      fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), 'utf8');
      console.log(`[artifact.collect] Saved: ${reportJsonPath}`);
    } catch (err) {
      console.error(`[artifact.collect] Failed to write report.json: ${err}`);
    }

    // Gerar report.md
    const reportMd = this.generateMarkdownReport(report);
    const reportMdPath = path.join(runFolder, 'report.md');
    try {
      fs.writeFileSync(reportMdPath, reportMd, 'utf8');
      console.log(`[artifact.collect] Saved: ${reportMdPath}`);
    } catch (err) {
      console.error(`[artifact.collect] Failed to write report.md: ${err}`);
    }

    // Coletar logs existentes
    const logsDir = path.join(runFolder, 'logs');
    const logsCollected: string[] = [];
    if (fs.existsSync(logsDir)) {
      const logFiles = fs.readdirSync(logsDir);
      logsCollected.push(...logFiles.map(f => path.join(logsDir, f)));
    }

    const output: CollectOutput = {
      runFolder,
      reportJson: reportJsonPath,
      reportMd: reportMdPath,
      logsCollected,
      summary: report.summary,
    };

    console.log(`[artifact.collect] Collection complete: ${status}`);

    return this.success(output);
  }

  private generateMarkdownReport(report: any): string {
    const { meta, appLocation, filesWritten, commandsRun, workflowSteps, errors, summary } = report;

    const statusEmoji = summary.status === 'success' ? '✅' : summary.status === 'partial' ? '⚠️' : '❌';

    let md = `# ${statusEmoji} Execution Report: ${meta.appName}\n\n`;
    md += `**Execution ID:** \`${meta.executionId}\`\n`;
    md += `**Workflow:** \`${meta.workflow}\`\n`;
    md += `**Status:** ${summary.status.toUpperCase()}\n`;
    md += `**Duration:** ${(summary.totalDuration / 1000).toFixed(2)}s\n`;
    md += `**Generated:** ${meta.generatedAt}\n\n`;

    // Summary table
    md += `## Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Files Created | ${summary.filesCreated} |\n`;
    md += `| Commands Run | ${summary.commandsRun} |\n`;
    md += `| Commands Success | ${summary.commandsSuccess} |\n`;
    md += `| Commands Failed | ${summary.commandsFailed} |\n`;
    md += `| Total Duration | ${(summary.totalDuration / 1000).toFixed(2)}s |\n\n`;

    // App location
    md += `## App Location\n\n`;
    md += `\`\`\`\n${appLocation}\n\`\`\`\n\n`;

    // Files created
    if (filesWritten.length > 0) {
      md += `## Files Created (${filesWritten.length})\n\n`;
      md += `\`\`\`\n`;
      filesWritten.forEach((f: string) => {
        md += `${f}\n`;
      });
      md += `\`\`\`\n\n`;
    }

    // Commands run
    if (commandsRun.length > 0) {
      md += `## Commands Run (${commandsRun.length})\n\n`;
      md += `| Command | Status | Exit Code | Duration |\n`;
      md += `|---------|--------|-----------|----------|\n`;
      commandsRun.forEach((c: any) => {
        const cmdStr = `${c.cmd} ${c.args.join(' ')}`.substring(0, 40);
        const statusIcon = c.status === 'success' ? '✅' : c.status === 'blocked' ? '🚫' : '❌';
        md += `| \`${cmdStr}\` | ${statusIcon} ${c.status} | ${c.exitCode ?? '-'} | ${(c.duration / 1000).toFixed(2)}s |\n`;
      });
      md += `\n`;
    }

    // Workflow steps
    if (workflowSteps.length > 0) {
      md += `## Workflow Steps\n\n`;
      workflowSteps.forEach((step: any, i: number) => {
        const icon = step.status === 'success' ? '✅' : step.status === 'in-progress' ? '🔄' : '❌';
        md += `${i + 1}. ${icon} **${step.persona}.${step.subskill}** - ${step.status}`;
        if (step.duration) {
          md += ` (${(step.duration / 1000).toFixed(2)}s)`;
        }
        if (step.error) {
          md += `\n   - Error: ${step.error}`;
        }
        md += `\n`;
      });
      md += `\n`;
    }

    // Errors
    if (errors.length > 0) {
      md += `## Errors (${errors.length})\n\n`;
      errors.forEach((e: any, i: number) => {
        md += `${i + 1}. `;
        if (e.path) {
          md += `\`${e.path}\`: `;
        }
        md += `${e.error}\n`;
      });
      md += `\n`;
    }

    // Next steps
    md += `## How to Test Locally\n\n`;
    md += `\`\`\`bash\n`;
    md += `cd ${appLocation}\n`;
    md += `npm install\n`;
    md += `npm run build  # or: npx tsc --noEmit\n`;
    md += `npm test\n`;
    md += `\`\`\`\n\n`;

    md += `---\n`;
    md += `*Generated by OpenClaw Aurora P0 App Factory*\n`;

    return md;
  }
}

// Factory
export function createArtifactCollectSkill(): ArtifactCollectSkill {
  return new ArtifactCollectSkill();
}
