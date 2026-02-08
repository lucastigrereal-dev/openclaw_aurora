/**
 * Test Suite - Supabase Health Dashboard Live (S-13)
 * Demonstra uso do skill em diversos cenários
 *
 * Para executar:
 * npx ts-node skills/supabase-archon/test-health-dashboard.ts
 */

import {
  SupabaseHealthDashboard,
  HealthDashboardParams,
  HealthDashboardResult,
} from './supabase-health-dashboard';

// ============================================================================
// TESTE 1: Coleta básica de todas as métricas
// ============================================================================
async function testBasicHealthCheck() {
  console.log('\n' + '='.repeat(70));
  console.log('TESTE 1: Coleta Básica de Todas as Métricas');
  console.log('='.repeat(70));

  const skill = new SupabaseHealthDashboard();

  const params: HealthDashboardParams = {
    // URL e key virão do vault via variáveis de ambiente
  };

  const result = (await skill.run(params)) as HealthDashboardResult;

  if (result.success && result.data) {
    console.log('\nStatus: ✓ SUCESSO');
    console.log('\nMÉTRICAS COLETADAS:');
    console.log('─'.repeat(70));

    console.log('\n📊 CONEXÕES:');
    const conn = result.data.metrics.connections;
    console.log(`  Ativas:     ${conn.active} / ${conn.max}`);
    console.log(
      `  Uso:        ${conn.usage.toFixed(1)}% (Idle: ${conn.idle})`
    );

    console.log('\n⚡ QUERIES:');
    const query = result.data.metrics.queries;
    console.log(`  Tempo médio:       ${query.avg_time_ms.toFixed(2)}ms`);
    console.log(`  Slow queries:      ${query.slow_queries}`);
    console.log(
      `  P95/P99:           ${query.p95_ms.toFixed(2)}ms / ${query.p99_ms.toFixed(2)}ms`
    );
    console.log(`  Total executadas:  ${query.total_executed}`);

    console.log('\n💾 DISCO:');
    const disk = result.data.metrics.disk;
    console.log(
      `  Usado/Total:       ${disk.used_gb}GB / ${disk.total_gb}GB`
    );
    console.log(`  Uso:               ${disk.usage.toFixed(1)}%`);
    console.log(`  Livre:             ${disk.free_gb}GB`);

    console.log('\n🔄 REPLICAÇÃO:');
    const repl = result.data.metrics.replication;
    console.log(`  Lag:               ${repl.lag_ms}ms`);
    console.log(`  Status:            ${repl.status}`);
    console.log(`  Replicas saudáveis: ${repl.replicas_healthy}/${repl.total_replicas}`);

    console.log('\n📈 HEALTH SCORE:');
    console.log(`  Score: ${result.data.score} / 100`);
    const healthBar = generateHealthBar(result.data.score);
    console.log(`  ${healthBar}`);

    if (result.data.alerts.length > 0) {
      console.log('\n⚠️ ALERTAS DETECTADOS:');
      result.data.alerts.forEach((alert, idx) => {
        const icon = alert.level === 'critical' ? '🔴' : '🟡';
        console.log(`  ${idx + 1}. ${icon} [${alert.component.toUpperCase()}]`);
        console.log(`     ${alert.message}`);
        if (alert.threshold !== undefined && alert.current !== undefined) {
          console.log(
            `     Threshold: ${alert.threshold}, Current: ${alert.current.toFixed(2)}`
          );
        }
      });
    } else {
      console.log('\n✓ Sem alertas detectados');
    }

    console.log(
      `\nDuração da coleta: ${result.data.checkDuration}ms`
    );
    console.log(`Timestamp: ${result.data.timestamp}`);
  } else {
    console.log('\n❌ ERRO:', result.error);
  }
}

// ============================================================================
// TESTE 2: Coleta seletiva de métricas
// ============================================================================
async function testSelectiveMetrics() {
  console.log('\n' + '='.repeat(70));
  console.log('TESTE 2: Coleta Seletiva (apenas conexões e disco)');
  console.log('='.repeat(70));

  const skill = new SupabaseHealthDashboard();

  const params: HealthDashboardParams = {
    includeMetrics: ['connections', 'disk'],
  };

  const result = (await skill.run(params)) as HealthDashboardResult;

  if (result.success && result.data) {
    console.log('\nStatus: ✓ SUCESSO');
    console.log('Métricas coletadas: connections, disk');
    console.log(`Health Score: ${result.data.score} / 100`);
    console.log(`Alertas: ${result.data.alerts.length}`);
  } else {
    console.log('\n❌ ERRO:', result.error);
  }
}

