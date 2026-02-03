/**
 * OpenClaw Aurora - Start All
 * Inicia todos os serviços: Aurora Monitor + Bot Telegram
 */

import 'dotenv/config';
import { OpenClawAurora } from './main';
import { startBot, bot } from './telegram-bot';

async function startAll() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         OPENCLAW AURORA - INICIANDO SISTEMA              ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. Inicia Aurora Monitor + WebSocket
  console.log('[1/2] Iniciando Aurora Monitor...');
  const aurora = new OpenClawAurora({ wsPort: 18789 });
  aurora.start();

  // 2. Inicia Bot Telegram
  console.log('[2/2] Iniciando Bot Telegram...');
  await startBot();

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║              TODOS OS SERVIÇOS ATIVOS                     ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  ✅ Aurora Monitor     - ws://localhost:18789            ║');
  console.log('║  ✅ Telegram Bot       - Conectado                        ║');
  console.log('║  ✅ 17 Skills          - Ativas                           ║');
  console.log('║  ✅ Circuit Breaker    - Protegendo APIs                  ║');
  console.log('║  ✅ Watchdog           - Monitorando processos            ║');
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
