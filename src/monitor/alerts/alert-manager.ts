/**
 * Alert Manager - Sistema de Alertas
 *
 * Envia alertas para múltiplos canais:
 * - Console (log)
 * - Slack
 * - Discord
 * - Webhook customizado
 * - Telegram (via bot)
 */

import { EventEmitter } from 'events';
import { AlertConfig } from '../core/config';

export enum AlertLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  sentTo: string[];
}

export interface AlertInput {
  level: AlertLevel;
  title: string;
  message: string;
  source: string;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

interface AlertAggregate {
  key: string;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  sample: Alert;
}

export class AlertManager extends EventEmitter {
  private history: Alert[] = [];
  private lastSent = new Map<string, number>();
  private aggregates = new Map<string, AlertAggregate>();
  private pendingAggregates = new Map<string, NodeJS.Timeout>();

  constructor(private readonly config: AlertConfig) {
    super();
  }

  /**
   * Envia um alerta.
   */
  send(input: AlertInput): Alert | null {
    if (!this.config.enabled) return null;

    const alert = this.createAlert(input);
    const key = this.getAlertKey(alert);

    // Verifica cooldown
    if (!this.shouldSend(key)) {
      this.aggregate(key, alert);
      return null;
    }

    // Registra envio
    this.lastSent.set(key, Date.now());
    this.history.push(alert);

    // Limita histórico
    if (this.history.length > 10000) {
      this.history = this.history.slice(-5000);
    }

    // Envia para canais
    this.sendToChannels(alert);

    // Emite evento
    this.emit('alert', alert);

    return alert;
  }

  /**
   * Cria objeto Alert.
   */
  private createAlert(input: AlertInput): Alert {
    return {
      id: this.generateId(),
      level: input.level,
      title: input.title,
      message: input.message,
      source: input.source,
      timestamp: new Date(),
      tags: input.tags,
      metadata: input.metadata,
      acknowledged: false,
      sentTo: [],
    };
  }

  /**
   * Gera ID único.
   */
  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gera chave para agregação/cooldown.
   */
  private getAlertKey(alert: Alert): string {
    return `${alert.level}:${alert.source}:${alert.title}`;
  }

  /**
   * Verifica se deve enviar (cooldown).
   */
  private shouldSend(key: string): boolean {
    const lastSentTime = this.lastSent.get(key) || 0;
    return Date.now() - lastSentTime >= this.config.cooldown;
  }

  /**
   * Agrega alertas similares.
   */
  private aggregate(key: string, alert: Alert): void {
    if (!this.config.aggregateAlerts) return;

    if (!this.aggregates.has(key)) {
      this.aggregates.set(key, {
        key,
        count: 1,
        firstOccurrence: alert.timestamp,
        lastOccurrence: alert.timestamp,
        sample: alert,
      });

      // Agenda envio do agregado
      const timer = setTimeout(() => {
        this.sendAggregated(key);
      }, this.config.cooldown);

      this.pendingAggregates.set(key, timer);
    } else {
      const agg = this.aggregates.get(key)!;
      agg.count++;
      agg.lastOccurrence = alert.timestamp;
    }
  }

  /**
   * Envia alerta agregado.
   */
  private sendAggregated(key: string): void {
    const agg = this.aggregates.get(key);
    if (!agg) return;

    const aggregatedAlert: Alert = {
      ...agg.sample,
      id: this.generateId(),
      message: `${agg.sample.message} (${agg.count} occurrences)`,
      metadata: {
        ...agg.sample.metadata,
        aggregated: true,
        count: agg.count,
        firstOccurrence: agg.firstOccurrence,
        lastOccurrence: agg.lastOccurrence,
      },
    };

    this.history.push(aggregatedAlert);
    this.sendToChannels(aggregatedAlert);
    this.emit('alert', aggregatedAlert);

    this.aggregates.delete(key);
    this.pendingAggregates.delete(key);
  }

  /**
   * Envia para todos os canais configurados.
   */
  private async sendToChannels(alert: Alert): Promise<void> {
    // Console
    this.logToConsole(alert);
    alert.sentTo.push('console');

    // Slack
    if (this.config.slackWebhook) {
      try {
        await this.sendToSlack(alert);
        alert.sentTo.push('slack');
      } catch (err) {
        console.error('Failed to send to Slack:', err);
      }
    }

    // Discord
    if (this.config.discordWebhook) {
      try {
        await this.sendToDiscord(alert);
        alert.sentTo.push('discord');
      } catch (err) {
        console.error('Failed to send to Discord:', err);
      }
    }

    // Custom Webhook
    if (this.config.customWebhook) {
      try {
        await this.sendToWebhook(alert);
        alert.sentTo.push('webhook');
      } catch (err) {
        console.error('Failed to send to webhook:', err);
      }
    }
  }

