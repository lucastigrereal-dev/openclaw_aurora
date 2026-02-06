/**
 * Test Suite for Supabase Schema Differ (S-07)
 * @version 1.0.0
 */

import {
  SupabaseSchemaDiffer,
  createSchemaDiffer,
  SchemaDifferParams,
  SchemaDifferResult,
} from './supabase-schema-differ';

/**
 * Test 1: Basic schema comparison with mock data
 */
async function testBasicComparison() {
  console.log('\n=== Test 1: Basic Schema Comparison ===\n');

  const differ = createSchemaDiffer();

  const params: SchemaDifferParams = {
    sourceUrl: 'https://source.supabase.co',
    sourceKey: 'source_key_xxx',
    targetUrl: 'https://target.supabase.co',
    targetKey: 'target_key_xxx',
    detectBreakingChanges: true,
  };

  const result = (await differ.run(params)) as SchemaDifferResult;

  console.log('Success:', result.success);
  console.log('Duration:', result.duration, 'ms');

  if (result.data) {
    console.log('\n--- Summary ---');
    console.log('Total Differences:', result.data.summary.totalDifferences);
    console.log('Breaking Changes:', result.data.summary.breakingChanges);
    console.log('Safe Changes:', result.data.summary.safeChanges);
    console.log('Migration Safe:', result.data.migrationSafe);

    console.log('\n--- By Type ---');
    for (const [type, count] of Object.entries(
      result.data.summary.byType
    )) {
      console.log(`  ${type}: ${count}`);
    }

    console.log('\n--- By Action ---');
    for (const [action, count] of Object.entries(
      result.data.summary.byAction
    )) {
      console.log(`  ${action}: ${count}`);
    }

    console.log('\n--- Recommendations ---');
    for (const rec of result.data.recommendations) {
      console.log(`  • ${rec}`);
    }

    if (result.data.differences.length > 0) {
      console.log('\n--- First 5 Differences ---');
      for (const diff of result.data.differences.slice(0, 5)) {
        console.log(`\n  Type: ${diff.type}`);
        console.log(`  Action: ${diff.action}`);
        console.log(`  Object: ${diff.objectName}`);
        if (diff.tableName) console.log(`  Table: ${diff.tableName}`);
        console.log(`  Breaking: ${diff.breaking}`);
        console.log(`  Severity: ${diff.severity}`);
      }
    }
  }

  if (result.error) {
    console.log('Error:', result.error);
  }
}

/**
 * Test 2: Skill metadata and info
 */
async function testSkillMetadata() {
  console.log('\n=== Test 2: Skill Metadata ===\n');

  const differ = createSchemaDiffer();
  const info = differ.getInfo();

  console.log('Skill Name:', info.name);
  console.log('Description:', info.description);
  console.log('Version:', info.version);
  console.log('Category:', info.category);
  console.log('Author:', info.author);
  console.log('Tags:', info.tags?.join(', '));
  console.log('Enabled:', info.enabled);
  console.log('Config:', {
    timeout: info.config.timeout,
    retries: info.config.retries,
    requiresApproval: info.config.requiresApproval,
  });
}

/**
 * Test 3: Event emission
 */
async function testEventEmission() {
  console.log('\n=== Test 3: Event Emission ===\n');

  const differ = createSchemaDiffer();

  let startEvent = false;
  let completeEvent = false;

  differ.on('start', (data) => {
    console.log('Event: start -', data.skill);
    startEvent = true;
  });

  differ.on('complete', (data) => {
    console.log('Event: complete -', data.skill);
    completeEvent = true;
  });

  const params: SchemaDifferParams = {
    sourceUrl: 'https://source.supabase.co',
    sourceKey: 'source_key',
    targetUrl: 'https://target.supabase.co',
    targetKey: 'target_key',
  };

  const result = await differ.run(params);

  console.log('Result success:', result.success);
  console.log('Start event fired:', startEvent);
  console.log('Complete event fired:', completeEvent);
}

/**
 * Test 4: Skill enable/disable
 */
