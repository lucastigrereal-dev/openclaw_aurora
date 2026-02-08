/**
 * ══════════════════════════════════════════════════════════════════════════════
 * OPENCLAW API SERVER - Servidor Unificado REST + WebSocket
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Inicia o servidor com:
 * - API REST em /api/v1/*
 * - WebSocket em /ws
 * - Health check em /health
 *
 * Uso:
 *   npx ts-node api/server.ts
 *
 * Porta: API_PORT ou 3333
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { getOpenClawAPIRouter, OpenClawAPIRouter } from './openclaw-api';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ════════════════════════════════════════════════════════════════════════════

const PORT = parseInt(process.env.API_PORT || process.env.PORT || '3333', 10);

// ════════════════════════════════════════════════════════════════════════════
// SERVIDOR
// ════════════════════════════════════════════════════════════════════════════

class OpenClawServer {
  private apiRouter: OpenClawAPIRouter;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor() {
    this.apiRouter = getOpenClawAPIRouter();
  }

  start(port: number): void {
    const server = createServer(async (req, res) => {
      await this.handleRequest(req, res);
    });

    // WebSocket server
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      this.handleWebSocketConnection(ws, req);
    });

    server.listen(port, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════════════════════════╗');
      console.log('║           OPENCLAW API SERVER v2.0                               ║');
      console.log('╚══════════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`  🚀 Server running on port ${port}`);
      console.log('');
      console.log('  📡 REST API Endpoints:');
      console.log(`     GET  http://localhost:${port}/api/v1/health`);
      console.log(`     GET  http://localhost:${port}/api/v1/status`);
      console.log(`     POST http://localhost:${port}/api/v1/intent`);
      console.log(`     GET  http://localhost:${port}/api/v1/executions`);
      console.log(`     GET  http://localhost:${port}/api/v1/executions/:id`);
      console.log(`     GET  http://localhost:${port}/api/v1/hubs`);
      console.log(`     GET  http://localhost:${port}/api/v1/hubs/:id`);
      console.log(`     POST http://localhost:${port}/api/v1/hubs/:id/execute`);
      console.log('');
      console.log('  🔌 WebSocket:');
      console.log(`     ws://localhost:${port}/ws`);
      console.log('');
      console.log('  📋 Quick Test:');
      console.log(`     curl http://localhost:${port}/api/v1/health`);
      console.log(`     curl http://localhost:${port}/api/v1/hubs`);
      console.log(`     curl -X POST http://localhost:${port}/api/v1/intent -H "Content-Type: application/json" -d '{"message":"teste"}'`);
      console.log('');
      console.log('──────────────────────────────────────────────────────────────────');
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url || '';

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check rápido
    if (url === '/health' || url === '/') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'ok',
        service: 'openclaw-api',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    // API v1 routes
    if (url.startsWith('/api/v1/')) {
      const handled = await this.apiRouter.handle(req, res);
      if (handled) return;
    }

    // 404
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(404);
    res.end(JSON.stringify({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${url} not found. Try /api/v1/health`,
      },
    }));
  }

  private handleWebSocketConnection(ws: WebSocket, req: IncomingMessage): void {
    console.log(`[WS] Client connected from ${req.socket.remoteAddress}`);
    this.clients.add(ws);

    // Envia welcome
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to OpenClaw API WebSocket',
      timestamp: new Date().toISOString(),
    }));

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleWebSocketMessage(ws, message);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid JSON message',
        }));
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('[WS] Error:', error);
      this.clients.delete(ws);
    });
  }

  private async handleWebSocketMessage(ws: WebSocket, message: any): Promise<void> {
    const { type, id } = message;

    switch (type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', id, timestamp: Date.now() }));
        break;

      case 'subscribe':
        // Futuramente: subscription para eventos de execução
        ws.send(JSON.stringify({
          type: 'subscribed',
          id,
          channels: message.channels || ['executions'],
        }));
        break;

      case 'intent':
        // Processa intent e notifica via WS
        ws.send(JSON.stringify({
          type: 'intent_received',
          id,
          message: 'Use POST /api/v1/intent for now',
        }));
        break;

      default:
        ws.send(JSON.stringify({
          type: 'unknown',
          id,
          message: `Unknown message type: ${type}`,
        }));
    }
  }

  // Broadcast para todos os clientes
  broadcast(message: any): void {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS & MAIN
// ════════════════════════════════════════════════════════════════════════════

/**
 * Cria e retorna uma instância do servidor
 */
export function createOpenClawServer(): OpenClawServer {
  return new OpenClawServer();
}

/**
 * Inicia o servidor na porta especificada
 */
export function startServer(port?: number): void {
  const server = new OpenClawServer();
  server.start(port || PORT);
}

// Auto-start se executado diretamente
if (require.main === module) {
  const server = new OpenClawServer();
  server.start(PORT);
}
