/**
 * ══════════════════════════════════════════════════════════════════════════════
 * HUB SOCIAL ADAPTER - Social Media Hub via Contrato IHub
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este adapter implementa a interface IHub para o Social Media Hub,
 * desbloqueando 14 skills de automação Instagram (7 basic + 7 enterprise).
 */

import {
  IHub,
  HubManifest,
  HubExecutionRequest,
  HubExecutionResult,
  HubStatus,
  WorkflowDefinition,
  HubEventHandler,
  HubStepResult,
  HubMetrics,
  ValidationResult,
} from '../core/contracts/hub.contract';
import { getSkillRegistryAdapter, SkillRegistryAdapter } from './skill.adapter';

// ════════════════════════════════════════════════════════════════════════════
// MANIFEST DO HUB SOCIAL
// ════════════════════════════════════════════════════════════════════════════

export const SOCIAL_MANIFEST: HubManifest = {
  name: 'social',
  display_name: 'Social Media Hub',
  description: '14 skills para automação completa de Instagram: planejamento, AI, agendamento, analytics',
  version: '1.0.0',
  category: 'content',
  status: 'active',
  author: 'OpenClaw Team',

  workflows: [
    {
      id: 'full',
      name: 'Full Workflow',
      description: 'Workflow completo: Plan → Inventory → Generate → Schedule → Analytics',
      steps: [
        { id: 'plan', order: 0, description: 'Plan content', action_type: 'skill', target: 'social-hub-planner', optional: false, fail_safe: false },
        { id: 'inventory', order: 1, description: 'Scan inventory', action_type: 'skill', target: 'social-hub-inventory', optional: false, fail_safe: false },
        { id: 'caption', order: 2, description: 'Generate caption', action_type: 'skill', target: 'social-hub-caption-ai', optional: false, fail_safe: false },
        { id: 'hashtag', order: 3, description: 'Optimize hashtags', action_type: 'skill', target: 'social-hub-hashtag-ai', optional: false, fail_safe: false },
        { id: 'schedule', order: 4, description: 'Schedule posts', action_type: 'skill', target: 'social-hub-publer-v2', optional: false, fail_safe: false },
        { id: 'analytics', order: 5, description: 'Collect analytics', action_type: 'skill', target: 'social-hub-analytics-collector', optional: true, fail_safe: true },
      ],
      input_schema: {
        socialHubPath: { type: 'string', description: 'Path to social hub data', required: true },
        publisherApiKey: { type: 'string', description: 'Publer API key', required: true },
        anthropicApiKey: { type: 'string', description: 'Anthropic API key', required: true },
      },
      output_schema: {},
      risk_level: 'medium',
      estimated_duration_ms: 300000,
      cancellable: true,
      resumable: true,
    },
    {
      id: 'plan-only',
      name: 'Planning Only',
      description: 'Planejamento de conteúdo para 30 dias',
      steps: [
        { id: 'plan', order: 0, description: 'Plan content', action_type: 'skill', target: 'social-hub-planner', optional: false, fail_safe: false },
        { id: 'inventory', order: 1, description: 'Scan inventory', action_type: 'skill', target: 'social-hub-inventory', optional: false, fail_safe: false },
        { id: 'quota', order: 2, description: 'Validate quotas', action_type: 'skill', target: 'social-hub-quota-enforcer', optional: false, fail_safe: false },
      ],
      input_schema: {
        socialHubPath: { type: 'string', description: 'Path to social hub data', required: true },
      },
      output_schema: {},
      risk_level: 'low',
      estimated_duration_ms: 60000,
      cancellable: true,
      resumable: false,
    },
    {
      id: 'generate-only',
      name: 'AI Content Generation',
      description: 'Geração de captions e hashtags otimizados via AI',
      steps: [
        { id: 'enrich', order: 0, description: 'Enrich video', action_type: 'skill', target: 'social-hub-video-enricher', optional: true, fail_safe: true },
        { id: 'caption', order: 1, description: 'Generate caption', action_type: 'skill', target: 'social-hub-caption-ai', optional: false, fail_safe: false },
        { id: 'hashtag', order: 2, description: 'Optimize hashtags', action_type: 'skill', target: 'social-hub-hashtag-ai', optional: false, fail_safe: false },
      ],
      input_schema: {
        anthropicApiKey: { type: 'string', description: 'Anthropic API key', required: true },
        videoMetadata: { type: 'object', description: 'Video metadata', required: true },
      },
      output_schema: {},
      risk_level: 'low',
      estimated_duration_ms: 30000,
      cancellable: true,
      resumable: false,
    },
    {
      id: 'schedule-only',
      name: 'Schedule Posts',
      description: 'Agendamento de posts via Publer API',
      steps: [
        { id: 'quota', order: 0, description: 'Check quota', action_type: 'skill', target: 'social-hub-quota-enforcer', optional: false, fail_safe: false },
        { id: 'schedule', order: 1, description: 'Schedule posts', action_type: 'skill', target: 'social-hub-publer-v2', optional: false, fail_safe: false },
      ],
      input_schema: {
        publisherApiKey: { type: 'string', description: 'Publer API key', required: true },
        posts: { type: 'array', description: 'Posts to schedule', required: true },
      },
      output_schema: {},
      risk_level: 'medium',
      estimated_duration_ms: 60000,
      cancellable: true,
      resumable: false,
    },
    {
      id: 'analytics-only',
      name: 'Collect Analytics',
      description: 'Coleta métricas do Instagram via Graph API',
      steps: [
        { id: 'collect', order: 0, description: 'Collect metrics', action_type: 'skill', target: 'social-hub-analytics-collector', optional: false, fail_safe: false },
        { id: 'report', order: 1, description: 'Generate report', action_type: 'skill', target: 'social-hub-analytics', optional: false, fail_safe: false },
      ],
      input_schema: {
        instagramAccessToken: { type: 'string', description: 'Instagram access token', required: true },
        instagramBusinessAccountId: { type: 'string', description: 'Instagram business account ID', required: true },
      },
      output_schema: {},
      risk_level: 'low',
      estimated_duration_ms: 45000,
      cancellable: true,
      resumable: false,
    },
    {
      id: 'approval-flow',
      name: 'Approval Workflow',
      description: 'Fluxo de aprovação de posts com notificação Telegram',
      steps: [
        { id: 'submit', order: 0, description: 'Submit for approval', action_type: 'skill', target: 'social-hub-approval-workflow', optional: false, fail_safe: false },
        { id: 'log', order: 1, description: 'Log activity', action_type: 'skill', target: 'social-hub-observability', optional: true, fail_safe: true },
      ],
      input_schema: {
        posts: { type: 'array', description: 'Posts to approve', required: true },
      },
      output_schema: {},
      risk_level: 'low',
      estimated_duration_ms: 5000,
      cancellable: false,
      resumable: false,
    },
    {
      id: 'database-setup',
      name: 'Database Setup',
      description: 'Setup e migração do banco de dados PostgreSQL',
      steps: [
        { id: 'migrate', order: 0, description: 'Run migrations', action_type: 'skill', target: 'social-hub-database-manager', optional: false, fail_safe: false },
        { id: 'health', order: 1, description: 'Health check', action_type: 'skill', target: 'social-hub-observability', optional: false, fail_safe: false },
      ],
      input_schema: {
        databaseUrl: { type: 'string', description: 'Database connection URL', required: true },
      },
      output_schema: {},
      risk_level: 'high',
      estimated_duration_ms: 30000,
      cancellable: false,
      resumable: false,
    },
  ],

  dependencies: [
    { skill: 'social-hub-planner', methods: ['plan'], required: true },
    { skill: 'social-hub-publer-v2', methods: ['schedule'], required: true },
    { skill: 'social-hub-caption-ai', methods: ['generate'], required: true },
  ],
  permissions_required: ['network:outbound', 'ai:invoke'],
  default_risk_level: 'medium',
  metadata: {
    total_skills: 14,
    categories: ['basic', 'enterprise'],
  },
};

