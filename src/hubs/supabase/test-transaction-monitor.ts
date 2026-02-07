/**
 * Test Suite for Supabase Transaction Monitor (S-19)
 * Testes e exemplos de uso do skill
 */

import { SupabaseTransactionMonitor, createTransactionMonitor } from './supabase-transaction-monitor';

// ============================================================================
// TESTES BÁSICOS
// ============================================================================

async function testBasicMonitoring() {
  console.log('\n========================================');
  console.log('TEST 1: Basic Transaction Monitoring');
  console.log('========================================\n');

  const monitor = new SupabaseTransactionMonitor();

  const result = await monitor.run({
    action: 'monitor',
    longTransactionThresholdMs: 300000,
  });

  console.log('Result:', JSON.stringify(result, null, 2));
  console.log(`\nMonitoring duration: ${result.data?.monitoringDuration}ms`);
  console.log(`Total active transactions: ${result.data?.statistics.total_active}`);
  console.log(`Long transactions found: ${result.data?.longTransactions.length}`);
}

async function testDeadlockDetection() {
  console.log('\n========================================');
  console.log('TEST 2: Deadlock Detection');
  console.log('========================================\n');

  const monitor = new SupabaseTransactionMonitor();

  const result = await monitor.run({
    action: 'detect_deadlocks',
  });

  console.log('Result:', JSON.stringify(result, null, 2));
  if (result.data?.deadlocks.length === 0) {
    console.log('\nNo deadlocks detected (this is good!)');
  } else {
    console.log(`\nDeadlocks found: ${result.data?.deadlocks.length}`);
    result.data?.deadlocks.forEach((deadlock, idx) => {
      console.log(`\nDeadlock ${idx + 1}:`);
      console.log(`  Involved PIDs: ${deadlock.involved_pids.join(', ')}`);
      console.log(`  Blocker: ${deadlock.blocker_pid}`);
    });
  }
}

async function testAutoKill() {
  console.log('\n========================================');
  console.log('TEST 3: Auto-Kill Stuck Transactions');
  console.log('========================================\n');

  const monitor = new SupabaseTransactionMonitor();

  const result = await monitor.run({
    action: 'kill_stuck',
    autoKillEnabled: true,
    autoKillThresholdMs: 600000,
  });

  console.log('Result:', JSON.stringify(result, null, 2));
  if (result.data?.autoKillActions && result.data.autoKillActions.length > 0) {
    console.log(`\nAuto-kill actions performed: ${result.data.autoKillActions.length}`);
    result.data.autoKillActions.forEach((action, idx) => {
      console.log(`\nAction ${idx + 1}:`);
      console.log(`  PID: ${action.target_pid}`);
      console.log(`  Reason: ${action.reason}`);
      console.log(`  Success: ${action.success}`);
    });
  } else {
    console.log('\nNo stuck transactions to kill');
  }
}

async function testFullReport() {
  console.log('\n========================================');
  console.log('TEST 4: Full Comprehensive Report');
  console.log('========================================\n');

  const monitor = new SupabaseTransactionMonitor();

  const result = await monitor.run({
    action: 'full_report',
    longTransactionThresholdMs: 300000,
    autoKillEnabled: true,
    autoKillThresholdMs: 600000,
    includeTransactionLog: true,
  });

  if (result.success) {
    console.log('\nFull Report Summary:');
    console.log(`  Total active transactions: ${result.data?.statistics.total_active}`);
    console.log(`  Long transactions: ${result.data?.statistics.long_transactions.length}`);
    console.log(`  Deadlocks detected: ${result.data?.statistics.deadlocks_detected}`);
    console.log(`  Idle in transaction: ${result.data?.statistics.idle_in_transaction}`);
    console.log(`  Average duration: ${result.data?.statistics.average_duration_ms}ms`);
    console.log(`  Max duration: ${result.data?.statistics.max_duration_ms}ms`);

    if (result.data?.recommendedActions.length > 0) {
      console.log('\nRecommended Actions:');
      result.data.recommendedActions.forEach((action, idx) => {
        console.log(`  ${idx + 1}. ${action}`);
      });
    }

    if (result.data?.transactionLogs && result.data.transactionLogs.length > 0) {
      console.log('\nTransaction Logs:');
      result.data.transactionLogs.forEach((log) => {
        console.log(`  ${log.operation}: ${log.transaction_id} (${log.status})`);
      });
    }

    console.log(`\nMonitoring took: ${result.data?.monitoringDuration}ms`);
  } else {
    console.log(`Error: ${result.error}`);
  }
}

