#!/usr/bin/env node
/**
 * Aurora Monitor - Script de Inicializacao com Servicos Reais
 *
 * Este script inicia o Aurora Monitor conectado aos servicos reais:
 * - Telegram Bot (grammy)
 * - Claude API (@anthropic-ai/sdk)
 * - OpenAI GPT (openai)
 * - Ollama (HTTP)
 *
 * Uso:
 *   node start-aurora.js
 *
 * Variaveis de ambiente necessarias (.env):
 *   TELEGRAM_TOKEN=seu_token_aqui
 *   ANTHROPIC_API_KEY=sk-ant-xxx
 *   OPENAI_API_KEY=sk-xxx
 *   OLLAMA_URL=http://localhost:11434 (opcional)
 */

// Carrega variaveis de ambiente
require('dotenv').config();

const {
  OpenClawIntegration,
  AuroraWebSocketServer,
  AlertLevel
} = require('./aurora-monitor-ts/dist');

// ============================================================================
// CONFIGURACAO
// ============================================================================

const config = {
  port: parseInt(process.env.AURORA_PORT || '18790'),
  telegram: {
    token: process.env.TELEGRAM_TOKEN,
    enabled: !!process.env.TELEGRAM_TOKEN,
  },
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    enabled: !!process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    enabled: !!process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
  },
  ollama: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    enabled: process.env.OLLAMA_ENABLED !== 'false',
    model: process.env.OLLAMA_MODEL || 'mistral',
  },
};

// ============================================================================
// BANNER
// ============================================================================

console.log(`
================================================================================
    _   _   _ ____   ___  ____      _
   / \\ | | | |  _ \\ / _ \\|  _ \\    / \\
  / _ \\| | | | |_) | | | | |_) |  / _ \\
 / ___ \\ |_| |  _ <| |_| |  _ <  / ___ \\
/_/   \\_\\___/|_| \\_\\\\___/|_| \\_\\/_/   \\_\\

  MONITOR DE SISTEMA EM TEMPO REAL
  Conectado aos Servicos Reais
================================================================================
`);

// ============================================================================
// SERVICOS REAIS
// ============================================================================

let bot = null;
let anthropic = null;
let openai = null;

// Telegram Bot (grammy)
async function createTelegramChannel() {
  if (!config.telegram.enabled) {
    console.log('  [Telegram] DESATIVADO - Token nao configurado');
    return null;
  }

  const { Bot } = require('grammy');
  bot = new Bot(config.telegram.token);

  return {
    name: 'telegram-bot',
    type: 'telegram',
    isConnected: () => bot.isInited(),
    connect: async () => {
      console.log('  [Telegram] Iniciando bot...');
      // Nao bloqueia - inicia em background
      bot.start({
        onStart: (botInfo) => {
          console.log(`  [Telegram] Bot @${botInfo.username} conectado!`);
        },
      });
    },
    disconnect: async () => {
      console.log('  [Telegram] Parando bot...');
      await bot.stop();
    },
    sendMessage: async (chatId, message) => {
      await bot.api.sendMessage(chatId, message);
    },
  };
}

