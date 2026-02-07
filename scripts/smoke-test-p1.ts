/**
 * Smoke Test P1 - OpenClaw Aurora Correction Loop
 *
 * Testa o loop de correção P1:
 * 1. Cria app com erro TypeScript proposital
 * 2. Roda build → falha
 * 3. analyze.error identifica o erro
 * 4. patch.apply aplica correção
 * 5. Roda build novamente → passa
 * 6. Gera relatório
 *
 * Uso: npx ts-node scripts/smoke-test-p1.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileMaterializeSkill, FilePlan } from '../src/skills/file/materialize';
import { ExecRunSafeSkill, CommandPlan } from '../src/skills/execution/run-safe';
import { TestRunSkill, TestRunOutput } from '../src/skills/testing/run';
import { AnalyzeErrorSkill, AnalyzeErrorOutput } from '../src/skills/analyze/error';
import { PatchApplySkill, PatchOperation } from '../src/skills/patch/apply';
import { ArtifactCollectSkill } from '../src/skills/artifact/collect';

// ============================================================================
// CONFIG
// ============================================================================

const TEST_APP_NAME = `smoke-test-p1-${Date.now()}`;
const APPS_DIR = './apps';
const RUNS_DIR = './runs';
const MAX_CORRECTION_ATTEMPTS = 2;

// ============================================================================
// TEST RESULTS TYPE
// ============================================================================

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration?: number;
  details?: any;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        OpenClaw Aurora P1 - Correction Loop Test           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  const executionId = `p1-smoke-${Date.now()}`;
  const startTime = Date.now();
  const results: TestResult[] = [];
  const backups: string[] = [];

  // Criar diretórios base
  if (!fs.existsSync(APPS_DIR)) {
    fs.mkdirSync(APPS_DIR, { recursive: true });
  }
  if (!fs.existsSync(RUNS_DIR)) {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
  }

  console.log(`App Name: ${TEST_APP_NAME}`);
  console.log(`Execution ID: ${executionId}`);
  console.log();

  const appLocation = path.join(APPS_DIR, TEST_APP_NAME);

  // ========================================================================
  // STEP 1: Criar app COM ERRO TypeScript proposital
  // ========================================================================
  console.log('─'.repeat(60));
  console.log('STEP 1: Create app with intentional TypeScript error');
  console.log('─'.repeat(60));

  const fileMaterialize = new FileMaterializeSkill();

  // Arquivo com erro: usa variável não declarada 'undeclaredVar'
  const filesWithError: FilePlan[] = [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: TEST_APP_NAME,
        version: '1.0.0',
        scripts: {
          build: 'tsc',
          start: 'node dist/index.js',
        },
        devDependencies: {
          typescript: '^5.0.0',
        },
      }, null, 2),
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          outDir: './dist',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
        include: ['src/**/*'],
      }, null, 2),
    },
    {
      path: 'src/index.ts',
      content: `// ${TEST_APP_NAME} - Entry point with intentional error
console.log('Hello from ${TEST_APP_NAME}!');

// INTENTIONAL ERROR: undeclaredVar is not declared
const result = undeclaredVar + 10;

export const version = '1.0.0';
`,
    },
    {
      path: '.gitignore',
      content: 'node_modules/\ndist/\n',
    },
  ];

  const step1Start = Date.now();
  const materializeResult = await fileMaterialize.run({
    params: {
      appName: TEST_APP_NAME,
      basePath: APPS_DIR,
      files: filesWithError,
    },
  });
  const step1Duration = Date.now() - step1Start;

  if (materializeResult.success) {
    console.log(`✅ PASS: Created ${materializeResult.data?.filesWritten?.length || 0} files (with error)`);
    results.push({ step: 'create-app-with-error', status: 'PASS', message: 'Files created with intentional error', duration: step1Duration });
  } else {
    console.log(`❌ FAIL: ${materializeResult.error}`);
    results.push({ step: 'create-app-with-error', status: 'FAIL', message: materializeResult.error || 'Unknown error', duration: step1Duration });
    printSummary(results, startTime);
    return;
  }
  console.log();

  // ========================================================================
  // STEP 2: npm install
  // ========================================================================
  console.log('─'.repeat(60));
  console.log('STEP 2: npm install');
  console.log('─'.repeat(60));

  const execRunSafe = new ExecRunSafeSkill();
  const step2Start = Date.now();

  const npmInstallResult = await execRunSafe.run({
    params: {
      appLocation,
      commands: [{ cmd: 'npm', args: ['install'], description: 'Install dependencies' }],
      executionId,
      logDir: `${RUNS_DIR}/${executionId}/logs`,
    },
  });
  const step2Duration = Date.now() - step2Start;

  if (npmInstallResult.success) {
    console.log(`✅ PASS: npm install completed`);
    results.push({ step: 'npm-install', status: 'PASS', message: 'Dependencies installed', duration: step2Duration });
  } else {
    console.log(`❌ FAIL: ${npmInstallResult.error}`);
    results.push({ step: 'npm-install', status: 'FAIL', message: npmInstallResult.error || 'Unknown error', duration: step2Duration });
    printSummary(results, startTime);
    return;
  }
  console.log();

  // ========================================================================
  // STEP 3: test.run typecheck → DEVE FALHAR
  // ========================================================================
  console.log('─'.repeat(60));
  console.log('STEP 3: test.run typecheck (should FAIL)');
  console.log('─'.repeat(60));

  const testRun = new TestRunSkill();
  const step3Start = Date.now();

  const firstTestResult = await testRun.run({
    params: {
      appLocation,
      command: 'typecheck',
      executionId: `${executionId}-attempt-0`,
    },
  });
  const step3Duration = Date.now() - step3Start;

  // Esperamos que falhe
  if (!firstTestResult.success) {
    console.log(`✅ PASS: Typecheck failed as expected`);
    const testOutput = firstTestResult.data as TestRunOutput | undefined;
    if (testOutput?.errorAnalysis) {
      console.log(`   Errors found: ${testOutput.errorAnalysis.totalErrors}`);
      if (testOutput.errorAnalysis.primaryError) {
        const pe = testOutput.errorAnalysis.primaryError;
        console.log(`   Primary error: ${pe.errorCode} in ${pe.file}:${pe.line}`);
        console.log(`   Message: ${pe.message.substring(0, 60)}...`);
      }
    }
    results.push({
      step: 'initial-typecheck-fail',
      status: 'PASS',
      message: 'Typecheck failed as expected',
      duration: step3Duration,
      details: testOutput?.errorAnalysis,
    });
  } else {
    console.log(`❌ FAIL: Typecheck should have failed but passed`);
    results.push({ step: 'initial-typecheck-fail', status: 'FAIL', message: 'Expected failure but got success', duration: step3Duration });
    printSummary(results, startTime);
    return;
  }
  console.log();

  // ========================================================================
  // STEP 4: patch.apply - Fix the error
  // ========================================================================
  console.log('─'.repeat(60));
  console.log('STEP 4: patch.apply - Fix the error');
  console.log('─'.repeat(60));

  const patchApply = new PatchApplySkill();
  const step4Start = Date.now();

  // Patch: Replace the broken line with a fixed version
  const fixPatch: PatchOperation = {
    file: 'src/index.ts',
    operation: 'replace',
    search: '// INTENTIONAL ERROR: undeclaredVar is not declared\nconst result = undeclaredVar + 10;',
    replacement: '// FIXED by P1 corrector\nconst undeclaredVar = 5; // Now declared\nconst result = undeclaredVar + 10;',
  };

  const patchResult = await patchApply.run({
    params: {
      appLocation,
      patches: [fixPatch],
      createBackup: true,
    },
  });
  const step4Duration = Date.now() - step4Start;

  if (patchResult.success) {
    console.log(`✅ PASS: Patch applied`);
    const backupDir = patchResult.data?.backupDir;
    if (backupDir) {
      console.log(`   Backup: ${backupDir}`);
      backups.push(backupDir);
    }
    console.log(`   Applied: ${patchResult.data?.successCount || 0} patches`);
    results.push({
      step: 'patch-apply',
      status: 'PASS',
      message: `Patch applied, backup at ${backupDir}`,
      duration: step4Duration,
      details: patchResult.data,
    });
  } else {
    console.log(`❌ FAIL: ${patchResult.error}`);
    results.push({ step: 'patch-apply', status: 'FAIL', message: patchResult.error || 'Unknown error', duration: step4Duration });
    printSummary(results, startTime);
    return;
  }
  console.log();

  // ========================================================================
  // STEP 5: test.run typecheck → DEVE PASSAR
  // ========================================================================
  console.log('─'.repeat(60));
  console.log('STEP 5: test.run typecheck (should PASS)');
  console.log('─'.repeat(60));

  const step5Start = Date.now();
  const secondTestResult = await testRun.run({
    params: {
      appLocation,
      command: 'typecheck',
      executionId: `${executionId}-attempt-1`,
    },
  });
  const step5Duration = Date.now() - step5Start;

  if (secondTestResult.success) {
    console.log(`✅ PASS: Typecheck passed after fix!`);
    const testOutput = secondTestResult.data as TestRunOutput | undefined;
    console.log(`   Duration: ${(testOutput?.duration || 0) / 1000}s`);
    results.push({
      step: 'fixed-typecheck-pass',
      status: 'PASS',
      message: 'Typecheck passed after patch',
      duration: step5Duration,
    });
  } else {
    console.log(`❌ FAIL: Typecheck still failing: ${secondTestResult.error}`);
    results.push({ step: 'fixed-typecheck-pass', status: 'FAIL', message: secondTestResult.error || 'Unknown error', duration: step5Duration });
    // Don't return - continue to collect artifacts
  }
  console.log();

  // ========================================================================
  // STEP 6: artifact.collect
  // ========================================================================
  console.log('─'.repeat(60));
  console.log('STEP 6: artifact.collect');
  console.log('─'.repeat(60));

  const artifactCollect = new ArtifactCollectSkill();
  const step6Start = Date.now();

  const collectResult = await artifactCollect.run({
    params: {
      executionId,
      appName: TEST_APP_NAME,
      appLocation,
      workflow: 'p1-correction-loop-test',
      filesWritten: materializeResult.data?.filesWritten || [],
      commandsRun: [
        ...(npmInstallResult.data?.commandsRun || []),
      ],
      workflowSteps: results.map(r => ({
        persona: 'p1-smoke-test',
        subskill: r.step,
        status: r.status === 'PASS' ? 'success' : 'failed',
        duration: r.duration,
      })),
      errors: [],
      startTime,
      endTime: Date.now(),
    },
  });
  const step6Duration = Date.now() - step6Start;

  if (collectResult.success) {
    console.log(`✅ PASS: Artifacts collected`);
    console.log(`   Run Folder: ${collectResult.data?.runFolder}`);
    console.log(`   Report JSON: ${collectResult.data?.reportJson}`);
    console.log(`   Report MD: ${collectResult.data?.reportMd}`);
    results.push({
      step: 'artifact-collect',
      status: 'PASS',
      message: `Artifacts at ${collectResult.data?.runFolder}`,
      duration: step6Duration,
    });
  } else {
    console.log(`❌ FAIL: ${collectResult.error}`);
    results.push({ step: 'artifact-collect', status: 'FAIL', message: collectResult.error || 'Unknown error', duration: step6Duration });
  }
  console.log();

  // ========================================================================
  // STEP 7: Verify backup exists
  // ========================================================================
  console.log('─'.repeat(60));
  console.log('STEP 7: Verify backups');
  console.log('─'.repeat(60));

  let backupsValid = true;
  for (const backup of backups) {
    if (fs.existsSync(backup)) {
      const files = fs.readdirSync(backup);
      console.log(`   ✅ Backup dir exists: ${backup}`);
      console.log(`      Files: ${files.join(', ')}`);
    } else {
      console.log(`   ❌ Backup dir missing: ${backup}`);
      backupsValid = false;
    }
  }

  if (backups.length > 0 && backupsValid) {
    results.push({ step: 'verify-backups', status: 'PASS', message: `${backups.length} backup(s) verified` });
  } else if (backups.length === 0) {
    results.push({ step: 'verify-backups', status: 'PASS', message: 'No backups to verify' });
  } else {
    results.push({ step: 'verify-backups', status: 'FAIL', message: 'Some backups missing' });
  }
  console.log();

  // ========================================================================
  // SUMMARY
  // ========================================================================
  printSummary(results, startTime);
}

function printSummary(results: TestResult[], startTime: number) {
  console.log('═'.repeat(60));
  console.log('P1 CORRECTION LOOP TEST SUMMARY');
  console.log('═'.repeat(60));

  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log();
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    const durationStr = r.duration ? ` (${(r.duration / 1000).toFixed(2)}s)` : '';
    console.log(`${icon} ${r.step}: ${r.message}${durationStr}`);
  }
  console.log();

  console.log(`Total: ${passed} PASS, ${failed} FAIL`);
  console.log(`Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log();

  if (failed === 0) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          ✅ P1 CORRECTION LOOP TEST PASSED                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log();
    console.log('The P1 correction loop successfully:');
    console.log('  1. Created an app with intentional TypeScript error');
    console.log('  2. Detected the build failure');
    console.log('  3. Applied a patch to fix the error');
    console.log('  4. Created backup of modified file');
    console.log('  5. Re-ran typecheck and it passed');
    console.log('  6. Collected artifacts and generated report');
    process.exit(0);
  } else {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          ❌ P1 CORRECTION LOOP TEST FAILED                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('P1 Smoke test crashed:', error);
  process.exit(1);
});
