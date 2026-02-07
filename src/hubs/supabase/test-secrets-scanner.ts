/**
 * Test: Supabase Secrets Scanner (S-04)
 * Demonstrates usage and validation
 */

import { SupabaseSecretsScanner } from './supabase-secrets-scanner';

async function testSecretsScanner() {
  const scanner = new SupabaseSecretsScanner();

  console.log('Skill Info:', scanner.getInfo());
  console.log('\n--- Test 1: Scan current directory ---\n');

  // Test 1: Basic scan
  const result1 = await scanner.run({
    scanPath: process.cwd(),
    includeGitHistory: false,
  });

  console.log('Result:', JSON.stringify(result1, null, 2));

  if (result1.data?.secrets && result1.data.secrets.length > 0) {
    console.log('\n--- Secrets Found ---\n');
    result1.data.secrets.forEach((secret, index) => {
      console.log(`${index + 1}. ${secret.type.toUpperCase()}`);
      console.log(`   File: ${secret.file}:${secret.line}`);
      console.log(`   Severity: ${secret.severity}`);
      console.log(`   Snippet: ${secret.snippet}`);
      console.log(`   Recommendation: ${secret.recommendation}\n`);
    });
  }

  console.log('\n--- Test 2: Custom file patterns ---\n');

  // Test 2: Custom patterns
  const result2 = await scanner.run({
    scanPath: process.cwd(),
    filePatterns: ['**/.env*', '**/config.json', '**/secrets.json'],
    includeGitHistory: false,
  });

  console.log('Files scanned:', result2.data?.filesScanned);
  console.log('Secrets found:', result2.data?.patternsMatched);

  console.log('\n--- Test 3: With git history (if in git repo) ---\n');

  // Test 3: Include git history
  const result3 = await scanner.run({
    scanPath: process.cwd(),
    includeGitHistory: true,
  });

  console.log('Result:', JSON.stringify(result3, null, 2));
}

// Run tests
testSecretsScanner().catch(console.error);
