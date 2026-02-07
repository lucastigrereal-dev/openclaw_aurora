/**
 * Hub Enterprise - Orchestrator
 * Coordena todas as 9 personas em workflows estruturados
 * Implement 6 workflows: full, mvp-only, code-only, test-only, incident-response, feature-add
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { getSkillRegistryV2 } from '../registry-v2';
import { OrchestratorOutput, WorkflowStep } from './hub-enterprise-types';
import { createLogger } from './shared/hub-enterprise-logger';
import { getConfig } from './shared/hub-enterprise-config';

export class HubEnterpriseOrchestrator extends Skill {
  private registry = getSkillRegistryV2();
  private logger = createLogger('orchestrator');
  private hubConfig = getConfig();

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

    try {
      switch (workflow) {
        case 'full':
          await this.workflowFull(appName, userIntent, params, steps);
          break;
        case 'mvp-only':
          await this.workflowMVPOnly(appName, userIntent, params, steps);
          break;
        case 'code-only':
          await this.workflowCodeOnly(appName, params, steps);
          break;
        case 'test-only':
          await this.workflowTestOnly(appName, params, steps);
          break;
        case 'incident-response':
          await this.workflowIncidentResponse(appName, params, steps);
          break;
        case 'feature-add':
          await this.workflowFeatureAdd(appName, userIntent, params, steps);
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
      };

      this.logger.info('Workflow completed', {
        workflow,
        duration: totalDuration,
        successfulSteps,
        failedSteps,
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
   * WORKFLOW 3: CODE-ONLY
   * Arquitetura → Engenharia → Output code
   */
  private async workflowCodeOnly(
    appName: string,
    params: any,
    steps: WorkflowStep[]
  ): Promise<void> {
    this.logger.info('Executing CODE-ONLY workflow');

    // Step 1: Arquitetura
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

    // Step 2: Engenharia
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
   * WORKFLOW 6: FEATURE-ADD
   * Produto → Arquitetura → Engenharia → QA → Ops (deploy)
   */
  private async workflowFeatureAdd(
    appName: string,
    featureIntent: string,
    params: any,
    steps: WorkflowStep[]
  ): Promise<void> {
    this.logger.info('Executing FEATURE-ADD workflow');

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

    // Step 4: QA - Test feature
    await this.executeStep(
      steps,
      'qa',
      'integration_tests',
      'hub-enterprise-qa',
      {
        appName,
        testScenarios: params.testScenarios,
      }
    );

    // Step 5: Ops - Deploy feature
    await this.executeStep(
      steps,
      'ops',
      'deploy_production',
      'hub-enterprise-ops',
      {
        appName,
        environment: 'production',
        strategy: 'canary',
      }
    );
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
