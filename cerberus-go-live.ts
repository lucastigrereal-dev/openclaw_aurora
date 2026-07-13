import 'dotenv/config';
import * as path from 'path';
import { registerAllSkills } from './skills';
import { CerberusGoLiveWorkflow, WorkflowOperation } from './skills/cerberus-go-live-workflow';

function usage(): never {
  console.error(`
Uso:
  npm run cerberus -- init [statePath] [planPath]
  npm run cerberus -- run [statePath]
  npm run cerberus -- resume [statePath]
  npm run cerberus -- status [statePath]
  npm run cerberus -- approve [statePath] <stepId>
  npm run cerberus -- reset [statePath]

Padrões:
  statePath: data/cerberus/go-live-state.json
  planPath:  config/cerberus-go-live.rota.json
`);
  process.exit(2);
}

async function main(): Promise<void> {
  const operation = process.argv[2] as WorkflowOperation | undefined;
  if (!operation || !['init', 'run', 'resume', 'status', 'approve', 'reset'].includes(operation)) {
    usage();
  }

  const statePath = path.resolve(
    process.argv[3] ?? path.join('data', 'cerberus', 'go-live-state.json')
  );
  const planPath = path.resolve(
    process.argv[4] && operation === 'init'
      ? process.argv[4]
      : path.join('config', 'cerberus-go-live.rota.json')
  );
  const approvalStepId = operation === 'approve'
    ? process.argv[4]
    : undefined;

  if (operation === 'approve' && !approvalStepId) usage();

  const registry = registerAllSkills();
  const workflow = new CerberusGoLiveWorkflow(registry);
  registry.register(workflow);

  const result = await workflow.run({
    operation,
    statePath,
    planPath: operation === 'init' ? planPath : undefined,
    approvalStepId,
    concurrency: Number(process.env.CERBERUS_CONCURRENCY ?? 3),
    dryRun: process.env.CERBERUS_DRY_RUN === 'true',
  });

  console.log(JSON.stringify(result.data?.summary ?? result.data ?? result, null, 2));
  if (!result.success) {
    console.error(result.error ?? 'Cerberus GO-LIVE failed');
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