// ════════════════════════════════════════════════════════════════════════════
// HUB SOCIAL ADAPTER
// ════════════════════════════════════════════════════════════════════════════

export class HubSocialAdapter implements IHub {
  private skillRegistry: SkillRegistryAdapter;
  private _manifest: HubManifest = SOCIAL_MANIFEST;
  private config: Record<string, any> = {};
  private eventHandlers: Set<HubEventHandler> = new Set();
  private activeExecutions: Map<string, { cancelled: boolean }> = new Map();

  constructor(skillRegistry?: SkillRegistryAdapter) {
    this.skillRegistry = skillRegistry || getSkillRegistryAdapter();
  }

  get manifest(): HubManifest {
    return this._manifest;
  }

  async initialize(config?: Record<string, any>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async executeWorkflow(request: HubExecutionRequest): Promise<HubExecutionResult> {
    const startTime = Date.now();
    const workflow = this.getWorkflow(request.workflow);

    if (!workflow) {
      return this.createErrorResult(request.execution_id, 'WORKFLOW_NOT_FOUND', `Workflow '${request.workflow}' not found`, startTime);
    }

    // Validate params
    const validation = this.validateParams(request.workflow, request.params);
    if (!validation.valid) {
      const errorMsg = validation.errors?.map((e) => e.message).join(', ') || 'Invalid params';
      return this.createErrorResult(request.execution_id, 'INVALID_PARAMS', errorMsg, startTime);
    }

    console.log(`[HubSocial] Executing workflow: ${workflow.id} (${workflow.steps.length} steps)`);

    this.activeExecutions.set(request.execution_id, { cancelled: false });

    const stepResults: HubStepResult[] = [];
    let output: Record<string, any> = {};

    for (const step of workflow.steps) {
      // Check if cancelled
      if (this.activeExecutions.get(request.execution_id)?.cancelled) {
        break;
      }

      console.log(`[HubSocial] Step ${step.order}: ${step.target}`);
      const stepStart = Date.now();

      try {
        // Simulate execution (in real impl, would call skill registry)
        const result = {
          success: true,
          output: { skill: step.target, status: 'simulated', message: `Skill ${step.target} executed` },
        };

        stepResults.push({
          step_id: step.id,
          status: result.success ? 'completed' : 'failed',
          output: result.output,
          duration_ms: Date.now() - stepStart,
        });

        output[step.id] = result.output;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stepResults.push({
          step_id: step.id,
          status: 'failed',
          error: errorMsg,
          duration_ms: Date.now() - stepStart,
        });

        if (!step.fail_safe) break;
      }
    }

    this.activeExecutions.delete(request.execution_id);

    const allSuccess = stepResults.every((r) => r.status === 'completed');

    const metrics: HubMetrics = {
      total_duration_ms: Date.now() - startTime,
      steps_executed: stepResults.length,
      steps_failed: stepResults.filter((r) => r.status === 'failed').length,
    };

    return {
      execution_id: request.execution_id,
      status: allSuccess ? 'completed' : 'failed',
      output,
      step_results: stepResults,
      metrics,
    };
  }

  listWorkflows(): WorkflowDefinition[] {
    return this._manifest.workflows;
  }

  getWorkflow(workflow_id: string): WorkflowDefinition | null {
    return this._manifest.workflows.find((w) => w.id === workflow_id) || null;
  }

  validateParams(workflow_id: string, params: Record<string, any>): ValidationResult {
    const workflow = this.getWorkflow(workflow_id);
    if (!workflow) {
      return { valid: false, errors: [{ field: 'workflow', message: `Workflow '${workflow_id}' not found`, code: 'NOT_FOUND' }] };
    }

    const errors: Array<{ field: string; message: string; code: string }> = [];

    for (const [key, def] of Object.entries(workflow.input_schema)) {
      if (def.required && !(key in params)) {
        errors.push({ field: key, message: `Missing required parameter: ${key}`, code: 'REQUIRED' });
      }
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  getStatus(): HubStatus {
    return this._manifest.status;
  }

  getConfig(): Record<string, any> {
    return this.config;
  }

  async updateConfig(updates: Record<string, any>): Promise<void> {
    this.config = { ...this.config, ...updates };
  }

  async cancelExecution(execution_id: string): Promise<void> {
    const execution = this.activeExecutions.get(execution_id);
    if (execution) {
      execution.cancelled = true;
    }
  }

  async resumeFromCheckpoint(execution_id: string, checkpoint: Record<string, any>): Promise<HubExecutionResult> {
    // Not supported yet
    return this.createErrorResult(execution_id, 'NOT_SUPPORTED', 'Resume not supported yet', Date.now());
  }

  async shutdown(): Promise<void> {
    // Cancel all active executions
    for (const [id] of this.activeExecutions) {
      await this.cancelExecution(id);
    }
  }

  // Helpers
  private createErrorResult(execution_id: string, code: string, message: string, startTime: number): HubExecutionResult {
    return {
      execution_id,
      status: 'failed',
      output: {},
      step_results: [],
      error: { code, message, recoverable: false },
      metrics: {
        total_duration_ms: Date.now() - startTime,
        steps_executed: 0,
        steps_failed: 0,
      },
    };
  }

  // Custom methods
  getTotalSkills(): number {
    return (this._manifest.metadata?.total_skills as number) || 14;
  }

  hasSkill(skillName: string): boolean {
    return skillName.startsWith('social-hub-');
  }

  listSkillsByCategory(): Record<string, string[]> {
    return {
      basic: ['social-hub-planner', 'social-hub-publer', 'social-hub-caption-ai', 'social-hub-hashtag-ai', 'social-hub-inventory', 'social-hub-analytics', 'social-hub-orchestrator'],
      enterprise: ['social-hub-publer-v2', 'social-hub-video-enricher', 'social-hub-quota-enforcer', 'social-hub-analytics-collector', 'social-hub-approval-workflow', 'social-hub-database-manager', 'social-hub-observability'],
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

let hubSocialInstance: HubSocialAdapter | null = null;

export function getHubSocialAdapter(): HubSocialAdapter {
  if (!hubSocialInstance) {
    hubSocialInstance = new HubSocialAdapter();
  }
  return hubSocialInstance;
}

export function createHubSocialAdapter(skillRegistry?: SkillRegistryAdapter): HubSocialAdapter {
  return new HubSocialAdapter(skillRegistry);
}
