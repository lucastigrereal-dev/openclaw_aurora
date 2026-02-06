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

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Sistema] Desligando todos os serviços...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Sistema] Desligando todos os serviços...');
  process.exit(0);
});

// Inicia
startAll().catch((err) => {
  console.error('[Sistema] Erro ao iniciar:', err);
  process.exit(1);
});
