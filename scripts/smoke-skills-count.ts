/**
 * Smoke Test: Skills Count
 * Verifica se as skills foram registradas corretamente
 */

const s = require('../skills');

console.log('='.repeat(60));
console.log('SMOKE TEST: Skills Registration');
console.log('='.repeat(60));

try {
  // Registra todas as skills
  const registry = s.registerAllSkills();

  // Obtém stats
  const stats = registry.getStats();
  const allSkills = registry.listAll();

  console.log(`\n✓ Total de skills registradas: ${stats.total}`);
  console.log(`✓ Skills habilitadas: ${stats.enabled}`);
  console.log(`✓ Skills por categoria:`, stats.byCategory);

  // Lista as primeiras 20 skills
  console.log(`\n📋 Lista das primeiras ${Math.min(20, allSkills.length)} skills:`);
  console.log('-'.repeat(60));

  allSkills.slice(0, 20).forEach((skill: any, index: number) => {
    const name = skill.name || 'unknown';
    const desc = skill.description || 'no description';
    const category = skill.category || '?';
    console.log(`${index + 1}. [${category}] ${name}`);
    console.log(`   ${desc}`);
  });

  // Validação
  if (stats.total === 0) {
    console.error('\n❌ FALHA: Nenhuma skill foi registrada!');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ SMOKE TEST PASSOU');
  console.log('='.repeat(60));
  process.exit(0);
} catch (error: any) {
  console.error('\n❌ ERRO:', error.message);
  console.error(error.stack);
  process.exit(1);
}
