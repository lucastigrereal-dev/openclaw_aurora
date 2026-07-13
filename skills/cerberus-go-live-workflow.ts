import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import {
  Skill,
  SkillInput,
  SkillOutput,
  SkillRegistry,
  getSkillRegistry,
} from './skill-base';

export type WorkflowOperation = 'init' | 'run' | 'resume' | 'status' | 'approve' | 'reset';
export type WorkflowStepStatus =
  | 'pending'
  | 'running'
  | 'waiting_approval'
  | 'succeeded'
  | 'failed'
  | 'blocked';
export type WorkflowStatus =
  | 'idle'
  | 'running'
  | 'waiting_approval'
  | 'succeeded'
  | 'failed'
  | 'blocked';

export interface WorkflowStepDefinition {
  id: string;
  title: string;
  skill: string;
  input: SkillInput;
  dependsOn?: string[];
  requiresApproval?: boolean;
  maxAttempts?: number;
  evidenceKeys?: string[];
}

export interface WorkflowTrackDefinition {
  id: string;
  title: string;
  steps: WorkflowStepDefinition[];
}

export interface WorkflowPlan {
  id: string;
  name: string;
  version: string;
  tracks: WorkflowTrackDefinition[];
}

export interface WorkflowStepState {
  id: string;
  trackId: string;
  title: string;
  status: WorkflowStepStatus;
  attempts: number;
  approved: boolean;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  evidence?: unknown;
}

export interface WorkflowState {
  workflowId: string;
  workflowName: string;
  planHash: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  plan: WorkflowPlan;
  steps: Record<string, WorkflowStepState>;
}

export interface CerberusGoLiveInput extends SkillInput {
  operation: WorkflowOperation;
  statePath: string;
  plan?: WorkflowPlan;
  planPath?: string;
  approvalStepId?: string;
  concurrency?: number;
  dryRun?: boolean;
}

export interface WorkflowSummary {
  workflowId: string;
  name: string;
  status: WorkflowStatus;
  progress: number;
  counts: Record<WorkflowStepStatus, number>;
  waitingApprovals: string[];
  failedSteps: string[];
  blockedSteps: string[];
  nextActions: string[];
}

export interface CerberusGoLiveOutput extends SkillOutput {
  data?: {
    state?: WorkflowState;
    summary?: WorkflowSummary;
    approvedStepId?: string;
    reset?: boolean;
  };
}

interface StepExecutionResult {
  stepId: string;
  result: SkillOutput;
}