  /**
   * Log no console.
   */
  private logToConsole(alert: Alert): void {
    const levelColors: Record<string, string> = {
      debug: '\x1b[90m',
      info: '\x1b[36m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      critical: '\x1b[35m',
    };

    const reset = '\x1b[0m';
    const color = levelColors[alert.level] || reset;
    const timestamp = alert.timestamp.toISOString();

    console.log(
      `${color}[AURORA ${alert.level.toUpperCase()}]${reset} ${timestamp} | ${alert.source} | ${alert.title}: ${alert.message}`
    );
  }

  /**
   * Envia para Slack.
   */
  private async sendToSlack(alert: Alert): Promise<void> {
    const colorMap: Record<string, string> = {
      debug: '#808080',
      info: '#36a64f',
      warning: '#ffcc00',
      error: '#ff6600',
      critical: '#ff0000',
    };

    const payload = {
      attachments: [{
        color: colorMap[alert.level] || '#808080',
        title: `[${alert.level.toUpperCase()}] ${alert.title}`,
        text: alert.message,
        fields: [
          { title: 'Source', value: alert.source, short: true },
          { title: 'Time', value: alert.timestamp.toISOString(), short: true },
        ],
        footer: 'Aurora Monitor',
      }],
    };

    await fetch(this.config.slackWebhook!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Envia para Discord.
   */
  private async sendToDiscord(alert: Alert): Promise<void> {
    const colorMap: Record<string, number> = {
      debug: 0x808080,
      info: 0x36a64f,
      warning: 0xffcc00,
      error: 0xff6600,
      critical: 0xff0000,
    };

    const payload = {
      embeds: [{
        color: colorMap[alert.level] || 0x808080,
        title: `[${alert.level.toUpperCase()}] ${alert.title}`,
        description: alert.message,
        fields: [
          { name: 'Source', value: alert.source, inline: true },
          { name: 'Time', value: alert.timestamp.toISOString(), inline: true },
        ],
        footer: { text: 'Aurora Monitor' },
      }],
    };

    await fetch(this.config.discordWebhook!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Envia para webhook customizado.
   */
  private async sendToWebhook(alert: Alert): Promise<void> {
    await fetch(this.config.customWebhook!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });
  }

  /**
   * Reconhece um alerta.
   */
  acknowledge(alertId: string, by: string = 'system'): boolean {
    const alert = this.history.find(a => a.id === alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = by;

    this.emit('acknowledged', alert);
    return true;
  }

  /**
   * Retorna histórico.
   */
  getHistory(options?: {
    limit?: number;
    level?: AlertLevel;
    source?: string;
    since?: Date;
    acknowledged?: boolean;
  }): Alert[] {
    let alerts = [...this.history];

    if (options?.level) {
      const levelOrder = [AlertLevel.DEBUG, AlertLevel.INFO, AlertLevel.WARNING, AlertLevel.ERROR, AlertLevel.CRITICAL];
      const minIndex = levelOrder.indexOf(options.level);
      alerts = alerts.filter(a => levelOrder.indexOf(a.level) >= minIndex);
    }

    if (options?.source) {
      alerts = alerts.filter(a => a.source.includes(options.source!));
    }

    if (options?.since) {
      alerts = alerts.filter(a => a.timestamp >= options.since!);
    }

    if (options?.acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === options.acknowledged);
    }

    if (options?.limit) {
      alerts = alerts.slice(-options.limit);
    }

    return alerts;
  }

  /**
   * Retorna alertas não reconhecidos.
   */
  getUnacknowledged(level?: AlertLevel): Alert[] {
    return this.getHistory({ acknowledged: false, level });
  }

  /**
   * Retorna estatísticas.
   */
  getStats(): {
    total: number;
    unacknowledged: number;
    last24h: number;
    byLevel: Record<string, number>;
    bySource: Record<string, number>;
  } {
    const byLevel: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let last24h = 0;
    let unacknowledged = 0;

    for (const alert of this.history) {
      byLevel[alert.level] = (byLevel[alert.level] || 0) + 1;

      const sourceBase = alert.source.split('.')[0];
      bySource[sourceBase] = (bySource[sourceBase] || 0) + 1;

      if (alert.timestamp.getTime() > cutoff) last24h++;
      if (!alert.acknowledged) unacknowledged++;
    }

    return {
      total: this.history.length,
      unacknowledged,
      last24h,
      byLevel,
      bySource,
    };
  }

  /**
   * Limpa histórico.
   */
  clearHistory(): void {
    this.history = [];
    this.aggregates.clear();
    for (const timer of this.pendingAggregates.values()) {
      clearTimeout(timer);
    }
    this.pendingAggregates.clear();
    this.lastSent.clear();
  }
}
