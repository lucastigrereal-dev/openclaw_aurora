/**
 * Test Suite for Supabase Migration Planner Pro (S-06)
 * Demonstrates migration planning capabilities
 */

import { SupabaseMigrationPlanner, MigrationPlannerParams } from './supabase-migration-planner';

/**
 * Test 1: Simple table creation
 */
async function testCreateTable() {
  console.log('\n=== Test 1: Create New Table ===');

  const planner = new SupabaseMigrationPlanner();

  const params: MigrationPlannerParams = {
    targetSchema: {
      tables: [
        {
          name: 'users',
          columns: [
            {
              name: 'id',
              dataType: 'uuid',
              isPrimaryKey: true,
              isNullable: false,
            },
            {
              name: 'email',
              dataType: 'varchar(255)',
              isNullable: false,
              isUnique: true,
            },
            {
              name: 'created_at',
              dataType: 'timestamp',
              isNullable: false,
              defaultValue: 'CURRENT_TIMESTAMP',
            },
          ],
        },
      ],
    },
    generateRollback: true,
  };

  const result = await planner.run(params);
  console.log('Result:', JSON.stringify(result, null, 2));
}

/**
 * Test 2: Add columns to existing table
 */
async function testAddColumns() {
  console.log('\n=== Test 2: Add Columns ===');

  const planner = new SupabaseMigrationPlanner();

  const params: MigrationPlannerParams = {
    currentSchema: {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', dataType: 'uuid', isPrimaryKey: true },
            { name: 'email', dataType: 'varchar(255)', isNullable: false },
          ],
        },
      ],
    },
    targetSchema: {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', dataType: 'uuid', isPrimaryKey: true },
            { name: 'email', dataType: 'varchar(255)', isNullable: false },
            {
              name: 'name',
              dataType: 'varchar(255)',
              isNullable: true,
            },
            {
              name: 'created_at',
              dataType: 'timestamp',
              defaultValue: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
          ],
        },
      ],
    },
    generateRollback: true,
  };

  const result = await planner.run(params);
  console.log('Result:', JSON.stringify(result, null, 2));
}

/**
 * Test 3: Drop column with data loss risk
 */
async function testDropColumn() {
  console.log('\n=== Test 3: Drop Column (Data Loss Risk) ===');

  const planner = new SupabaseMigrationPlanner();

  const params: MigrationPlannerParams = {
    currentSchema: {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', dataType: 'uuid', isPrimaryKey: true },
            { name: 'email', dataType: 'varchar(255)', isNullable: false },
            { name: 'legacy_field', dataType: 'text' },
          ],
        },
      ],
    },
    targetSchema: {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', dataType: 'uuid', isPrimaryKey: true },
            { name: 'email', dataType: 'varchar(255)', isNullable: false },
          ],
        },
      ],
    },
    generateRollback: true,
  };

  const result = await planner.run(params);
  console.log('Result:', JSON.stringify(result, null, 2));
}

/**
 * Test 4: Complex schema with multiple changes
 */
async function testComplexMigration() {
  console.log('\n=== Test 4: Complex Migration ===');

  const planner = new SupabaseMigrationPlanner();

  const params: MigrationPlannerParams = {
    currentSchema: {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', dataType: 'uuid', isPrimaryKey: true },
            { name: 'email', dataType: 'varchar(255)', isNullable: false },
            { name: 'age', dataType: 'integer' },
          ],
          indexes: [{ name: 'email' }],
        },
        {
          name: 'posts',
          columns: [
            { name: 'id', dataType: 'uuid', isPrimaryKey: true },
            { name: 'user_id', dataType: 'uuid' },
            { name: 'title', dataType: 'varchar(255)' },
          ],
        },
      ],
      enums: [],
      functions: [],
      policies: [],
    },
    targetSchema: {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', dataType: 'uuid', isPrimaryKey: true },
            { name: 'email', dataType: 'varchar(255)', isNullable: false },
            { name: 'age', dataType: 'smallint' }, // Changed type
            { name: 'username', dataType: 'varchar(100)' }, // New column
          ],
          indexes: [{ name: 'email' }],
        },
        {
          name: 'posts',
          columns: [
            { name: 'id', dataType: 'uuid', isPrimaryKey: true },
            { name: 'user_id', dataType: 'uuid' },
            { name: 'title', dataType: 'varchar(255)' },
            { name: 'content', dataType: 'text' }, // New column
            { name: 'created_at', dataType: 'timestamp' }, // New column
          ],
          indexes: [{ name: 'user_id' }],
        },
        {
          name: 'comments',
          columns: [
            { name: 'id', dataType: 'uuid', isPrimaryKey: true },
            { name: 'post_id', dataType: 'uuid' },
            { name: 'user_id', dataType: 'uuid' },
            { name: 'content', dataType: 'text' },
            { name: 'created_at', dataType: 'timestamp' },
          ],
        },
      ],
      enums: [],
      functions: [],
      policies: [],
    },
    generateRollback: true,
  };

  const result = await planner.run(params);
  console.log('Result:', JSON.stringify(result, null, 2));
}

/**
 * Test 5: Test without schema provided (should fetch from vault)
 */
async function testWithVault() {
  console.log('\n=== Test 5: With Vault Credentials ===');

  const planner = new SupabaseMigrationPlanner();

  const params: MigrationPlannerParams = {
    // No credentials provided - will use vault
    targetSchema: {
      tables: [
        {
          name: 'test_table',
          columns: [{ name: 'id', dataType: 'uuid' }],
        },
      ],
    },
  };

  const result = await planner.run(params);
  console.log('Result:', JSON.stringify(result, null, 2));
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('Supabase Migration Planner Pro - Test Suite');
  console.log('='.repeat(60));

  try {
    await testCreateTable();
    await testAddColumns();
    await testDropColumn();
    await testComplexMigration();
    await testWithVault();

    console.log('\n' + '='.repeat(60));
    console.log('All tests completed!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllTests();
}

export { testCreateTable, testAddColumns, testDropColumn, testComplexMigration, testWithVault };
