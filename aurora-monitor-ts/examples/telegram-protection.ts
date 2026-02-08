/**
 * Exemplo: Proteção do Canal Telegram com Aurora Monitor
 *
 * Este exemplo mostra como integrar o Aurora Monitor
 * para proteger o canal Telegram contra quedas.
 */

import { Bot, Context } from 'grammy';
import {
  createOpenClawIntegration,
  createMetricsServer,
  AlertLevel,
  OpenClawChannel,
  AIProvider,
} from '../src';

// Configuração
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!;
const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY!;
const METRICS_PORT = 18790;

async function main() {
  console.log('🚀 Iniciando OpenClaw com Aurora Monitor...');

  // ============================================
  // 1. Cria bot do Telegram
  // ============================================
  const bot = new Bot<Context>(TELEGRAM_TOKEN);

  // ============================================
  // 2. Cria integração Aurora
  // ============================================
  const aurora = createOpenClawIntegration({
    config: {
      appName: 'openclaw-telegram',
      alerts: {
        enabled: true,
        cooldown: 60000, // 1 minuto entre alertas iguais
        aggregateAlerts: true,
        // discordWebhook: process.env.DISCORD_WEBHOOK, // Opcional
        // slackWebhook: process.env.SLACK_WEBHOOK,     // Opcional
      },
    },
    onChannelReconnect: (channel) => {
      console.log(`✅ Canal ${channel} reconectado!`);
    },
  });

  // ============================================
  // 3. Registra canal Telegram protegido
  // ============================================
  const telegramChannel: OpenClawChannel = {
    name: 'telegram-main',
    type: 'telegram',
    isConnected: () => bot.isInited(),
    connect: async () => {
      await bot.start({
        onStart: () => console.log('Bot Telegram conectado'),
      });
    },
    disconnect: async () => {
      await bot.stop();
    },
    sendMessage: async (chatId: string, message: string) => {
      await bot.api.sendMessage(chatId, message);
    },
  };

  const protectedTelegram = aurora.registerChannel(telegramChannel);

  // ============================================
  // 4. Registra providers de AI protegidos
  // ============================================
  const claudeProvider: AIProvider = {
    name: 'claude-main',
    type: 'claude',
    isAvailable: async () => {
      // Verifica se API está acessível
      return true;
    },
    complete: async (prompt: string, options?: any) => {
      // Aqui você integraria com o Anthropic SDK
      // const response = await anthropic.messages.create({...});
      return `[Claude Response for: ${prompt}]`;
    },
  };

  const protectedClaude = aurora.registerAIProvider(claudeProvider);

  // ============================================
  // 5. Configura handlers do bot
  // ============================================
  bot.on('message', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const text = ctx.message.text || '';

    // Envia heartbeat a cada mensagem processada
    aurora.heartbeat();

    try {
      // Usa o canal protegido para responder
      // (aplica rate limiting e circuit breaker)
      await protectedTelegram.execute(async () => {
        // Usa AI protegida
        const response = await protectedClaude.complete(text);
        await ctx.reply(response);
      }, chatId);

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);

      // Se for erro de rate limit, avisa o usuário
      if (error instanceof Error && error.message.includes('Rate limit')) {
        await ctx.reply('⏳ Muitas mensagens. Aguarde um momento.');
      }
    }
  });

  // ============================================
  // 6. Registra health checks customizados
  // ============================================

  // TODO: Adicionar ao monitor quando integrado
  // aurora.registerHealthCheck('database', async () => {
  //   // Verifica conexão com banco
  //   return true;
  // });

  // ============================================
  // 7. Inicia servidor de métricas para dashboard
  // ============================================
  const metricsServer = createMetricsServer(aurora, {
    port: METRICS_PORT,
    corsOrigins: ['http://localhost:5173'], // Vite dev server
  });

  // ============================================
  // 8. Inicia tudo
  // ============================================
  aurora.start();
  metricsServer.start();

  // Conecta o bot via canal protegido
  await telegramChannel.connect();

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    AURORA MONITOR ATIVO                     ║
╠══════════════════════════════════════════════════════════════╣
║  Telegram: ✅ Protegido                                      ║
║  Claude:   ✅ Protegido                                      ║
║  Dashboard: http://localhost:${METRICS_PORT}                       ║
║  WebSocket: ws://localhost:${METRICS_PORT}                         ║
╠══════════════════════════════════════════════════════════════╣
║  Proteções ativas:                                           ║
║  • Circuit Breaker: 3 falhas = abre, 30s timeout            ║
║  • Rate Limiter: 25 msg/s global, 1 msg/s por chat          ║
║  • Auto-Healing: Reconexão automática com backoff           ║
║  • Anomaly Detection: Detecta spikes e memory leaks         ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // ============================================
  // 9. Graceful shutdown
  // ============================================
  const shutdown = async () => {
    console.log('\n🛑 Encerrando...');
    metricsServer.stop();
    aurora.stop();
    await bot.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Executa
main().catch(console.error);
