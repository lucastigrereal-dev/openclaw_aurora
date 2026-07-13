import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { Skill, SkillInput, SkillOutput, SkillRegistry } from './skills/skill-base';
import {
  CerberusGoLiveWorkflow,
  WorkflowPlan,
  WorkflowState,
} from './skills/cerberus-go-live-workflow';

interface Tracker {
  active: number;
  maxActive: number;
  calls: string[];
}

class TestStepSkill extends Skill {
  constructor(private readonly tracker: Tracker) {
    super({
      name: 'test.step',
      description: 'Test workflow step',
      version: '1.0.0',
      category: 'UTIL',
    });
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const id = String(input.id);
    const delay = Number(input.delay ?? 5);
    this.tracker.active += 1;
    this.tracker.maxActive = Math.max(this.tracker.maxActive, this.tracker.active);
    await new Promise(resolve => setTimeout(resolve, delay));
    this.tracker.calls.push(id);
    this.tracker.active -= 1;
    if (input.fail) return { success: false, error: `forced failure: ${id}` };
    return { success: true, data: { evidence: { id } } };
  }
}

function makeRegistry(tracker: Tracker): SkillRegistry {
  const registry = new SkillRegistry();
  registry.register(new TestStepSkill(tracker));
  return registry;
}

function makePlan(steps: WorkflowPlan['tracks'][number]['steps']): WorkflowPlan {
  return {
    id: 'test-go-live',
    name: 'Test GO-LIVE',
    version: '1.0.0',
    tracks: [{ id: 'test', title: 'Test', steps }],
  };
}

async function readState(statePath: string): Promise<WorkflowState> {
  return JSON.parse(await fs.readFile(statePath, 'utf-8')) as WorkflowState;
}

async function testParallelExecutionAndDependencies(root: string): Promise<void> {
  const statePath = path.join(root, 'parallel.json');
  const tracker: Tracker = { active: 0, maxActive: 0, calls: [] };
  const workflow = new CerberusGoLiveWorkflow(makeRegistry(tracker));
  const plan = makePlan([
    { id: 'a', title: 'A', skill: 'test.step', input: { id: 'a', delay: 30 } },
    { id: 'b', title: 'B', skill: 'test.step', input: { id: 'b', delay: 30 } },
    { id: 'c', title: 'C', skill: 'test.step', input: { id: 'c' }, dependsOn: ['a', 'b'] },
  ]);

  const initialized = await workflow.run({ operation: 'init', statePath, plan });
  assert.equal(initialized.success, true);
  const result = await workflow.run({ operation: 'run', statePath, concurrency: 2 });
  assert.equal(result.success, true);
  assert.equal(tracker.maxActive, 2, 'independent steps should execute in parallel');
  assert.ok(tracker.calls.indexOf('c') > tracker.calls.indexOf('a'));
  assert.ok(tracker.calls.indexOf('c') > tracker.calls.indexOf('b'));
  const state = await readState(statePath);
  assert.equal(state.status, 'succeeded');
  assert.ok(Object.values(state.steps).every(step => step.status === 'succeeded'));
}

async function testApprovalGate(root: string): Promise<void> {
  const statePath = path.join(root, 'approval.json');
  const tracker: Tracker = { active: 0, maxActive: 0, calls: [] };
  const workflow = new CerberusGoLiveWorkflow(makeRegistry(tracker));
  const plan = makePlan([
    {
      id: 'deploy',
      title: 'Deploy',
      skill: 'test.step',
      input: { id: 'deploy' },
      requiresApproval: true,
    },
  ]);

  await workflow.run({ operation: 'init', statePath, plan });
  const blocked = await workflow.run({ operation: 'run', statePath });
  assert.equal(blocked.success, true);
  assert.equal(blocked.data?.summary?.status, 'waiting_approval');
  assert.deepEqual(tracker.calls, []);

  const approval = await workflow.run({
    operation: 'approve',
    statePath,
    approvalStepId: 'deploy',
  });
  assert.equal(approval.success, true);
  const completed = await workflow.run({ operation: 'resume', statePath });
  assert.equal(completed.success, true);
  assert.deepEqual(tracker.calls, ['deploy']);
  assert.equal(completed.data?.summary?.status, 'succeeded');
}

async function testFailureBlocksOnlyDependents(root: string): Promise<void> {
  const statePath = path.join(root, 'failure.json');
  const tracker: Tracker = { active: 0, maxActive: 0, calls: [] };
  const workflow = new CerberusGoLiveWorkflow(makeRegistry(tracker));
  const plan = makePlan([
    { id: 'bad', title: 'Bad', skill: 'test.step', input: { id: 'bad', fail: true } },
    { id: 'dependent', title: 'Dependent', skill: 'test.step', input: { id: 'dependent' }, dependsOn: ['bad'] },
    { id: 'independent', title: 'Independent', skill: 'test.step', input: { id: 'independent' } },
  ]);

  await workflow.run({ operation: 'init', statePath, plan });
  const result = await workflow.run({ operation: 'run', statePath, concurrency: 3 });
  assert.equal(result.success, false);
  const state = await readState(statePath);
  assert.equal(state.steps.bad.status, 'failed');
  assert.equal(state.steps.dependent.status, 'blocked');
  assert.equal(state.steps.independent.status, 'succeeded');
  assert.ok(!tracker.calls.includes('dependent'));
}

async function testPersistenceAcrossInstances(root: string): Promise<void> {
  const statePath = path.join(root, 'persistence.json');
  const tracker: Tracker = { active: 0, maxActive: 0, calls: [] };
  const plan = makePlan([
    { id: 'persisted', title: 'Persisted', skill: 'test.step', input: { id: 'persisted' } },
  ]);
  const first = new CerberusGoLiveWorkflow(makeRegistry(tracker));
  await first.run({ operation: 'init', statePath, plan });
  await first.run({ operation: 'run', statePath });

  const second = new CerberusGoLiveWorkflow(makeRegistry(tracker));
  const status = await second.run({ operation: 'status', statePath });
  assert.equal(status.success, true);
  assert.equal(status.data?.summary?.status, 'succeeded');
  assert.equal(status.data?.summary?.progress, 100);
}

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cerberus-go-live-'));
  try {
    await testParallelExecutionAndDependencies(root);
    await testApprovalGate(root);
    await testFailureBlocksOnlyDependents(root);
    await testPersistenceAcrossInstances(root);
    console.log('✅ Cerberus GO-LIVE workflow tests passed');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
