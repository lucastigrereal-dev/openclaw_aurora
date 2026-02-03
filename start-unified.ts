/**
 * Script Unificado - Inicia OpenClaw Aurora + Dashboard
 *
 * Este script inicia:
 * 1. Backend (WebSocket + Skills + Monitor)
 * 2. Dashboard Frontend (Vite)
 */

import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// Imports do backend
import { getDashboardServer } from './websocket-server';
import { getSkillExecutor } from './skill-executor';
import { getAuroraMonitor } from './aurora-openclaw-integration';
import { registerAllSkills } from './skills';

const WEBSOCKET_PORT = 18789;
const DASHBOARD_PORT = 5173;

let dashboardProcess: ChildProcess | null = null;

async function startBackend(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           OPENCLAW AURORA - SISTEMA UNIFICADO              ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Backend: Skills + WebSocket + Aurora Monitor              ║');
  console.log('║  Frontend: Dashboard Prometheus Cockpit                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 1. Registrar Skills
  console.log('[1/4] Registrando Skills...');
  registerAllSkills();
  const executor = getSkillExecutor();
  const skills = executor.listSkills();
  console.log(`      ✓ ${skills.length} skills registradas`);

  // 2. Iniciar Aurora Monitor
  console.log('[2/4] Iniciando Aurora Monitor...');
  const monitor = getAuroraMonitor();
  console.log('      ✓ Circuit Breaker, Rate Limiter, Watchdog ativos');

  // 3. Iniciar WebSocket Server
  console.log('[3/4] Iniciando WebSocket Server...');
  const wsServer = getDashboardServer();
  wsServer.start(WEBSOCKET_PORT);
  console.log(`      ✓ WebSocket em ws://localhost:${WEBSOCKET_PORT}`);
  console.log(`      ✓ Aceita: ws://localhost:${WEBSOCKET_PORT}/api/v1/ws`);

  // 4. Notificar serviços online
  setTimeout(() => {
    wsServer.sendConnectionStatus('OpenClaw Aurora', 'online', 10);
    wsServer.sendConnectionStatus('Skills Engine', 'online', 5);
    wsServer.sendNotification('Sistema Iniciado', 'OpenClaw Aurora está online e pronto!', 'medium');
  }, 1000);

  console.log('\n✅ BACKEND PRONTO!\n');
}

async function startDashboard(): Promise<void> {
  const dashboardPath = join(__dirname, 'dashboard-prometheus');

  if (!existsSync(dashboardPath)) {
    console.log('[Dashboard] ⚠️  Pasta dashboard-prometheus não encontrada');
    console.log('[Dashboard] Execute: npm install no diretório do dashboard');
    return;
  }

  console.log('[4/4] Iniciando Dashboard...');

  // Verifica se node_modules existe
  const nodeModulesPath = join(dashboardPath, 'node_modules');
  if (!existsSync(nodeModulesPath)) {
    console.log('[Dashboard] Instalando dependências (pnpm install)...');

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

  // Inicia o dashboard
  dashboardProcess = spawn('pnpm', ['dev', '--port', DASHBOARD_PORT.toString()], {
    cwd: dashboardPath,
    stdio: 'pipe',
    shell: true,
  });

  dashboardProcess.stdout?.on('data', (data) => {
    const line = data.toString().trim();
    if (line.includes('Local:') || line.includes('ready in') || line.includes('VITE')) {
      console.log(`[Dashboard] ${line}`);
    }
  });

  dashboardProcess.stderr?.on('data', (data) => {
    const line = data.toString().trim();
    if (!line.includes('ExperimentalWarning')) {
      console.error(`[Dashboard Error] ${line}`);
    }
  });

  dashboardProcess.on('close', (code) => {
    if (code !== 0) {
      console.log(`[Dashboard] Processo encerrado com código ${code}`);
    }
  });

  // Aguarda dashboard iniciar
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log(`      ✓ Dashboard em http://localhost:${DASHBOARD_PORT}`);
  console.log('\n✅ DASHBOARD PRONTO!\n');
}

async function main(): Promise<void> {
  try {
    // Inicia backend
    await startBackend();

    // Tenta iniciar dashboard
    try {
      await startDashboard();
    } catch (err: any) {
      console.log(`[Dashboard] ⚠️  Não foi possível iniciar: ${err.message}`);
      console.log('[Dashboard] O backend continua funcionando normalmente.');
    }

    // Exibe resumo
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    SISTEMA ONLINE                          ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  WebSocket:  ws://localhost:${WEBSOCKET_PORT}                       ║`);
    console.log(`║  Dashboard:  http://localhost:${DASHBOARD_PORT}                       ║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  Chat com KRONOS disponível no Dashboard                   ║');
    console.log('║  Skills: ai.claude, ai.gpt, ai.ollama, etc.                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\nPressione Ctrl+C para encerrar.\n');

  } catch (error: any) {
    console.error('Erro ao iniciar sistema:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nEncerrando sistema...');
  if (dashboardProcess) {
    dashboardProcess.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nEncerrando sistema...');
  if (dashboardProcess) {
    dashboardProcess.kill();
  }
  process.exit(0);
});

// Inicia
main();
