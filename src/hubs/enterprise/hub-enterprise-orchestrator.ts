/**
 * Hub Enterprise - Orchestrator
 * Coordena todas as 9 personas em workflows estruturados
 * Implement 6 workflows: full, mvp-only, code-only, test-only, incident-response, feature-add
 */

import { Skill, SkillInput, SkillOutput, getSkillRegistryV2 } from '../../skills/base';
import { OrchestratorOutput, WorkflowStep, CommandResult } from './hub-enterprise-types';
import { createLogger } from './shared/hub-enterprise-logger';
import { getConfig } from './shared/hub-enterprise-config';
import { FileMaterializeSkill, FilePlan } from '../../skills/file/materialize';
import { ExecRunSafeSkill, CommandPlan } from '../../skills/execution/run-safe';
import { ArtifactCollectSkill } from '../../skills/artifact/collect';

export class HubEnterpriseOrchestrator extends Skill {
  private registry = getSkillRegistryV2();
  private logger = createLogger('orchestrator');
  private hubConfig = getConfig();

  // P0 Skills
  private fileMaterialize = new FileMaterializeSkill();
  private execRunSafe = new ExecRunSafeSkill();
  private artifactCollect = new ArtifactCollectSkill();

  constructor() {
    super(
      {
        name: 'hub-enterprise-orchestrator',
        description:
          'Orchestrates all 9 personas to create enterprise applications',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Hub Enterprise',
        tags: ['hub-enterprise', 'orchestration', 'workflow', 'automation'],
      },
      {
        timeout: 600000, // 10 minutes
        retries: 1,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const { workflow, userIntent, appName } = input.params || {};

    if (!workflow) {
      this.logger.error('Missing workflow parameter');
      return false;
    }

    const validWorkflows = [
      'full',
      'mvp-only',
      'code-only',
      'test-only',
      'incident-response',
      'feature-add',
    ];

    if (!validWorkflows.includes(workflow)) {
      this.logger.error('Invalid workflow', { workflow, validWorkflows });
      return false;
    }

    // Most workflows need userIntent and appName
    if (
      ['full', 'mvp-only', 'code-only', 'feature-add'].includes(workflow) &&
      (!userIntent || !appName)
    ) {
      this.logger.error('Missing userIntent or appName', {
        workflow,
        userIntent,
        appName,
      });
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { workflow, userIntent, appName, ...params } = input.params || {};

    this.logger.info('Starting orchestrator workflow', {
      workflow,
      appName,
      userIntent: userIntent ? userIntent.substring(0, 50) : 'N/A',
    });

    const startTime = Date.now();
    const steps: WorkflowStep[] = [];

    // P0 extended fields
    let filesWritten: string[] = [];
    let commandsRun: CommandResult[] = [];
    let errors: Array<{ path?: string; error: string }> = [];
    let runFolder: string | undefined;

    try {
      switch (workflow) {
        case 'full':
          await this.workflowFull(appName, userIntent, params, steps);
          break;
        case 'mvp-only':
          await this.workflowMVPOnly(appName, userIntent, params, steps);
          break;
        case 'code-only':
          const codeOnlyResult = await this.workflowCodeOnly(appName, params, steps);
          filesWritten = codeOnlyResult.filesWritten;
          commandsRun = codeOnlyResult.commandsRun;
          errors = codeOnlyResult.errors;
          runFolder = codeOnlyResult.runFolder;
          break;
        case 'test-only':
          await this.workflowTestOnly(appName, params, steps);
          break;
        case 'incident-response':
          await this.workflowIncidentResponse(appName, params, steps);
          break;
        case 'feature-add':
          const featureAddResult = await this.workflowFeatureAdd(appName, userIntent, params, steps);
          filesWritten = featureAddResult.filesWritten;
          commandsRun = featureAddResult.commandsRun;
          errors = featureAddResult.errors;
          runFolder = featureAddResult.runFolder;
          break;
      }

      const totalDuration = Date.now() - startTime;
      const successfulSteps = steps.filter((s) => s.status === 'success').length;
      const failedSteps = steps.filter((s) => s.status === 'failed').length;

      const output: OrchestratorOutput = {
        appName: appName || 'N/A',
        workflow,
        workflowSteps: steps,
        summary: {
          totalDuration,
          successfulSteps,
          failedSteps,
          startedAt: startTime,
          completedAt: Date.now(),
        },
        appLocation: failedSteps === 0 ? `apps/${appName}` : undefined,
        nextActions:
          failedSteps === 0
            ? [
                'Run: npm install',
                'Configure environment variables',
                'Run: npm test',
                'Deploy to production',
              ]
            : ['Review failures above', 'Fix issues and retry'],
        // P0 extended fields
        filesWritten: filesWritten.length > 0 ? filesWritten : undefined,
        commandsRun: commandsRun.length > 0 ? commandsRun : undefined,
        errors: errors.length > 0 ? errors : undefined,
        runFolder,
      };

      this.logger.info('Workflow completed', {
        workflow,
        duration: totalDuration,
        successfulSteps,
        failedSteps,
        filesWritten: filesWritten.length,
        commandsRun: commandsRun.length,
      });

      return this.success(output);
    } catch (error) {
      this.logger.error('Orchestrator error', { error, workflow });
      return this.error(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * WORKFLOW 1: FULL - Complete pipeline
   * Produto → Arquitetura → Engenharia → QA → Security → Ops
   */
  private async workflowFull(
    appName: string,
    userIntent: string,
    params: any,
    steps: WorkflowStep[]
  ): Promise<void> {
    this.logger.info('Executing FULL workflow');

    // Step 1: Produto persona - MVP Definition
    await this.executeStep(
      steps,
      'produto',
      'mvp_definition',
      'hub-enterprise-produto',
      {
        appName,
        userIntent,
        constraints: params.constraints,
      }
    );

    if (steps[steps.length - 1].status === 'failed') {
      this.logger.warn('MVP Definition failed, stopping workflow');
      return;
    }

    // Step 2: Arquitetura persona - Architecture Design
    const produtoResult = steps[steps.length - 1].result;
    await this.executeStep(
      steps,
      'arquitetura',
      'design_architecture',
      'hub-enterprise-arquitetura',
      {
        appName,
        mvpScope: produtoResult?.mvp?.scope,
        features: produtoResult?.mvp?.features,
      }
    );

    // Step 3: Engenharia persona - Code Generation
    const arquiteturaResult = steps[steps.length - 1].result;
    await this.executeStep(
      steps,
      'engenharia',
      'scaffold_app',
      'hub-enterprise-engenharia',
      {
        appName,
        architecture: arquiteturaResult?.architecture,
        techStack: arquiteturaResult?.techStack,
      }
    );

    // Step 4: QA persona - Smoke Tests
    await this.executeStep(
      steps,
      'qa',
      'smoke_tests',
      'hub-enterprise-qa',
      {
        appName,
        appLocation: `apps/${appName}`,
      }
    );

    // Step 5: Security persona - Security Audit
    await this.executeStep(
      steps,
      'security',
      'security_audit',
      'hub-enterprise-security',
      {
        appName,
        scope: 'quick',
      }
    );

    // Step 6: Ops persona - Deployment
    await this.executeStep(
      steps,
      'ops',
      'deploy_production',
      'hub-enterprise-ops',
      {
        appName,
        environment: 'production',
        strategy: 'blue-green',
      }
    );
  }

  /**
   * WORKFLOW 2: MVP-ONLY
   * Apenas: Produto → Output MVP definition
   */
  private async workflowMVPOnly(
    appName: string,
    userIntent: string,
    params: any,
    steps: WorkflowStep[]
  ): Promise<void> {
    this.logger.info('Executing MVP-ONLY workflow');

    await this.executeStep(
      steps,
      'produto',
      'mvp_definition',
      'hub-enterprise-produto',
      {
        appName,
        userIntent,
        constraints: params.constraints,
      }
    );
  }

  /**
   * WORKFLOW 3: CODE-ONLY (P0 Real Execution)
   * Arquitetura → Engenharia → file.materialize → exec.run_safe → artifact.collect
   */
  private async workflowCodeOnly(
    appName: string,
    params: any,
    steps: WorkflowStep[]
  ): Promise<{ filesWritten: string[]; commandsRun: CommandResult[]; errors: Array<{ path?: string; error: string }>; runFolder: string }> {
    this.logger.info('Executing CODE-ONLY workflow (P0)');

    const executionId = `exec-${Date.now()}`;
    const startTime = Date.now();
    const errors: Array<{ path?: string; error: string }> = [];
    let filesWritten: string[] = [];
    let commandsRun: CommandResult[] = [];
    let runFolder = `./runs/${executionId}`;

    // Step 1: Arquitetura (plano)
    await this.executeStep(
      steps,
      'arquitetura',
      'design_architecture',
      'hub-enterprise-arquitetura',
      {
        appName,
        requirements: params.requirements,
      }
    );

    // Step 2: Engenharia (plano de arquivos + comandos)
    const arquiteturaResult = steps[steps.length - 1].result;
    await this.executeStep(
      steps,
      'engenharia',
      'scaffold_app',
      'hub-enterprise-engenharia',
      {
        appName,
        architecture: arquiteturaResult?.architecture,
        techStack: arquiteturaResult?.techStack,
      }
    );

    const engenhariaResult = steps[steps.length - 1].result;

    // Step 3: P0 - Materializar arquivos
    if (engenhariaResult?.filesCreated && engenhariaResult.filesCreated.length > 0) {
      this.logger.info('P0: Materializing files...');
      const materializeStep: WorkflowStep = {
        persona: 'p0-executor',
        subskill: 'file.materialize',
        status: 'in-progress',
        startTime: Date.now(),
      };
      steps.push(materializeStep);

      try {
        const filePlans: FilePlan[] = engenhariaResult.filesCreated.map((f: any) => ({
          path: f.path,
          content: f.content || this.generateMinimalContent(f.path, appName),
        }));

        const materializeResult = await this.fileMaterialize.run({
          params: {
            appName,
            basePath: './apps',
            files: filePlans,
          },
        });

        if (materializeResult.success) {
          materializeStep.status = 'success';
          materializeStep.result = materializeResult.data;
          filesWritten = materializeResult.data?.filesWritten || [];
          this.logger.info(`P0: Materialized ${filesWritten.length} files`);
        } else {
          materializeStep.status = 'failed';
          materializeStep.error = materializeResult.error;
          errors.push({ error: materializeResult.error || 'Materialize failed' });
        }
      } catch (err) {
        materializeStep.status = 'failed';
        materializeStep.error = String(err);
        errors.push({ error: String(err) });
      }
      materializeStep.duration = Date.now() - materializeStep.startTime!;
    }

    // Step 4: P0 - Executar comandos (build)
    const appLocation = `./apps/${appName}`;
    const defaultCommands: CommandPlan[] = [
      { cmd: 'npm', args: ['install'], description: 'Install dependencies' },
      { cmd: 'npx', args: ['tsc', '--noEmit'], description: 'Type check' },
    ];

    this.logger.info('P0: Running build commands...');
    const execStep: WorkflowStep = {
      persona: 'p0-executor',
      subskill: 'exec.run_safe',
      status: 'in-progress',
      startTime: Date.now(),
    };
    steps.push(execStep);

    try {
      const execResult = await this.execRunSafe.run({
        params: {
          appLocation,
          commands: engenhariaResult?.commands || defaultCommands,
          logDir: `./runs/${executionId}/logs`,
          executionId,
        },
      });

      if (execResult.success) {
        execStep.status = 'success';
        execStep.result = execResult.data;
        commandsRun = execResult.data?.commandsRun || [];
        this.logger.info(`P0: Ran ${commandsRun.length} commands`);
      } else {
        execStep.status = 'failed';
        execStep.error = execResult.error;
        errors.push({ error: execResult.error || 'Exec failed' });
      }
    } catch (err) {
      execStep.status = 'failed';
      execStep.error = String(err);
      errors.push({ error: String(err) });
    }
    execStep.duration = Date.now() - execStep.startTime!;

    // Step 5: P0 - Coletar artefatos
    this.logger.info('P0: Collecting artifacts...');
    const collectStep: WorkflowStep = {
      persona: 'p0-executor',
      subskill: 'artifact.collect',
      status: 'in-progress',
      startTime: Date.now(),
    };
    steps.push(collectStep);

    try {
      const collectResult = await this.artifactCollect.run({
        params: {
          executionId,
          appName,
          appLocation,
          workflow: 'code-only',
          filesWritten,
          commandsRun,
          workflowSteps: steps.map(s => ({
            persona: s.persona,
            subskill: s.subskill || '',
            status: s.status,
            duration: s.duration,
            error: s.error,
          })),
          errors,
          startTime,
          endTime: Date.now(),
        },
      });

      if (collectResult.success) {
        collectStep.status = 'success';
        collectStep.result = collectResult.data;
        runFolder = collectResult.data?.runFolder || runFolder;
        this.logger.info(`P0: Artifacts collected at ${runFolder}`);
      } else {
        collectStep.status = 'failed';
        collectStep.error = collectResult.error;
      }
    } catch (err) {
      collectStep.status = 'failed';
      collectStep.error = String(err);
    }
    collectStep.duration = Date.now() - collectStep.startTime!;

    return { filesWritten, commandsRun, errors, runFolder };
  }

  /**
   * Gera conteúdo mínimo para arquivo quando não fornecido
   */
  private generateMinimalContent(filePath: string, appName: string): string {
    if (filePath.endsWith('package.json')) {
      return JSON.stringify({
        name: appName,
        version: '1.0.0',
        scripts: {
          build: 'tsc',
          test: 'echo "No tests yet"',
          start: 'node dist/index.js',
        },
        devDependencies: {
          typescript: '^5.0.0',
        },
      }, null, 2);
    }
    if (filePath.endsWith('tsconfig.json')) {
      return JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          outDir: './dist',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
        },
        include: ['src/**/*'],
      }, null, 2);
    }
    if (filePath.endsWith('index.ts')) {
      return `// ${appName} - Entry point\nconsole.log('Hello from ${appName}');\n`;
    }
    if (filePath.endsWith('.gitignore')) {
      return 'node_modules/\ndist/\n.env\n';
    }
    if (filePath.endsWith('README.md')) {
      return `# ${appName}\n\nGenerated by OpenClaw Aurora P0 App Factory.\n\n## Setup\n\n\`\`\`bash\nnpm install\nnpm run build\n\`\`\`\n`;
    }
    return `// ${filePath}\n// Generated by OpenClaw Aurora\n`;
  }

  /**
   * WORKFLOW 4: TEST-ONLY
   * QA → Security → Performance → Output reports
   */
  private async workflowTestOnly(
    appName: string,
    params: any,
    steps: WorkflowStep[]
  ): Promise<void> {
    this.logger.info('Executing TEST-ONLY workflow');

    // Step 1: QA Smoke Tests
    await this.executeStep(steps, 'qa', 'smoke_tests', 'hub-enterprise-qa', {
      appName,
      appLocation: params.appLocation || `apps/${appName}`,
    });

    // Step 2: Security Audit
    await this.executeStep(
      steps,
      'security',
      'security_audit',
      'hub-enterprise-security',
      {
        appName,
        scope: 'full',
      }
    );

    // Step 3: Performance Audit
    await this.executeStep(
      steps,
      'performance',
      'performance_audit',
      'hub-enterprise-performance',
      {
        appName,
        appLocation: params.appLocation || `apps/${appName}`,
      }
    );
  }

  /**
   * WORKFLOW 5: INCIDENT-RESPONSE
   * Ops (runbook) → Dados (diagnostics) → Ops (fix) → QA (validate)
   */
  private async workflowIncidentResponse(
    appName: string,
    params: any,
    steps: WorkflowStep[]
  ): Promise<void> {
    this.logger.info('Executing INCIDENT-RESPONSE workflow');

    // Step 1: Ops - Execute Runbook
    await this.executeStep(
      steps,
      'ops',
      'incident_response',
      'hub-enterprise-ops',
      {
        appName,
        incident: params.incident,
      }
    );

    // Step 2: Dados - Diagnostics
    await this.executeStep(
      steps,
      'dados',
      'query_optimization',
      'hub-enterprise-dados',
      {
        appName,
        performanceMetrics: params.performanceMetrics,
      }
    );

    // Step 3: Ops - Apply Fix
    await this.executeStep(
      steps,
      'ops',
      'deploy_production',
      'hub-enterprise-ops',
      {
        appName,
        environment: 'production',
        strategy: 'rolling',
      }
    );

    // Step 4: QA - Validate Fix
    await this.executeStep(
      steps,
      'qa',
      'smoke_tests',
      'hub-enterprise-qa',
      {
        appName,
        appLocation: `apps/${appName}`,
      }
    );
  }

  /**
   * WORKFLOW 6: FEATURE-ADD (P0 Real Execution)
   * Produto → Arquitetura → Engenharia → file.materialize → exec.run_safe → QA → artifact.collect
   */
  private async workflowFeatureAdd(
    appName: string,
    featureIntent: string,
    params: any,
    steps: WorkflowStep[]
  ): Promise<{ filesWritten: string[]; commandsRun: CommandResult[]; errors: Array<{ path?: string; error: string }>; runFolder: string }> {
    this.logger.info('Executing FEATURE-ADD workflow (P0)');

    const executionId = `exec-${Date.now()}`;
    const startTime = Date.now();
    const errors: Array<{ path?: string; error: string }> = [];
    let filesWritten: string[] = [];
    let commandsRun: CommandResult[] = [];
    let runFolder = `./runs/${executionId}`;

    // Step 1: Produto - Scope new feature
    await this.executeStep(
      steps,
      'produto',
      'mvp_definition',
      'hub-enterprise-produto',
      {
        appName,
        userIntent: `Add feature: ${featureIntent}`,
      }
    );

    // Step 2: Arquitetura - Design for feature
    const produtoResult = steps[steps.length - 1].result;
    await this.executeStep(
      steps,
      'arquitetura',
      'design_architecture',
      'hub-enterprise-arquitetura',
      {
        appName,
        features: produtoResult?.mvp?.features,
      }
    );

    // Step 3: Engenharia - Implement feature
    await this.executeStep(
      steps,
      'engenharia',
      'generate_api',
      'hub-enterprise-engenharia',
      {
        appName,
        newEndpoints: params.endpoints,
      }
    );

    const engenhariaResult = steps[steps.length - 1].result;

    // Step 4: P0 - Materializar arquivos (se houver)
    if (engenhariaResult?.filesCreated && engenhariaResult.filesCreated.length > 0) {
      this.logger.info('P0: Materializing feature files...');
      const materializeStep: WorkflowStep = {
        persona: 'p0-executor',
        subskill: 'file.materialize',
        status: 'in-progress',
        startTime: Date.now(),
      };
      steps.push(materializeStep);

      try {
        const filePlans: FilePlan[] = engenhariaResult.filesCreated.map((f: any) => ({
          path: f.path,
          content: f.content || `// ${f.path}\n// Generated by OpenClaw Aurora\n`,
        }));

        const materializeResult = await this.fileMaterialize.run({
          params: {
            appName,
            basePath: './apps',
            files: filePlans,
          },
        });

        if (materializeResult.success) {
          materializeStep.status = 'success';
          materializeStep.result = materializeResult.data;
          filesWritten = materializeResult.data?.filesWritten || [];
        } else {
          materializeStep.status = 'failed';
          materializeStep.error = materializeResult.error;
          errors.push({ error: materializeResult.error || 'Materialize failed' });
        }
      } catch (err) {
        materializeStep.status = 'failed';
        materializeStep.error = String(err);
        errors.push({ error: String(err) });
      }
      materializeStep.duration = Date.now() - materializeStep.startTime!;
    }

    // Step 5: P0 - Executar comandos (build/test)
    const appLocation = `./apps/${appName}`;
    const defaultCommands: CommandPlan[] = [
      { cmd: 'npm', args: ['install'], description: 'Install dependencies' },
      { cmd: 'npm', args: ['run', 'build'], description: 'Build' },
      { cmd: 'npm', args: ['test'], description: 'Run tests' },
    ];

    this.logger.info('P0: Running build/test commands...');
    const execStep: WorkflowStep = {
      persona: 'p0-executor',
      subskill: 'exec.run_safe',
      status: 'in-progress',
      startTime: Date.now(),
    };
    steps.push(execStep);

    try {
      const execResult = await this.execRunSafe.run({
        params: {
          appLocation,
          commands: engenhariaResult?.commands || defaultCommands,
          logDir: `./runs/${executionId}/logs`,
          executionId,
        },
      });

      if (execResult.success) {
        execStep.status = 'success';
        execStep.result = execResult.data;
        commandsRun = execResult.data?.commandsRun || [];
      } else {
        execStep.status = 'failed';
        execStep.error = execResult.error;
        errors.push({ error: execResult.error || 'Exec failed' });
      }
    } catch (err) {
      execStep.status = 'failed';
      execStep.error = String(err);
      errors.push({ error: String(err) });
    }
    execStep.duration = Date.now() - execStep.startTime!;

    // Step 6: QA - Read logs and summarize (simulated, P1 will do real analysis)
    await this.executeStep(
      steps,
      'qa',
      'integration_tests',
      'hub-enterprise-qa',
      {
        appName,
        testScenarios: params.testScenarios,
        commandsRun, // Pass P0 results for QA to analyze
      }
    );

    // Step 7: P0 - Coletar artefatos
    this.logger.info('P0: Collecting artifacts...');
    const collectStep: WorkflowStep = {
      persona: 'p0-executor',
      subskill: 'artifact.collect',
      status: 'in-progress',
      startTime: Date.now(),
    };
    steps.push(collectStep);

    try {
      const collectResult = await this.artifactCollect.run({
        params: {
          executionId,
          appName,
          appLocation,
          workflow: 'feature-add',
          filesWritten,
          commandsRun,
          workflowSteps: steps.map(s => ({
            persona: s.persona,
            subskill: s.subskill || '',
            status: s.status,
            duration: s.duration,
            error: s.error,
          })),
          errors,
          startTime,
          endTime: Date.now(),
        },
      });

      if (collectResult.success) {
        collectStep.status = 'success';
        collectStep.result = collectResult.data;
        runFolder = collectResult.data?.runFolder || runFolder;
      } else {
        collectStep.status = 'failed';
        collectStep.error = collectResult.error;
      }
    } catch (err) {
      collectStep.status = 'failed';
      collectStep.error = String(err);
    }
    collectStep.duration = Date.now() - collectStep.startTime!;

    return { filesWritten, commandsRun, errors, runFolder };
  }

  /**
   * Helper: Execute a single step in the workflow
   */
  private async executeStep(
    steps: WorkflowStep[],
    persona: string,
    subskill: string,
    skillId: string,
    params: any
  ): Promise<void> {
    const stepIndex = steps.length;
    const step: WorkflowStep = {
      persona,
      subskill,
      status: 'in-progress',
      startTime: Date.now(),
    };

    steps.push(step);

    this.logger.info(`Executing step: ${persona}.${subskill}`);

    try {
      // Execute the persona skill
      const result = await this.registry.execute(skillId, {
        skillId,
        params: {
          subskill,
          appName: params.appName,
          ...params,
        },
      });

      const endTime = Date.now();
      const duration = endTime - step.startTime!;

      if (result.success) {
        steps[stepIndex].status = 'success';
        steps[stepIndex].result = result.data;
        steps[stepIndex].duration = duration;
        this.logger.info(`Step completed: ${persona}.${subskill}`, {
          duration,
        });
      } else {
        steps[stepIndex].status = 'failed';
        steps[stepIndex].error = result.error;
        steps[stepIndex].duration = duration;
        this.logger.error(`Step failed: ${persona}.${subskill}`, {
          error: result.error,
          duration,
        });
      }
    } catch (error) {
      steps[stepIndex].status = 'failed';
      steps[stepIndex].error =
        error instanceof Error ? error.message : String(error);
      steps[stepIndex].duration = Date.now() - step.startTime!;
      this.logger.error(`Step error: ${persona}.${subskill}`, { error });
    }
  }
}

export function createHubEnterpriseOrchestrator(): HubEnterpriseOrchestrator {
  return new HubEnterpriseOrchestrator();
}
