/**
 * OpenClaw Aurora - Main Entry Point
 * Sistema unificado de skills com proteção e monitoramento
 */

import {
  createAuroraSystem,
  AuroraMonitor,
  AuroraWebSocketServer,
} from './aurora-openclaw-integration';
import { getSkillExecutor, SkillExecutor } from './skill-executor';
import { getSkillRegistry } from './skills';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

export interface OpenClawConfig {
  wsPort: number;
  telegramToken?: string;
  claudeApiKey?: string;
  openaiApiKey?: string;
  ollamaUrl?: string;
}

const DEFAULT_CONFIG: OpenClawConfig = {
  wsPort: 18789,
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  claudeApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
};

// ============================================================================
// OPENCLAW AURORA SYSTEM
// ============================================================================

export class OpenClawAurora {
  private config: OpenClawConfig;
  private monitor: AuroraMonitor;
  private wsServer: AuroraWebSocketServer;
  private executor: SkillExecutor;
  private isRunning = false;

  constructor(config: Partial<OpenClawConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Cria sistema Aurora
    const aurora = createAuroraSystem(this.config.wsPort);
    this.monitor = aurora.monitor;
    this.wsServer = aurora.wsServer;

    // Cria executor de skills
    this.executor = getSkillExecutor();

    // Conecta eventos do executor ao WebSocket
    this.setupEventBridge();

    console.log('[OpenClaw Aurora] System initialized');
  }

  private setupEventBridge(): void {
    // Envia eventos de execução para o dashboard
    this.executor.on('execution:start', (data) => {
      this.broadcast({
        type: 'skill_execution',
        event: 'start',
        data,
        timestamp: Date.now(),
      });
    });

    this.executor.on('execution:complete', (data) => {
      this.broadcast({
        type: 'skill_execution',
        event: 'complete',
        data,
        timestamp: Date.now(),
      });
    });

    this.executor.on('execution:error', (data) => {
      this.broadcast({
        type: 'skill_execution',
        event: 'error',
        data,
        timestamp: Date.now(),
      });
    });

    this.executor.on('approval:required', (data) => {
      this.broadcast({
        type: 'approval',
        event: 'required',
        data,
        timestamp: Date.now(),
      });
    });

    this.executor.on('approval:approved', (data) => {
      this.broadcast({
        type: 'approval',
        event: 'approved',
        data,
        timestamp: Date.now(),
      });
    });

    this.executor.on('approval:rejected', (data) => {
      this.broadcast({
        type: 'approval',
        event: 'rejected',
        data,
        timestamp: Date.now(),
      });
    });
  }

  private broadcast(message: object): void {
    // O wsServer tem método interno para broadcast
    (this.wsServer as any).broadcast?.(message);
  }

  /**
   * Inicia o sistema
   */
  start(): void {
    if (this.isRunning) {
      console.log('[OpenClaw Aurora] Already running');
      return;
    }

    console.log('[OpenClaw Aurora] Starting...');

    // Inicia monitoramento
    this.monitor.startAll();

    // Inicia WebSocket server
    this.wsServer.start(this.config.wsPort);

    this.isRunning = true;

    // Log de status
    this.printStatus();
  }

  /**
   * Para o sistema
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log('[OpenClaw Aurora] Stopping...');
    this.monitor.stopAll();
    this.wsServer.stop();
    this.isRunning = false;
  }

  /**
   * Executa uma skill
   */
  async runSkill(name: string, input: any) {
    return this.executor.run(name, input);
  }

  /**
   * Retorna executor para uso direto
   */
  getExecutor(): SkillExecutor {
    return this.executor;
  }

  /**
   * Retorna monitor Aurora
   */
  getMonitor(): AuroraMonitor {
    return this.monitor;
  }

  /**
   * Status do sistema
   */
  getStatus() {
    return {
      running: this.isRunning,
      config: {
        wsPort: this.config.wsPort,
        hasClaudeKey: !!this.config.claudeApiKey,
        hasOpenAIKey: !!this.config.openaiApiKey,
        hasTelegramToken: !!this.config.telegramToken,
        ollamaUrl: this.config.ollamaUrl,
      },
      skills: this.executor.getStats(),
      monitor: this.monitor.getSystemStatus(),
    };
  }

  private printStatus(): void {
    const status = this.getStatus();
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║           OPENCLAW AURORA - SISTEMA ATIVO                 ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  WebSocket:     ws://localhost:${this.config.wsPort}                   ║`);
    console.log(`║  Skills:        ${status.skills.skills.total} registradas                           ║`);
    console.log(`║  Claude API:    ${status.config.hasClaudeKey ? '✅ Configurada' : '❌ Não configurada'}                      ║`);
    console.log(`║  OpenAI API:    ${status.config.hasOpenAIKey ? '✅ Configurada' : '❌ Não configurada'}                      ║`);
    console.log(`║  Telegram:      ${status.config.hasTelegramToken ? '✅ Configurado' : '❌ Não configurado'}                       ║`);
    console.log(`║  Ollama:        ${status.config.ollamaUrl}                    ║`);
    console.log('╚══════════════════════════════════════════════════════════╝\n');
  }
}

// ============================================================================
// INICIALIZAÇÃO DIRETA
// ============================================================================

// Se executado diretamente (não importado)
if (require.main === module) {
  const system = new OpenClawAurora();
  system.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[OpenClaw Aurora] Received SIGINT, shutting down...');
    system.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n[OpenClaw Aurora] Received SIGTERM, shutting down...');
    system.stop();
    process.exit(0);
  });

  // Exemplo de uso após iniciar
  console.log('\n[OpenClaw Aurora] Ready to execute skills!');
  console.log('Example: system.runSkill("util.datetime", { operation: "now" })');
}

// ============================================================================
// EXPORTS
// ============================================================================

export { getSkillExecutor, getSkillRegistry };
export default OpenClawAurora;
