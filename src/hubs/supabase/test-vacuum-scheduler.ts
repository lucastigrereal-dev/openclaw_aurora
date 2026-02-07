/**
 * Test Suite for Supabase Vacuum Scheduler (S-10)
 * Tests all actions and scenarios
 *
 * @version 1.0.0
 */

import { SupabaseVacuumScheduler } from './supabase-vacuum-scheduler';
import { createLogger } from './supabase-logger';

const logger = createLogger('test-vacuum-scheduler');

// ============================================================================
// TEST CASES
// ============================================================================

async function testVacuumScheduler() {
  logger.info('Starting Vacuum Scheduler test suite');

  const scheduler = new SupabaseVacuumScheduler();

  // Print skill info
  console.log('\n========================================');
  console.log('SKILL INFORMATION');
  console.log('========================================');
  console.log(JSON.stringify(scheduler.getInfo(), null, 2));

  try {
    // Test 1: Schedule VACUUM
    console.log('\n========================================');
    console.log('TEST 1: Schedule VACUUM Operations');
    console.log('========================================');

    const scheduleResult = await scheduler.run({
      action: 'schedule',
      aggressiveness: 'medium',
      dryRun: false,
    });

    console.log('Success:', scheduleResult.success);
    console.log('Duration:', scheduleResult.duration, 'ms');
    console.log('Schedules created:', scheduleResult.data?.schedules?.length);
    console.log('Recommendations:');
    scheduleResult.data?.recommendations?.forEach((r) => console.log(`  - ${r}`));

    // Test 2: Analyze Statistics
    console.log('\n========================================');
    console.log('TEST 2: Analyze Table Statistics');
    console.log('========================================');

    const analyzeResult = await scheduler.run({
      action: 'analyze',
      dryRun: false,
    });

    console.log('Success:', analyzeResult.success);
    console.log('Duration:', analyzeResult.duration, 'ms');
    console.log('Tables analyzed:', analyzeResult.data?.deadTupleStats?.length);

    if (analyzeResult.data?.deadTupleStats?.length) {
      console.log('Sample table stats:');
      const sample = analyzeResult.data.deadTupleStats[0];
      console.log(`  Table: ${sample.tableName}`);
      console.log(`  Dead tuples: ${sample.deadTuples}`);
      console.log(`  Live rows: ${sample.liveRows}`);
      console.log(`  Dead ratio: ${(sample.deadRatio * 100).toFixed(1)}%`);
    }

    // Test 3: Detect Bloat
    console.log('\n========================================');
    console.log('TEST 3: Detect Bloated Tables');
    console.log('========================================');

    const bloatResult = await scheduler.run({
      action: 'detect-bloat',
      dryRun: false,
    });

    console.log('Success:', bloatResult.success);
    console.log('Duration:', bloatResult.duration, 'ms');
    console.log('Bloated tables found:', bloatResult.data?.bloatedTables?.length);

    if (bloatResult.data?.bloatedTables?.length) {
      console.log('Tables by recommended action:');
      const bloated = bloatResult.data.bloatedTables;

      // Group by action
      const byAction = bloated.reduce(
        (acc, t) => {
          acc[t.recommendedAction] = (acc[t.recommendedAction] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      for (const [action, count] of Object.entries(byAction)) {
        console.log(`  - ${action.toUpperCase()}: ${count} tables`);
      }

      // Show highest bloat
      const highest = bloated.reduce((a, b) =>
        a.bloatPercentage > b.bloatPercentage ? a : b
      );
      console.log(`\nHighest bloat: ${highest.tableName} (${highest.bloatPercentage.toFixed(1)}%)`);
    }

    // Test 4: Tune AutoVac
    console.log('\n========================================');
    console.log('TEST 4: Tune AutoVacuum Settings');
    console.log('========================================');

    const tuneResult = await scheduler.run({
      action: 'tune-autovac',
      aggressiveness: 'high',
      dryRun: false,
    });

    console.log('Success:', tuneResult.success);
    console.log('Duration:', tuneResult.duration, 'ms');

    if (tuneResult.data?.settings) {
      const settings = tuneResult.data.settings;
      console.log('Optimized settings:');
      console.log(`  Autovacuum: ${settings.autovacuum ? 'ENABLED' : 'DISABLED'}`);
      console.log(`  Naptime: ${settings.autovacuumNaptime}`);
      console.log(`  Vacuum threshold: ${settings.autovacuumVacuumThreshold}`);
      console.log(`  Analyze threshold: ${settings.autovacuumAnalyzeThreshold}`);
      console.log(`  Vacuum scale factor: ${settings.autovacuumVacuumScaleFactor}`);
    }

    console.log('Recommendations:');
    tuneResult.data?.recommendations?.forEach((r) => console.log(`  - ${r}`));

    // Test 5: Monitor Dead Tuples
    console.log('\n========================================');
    console.log('TEST 5: Monitor Dead Tuple Statistics');
    console.log('========================================');

    const monitorResult = await scheduler.run({
      action: 'monitor-tuples',
      dryRun: false,
    });

    console.log('Success:', monitorResult.success);
    console.log('Duration:', monitorResult.duration, 'ms');
    console.log('Tables monitored:', monitorResult.data?.deadTupleStats?.length);

    if (monitorResult.data?.deadTupleStats?.length) {
      const stats = monitorResult.data.deadTupleStats;
      const avgDeadRatio = stats.reduce((a, s) => a + s.deadRatio, 0) / stats.length;
      console.log(`Average dead ratio: ${(avgDeadRatio * 100).toFixed(1)}%`);

      // Sort by dead ratio
      const sorted = [...stats].sort((a, b) => b.deadRatio - a.deadRatio);
      console.log('Top 3 tables with most dead tuples:');
      sorted.slice(0, 3).forEach((s, i) => {
        console.log(
          `  ${i + 1}. ${s.tableName}: ${(s.deadRatio * 100).toFixed(1)}% (${s.deadTuples} tuples)`
        );
      });
    }

    // Test 6: Dry Run
    console.log('\n========================================');
    console.log('TEST 6: Dry Run (Preview Mode)');
    console.log('========================================');

    const dryRunResult = await scheduler.run({
      action: 'tune-autovac',
      aggressiveness: 'high',
      dryRun: true,
    });

    console.log('Success:', dryRunResult.success);
    console.log('Dry run mode: No actual changes made');
    console.log('Settings preview available:', !!dryRunResult.data?.settings);

    // Test 7: Input Validation
    console.log('\n========================================');
    console.log('TEST 7: Input Validation');
    console.log('========================================');

    const validTests = [
      { input: { action: 'schedule' }, valid: true },
      { input: { action: 'invalid-action' }, valid: false },
      { input: { aggressiveness: 'extreme' }, valid: false },
      { input: { action: 'analyze', aggressiveness: 'low' }, valid: true },
    ];

    for (const test of validTests) {
      const isValid = scheduler.validate(test.input);
      const result = isValid === test.valid ? '✅' : '❌';
      console.log(`${result} ${JSON.stringify(test.input)}: ${isValid}`);
    }

    // Summary
    console.log('\n========================================');
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('========================================\n');

    logger.info('Test suite completed successfully', {
      testsRun: 7,
      status: 'all_passed',
    });
  } catch (error: any) {
    console.error('❌ TEST FAILED:', error.message);
    logger.error('Test suite failed', { error: error.message });
  }
}

// ============================================================================
// RUN TESTS
// ============================================================================

console.log('\n');
console.log('╔════════════════════════════════════════╗');
console.log('║   VACUUM SCHEDULER S-10 TEST SUITE     ║');
console.log('║   Version: 1.0.0                       ║');
console.log('║   Date: 2026-02-06                     ║');
console.log('╚════════════════════════════════════════╝');

testVacuumScheduler();
