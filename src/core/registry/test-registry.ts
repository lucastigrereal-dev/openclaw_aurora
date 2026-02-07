/**
 * Registry Validation Test
 *
 * Run with: npx ts-node registry/test-registry.ts
 */

import {
  loadRegistry,
  getHubs,
  getAllSkills,
  getAllWorkflows,
  getStatistics,
  validateRegistry,
  searchSkillsByTag,
  getHighRiskWorkflows,
} from './index';

function test(name: string, fn: () => boolean): boolean {
  try {
    const result = fn();
    console.log(`${result ? '✅' : '❌'} ${name}`);
    return result;
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error}`);
    return false;
  }
}

console.log('\n🔍 OpenClaw Registry Validation\n');
console.log('='.repeat(50));

let passed = 0;
let total = 0;

// Test 1: Load registry
total++;
if (test('Load registry', () => {
  const registry = loadRegistry();
  return registry.version === '1.0.0';
})) passed++;

// Test 2: Check hub count
total++;
if (test('Registry has 3 hubs', () => {
  const hubs = getHubs();
  return hubs.length === 3;
})) passed++;

// Test 3: Check skill count
total++;
if (test('Registry has 53 skills', () => {
  const skills = getAllSkills();
  return skills.length === 53;
})) passed++;

// Test 4: Check workflow count
total++;
if (test('Registry has 19 workflows', () => {
  const workflows = getAllWorkflows();
  return workflows.length === 19;
})) passed++;

// Test 5: Check statistics
total++;
if (test('Statistics match data', () => {
  const stats = getStatistics();
  const skills = getAllSkills();
  const workflows = getAllWorkflows();
  const hubs = getHubs();
  return (
    stats.total_hubs === hubs.length &&
    stats.total_skills === skills.length &&
    stats.total_workflows === workflows.length
  );
})) passed++;

// Test 6: Enterprise hub has 9 skills
total++;
if (test('Enterprise hub has 9 personas', () => {
  const registry = loadRegistry();
  return registry.hubs.enterprise.skills.length === 9;
})) passed++;

// Test 7: Supabase hub has 30 skills
total++;
if (test('Supabase hub has 30 skills', () => {
  const registry = loadRegistry();
  return registry.hubs.supabase.skills.length === 30;
})) passed++;

// Test 8: Social hub has 14 skills
total++;
if (test('Social hub has 14 skills', () => {
  const registry = loadRegistry();
  return registry.hubs.social.skills.length === 14;
})) passed++;

// Test 9: Validate workflow references
total++;
if (test('All workflow steps reference valid skills', () => {
  const validation = validateRegistry();
  if (!validation.valid) {
    console.log('    Errors:', validation.errors);
  }
  return validation.valid;
})) passed++;

// Test 10: Search by tag works
total++;
if (test('Search by tag "security" returns skills', () => {
  const securitySkills = searchSkillsByTag('security');
  return securitySkills.length >= 4; // At least 4 P0 security skills
})) passed++;

// Test 11: High-risk workflows
total++;
if (test('High-risk workflows identified', () => {
  const highRisk = getHighRiskWorkflows();
  return highRisk.length >= 3;
})) passed++;

// Test 12: Hub categories
total++;
if (test('All hubs have valid categories', () => {
  const hubs = getHubs();
  const validCategories = ['development', 'data', 'content', 'integration', 'security', 'operations'];
  return hubs.every(h => validCategories.includes(h.category));
})) passed++;

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Results: ${passed}/${total} tests passed\n`);

// Summary
const registry = loadRegistry();
console.log('📋 Registry Summary:');
console.log(`   Version: ${registry.version}`);
console.log(`   Hubs: ${getHubs().length}`);
console.log(`   Skills: ${getAllSkills().length}`);
console.log(`   Workflows: ${getAllWorkflows().length}`);
console.log('');

for (const hub of getHubs()) {
  console.log(`   📦 ${hub.name} (${hub.id})`);
  console.log(`      Category: ${hub.category}`);
  console.log(`      Skills: ${hub.skills.length}`);
  console.log(`      Workflows: ${hub.workflows.length}`);
  console.log(`      Risk Level: ${hub.risk_level}`);
}

process.exit(passed === total ? 0 : 1);
