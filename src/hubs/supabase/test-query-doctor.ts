/**
 * Test file for Supabase Query Doctor (S-08)
 * Demonstrates query analysis capabilities
 */

import { SupabaseQueryDoctor, QueryDoctorParams, QueryDoctorResult } from './supabase-query-doctor';

// Initialize the skill
const queryDoctor = new SupabaseQueryDoctor();

// Test cases with different query patterns
const testQueries = [
  {
    name: 'Good Query',
    query: `
      SELECT id, email, created_at
      FROM users
      WHERE status = 'active'
      LIMIT 100
    `,
  },
  {
    name: 'SELECT * Pattern',
    query: `
      SELECT *
      FROM users
      WHERE id = 123
    `,
  },
  {
    name: 'Full Table Scan',
    query: `
      SELECT id, name, email
      FROM users
    `,
  },
  {
    name: 'Complex JOIN',
    query: `
      SELECT u.id, u.email, p.title
      FROM users u
      JOIN posts p ON u.id = p.user_id
      WHERE u.created_at > '2025-01-01'
    `,
  },
  {
    name: 'Subquery Abuse',
    query: `
      SELECT * FROM users
      WHERE id IN (
        SELECT user_id FROM posts
        WHERE id IN (
          SELECT post_id FROM comments
          WHERE id IN (
            SELECT comment_id FROM likes
          )
        )
      )
    `,
  },
  {
    name: 'LIKE Pattern',
    query: `
      SELECT id, email
      FROM users
      WHERE email LIKE '%@gmail.com'
    `,
  },
];

/**
 * Run tests
 */
async function runTests() {
  console.log('Supabase Query Doctor - Test Suite');
  console.log('===================================\n');

  for (const testCase of testQueries) {
    console.log(`Test: ${testCase.name}`);
    console.log('-'.repeat(50));

    const params: QueryDoctorParams = {
      query: testCase.query,
    };

    const result = (await queryDoctor.run(params)) as QueryDoctorResult;

    if (result.success && result.data) {
      console.log(`Score: ${result.data.score}/100`);
      console.log(`Estimated Cost: ${result.data.estimatedCost}/1000`);
      console.log(`Issues Found: ${result.data.issues.length}`);
      console.log(`Summary: ${result.data.summary}\n`);

      if (result.data.issues.length > 0) {
        console.log('Issues:');
        result.data.issues.forEach((issue, idx) => {
          console.log(`  ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.type}`);
          console.log(`     ${issue.description}`);
          console.log(`     Recommendation: ${issue.recommendation}`);
        });
      }

      if (result.data.optimizedQuery) {
        console.log(`\nOptimized Query Suggestion:`);
        console.log(result.data.optimizedQuery);
      }
    } else {
      console.log(`Error: ${result.error}`);
    }

    console.log('\n');
  }

  // Print summary
  console.log('===================================');
  console.log('Test Suite Complete');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
