/**
 * Test Suite - Connection Pool Manager (S-12)
 * Testes básicos e exemplo de uso do Connection Pool Manager
 */

import { SupabaseConnectionPool } from './supabase-connection-pool';

/**
 * Testes básicos do skill
 */
async function testConnectionPoolManager() {
  console.log('\n=== Supabase Connection Pool Manager Tests ===\n');

  const skill = new SupabaseConnectionPool();

  // Teste 1: Monitor
  console.log('Test 1: Full Analysis');
  const result1 = await skill.run({
    action: 'full-analysis',
  });
  console.log('Success:', result1.success);
  if (result1.success && result1.data) {
    console.log('Pool Stats:', {
      total: result1.data.poolStats.connections.total,
      active: result1.data.poolStats.connections.active,
      idle: result1.data.poolStats.connections.idle,
    });
    console.log('Recommendations:', result1.data.recommendations);
    console.log('Analysis Duration:', `${result1.data.analysisDuration}ms`);
  }

  // Teste 2: Detect Leaks
  console.log('\nTest 2: Leak Detection');
  const result2 = await skill.run({
    action: 'detect-leaks',
    options: {
      leakDetectionThreshold: 80,
    },
  });
  console.log('Success:', result2.success);
  if (result2.success && result2.data) {
    console.log('Leaks Detected:', result2.data.leakDetection.detected);
    console.log('Confidence:', `${result2.data.leakDetection.confidence.toFixed(1)}%`);
    console.log('Recommendation:', result2.data.leakDetection.recommendation);
  }

  // Teste 3: Health Check
  console.log('\nTest 3: Health Check');
  const result3 = await skill.run({
    action: 'health-check',
  });
  console.log('Success:', result3.success);
  if (result3.success && result3.data) {
    console.log('Health Summary:', {
      totalChecked: result3.data.healthSummary.totalChecked,
      healthy: result3.data.healthSummary.healthy,
      failureRate: `${result3.data.healthSummary.failureRate.toFixed(2)}%`,
      avgLatency: `${result3.data.healthSummary.avgLatency.toFixed(2)}ms`,
    });
  }

  // Teste 4: Auto-scale
  console.log('\nTest 4: Auto-scaling');
  const result4 = await skill.run({
    action: 'auto-scale',
    options: {
      minSize: 5,
      maxSize: 100,
      growthRate: 20,
      shrinkRate: 15,
    },
  });
  console.log('Success:', result4.success);
  if (result4.success && result4.data) {
    console.log('Scaling Info:', {
      currentSize: result4.data.scaling.currentSize,
      targetSize: result4.data.scaling.targetSize,
      minSize: result4.data.scaling.minSize,
      maxSize: result4.data.scaling.maxSize,
    });
    if (result4.data.actions.length > 0) {
      console.log('Actions Executed:', result4.data.actions);
    }
  }

  // Teste 5: Kill Idle Connections
  console.log('\nTest 5: Kill Idle Connections');
  const result5 = await skill.run({
    action: 'kill-idle',
    options: {
      idleTimeoutMs: 300000,
      maxKillPercentage: 25,
    },
  });
  console.log('Success:', result5.success);
  if (result5.success && result5.data) {
    if (result5.data.actions.length > 0) {
      const action = result5.data.actions[0];
      console.log('Action Details:', {
        type: action.type,
        executed: action.executed,
        connectionsAffected: action.connectionsAffected,
        reason: action.reason,
      });
    }
  }

  // Teste 6: Monitor com opções customizadas
  console.log('\nTest 6: Monitor with Custom Options');
  const result6 = await skill.run({
    action: 'monitor',
    options: {
      idleTimeoutMs: 600000,
      leakDetectionThreshold: 75,
    },
  });
  console.log('Success:', result6.success);
  if (result6.success && result6.data) {
    console.log('Throughput:', {
      requestsPerSecond: result6.data.poolStats.throughput.requestsPerSecond.toFixed(2),
      connectionsCreatedPerSecond: result6.data.poolStats.throughput.connectionsCreatedPerSecond.toFixed(2),
    });
    console.log('Timing:', {
      avgConnectionTime: `${result6.data.poolStats.timing.avgConnectionTime.toFixed(2)}ms`,
      avgQueryTime: `${result6.data.poolStats.timing.avgQueryTime.toFixed(2)}ms`,
    });
  }

  // Teste 7: Método auxiliar - Quick Pool Status
  console.log('\nTest 7: Quick Pool Status');
  const quickStatus = await skill.quickPoolStatus({});
  if (quickStatus) {
    console.log('Quick Status:', {
      total: quickStatus.connections.total,
      active: quickStatus.connections.active,
      idle: quickStatus.connections.idle,
      throughput: `${quickStatus.throughput.requestsPerSecond.toFixed(0)} req/s`,
    });
  }

  // Teste 8: Método auxiliar - Check Leak Risk
  console.log('\nTest 8: Check Leak Risk');
  const hasRisk = await skill.hasLeakRisk({});
  console.log('Has Leak Risk:', hasRisk);

  // Teste 9: Método auxiliar - Get Recommendations
  console.log('\nTest 9: Get Recommendations');
  const recommendations = await skill.getRecommendations({});
  console.log('Recommendations:', recommendations);

  // Teste 10: Validação de input
  console.log('\nTest 10: Input Validation');
  const invalidResult = await skill.run({
    action: 'invalid-action',
  } as any);
  console.log('Invalid action accepted:', invalidResult.success);
  console.log('Error:', invalidResult.error);

  console.log('\n=== All Tests Completed ===\n');
}

// Executar testes se este arquivo for chamado diretamente
if (require.main === module) {
  testConnectionPoolManager().catch(console.error);
}

export { testConnectionPoolManager };