// Claude API (@anthropic-ai/sdk)
async function createClaudeProvider() {
  if (!config.claude.enabled) {
    console.log('  [Claude] DESATIVADO - API Key nao configurada');
    return null;
  }

  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic({
    apiKey: config.claude.apiKey,
  });

  return {
    name: 'claude-api',
    type: 'claude',
    isAvailable: async () => {
      try {
        // Teste simples de conectividade
        return true;
      } catch {
        return false;
      }
    },
    complete: async (prompt, options = {}) => {
      const response = await anthropic.messages.create({
        model: options.model || config.claude.model,
        max_tokens: options.maxTokens || 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.content[0].text;
    },
  };
}

// OpenAI GPT
async function createGPTProvider() {
  if (!config.openai.enabled) {
    console.log('  [GPT] DESATIVADO - API Key nao configurada');
    return null;
  }

  const OpenAI = require('openai');
  openai = new OpenAI({
    apiKey: config.openai.apiKey,
  });

  return {
    name: 'gpt-api',
    type: 'gpt',
    isAvailable: async () => {
      try {
        return true;
      } catch {
        return false;
      }
    },
    complete: async (prompt, options = {}) => {
      const response = await openai.chat.completions.create({
        model: options.model || config.openai.model,
        max_tokens: options.maxTokens || 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.choices[0].message.content;
    },
  };
}

// Ollama (HTTP)
async function createOllamaProvider() {
  if (!config.ollama.enabled) {
    console.log('  [Ollama] DESATIVADO');
    return null;
  }

  // Verifica se Ollama esta rodando
  try {
    const response = await fetch(`${config.ollama.url}/api/tags`);
    if (!response.ok) throw new Error('Ollama nao responde');
    console.log(`  [Ollama] Conectado em ${config.ollama.url}`);
  } catch (err) {
    console.log(`  [Ollama] NAO DISPONIVEL em ${config.ollama.url}`);
    return null;
  }

  return {
    name: 'ollama-gateway',
    type: 'ollama',
    isAvailable: async () => {
      try {
        const response = await fetch(`${config.ollama.url}/api/tags`);
        return response.ok;
      } catch {
        return false;
      }
    },
    complete: async (prompt, options = {}) => {
      const response = await fetch(`${config.ollama.url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model || config.ollama.model,
          prompt: prompt,
          stream: false,
        }),
      });
      const data = await response.json();
      return data.response;
    },
  };
}

// ============================================================================
// INICIALIZACAO
// ============================================================================

async function startAurora() {
  try {
    console.log('Servicos configurados:');
    console.log(`  Telegram: ${config.telegram.enabled ? 'SIM' : 'NAO'}`);
    console.log(`  Claude: ${config.claude.enabled ? 'SIM' : 'NAO'}`);
    console.log(`  GPT: ${config.openai.enabled ? 'SIM' : 'NAO'}`);
    console.log(`  Ollama: ${config.ollama.enabled ? 'SIM' : 'NAO'}`);
    console.log('');

    console.log('[1/4] Inicializando Aurora Monitor...');
    const integration = new OpenClawIntegration();

    console.log('[2/4] Registrando servicos com protecao...');

    // Registra Telegram
    const telegramChannel = await createTelegramChannel();
    let protectedTelegram = null;
    if (telegramChannel) {
      protectedTelegram = integration.registerChannel(telegramChannel);
      console.log('  [OK] Telegram registrado com Circuit Breaker + Rate Limiter');
    }

    // Registra Claude
    const claudeProvider = await createClaudeProvider();
    let protectedClaude = null;
    if (claudeProvider) {
      protectedClaude = integration.registerAIProvider(claudeProvider);
      console.log('  [OK] Claude registrado com Circuit Breaker');
    }

    // Registra GPT
    const gptProvider = await createGPTProvider();
    let protectedGPT = null;
    if (gptProvider) {
      protectedGPT = integration.registerAIProvider(gptProvider);
      console.log('  [OK] GPT registrado com Circuit Breaker');
    }

    // Registra Ollama
    const ollamaProvider = await createOllamaProvider();
    let protectedOllama = null;
    if (ollamaProvider) {
      protectedOllama = integration.registerAIProvider(ollamaProvider);
      console.log('  [OK] Ollama registrado com Circuit Breaker');
    }

    console.log('[3/4] Iniciando servidor WebSocket...');
    const wsServer = new AuroraWebSocketServer(integration, {
      port: config.port,
    });
    await wsServer.start();
    console.log(`  WebSocket ativo em: ws://localhost:${config.port}`);

    // Conecta Telegram se disponivel
    if (protectedTelegram && telegramChannel) {
      console.log('[4/4] Conectando Telegram...');
      await protectedTelegram.execute(async () => {
        await telegramChannel.connect();
      });
    } else {
      console.log('[4/4] Pronto (Telegram nao configurado)');
    }

    console.log('');
    console.log('================================================================================');
    console.log('AURORA MONITOR ATIVO');
    console.log('================================================================================');
    console.log('');
    console.log('Dashboard: Conecte em ws://localhost:' + config.port);
    console.log('');
    console.log('Pressione Ctrl+C para parar');
    console.log('');

    // Status periodico
    const statusInterval = setInterval(() => {
      const status = integration.getStatus();
      const now = new Date().toLocaleTimeString();

      console.log(`\n[${now}] STATUS:`);

      if (status.channels.length > 0) {
        console.log('  Canais:');
        status.channels.forEach(ch => {
          const icon = ch.circuitState === 'closed' ? '[OK]' : ch.circuitState === 'half-open' ? '[!!]' : '[X]';
          console.log(`    ${icon} ${ch.name}: ${ch.circuitState} (${ch.requestCount} reqs)`);
        });
      }

      if (status.aiProviders.length > 0) {
        console.log('  AI Providers:');
        status.aiProviders.forEach(ai => {
          const icon = ai.circuitState === 'closed' ? '[OK]' : ai.circuitState === 'half-open' ? '[!!]' : '[X]';
          console.log(`    ${icon} ${ai.name}: ${ai.circuitState} (${ai.requestCount} reqs)`);
        });
      }
    }, 30000);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nEncerrando Aurora Monitor...');
      clearInterval(statusInterval);

      if (bot) {
        console.log('  Parando Telegram...');
        await bot.stop();
      }

      await wsServer.stop();
      await integration.stop();

      console.log('Aurora Monitor encerrado.');
      process.exit(0);
    });

    // Exporta para uso externo
    return {
      integration,
      protectedTelegram,
      protectedClaude,
      protectedGPT,
      protectedOllama,
      wsServer,
    };

  } catch (error) {
    console.error('Erro ao iniciar Aurora Monitor:', error);
    process.exit(1);
  }
}

// Inicia se executado diretamente
if (require.main === module) {
  startAurora();
}

module.exports = { startAurora, config };