async function testAnalysis() {
  console.log('\n========================================');
  console.log('TEST 5: Transaction Analysis');
  console.log('========================================\n');

  const monitor = new SupabaseTransactionMonitor();

  const result = await monitor.run({
    action: 'analyze',
    includeTransactionLog: true,
  });

  if (result.success && result.data?.transactionLogs) {
    console.log(`\nAnalyzed ${result.data.transactionLogs.length} transaction logs`);

    const commits = result.data.transactionLogs.filter((t) => t.operation === 'COMMIT').length;
    const starts = result.data.transactionLogs.filter((t) => t.operation === 'START').length;
    const rollbacks = result.data.transactionLogs.filter((t) => t.operation === 'ROLLBACK').length;

    console.log(`  Starts: ${starts}`);
    console.log(`  Commits: ${commits}`);
    console.log(`  Rollbacks: ${rollbacks}`);

    // Calcular duração média de transações bem-sucedidas
    const successfulTxns = result.data.transactionLogs.filter(
      (t) => t.status === 'success' && t.duration_ms
    );

    if (successfulTxns.length > 0) {
      const avgDuration =
        successfulTxns.reduce((sum, t) => sum + (t.duration_ms || 0), 0) /
        successfulTxns.length;
      console.log(`  Average transaction duration: ${avgDuration.toFixed(0)}ms`);
    }
  } else {
    console.log(`Error: ${result.error}`);
  }
}

async function testValidation() {
  console.log('\n========================================');
  console.log('TEST 6: Input Validation');
  console.log('========================================\n');

  const monitor = new SupabaseTransactionMonitor();

  // Test 1: Invalid action
  console.log('Test 6.1: Invalid action');
  const result1 = await monitor.run({
    action: 'invalid_action' as any,
  });
  console.log(`Success: ${result1.success} (expected: false)`);

  // Test 2: Threshold too low
  console.log('\nTest 6.2: Threshold too low');
  const result2 = await monitor.run({
    action: 'monitor',
    longTransactionThresholdMs: 100,
  });
  console.log(`Success: ${result2.success} (expected: false)`);

  // Test 3: Valid thresholds
  console.log('\nTest 6.3: Valid thresholds');
  const result3 = await monitor.run({
    action: 'monitor',
    longTransactionThresholdMs: 5000,
  });
  console.log(`Success: ${result3.success} (expected: true)`);
}

async function testMetadataInfo() {
  console.log('\n========================================');
  console.log('TEST 7: Skill Metadata');
  console.log('========================================\n');

  const monitor = new SupabaseTransactionMonitor();
  const info = monitor.getInfo();

  console.log('Skill Information:');
  console.log(`  Name: ${info.name}`);
  console.log(`  Description: ${info.description}`);
  console.log(`  Version: ${info.version}`);
  console.log(`  Category: ${info.category}`);
  console.log(`  Author: ${info.author}`);
  console.log(`  Enabled: ${info.enabled}`);
  console.log(`  Timeout: ${info.config.timeout}ms`);
  console.log(`  Retries: ${info.config.retries}`);
  console.log(`  Tags: ${info.tags?.join(', ')}`);
}

async function testFactoryFunction() {
  console.log('\n========================================');
  console.log('TEST 8: Factory Function');
  console.log('========================================\n');

  const monitor = createTransactionMonitor();
  const result = await monitor.run({ action: 'monitor' });

  console.log('Factory function created instance successfully');
  console.log(`Execution result: ${result.success}`);
}

// ============================================================================
// EXECUÇÃO DE TESTES
// ============================================================================

async function runAllTests() {
  console.log('\n\n');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Supabase Transaction Monitor Tests   ║');
  console.log('║              (S-19)                    ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    await testBasicMonitoring();
    await testDeadlockDetection();
    await testAutoKill();
    await testFullReport();
    await testAnalysis();
    await testValidation();
    await testMetadataInfo();
    await testFactoryFunction();

    console.log('\n\n');
    console.log('╔════════════════════════════════════════╗');
    console.log('║         All Tests Completed!           ║');
    console.log('╚════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n\nTest Suite Error:', error);
    process.exit(1);
  }
}

// Executar testes se arquivo for executado diretamente
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export {
  testBasicMonitoring,
  testDeadlockDetection,
  testAutoKill,
  testFullReport,
  testAnalysis,
  testValidation,
  testMetadataInfo,
  testFactoryFunction,
};
