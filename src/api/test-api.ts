/**
 * Teste da API OpenClaw
 * Executa: npx ts-node api/test-api.ts
 */

const API_BASE = 'http://localhost:3333';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

async function request(method: string, path: string, body?: any): Promise<any> {
  const url = `${API_BASE}${path}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  return response.json();
}

async function runTests(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           OPENCLAW API - TESTE DE ENDPOINTS                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  const results: TestResult[] = [];

  // Test 1: Health
  console.log('  📡 Testando GET /api/v1/health...');
  try {
    const start = Date.now();
    const res = await request('GET', '/api/v1/health');
    const passed = res.success === true && res.data?.status === 'healthy';
    results.push({ name: 'GET /api/v1/health', passed, duration: Date.now() - start });
    console.log(`     ${passed ? '✅' : '❌'} Status: ${res.data?.status}`);
  } catch (e) {
    results.push({ name: 'GET /api/v1/health', passed: false, duration: 0, error: String(e) });
    console.log(`     ❌ Erro: ${e}`);
  }

  // Test 2: Status
  console.log('  📡 Testando GET /api/v1/status...');
  try {
    const start = Date.now();
    const res = await request('GET', '/api/v1/status');
    const passed = res.success === true && res.data?.hubs !== undefined;
    results.push({ name: 'GET /api/v1/status', passed, duration: Date.now() - start });
    console.log(`     ${passed ? '✅' : '❌'} Hubs: ${Object.keys(res.data?.hubs || {}).length}`);
  } catch (e) {
    results.push({ name: 'GET /api/v1/status', passed: false, duration: 0, error: String(e) });
    console.log(`     ❌ Erro: ${e}`);
  }

  // Test 3: List Hubs
  console.log('  📡 Testando GET /api/v1/hubs...');
  try {
    const start = Date.now();
    const res = await request('GET', '/api/v1/hubs');
    const passed = res.success === true && res.data?.hubs?.length === 3;
    results.push({ name: 'GET /api/v1/hubs', passed, duration: Date.now() - start });
    console.log(`     ${passed ? '✅' : '❌'} Hubs encontrados: ${res.data?.hubs?.length}`);
    if (res.data?.hubs) {
      res.data.hubs.forEach((h: any) => console.log(`        - ${h.id}: ${h.name}`));
    }
  } catch (e) {
    results.push({ name: 'GET /api/v1/hubs', passed: false, duration: 0, error: String(e) });
    console.log(`     ❌ Erro: ${e}`);
  }

  // Test 4: Get Hub Detail
  console.log('  📡 Testando GET /api/v1/hubs/enterprise...');
  try {
    const start = Date.now();
    const res = await request('GET', '/api/v1/hubs/enterprise');
    const passed = res.success === true && res.data?.manifest?.name === 'enterprise';
    results.push({ name: 'GET /api/v1/hubs/enterprise', passed, duration: Date.now() - start });
    console.log(`     ${passed ? '✅' : '❌'} Hub: ${res.data?.manifest?.display_name}`);
    console.log(`        Workflows: ${res.data?.workflows?.length}`);
  } catch (e) {
    results.push({ name: 'GET /api/v1/hubs/enterprise', passed: false, duration: 0, error: String(e) });
    console.log(`     ❌ Erro: ${e}`);
  }

  // Test 5: Post Intent
  console.log('  📡 Testando POST /api/v1/intent...');
  try {
    const start = Date.now();
    const res = await request('POST', '/api/v1/intent', {
      message: 'Gerar um texto de teste',
      origin: 'api',
    });
    const passed = res.success === true && res.data?.plan_id !== undefined;
    results.push({ name: 'POST /api/v1/intent', passed, duration: Date.now() - start });
    console.log(`     ${passed ? '✅' : '❌'} Plan ID: ${res.data?.plan_id}`);
    console.log(`        Status: ${res.data?.status}`);
    console.log(`        Authorization: ${res.data?.authorization?.decision} (score: ${res.data?.authorization?.risk_score})`);
  } catch (e) {
    results.push({ name: 'POST /api/v1/intent', passed: false, duration: 0, error: String(e) });
    console.log(`     ❌ Erro: ${e}`);
  }

  // Test 6: List Executions
  console.log('  📡 Testando GET /api/v1/executions...');
  try {
    const start = Date.now();
    const res = await request('GET', '/api/v1/executions');
    const passed = res.success === true && Array.isArray(res.data?.executions);
    results.push({ name: 'GET /api/v1/executions', passed, duration: Date.now() - start });
    console.log(`     ${passed ? '✅' : '❌'} Execuções: ${res.data?.executions?.length}`);
  } catch (e) {
    results.push({ name: 'GET /api/v1/executions', passed: false, duration: 0, error: String(e) });
    console.log(`     ❌ Erro: ${e}`);
  }

  // Test 7: Execute Hub Workflow (validation only - missing params)
  console.log('  📡 Testando POST /api/v1/hubs/supabase/execute (validação)...');
  try {
    const start = Date.now();
    const res = await request('POST', '/api/v1/hubs/supabase/execute', {
      workflow: 'security-audit',
      params: {}, // Missing connectionString
    });
    // Esperamos erro de validação
    const passed = res.success === false && res.error?.code === 'VALIDATION_ERROR';
    results.push({ name: 'POST /api/v1/hubs/supabase/execute (validation)', passed, duration: Date.now() - start });
    console.log(`     ${passed ? '✅' : '❌'} Validação funcionou: ${res.error?.message}`);
  } catch (e) {
    results.push({ name: 'POST /api/v1/hubs/supabase/execute (validation)', passed: false, duration: 0, error: String(e) });
    console.log(`     ❌ Erro: ${e}`);
  }

  // Test 8: Execute Hub Workflow (success)
  console.log('  📡 Testando POST /api/v1/hubs/supabase/execute (execução)...');
  try {
    const start = Date.now();
    const res = await request('POST', '/api/v1/hubs/supabase/execute', {
      workflow: 'security-audit',
      params: {
        connectionString: 'postgresql://test:test@localhost:5432/test',
      },
    });
    const passed = res.success === true && res.data?.status === 'completed';
    results.push({ name: 'POST /api/v1/hubs/supabase/execute', passed, duration: Date.now() - start });
    console.log(`     ${passed ? '✅' : '❌'} Status: ${res.data?.status}`);
    console.log(`        Steps executados: ${res.data?.metrics?.steps_executed}`);
    console.log(`        Duração: ${res.data?.metrics?.total_duration_ms}ms`);
  } catch (e) {
    results.push({ name: 'POST /api/v1/hubs/supabase/execute', passed: false, duration: 0, error: String(e) });
    console.log(`     ❌ Erro: ${e}`);
  }

  // Test 9: 404 handling
  console.log('  📡 Testando 404 handling...');
  try {
    const start = Date.now();
    const res = await request('GET', '/api/v1/naoexiste');
    const passed = res.success === false && res.error?.code === 'NOT_FOUND';
    results.push({ name: '404 handling', passed, duration: Date.now() - start });
    console.log(`     ${passed ? '✅' : '❌'} 404 retornado corretamente`);
  } catch (e) {
    results.push({ name: '404 handling', passed: false, duration: 0, error: String(e) });
    console.log(`     ❌ Erro: ${e}`);
  }

  // Summary
  console.log('');
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('  RESUMO DOS TESTES');
  console.log('══════════════════════════════════════════════════════════════════');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(r => {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.name} (${r.duration}ms)`);
  });

  console.log('');
  console.log('──────────────────────────────────────────────────────────────────');
  if (failed === 0) {
    console.log(`  ✅ TODOS OS TESTES PASSARAM (${passed}/${results.length})`);
  } else {
    console.log(`  ❌ ${failed} TESTE(S) FALHARAM (${passed}/${results.length})`);
  }
  console.log('──────────────────────────────────────────────────────────────────');
  console.log('');
}

runTests().catch(console.error);
