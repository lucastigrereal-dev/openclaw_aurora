/**
 * WebSocket Server - Servidor de métricas para o Prometheus Cockpit
 *
 * Expõe métricas em tempo real via WebSocket para o dashboard.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { OpenClawIntegration } from './openclaw';

export interface MetricsServerOptions {
  port: number;
  host?: string;
  authToken?: string;
  corsOrigins?: string[];
}

export interface MetricsMessage {
  type: 'metrics' | 'alert' | 'anomaly' | 'status' | 'channel_status' | 'error';
  timestamp: string;
  data: any;
}

export class AuroraWebSocketServer extends EventEmitter {
  private httpServer: ReturnType<typeof createServer> | null = null;
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();
  private metricsInterval: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly integration: OpenClawIntegration,
    private readonly options: MetricsServerOptions
  ) {
    super();
  }

  /**
   * Inicia o servidor.
   */
  start(): void {
    if (this.running) return;

    // Cria servidor HTTP para health checks
    this.httpServer = createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });

    // Cria WebSocket server
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Inicia servidor
    this.httpServer.listen(this.options.port, this.options.host || '0.0.0.0', () => {
      console.log(`Aurora WebSocket server running on ws://${this.options.host || '0.0.0.0'}:${this.options.port}`);
      this.running = true;
      this.emit('started');
    });

    // Inicia broadcast de métricas
    this.startMetricsBroadcast();

    // Escuta eventos da integração
    this.setupIntegrationListeners();
  }

  /**
   * Para o servidor.
   */
  stop(): void {
    if (!this.running) return;

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Fecha conexões
    for (const client of this.clients) {
      client.close(1000, 'Server shutting down');
    }
    this.clients.clear();

    // Fecha servidores
    this.wss?.close();
    this.httpServer?.close();

    this.running = false;
    this.emit('stopped');
  }

  /**
   * Trata requisições HTTP (health checks, métricas snapshot).
   */
  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    // CORS
    const origin = req.headers.origin;
    if (this.options.corsOrigins?.includes(origin || '')) {
      res.setHeader('Access-Control-Allow-Origin', origin!);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Rotas
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    switch (url.pathname) {
      case '/health':
        this.handleHealthCheck(res);
        break;

      case '/metrics':
        this.handleMetricsSnapshot(res);
        break;

      case '/status':
        this.handleStatus(res);
        break;

      default:
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
  }

  private handleHealthCheck(res: ServerResponse): void {
    const status = this.integration.getStatus();

    const healthy = status.running &&
      status.channels.every(c => c.connected) &&
      status.watchdog.state === 'healthy';

    res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      healthy,
      status: status.watchdog.state,
      uptime: process.uptime(),
      channels: status.channels.length,
      connectedChannels: status.channels.filter(c => c.connected).length,
    }));
  }

  private async handleMetricsSnapshot(res: ServerResponse): Promise<void> {
    try {
      const metrics = await this.integration.getMetricsForDashboard();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(metrics));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to get metrics' }));
    }
  }

  private handleStatus(res: ServerResponse): void {
    const status = this.integration.getStatus();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  }

  /**
   * Trata nova conexão WebSocket.
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    // Autenticação opcional
    if (this.options.authToken) {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const token = url.searchParams.get('token') ||
        req.headers.authorization?.replace('Bearer ', '');

      if (token !== this.options.authToken) {
        ws.close(4001, 'Unauthorized');
        return;
      }
    }

    this.clients.add(ws);
    console.log(`Client connected. Total: ${this.clients.size}`);

    // Envia status inicial
    this.sendToClient(ws, {
      type: 'status',
      timestamp: new Date().toISOString(),
      data: this.integration.getStatus(),
    });

    // Handlers
    ws.on('message', (data) => {
      this.handleClientMessage(ws, data.toString());
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`Client disconnected. Total: ${this.clients.size}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  /**
   * Trata mensagem do cliente.
   */
  private handleClientMessage(ws: WebSocket, message: string): void {
    try {
      const msg = JSON.parse(message);

      switch (msg.type) {
        case 'ping':
          this.sendToClient(ws, { type: 'status', timestamp: new Date().toISOString(), data: { pong: true } });
          break;

        case 'get_metrics':
          this.integration.getMetricsForDashboard().then(metrics => {
            this.sendToClient(ws, { type: 'metrics', timestamp: new Date().toISOString(), data: metrics });
          });
          break;

        case 'get_status':
          this.sendToClient(ws, {
            type: 'status',
            timestamp: new Date().toISOString(),
            data: this.integration.getStatus(),
          });
          break;

        case 'subscribe':
          // Cliente quer se inscrever em eventos específicos
          break;
      }
    } catch {
      // Ignora mensagens inválidas
    }
  }

  /**
   * Inicia broadcast periódico de métricas.
   */
  private startMetricsBroadcast(): void {
    this.metricsInterval = setInterval(async () => {
      if (this.clients.size === 0) return;

      try {
        const metrics = await this.integration.getMetricsForDashboard();

        this.broadcast({
          type: 'metrics',
          timestamp: new Date().toISOString(),
          data: metrics,
        });
      } catch (error) {
        console.error('Error broadcasting metrics:', error);
      }
    }, 2000); // A cada 2 segundos
  }

  /**
   * Configura listeners da integração.
   */
  private setupIntegrationListeners(): void {
    // Alertas
    this.integration.on('alert', (alert) => {
      this.broadcast({
        type: 'alert',
        timestamp: new Date().toISOString(),
        data: alert,
      });
    });

    // Anomalias
    this.integration.on('anomaly', (anomaly) => {
      this.broadcast({
        type: 'anomaly',
        timestamp: new Date().toISOString(),
        data: anomaly,
      });
    });

    // Status de canais
    this.integration.on('channelReconnected', (channel) => {
      this.broadcast({
        type: 'channel_status',
        timestamp: new Date().toISOString(),
        data: { channel, status: 'reconnected' },
      });
    });

    // Métricas
    this.integration.on('metrics', (metrics) => {
      // Métricas já são broadcastadas periodicamente
    });
  }

  /**
   * Envia mensagem para um cliente.
   */
  private sendToClient(ws: WebSocket, message: MetricsMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast para todos os clientes.
   */
  private broadcast(message: MetricsMessage): void {
    const data = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  /**
   * Número de clientes conectados.
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

/**
 * Cria servidor WebSocket para métricas.
 */
export function createMetricsServer(
  integration: OpenClawIntegration,
  options: MetricsServerOptions
): AuroraWebSocketServer {
  return new AuroraWebSocketServer(integration, options);
}