export class CerberusGoLiveWorkflow extends Skill {
  constructor(private readonly registry: SkillRegistry = getSkillRegistry()) {
    super(
      {
        name: 'cerberus.go-live',
        description: 'Orquestra missões paralelas com dependências, aprovações, evidências e retomada',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Aurora CEO',
        tags: ['cerberus', 'workflow', 'orchestration', 'go-live'],
      },
      { timeout: 30 * 60 * 1000, retries: 0 }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as CerberusGoLiveInput;
    if (!typed.operation || !typed.statePath) return false;
    if (typed.operation === 'init' && !typed.plan && !typed.planPath) return false;
    if (typed.operation === 'approve' && !typed.approvalStepId) return false;
    return true;
  }

  async execute(input: SkillInput): Promise<CerberusGoLiveOutput> {
    const typed = input as CerberusGoLiveInput;

    try {
      switch (typed.operation) {
        case 'init':
          return await this.initialize(typed);
        case 'run':
        case 'resume':
          return await this.runWorkflow(typed);
        case 'status':
          return await this.getStatus(typed.statePath);
        case 'approve':
          return await this.approveStep(typed.statePath, typed.approvalStepId!);
        case 'reset':
          await fs.rm(typed.statePath, { force: true });
          return { success: true, data: { reset: true } };
        default:
          return { success: false, error: `Unsupported operation: ${typed.operation}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async initialize(input: CerberusGoLiveInput): Promise<CerberusGoLiveOutput> {
    const plan = input.plan ?? JSON.parse(await fs.readFile(input.planPath!, 'utf-8')) as WorkflowPlan;
    this.validatePlan(plan);

    const now = new Date().toISOString();
    const steps: Record<string, WorkflowStepState> = {};
    for (const track of plan.tracks) {
      for (const step of track.steps) {
        steps[step.id] = {
          id: step.id,
          trackId: track.id,
          title: step.title,
          status: 'pending',
          attempts: 0,
          approved: !step.requiresApproval,
        };
      }
    }

    const state: WorkflowState = {
      workflowId: plan.id,
      workflowName: plan.name,
      planHash: this.hashPlan(plan),
      status: 'idle',
      createdAt: now,
      updatedAt: now,
      plan,
      steps,
    };

    await this.saveState(input.statePath, state);
    return { success: true, data: { state, summary: this.summarize(state) } };
  }

  private async runWorkflow(input: CerberusGoLiveInput): Promise<CerberusGoLiveOutput> {
    const state = await this.loadState(input.statePath);
    const concurrency = Math.max(1, Math.min(input.concurrency ?? 3, 10));

    while (true) {
      this.blockDependentsOfFailures(state);
      this.activateApprovalGates(state);

      const ready = this.getReadySteps(state).slice(0, concurrency);
      if (ready.length === 0) break;

      state.status = 'running';
      const startedAt = new Date().toISOString();
      for (const step of ready) {
        const stepState = state.steps[step.id];
        stepState.status = 'running';
        stepState.attempts += 1;
        stepState.startedAt = startedAt;
        stepState.error = undefined;
      }
      await this.saveState(input.statePath, state);

      const executions = await Promise.all(
        ready.map(step => this.executeStep(step, Boolean(input.dryRun)))
      );
      this.applyExecutionResults(state, executions);
      await this.saveState(input.statePath, state);
    }

    this.updateWorkflowStatus(state);
    await this.saveState(input.statePath, state);
    const summary = this.summarize(state);
    return {
      success: state.status !== 'failed' && state.status !== 'blocked',
      data: { state, summary },
      error: state.status === 'failed' || state.status === 'blocked'
        ? 'Workflow stopped with failed or blocked steps'
        : undefined,
    };
  }

  private async executeStep(
    step: WorkflowStepDefinition,
    dryRun: boolean
  ): Promise<StepExecutionResult> {
    if (dryRun) {
      return {
        stepId: step.id,
        result: { success: true, data: { dryRun: true, skill: step.skill, input: step.input } },
      };
    }

    const result = await this.registry.execute(step.skill, step.input);
    if (result.success && step.evidenceKeys?.length) {
      const missing = step.evidenceKeys.filter(key => this.getNestedValue(result.data, key) === undefined);
      if (missing.length) {
        return {
          stepId: step.id,
          result: { success: false, error: `Missing evidence keys: ${missing.join(', ')}`, data: result.data },
        };
      }
    }
    return { stepId: step.id, result };
  }

  private applyExecutionResults(state: WorkflowState, executions: StepExecutionResult[]): void {
    const now = new Date().toISOString();
    for (const execution of executions) {
      const stepState = state.steps[execution.stepId];
      const definition = this.getStepDefinition(state.plan, execution.stepId);
      if (execution.result.success) {
        stepState.status = 'succeeded';
        stepState.completedAt = now;
        stepState.evidence = execution.result.data;
        stepState.error = undefined;
      } else if (stepState.attempts < (definition.maxAttempts ?? 1)) {
        stepState.status = 'pending';
        stepState.error = execution.result.error ?? 'Unknown error';
      } else {
        stepState.status = 'failed';
        stepState.completedAt = now;
        stepState.error = execution.result.error ?? 'Unknown error';
        stepState.evidence = execution.result.data;
      }
    }
  }

  private getReadySteps(state: WorkflowState): WorkflowStepDefinition[] {
    return this.flattenSteps(state.plan).filter(step => {
      const stepState = state.steps[step.id];
      if (stepState.status !== 'pending' || !stepState.approved) return false;
      return (step.dependsOn ?? []).every(id => state.steps[id]?.status === 'succeeded');
    });
  }

  private activateApprovalGates(state: WorkflowState): void {
    for (const step of this.flattenSteps(state.plan)) {
      const stepState = state.steps[step.id];
      if (!step.requiresApproval || stepState.approved || stepState.status !== 'pending') continue;
      const dependenciesSucceeded = (step.dependsOn ?? [])
        .every(id => state.steps[id]?.status === 'succeeded');
      if (dependenciesSucceeded) stepState.status = 'waiting_approval';
    }
  }

  private blockDependentsOfFailures(state: WorkflowState): void {
    let changed = true;
    while (changed) {
      changed = false;
      for (const step of this.flattenSteps(state.plan)) {
        const stepState = state.steps[step.id];
        if (!['pending', 'waiting_approval'].includes(stepState.status)) continue;
        const badDependency = (step.dependsOn ?? []).find(id =>
          ['failed', 'blocked'].includes(state.steps[id]?.status)
        );
        if (badDependency) {
          stepState.status = 'blocked';
          stepState.error = `Blocked by dependency: ${badDependency}`;
          changed = true;
        }
      }
    }
  }

  private async approveStep(statePath: string, stepId: string): Promise<CerberusGoLiveOutput> {
    const state = await this.loadState(statePath);
    const definition = this.getStepDefinition(state.plan, stepId);
    if (!definition.requiresApproval) {
      return { success: false, error: `Step does not require approval: ${stepId}` };
    }
    const stepState = state.steps[stepId];
    if (!stepState || !['pending', 'waiting_approval'].includes(stepState.status)) {
      return { success: false, error: `Step cannot be approved in status: ${stepState?.status ?? 'missing'}` };
    }
    stepState.approved = true;
    stepState.status = 'pending';
    stepState.error = undefined;
    this.updateWorkflowStatus(state);
    await this.saveState(statePath, state);
    return {
      success: true,
      data: { approvedStepId: stepId, state, summary: this.summarize(state) },
    };
  }

  private async getStatus(statePath: string): Promise<CerberusGoLiveOutput> {
    const state = await this.loadState(statePath);
    this.updateWorkflowStatus(state);
    return { success: true, data: { state, summary: this.summarize(state) } };
  }

  private updateWorkflowStatus(state: WorkflowState): void {
    const statuses = Object.values(state.steps).map(step => step.status);
    if (statuses.every(status => status === 'succeeded')) state.status = 'succeeded';
    else if (statuses.some(status => status === 'running')) state.status = 'running';
    else if (statuses.some(status => status === 'waiting_approval')) state.status = 'waiting_approval';
    else if (statuses.some(status => status === 'failed')) state.status = 'failed';
    else if (statuses.some(status => status === 'blocked')) state.status = 'blocked';
    else state.status = 'idle';
  }

  private summarize(state: WorkflowState): WorkflowSummary {
    const counts: Record<WorkflowStepStatus, number> = {
      pending: 0,
      running: 0,
      waiting_approval: 0,
      succeeded: 0,
      failed: 0,
      blocked: 0,
    };
    for (const step of Object.values(state.steps)) counts[step.status] += 1;
    const total = Object.keys(state.steps).length || 1;
    const ready = this.getReadySteps(state).map(step => step.id);
    const waitingApprovals = Object.values(state.steps)
      .filter(step => step.status === 'waiting_approval')
      .map(step => step.id);
    const failedSteps = Object.values(state.steps)
      .filter(step => step.status === 'failed')
      .map(step => step.id);
    const blockedSteps = Object.values(state.steps)
      .filter(step => step.status === 'blocked')
      .map(step => step.id);

    const nextActions = waitingApprovals.length
      ? waitingApprovals.map(id => `Approve ${id}`)
      : failedSteps.length
        ? failedSteps.map(id => `Inspect failure ${id}`)
        : ready.length
          ? ready.map(id => `Run ${id}`)
          : state.status === 'succeeded'
            ? ['Workflow complete']
            : ['Resolve dependencies or initialize workflow'];

    return {
      workflowId: state.workflowId,
      name: state.workflowName,
      status: state.status,
      progress: Math.round((counts.succeeded / total) * 100),
      counts,
      waitingApprovals,
      failedSteps,
      blockedSteps,
      nextActions,
    };
  }

  private validatePlan(plan: WorkflowPlan): void {
    if (!plan.id || !plan.name || !plan.version || !plan.tracks?.length) {
      throw new Error('Plan must include id, name, version and at least one track');
    }
    const steps = this.flattenSteps(plan);
    if (!steps.length) throw new Error('Plan must include at least one step');
    const ids = new Set<string>();
    for (const step of steps) {
      if (!step.id || !step.title || !step.skill) throw new Error('Every step needs id, title and skill');
      if (ids.has(step.id)) throw new Error(`Duplicate step id: ${step.id}`);
      ids.add(step.id);
    }
    for (const step of steps) {
      for (const dependency of step.dependsOn ?? []) {
        if (!ids.has(dependency)) throw new Error(`Unknown dependency ${dependency} in ${step.id}`);
        if (dependency === step.id) throw new Error(`Step cannot depend on itself: ${step.id}`);
      }
    }
    this.assertAcyclic(steps);
  }

  private assertAcyclic(steps: WorkflowStepDefinition[]): void {
    const map = new Map(steps.map(step => [step.id, step]));
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (id: string): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) throw new Error(`Cyclic dependency detected at ${id}`);
      visiting.add(id);
      for (const dependency of map.get(id)?.dependsOn ?? []) visit(dependency);
      visiting.delete(id);
      visited.add(id);
    };
    for (const step of steps) visit(step.id);
  }

  private flattenSteps(plan: WorkflowPlan): WorkflowStepDefinition[] {
    return plan.tracks.flatMap(track => track.steps);
  }

  private getStepDefinition(plan: WorkflowPlan, stepId: string): WorkflowStepDefinition {
    const step = this.flattenSteps(plan).find(item => item.id === stepId);
    if (!step) throw new Error(`Unknown step: ${stepId}`);
    return step;
  }

  private hashPlan(plan: WorkflowPlan): string {
    return createHash('sha256').update(JSON.stringify(plan)).digest('hex');
  }

  private async loadState(statePath: string): Promise<WorkflowState> {
    const content = await fs.readFile(statePath, 'utf-8');
    return JSON.parse(content) as WorkflowState;
  }

  private async saveState(statePath: string, state: WorkflowState): Promise<void> {
    state.updatedAt = new Date().toISOString();
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    const temporary = `${statePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(state, null, 2), 'utf-8');
    try {
      await fs.rename(temporary, statePath);
    } catch {
      await fs.rm(statePath, { force: true });
      await fs.rename(temporary, statePath);
    }
  }

  private getNestedValue(value: unknown, key: string): unknown {
    return key.split('.').reduce<unknown>((current, part) => {
      if (current && typeof current === 'object' && part in current) {
        return (current as Record<string, unknown>)[part];
      }
      return undefined;
    }, value);
  }
}
