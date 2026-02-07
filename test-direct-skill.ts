#!/usr/bin/env node

/**
 * Teste direto de skills via Node.js (sem WebSocket)
 */

import { getSkillRegistry, registerAllSkills } from './skills';

async function runTests() {
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
    skills.slice(0, 10).forEach(s => {
      console.log(`   - ${s.name} (${s.category}): ${s.description}`);
    });
    if (skills.length > 10) {
      console.log(`   ... e mais ${skills.length - 10} skills`);
    }

    console.log('\n▶️  Executando testes...\n');

    // Test 1: util.datetime
    console.log('Test 1️⃣ : util.datetime (data/hora atual)');
    const skill1 = registry.get('util.datetime');
    if (skill1) {
      const result1 = await skill1.run({ operation: 'now' });
      console.log('✅ Resultado:');
      console.log('   ', JSON.stringify(result1, null, 2).split('\n').join('\n    '));
      console.log('');

      // Test 2: util.uuid
      console.log('Test 2️⃣ : util.uuid (gerar IDs aleatórios)');
      const skill2 = registry.get('util.uuid');
      if (skill2) {
        const result2 = await skill2.run({ count: 2 });
        console.log('✅ Resultado:');
        console.log('   ', JSON.stringify(result2, null, 2).split('\n').join('\n    '));
        console.log('');

        // Test 3: file.list
        console.log('Test 3️⃣ : file.list (listar arquivos do diretório atual)');
        const skill3 = registry.get('file.list');
        if (skill3) {
          const result3 = await skill3.run({ path: '.' });
          console.log('✅ Resultado (primeiros 5 arquivos):');
          if (result3.success && result3.data && Array.isArray(result3.data)) {
            result3.data.slice(0, 5).forEach(file => {
              console.log(`   - ${file}`);
            });
            if (result3.data.length > 5) {
              console.log(`   ... e mais ${result3.data.length - 5} arquivos`);
            }
          } else {
            console.log('   ', JSON.stringify(result3, null, 2).split('\n').join('\n    '));
          }
          console.log('');

          // Test 4: exec.bash (simples)
          console.log('Test 4️⃣ : exec.bash (executar comando simples)');
          const skill4 = registry.get('exec.bash');
          if (skill4) {
            const result4 = await skill4.run({ command: 'echo "OpenClaw Aurora - Test OK"' });
            console.log('✅ Resultado:');
            console.log('   ', JSON.stringify(result4, null, 2).split('\n').join('\n    '));
            console.log('');
          }

          // Test 5: exec.powershell (Windows)
          console.log('Test 5️⃣ : exec.powershell (executar no PowerShell)');
          const skill5 = registry.get('exec.powershell');
          if (skill5) {
            const result5 = await skill5.run({ command: 'Write-Host "OpenClaw Aurora PowerShell Test"' });
            console.log('✅ Resultado:');
            console.log('   ', JSON.stringify(result5, null, 2).split('\n').join('\n    '));
          }

          console.log('\n🎉 Testes concluídos com sucesso!');
        }
      }
    } else {
      console.error('❌ Skill util.datetime não encontrada');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Erro ao executar testes:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
