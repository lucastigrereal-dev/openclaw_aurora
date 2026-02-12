/**
 * OpenClaw Aurora - Start All
 * Inicia todos os serviços: WebSocket com Chat + Bot Telegram
 */

import 'dotenv/config';
import { getSkillExecutor } from './skill-executor';
import { getAuroraMonitor } from './aurora-openclaw-integration';
import { getDashboardServer } from './websocket-server';
import { startBot } from './telegram-bot';

async function startAll() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         OPENCLAW AURORA - INICIANDO SISTEMA              ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. Inicializa executor e monitor
  console.log('[1/3] Inicializando Skills e Monitor...');
  const executor = getSkillExecutor();
  const monitor = getAuroraMonitor();
  monitor.startAll();

  // 2. Inicia WebSocket com Chat
  const wsPort = parseInt(process.env.PORT || process.env.WEBSOCKET_PORT || '18789');
  console.log(`[2/3] Iniciando WebSocket Server (Chat + Comandos) na porta ${wsPort}...`);
  const wsServer = getDashboardServer();
  wsServer.start(wsPort);

  // 3. Inicia Bot Telegram
  console.log('[3/3] Iniciando Bot Telegram...');
  await startBot();

  const stats = executor.getStats();

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║              TODOS OS SERVIÇOS ATIVOS                     ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ WebSocket Server   - ws://localhost:${wsPort}            ║`);
  console.log('║  ✅ Chat IA            - Claude/GPT/Ollama               ║');
  console.log('║  ✅ Telegram Bot       - Conectado                        ║');
  console.log(`║  ✅ ${stats.skills.total} Skills          - Ativas                           ║`);
  console.log('║  ✅ Circuit Breaker    - Protegendo APIs                  ║');
  console.log('║  ✅ Watchdog           - Monitorando processos            ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║                                                            ║');
  console.log(`║  Dashboard: Conecte em ws://localhost:${wsPort}               ║`);
  console.log('║  Telegram:  Mande mensagem pro seu bot                    ║');
  console.log('║                                                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log('Pressione Ctrl+C para parar todos os serviços.\n');
}

// ============================================================================
// ERROR BOUNDARIES - Captura crashes e notifica via Telegram
// ============================================================================

/**
 * Envia notificação de erro crítico via Telegram
 */
async function notifyTelegramError(message: string): Promise<void> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error('[Error Boundary] Telegram não configurado - não foi possível notificar');
      return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      console.error('[Error Boundary] Falha ao enviar notificação Telegram');
    }
  } catch (err) {
    console.error('[Error Boundary] Erro ao tentar notificar Telegram:', err);
  }
}

// Handler para exceções não capturadas
process.on('uncaughtException', (error: Error) => {
  console.error('╔═══════════════════════════════════════════════════════╗');
  console.error('║  🚨 UNCAUGHT EXCEPTION - Sistema pode estar instável  ║');
  console.error('╚═══════════════════════════════════════════════════════╝');
  console.error('\n[ERRO]', error.message);
  console.error('[STACK]', error.stack);

  // Notificar via Telegram (não bloqueia)
  notifyTelegramError(
    `🚨 *OPENCLAW AURORA - CRASH*\n\n` +
    `*Tipo:* Uncaught Exception\n` +
    `*Erro:* \`${error.message}\`\n` +
    `*Stack:* \`${error.stack?.split('\n')[1]?.trim() || 'N/A'}\`\n\n` +
    `⏰ ${new Date().toISOString()}\n\n` +
    `_Sistema pode reiniciar automaticamente..._`
  ).catch(() => {});

  // NÃO faz process.exit() - deixa Railway/PM2 reiniciar
  // Se o erro for crítico, o processo vai morrer naturalmente
});

// Handler para promises rejeitadas não tratadas
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('╔═══════════════════════════════════════════════════════╗');
  console.error('║  ⚠️  UNHANDLED REJECTION - Promise não tratada        ║');
  console.error('╚═══════════════════════════════════════════════════════╝');
  console.error('\n[REASON]', reason);
  console.error('[PROMISE]', promise);

  // Notificar via Telegram (não bloqueia)
  notifyTelegramError(
    `⚠️ *OPENCLAW AURORA - UNHANDLED REJECTION*\n\n` +
    `*Motivo:* \`${reason}\`\n` +
    `*Tipo:* ${typeof reason}\n\n` +
    `⏰ ${new Date().toISOString()}\n\n` +
    `_Sistema continua rodando..._`
  ).catch(() => {});

  // Log mas não mata o processo
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Sistema] Desligando todos os serviços...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Sistema] Desligando todos os serviços...');
  process.exit(0);
});

// ============================================================================
// INICIA SISTEMA
// ============================================================================

startAll().catch((err) => {
  console.error('[Sistema] Erro ao iniciar:', err);
  notifyTelegramError(
    `❌ *OPENCLAW AURORA - FALHA NO STARTUP*\n\n` +
    `*Erro:* \`${err.message}\`\n\n` +
    `⏰ ${new Date().toISOString()}\n\n` +
    `_Sistema não conseguiu iniciar._`
  ).finally(() => {
    process.exit(1);
  });
});
