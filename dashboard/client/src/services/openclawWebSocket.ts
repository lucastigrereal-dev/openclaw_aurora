import { ActivityItem } from '@/components/ActivityFeed';

export interface OpenClawMessage {
  type: string;
  event: string;
  data: any;
  timestamp?: number;
}

export interface OpenClawEvent {
  type: 'skill_execution' | 'connection_status' | 'error' | 'metric' | 'notification' | 'system';
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Detecta o WebSocket URL automaticamente:
 * - Em dev (localhost): ws://localhost:18789/api/v1/ws
 * - Em producao (Vercel -> Railway): wss://openclawaurora-production.up.railway.app/api/v1/ws
 * - Pode ser overridden via VITE_WS_URL
 */
function getDefaultWebSocketUrl(): string {
  // 1. Environment variable tem prioridade
  const envUrl = import.meta.env?.VITE_WS_URL;
  if (envUrl) return envUrl;

  // 2. Detecta automaticamente baseado no hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    if (!isLocalhost) {
      // Producao: conecta ao Railway backend via WSS
      const railwayUrl = import.meta.env?.VITE_RAILWAY_URL || 'openclawaurora-production.up.railway.app';
      return `wss://${railwayUrl}/api/v1/ws`;
    }
  }

  // 3. Default: localhost
  return 'ws://localhost:18789/api/v1/ws';
}

export class OpenClawWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: ((event: OpenClawEvent) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];

  constructor(url?: string) {
    this.url = url || getDefaultWebSocketUrl();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔌 Conectando ao OpenClaw WebSocket: ${this.url}`);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket OpenClaw conectado');
          this.reconnectAttempts = 0;
          this.notifyConnectionHandlers(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: OpenClawMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Erro ao parsear mensagem WebSocket:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ Erro WebSocket:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('⚠️ WebSocket desconectado');
          this.notifyConnectionHandlers(false);
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('Erro ao criar WebSocket:', error);
        reject(error);
      }
    });
  }

  private handleMessage(message: OpenClawMessage) {
    console.log('📨 Mensagem OpenClaw recebida:', message);

    const event = this.parseOpenClawEvent(message);
    if (event) {
      this.notifyMessageHandlers(event);
    }
  }

  private parseOpenClawEvent(message: OpenClawMessage): OpenClawEvent | null {
    const { type, event, data } = message;

    // Mapeamento de eventos do OpenClaw para nosso formato
    switch (type) {
      case 'skill_execution':
        return {
          type: 'skill_execution',
          title: `⚡ ${data.skill_name || 'Skill'} executada`,
          description: `Status: ${data.status || 'unknown'} | Tempo: ${data.duration || 0}ms`,
          metadata: {
            skill: data.skill_name,
            status: data.status,
            duration: data.duration,
            input: data.input,
            output: data.output,
          },
        };

      case 'connection_status':
        return {
          type: 'connection_status',
          title: `🔌 ${data.service || 'Serviço'} ${data.status === 'online' ? 'conectado' : 'desconectado'}`,
          description: `Latência: ${data.latency || 0}ms`,
          metadata: {
            service: data.service,
            status: data.status,
            latency: data.latency,
          },
        };

      case 'error':
        return {
          type: 'error',
          title: `❌ Erro: ${data.error_type || 'Unknown'}`,
          description: data.message || 'Erro desconhecido',
          metadata: {
            error_type: data.error_type,
            error_code: data.error_code,
            stack: data.stack,
          },
        };

      case 'metric':
        return {
          type: 'metric',
          title: `📊 Métrica: ${data.metric_name || 'Unknown'}`,
          description: `Valor: ${data.value} | Unidade: ${data.unit || 'N/A'}`,
          metadata: {
            metric_name: data.metric_name,
            value: data.value,
            unit: data.unit,
            threshold: data.threshold,
          },
        };

      case 'notification':
        return {
          type: 'notification',
          title: data.title || 'Notificação',
          description: data.message || '',
          metadata: {
            priority: data.priority,
            action: data.action,
          },
        };

      case 'system':
        return {
          type: 'system',
          title: `🔧 Sistema: ${data.action || 'Unknown'}`,
          description: data.details || '',
          metadata: {
            action: data.action,
            details: data.details,
          },
        };

      default:
        // Evento genérico
        return {
          type: 'notification',
          title: `📨 ${type}`,
          description: JSON.stringify(data),
          metadata: data,
        };
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `🔄 Tentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Falha ao reconectar:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Máximo de tentativas de reconexão atingido');
    }
  }

  send(message: Partial<OpenClawMessage>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          ...message,
          timestamp: Date.now(),
        })
      );
    } else {
      console.warn('⚠️ WebSocket não está conectado');
    }
  }

  onMessage(handler: (event: OpenClawEvent) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter((h) => h !== handler);
    };
  }

  private notifyMessageHandlers(event: OpenClawEvent) {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('Erro ao chamar message handler:', error);
      }
    });
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach((handler) => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Erro ao chamar connection handler:', error);
      }
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Singleton instance
let instance: OpenClawWebSocketService | null = null;

export function getOpenClawWebSocket(): OpenClawWebSocketService {
  if (!instance) {
    instance = new OpenClawWebSocketService();
  }
  return instance;
}
