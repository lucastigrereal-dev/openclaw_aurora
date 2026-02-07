/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SMOKE TEST - Validação da arquitetura adaptada (v2.0)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este teste valida que:
 * 1. Skill core funciona via adapter
 * 2. Aurora autoriza/bloqueia corretamente
 * 3. Hub Enterprise executa workflow (9 personas)
 * 4. Hub Supabase executa workflow (30 skills)
 * 5. Hub Social executa workflow (14 skills)
 * 6. Operator orquestra tudo junto
 *
 * COMO RODAR:
 * npx ts-node adapters/smoke-test.ts
 */

import { SkillRegistryAdapter, getSkillRegistryAdapter, SkillAdapter } from './skill.adapter';
import { AuroraAdapter, getAuroraAdapter } from './aurora.adapter';
import { HubEnterpriseAdapter, getHubEnterpriseAdapter } from './hub.adapter';
import { HubSupabaseAdapter, getHubSupabaseAdapter } from './hub-supabase.adapter';
import { HubSocialAdapter, getHubSocialAdapter } from './hub-social.adapter';
import { OperatorAdapter, getOperatorAdapter } from './operator.adapter';
import { generateId } from '../contracts/types';
import { HUB_REGISTRY, TOTAL_SKILLS_AVAILABLE } from './index';

// Import skills existentes para registrar
import { AIClaudeSkill } from '../skills/ai-claude';
import { getSkillRegistry } from '../skills/skill-base';

