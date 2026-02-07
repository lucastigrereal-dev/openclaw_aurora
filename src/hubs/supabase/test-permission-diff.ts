/**
 * Test: Permission Diff Engine (S-03)
 * Demonstra como usar o skill de análise de diferenças de permissão
 *
 * @version 1.0.0
 */

import { SupabasePermissionDiff, PermissionDiffParams } from './supabase-permission-diff';

/**
 * Exemplo de uso básico
 */
async function testPermissionDiff() {
  console.log('[TEST] Permission Diff Engine\n');

  const skill = new SupabasePermissionDiff();
  console.log('Skill Info:', skill.getInfo());
  console.log('\n');

  // Parâmetros de teste
  const params: PermissionDiffParams = {
    detectEscalations: true,
    // Credentials podem vir de .env via vault
  };

  console.log('Executando Permission Diff...\n');
  const result = await skill.run(params);

  if (result.success) {
    console.log('✓ Sucesso!\n');

    const data = result.data!;

    // Resumo
    console.log('RESUMO:');
    console.log(`  Total de Mudanças: ${data.summary.totalChanges}`);
    console.log(`  Grants Adicionados: ${data.summary.addedGrants}`);
    console.log(`  Grants Removidos: ${data.summary.removedGrants}`);
    console.log(`  Roles Modificadas: ${data.summary.modifiedRoles}`);
    console.log(`  Escalação Detectada: ${data.summary.escalationDetected}`);
    console.log(`  Timestamp: ${data.timestamp}\n`);

    // Mudanças
    if (data.changes.length > 0) {
      console.log('MUDANÇAS DETECTADAS:');
      data.changes.forEach((change, i) => {
        console.log(`\n  ${i + 1}. [${change.type.toUpperCase()}] ${change.action}`);
        console.log(`     Objeto: ${change.objectName}`);
        console.log(`     Grantee: ${change.grantee}`);
        console.log(`     Privilégio: ${change.privilege}`);
        console.log(`     Severidade: ${change.severity || 'unknown'}`);
      });
    }

    // Escalações
    if (data.escalations.length > 0) {
      console.log('\n\nESCALAÇÕES DETECTADAS:');
      data.escalations.forEach((escalation, i) => {
        console.log(`\n  ${i + 1}. [CRÍTICA] ${escalation.action}`);
        console.log(`     Grantee: ${escalation.grantee}`);
        console.log(`     Privilégio: ${escalation.privilege}`);
        console.log(`     Objeto: ${escalation.objectName}`);
      });
    }

    // Export
    console.log('\n\nEXPORTANDO MUDANÇAS...');
    const csv = skill.exportChanges(data.changes, 'csv');
    console.log('\nPrimeiras 3 linhas (CSV):');
    console.log(csv.split('\n').slice(0, 3).join('\n'));
  } else {
    console.error('✗ Erro:', result.error);
  }

  console.log('\n[TEST] Concluído\n');
}

/**
 * Exemplo com salvar baseline
 */
async function testSaveBaseline() {
  console.log('[TEST] Save Baseline\n');

  const skill = new SupabasePermissionDiff();

  const saved = await skill.saveBaseline({
    baselinePath: './baselines/permissions-baseline.json',
  });

  if (saved) {
    console.log('✓ Baseline salvo com sucesso!');
  } else {
    console.log('✗ Falha ao salvar baseline');
  }
}

// Executar testes
async function main() {
  try {
    await testPermissionDiff();
    console.log('\n' + '='.repeat(60) + '\n');
    await testSaveBaseline();
  } catch (error: any) {
    console.error('Erro ao executar testes:', error.message);
  }
}

// Run
if (require.main === module) {
  main();
}

export { testPermissionDiff, testSaveBaseline };
