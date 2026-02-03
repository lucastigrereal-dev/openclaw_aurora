/**
 * OpenClaw Aurora - Telegram Bot
 * Bot integrado com sistema de skills e proteção Aurora
 */

import 'dotenv/config';
import { Bot, Context, session } from 'grammy';
import { getSkillExecutor, SkillExecutor } from './skill-executor';
import { getAuroraMonitor, AuroraMonitor } from './aurora-openclaw-integration';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN) {
  console.error('[Bot] TELEGRAM_BOT_TOKEN não configurado no .env');
  process.exit(1);
}

// ============================================================================
// BOT SETUP
// ============================================================================

const bot = new Bot(BOT_TOKEN);
const executor = getSkillExecutor();
const monitor = getAuroraMonitor();

// Watchdog para o bot
const botWatchdog = monitor.getWatchdog('telegram-bot', {
  heartbeatInterval: 30000,
  maxMissedHeartbeats: 3,
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Heartbeat a cada mensagem
bot.use(async (ctx, next) => {
  botWatchdog.heartbeat();
  monitor.incrementMetric('telegram.messages');

  const startTime = Date.now();
  await next();
  monitor.recordMetric('telegram.latency', Date.now() - startTime);
});

// ============================================================================
// COMANDOS
// ============================================================================

// /start - Boas vindas
bot.command('start', async (ctx) => {
  await ctx.reply(`
🚀 <b>OpenClaw Aurora Bot</b>

Sou um bot com 17 skills integradas e proteção contra crashes.

<b>Comandos disponíveis:</b>
/skills - Lista todas as skills
/status - Status do sistema
/ask [pergunta] - Pergunta pro Claude
/gpt [pergunta] - Pergunta pro GPT
/exec [comando] - Executa comando bash
/help - Ajuda

<b>Proteções ativas:</b>
✅ Circuit Breaker
✅ Rate Limiter
✅ Watchdog
✅ Auto-Recovery
`, { parse_mode: 'HTML' });
});

// /skills - Lista skills
bot.command('skills', async (ctx) => {
  const skills = executor.listSkills();

  const byCategory: Record<string, string[]> = {};
  skills.forEach(s => {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s.name);
  });

  let message = '📦 <b>Skills Disponíveis</b>\n\n';

  for (const [cat, skillList] of Object.entries(byCategory)) {
    const emoji = {
      'AI': '🤖',
      'EXEC': '⚡',
      'FILE': '📁',
      'COMM': '💬',
      'WEB': '🌐',
      'UTIL': '🔧',
    }[cat] || '📌';

    message += `${emoji} <b>${cat}</b>\n`;
    message += skillList.map(s => `  • <code>${s}</code>`).join('\n');
    message += '\n\n';
  }

  await ctx.reply(message, { parse_mode: 'HTML' });
});

// /status - Status do sistema
bot.command('status', async (ctx) => {
  const stats = executor.getStats();
  const systemStatus = monitor.getSystemStatus();

  const uptime = Math.floor(systemStatus.uptime / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;

  await ctx.reply(`
📊 <b>Status do Sistema</b>

⏱ <b>Uptime:</b> ${hours}h ${minutes}m ${seconds}s

<b>Skills:</b>
• Total: ${stats.skills.total}
• Ativas: ${stats.skills.enabled}

<b>Execuções:</b>
• Total: ${stats.executions.total}
• Sucesso: ${stats.executions.successful}
• Erros: ${stats.executions.failed}
• Taxa: ${stats.executions.successRate}%

<b>Circuit Breakers:</b>
${Object.entries(systemStatus.circuitBreakers).map(([name, cb]: [string, any]) =>
  `• ${name}: ${cb.state === 'CLOSED' ? '✅' : cb.state === 'OPEN' ? '🔴' : '🟡'} ${cb.state}`
).join('\n') || '• Nenhum ativo'}

<b>Watchdogs:</b>
${Object.entries(systemStatus.watchdogs).map(([name, wd]: [string, any]) =>
  `• ${name}: ${wd.isHealthy ? '✅' : '⚠️'}`
).join('\n') || '• Nenhum ativo'}
`, { parse_mode: 'HTML' });
});

// /ask - Pergunta pro Claude
bot.command('ask', async (ctx) => {
  const prompt = ctx.message?.text?.replace('/ask', '').trim();

  if (!prompt) {
    await ctx.reply('❌ Use: /ask [sua pergunta]');
    return;
  }

  await ctx.reply('🤔 Pensando...');

  const result = await executor.run('ai.claude', {
    prompt,
    maxTokens: 1000,
  });

  if (result.success) {
    // Divide em chunks se muito longo
    const content = result.data.content;
    if (content.length > 4000) {
      const chunks = content.match(/.{1,4000}/gs) || [];
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }
    } else {
      await ctx.reply(content);
    }
  } else {
    await ctx.reply(`❌ Erro: ${result.error}`);
  }
});

// /gpt - Pergunta pro GPT
bot.command('gpt', async (ctx) => {
  const prompt = ctx.message?.text?.replace('/gpt', '').trim();

  if (!prompt) {
    await ctx.reply('❌ Use: /gpt [sua pergunta]');
    return;
  }

  await ctx.reply('🤔 Pensando...');

  const result = await executor.run('ai.gpt', {
    prompt,
    maxTokens: 1000,
  });

  if (result.success) {
    const content = result.data.content;
    if (content.length > 4000) {
      const chunks = content.match(/.{1,4000}/gs) || [];
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }
    } else {
      await ctx.reply(content);
    }
  } else {
    await ctx.reply(`❌ Erro: ${result.error}`);
  }
});

