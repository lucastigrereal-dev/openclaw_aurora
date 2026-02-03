#!/usr/bin/env node
/**
 * Aurora Monitor - Script de Inicializacao
 *
 * Este script inicia o Aurora Monitor com todas as protecoes ativas
 * e o servidor WebSocket para o dashboard.
 *
 * Uso:
 *   node start-aurora.js [--port 18790] [--dashboard]
 */

const {
  AuroraMonitor,
  OpenClawIntegration,
  WebSocketMetricsServer,
  AlertLevel
} = require('./aurora-monitor-ts/dist');

// Configuracao
const config = {
  port: parseInt(process.env.AURORA_PORT || '18790'),
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:5173',
  enableAlerts: process.env.ENABLE_ALERTS !== 'false',
};

// Parse argumentos
process.argv.forEach((arg, i) => {
  if (arg === '--port' && process.argv[i + 1]) {
    config.port = parseInt(process.argv[i + 1]);
  }
});

console.log(`
================================================================================
    _   _   _ ____   ___  ____      _
   / \\ | | | |  _ \\ / _ \\|  _ \\    / \\
  / _ \\| | | | |_) | | | | |_) |  / _ \\
 / ___ \\ |_| |  _ <| |_| |  _ <  / ___ \\
/_/   \\_\\___/|_| \\_\\\\___/|_| \\_\\/_/   \\_\\

  MONITOR DE SISTEMA EM TEMPO REAL
  Para OpenClaw/Jarvis
================================================================================
`);

console.log('Configuracoes:');
console.log(`  WebSocket Port: ${config.port}`);
console.log(`  Alertas: ${config.enableAlerts ? 'Ativados' : 'Desativados'}`);
console.log('');

// Inicializa o monitor
async function startAurora() {
  try {
    console.log('[1/4] Inicializando Aurora Monitor...');

    // Cria a integracao OpenClaw
    const integration = new OpenClawIntegration();

    console.log('[2/4] Configurando protecoes...');

    // Registra canais mock para demonstracao
    // Em producao, voce registraria seus canais reais aqui

    // Mock Telegram Channel
    const mockTelegram = {
      name: 'telegram-bot',
      type: 'telegram',
      isConnected: () => true,
      connect: async () => console.log('  [Telegram] Conectado'),
      disconnect: async () => console.log('  [Telegram] Desconectado'),
      sendMessage: async (chatId, msg) => {
        console.log(`  [Telegram] Enviando para ${chatId}: ${msg.substring(0, 50)}...`);
      },
    };

    // Mock Claude API
    const mockClaude = {
      name: 'claude-api',
      type: 'claude',
      isAvailable: async () => true,
      complete: async (prompt) => `[Claude Response] ${prompt.substring(0, 30)}...`,
    };

    // Mock Ollama
    const mockOllama = {
      name: 'ollama-gateway',
      type: 'ollama',
      isAvailable: async () => true,
      complete: async (prompt) => `[Ollama Response] ${prompt.substring(0, 30)}...`,
    };

    // Registra os canais com protecao
    const protectedTelegram = integration.registerChannel(mockTelegram);
    const protectedClaude = integration.registerAIProvider(mockClaude);
    const protectedOllama = integration.registerAIProvider(mockOllama);

    console.log('  - Telegram Bot: Protegido');
    console.log('  - Claude API: Protegida');
    console.log('  - Ollama Gateway: Protegido');

    console.log('[3/4] Iniciando servidor WebSocket...');

    // Inicia o servidor WebSocket para o dashboard
    const wsServer = new WebSocketMetricsServer({
      port: config.port,
      metricsInterval: 2000,
    });

    await wsServer.start();
    console.log(`  WebSocket ativo em: ws://localhost:${config.port}`);

    console.log('[4/4] Aurora Monitor iniciado com sucesso!');
    console.log('');
    console.log('================================================================================');
    console.log('SISTEMA ATIVO - Pressione Ctrl+C para parar');
    console.log('================================================================================');
    console.log('');
    console.log('Status das protecoes:');

    // Loop de status
    const statusInterval = setInterval(() => {
      const status = integration.getStatus();
      const now = new Date().toLocaleTimeString();

      console.log(`\n[${now}] STATUS:`);
      console.log(`  Running: ${status.running}`);
      console.log(`  Canais protegidos: ${status.channels.length}`);
      console.log(`  AI Providers protegidos: ${status.aiProviders.length}`);

      status.channels.forEach(ch => {
        console.log(`    - ${ch.name}: ${ch.circuitState} (${ch.requestCount} requests)`);
      });

      status.aiProviders.forEach(ai => {
        console.log(`    - ${ai.name}: ${ai.circuitState} (${ai.requestCount} requests)`);
      });
    }, 10000);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nEncerrando Aurora Monitor...');
      clearInterval(statusInterval);
      await wsServer.stop();
      await integration.stop();
      console.log('Aurora Monitor encerrado.');
      process.exit(0);
    });

    // Simula algumas operacoes para demonstracao
    setInterval(async () => {
      try {
        // Simula envio de mensagem protegida
        await protectedTelegram.execute(async () => {
          // Operacao protegida
        });

        // Simula chamada de AI protegida
        await protectedClaude.complete('Test prompt');
        await protectedOllama.complete('Test prompt');
      } catch (err) {
        // Circuit breaker pode bloquear se houver muitas falhas
      }
    }, 5000);

  } catch (error) {
    console.error('Erro ao iniciar Aurora Monitor:', error);
    process.exit(1);
  }
}

// Inicia
startAurora();
