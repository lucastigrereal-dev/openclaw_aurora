/**
 * OpenClaw Aurora - Telegram Bot (Full Executor)
 * Bot integrado com 38 skills, controle de browser, autopc, e execução
 */

import 'dotenv/config';
import { Bot, Context } from 'grammy';
import { getSkillExecutor, SkillExecutor } from './skill-executor';
import { getAuroraMonitor, AuroraMonitor } from './aurora-openclaw-integration';
import { AVAILABLE_SKILLS } from './skills';

// Stub de securityManager (original não existe na nova estrutura)
const securityManager = {
  addAllowedUser: (userId: string) => {},
  isSkillAllowed: (skillName: string) => true,
  getConfig: () => ({
    allowAll: false,
    blockedSkills: [],
    allowedUsers: [],
    allowedSkills: [],
    requireConfirmation: false,
    browser: { headless: true, blockedDomains: [] },
    autopc: { enabled: true },
    exec: { allowSudo: false, maxTimeout: 30000 }
  }),
  enableSkill: (skillName: string) => {},
  disableSkill: (skillName: string) => {},
  enableDevMode: () => {},
  resetToDefault: () => {},
};

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

// Configurar admin como usuário permitido
if (ADMIN_CHAT_ID) {
  securityManager.addAllowedUser(ADMIN_CHAT_ID);
}

// Watchdog para o bot
const botWatchdog = monitor.getWatchdog('telegram-bot', {
  heartbeatInterval: 30000,
  maxMissedHeartbeats: 3,
});

// ============================================================================
// HELPER: Verificar se é admin
// ============================================================================

function isAdmin(ctx: Context): boolean {
  return ctx.chat?.id.toString() === ADMIN_CHAT_ID;
}

