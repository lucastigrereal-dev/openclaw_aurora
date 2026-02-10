/**
 * CLI Chat - Interface de linha de comando para o Operator
 * Permite conversar com o OpenClaw Aurora via terminal
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

function printBanner() {
  console.log(colors.cyan + colors.bright);
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║         OpenClaw Aurora - CLI Chat                 ║');
  console.log('║         Conversa com o Operator Core               ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(colors.reset);
}

function printHelp() {
  console.log(colors.yellow);
  console.log('Comandos disponíveis:');
  console.log('  /skills       - Lista todas as skills registradas');
  console.log('  /stats        - Mostra estatísticas do registry');
  console.log('  /intent <msg> - Processa uma intenção (ainda não implementado)');
  console.log('  /help         - Mostra esta ajuda');
  console.log('  /exit         - Sai do CLI');
  console.log(colors.reset);
}

async function handleCommand(input: string, registry: any): Promise<boolean> {
  const trimmed = input.trim();

  if (trimmed === '/exit' || trimmed === '/quit') {
    console.log(colors.green + 'Até logo! 👋' + colors.reset);
    return false;
  }

  if (trimmed === '/help' || trimmed === '/h') {
    printHelp();
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
    console.log(colors.reset);
    return true;
  }

  if (trimmed.startsWith('/intent ')) {
    const intentText = trimmed.substring(8).trim();
    console.log(colors.yellow);
    console.log(`\n🤖 Processando intent: "${intentText}"`);
    console.log('⚠️  Operator integration ainda não implementado neste CLI.');
    console.log('💡 Use este comando quando o OperatorAdapter estiver integrado.');
    console.log(colors.reset);
    return true;
  }

  // Comando desconhecido
  if (trimmed.startsWith('/')) {
    console.log(colors.red + `❌ Comando desconhecido: ${trimmed}` + colors.reset);
    console.log(colors.gray + 'Digite /help para ver comandos disponíveis' + colors.reset);
    return true;
  }

  // Texto livre - envia para Claude
  console.log(colors.gray + '🤔 Pensando...' + colors.reset);
  try {
    const skill = registry.get('ai.claude');
    if (!skill) {
      console.log(colors.red + '❌ Skill ai.claude não encontrada' + colors.reset);
      return true;
    }
    const result = await skill.run({ prompt: trimmed, maxTokens: 1000 });
    if (result.success) {
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
  console.log(colors.gray + 'Digite /help para ver comandos disponíveis\n' + colors.reset);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: colors.cyan + 'aurora> ' + colors.reset,
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
