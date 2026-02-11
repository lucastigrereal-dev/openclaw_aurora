/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OpenCloud Aurora - Boot Unificado (TUDO DE UMA VEZ)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este script inicia TODOS os componentes do sistema:
 * 1. API (se disponível)
 * 2. WebSocket Server
 * 3. Telegram Bot
 * 4. Aurora Monitor
 * 5. Operator + Skills
 * 6. Dashboard/Cockpit (se disponível)
 *
 * Design: Robusto - se um componente falhar, os outros continuam
 */

import 'dotenv/config';
import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// Imports do sistema
import { getAuroraMonitor } from './aurora-openclaw-integration';
import { getSkillExecutor } from './skill-executor';
import { registerAllSkills } from './skills';
// import { getOperatorAdapter } from './src/adapters/operator.adapter'; // Movido para import dinâmico

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

const WEBSOCKET_PORT = parseInt(process.env.WEBSOCKET_PORT || '18789');
const API_PORT = parseInt(process.env.API_PORT || '3000');
const DASHBOARD_PORT = parseInt(process.env.DASHBOARD_PORT || '5173');

interface ComponentStatus {
  name: string;
  status: 'starting' | 'running' | 'failed' | 'not_available';
  error?: string;
  url?: string;
}

const componentStatuses: ComponentStatus[] = [];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function logComponent(name: string, status: 'starting' | 'success' | 'failed' | 'skipped', message?: string) {
  const icon = {
    starting: '⏳',
    success: '✅',
    failed: '❌',
    skipped: '⊘',
  }[status];

  console.log(`${icon} [${name}] ${message || status}`);
}

