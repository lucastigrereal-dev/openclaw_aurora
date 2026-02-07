/**
 * ══════════════════════════════════════════════════════════════════════════════
 * OPERATOR ADAPTER - O Cérebro Adaptado
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este adapter implementa a interface IOperator usando os componentes existentes:
 * - SkillRegistryAdapter para skills
 * - AuroraAdapter para autorização
 * - HubEnterpriseAdapter para hubs
 *
 * FLUXO:
 * 1. Recebe intenção
 * 2. Roteia para skill ou hub
 * 3. Pede autorização à Aurora
 * 4. Executa
 * 5. Retorna resultado
 */

import {
  IOperator,
  UserIntent,
  ExecutionPlan,
  ExecutionResult,
  ExecutionStep,
  ExecutionStatus,
  StepResult,
  ExecutionMetrics,
  ExecutionCheckpoint,
  SkillRegistration,
  HubRegistration,
  OperatorEvent,
  OperatorEventHandler,
  IntentType,
} from '../contracts/operator.contract';
import {
  generateId,
  ExecutionLimits,
  DEFAULT_LIMITS,
  EMPTY_RESOURCES,
  RiskLevel,
  Permission,
} from '../contracts/types';
import { AuthorizationRequest } from '../contracts/aurora.contract';
import { SkillRegistryAdapter, getSkillRegistryAdapter } from './skill.adapter';
import { AuroraAdapter, getAuroraAdapter } from './aurora.adapter';
import { HubEnterpriseAdapter, getHubEnterpriseAdapter } from './hub.adapter';

// ════════════════════════════════════════════════════════════════════════════
// OPERATOR ADAPTER
// ════════════════════════════════════════════════════════════════════════════

export class OperatorAdapter implements IOperator {
  private skillRegistry: SkillRegistryAdapter;
  private aurora: AuroraAdapter;
  private hubEnterprise: HubEnterpriseAdapter;
  private eventHandlers: Set<OperatorEventHandler> = new Set();
  private activeExecutions: Map<string, { plan: ExecutionPlan; status: ExecutionStatus }> = new Map();
  private checkpoints: Map<string, ExecutionCheckpoint> = new Map();

