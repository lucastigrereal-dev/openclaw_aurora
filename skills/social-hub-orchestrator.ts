/**
 * S-07: Social Hub Orchestrator Skill
 *
 * Orquestra workflow completo: Plan -> Generate -> Schedule -> Monitor
 * Integra todas as skills do Social Hub
 *
 * @category UTIL
 * @version 1.0.0
 * @critical CRITICAL
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import { getSkillRegistryV2 } from './skill-registry-v2';

export interface OrchestratorInput extends SkillInput {
  socialHubPath: string;
  publisherApiKey: string;
  anthropicApiKey: string;
  instagramAccessToken?: string;
  instagramBusinessAccountId?: string;

  workflow: 'full' | 'plan-only' | 'generate-only' | 'schedule-only' | 'analytics-only';

  planConfig?: {
    daysAhead?: number;
    forceReplan?: boolean;
  };

  generateConfig?: {
    useCaptionAI?: boolean;
    useHashtagAI?: boolean;
    captionVariations?: number;
  };

  scheduleConfig?: {
    dryRun?: boolean;
    batchSize?: number;
  };

  analyticsConfig?: {
    dateRange?: { start: string; end: string };
  };
}

export interface OrchestratorOutput extends SkillOutput {
  data?: {
    workflowSteps: Array<{
      step: string;
      status: 'success' | 'failed' | 'skipped';
      duration: number;
      result?: any;
      error?: string;
    }>;
    summary: {
      totalSteps: number;
      successfulSteps: number;
      failedSteps: number;
      totalDuration: number;
    };
  };
}

export class SocialHubOrchestrator extends Skill {
  private registry = getSkillRegistryV2();

  constructor() {
    super(
      {
        name: 'social-hub-orchestrator',
        description: 'End-to-end orchestration of Instagram content workflow',
        version: '1.0.0',
        category: 'UTIL',
        author: 'OpenClaw Aurora',
        tags: ['orchestration', 'workflow', 'automation', 'instagram'],
      },
      {
        timeout: 600000, // 10 minutos
        retries: 0, // Não retry em orchestrator
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as OrchestratorInput;

    if (!typed.socialHubPath) {
      console.error('[Orchestrator] Missing socialHubPath');
      return false;
    }

    if (!typed.workflow) {
      console.error('[Orchestrator] Missing workflow type');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<OrchestratorOutput> {
    const typed = input as OrchestratorInput;
    const steps: NonNullable<OrchestratorOutput['data']>['workflowSteps'] = [];
    const startTime = Date.now();

    try {
      // Executar workflow baseado no tipo
      switch (typed.workflow) {
        case 'full':
          await this.runFullWorkflow(typed, steps);
          break;

        case 'plan-only':
          await this.runPlanningStep(typed, steps);
          break;

        case 'generate-only':
          await this.runGenerationStep(typed, steps);
          break;

        case 'schedule-only':
          await this.runSchedulingStep(typed, steps);
          break;

        case 'analytics-only':
          await this.runAnalyticsStep(typed, steps);
          break;

        default:
          return {
            success: false,
            error: `Unknown workflow type: ${typed.workflow}`,
          };
      }

      // Calcular summary
      const summary = {
        totalSteps: steps.length,
        successfulSteps: steps.filter((s: any) => s.status === 'success').length,
        failedSteps: steps.filter((s: any) => s.status === 'failed').length,
        totalDuration: Date.now() - startTime,
      };

      const allSuccess = summary.failedSteps === 0;

      return {
        success: allSuccess,
        data: {
          workflowSteps: steps,
          summary,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Orchestration failed: ${errorMessage}`,
        data: {
          workflowSteps: steps,
          summary: {
            totalSteps: steps.length,
            successfulSteps: steps.filter((s: any) => s.status === 'success').length,
            failedSteps: steps.filter((s: any) => s.status === 'failed').length,
            totalDuration: Date.now() - startTime,
          },
        },
      };
    }
  }

  /**
   * Workflow completo
   */
  private async runFullWorkflow(
    input: OrchestratorInput,
    steps: NonNullable<OrchestratorOutput['data']>['workflowSteps']
  ): Promise<void> {
    // Step 1: Planning
    await this.runPlanningStep(input, steps);

    // Step 2: Inventory
    await this.executeStep(
      'inventory',
      'social-hub-inventory',
      {
        socialHubPath: input.socialHubPath,
        extractDuration: true,
      },
      steps
    );

    // Step 3: Generation (Caption + Hashtags)
    if (input.generateConfig?.useCaptionAI) {
      await this.runGenerationStep(input, steps);
    }

    // Step 4: Scheduling
    await this.runSchedulingStep(input, steps);

    // Step 5: Analytics (optional)
    if (input.instagramAccessToken && input.instagramBusinessAccountId) {
      await this.runAnalyticsStep(input, steps);
    }
  }

  /**
   * Step de planejamento
   */
  private async runPlanningStep(
    input: OrchestratorInput,
    steps: NonNullable<OrchestratorOutput['data']>['workflowSteps']
  ): Promise<void> {
    await this.executeStep(
      'planning',
      'social-hub-planner',
      {
        socialHubPath: input.socialHubPath,
        daysAhead: input.planConfig?.daysAhead || 30,
        forceReplan: input.planConfig?.forceReplan || false,
      },
      steps
    );
  }

  /**
   * Step de geração (AI)
   */
  private async runGenerationStep(
    input: OrchestratorInput,
    steps: NonNullable<OrchestratorOutput['data']>['workflowSteps']
  ): Promise<void> {
    // Caption AI (exemplo para primeiro post)
    if (input.generateConfig?.useCaptionAI) {
      await this.executeStep(
        'caption-generation',
        'social-hub-caption-ai',
        {
          anthropicApiKey: input.anthropicApiKey,
          videoMetadata: {
            tema: 'maternidade',
            pilar: 'entretenimento',
            pagina: '@mamae.de.dois',
            gancho: 'Você não vai acreditar...',
            cta: 'Comenta aqui embaixo!',
          },
          variations: input.generateConfig.captionVariations || 3,
        },
        steps
      );
    }

    // Hashtag AI
    if (input.generateConfig?.useHashtagAI) {
      await this.executeStep(
        'hashtag-optimization',
        'social-hub-hashtag-ai',
        {
          videoMetadata: {
            tema: 'maternidade',
            pilar: 'entretenimento',
            pagina: '@mamae.de.dois',
          },
          strategy: 'balanced',
        },
        steps
      );
    }
  }

  /**
   * Step de agendamento
   */
  private async runSchedulingStep(
    input: OrchestratorInput,
    steps: NonNullable<OrchestratorOutput['data']>['workflowSteps']
  ): Promise<void> {
    // Exemplo: agendar primeiro post do plano
    await this.executeStep(
      'scheduling',
      'social-hub-publer',
      {
        publisherApiKey: input.publisherApiKey,
        post: {
          pagina: '@lucasrsmotta',
          data: '2026-02-10',
          hora: '18:00',
          videoPath: '/path/to/video.mp4',
          legenda: 'Caption gerada pela IA',
          hashtags: ['#hashtag1', '#hashtag2'],
        },
        dryRun: input.scheduleConfig?.dryRun || false,
      },
      steps
    );
  }

  /**
   * Step de analytics
   */
  private async runAnalyticsStep(
    input: OrchestratorInput,
    steps: NonNullable<OrchestratorOutput['data']>['workflowSteps']
  ): Promise<void> {
    if (!input.instagramAccessToken || !input.instagramBusinessAccountId) {
      steps.push({
        step: 'analytics',
        status: 'skipped',
        duration: 0,
      });
      return;
    }

    await this.executeStep(
      'analytics',
      'social-hub-analytics',
      {
        instagramAccessToken: input.instagramAccessToken,
        instagramBusinessAccountId: input.instagramBusinessAccountId,
        dateRange: input.analyticsConfig?.dateRange,
      },
      steps
    );
  }

  /**
   * Executa um step genérico
   */
  private async executeStep(
    stepName: string,
    skillName: string,
    skillInput: any,
    steps: NonNullable<OrchestratorOutput['data']>['workflowSteps']
  ): Promise<void> {
    const stepStartTime = Date.now();

    console.log(`[Orchestrator] Executing step: ${stepName}`);

    try {
      const result = await this.registry.execute(skillName, skillInput);

      const duration = Date.now() - stepStartTime;

      if (result.success) {
        steps.push({
          step: stepName,
          status: 'success',
          duration,
          result: result.data,
        });

        console.log(`[Orchestrator] ✓ ${stepName} completed in ${duration}ms`);
      } else {
        steps.push({
          step: stepName,
          status: 'failed',
          duration,
          error: result.error,
        });

        console.error(`[Orchestrator] ✗ ${stepName} failed: ${result.error}`);

        // Em caso de falha, interromper workflow
        throw new Error(`Step ${stepName} failed: ${result.error}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      steps.push({
        step: stepName,
        status: 'failed',
        duration: Date.now() - stepStartTime,
        error: errorMessage,
      });

      throw error;
    }
  }
}
