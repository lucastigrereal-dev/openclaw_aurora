/**
 * WebSocket Server com Chat e Comandos
 * Permite o Dashboard controlar o sistema e conversar com IA
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage } from 'http';
import { getAuroraMonitor, AuroraMonitor } from './aurora-openclaw-integration';
import { getSkillExecutor, SkillExecutor } from './skill-executor';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TIPOS DE MENSAGENS
// ============================================================================

interface WSMessage {
  type: string;
  id?: string;
  [key: string]: any;
}

interface ChatMessage {
  type: 'chat';
  id: string;
  message: string;
  model?: 'claude' | 'gpt' | 'ollama';
}

interface ExecuteSkillMessage {
  type: 'execute_skill';
  id: string;
  skill: string;
  input: any;
}

interface CommandMessage {
  type: 'command';
  id: string;
  command: 'list_skills' | 'get_status' | 'get_history';
}

// ============================================================================
// WEBSOCKET SERVER COM CHAT
// ============================================================================

export class DashboardWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private authenticatedClients: Set<WebSocket> = new Set();
  private monitor: AuroraMonitor;
  private executor: SkillExecutor;
  private gatewayToken: string;

  constructor() {
    this.monitor = getAuroraMonitor();
    this.executor = getSkillExecutor();
    this.gatewayToken = process.env.GATEWAY_TOKEN || '';

    if (!this.gatewayToken) {
      console.warn('[WebSocket] ⚠️  GATEWAY_TOKEN not set - authentication disabled');
    }
  }

  start(port: number): void {
    // Cria servidor HTTP para suportar paths
    const server = createServer((req, res) => {
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Health check endpoint
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        return;
      }

      // List all hubs endpoint
      if (req.url === '/api/hubs') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const hubs = [
          { id: 'hub-enterprise', name: 'Hub Enterprise', description: 'Fábrica de aplicações com 9 personas', personas: 9 },
          { id: 'social-hub', name: 'Social Hub', description: 'Geração de conteúdo para redes sociais', personas: 5 },
          { id: 'supabase-archon', name: 'Supabase Archon', description: 'Gerenciamento de databases Supabase', personas: 3 },
          { id: 'aurora-monitor', name: 'Aurora Monitor', description: 'Monitoramento e métricas do sistema', personas: 2 },
          { id: 'guardrail', name: 'GuardrailSkill', description: 'Validação, segurança e proteção', personas: 1 }
        ];
        res.end(JSON.stringify({ success: true, hubs }));
        return;
      }

      // List skills by hub endpoint
      if (req.url && req.url.startsWith('/api/hubs/')) {
        const hubId = req.url.split('/')[3];
        res.writeHead(200, { 'Content-Type': 'application/json' });

        const skillsByHub: { [key: string]: any[] } = {
          'hub-enterprise': [
            { name: 'hub.enterprise.orchestrator', persona: 'orchestrator', description: 'Orquestrador principal' },
            { name: 'hub.enterprise.produto', persona: 'produto', description: 'MVP definition, user stories, roadmap' },
            { name: 'hub.enterprise.arquitetura', persona: 'arquitetura', description: 'Architecture design, tech stack selection' },
            { name: 'hub.enterprise.engenharia', persona: 'engenharia', description: 'Code generation, scaffolding, CI/CD' },
            { name: 'hub.enterprise.qa', persona: 'qa', description: 'Testing, coverage, security tests' },
            { name: 'hub.enterprise.ops', persona: 'ops', description: 'Deployment, monitoring, infrastructure' },
            { name: 'hub.enterprise.security', persona: 'security', description: 'Security audit, vulnerability scanning' },
            { name: 'hub.enterprise.dados', persona: 'dados', description: 'Analytics, dashboards, data pipelines' },
            { name: 'hub.enterprise.design', persona: 'design', description: 'UI/UX design, wireframes, prototypes' },
            { name: 'hub.enterprise.performance', persona: 'performance', description: 'Performance optimization, load testing' }
          ],
          'social-hub': [
            { name: 'social.hub.generator', description: 'Content generation for social media' },
            { name: 'social.hub.scheduler', description: 'Content scheduling' },
            { name: 'social.hub.analytics', description: 'Social media analytics' }
          ],
          'supabase-archon': [
            { name: 'supabase.archon.s01', description: 'Table management' },
            { name: 'supabase.archon.s02', description: 'Schema management' }
          ],
          'aurora-monitor': [
            { name: 'aurora.monitor.metrics', description: 'System metrics' }
          ],
          'guardrail': [
            { name: 'guardrail.skill', description: 'Security and validation' }
          ]
        };

        const skills = skillsByHub[hubId] || [];
        res.end(JSON.stringify({ success: true, hubId, skills }));
        return;
      }

      // Get all available skills endpoint
      if (req.url === '/api/skills') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const command: CommandMessage = {
          type: 'command',
          id: `api-cmd-${Date.now()}`,
          command: 'list_skills'
        };
        // This would normally query from executor, for now return available skills
        res.end(JSON.stringify({ success: true, message: 'Use WebSocket for real-time skill listing' }));
        return;
      }

      // System status endpoint
      if (req.url === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          status: {
            uptime: process.uptime() * 1000,
            activeSessions: this.clients.size,
            messagesProcessed: 0,
            skillsExecuted: 0,
            memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}mb`,
            cpuUsage: 'N/A',
            timestamp: Date.now()
          }
        }));
        return;
      }

      // ============================================================
      // SERVE CONTROL UI STATIC FILES
      // ============================================================
      const staticDir = path.join(__dirname, '..', 'dashboard', 'dist', 'public');

      // Serve index.html for root and /chat routes
      if (req.url === '/' || req.url?.startsWith('/chat')) {
        const indexPath = path.join(staticDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fs.readFileSync(indexPath));
          return;
        }
      }

      // Serve static assets (CSS, JS, images, etc.)
      if (req.url) {
        const filePath = path.join(staticDir, req.url);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath);
          const contentTypes: { [key: string]: string } = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
          };
          const contentType = contentTypes[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(fs.readFileSync(filePath));
          return;
        }
      }

      // Default 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Not found' }));
    });

    // WebSocket aceita conexões em / ou /api/v1/ws
    this.wss = new WebSocketServer({ server });

    server.listen(port, () => {
      console.log(`[WebSocket] Server started on port ${port}`);
      console.log(`[WebSocket] Accepts: ws://localhost:${port} or ws://localhost:${port}/api/v1/ws`);
      console.log(`[WebSocket] Chat and commands enabled`);
    });

    this.wss.on('connection', (ws, req: IncomingMessage) => {
      this.clients.add(ws);
      console.log(`[WebSocket] Client connected via path: ${req.url || '/'} (${this.clients.size} total)`);

      // Se autenticação está habilitada, envia challenge
      if (this.gatewayToken) {
        const nonce = this.generateNonce();
        this.sendToClient(ws, {
          type: 'event',
          event: 'connect.challenge',
          payload: {
            nonce: nonce,
            ts: Date.now()
          }
        });
      } else {
        // Sem autenticação, aceita imediatamente
        this.authenticatedClients.add(ws);
        this.sendWelcome(ws);
      }

      // Handler de mensagens do cliente
      ws.on('message', async (rawData) => {
        try {
          const message: WSMessage = JSON.parse(rawData.toString());

          // Se não autenticado, só aceita mensagens de autenticação
          if (this.gatewayToken && !this.authenticatedClients.has(ws)) {
            if (message.type === 'req' && message.method === 'connect') {
              this.handleAuth(ws, message);
            } else {
              ws.close(1008, 'unauthorized: gateway token missing');
            }
            return;
          }

          await this.handleMessage(ws, message);
        } catch (error: any) {
          this.sendToClient(ws, {
            type: 'error',
            error: 'Mensagem inválida',
            details: error.message,
          });
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        this.authenticatedClients.delete(ws);
        console.log(`[WebSocket] Client disconnected (${this.clients.size} total)`);
      });
    });

    // Eventos do monitor para todos os clientes
    this.monitor.on('metric', (data) => {
      this.broadcast({ type: 'metric', ...data });
    });

    this.monitor.on('circuit-state-change', (data) => {
      this.broadcast({ type: 'circuit_breaker', event: 'state_change', data });
    });

    this.monitor.on('watchdog-alert', (data) => {
      this.broadcast({ type: 'watchdog', event: data.type, data });
    });

    // Eventos do executor - Formato que o Dashboard espera
    this.executor.on('execution:start', (data) => {
      this.broadcast({
        type: 'skill_execution',
        event: 'skill_started',
        data: {
          skill_name: data.skill,
          status: 'running',
          input: data.input,
        },
        timestamp: Date.now(),
      });
    });

    this.executor.on('execution:complete', (data) => {
      this.broadcast({
        type: 'skill_execution',
        event: 'skill_completed',
        data: {
          skill_name: data.skill,
          status: data.result?.success ? 'success' : 'failed',
          duration: data.result?.duration || 0,
          input: JSON.stringify(data.input || {}),
          output: data.result?.data ? JSON.stringify(data.result.data).slice(0, 100) : '',
        },
        timestamp: Date.now(),
      });
    });

    this.executor.on('execution:error', (data) => {
      this.broadcast({
        type: 'error',
        event: 'error_occurred',
        data: {
          error_type: 'SkillExecutionError',
          error_code: 'SKILL_ERR',
          message: data.error || 'Execution failed',
          skill: data.skill,
        },
        timestamp: Date.now(),
      });
    });

    // Status a cada 5 segundos
    setInterval(() => {
      this.broadcast({
        type: 'status',
        data: this.monitor.getSystemStatus(),
        timestamp: Date.now(),
      });
    }, 5000);
  }

  private generateNonce(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private handleAuth(ws: WebSocket, message: any): void {
    const auth = message.params?.auth;
    const token = auth?.token || auth?.password || '';

    if (token === this.gatewayToken) {
      // Token válido!
      this.authenticatedClients.add(ws);
      console.log('[WebSocket] ✅ Client authenticated');

      // Envia resposta de sucesso
      this.sendToClient(ws, {
        type: 'res',
        id: message.id,
        ok: true,
        payload: {
          protocol: 3,
          auth: {
            role: 'operator',
            scopes: ['operator.admin', 'operator.approvals', 'operator.pairing']
          }
        }
      });

      // Envia welcome
      this.sendWelcome(ws);
    } else {
      // Token inválido
      console.log('[WebSocket] ❌ Authentication failed - token mismatch');
      this.sendToClient(ws, {
        type: 'res',
        id: message.id,
        ok: false,
        error: {
          message: 'unauthorized: gateway token mismatch (open a tokenized dashboard URL or paste token in Control UI settings)'
        }
      });
      ws.close(1008, 'unauthorized: gateway token mismatch');
    }
  }

  private sendWelcome(ws: WebSocket): void {
    this.sendToClient(ws, {
      type: 'system',
      event: 'connected',
      data: {
        status: this.monitor.getSystemStatus(),
        skills: this.executor.listSkills(),
        message: 'OpenClaw Aurora conectado. Digite uma mensagem para conversar com a IA.',
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Processa mensagens recebidas do cliente
   */
  private async handleMessage(ws: WebSocket, message: WSMessage): Promise<void> {
    const { type, id } = message;

    switch (type) {
      // ====== CHAT - Conversa com IA ======
      case 'chat':
        await this.handleChat(ws, message as ChatMessage);
        break;

      // ====== EXECUTE SKILL ======
      case 'execute_skill':
        await this.handleExecuteSkill(ws, message as ExecuteSkillMessage);
        break;

      // ====== COMANDOS ======
      case 'command':
        await this.handleCommand(ws, message as CommandMessage);
        break;

      default:
        this.sendToClient(ws, {
          type: 'error',
          id,
          error: `Tipo de mensagem desconhecido: ${type}`,
        });
    }
  }

  /**
   * Processa mensagens de chat (Automation page, Aurora Avatar, e Cockpit)
   * Suporta comandos Aurora como /ask, /status, /orchestrator, /produto, /exec
   */
  private async handleChat(ws: WebSocket, message: ChatMessage): Promise<void> {
    const { id, message: text, model = 'claude' } = message;

    // Notifica que está processando
    this.sendToClient(ws, {
      type: 'chat_status',
      id,
      status: 'thinking',
      message: 'Processando...',
    });

    // Broadcast para Activity Feed
    this.broadcast({
      type: 'notification',
      event: 'notification_sent',
      data: {
        title: 'Chat IA',
        message: `Processando: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`,
        priority: 'medium',
        action: 'ai_chat',
      },
      timestamp: Date.now(),
    });

    // ============================================================
    // AURORA COMMAND ROUTING - Suporta comandos especiais
    // ============================================================
    const trimmedText = text.trim().toLowerCase();
    let result: any = null;

    // /ask [pergunta]
    if (trimmedText.startsWith('/ask ')) {
      const question = text.substring(5);
      result = await this.executor.run('ai.claude', {
        prompt: question,
        systemPrompt: 'Você é Aurora, um assistente IA avançado especializado em desenvolvimento. Responda de forma clara e concisa em português brasileiro.',
        maxTokens: 2000,
      });
    }
    // /status
    else if (trimmedText === '/status') {
      const status = this.monitor.getSystemStatus();
      const executorStats = this.executor.getStats() || {};
      const skillCount = executorStats.skills?.total || 38;
      result = {
        success: true,
        data: {
          content: `📊 **Aurora Status**\n\n✅ Sistema Online\n⏱️ Uptime: ${Math.floor(status.uptime / 1000 / 60)} minutos\n👥 Conexões ativas: ${this.clients.size}\n📝 Skills disponíveis: ${skillCount}`,
          status: 'healthy'
        }
      };
    }
    // /orchestrator [workflow] [intent]
    else if (trimmedText.startsWith('/orchestrator ')) {
      const parts = text.substring(14).split(' ');
      const workflow = parts[0] || 'full';
      const intent = parts.slice(1).join(' ') || 'Create a complete application';

      result = await this.executor.run('hub.enterprise.orchestrator', {
        workflow: workflow,
        userIntent: intent,
        appName: `app_${Date.now()}`,
      });
    }
    // /produto [subskill] [details]
    else if (trimmedText.startsWith('/produto ')) {
      const parts = text.substring(9).split(' ');
      const subskill = parts[0] || 'mvp_definition';
      const details = parts.slice(1).join(' ') || 'Create MVP for new product';

      result = await this.executor.run('hub.enterprise.produto', {
        subskill: subskill,
        userIntent: details,
        appName: `app_${Date.now()}`,
      });
    }
    // /arquitetura [subskill] [details]
    else if (trimmedText.startsWith('/arquitetura ')) {
      const parts = text.substring(13).split(' ');
      const subskill = parts[0] || 'design_architecture';
      const details = parts.slice(1).join(' ') || 'Design architecture for scalability';

      result = await this.executor.run('hub.enterprise.arquitetura', {
        subskill: subskill,
        userIntent: details,
      });
    }
    // /engenharia [subskill] [details]
    else if (trimmedText.startsWith('/engenharia ')) {
      const parts = text.substring(12).split(' ');
      const subskill = parts[0] || 'scaffold_app';
      const details = parts.slice(1).join(' ') || 'Scaffold application';

      result = await this.executor.run('hub.enterprise.engenharia', {
        subskill: subskill,
        userIntent: details,
      });
    }
    // /qa [subskill] [details]
    else if (trimmedText.startsWith('/qa ')) {
      const parts = text.substring(4).split(' ');
      const subskill = parts[0] || 'smoke_tests';
      const details = parts.slice(1).join(' ') || 'Run smoke tests';

      result = await this.executor.run('hub.enterprise.qa', {
        subskill: subskill,
        userIntent: details,
      });
    }
    // /exec [comando bash]
    else if (trimmedText.startsWith('/exec ')) {
      const command = text.substring(6);
      result = await this.executor.run('exec.bash', {
        command: command,
        timeout: 30000,
      });
    }
    // /py [código python]
    else if (trimmedText.startsWith('/py ')) {
      const code = text.substring(4);
      result = await this.executor.run('exec.python', {
        code: code,
        timeout: 30000,
      });
    }
    // Chat normal com Claude
    else {
      const skillName = model === 'gpt' ? 'ai.gpt' : model === 'ollama' ? 'ai.ollama' : 'ai.claude';

      result = await this.executor.run(skillName, {
        prompt: text,
        systemPrompt: 'Você é Aurora (também chamada Khron), um assistente IA avançado especializado em desenvolvimento e automação. Responda de forma clara e concisa em português brasileiro. Você pode executar skills, automações e ajudar com qualquer tarefa.',
        maxTokens: 2000,
      });
    }

    // ============================================================
    // ENVIA RESPOSTA
    // ============================================================

    // Envia resposta para o cliente que pediu
    this.sendToClient(ws, {
      type: 'chat_response',
      id,
      success: result.success,
      message: result.success ? (result.data?.content || JSON.stringify(result.data).slice(0, 500)) : result.error,
      model: model,
      timestamp: Date.now(),
    });

    // Broadcast notificação de resposta (formato que AuroraAvatar espera)
    if (result.success) {
      // Notificação para Activity Feed
      const responseContent = result.data?.content || (typeof result.data === 'string' ? result.data : JSON.stringify(result.data));

      this.broadcast({
        type: 'notification',
        event: 'notification_sent',
        data: {
          title: 'Aurora respondeu',
          message: responseContent.slice(0, 100) + (responseContent.length > 100 ? '...' : ''),
          priority: 'low',
          action: 'ai_response',
          response: responseContent,
          model: model,
        },
        metadata: {
          response: responseContent,
          model: model,
        },
        timestamp: Date.now(),
      });
    } else {
      // Notifica erro
      this.broadcast({
        type: 'notification',
        event: 'notification_sent',
        data: {
          title: 'Erro Aurora',
          message: result.error || 'Erro desconhecido',
          priority: 'high',
          action: 'ai_error',
        },
        metadata: {
          response: `Erro: ${result.error || 'Desconhecido'}`,
          model: model,
        },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Executa uma skill específica
   */
  private async handleExecuteSkill(ws: WebSocket, message: ExecuteSkillMessage): Promise<void> {
    const { id, skill, input } = message;

    // Notifica início
    this.sendToClient(ws, {
      type: 'skill_status',
      id,
      skill,
      status: 'executing',
    });

    // Executa
    const result = await this.executor.run(skill, input);

    // Envia resultado
    this.sendToClient(ws, {
      type: 'skill_result',
      id,
      skill,
      success: result.success,
      data: result.data,
      error: result.error,
      duration: result.duration,
      timestamp: Date.now(),
    });
  }

  /**
   * Processa comandos do dashboard
   */
  private async handleCommand(ws: WebSocket, message: CommandMessage): Promise<void> {
    const { id, command } = message;

    switch (command) {
      case 'list_skills':
        // Formato que o Dashboard Skills page espera
        const skills = this.executor.listSkills().map((s: any) => ({
          name: s.name,
          category: s.category.toLowerCase(),
          description: s.description,
          status: 'active',
          executionCount: 0,
          successRate: 100,
          avgExecutionTime: 0,
        }));
        this.sendToClient(ws, {
          type: 'command_result',
          id,
          command,
          data: skills,
        });
        break;

      case 'get_status':
        const systemStatus = this.monitor.getSystemStatus();
        const executorStats = this.executor.getStats();
        this.sendToClient(ws, {
          type: 'command_result',
          id,
          command,
          data: {
            system: {
              status: 'online',
              ...systemStatus,
            },
            executor: executorStats,
            services: [
              { name: 'Claude API', status: 'online', latency: 150 },
              { name: 'GPT API', status: 'online', latency: 200 },
              { name: 'Telegram', status: 'online', latency: 80 },
            ],
          },
        });
        // Também envia como evento de métrica
        this.broadcast({
          type: 'metric',
          event: 'metric_update',
          data: {
            metric_name: 'Uptime',
            value: Math.floor(systemStatus.uptime / 1000),
            unit: 's',
          },
          timestamp: Date.now(),
        });
        break;

      case 'get_history':
        const history = this.executor.getHistory(50).map((h: any) => ({
          id: h.id,
          skill: h.skill,
          status: h.output?.success ? 'success' : 'failed',
          duration: h.duration,
          timestamp: h.startTime,
          input: h.output?.data?.input || '',
          output: h.output?.data?.content?.slice(0, 100) || '',
        }));
        this.sendToClient(ws, {
          type: 'command_result',
          id,
          command,
          data: history,
        });
        break;

      default:
        this.sendToClient(ws, {
          type: 'error',
          id,
          error: `Comando desconhecido: ${command}`,
        });
    }
  }

  /**
   * Envia evento de conexão de serviço
   */
  sendConnectionStatus(service: string, status: 'online' | 'offline' | 'degraded', latency?: number): void {
    this.broadcast({
      type: 'connection_status',
      event: status === 'online' ? 'service_connected' : 'service_degraded',
      data: {
        service,
        status,
        latency: latency || 0,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Envia notificação para o Activity Feed
   */
  sendNotification(title: string, message: string, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    this.broadcast({
      type: 'notification',
      event: 'notification_sent',
      data: {
        title,
        message,
        priority,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Envia evento de sistema
   */
  sendSystemEvent(action: string, details: string): void {
    this.broadcast({
      type: 'system',
      event: 'system_update',
      data: {
        action,
        details,
      },
      timestamp: Date.now(),
    });
  }

  private sendToClient(ws: WebSocket, message: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(message: object): void {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  stop(): void {
    this.wss?.close();
    this.clients.clear();
  }
}

// ============================================================================
// EXPORT
// ============================================================================

let serverInstance: DashboardWebSocketServer | null = null;

export function getDashboardServer(): DashboardWebSocketServer {
  if (!serverInstance) {
    serverInstance = new DashboardWebSocketServer();
  }
  return serverInstance;
}
