/**
 * CLI Chat - Interface de linha de comando para o MoltBot
 * Conversa com o OpenClaw Aurora via terminal com memória de contexto
 */

import 'dotenv/config';
import * as readline from 'readline';
import { registerAllSkills, getSkillRegistry } from '../skills/index';

// Cores ANSI
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

// System prompt (same as telegram-bot.ts)
const MOLTBOT_SYSTEM_PROMPT = `<identity>
Você é o MoltBot (OpenClaw Aurora v2.0), um agente autônomo de automação pessoal criado pelo Lucas.
Você NÃO é apenas um chatbot — você EXECUTA ações reais através de 56 skills especializadas.
Você está rodando via CLI local.
</identity>

<capabilities>
Você tem 56 skills ativas em 13 categorias:
- EXEC: bash, powershell, python, node, background, eval
- AI: claude (você), gpt, ollama
- FILE: read, write, list, delete
- BROWSER: open, click, type, screenshot, extract, pdf, wait, close
- AUTOPC: click, move, type, press, screenshot, scroll
- COMM: telegram.send, telegram.getUpdates
- WEB: fetch, scrape
- UTIL: sleep, datetime, uuid, hash, json
- MARKETING: landing pages, leads CRM, funil de vendas, Google/Meta Ads
- SOCIAL: post, schedule, caption IA, reels, analytics
- CONTENT: blog SEO, image, video, email templates
- REVIEWS: Google reviews, request, report
- ANALYTICS: dashboard, ROI, conversion, report mensal
- AKASHA HUB: scan (Google Drive), extract (PDF/audio/video), query (busca semântica), oracle (RAG Q&A), lock (Anti-TDAH)
Além disso: 30 skills Supabase Archon (DB enterprise) e 14 skills Social Hub no RegistryV2.
</capabilities>

<behavior>
- Seja direto e técnico, mas acessível. Fale como engenheiro, não como atendente.
- Responda sempre em português brasileiro.
- Mantenha continuidade: use o contexto das mensagens anteriores da conversa.
- Seja conciso: respostas longas só quando o usuário pedir detalhes.
</behavior>`;

// Conversation memory
const chatHistory: Array<{ role: string; content: string }> = [];
const MAX_HISTORY = 20;

function addToHistory(role: string, content: string): void {
  chatHistory.push({ role, content });
  if (chatHistory.length > MAX_HISTORY) {
    chatHistory.splice(0, chatHistory.length - MAX_HISTORY);
  }
}

function printBanner() {
  console.log(colors.cyan + colors.bright);
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║         MoltBot Aurora v2.0 - CLI Chat             ║');
  console.log('║         Conversa com memória de contexto            ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(colors.reset);
}

function printHelp() {
  console.log(colors.yellow);
  console.log('Comandos disponíveis:');
  console.log('  /skills       - Lista todas as skills registradas');
  console.log('  /stats        - Mostra estatísticas do registry');
  console.log('  /clear        - Limpa memória da conversa');
  console.log('  /help         - Mostra esta ajuda');
  console.log('  /exit         - Sai do CLI');
  console.log('');
  console.log('Texto livre     - Conversa com o MoltBot (Claude Haiku)');
  console.log(colors.reset);
}

async function handleCommand(input: string, registry: any): Promise<boolean> {
  const trimmed = input.trim();
  if (!trimmed) return true;

  if (trimmed === '/exit' || trimmed === '/quit') {
    console.log(colors.green + 'Até logo! 👋' + colors.reset);
    return false;
  }

  if (trimmed === '/help' || trimmed === '/h') {
    printHelp();
    return true;
  }

  if (trimmed === '/clear') {
    chatHistory.length = 0;
    console.log(colors.green + '🧹 Memória limpa. Nova conversa.\n' + colors.reset);
    return true;
  }

  if (trimmed === '/skills') {
    const skills = registry.listAll();
    const stats = registry.getStats();

    console.log(colors.cyan);
    console.log(`\n📦 Total de skills: ${stats.total}`);
    console.log(`✓ Habilitadas: ${stats.enabled}`);
    console.log(`✗ Desabilitadas: ${stats.disabled}`);
    console.log('\nPor categoria:', stats.byCategory);
    console.log(colors.reset);

    console.log(colors.gray + '\nSkills registradas:' + colors.reset);
    skills.slice(0, 20).forEach((skill: any, idx: number) => {
      console.log(`  ${idx + 1}. [${skill.category}] ${colors.bright}${skill.name}${colors.reset}`);
      console.log(`     ${colors.gray}${skill.description}${colors.reset}`);
    });

    if (skills.length > 20) {
      console.log(colors.gray + `\n  ... e mais ${skills.length - 20} skills` + colors.reset);
    }

    return true;
  }

  if (trimmed === '/stats') {
    const stats = registry.getStats();
    console.log(colors.cyan);
    console.log('\n📊 Estatísticas do Registry:');
    console.log(JSON.stringify(stats, null, 2));
    console.log(`\n💬 Mensagens na memória: ${chatHistory.length}/${MAX_HISTORY}`);
    console.log(colors.reset);
    return true;
  }

  // Comando desconhecido
  if (trimmed.startsWith('/')) {
    console.log(colors.red + `❌ Comando desconhecido: ${trimmed}` + colors.reset);
    console.log(colors.gray + 'Digite /help para ver comandos disponíveis' + colors.reset);
    return true;
  }

  // Texto livre - envia para Claude com memória
  console.log(colors.gray + '🤔 Pensando...' + colors.reset);
  try {
    const skill = registry.get('ai.claude');
    if (!skill) {
      console.log(colors.red + '❌ Skill ai.claude não encontrada' + colors.reset);
      return true;
    }

    addToHistory('user', trimmed);

    const result = await skill.run({
      prompt: trimmed,
      messages: [...chatHistory],
      systemPrompt: MOLTBOT_SYSTEM_PROMPT,
      maxTokens: 1000,
    });

    if (result.success) {
      addToHistory('assistant', result.data.content);
      console.log(colors.green + '\n' + result.data.content + colors.reset + '\n');
    } else {
      console.log(colors.red + '❌ ' + result.error + colors.reset);
    }
  } catch (err: any) {
    console.log(colors.red + '❌ Erro: ' + err.message + colors.reset);
  }
  return true;
}

async function main() {
  printBanner();

  console.log(colors.gray + 'Inicializando skills...' + colors.reset);
  const registry = registerAllSkills();
  const stats = registry.getStats();

  console.log(colors.green + `✓ ${stats.total} skills carregadas` + colors.reset);
  console.log(colors.gray + 'Digite qualquer texto para conversar ou /help para comandos\n' + colors.reset);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: colors.cyan + 'molt> ' + colors.reset,
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const shouldContinue = await handleCommand(line, registry);

    if (!shouldContinue) {
      rl.close();
      process.exit(0);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(colors.green + '\nAté logo! 👋' + colors.reset);
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(colors.red + '❌ Erro fatal:' + colors.reset, error);
  process.exit(1);
});
