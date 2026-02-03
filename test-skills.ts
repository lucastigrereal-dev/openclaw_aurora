/**
 * Test Skills - OpenClaw Aurora
 * Testa todas as skills disponíveis
 */

import 'dotenv/config';
import { OpenClawAurora } from './main';

async function testSkills() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              TESTE DE SKILLS - OPENCLAW AURORA            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const system = new OpenClawAurora({ wsPort: 18789 });
  system.start();

  const executor = system.getExecutor();

  // ========================================
  // UTIL TESTS
  // ========================================
  console.log('\n📦 TESTANDO SKILLS UTIL...\n');

  // util.datetime
  console.log('→ util.datetime');
  const dateResult = await executor.run('util.datetime', { operation: 'now' });
  console.log('  Result:', dateResult.success ? '✅' : '❌', dateResult.data?.iso || dateResult.error);

  // util.uuid
  console.log('→ util.uuid');
  const uuidResult = await executor.run('util.uuid', {});
  console.log('  Result:', uuidResult.success ? '✅' : '❌', uuidResult.data?.uuid || uuidResult.error);

  // util.hash
  console.log('→ util.hash');
  const hashResult = await executor.run('util.hash', { data: 'OpenClaw Aurora' });
  console.log('  Result:', hashResult.success ? '✅' : '❌', hashResult.data?.hash?.slice(0, 16) + '...' || hashResult.error);

  // util.json
  console.log('→ util.json');
  const jsonResult = await executor.run('util.json', {
    operation: 'parse',
    data: '{"name": "Aurora", "version": 2}'
  });
  console.log('  Result:', jsonResult.success ? '✅' : '❌', JSON.stringify(jsonResult.data?.result) || jsonResult.error);

  // ========================================
  // FILE TESTS
  // ========================================
  console.log('\n📁 TESTANDO SKILLS FILE...\n');

  // file.list
  console.log('→ file.list');
  const listResult = await executor.run('file.list', { path: '.', pattern: '\\.ts$' });
  console.log('  Result:', listResult.success ? '✅' : '❌', `${listResult.data?.count} arquivos .ts` || listResult.error);

  // file.read
  console.log('→ file.read');
  const readResult = await executor.run('file.read', { path: './package.json' });
  console.log('  Result:', readResult.success ? '✅' : '❌', `${readResult.data?.size} bytes` || readResult.error);

  // ========================================
  // WEB TESTS
  // ========================================
  console.log('\n🌐 TESTANDO SKILLS WEB...\n');

  // web.fetch
  console.log('→ web.fetch');
  const fetchResult = await executor.run('web.fetch', {
    url: 'https://api.github.com/zen',
    responseType: 'text'
  });
  console.log('  Result:', fetchResult.success ? '✅' : '❌', fetchResult.data?.body?.slice(0, 50) || fetchResult.error);

  // ========================================
  // AI TESTS (se APIs configuradas)
  // ========================================
  console.log('\n🤖 TESTANDO SKILLS AI...\n');

  // ai.claude
  console.log('→ ai.claude');
  if (process.env.ANTHROPIC_API_KEY) {
    const claudeResult = await executor.run('ai.claude', {
      prompt: 'Responda apenas com "OK" se você está funcionando.',
      maxTokens: 10
    });
    console.log('  Result:', claudeResult.success ? '✅' : '❌', claudeResult.data?.content?.slice(0, 50) || claudeResult.error);
  } else {
    console.log('  ⏭️  Pulando (ANTHROPIC_API_KEY não configurada)');
  }

  // ai.gpt
  console.log('→ ai.gpt');
  if (process.env.OPENAI_API_KEY) {
    const gptResult = await executor.run('ai.gpt', {
      prompt: 'Responda apenas com "OK" se você está funcionando.',
      maxTokens: 10
    });
    console.log('  Result:', gptResult.success ? '✅' : '❌', gptResult.data?.content?.slice(0, 50) || gptResult.error);
  } else {
    console.log('  ⏭️  Pulando (OPENAI_API_KEY não configurada)');
  }

  // ai.ollama
  console.log('→ ai.ollama');
  try {
    const ollamaResult = await executor.run('ai.ollama', {
      prompt: 'Say OK',
      model: 'llama3.2'
    });
    console.log('  Result:', ollamaResult.success ? '✅' : '❌', ollamaResult.data?.content?.slice(0, 50) || ollamaResult.error);
  } catch {
    console.log('  ⏭️  Pulando (Ollama não disponível)');
  }

  // ========================================
  // TELEGRAM TEST
  // ========================================
  console.log('\n📱 TESTANDO SKILLS TELEGRAM...\n');

  console.log('→ telegram.send');
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    const telegramResult = await executor.run('telegram.send', {
      chatId: process.env.TELEGRAM_CHAT_ID,
      text: '🚀 <b>OpenClaw Aurora</b> - Teste de skills funcionando!'
    });
    console.log('  Result:', telegramResult.success ? '✅' : '❌', telegramResult.data?.messageId || telegramResult.error);
  } else {
    console.log('  ⏭️  Pulando (TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurado)');
  }

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    RESUMO DOS TESTES                       ║');
  console.log('╠══════════════════════════════════════════════════════════╣');

  const stats = executor.getStats();
  console.log(`║  Total de Skills:     ${stats.skills.total.toString().padEnd(35)}║`);
  console.log(`║  Skills Ativas:       ${stats.skills.enabled.toString().padEnd(35)}║`);
  console.log(`║  Execuções:           ${stats.executions.total.toString().padEnd(35)}║`);
  console.log(`║  Taxa de Sucesso:     ${stats.executions.successRate}%${' '.repeat(32 - stats.executions.successRate.length)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Para o sistema
  system.stop();
  process.exit(0);
}

// Roda os testes
testSkills().catch(console.error);
