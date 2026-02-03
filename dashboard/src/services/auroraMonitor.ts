/**
 * Aurora Monitor WebSocket Service
 *
 * Conecta o Prometheus Cockpit ao Aurora Monitor para receber
 * métricas em tempo real, alertas e status dos circuit breakers.
 */

export interface AuroraMetrics {
  system: {
    cpu: number;
    memory: number;
    disk: number;
    uptime: number;
    eventLoopLag: number;
  };
  channels: AuroraChannelStatus[];
  aiProviders: AuroraAIProviderStatus[];
  alerts: AuroraAlert[];
  anomalies: AuroraAnomaly[];
}

export interface AuroraChannelStatus {
  name: string;
  type: string;
  connected: boolean;
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  reconnectAttempts?: number;
}

export interface AuroraAIProviderStatus {
  name: string;
  type: string;
  available: boolean;
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export interface AuroraAlert {
  id: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface AuroraAnomaly {
  type: string;
  metric: string;
  value: number;
  expected: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
}

export interface AuroraMessage {
  type: 'metrics' | 'alert' | 'anomaly' | 'status' | 'channel_status' | 'error';
  timestamp: string;
  data: any;
}

export class AuroraMonitorService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private metricsHandlers: ((metrics: AuroraMetrics) => void)[] = [];
  private alertHandlers: ((alert: AuroraAlert) => void)[] = [];
  private anomalyHandlers: ((anomaly: AuroraAnomaly) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];

  private latestMetrics: AuroraMetrics | null = null;

  constructor(url: string = 'ws://localhost:18790') {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🌟 Conectando ao Aurora Monitor: ${this.url}`);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✅ Aurora Monitor conectado');
          this.reconnectAttempts = 0;
          this.notifyConnectionHandlers(true);

          // Solicita métricas iniciais
          this.send({ type: 'get_metrics' });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: AuroraMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Erro ao parsear mensagem Aurora:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ Erro Aurora WebSocket:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('⚠️ Aurora Monitor desconectado');
          this.notifyConnectionHandlers(false);
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('Erro ao criar WebSocket Aurora:', error);
        reject(error);
      }
    });
  }

  private handleMessage(message: AuroraMessage) {
    console.log('📊 Aurora message:', message.type);

    switch (message.type) {
      case 'metrics':
        this.latestMetrics = message.data as AuroraMetrics;
        this.notifyMetricsHandlers(this.latestMetrics);
        break;

      case 'alert':
        const alert = message.data as AuroraAlert;
        this.notifyAlertHandlers(alert);
        break;

      case 'anomaly':
        const anomaly = message.data as AuroraAnomaly;
        this.notifyAnomalyHandlers(anomaly);
        break;

      case 'status':
        // Status geral do sistema
        console.log('Aurora status:', message.data);
        break;

      case 'channel_status':
        // Status de canal mudou (reconectado, etc)
        console.log('Channel status:', message.data);
        // Solicita métricas atualizadas
        this.send({ type: 'get_metrics' });
        break;

      case 'error':
        console.error('Aurora error:', message.data);
        break;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

      console.log(
        `🔄 Reconectando ao Aurora... (${this.reconnectAttempts}/${this.maxReconnectAttempts}) em ${delay}ms`
      );

      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Falha ao reconectar ao Aurora:', error);
        });
      }, delay);
    } else {
      console.error('❌ Máximo de tentativas de reconexão ao Aurora atingido');
    }
  }

  send(message: Record<string, any>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Event handlers
  onMetrics(handler: (metrics: AuroraMetrics) => void) {
    this.metricsHandlers.push(handler);
    // Se já tem métricas, envia imediatamente
    if (this.latestMetrics) {
      handler(this.latestMetrics);
    }
    return () => {
      this.metricsHandlers = this.metricsHandlers.filter((h) => h !== handler);
    };
  }

  onAlert(handler: (alert: AuroraAlert) => void) {
    this.alertHandlers.push(handler);
    return () => {
      this.alertHandlers = this.alertHandlers.filter((h) => h !== handler);
    };
  }

  onAnomaly(handler: (anomaly: AuroraAnomaly) => void) {
    this.anomalyHandlers.push(handler);
    return () => {
      this.anomalyHandlers = this.anomalyHandlers.filter((h) => h !== handler);
    };
  }

  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter((h) => h !== handler);
    };
  }

  private notifyMetricsHandlers(metrics: AuroraMetrics) {
    this.metricsHandlers.forEach((handler) => {
      try {
        handler(metrics);
      } catch (error) {
        console.error('Erro em metrics handler:', error);
      }
    });
  }

  private notifyAlertHandlers(alert: AuroraAlert) {
    this.alertHandlers.forEach((handler) => {
      try {
        handler(alert);
      } catch (error) {
        console.error('Erro em alert handler:', error);
      }
    });
  }

  private notifyAnomalyHandlers(anomaly: AuroraAnomaly) {
    this.anomalyHandlers.forEach((handler) => {
      try {
        handler(anomaly);
      } catch (error) {
        console.error('Erro em anomaly handler:', error);
      }
    });
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach((handler) => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Erro em connection handler:', error);
      }
    });
  }

  getLatestMetrics(): AuroraMetrics | null {
    return this.latestMetrics;
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
let auroraInstance: AuroraMonitorService | null = null;

export function getAuroraMonitor(): AuroraMonitorService {
  if (!auroraInstance) {
    auroraInstance = new AuroraMonitorService();
  }
  return auroraInstance;
}