async function testEnableDisable() {
  console.log('\n=== Test 4: Enable/Disable ===\n');

  const differ = createSchemaDiffer();

  console.log('Initial enabled state:', differ.isEnabled());

  differ.disable();
  console.log('After disable:', differ.isEnabled());

  const params: SchemaDifferParams = {
    sourceUrl: 'https://source.supabase.co',
    sourceKey: 'source_key',
    targetUrl: 'https://target.supabase.co',
    targetKey: 'target_key',
  };

  const disabledResult = await differ.run(params);
  console.log('Disabled result success:', disabledResult.success);
  console.log('Disabled result error:', disabledResult.error);

  differ.enable();
  console.log('After enable:', differ.isEnabled());

  const enabledResult = await differ.run(params);
  console.log('Enabled result success:', enabledResult.success);
}

/**
 * Test 5: Schema differences detail inspection
 */
async function testDetailedDifferences() {
  console.log('\n=== Test 5: Detailed Differences ===\n');

  const differ = createSchemaDiffer();

  const params: SchemaDifferParams = {
    sourceUrl: 'https://source.supabase.co',
    sourceKey: 'source_key',
    targetUrl: 'https://target.supabase.co',
    targetKey: 'target_key',
    detectBreakingChanges: true,
  };

  const result = (await differ.run(params)) as SchemaDifferResult;

  if (result.data && result.data.differences.length > 0) {
    console.log(
      `Total differences: ${result.data.differences.length}\n`
    );

    // Group by type
    const diffsByType: Record<string, typeof result.data.differences> = {};
    for (const diff of result.data.differences) {
      if (!diffsByType[diff.type]) {
        diffsByType[diff.type] = [];
      }
      diffsByType[diff.type].push(diff);
    }

    for (const [type, diffs] of Object.entries(diffsByType)) {
      console.log(`\n--- ${type.toUpperCase()} (${diffs.length}) ---`);

      for (const diff of diffs.slice(0, 3)) {
        console.log(`\n  Object: ${diff.objectName}`);
        if (diff.tableName) console.log(`  Table: ${diff.tableName}`);
        console.log(`  Action: ${diff.action}`);
        console.log(`  Breaking: ${diff.breaking ? 'YES' : 'NO'}`);
        console.log(`  Severity: ${diff.severity}`);

        if (diff.details.changes) {
          console.log(`  Changes:`);
          for (const [field, change] of Object.entries(
            diff.details.changes
          )) {
            if (!field.startsWith('_')) {
              console.log(
                `    ${field}: ${change.before} → ${change.after}`
              );
            }
          }
        }
      }

      if (diffs.length > 3) {
        console.log(`  ... and ${diffs.length - 3} more`);
      }
    }
  }
}

/**
 * Test 6: Breaking changes analysis
 */
async function testBreakingChangesAnalysis() {
  console.log('\n=== Test 6: Breaking Changes Analysis ===\n');

  const differ = createSchemaDiffer();

  const params: SchemaDifferParams = {
    sourceUrl: 'https://source.supabase.co',
    sourceKey: 'source_key',
    targetUrl: 'https://target.supabase.co',
    targetKey: 'target_key',
    detectBreakingChanges: true,
  };

  const result = (await differ.run(params)) as SchemaDifferResult;

  if (result.data) {
    const breaking = result.data.differences.filter(d => d.breaking);

    console.log(`Breaking Changes Found: ${breaking.length}`);
    console.log(`Migration Safe: ${result.data.migrationSafe}\n`);

    if (breaking.length > 0) {
      console.log('Breaking Changes Details:\n');
      for (const change of breaking) {
        console.log(`  • ${change.objectName} (${change.type})`);
        console.log(`    Action: ${change.action}`);
        console.log(`    Severity: ${change.severity}`);
      }
    }
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(
    '╔════════════════════════════════════════════════════════════════╗'
  );
  console.log(
    '║  Supabase Schema Differ (S-07) - Test Suite                   ║'
  );
  console.log(
    '╚════════════════════════════════════════════════════════════════╝'
  );

  try {
    await testSkillMetadata();
    await testBasicComparison();
    await testEventEmission();
    await testEnableDisable();
    await testDetailedDifferences();
    await testBreakingChangesAnalysis();

    console.log(
      '\n╔════════════════════════════════════════════════════════════════╗'
    );
    console.log(
      '║  All tests completed successfully!                            ║'
    );
    console.log(
      '╚════════════════════════════════════════════════════════════════╝\n'
    );
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
