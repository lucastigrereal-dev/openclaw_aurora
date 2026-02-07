#!/usr/bin/env node

/**
 * Teste direto de skills via Node.js (sem WebSocket)
 */

// Simular carregamento de módulos TypeScript (já está compilado)
const { getSkillRegistry, registerAllSkills } = require('./dist/skills');

console.log('🔬 Teste de Skills OpenClaw Aurora\n');

try {
  // Registrar skills
  console.log('📦 Registrando skills...');
  const registry = getSkillRegistry();
  registerAllSkills(registry);

  const stats = registry.getStats();
  console.log(`✅ ${stats.total} skills registradas\n`);

  // Listar skills
  console.log('📋 Skills disponíveis:');
  const skills = registry.listAll();
  skills.forEach(s => {
    console.log(`   - ${s.name} (${s.category}): ${s.description}`);
  });

  console.log('\n▶️  Executando testes...\n');

  // Test 1: util.datetime
  console.log('Test 1️⃣ : util.datetime');
  const skill1 = registry.get('util.datetime');
  if (skill1) {
    skill1.run({ operation: 'now' }).then(result => {
      console.log('✅ Resultado:', JSON.stringify(result, null, 2));
      console.log('');

      // Test 2: util.uuid
      console.log('Test 2️⃣ : util.uuid');
      const skill2 = registry.get('util.uuid');
      if (skill2) {
        return skill2.run({ count: 2 });
      }
    }).then(result => {
      if (result) {
        console.log('✅ Resultado:', JSON.stringify(result, null, 2));
        console.log('');

        // Test 3: file.list
        console.log('Test 3️⃣ : file.list (diretório atual)');
        const skill3 = registry.get('file.list');
        if (skill3) {
          return skill3.run({ path: '.' });
        }
      }
    }).then(result => {
      if (result) {
        console.log('✅ Resultado:', JSON.stringify(result, null, 2));
        console.log('\n🎉 Testes concluídos com sucesso!');
      }
    }).catch(error => {
      console.error('❌ Erro:', error.message);
      process.exit(1);
    });
  } else {
    console.error('❌ Skill util.datetime não encontrada');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Erro ao inicializar:', error.message);
  console.error(error.stack);
  process.exit(1);
}