// /exec - Executa comando (requer aprovação)
bot.command('exec', async (ctx) => {
  // Verifica se é admin
  if (ctx.chat?.id.toString() !== ADMIN_CHAT_ID) {
    await ctx.reply('❌ Apenas o admin pode executar comandos.');
    return;
  }

  const command = ctx.message?.text?.replace('/exec', '').trim();

  if (!command) {
    await ctx.reply('❌ Use: /exec [comando]');
    return;
  }

  await ctx.reply(`⚡ Executando: <code>${command}</code>`, { parse_mode: 'HTML' });

  const result = await executor.run('exec.bash', { command });

  if (result.success) {
    const output = result.data.stdout || result.data.stderr || '(sem output)';
    const truncated = output.length > 4000 ? output.slice(0, 4000) + '\n...(truncado)' : output;
    await ctx.reply(`✅ <b>Output:</b>\n<pre>${truncated}</pre>`, { parse_mode: 'HTML' });
  } else {
    await ctx.reply(`❌ Erro: ${result.error}`);
  }
});

// /help - Ajuda
bot.command('help', async (ctx) => {
  await ctx.reply(`
📖 <b>Ajuda - OpenClaw Aurora</b>

<b>Comandos de IA:</b>
• /ask [pergunta] - Claude responde
• /gpt [pergunta] - GPT responde

<b>Comandos de Sistema:</b>
• /skills - Lista todas as skills
• /status - Status do sistema
• /exec [comando] - Executa bash (admin)

<b>Informações:</b>
• /start - Mensagem inicial
• /help - Esta mensagem

<b>Dicas:</b>
• O bot tem proteção contra crashes
• Se uma API falhar, ele tenta novamente
• Comandos perigosos são bloqueados
`, { parse_mode: 'HTML' });
});

// Mensagens normais - responde com Claude
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;

  // Ignora comandos
  if (text.startsWith('/')) return;

  await ctx.reply('🤔 Analisando...');

  const result = await executor.run('ai.claude', {
    prompt: text,
    systemPrompt: 'Você é um assistente útil e conciso. Responda em português brasileiro.',
    maxTokens: 500,
  });

  if (result.success) {
    await ctx.reply(result.data.content);
  } else {
    await ctx.reply('❌ Desculpe, não consegui processar sua mensagem.');
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

bot.catch((err) => {
  console.error('[Bot] Erro:', err);
  monitor.incrementMetric('telegram.errors');
});

// ============================================================================
// START
// ============================================================================

async function startBot() {
  console.log('[Bot] Iniciando...');

  // Inicia watchdog
  botWatchdog.start();

  // Inicia bot
  await bot.start({
    onStart: (botInfo) => {
      console.log(`[Bot] ✅ Conectado como @${botInfo.username}`);
      console.log(`[Bot] Admin Chat ID: ${ADMIN_CHAT_ID}`);

      // Notifica admin
      if (ADMIN_CHAT_ID) {
        bot.api.sendMessage(ADMIN_CHAT_ID,
          '🚀 <b>OpenClaw Aurora Bot</b> iniciado!\n\nTodas as 17 skills ativas.',
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }
    },
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Bot] Desligando...');
  botWatchdog.stop();
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Bot] Desligando...');
  botWatchdog.stop();
  bot.stop();
  process.exit(0);
});

// Inicia se executado diretamente
if (require.main === module) {
  startBot().catch(console.error);
}

export { bot, startBot };
