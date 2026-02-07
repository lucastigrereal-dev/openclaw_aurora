/**
 * ══════════════════════════════════════════════════════════════════════════════
 * HUB ADAPTER - Ponte entre Hub Enterprise existente e o novo contrato
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este adapter permite usar o Hub Enterprise existente (HubEnterpriseOrchestrator)
 * através da nova interface IHub definida nos contratos.
 */

import {
  IHub,
  HubManifest,
  HubExecutionRequest,
  HubExecutionResult,
  HubStatus,
  WorkflowDefinition,
  HubEvent,
  HubEventHandler,
  HubStepResult,
  HubMetrics,
} from '../contracts/hub.contract';
import { generateId } from '../contracts/types';

// Import do Hub Enterprise existente
import { HubEnterpriseOrchestrator } from '../skills/hub-enterprise/hub-enterprise-orchestrator';
import { SkillOutput } from '../skills/skill-base';

// ════════════════════════════════════════════════════════════════════════════
// MANIFESTS DOS HUBS EXISTENTES
// ════════════════════════════════════════════════════════════════════════════

const ENTERPRISE_MANIFEST: HubManifest = {
  name: 'enterprise',
  display_name: 'Hub Enterprise',
  description: 'Fábrica de aplicações com 9 personas especializadas',
  version: '1.0.0',
  category: 'development',
  status: 'active',
  author: 'OpenClaw Team',
  workflows: [
    {
      id: 'full',
      name: 'Full Pipeline',
      description: 'Executa todas as 9 personas em sequência',
      steps: [
        { id: 'produto', order: 0, description: 'Análise de produto', action_type: 'persona', target: 'S-01', optional: false, fail_safe: false },
        { id: 'arquitetura', order: 1, description: 'Design de arquitetura', action_type: 'persona', target: 'S-02', optional: false, fail_safe: false },
        { id: 'engenharia', order: 2, description: 'Implementação', action_type: 'persona', target: 'S-03', optional: false, fail_safe: false },
        { id: 'qa', order: 3, description: 'Testes', action_type: 'persona', target: 'S-04', optional: false, fail_safe: false },
        { id: 'ops', order: 4, description: 'DevOps', action_type: 'persona', target: 'S-05', optional: false, fail_safe: false },
        { id: 'security', order: 5, description: 'Segurança', action_type: 'persona', target: 'S-06', optional: false, fail_safe: false },
        { id: 'dados', order: 6, description: 'Dados', action_type: 'persona', target: 'S-07', optional: false, fail_safe: false },
        { id: 'design', order: 7, description: 'Design', action_type: 'persona', target: 'S-08', optional: false, fail_safe: false },
        { id: 'performance', order: 8, description: 'Performance', action_type: 'persona', target: 'S-09', optional: false, fail_safe: false },
      ],
      input_schema: {
        userIntent: { type: 'string', description: 'O que o usuário quer criar', required: true },
        appName: { type: 'string', description: 'Nome do app', required: true },
      },
      output_schema: {},
      risk_level: 'medium',
      estimated_duration_ms: 600000,
      cancellable: true,
      resumable: true,
    },
    {
      id: 'mvp-only',
      name: 'MVP Only',
      description: 'Apenas análise de produto (S-01)',
      steps: [
        { id: 'produto', order: 0, description: 'Análise de produto', action_type: 'persona', target: 'S-01', optional: false, fail_safe: false },
      ],
      input_schema: {
        userIntent: { type: 'string', description: 'O que o usuário quer criar', required: true },
        appName: { type: 'string', description: 'Nome do app', required: true },
      },
      output_schema: {},
      risk_level: 'low',
      estimated_duration_ms: 60000,
      cancellable: true,
      resumable: false,
    },
    {
      id: 'code-only',
      name: 'Code Only',
      description: 'Arquitetura + Engenharia (S-02, S-03)',
      steps: [
        { id: 'arquitetura', order: 0, description: 'Design', action_type: 'persona', target: 'S-02', optional: false, fail_safe: false },
        { id: 'engenharia', order: 1, description: 'Código', action_type: 'persona', target: 'S-03', optional: false, fail_safe: false },
      ],
      input_schema: {
        appName: { type: 'string', description: 'Nome do app', required: true },
      },
      output_schema: {},
      risk_level: 'medium',
      estimated_duration_ms: 180000,
      cancellable: true,
      resumable: true,
    },
    {
      id: 'test-only',
      name: 'Test Only',
      description: 'QA + Security + Performance',
      steps: [
        { id: 'qa', order: 0, description: 'Testes', action_type: 'persona', target: 'S-04', optional: false, fail_safe: false },
        { id: 'security', order: 1, description: 'Segurança', action_type: 'persona', target: 'S-06', optional: false, fail_safe: false },
        { id: 'performance', order: 2, description: 'Performance', action_type: 'persona', target: 'S-09', optional: false, fail_safe: false },
      ],
      input_schema: {
        appName: { type: 'string', description: 'Nome do app', required: true },
      },
      output_schema: {},
      risk_level: 'low',
      estimated_duration_ms: 120000,
      cancellable: true,
      resumable: true,
    },
    {
      id: 'incident-response',
      name: 'Incident Response',
      description: 'Resposta a incidentes (Ops + Dados + Ops + QA)',
      steps: [
        { id: 'ops-analyze', order: 0, description: 'Análise', action_type: 'persona', target: 'S-05', optional: false, fail_safe: false },
        { id: 'dados', order: 1, description: 'Dados', action_type: 'persona', target: 'S-07', optional: false, fail_safe: false },
        { id: 'ops-fix', order: 2, description: 'Fix', action_type: 'persona', target: 'S-05', optional: false, fail_safe: false },
        { id: 'qa', order: 3, description: 'Verificação', action_type: 'persona', target: 'S-04', optional: false, fail_safe: false },
      ],
      input_schema: {
        appName: { type: 'string', description: 'Nome do app', required: true },
        incident: { type: 'string', description: 'Descrição do incidente', required: true },
      },
      output_schema: {},
      risk_level: 'high',
      estimated_duration_ms: 300000,
      cancellable: true,
      resumable: true,
    },
    {
      id: 'feature-add',
      name: 'Feature Add',
      description: 'Adicionar feature (Produto + Arq + Eng + QA + Ops)',
      steps: [
        { id: 'produto', order: 0, description: 'Análise', action_type: 'persona', target: 'S-01', optional: false, fail_safe: false },
        { id: 'arquitetura', order: 1, description: 'Design', action_type: 'persona', target: 'S-02', optional: false, fail_safe: false },
        { id: 'engenharia', order: 2, description: 'Código', action_type: 'persona', target: 'S-03', optional: false, fail_safe: false },
        { id: 'qa', order: 3, description: 'Testes', action_type: 'persona', target: 'S-04', optional: false, fail_safe: false },
        { id: 'ops', order: 4, description: 'Deploy', action_type: 'persona', target: 'S-05', optional: false, fail_safe: false },
      ],
      input_schema: {
        userIntent: { type: 'string', description: 'Feature a adicionar', required: true },
        appName: { type: 'string', description: 'Nome do app', required: true },
      },
      output_schema: {},
      risk_level: 'medium',
      estimated_duration_ms: 300000,
      cancellable: true,
      resumable: true,
    },
  ],
  dependencies: [
    { skill: 'ai/claude', methods: ['generate', 'code'], required: true },
    { skill: 'exec/bash', methods: ['run'], required: true },
    { skill: 'file/ops', methods: ['read', 'write', 'list'], required: true },
  ],
  permissions_required: ['ai:invoke', 'file:read', 'file:write', 'process:spawn'],
  default_risk_level: 'medium',
  personas: [
    { id: 'S-01', name: 'Produto', role: 'Product Owner', description: 'Define MVP e requisitos', subskills: [], core_skills_used: ['ai/claude'], parallelizable: false },
    { id: 'S-02', name: 'Arquitetura', role: 'Architect', description: 'Design de sistema', subskills: [], core_skills_used: ['ai/claude'], parallelizable: false },
    { id: 'S-03', name: 'Engenharia', role: 'Engineer', description: 'Implementação', subskills: [], core_skills_used: ['ai/claude', 'file/ops'], parallelizable: false },
    { id: 'S-04', name: 'QA', role: 'QA Engineer', description: 'Testes', subskills: [], core_skills_used: ['ai/claude', 'exec/bash'], parallelizable: true },
    { id: 'S-05', name: 'Ops', role: 'DevOps', description: 'Infraestrutura', subskills: [], core_skills_used: ['exec/bash', 'file/ops'], parallelizable: true },
    { id: 'S-06', name: 'Security', role: 'Security', description: 'Segurança', subskills: [], core_skills_used: ['ai/claude'], parallelizable: true },
    { id: 'S-07', name: 'Dados', role: 'Data Engineer', description: 'Dados e analytics', subskills: [], core_skills_used: ['ai/claude'], parallelizable: true },
    { id: 'S-08', name: 'Design', role: 'Designer', description: 'UX/UI', subskills: [], core_skills_used: ['ai/claude'], parallelizable: true },
    { id: 'S-09', name: 'Performance', role: 'SRE', description: 'Performance', subskills: [], core_skills_used: ['ai/claude', 'exec/bash'], parallelizable: true },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// HUB ENTERPRISE ADAPTER
// ════════════════════════════════════════════════════════════════════════════

export class HubEnterpriseAdapter implements IHub {
  private orchestrator: HubEnterpriseOrchestrator;
  private _manifest: HubManifest = ENTERPRISE_MANIFEST;
  private config: Record<string, any> = {};
  private eventHandlers: Set<HubEventHandler> = new Set();
  private activeExecutions: Map<string, { cancelled: boolean }> = new Map();

  constructor() {
    this.orchestrator = new HubEnterpriseOrchestrator();
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
    this.activeExecutions.set(request.execution_id, { cancelled: false });

    this.emitEvent({
      type: 'WORKFLOW_STARTED',
      execution_id: request.execution_id,
      workflow: request.workflow,
    });

    try {
      // Converte request para formato do orchestrator existente
      const input = {
        params: {
          workflow: request.workflow,
          userIntent: request.params.userIntent,
          appName: request.params.appName,
          ...request.params,
        },
      };

      // Valida input
      if (!this.orchestrator.validate(input)) {
        return this.errorResult(request.execution_id, 'VALIDATION_ERROR', 'Invalid input parameters', startTime);
      }

      // Verifica se foi cancelado
      if (this.activeExecutions.get(request.execution_id)?.cancelled) {
        return this.cancelledResult(request.execution_id, startTime);
      }

      // Executa via orchestrator existente
      const result: SkillOutput = await this.orchestrator.run(input);

      // Converte resultado
      return this.convertResult(request.execution_id, request.workflow, result, startTime);
    } catch (error) {
      return this.errorResult(
        request.execution_id,
        'EXECUTION_ERROR',
        error instanceof Error ? error.message : String(error),
        startTime
      );
    } finally {
      this.activeExecutions.delete(request.execution_id);
    }
  }

  listWorkflows(): WorkflowDefinition[] {
    return this._manifest.workflows;
  }

  getWorkflow(workflow_id: string): WorkflowDefinition | null {
    return this._manifest.workflows.find((w) => w.id === workflow_id) || null;
  }

  validateParams(workflow_id: string, params: Record<string, any>): { valid: boolean; errors?: Array<{ field: string; message: string; code: string }> } {
    const workflow = this.getWorkflow(workflow_id);
    if (!workflow) {
      return { valid: false, errors: [{ field: 'workflow', message: 'Workflow not found', code: 'NOT_FOUND' }] };
    }

    const errors: Array<{ field: string; message: string; code: string }> = [];

    for (const [field, schema] of Object.entries(workflow.input_schema)) {
      if (schema.required && !params[field]) {
        errors.push({ field, message: `${field} is required`, code: 'REQUIRED' });
      }
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  getStatus(): HubStatus {
    return 'active';
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

    this.emitEvent({
      type: 'WORKFLOW_CANCELLED',
      execution_id,
    });
  }

  async resumeFromCheckpoint(execution_id: string, checkpoint: Record<string, any>): Promise<HubExecutionResult> {
    // Hub Enterprise não suporta resume ainda
    return this.errorResult(execution_id, 'NOT_SUPPORTED', 'Resume not supported yet', Date.now());
  }

  async shutdown(): Promise<void> {
    // Cancela todas as execuções ativas
    for (const [id] of this.activeExecutions) {
      await this.cancelExecution(id);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Eventos
  // ──────────────────────────────────────────────────────────────────────────

  onEvent(handler: HubEventHandler): void {
    this.eventHandlers.add(handler);
  }

  offEvent(handler: HubEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  private emitEvent(event: HubEvent): void {
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('[HubAdapter] Event handler error:', error);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers de conversão
  // ──────────────────────────────────────────────────────────────────────────

  private convertResult(
    execution_id: string,
    workflow: string,
    result: SkillOutput,
    startTime: number
  ): HubExecutionResult {
    const completedAt = Date.now();

    if (result.success && result.data) {
      const data = result.data;
      const stepResults: HubStepResult[] = (data.workflowSteps || []).map((step: any) => ({
        step_id: step.name || 'unknown',
        status: step.status === 'success' ? 'completed' : 'failed',
        output: step.output,
        duration_ms: step.duration || 0,
      }));

      this.emitEvent({
        type: 'WORKFLOW_COMPLETED',
        execution_id,
        result: {
          execution_id,
          status: 'completed',
          output: data,
          step_results: stepResults,
          metrics: {
            total_duration_ms: completedAt - startTime,
            steps_executed: stepResults.length,
            steps_failed: stepResults.filter((s) => s.status === 'failed').length,
          },
        },
      });

      return {
        execution_id,
        status: 'completed',
        output: data,
        step_results: stepResults,
        metrics: {
          total_duration_ms: completedAt - startTime,
          steps_executed: stepResults.length,
          steps_failed: stepResults.filter((s) => s.status === 'failed').length,
        },
      };
    }

    return this.errorResult(execution_id, 'WORKFLOW_FAILED', result.error || 'Unknown error', startTime);
  }

  private errorResult(execution_id: string, code: string, message: string, startTime: number): HubExecutionResult {
    const error = { code, message, recoverable: true };

    this.emitEvent({
      type: 'WORKFLOW_FAILED',
      execution_id,
      error,
    });

    return {
      execution_id,
      status: 'failed',
      output: {},
      step_results: [],
      error,
      metrics: {
        total_duration_ms: Date.now() - startTime,
        steps_executed: 0,
        steps_failed: 0,
      },
    };
  }

  private cancelledResult(execution_id: string, startTime: number): HubExecutionResult {
    return {
      execution_id,
      status: 'cancelled',
      output: {},
      step_results: [],
      metrics: {
        total_duration_ms: Date.now() - startTime,
        steps_executed: 0,
        steps_failed: 0,
      },
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

let hubEnterpriseInstance: HubEnterpriseAdapter | null = null;

export function getHubEnterpriseAdapter(): HubEnterpriseAdapter {
  if (!hubEnterpriseInstance) {
    hubEnterpriseInstance = new HubEnterpriseAdapter();
  }
  return hubEnterpriseInstance;
}

export function createHubEnterpriseAdapter(): HubEnterpriseAdapter {
  return new HubEnterpriseAdapter();
}

// Exporta o manifest para referência
export { ENTERPRISE_MANIFEST };