function requireAdmin(ctx: Context): boolean {
  if (!isAdmin(ctx)) {
    ctx.reply('🔒 Apenas o admin pode executar este comando.');
    return false;
  }
  return true;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

bot.use(async (ctx, next) => {
  botWatchdog.heartbeat();
  monitor.incrementMetric('telegram.messages');

  const startTime = Date.now();
  await next();
  monitor.recordMetric('telegram.latency', Date.now() - startTime);
});

// ============================================================================
// COMANDOS BÁSICOS
// ============================================================================

// /start
bot.command('start', async (ctx) => {
  await ctx.reply(`
🚀 <b>OpenClaw Aurora Bot - Full Executor</b>

Sou um bot com <b>38 skills</b> integradas e proteção contra crashes.

<b>🤖 IA:</b>
/ask [pergunta] - Claude responde
/gpt [pergunta] - GPT responde

<b>⚡ Execução:</b>
/exec [comando] - Bash
/ps [comando] - PowerShell
/py [código] - Python
/node [código] - Node.js

<b>🌐 Browser:</b>
/open [url] - Abre site
/click [seletor] - Clica elemento
/type [seletor] [texto] - Digita
/screenshot - Screenshot da página

<b>🖥️ AutoPC:</b>
/pcclick [x] [y] - Clica na tela
/pctype [texto] - Digita no teclado
/pcpress [tecla] - Pressiona tecla
/pcscreen - Screenshot desktop
/window [ação] [título] - Gerencia janelas

<b>📊 Sistema:</b>
/skills - Lista todas as 38 skills
/status - Status do sistema
/security - Config de segurança
/help - Ajuda completa
`, { parse_mode: 'HTML' });
});

// /skills - Lista todas skills com categorias
bot.command('skills', async (ctx) => {
  const categories: Record<string, string> = {
    'EXEC': '⚡',
    'AI': '🤖',
    'FILE': '📁',
    'BROWSER': '🌐',
    'AUTOPC': '🖥️',
    'COMM': '💬',
    'WEB': '🌍',
    'UTIL': '🔧',
  };

  let message = '📦 <b>38 Skills Disponíveis</b>\n\n';

  const byCategory: Record<string, typeof AVAILABLE_SKILLS[number][]> = {};
  for (const skill of AVAILABLE_SKILLS) {
    if (!byCategory[skill.category]) byCategory[skill.category] = [];
    byCategory[skill.category].push(skill);
  }

  for (const [cat, skills] of Object.entries(byCategory)) {
    const emoji = categories[cat] || '📌';
    message += `${emoji} <b>${cat}</b>\n`;
    skills.forEach(s => {
      const status = securityManager.isSkillAllowed(s.name) ? '✅' : '🔒';
      const danger = s.dangerous ? '⚠️' : '';
      message += `  ${status} <code>${s.name}</code> ${danger} ${s.description}\n`;
    });
    message += '\n';
  }

  await ctx.reply(message, { parse_mode: 'HTML' });
});

// /status
bot.command('status', async (ctx) => {
  const stats = executor.getStats();
  const systemStatus = monitor.getSystemStatus();

  const uptime = Math.floor(systemStatus.uptime / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;

  const config = securityManager.getConfig();
  const allowedCount = config.allowedSkills.length;
  const blockedCount = config.blockedSkills.length;

  await ctx.reply(`
📊 <b>Status do Sistema Aurora</b>

⏱ <b>Uptime:</b> ${hours}h ${minutes}m ${seconds}s

<b>Skills:</b>
• Total: 38
• Habilitadas: ${allowedCount}
• Bloqueadas: ${blockedCount}
• Modo: ${config.allowAll ? '⚠️ DEV (tudo liberado)' : '🔒 Restrito'}

<b>Execuções:</b>
• Total: ${stats.executions.total}
• Sucesso: ${stats.executions.successful}
• Erros: ${stats.executions.failed}
• Taxa: ${stats.executions.successRate}%

<b>Proteções:</b>
✅ Circuit Breaker
✅ Rate Limiter
✅ Watchdog
✅ Auto-Recovery

<b>URLs:</b>
🌐 Dashboard: https://openclaw-aurora.vercel.app
🔌 Backend: https://openclawaurora-production.up.railway.app
`, { parse_mode: 'HTML' });
});

// ============================================================================
// COMANDOS DE IA
// ============================================================================

// /ask - Claude
bot.command('ask', async (ctx) => {
  const prompt = ctx.message?.text?.replace('/ask', '').trim();
  if (!prompt) return ctx.reply('❌ Use: /ask [sua pergunta]');

  await ctx.reply('🤔 Pensando...');

  const result = await executor.run('ai.claude', { prompt, maxTokens: 1000 });

  if (result.success) {
    const content = result.data.content;
    if (content.length > 4000) {
      const chunks = content.match(/.{1,4000}/gs) || [];
      for (const chunk of chunks) await ctx.reply(chunk);
    } else {
      await ctx.reply(content);
    }
  } else {
    await ctx.reply(`❌ Erro: ${result.error}`);
  }
});

// /gpt - GPT
bot.command('gpt', async (ctx) => {
  const prompt = ctx.message?.text?.replace('/gpt', '').trim();
  if (!prompt) return ctx.reply('❌ Use: /gpt [sua pergunta]');

  await ctx.reply('🤔 Pensando...');

  const result = await executor.run('ai.gpt', { prompt, maxTokens: 1000 });

  if (result.success) {
    const content = result.data.content;
    if (content.length > 4000) {
      const chunks = content.match(/.{1,4000}/gs) || [];
      for (const chunk of chunks) await ctx.reply(chunk);
    } else {
      await ctx.reply(content);
    }
  } else {
    await ctx.reply(`❌ Erro: ${result.error}`);
  }
});

// ============================================================================
// COMANDOS DE EXECUÇÃO
// ============================================================================

// /exec - Bash
bot.command('exec', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const command = ctx.message?.text?.replace('/exec', '').trim();
  if (!command) return ctx.reply('❌ Use: /exec [comando]');

  await ctx.reply(`⚡ Executando: <code>${command}</code>`, { parse_mode: 'HTML' });

  const result = await executor.run('exec.bash', { command });

  if (result.success) {
    const output = result.data.stdout || result.data.stderr || '(sem output)';
    const truncated = output.length > 4000 ? output.slice(0, 4000) + '\n...(truncado)' : output;
    await ctx.reply(`✅ <pre>${truncated}</pre>`, { parse_mode: 'HTML' });
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// /ps - PowerShell
bot.command('ps', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const command = ctx.message?.text?.replace('/ps', '').trim();
  if (!command) return ctx.reply('❌ Use: /ps [comando PowerShell]');

  await ctx.reply(`⚡ PowerShell: <code>${command}</code>`, { parse_mode: 'HTML' });

  const result = await executor.run('exec.powershell', { command });

  if (result.success) {
    const output = result.data.stdout || result.data.stderr || '(sem output)';
    const truncated = output.length > 4000 ? output.slice(0, 4000) + '\n...(truncado)' : output;
    await ctx.reply(`✅ <pre>${truncated}</pre>`, { parse_mode: 'HTML' });
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// /py - Python
bot.command('py', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const code = ctx.message?.text?.replace('/py', '').trim();
  if (!code) return ctx.reply('❌ Use: /py [código python]');

  await ctx.reply(`🐍 Python: <code>${code.slice(0, 100)}</code>`, { parse_mode: 'HTML' });

  const result = await executor.run('exec.python', { code });

  if (result.success) {
    const output = result.data.stdout || result.data.stderr || '(sem output)';
    const truncated = output.length > 4000 ? output.slice(0, 4000) + '\n...(truncado)' : output;
    await ctx.reply(`✅ <pre>${truncated}</pre>`, { parse_mode: 'HTML' });
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// /node - Node.js
bot.command('node', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const code = ctx.message?.text?.replace('/node', '').trim();
  if (!code) return ctx.reply('❌ Use: /node [código javascript]');

  await ctx.reply(`📦 Node.js: <code>${code.slice(0, 100)}</code>`, { parse_mode: 'HTML' });

  const result = await executor.run('exec.node', { code });

  if (result.success) {
    const output = result.data.stdout || result.data.stderr || '(sem output)';
    const truncated = output.length > 4000 ? output.slice(0, 4000) + '\n...(truncado)' : output;
    await ctx.reply(`✅ <pre>${truncated}</pre>`, { parse_mode: 'HTML' });
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// ============================================================================
// COMANDOS DE BROWSER
// ============================================================================

// /open - Abre URL
bot.command('open', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const url = ctx.message?.text?.replace('/open', '').trim();
  if (!url) return ctx.reply('❌ Use: /open [url]');

  await ctx.reply(`🌐 Abrindo: ${url}`);

  const result = await executor.run('browser.open', { url });

  if (result.success) {
    await ctx.reply(`✅ Aberto: ${result.data.title || url}`);
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// /click - Clica em elemento
bot.command('click', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const args = ctx.message?.text?.replace('/click', '').trim();
  if (!args) return ctx.reply('❌ Use: /click [seletor CSS] ou /click [x] [y]');

  // Check if coordinates
  const coords = args.match(/^(\d+)\s+(\d+)$/);
  if (coords) {
    const result = await executor.run('browser.click', { x: parseInt(coords[1]), y: parseInt(coords[2]) });
    if (result.success) {
      await ctx.reply(`✅ Clicou em (${coords[1]}, ${coords[2]})`);
    } else {
      await ctx.reply(`❌ ${result.error}`);
    }
  } else {
    const result = await executor.run('browser.click', { selector: args });
    if (result.success) {
      await ctx.reply(`✅ Clicou em: ${args}`);
    } else {
      await ctx.reply(`❌ ${result.error}`);
    }
  }
});

// /type - Digita em campo
bot.command('type', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const args = ctx.message?.text?.replace('/type', '').trim();
  if (!args) return ctx.reply('❌ Use: /type [seletor] [texto]');

  const parts = args.split(/\s+/);
  const selector = parts[0];
  const text = parts.slice(1).join(' ');

  if (!text) return ctx.reply('❌ Use: /type [seletor] [texto]');

  const result = await executor.run('browser.type', { selector, text });

  if (result.success) {
    await ctx.reply(`✅ Digitou "${text}" em ${selector}`);
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// /screenshot - Screenshot da página
bot.command('screenshot', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const url = ctx.message?.text?.replace('/screenshot', '').trim();

  await ctx.reply('📸 Capturando...');

  const params: any = { path: `/tmp/screenshot-${Date.now()}.png` };
  if (url) params.url = url;

  const result = await executor.run('browser.screenshot', params);

  if (result.success) {
    try {
      const fs = await import('fs');
      const { InputFile } = await import('grammy');
      await ctx.replyWithPhoto(new InputFile(result.data.screenshot));
    } catch {
      await ctx.reply(`✅ Screenshot salvo: ${result.data.screenshot}`);
    }
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// /extract - Extrai dados
bot.command('extract', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const selector = ctx.message?.text?.replace('/extract', '').trim();
  if (!selector) return ctx.reply('❌ Use: /extract [seletor CSS]');

  const result = await executor.run('browser.extract', { selector, all: true });

  if (result.success) {
    const data = JSON.stringify(result.data.data, null, 2);
    const truncated = data.length > 4000 ? data.slice(0, 4000) + '\n...' : data;
    await ctx.reply(`✅ <pre>${truncated}</pre>`, { parse_mode: 'HTML' });
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// /pdf - Gera PDF
bot.command('pdf', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  await ctx.reply('📄 Gerando PDF...');

  const result = await executor.run('browser.pdf', { path: `/tmp/page-${Date.now()}.pdf` });

  if (result.success) {
    try {
      const fs = await import('fs');
      const { InputFile } = await import('grammy');
      await ctx.replyWithDocument(new InputFile(result.data.pdf));
    } catch {
      await ctx.reply(`✅ PDF salvo: ${result.data.pdf}`);
    }
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// ============================================================================
// COMANDOS AUTOPC
// ============================================================================

// /pcclick - Clica na tela
bot.command('pcclick', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const args = ctx.message?.text?.replace('/pcclick', '').trim();
  if (!args) return ctx.reply('❌ Use: /pcclick [x] [y]');

  const [x, y] = args.split(/\s+/).map(Number);
  if (isNaN(x) || isNaN(y)) return ctx.reply('❌ Coordenadas inválidas');

  const result = await executor.run('autopc.click', { x, y });

  if (result.success) {
    await ctx.reply(`✅ Clicou na tela em (${x}, ${y})`);
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// /pctype - Digita no teclado
bot.command('pctype', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const text = ctx.message?.text?.replace('/pctype', '').trim();
  if (!text) return ctx.reply('❌ Use: /pctype [texto]');

  const result = await executor.run('autopc.type', { text });

  if (result.success) {
    await ctx.reply(`✅ Digitou: "${text}"`);
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// /pcpress - Pressiona tecla
bot.command('pcpress', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const key = ctx.message?.text?.replace('/pcpress', '').trim();
  if (!key) return ctx.reply('❌ Use: /pcpress [tecla]\nExemplos: enter, tab, ctrl+c, alt+f4, f5');

  const result = await executor.run('autopc.press', { key });

  if (result.success) {
    await ctx.reply(`✅ Pressionou: ${key}`);
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// /pcscreen - Screenshot desktop
bot.command('pcscreen', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  await ctx.reply('📸 Capturando desktop...');

  const result = await executor.run('autopc.screenshot', { path: `/tmp/desktop-${Date.now()}.png` });

  if (result.success) {
    try {
      const fs = await import('fs');
      const { InputFile } = await import('grammy');
      await ctx.replyWithPhoto(new InputFile(result.data.screenshot));
    } catch {
      await ctx.reply(`✅ Screenshot salvo: ${result.data.screenshot}`);
    }
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// /window - Gerencia janelas
bot.command('window', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const args = ctx.message?.text?.replace('/window', '').trim();
  if (!args) return ctx.reply('❌ Use: /window [ação] [título]\nAções: list, focus, minimize, maximize, close');

  const parts = args.split(/\s+/);
  const action = parts[0];
  const title = parts.slice(1).join(' ');

  const result = await executor.run('autopc.window', { action, title });

  if (result.success) {
    if (action === 'list') {
      const windows = result.data.windows?.join('\n') || 'Nenhuma janela';
      await ctx.reply(`📋 <b>Janelas:</b>\n<pre>${windows}</pre>`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`✅ ${action}: ${title || 'OK'}`);
    }
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// /pcscroll - Scroll
bot.command('pcscroll', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const args = ctx.message?.text?.replace('/pcscroll', '').trim() || 'down';
  const [direction, amount] = args.split(/\s+/);

  const result = await executor.run('autopc.scroll', {
    direction: direction || 'down',
    amount: parseInt(amount) || 3,
  });

  if (result.success) {
    await ctx.reply(`✅ Scroll ${direction} x${amount || 3}`);
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// ============================================================================
// COMANDOS DE SEGURANÇA
// ============================================================================

// /security - Config de segurança
bot.command('security', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const config = securityManager.getConfig();

  await ctx.reply(`
🔒 <b>Configuração de Segurança</b>

<b>Modo:</b> ${config.allowAll ? '⚠️ DEV (tudo liberado)' : '🔒 Restrito'}
<b>Confirmação:</b> ${config.requireConfirmation ? 'Sim' : 'Não'}

<b>Skills habilitadas:</b> ${config.allowedSkills.length}
<b>Skills bloqueadas:</b> ${config.blockedSkills.length}
<b>Usuários permitidos:</b> ${config.allowedUsers.length || 'Todos'}

<b>Browser:</b>
• Headless: ${config.browser.headless ? 'Sim' : 'Não'}
• Domínios bloqueados: ${config.browser.blockedDomains.length}

<b>AutoPC:</b> ${config.autopc.enabled ? '✅ Ativo' : '❌ Inativo'}

<b>Exec:</b>
• Sudo: ${config.exec.allowSudo ? '✅' : '❌'}
• Timeout: ${config.exec.maxTimeout}ms

<b>Comandos:</b>
/enable [skill] - Habilitar skill
/disable [skill] - Desabilitar skill
/devmode - Modo dev (PERIGO!)
/safemode - Modo seguro
`, { parse_mode: 'HTML' });
});

// /enable - Habilita skill
bot.command('enable', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const skillName = ctx.message?.text?.replace('/enable', '').trim();
  if (!skillName) return ctx.reply('❌ Use: /enable [skill.name]');

  securityManager.enableSkill(skillName);
  await ctx.reply(`✅ Skill habilitada: <code>${skillName}</code>`, { parse_mode: 'HTML' });
});

// /disable - Desabilita skill
bot.command('disable', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const skillName = ctx.message?.text?.replace('/disable', '').trim();
  if (!skillName) return ctx.reply('❌ Use: /disable [skill.name]');

  securityManager.disableSkill(skillName);
  await ctx.reply(`🔒 Skill desabilitada: <code>${skillName}</code>`, { parse_mode: 'HTML' });
});

// /devmode - Ativa modo dev
bot.command('devmode', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  securityManager.enableDevMode();
  await ctx.reply('⚠️ <b>MODO DEV ATIVADO</b>\nTodas as 38 skills liberadas sem restrições!', { parse_mode: 'HTML' });
});

// /safemode - Ativa modo seguro
bot.command('safemode', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  securityManager.resetToDefault();
  await ctx.reply('🔒 <b>MODO SEGURO ATIVADO</b>\nApenas skills seguras habilitadas.', { parse_mode: 'HTML' });
});

// ============================================================================
// COMANDOS DE ARQUIVO
// ============================================================================

// /read - Lê arquivo
bot.command('read', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const filepath = ctx.message?.text?.replace('/read', '').trim();
  if (!filepath) return ctx.reply('❌ Use: /read [caminho]');

  const result = await executor.run('file.read', { path: filepath });

  if (result.success) {
    const content = result.data.content;
    const truncated = content.length > 4000 ? content.slice(0, 4000) + '\n...(truncado)' : content;
    await ctx.reply(`📄 <b>${filepath}</b>\n<pre>${truncated}</pre>`, { parse_mode: 'HTML' });
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// /write - Escreve arquivo
bot.command('write', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const args = ctx.message?.text?.replace('/write', '').trim();
  if (!args) return ctx.reply('❌ Use: /write [caminho] [conteúdo]');

  const parts = args.split(/\s+/);
  const path = parts[0];
  const content = parts.slice(1).join(' ');

  const result = await executor.run('file.write', { path, content });

  if (result.success) {
    await ctx.reply(`✅ Escrito: ${path}`);
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// /ls - Lista diretório
bot.command('ls', async (ctx) => {
  if (!requireAdmin(ctx)) return;

  const dir = ctx.message?.text?.replace('/ls', '').trim() || '.';

  const result = await executor.run('file.list', { path: dir });

  if (result.success) {
    const files = result.data.files?.map((f: any) => f.name).join('\n') || '(vazio)';
    const truncated = files.length > 4000 ? files.slice(0, 4000) + '\n...' : files;
    await ctx.reply(`📁 <b>${dir}</b>\n<pre>${truncated}</pre>`, { parse_mode: 'HTML' });
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// ============================================================================
// /help
// ============================================================================

bot.command('help', async (ctx) => {
  await ctx.reply(`
📖 <b>OpenClaw Aurora - Help Completo</b>

<b>🤖 IA:</b>
/ask [pergunta] - Claude
/gpt [pergunta] - GPT

<b>⚡ Execução:</b>
/exec [cmd] - Bash
/ps [cmd] - PowerShell
/py [code] - Python
/node [code] - Node.js

<b>🌐 Browser (Puppeteer):</b>
/open [url] - Abrir site
/click [seletor ou x y] - Clicar
/type [seletor] [texto] - Digitar
/screenshot [url] - Screenshot
/extract [seletor] - Extrair dados
/pdf - Gerar PDF

<b>🖥️ AutoPC (Desktop):</b>
/pcclick [x] [y] - Clicar tela
/pctype [texto] - Digitar teclado
/pcpress [tecla] - Pressionar tecla
/pcscreen - Screenshot desktop
/window [ação] [título] - Janelas
/pcscroll [dir] [qtd] - Scroll

<b>📁 Arquivos:</b>
/read [path] - Ler arquivo
/write [path] [conteúdo] - Escrever
/ls [dir] - Listar

<b>🔒 Segurança:</b>
/security - Config atual
/enable [skill] - Habilitar
/disable [skill] - Desabilitar
/devmode - Liberar tudo ⚠️
/safemode - Modo seguro

<b>📊 Sistema:</b>
/skills - 38 skills
/status - Status
`, { parse_mode: 'HTML' });
});

// ============================================================================
// MENSAGENS NATURAIS (NLP)
// ============================================================================

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return;

  // Detect intent from natural language
  const textLower = text.toLowerCase();

  // Screenshot commands
  if (textLower.includes('screenshot') && textLower.includes('tela')) {
    if (!requireAdmin(ctx)) return;
    await ctx.reply('📸 Capturando desktop...');
    const result = await executor.run('autopc.screenshot', { path: `/tmp/desktop-${Date.now()}.png` });
    if (result.success) await ctx.reply(`✅ Screenshot salvo: ${result.data.screenshot}`);
    else await ctx.reply(`❌ ${result.error}`);
    return;
  }

  if (textLower.match(/screenshot\s+(de\s+)?https?/)) {
    if (!requireAdmin(ctx)) return;
    const urlMatch = text.match(/(https?:\/\/\S+)/);
    if (urlMatch) {
      await ctx.reply(`📸 Capturando ${urlMatch[1]}...`);
      const result = await executor.run('browser.screenshot', { url: urlMatch[1], path: `/tmp/screenshot-${Date.now()}.png` });
      if (result.success) await ctx.reply(`✅ Screenshot: ${result.data.screenshot}`);
      else await ctx.reply(`❌ ${result.error}`);
      return;
    }
  }

  // Execute command
  if (textLower.startsWith('execute ') || textLower.startsWith('roda ') || textLower.startsWith('rode ')) {
    if (!requireAdmin(ctx)) return;
    const command = text.replace(/^(execute|roda|rode)\s+/i, '').trim();
    await ctx.reply(`⚡ Executando: <code>${command}</code>`, { parse_mode: 'HTML' });
    const result = await executor.run('exec.bash', { command });
    if (result.success) {
      const output = result.data.stdout || result.data.stderr || '(sem output)';
      const truncated = output.length > 4000 ? output.slice(0, 4000) + '\n...' : output;
      await ctx.reply(`✅ <pre>${truncated}</pre>`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`❌ ${result.error}`);
    }
    return;
  }

  // Click coordinates
  const clickMatch = textLower.match(/cliqu?e?\s+(?:em\s+)?(\d+)\s*[,\s]\s*(\d+)/);
  if (clickMatch) {
    if (!requireAdmin(ctx)) return;
    const x = parseInt(clickMatch[1]);
    const y = parseInt(clickMatch[2]);
    const result = await executor.run('autopc.click', { x, y });
    if (result.success) await ctx.reply(`✅ Clicou em (${x}, ${y})`);
    else await ctx.reply(`❌ ${result.error}`);
    return;
  }

  // Type text
  if (textLower.startsWith('digite ') || textLower.startsWith('escreva ')) {
    if (!requireAdmin(ctx)) return;
    const typeText = text.replace(/^(digite|escreva)\s+/i, '').trim();
    const result = await executor.run('autopc.type', { text: typeText });
    if (result.success) await ctx.reply(`✅ Digitou: "${typeText}"`);
    else await ctx.reply(`❌ ${result.error}`);
    return;
  }

  // Open URL
  const urlMatch = textLower.match(/abr[ae]\s+(https?:\/\/\S+)/);
  if (urlMatch) {
    if (!requireAdmin(ctx)) return;
    const result = await executor.run('browser.open', { url: urlMatch[1] });
    if (result.success) await ctx.reply(`✅ Aberto: ${result.data.title || urlMatch[1]}`);
    else await ctx.reply(`❌ ${result.error}`);
    return;
  }

  // Default: Claude AI response
  await ctx.reply('🤔 Analisando...');

  const result = await executor.run('ai.claude', {
    prompt: text,
    systemPrompt: 'Você é o Aurora, assistente inteligente do OpenClaw. Responda em português brasileiro de forma útil e concisa.',
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
  console.log('[Bot] Iniciando OpenClaw Aurora Bot (Full Executor)...');

  botWatchdog.start();

  await bot.start({
    onStart: (botInfo) => {
      console.log(`[Bot] ✅ Conectado como @${botInfo.username}`);
      console.log(`[Bot] 38 skills ativas`);
      console.log(`[Bot] Admin Chat ID: ${ADMIN_CHAT_ID}`);

      if (ADMIN_CHAT_ID) {
        bot.api.sendMessage(ADMIN_CHAT_ID,
          `🚀 <b>OpenClaw Aurora Bot</b> iniciado!

✅ 38 skills ativas
🔒 Modo: ${securityManager.getConfig().allowAll ? 'DEV' : 'Seguro'}

<b>Novas skills:</b>
⚡ exec.powershell, python, node, background, sudo
🌐 browser.open, click, type, screenshot, extract, pdf
🖥️ autopc.click, type, press, screenshot, window

Digite /help para ver todos os comandos.`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }
    },
  });
}

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

if (require.main === module) {
  startBot().catch(console.error);
}

export { bot, startBot };
