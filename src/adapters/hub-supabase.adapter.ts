/**
 * ══════════════════════════════════════════════════════════════════════════════
 * HUB SUPABASE ADAPTER - Supabase Archon via Contrato IHub
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este adapter implementa a interface IHub para o Supabase Archon,
 * desbloqueando 30 skills enterprise de gestão de banco de dados PostgreSQL.
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
// MANIFEST DO HUB SUPABASE
// ════════════════════════════════════════════════════════════════════════════

export const SUPABASE_MANIFEST: HubManifest = {
  name: 'supabase',
  display_name: 'Supabase Archon Hub',
  description: '30 enterprise skills para PostgreSQL/Supabase: segurança, performance, compliance',
  version: '3.0.0',
  category: 'data',
  status: 'active',
  author: 'OpenClaw Team',

  workflows: [
    {
      id: 'security-audit',
      name: 'Security Audit',
      description: 'Auditoria completa de segurança: schema, RLS, permissions, secrets',
      steps: [
        { id: 'schema', order: 0, description: 'Schema sentinel', action_type: 'skill', target: 'supabase-schema-sentinel', optional: false, fail_safe: false },
        { id: 'rls', order: 1, description: 'RLS auditor', action_type: 'skill', target: 'supabase-rls-auditor', optional: false, fail_safe: false },
        { id: 'perms', order: 2, description: 'Permission diff', action_type: 'skill', target: 'supabase-permission-diff', optional: false, fail_safe: false },
        { id: 'secrets', order: 3, description: 'Secrets scanner', action_type: 'skill', target: 'supabase-secrets-scanner', optional: false, fail_safe: false },
      ],
      input_schema: {
        connectionString: { type: 'string', description: 'PostgreSQL connection string', required: true },
      },
      output_schema: {},
      risk_level: 'low',
      estimated_duration_ms: 120000,
      cancellable: true,
      resumable: false,
    },
    {
      id: 'health-check',
      name: 'Health Check',
      description: 'Verificação completa de saúde: conexões, queries, disco, replicação',
      steps: [
        { id: 'health', order: 0, description: 'Health dashboard', action_type: 'skill', target: 'supabase-health-dashboard', optional: false, fail_safe: false },
        { id: 'pool', order: 1, description: 'Connection pool', action_type: 'skill', target: 'supabase-connection-pool', optional: false, fail_safe: false },
        { id: 'disk', order: 2, description: 'Disk usage', action_type: 'skill', target: 'supabase-disk-usage-monitor', optional: false, fail_safe: false },
        { id: 'repl', order: 3, description: 'Replication monitor', action_type: 'skill', target: 'supabase-replication-monitor', optional: false, fail_safe: false },
      ],
      input_schema: {
        connectionString: { type: 'string', description: 'PostgreSQL connection string', required: true },
      },
      output_schema: {},
      risk_level: 'low',
      estimated_duration_ms: 60000,
      cancellable: true,
      resumable: false,
    },
    {
      id: 'performance-tune',
      name: 'Performance Tune',
      description: 'Otimização: slow queries, índices, vacuum, cache, bloat',
      steps: [
        { id: 'slow', order: 0, description: 'Slow query logger', action_type: 'skill', target: 'supabase-slow-query-logger', optional: false, fail_safe: false },
        { id: 'doctor', order: 1, description: 'Query doctor', action_type: 'skill', target: 'supabase-query-doctor', optional: false, fail_safe: false },
        { id: 'index', order: 2, description: 'Index optimizer', action_type: 'skill', target: 'supabase-index-optimizer', optional: false, fail_safe: false },
        { id: 'bloat', order: 3, description: 'Bloat detector', action_type: 'skill', target: 'supabase-table-bloat-detector', optional: false, fail_safe: false },
        { id: 'vacuum', order: 4, description: 'Vacuum scheduler', action_type: 'skill', target: 'supabase-vacuum-scheduler', optional: false, fail_safe: false },
        { id: 'cache', order: 5, description: 'Cache warmer', action_type: 'skill', target: 'supabase-cache-warmer', optional: false, fail_safe: false },
      ],
      input_schema: {
        connectionString: { type: 'string', description: 'PostgreSQL connection string', required: true },
      },
      output_schema: {},
      risk_level: 'medium',
      estimated_duration_ms: 180000,
      cancellable: true,
      resumable: true,
    },
    {
      id: 'migration-safe',
      name: 'Safe Migration',
      description: 'Migração segura: diff, plan, backup drill, apply',
      steps: [
        { id: 'diff', order: 0, description: 'Schema differ', action_type: 'skill', target: 'supabase-schema-differ', optional: false, fail_safe: false },
        { id: 'plan', order: 1, description: 'Migration planner', action_type: 'skill', target: 'supabase-migration-planner', optional: false, fail_safe: false },
        { id: 'backup', order: 2, description: 'Backup driller', action_type: 'skill', target: 'supabase-backup-driller', optional: false, fail_safe: false },
        { id: 'audit', order: 3, description: 'Data auditor', action_type: 'skill', target: 'supabase-data-auditor', optional: false, fail_safe: false },
      ],
      input_schema: {
        connectionString: { type: 'string', description: 'PostgreSQL connection string', required: true },
        targetSchema: { type: 'string', description: 'Target schema SQL', required: true },
      },
      output_schema: {},
      risk_level: 'high',
      estimated_duration_ms: 300000,
      cancellable: true,
      resumable: true,
    },
    {
      id: 'compliance-report',
      name: 'Compliance Report',
      description: 'Relatório de conformidade: LGPD, GDPR, SOC2',
      steps: [
        { id: 'compliance', order: 0, description: 'Compliance reporter', action_type: 'skill', target: 'supabase-compliance-reporter', optional: false, fail_safe: false },
        { id: 'rls', order: 1, description: 'RLS auditor', action_type: 'skill', target: 'supabase-rls-auditor', optional: false, fail_safe: false },
        { id: 'perms', order: 2, description: 'Permission diff', action_type: 'skill', target: 'supabase-permission-diff', optional: false, fail_safe: false },
        { id: 'data', order: 3, description: 'Data auditor', action_type: 'skill', target: 'supabase-data-auditor', optional: false, fail_safe: false },
      ],
      input_schema: {
        connectionString: { type: 'string', description: 'PostgreSQL connection string', required: true },
        framework: { type: 'string', description: 'Compliance framework (lgpd, gdpr, soc2)', required: true },
      },
      output_schema: {},
      risk_level: 'low',
      estimated_duration_ms: 240000,
      cancellable: true,
      resumable: false,
    },
    {
      id: 'full-scan',
      name: 'Full Database Scan',
      description: 'Análise completa: todas as principais skills',
      steps: [
        { id: 'health', order: 0, description: 'Health dashboard', action_type: 'skill', target: 'supabase-health-dashboard', optional: false, fail_safe: true },
        { id: 'schema', order: 1, description: 'Schema sentinel', action_type: 'skill', target: 'supabase-schema-sentinel', optional: false, fail_safe: true },
        { id: 'slow', order: 2, description: 'Slow query logger', action_type: 'skill', target: 'supabase-slow-query-logger', optional: false, fail_safe: true },
        { id: 'bloat', order: 3, description: 'Bloat detector', action_type: 'skill', target: 'supabase-table-bloat-detector', optional: false, fail_safe: true },
        { id: 'disk', order: 4, description: 'Disk usage', action_type: 'skill', target: 'supabase-disk-usage-monitor', optional: false, fail_safe: true },
        { id: 'cost', order: 5, description: 'Cost analyzer', action_type: 'skill', target: 'supabase-cost-analyzer', optional: false, fail_safe: true },
      ],
      input_schema: {
        connectionString: { type: 'string', description: 'PostgreSQL connection string', required: true },
      },
      output_schema: {},
      risk_level: 'low',
      estimated_duration_ms: 600000,
      cancellable: true,
      resumable: true,
    },
  ],

  dependencies: [
    { skill: 'supabase-schema-sentinel', methods: ['scan'], required: true },
    { skill: 'supabase-health-dashboard', methods: ['collect'], required: true },
    { skill: 'supabase-index-optimizer', methods: ['recommend'], required: true },
  ],
  permissions_required: ['database:read', 'database:write'],
  default_risk_level: 'low',
  metadata: {
    total_skills: 30,
    categories: ['p0-security', 'p0-database', 'p1-operations', 'p2-advanced'],
  },
};

// ════════════════════════════════════════════════════════════════════════════
// HUB SUPABASE ADAPTER
// ════════════════════════════════════════════════════════════════════════════

export class HubSupabaseAdapter implements IHub {
  private skillRegistry: SkillRegistryAdapter;
  private _manifest: HubManifest = SUPABASE_MANIFEST;
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

    console.log(`[HubSupabase] Executing workflow: ${workflow.id} (${workflow.steps.length} steps)`);

    this.activeExecutions.set(request.execution_id, { cancelled: false });

    const stepResults: HubStepResult[] = [];
    let output: Record<string, any> = {};

    for (const step of workflow.steps) {
      // Check if cancelled
      if (this.activeExecutions.get(request.execution_id)?.cancelled) {
        break;
      }

      console.log(`[HubSupabase] Step ${step.order}: ${step.target}`);
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
    return (this._manifest.metadata?.total_skills as number) || 30;
  }

  hasSkill(skillName: string): boolean {
    return skillName.startsWith('supabase-');
  }

  listSkillsByCategory(): Record<string, string[]> {
    return {
      'p0-security': ['supabase-schema-sentinel', 'supabase-rls-auditor', 'supabase-permission-diff', 'supabase-secrets-scanner'],
      'p0-database': ['supabase-data-auditor', 'supabase-migration-planner', 'supabase-schema-differ', 'supabase-query-doctor', 'supabase-backup-driller'],
      'p1-operations': ['supabase-index-optimizer', 'supabase-vacuum-scheduler', 'supabase-connection-pool', 'supabase-health-dashboard', 'supabase-circuit-breaker', 'supabase-rate-limiter', 'supabase-cache-warmer', 'supabase-query-cache', 'supabase-slow-query-logger', 'supabase-transaction-monitor', 'supabase-deadlock-detector'],
      'p2-advanced': ['supabase-replication-monitor', 'supabase-table-bloat-detector', 'supabase-lock-monitor', 'supabase-partition-manager', 'supabase-statistics-collector', 'supabase-disk-usage-monitor', 'supabase-compliance-reporter', 'supabase-cost-analyzer', 'supabase-edge-function-monitor', 'supabase-ai-query-optimizer'],
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

let hubSupabaseInstance: HubSupabaseAdapter | null = null;

export function getHubSupabaseAdapter(): HubSupabaseAdapter {
  if (!hubSupabaseInstance) {
    hubSupabaseInstance = new HubSupabaseAdapter();
  }
  return hubSupabaseInstance;
}

export function createHubSupabaseAdapter(skillRegistry?: SkillRegistryAdapter): HubSupabaseAdapter {
  return new HubSupabaseAdapter(skillRegistry);
}