function recordStatus(name: string, status: ComponentStatus['status'], error?: string, url?: string) {
  componentStatuses.push({ name, status, error, url });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. CORE SYSTEM (Skills + Operator + Aurora)
// ═══════════════════════════════════════════════════════════════════════════

async function startCoreSystem(): Promise<void> {
  try {
    logComponent('Core System', 'starting', 'Inicializando Skills, Executor e Monitor...');

    // Skills Registry
    registerAllSkills();
    const executor = getSkillExecutor();
    const skills = executor.listSkills();
    logComponent('Skills Registry', 'success', `${skills.length} skills registradas`);

    // Operator (opcional - pode falhar se dependencies estiverem quebradas)
    try {
      const operatorPath = ['./src/adapters', 'operator.adapter'].join('/');
      const { getOperatorAdapter } = await import(operatorPath);
      const operator = getOperatorAdapter();
      logComponent('Operator', 'success', 'Operator adaptado e pronto');
    } catch (error: any) {
      logComponent('Operator', 'skipped', `Não disponível: ${error.message.split('\n')[0]}`);
    }

    // Aurora Monitor
    try {
      const monitor = getAuroraMonitor();
      logComponent('Aurora Monitor', 'success', 'Circuit Breaker, Rate Limiter, Watchdog ativos');
    } catch (error: any) {
      logComponent('Aurora Monitor', 'skipped', `Não disponível: ${error.message.split('\n')[0]}`);
    }

    recordStatus('Core System', 'running');
  } catch (error: any) {
    logComponent('Core System', 'failed', error.message);
    recordStatus('Core System', 'failed', error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. WEBSOCKET SERVER
// ═══════════════════════════════════════════════════════════════════════════

async function startWebSocket(): Promise<void> {
  try {
    logComponent('WebSocket', 'starting', `Iniciando na porta ${WEBSOCKET_PORT}...`);

    const { getDashboardServer } = await import('./websocket-server');
    const wsServer = getDashboardServer();
    wsServer.start(WEBSOCKET_PORT);

    const url = `ws://localhost:${WEBSOCKET_PORT}`;
    logComponent('WebSocket', 'success', url);
    recordStatus('WebSocket', 'running', undefined, url);

    // Enviar status inicial
    setTimeout(() => {
      wsServer.sendConnectionStatus('OpenClaw Aurora', 'online', 10);
      wsServer.sendConnectionStatus('Skills Engine', 'online', 5);
      wsServer.sendNotification('Sistema Online', 'OpenClaw Aurora iniciado com sucesso!', 'medium');
    }, 1000);
  } catch (error: any) {
    logComponent('WebSocket', 'failed', error.message);
    recordStatus('WebSocket', 'failed', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. API SERVER (se existir)
// ═══════════════════════════════════════════════════════════════════════════

async function startAPI(): Promise<void> {
  try {
    const apiPath = join(__dirname, 'src', 'api', 'server.ts');
    if (!existsSync(apiPath)) {
      logComponent('API', 'skipped', 'Arquivo não encontrado');
      recordStatus('API', 'not_available');
      return;
    }

    logComponent('API', 'starting', `Tentando iniciar na porta ${API_PORT}...`);

    // Tenta importar e iniciar
    const serverPath = ['./src/api', 'server'].join('/');
    const { startServer } = await import(serverPath);
    if (typeof startServer === 'function') {
      await startServer(API_PORT);
      const url = `http://localhost:${API_PORT}`;
      logComponent('API', 'success', url);
      recordStatus('API', 'running', undefined, url);
    } else {
      throw new Error('startServer não é uma função');
    }
  } catch (error: any) {
    logComponent('API', 'failed', error.message);
    recordStatus('API', 'failed', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. TELEGRAM BOT
// ═══════════════════════════════════════════════════════════════════════════

let telegramBotProcess: ChildProcess | null = null;

async function startTelegramBot(): Promise<void> {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;

    if (!BOT_TOKEN) {
      logComponent('Telegram Bot', 'skipped', 'TELEGRAM_BOT_TOKEN não configurado no .env');
      recordStatus('Telegram Bot', 'not_available', 'Token não configurado');
      return;
    }

    const botPath = join(__dirname, 'telegram-bot.ts');
    if (!existsSync(botPath)) {
      logComponent('Telegram Bot', 'skipped', 'Arquivo não encontrado');
      recordStatus('Telegram Bot', 'not_available');
      return;
    }

    logComponent('Telegram Bot', 'starting', 'Iniciando bot em processo separado...');

    // Inicia bot em processo separado
    telegramBotProcess = spawn('npx', ['ts-node', '--transpile-only', 'telegram-bot.ts'], {
      cwd: __dirname,
      stdio: 'pipe',
      shell: true,
      env: { ...process.env },
    });

    telegramBotProcess.stdout?.on('data', (data) => {
      const line = data.toString().trim();
      if (line.includes('[Bot]') || line.includes('✓')) {
        console.log(`  📱 ${line}`);
      }
    });

    telegramBotProcess.stderr?.on('data', (data) => {
      const line = data.toString().trim();
      if (!line.includes('ExperimentalWarning')) {
        console.error(`  📱 [Error] ${line}`);
      }
    });

    telegramBotProcess.on('close', (code) => {
      if (code !== 0) {
        logComponent('Telegram Bot', 'failed', `Processo encerrado com código ${code}`);
        recordStatus('Telegram Bot', 'failed', `Exit code ${code}`);
      }
    });

    // Aguarda inicialização
    await new Promise(resolve => setTimeout(resolve, 2000));
    logComponent('Telegram Bot', 'success', 'Bot ativo e escutando mensagens');
    recordStatus('Telegram Bot', 'running');
  } catch (error: any) {
    logComponent('Telegram Bot', 'failed', error.message);
    recordStatus('Telegram Bot', 'failed', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. DASHBOARD/COCKPIT (se existir)
// ═══════════════════════════════════════════════════════════════════════════

let dashboardProcess: ChildProcess | null = null;

async function startDashboard(): Promise<void> {
  try {
    const dashboardPath = join(__dirname, 'dashboard-prometheus');

    if (!existsSync(dashboardPath)) {
      logComponent('Dashboard', 'skipped', 'Pasta dashboard-prometheus não encontrada');
      recordStatus('Dashboard', 'not_available');
      return;
    }

    logComponent('Dashboard', 'starting', `Iniciando na porta ${DASHBOARD_PORT}...`);

    // Verifica node_modules
    const nodeModulesPath = join(dashboardPath, 'node_modules');
    if (!existsSync(nodeModulesPath)) {
      logComponent('Dashboard', 'starting', 'Instalando dependências (pnpm install)...');

      const installProcess = spawn('pnpm', ['install'], {
        cwd: dashboardPath,
        stdio: 'inherit',
        shell: true,
      });

      await new Promise<void>((resolve, reject) => {
        installProcess.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`pnpm install falhou com código ${code}`));
        });
      });
    }

    // Inicia dashboard
    dashboardProcess = spawn('pnpm', ['dev', '--port', DASHBOARD_PORT.toString()], {
      cwd: dashboardPath,
      stdio: 'pipe',
      shell: true,
    });

    dashboardProcess.stdout?.on('data', (data) => {
      const line = data.toString().trim();
      if (line.includes('Local:') || line.includes('ready in') || line.includes('VITE')) {
        console.log(`  📊 ${line}`);
      }
    });

    dashboardProcess.stderr?.on('data', (data) => {
      const line = data.toString().trim();
      if (!line.includes('ExperimentalWarning')) {
        console.error(`  📊 [Error] ${line}`);
      }
    });

    dashboardProcess.on('close', (code) => {
      if (code !== 0) {
        logComponent('Dashboard', 'failed', `Processo encerrado com código ${code}`);
      }
    });

    // Aguarda dashboard iniciar
    await new Promise(resolve => setTimeout(resolve, 3000));

    const url = `http://localhost:${DASHBOARD_PORT}`;
    logComponent('Dashboard', 'success', url);
    recordStatus('Dashboard', 'running', undefined, url);
  } catch (error: any) {
    logComponent('Dashboard', 'failed', error.message);
    recordStatus('Dashboard', 'failed', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN BOOT SEQUENCE
// ═══════════════════════════════════════════════════════════════════════════

async function bootSystem(): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         OPENCLOUD AURORA - SISTEMA COMPLETO                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Core (obrigatório)
    await startCoreSystem();

    // 2-5. Componentes opcionais (em paralelo quando possível)
    await Promise.allSettled([
      startWebSocket(),
      startAPI(),
      startTelegramBot(),
      startDashboard(),
    ]);

    // Exibir resumo
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                   SISTEMA INICIADO                            ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');

    for (const component of componentStatuses) {
      const statusIcon = component.status === 'running' ? '🟢' : component.status === 'failed' ? '🔴' : '⚪';
      const line = component.url
        ? `║  ${statusIcon} ${component.name.padEnd(20)} ${component.url.padEnd(32)} ║`
        : `║  ${statusIcon} ${component.name.padEnd(20)} ${component.status.padEnd(32)} ║`;
      console.log(line);
    }

    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  💬 CLI Chat: npm run cli                                     ║');
    console.log('║  📱 Telegram: Bot ativo (se configurado)                      ║');
    console.log('║  📊 Cockpit: Dashboard disponível (se instalado)              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('\n✅ Pressione Ctrl+C para encerrar.\n');
  } catch (error: any) {
    console.error('\n❌ Erro crítico ao iniciar sistema:', error.message);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════════════════

function shutdown(signal: string) {
  console.log(`\n\n🛑 Recebido ${signal}, encerrando sistema...`);

  if (telegramBotProcess) {
    console.log('  Encerrando Telegram Bot...');
    telegramBotProcess.kill();
  }

  if (dashboardProcess) {
    console.log('  Encerrando Dashboard...');
    dashboardProcess.kill();
  }

  console.log('✅ Sistema encerrado.\n');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ═══════════════════════════════════════════════════════════════════════════
// BOOT!
// ═══════════════════════════════════════════════════════════════════════════

bootSystem();