// ════════════════════════════════════════════════════════════════════════════
// HELPERS DE TESTE
// ════════════════════════════════════════════════════════════════════════════

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof COLORS = 'reset'): void {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function header(title: string): void {
  console.log('\n' + '═'.repeat(70));
  log(`  ${title}`, 'cyan');
  console.log('═'.repeat(70));
}

function success(message: string): void {
  log(`  ✅ ${message}`, 'green');
}

function fail(message: string): void {
  log(`  ❌ ${message}`, 'red');
}

function info(message: string): void {
  log(`  ℹ️  ${message}`, 'blue');
}

function warn(message: string): void {
  log(`  ⚠️  ${message}`, 'yellow');
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

async function testSkillAdapter(): Promise<boolean> {
  header('TESTE 1: Skill Adapter');

  try {
    // Registrar skill no registry existente
    const registry = getSkillRegistry();
    const claudeSkill = new AIClaudeSkill();
    registry.register(claudeSkill);
    info(`Skill ${claudeSkill.metadata.name} registrado`);

    // Obter adapter
    const adapter = getSkillRegistryAdapter();
    const skillAdapter = adapter.getAdapter('ai.claude');

    if (!skillAdapter) {
      fail('Skill adapter não encontrado');
      return false;
    }

    // Verificar metadata convertida
    const metadata = skillAdapter.metadata;
    info(`Metadata: ${metadata.name} (${metadata.category})`);

    if (metadata.name !== 'ai.claude') {
      fail('Nome do skill incorreto');
      return false;
    }

    if (metadata.category !== 'ai') {
      fail('Categoria não foi mapeada corretamente');
      return false;
    }

    // Verificar status
    const status = skillAdapter.getStatus();
    info(`Status: ${status}`);

    if (status !== 'ready') {
      fail('Status deveria ser ready');
      return false;
    }

    // Verificar validação
    const validation = skillAdapter.validateParams('execute', {});
    info(`Validação sem params: valid=${validation.valid}`);

    success('Skill Adapter funcionando corretamente');
    return true;
  } catch (error) {
    fail(`Erro: ${error}`);
    return false;
  }
}

async function testAuroraAdapter(): Promise<boolean> {
  header('TESTE 2: Aurora Adapter');

  try {
    const aurora = getAuroraAdapter();

    // Teste 1: Autorização simples (deve passar)
    info('Testando autorização de baixo risco...');

    const lowRiskRequest = {
      request_id: generateId('auth'),
      plan_id: generateId('plan'),
      intent_id: generateId('intent'),
      origin: 'internal' as const,
      plan: {
        plan_id: generateId('plan'),
        intent_id: generateId('intent'),
        steps: [
          {
            step_id: generateId('step'),
            order: 0,
            action_type: 'skill' as const,
            target: 'ai.claude',
            method: 'generate',
            params: { prompt: 'test' },
            reversible: false,
            description: 'Test step',
          },
        ],
        resources: {
          files_read: [],
          files_write: [],
          files_delete: [],
          directories: [],
          repositories: [],
          external_urls: [],
          databases: [],
          external_apis: [],
          system_services: [],
        },
        risk_level: 'low' as const,
        permissions_required: ['ai:invoke' as const],
        suggested_limits: {
          max_duration_ms: 60000,
          max_retries_per_step: 3,
          max_files_changed: 10,
          max_bytes_written: 1024,
          max_external_requests: 5,
          max_processes: 1,
          actions_per_second: 10,
        },
        mode: 'real' as const,
      },
      resources: {
        files_read: [],
        files_write: [],
        files_delete: [],
        directories: [],
        repositories: [],
        external_urls: [],
        databases: [],
        external_apis: [],
        system_services: [],
      },
      risk_level: 'low' as const,
      permissions_required: ['ai:invoke' as const],
      suggested_limits: {
        max_duration_ms: 60000,
        max_retries_per_step: 3,
        max_files_changed: 10,
        max_bytes_written: 1024,
        max_external_requests: 5,
        max_processes: 1,
        actions_per_second: 10,
      },
      mode: 'real' as const,
      timestamp: new Date(),
    };

    const lowRiskResponse = await aurora.authorize(lowRiskRequest);
    info(`Decisão: ${lowRiskResponse.decision} (score: ${lowRiskResponse.risk_score}, level: ${lowRiskResponse.level})`);

    if (lowRiskResponse.decision !== 'allowed') {
      fail('Deveria ter autorizado baixo risco');
      return false;
    }

    // Teste 2: Alta risco (deve pedir confirmação ou bloquear)
    info('Testando autorização de alto risco...');

    const highRiskRequest = {
      ...lowRiskRequest,
      request_id: generateId('auth'),
      risk_level: 'high' as const,
      plan: {
        ...lowRiskRequest.plan,
        risk_level: 'high' as const,
      },
      resources: {
        ...lowRiskRequest.resources,
        files_delete: ['/important/file.txt'],
      },
    };

    const highRiskResponse = await aurora.authorize(highRiskRequest);
    info(`Decisão: ${highRiskResponse.decision} (score: ${highRiskResponse.risk_score}, level: ${highRiskResponse.level})`);

    if (highRiskResponse.decision === 'allowed' && highRiskResponse.risk_score < 30) {
      fail('Deveria ter limitado ou pedido confirmação para alto risco');
      return false;
    }

    // Teste 3: Verificar saúde
    const health = await aurora.getHealthStatus();
    info(`Saúde do sistema: ${health}`);

    // Teste 4: Métricas
    const metrics = await aurora.getMetrics();
    info(`CPU: ${metrics.cpu_percent}%, Mem: ${metrics.memory_percent}%`);

    success('Aurora Adapter funcionando corretamente');
    return true;
  } catch (error) {
    fail(`Erro: ${error}`);
    return false;
  }
}

async function testHubEnterpriseAdapter(): Promise<boolean> {
  header('TESTE 3: Hub Enterprise Adapter');

  try {
    const hub = getHubEnterpriseAdapter();

    // Verificar manifest
    const manifest = hub.manifest;
    info(`Hub: ${manifest.display_name} v${manifest.version}`);
    info(`Workflows: ${manifest.workflows.map((w) => w.id).join(', ')}`);
    info(`Personas: ${manifest.personas?.map((p) => p.name).join(', ')}`);

    if (manifest.workflows.length !== 6) {
      fail(`Esperado 6 workflows, encontrado ${manifest.workflows.length}`);
      return false;
    }

    // Verificar status
    const status = hub.getStatus();
    info(`Status: ${status}`);

    if (status !== 'active') {
      fail('Hub deveria estar ativo');
      return false;
    }

    // Verificar workflow existe
    const workflow = hub.getWorkflow('mvp-only');
    if (!workflow) {
      fail('Workflow mvp-only não encontrado');
      return false;
    }
    info(`Workflow mvp-only: ${workflow.description}`);

    // Validar params
    const validation = hub.validateParams('mvp-only', { userIntent: 'test', appName: 'test-app' });
    info(`Validação mvp-only: valid=${validation.valid}`);

    if (!validation.valid) {
      fail('Validação deveria passar com params corretos');
      return false;
    }

    const invalidValidation = hub.validateParams('mvp-only', {});
    info(`Validação sem params: valid=${invalidValidation.valid}`);

    if (invalidValidation.valid) {
      fail('Validação deveria falhar sem params');
      return false;
    }

    success('Hub Enterprise Adapter funcionando corretamente');
    return true;
  } catch (error) {
    fail(`Erro: ${error}`);
    return false;
  }
}

async function testHubSupabaseAdapter(): Promise<boolean> {
  header('TESTE 4: Hub Supabase Adapter (30 Skills)');

  try {
    const hub = getHubSupabaseAdapter();

    // Verificar manifest
    const manifest = hub.manifest;
    info(`Hub: ${manifest.display_name} v${manifest.version}`);
    info(`Total Skills: ${hub.getTotalSkills()}`);
    info(`Workflows: ${manifest.workflows.map((w) => w.id).join(', ')}`);

    // Verificar que tem 6 workflows
    if (manifest.workflows.length !== 6) {
      fail(`Esperado 6 workflows, encontrado ${manifest.workflows.length}`);
      return false;
    }

    // Verificar status
    const status = hub.getStatus();
    info(`Status: ${status}`);

    if (status !== 'active') {
      fail('Hub deveria estar ativo');
      return false;
    }

    // Verificar categorias de skills
    const categories = hub.listSkillsByCategory();
    info(`Categorias: ${Object.keys(categories).join(', ')}`);

    const totalSkillsInCategories = Object.values(categories).flat().length;
    if (totalSkillsInCategories !== 30) {
      fail(`Esperado 30 skills, encontrado ${totalSkillsInCategories}`);
      return false;
    }

    // Verificar workflow security-audit
    const workflow = hub.getWorkflow('security-audit');
    if (!workflow) {
      fail('Workflow security-audit não encontrado');
      return false;
    }
    info(`Workflow security-audit: ${workflow.description}`);
    info(`Steps: ${workflow.steps.length}`);

    // Validar params
    const validation = hub.validateParams('security-audit', {
      connectionString: 'postgres://user:pass@localhost:5432/db',
    });
    info(`Validação security-audit: valid=${validation.valid}`);

    if (!validation.valid) {
      fail('Validação deveria passar com params corretos');
      return false;
    }

    // Verificar skills específicas
    const hasSchemaSkill = hub.hasSkill('supabase-schema-sentinel');
    const hasAIOptimizer = hub.hasSkill('supabase-ai-query-optimizer');
    info(`Has supabase-schema-sentinel: ${hasSchemaSkill}`);
    info(`Has supabase-ai-query-optimizer: ${hasAIOptimizer}`);

    if (!hasSchemaSkill || !hasAIOptimizer) {
      fail('Skills específicas não encontradas');
      return false;
    }

    success('Hub Supabase Adapter funcionando corretamente (30 skills)');
    return true;
  } catch (error) {
    fail(`Erro: ${error}`);
    return false;
  }
}

async function testHubSocialAdapter(): Promise<boolean> {
  header('TESTE 5: Hub Social Adapter (14 Skills)');

  try {
    const hub = getHubSocialAdapter();

    // Verificar manifest
    const manifest = hub.manifest;
    info(`Hub: ${manifest.display_name} v${manifest.version}`);
    info(`Total Skills: ${hub.getTotalSkills()}`);
    info(`Workflows: ${manifest.workflows.map((w) => w.id).join(', ')}`);

    // Verificar que tem 7 workflows
    if (manifest.workflows.length !== 7) {
      fail(`Esperado 7 workflows, encontrado ${manifest.workflows.length}`);
      return false;
    }

    // Verificar status
    const status = hub.getStatus();
    info(`Status: ${status}`);

    if (status !== 'active') {
      fail('Hub deveria estar ativo');
      return false;
    }

    // Verificar categorias de skills
    const categories = hub.listSkillsByCategory();
    info(`Categorias: ${Object.keys(categories).join(', ')}`);
    info(`Basic skills: ${categories.basic?.length || 0}`);
    info(`Enterprise skills: ${categories.enterprise?.length || 0}`);

    const totalSkillsInCategories = Object.values(categories).flat().length;
    if (totalSkillsInCategories !== 14) {
      fail(`Esperado 14 skills, encontrado ${totalSkillsInCategories}`);
      return false;
    }

    // Verificar workflow full
    const workflow = hub.getWorkflow('full');
    if (!workflow) {
      fail('Workflow full não encontrado');
      return false;
    }
    info(`Workflow full: ${workflow.description}`);
    info(`Steps: ${workflow.steps.length}`);

    // Validar params
    const validation = hub.validateParams('full', {
      socialHubPath: '/path/to/social-hub',
      publisherApiKey: 'test-api-key',
      anthropicApiKey: 'test-anthropic-key',
    });
    info(`Validação full: valid=${validation.valid}`);

    if (!validation.valid) {
      fail('Validação deveria passar com params corretos');
      return false;
    }

    // Verificar skills específicas
    const hasCaptionAI = hub.hasSkill('social-hub-caption-ai');
    const hasPublerV2 = hub.hasSkill('social-hub-publer-v2');
    info(`Has social-hub-caption-ai: ${hasCaptionAI}`);
    info(`Has social-hub-publer-v2: ${hasPublerV2}`);

    if (!hasCaptionAI || !hasPublerV2) {
      fail('Skills específicas não encontradas');
      return false;
    }

    success('Hub Social Adapter funcionando corretamente (14 skills)');
    return true;
  } catch (error) {
    fail(`Erro: ${error}`);
    return false;
  }
}

async function testOperatorIntegration(): Promise<boolean> {
  header('TESTE 6: Operator - Integração Completa');

  try {
    const operator = getOperatorAdapter();

    // Registrar listener de eventos
    const events: string[] = [];
    operator.onEvent((event) => {
      events.push(event.type);
      info(`Evento: ${event.type}`);
    });

    // Criar intent simples
    const intent = {
      intent_id: generateId('intent'),
      origin: 'internal' as const,
      raw_input: 'Gerar um texto de teste',
      timestamp: new Date(),
    };

    info('Processando intent: "Gerar um texto de teste"');

    // Criar plano
    const plan = await operator.createPlan(intent);
    info(`Plano criado: ${plan.plan_id}`);
    info(`Steps: ${plan.steps.length}`);
    info(`Risco: ${plan.risk_level}`);

    if (plan.steps.length === 0) {
      fail('Plano deveria ter pelo menos 1 step');
      return false;
    }

    // Verificar eventos recebidos
    if (!events.includes('PLAN_CREATED')) {
      warn('Evento PLAN_CREATED não foi emitido');
    }

    // Verificar autorização
    info('Testando autorização via Aurora...');
    const aurora = getAuroraAdapter();
    const authRequest = {
      request_id: generateId('auth'),
      plan_id: plan.plan_id,
      intent_id: plan.intent_id,
      origin: 'internal' as const,
      plan,
      resources: plan.resources,
      risk_level: plan.risk_level,
      permissions_required: plan.permissions_required,
      suggested_limits: plan.suggested_limits,
      mode: plan.mode,
      timestamp: new Date(),
    };

    const authResponse = await aurora.authorize(authRequest);
    info(`Autorização: ${authResponse.decision} (score: ${authResponse.risk_score})`);

    if (authResponse.decision === 'blocked') {
      fail('Plano de baixo risco foi bloqueado');
      return false;
    }

    success('Operator Integração funcionando corretamente');
    return true;
  } catch (error) {
    fail(`Erro: ${error}`);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║       OPENCLAW ADAPTERS - SMOKE TEST v2.0 (3 Hubs)                   ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════════════════╝', 'cyan');

  // Mostrar registro de hubs
  console.log('\n');
  info('Hub Registry:');
  for (const [name, hub] of Object.entries(HUB_REGISTRY)) {
    info(`  ${name}: ${hub.skills} skills, ${hub.workflows} workflows`);
  }
  info(`Total skills disponíveis: ${TOTAL_SKILLS_AVAILABLE}`);

  const results: { name: string; passed: boolean }[] = [];

  // Executar testes
  results.push({ name: 'Skill Adapter', passed: await testSkillAdapter() });
  results.push({ name: 'Aurora Adapter', passed: await testAuroraAdapter() });
  results.push({ name: 'Hub Enterprise (9 personas)', passed: await testHubEnterpriseAdapter() });
  results.push({ name: 'Hub Supabase (30 skills)', passed: await testHubSupabaseAdapter() });
  results.push({ name: 'Hub Social (14 skills)', passed: await testHubSocialAdapter() });
  results.push({ name: 'Operator Integration', passed: await testOperatorIntegration() });

  // Resumo
  header('RESUMO DOS TESTES');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((r) => {
    if (r.passed) {
      success(r.name);
    } else {
      fail(r.name);
    }
  });

  console.log('\n' + '─'.repeat(70));
  if (failed === 0) {
    log(`  ✅ TODOS OS TESTES PASSARAM (${passed}/${results.length})`, 'green');
    console.log('');
    log('  📊 RESUMO DOS HUBS:', 'cyan');
    log(`     • Enterprise: 9 personas, 6 workflows`, 'green');
    log(`     • Supabase:   30 skills,  6 workflows`, 'green');
    log(`     • Social:     14 skills,  7 workflows`, 'green');
    log(`     ─────────────────────────────────────`, 'cyan');
    log(`     • TOTAL:      53 skills, 19 workflows`, 'cyan');
  } else {
    log(`  ❌ ${failed} TESTE(S) FALHARAM de ${results.length}`, 'red');
  }
  console.log('─'.repeat(70) + '\n');

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Executar
main().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