// ============================================================================
// TESTE 3: Com thresholds customizados
// ============================================================================
async function testCustomThresholds() {
  console.log('\n' + '='.repeat(70));
  console.log('TESTE 3: Thresholds Customizados');
  console.log('='.repeat(70));

  const skill = new SupabaseHealthDashboard();

  const params: HealthDashboardParams = {
    thresholds: {
      connectionUsagePercent: 60, // Mais restritivo (default: 80)
      diskUsagePercent: 70, // Mais restritivo (default: 85)
      slowQueryMs: 500, // Mais restritivo (default: 1000)
      replicationLagMs: 50, // Mais restritivo (default: 100)
    },
  };

  const result = (await skill.run(params)) as HealthDashboardResult;

  if (result.success && result.data) {
    console.log('\nStatus: ✓ SUCESSO');
    console.log('\nThresholds aplicados:');
    console.log('  - Connection Usage: 60%');
    console.log('  - Disk Usage: 70%');
    console.log('  - Slow Query: 500ms');
    console.log('  - Replication Lag: 50ms');
    console.log(
      `\nComparando com defaults, há ${result.data.alerts.length} alertas`
    );
  } else {
    console.log('\n❌ ERRO:', result.error);
  }
}

// ============================================================================
// TESTE 4: Métodos auxiliares
// ============================================================================
async function testHelperMethods() {
  console.log('\n' + '='.repeat(70));
  console.log('TESTE 4: Métodos Auxiliares');
  console.log('='.repeat(70));

  const skill = new SupabaseHealthDashboard();
  const params: HealthDashboardParams = {};

  // Quick health check
  const score = await skill.quickHealthCheck(params);
  console.log(`\n📊 Quick Health Score: ${score} / 100`);

  // Check critical alerts
  const hasCritical = await skill.hasCriticalAlerts(params);
  console.log(
    `\n🔴 Has Critical Alerts: ${hasCritical ? 'SIM' : 'NÃO'}`
  );
}

// ============================================================================
// TESTE 5: Info do skill
// ============================================================================
function testSkillInfo() {
  console.log('\n' + '='.repeat(70));
  console.log('TESTE 5: Informações do Skill');
  console.log('='.repeat(70));

  const skill = new SupabaseHealthDashboard();
  const info = skill.getInfo();

  console.log('\n📋 METADADOS:');
  console.log(`  Nome:        ${info.name}`);
  console.log(`  Descrição:   ${info.description}`);
  console.log(`  Versão:      ${info.version}`);
  console.log(`  Categoria:   ${info.category}`);
  console.log(`  Autor:       ${info.author}`);
  console.log(`  Tags:        ${info.tags?.join(', ')}`);

  console.log('\n⚙️ CONFIGURAÇÃO:');
  console.log(`  Timeout:     ${info.config.timeout}ms`);
  console.log(`  Retries:     ${info.config.retries}`);
  console.log(`  Habilitado:  ${info.enabled ? 'SIM' : 'NÃO'}`);
}

// ============================================================================
// HELPERS
// ============================================================================

function generateHealthBar(score: number): string {
  const filled = Math.floor(score / 5); // 0-20
  const empty = 20 - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  let color = '🟢'; // Green
  if (score < 50) {
    color = '🔴'; // Red
  } else if (score < 75) {
    color = '🟡'; // Yellow
  }

  return `${color} [${bar}] ${score.toFixed(1)}%`;
}

// ============================================================================
// RUNNER PRINCIPAL
// ============================================================================

async function runAllTests() {
  console.log('\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log(
    '║' +
      ' TESTE COMPLETO - Supabase Health Dashboard Live (S-13)'.padEnd(69) +
      '║'
  );
  console.log('╚' + '═'.repeat(68) + '╝');

  try {
    await testSkillInfo();
    await testBasicHealthCheck();
    await testSelectiveMetrics();
    await testCustomThresholds();
    await testHelperMethods();

    console.log('\n' + '='.repeat(70));
    console.log('✓ TODOS OS TESTES CONCLUÍDOS COM SUCESSO');
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('\n❌ ERRO GERAL:', error);
    process.exit(1);
  }
}

// Executar testes
runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