  constructor(
    skillRegistry?: SkillRegistryAdapter,
    aurora?: AuroraAdapter,
    hubEnterprise?: HubEnterpriseAdapter
  ) {
    this.skillRegistry = skillRegistry || getSkillRegistryAdapter();
    this.aurora = aurora || getAuroraAdapter();
    this.hubEnterprise = hubEnterprise || getHubEnterpriseAdapter();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PROCESSAMENTO PRINCIPAL
  // ──────────────────────────────────────────────────────────────────────────

  async processIntent(intent: UserIntent): Promise<ExecutionResult> {
    this.emitEvent({ type: 'INTENT_RECEIVED', intent });

    // 1. Criar plano
    const plan = await this.createPlan(intent);
    this.emitEvent({ type: 'PLAN_CREATED', plan });

    // 2. Executar plano
    return this.executePlan(plan);
  }

  /**
   * Cria um AuthorizationRequest a partir de um plano (para uso externo)
   */
  createAuthorizationRequest(plan: ExecutionPlan): AuthorizationRequest {
    return {
      request_id: generateId('auth'),
      plan_id: plan.plan_id,
      intent_id: plan.intent_id,
      origin: 'api',
      plan,
      resources: plan.resources,
      risk_level: plan.risk_level,
      permissions_required: plan.permissions_required,
      suggested_limits: plan.suggested_limits,
      mode: plan.mode,
      timestamp: new Date(),
    };
  }

  async createPlan(intent: UserIntent): Promise<ExecutionPlan> {
    const plan_id = generateId('plan');

    // Classificar intenção
    const intentType = intent.classified_type || this.classifyIntent(intent.raw_input);

    // Determinar se é skill ou hub
    const isHub = intentType.startsWith('hub:');
    const target = this.resolveTarget(intentType);

    // Criar step baseado no tipo
    const steps: ExecutionStep[] = [
      {
        step_id: generateId('step'),
        order: 0,
        action_type: isHub ? 'hub' : 'skill',
        target,
        method: isHub ? this.extractWorkflow(intent) : 'execute',
        params: this.extractParams(intent),
        reversible: false,
        description: `Execute ${target}`,
      },
    ];

    // Determinar risco
    const riskLevel = this.assessRisk(intentType, intent);

    return {
      plan_id,
      intent_id: intent.intent_id,
      steps,
      resources: EMPTY_RESOURCES,
      risk_level: riskLevel,
      permissions_required: this.getRequiredPermissions(intentType),
      suggested_limits: DEFAULT_LIMITS,
      mode: 'real',
      hub: isHub ? target : undefined,
      estimated_duration_ms: isHub ? 60000 : 30000,
    };
  }

  async executePlan(plan: ExecutionPlan): Promise<ExecutionResult> {
    const startedAt = new Date();
    this.activeExecutions.set(plan.plan_id, { plan, status: 'queued' });

    // 1. Pedir autorização à Aurora
    this.emitEvent({ type: 'AUTHORIZATION_REQUESTED', plan_id: plan.plan_id });

    const authRequest: AuthorizationRequest = {
      request_id: generateId('auth'),
      plan_id: plan.plan_id,
      intent_id: plan.intent_id,
      origin: 'internal',
      plan,
      resources: plan.resources,
      risk_level: plan.risk_level,
      permissions_required: plan.permissions_required,
      suggested_limits: plan.suggested_limits,
      mode: plan.mode,
      timestamp: new Date(),
    };

    const authResponse = await this.aurora.authorize(authRequest);

    if (authResponse.decision === 'blocked') {
      this.emitEvent({ type: 'AUTHORIZATION_DENIED', plan_id: plan.plan_id, reason: authResponse.reason });
      return this.failedResult(plan.plan_id, 'AUTHORIZATION_DENIED', authResponse.reason, startedAt);
    }

    if (authResponse.decision === 'requires_confirmation') {
      // Por enquanto, auto-confirma para smoke test
      // Em produção, isso pausaria e aguardaria input humano
      console.log('[Operator] Auto-confirming for smoke test...');
    }

    this.emitEvent({ type: 'AUTHORIZATION_GRANTED', plan_id: plan.plan_id });
    this.activeExecutions.set(plan.plan_id, { plan, status: 'authorized' });

    // 2. Iniciar monitoramento Aurora
    await this.aurora.startMonitoring(plan.plan_id);

    // 3. Executar steps
    this.emitEvent({ type: 'EXECUTION_STARTED', plan_id: plan.plan_id });
    this.activeExecutions.set(plan.plan_id, { plan, status: 'running' });

    const stepResults: StepResult[] = [];
    let finalOutput: any = null;

    for (const step of plan.steps) {
      this.emitEvent({ type: 'STEP_STARTED', plan_id: plan.plan_id, step_id: step.step_id });

      const stepStarted = new Date();
      try {
        const result = await this.executeStep(step, plan);

        const stepResult: StepResult = {
          step_id: step.step_id,
          status: result.success ? 'completed' : 'failed',
          output: result.output,
          error: result.error ? { code: 'STEP_ERROR', message: result.error, recoverable: true } : undefined,
          duration_ms: Date.now() - stepStarted.getTime(),
          retries: 0,
          started_at: stepStarted,
          completed_at: new Date(),
        };

        stepResults.push(stepResult);

        if (result.success) {
          finalOutput = result.output;
          this.emitEvent({ type: 'STEP_COMPLETED', plan_id: plan.plan_id, step_id: step.step_id, result: stepResult });
        } else {
          this.emitEvent({ type: 'STEP_FAILED', plan_id: plan.plan_id, step_id: step.step_id, error: stepResult.error! });
          break;
        }

        // Reportar progresso à Aurora
        await this.aurora.reportStepProgress(plan.plan_id, step.step_id, 'completed');
      } catch (error) {
        const stepResult: StepResult = {
          step_id: step.step_id,
          status: 'failed',
          error: {
            code: 'EXCEPTION',
            message: error instanceof Error ? error.message : String(error),
            recoverable: true,
          },
          duration_ms: Date.now() - stepStarted.getTime(),
          retries: 0,
          started_at: stepStarted,
          completed_at: new Date(),
        };
        stepResults.push(stepResult);
        this.emitEvent({ type: 'STEP_FAILED', plan_id: plan.plan_id, step_id: step.step_id, error: stepResult.error! });
        break;
      }
    }

    // 4. Parar monitoramento
    await this.aurora.stopMonitoring(plan.plan_id);

    // 5. Montar resultado final
    const completedAt = new Date();
    const allSuccess = stepResults.every((s) => s.status === 'completed');

    const metrics: ExecutionMetrics = {
      total_duration_ms: completedAt.getTime() - startedAt.getTime(),
      steps_total: plan.steps.length,
      steps_completed: stepResults.filter((s) => s.status === 'completed').length,
      steps_failed: stepResults.filter((s) => s.status === 'failed').length,
      steps_skipped: stepResults.filter((s) => s.status === 'skipped').length,
      files_changed: 0,
      bytes_written: 0,
      external_requests: 0,
      ai_tokens_used: 0,
      retries_total: 0,
    };

    const result: ExecutionResult = {
      plan_id: plan.plan_id,
      status: allSuccess ? 'completed' : 'failed',
      step_results: stepResults,
      final_output: finalOutput,
      error: allSuccess ? undefined : stepResults.find((s) => s.error)?.error,
      metrics,
      resumable: false,
      rollback_available: false,
      started_at: startedAt,
      completed_at: completedAt,
    };

    this.emitEvent({ type: 'EXECUTION_COMPLETED', plan_id: plan.plan_id, result });
    this.activeExecutions.delete(plan.plan_id);

    return result;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EXECUÇÃO DE STEP
  // ──────────────────────────────────────────────────────────────────────────

  private async executeStep(step: ExecutionStep, plan: ExecutionPlan): Promise<{ success: boolean; output?: any; error?: string }> {
    if (step.action_type === 'skill') {
      // Executar skill
      const result = await this.skillRegistry.execute(step.target, step.params);
      return {
        success: result.status === 'completed',
        output: result.output,
        error: result.error?.message,
      };
    }

    if (step.action_type === 'hub') {
      // Executar hub
      const result = await this.hubEnterprise.executeWorkflow({
        execution_id: generateId('hub_exec'),
        hub: 'enterprise',
        workflow: step.method,
        params: step.params,
        operator_context: {
          plan_id: plan.plan_id,
          step_id: step.step_id,
          session_id: plan.intent_id,
        },
      });

      return {
        success: result.status === 'completed',
        output: result.output,
        error: result.error?.message,
      };
    }

    return { success: false, error: `Unknown action type: ${step.action_type}` };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OUTROS MÉTODOS DA INTERFACE
  // ──────────────────────────────────────────────────────────────────────────

  async resumeFromCheckpoint(checkpoint_id: string): Promise<ExecutionResult> {
    const checkpoint = this.checkpoints.get(checkpoint_id);
    if (!checkpoint) {
      return this.failedResult(checkpoint_id, 'CHECKPOINT_NOT_FOUND', 'Checkpoint not found', new Date());
    }
    // TODO: Implementar resume
    return this.failedResult(checkpoint_id, 'NOT_IMPLEMENTED', 'Resume not implemented yet', new Date());
  }

  async cancelExecution(plan_id: string, reason: string): Promise<void> {
    const execution = this.activeExecutions.get(plan_id);
    if (execution) {
      execution.status = 'cancelled';
      this.emitEvent({ type: 'EXECUTION_CANCELLED', plan_id, reason });
    }
  }

  async rollbackExecution(plan_id: string): Promise<void> {
    this.emitEvent({ type: 'ROLLBACK_STARTED', plan_id });
    // TODO: Implementar rollback
    this.emitEvent({ type: 'ROLLBACK_COMPLETED', plan_id });
  }

  async getExecutionStatus(plan_id: string): Promise<ExecutionStatus> {
    const execution = this.activeExecutions.get(plan_id);
    return execution?.status || 'completed';
  }

  async listActiveExecutions(): Promise<ExecutionPlan[]> {
    return Array.from(this.activeExecutions.values()).map((e) => e.plan);
  }

  registerSkill(skill: SkillRegistration): void {
    console.log(`[Operator] Skill registered: ${skill.name}`);
  }

  registerHub(hub: HubRegistration): void {
    console.log(`[Operator] Hub registered: ${hub.name}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  private classifyIntent(rawInput: string): IntentType {
    const lower = rawInput.toLowerCase();

    // Hub patterns
    if (lower.includes('criar app') || lower.includes('criar aplicação') || lower.includes('build app')) {
      return 'hub:enterprise';
    }

    // Skill patterns
    if (lower.includes('gerar') || lower.includes('escrever') || lower.includes('criar texto')) {
      return 'ai:generate';
    }
    if (lower.includes('executar') || lower.includes('rodar') || lower.includes('run')) {
      return 'exec:command';
    }
    if (lower.includes('ler arquivo') || lower.includes('read file')) {
      return 'file:read';
    }

    return 'unknown';
  }

  private resolveTarget(intentType: IntentType): string {
    const map: Record<string, string> = {
      'hub:enterprise': 'enterprise',
      'ai:generate': 'ai.claude',
      'ai:analyze': 'ai.claude',
      'exec:command': 'exec.bash',
      'file:read': 'file.ops',
      'file:write': 'file.ops',
    };
    return map[intentType] || 'ai.claude';
  }

  private extractWorkflow(intent: UserIntent): string {
    // Por padrão, usa mvp-only para testes
    return intent.entities?.workflow || 'mvp-only';
  }

  private extractParams(intent: UserIntent): Record<string, any> {
    return {
      prompt: intent.raw_input,
      userIntent: intent.raw_input,
      appName: intent.entities?.appName || 'test-app',
      ...intent.entities,
    };
  }

  private assessRisk(intentType: IntentType, intent: UserIntent): RiskLevel {
    if (intentType.startsWith('hub:')) return 'medium';
    if (intentType.startsWith('exec:')) return 'medium';
    if (intentType.startsWith('file:write') || intentType.startsWith('file:delete')) return 'medium';
    return 'low';
  }

  private getRequiredPermissions(intentType: IntentType): Permission[] {
    const map: Record<string, Permission[]> = {
      'hub:enterprise': ['ai:invoke', 'file:read', 'file:write'],
      'ai:generate': ['ai:invoke'],
      'exec:command': ['process:spawn'],
      'file:read': ['file:read'],
      'file:write': ['file:write'],
    };
    return map[intentType] || [];
  }

  private failedResult(plan_id: string, code: string, message: string, startedAt: Date): ExecutionResult {
    return {
      plan_id,
      status: 'failed',
      step_results: [],
      final_output: null,
      error: { code, message },
      metrics: {
        total_duration_ms: Date.now() - startedAt.getTime(),
        steps_total: 0,
        steps_completed: 0,
        steps_failed: 0,
        steps_skipped: 0,
        files_changed: 0,
        bytes_written: 0,
        external_requests: 0,
        ai_tokens_used: 0,
        retries_total: 0,
      },
      resumable: false,
      rollback_available: false,
      started_at: startedAt,
      completed_at: new Date(),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EVENTOS
  // ──────────────────────────────────────────────────────────────────────────

  onEvent(handler: OperatorEventHandler): void {
    this.eventHandlers.add(handler);
  }

  offEvent(handler: OperatorEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  private emitEvent(event: OperatorEvent): void {
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('[Operator] Event handler error:', error);
      }
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

let operatorInstance: OperatorAdapter | null = null;

export function getOperatorAdapter(): OperatorAdapter {
  if (!operatorInstance) {
    operatorInstance = new OperatorAdapter();
  }
  return operatorInstance;
}

export function createOperatorAdapter(
  skillRegistry?: SkillRegistryAdapter,
  aurora?: AuroraAdapter,
  hubEnterprise?: HubEnterpriseAdapter
): OperatorAdapter {
  return new OperatorAdapter(skillRegistry, aurora, hubEnterprise);
}
