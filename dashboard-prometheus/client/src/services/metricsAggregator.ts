import { OpenClawEvent } from './openclawWebSocket';

export interface MetricPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface SkillMetrics {
  name: string;
  executions: number;
  successes: number;
  failures: number;
  avgDuration: number;
  lastExecution: number;
  successRate: number;
}

export interface ServiceMetrics {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  latency: number;
  uptime: number;
  lastUpdate: number;
}

export interface AggregatedMetrics {
  totalExecutions: number;
  successRate: number;
  avgLatency: number;
  errorCount: number;
  skillMetrics: Map<string, SkillMetrics>;
  serviceMetrics: Map<string, ServiceMetrics>;
  latencyHistory: MetricPoint[];
  executionHistory: MetricPoint[];
  errorHistory: MetricPoint[];
  successRateHistory: MetricPoint[];
}

export class MetricsAggregator {
  private metrics: AggregatedMetrics;
  private historyWindow = 24 * 60 * 60 * 1000; // 24 horas
  private aggregationInterval = 60 * 1000; // 1 minuto
  private lastAggregation = Date.now();

  constructor() {
    this.metrics = {
      totalExecutions: 0,
      successRate: 100,
      avgLatency: 0,
      errorCount: 0,
      skillMetrics: new Map(),
      serviceMetrics: new Map(),
      latencyHistory: [],
      executionHistory: [],
      errorHistory: [],
      successRateHistory: [],
    };
  }

  processEvent(event: OpenClawEvent) {
    const now = Date.now();

    switch (event.type) {
      case 'skill_execution':
        this.processSkillExecution(event, now);
        break;
      case 'connection_status':
        this.processConnectionStatus(event, now);
        break;
      case 'error':
        this.processError(event, now);
        break;
      case 'metric':
        this.processMetric(event, now);
        break;
    }

    // Agregar métricas periodicamente
    if (now - this.lastAggregation > this.aggregationInterval) {
      this.aggregateMetrics(now);
      this.lastAggregation = now;
    }
  }

  private processSkillExecution(event: OpenClawEvent, now: number) {
    const skillName = event.metadata?.skill || 'unknown';
    const status = event.metadata?.status || 'unknown';
    const duration = event.metadata?.duration || 0;

    this.metrics.totalExecutions++;

    // Atualizar métricas da skill
    let skillMetric = this.metrics.skillMetrics.get(skillName);
    if (!skillMetric) {
      skillMetric = {
        name: skillName,
        executions: 0,
        successes: 0,
        failures: 0,
        avgDuration: 0,
        lastExecution: now,
        successRate: 100,
      };
      this.metrics.skillMetrics.set(skillName, skillMetric);
    }

    skillMetric.executions++;
    skillMetric.lastExecution = now;
    skillMetric.avgDuration = (skillMetric.avgDuration * (skillMetric.executions - 1) + duration) / skillMetric.executions;

    if (status === 'success') {
      skillMetric.successes++;
    } else {
      skillMetric.failures++;
      this.metrics.errorCount++;
    }

    skillMetric.successRate = (skillMetric.successes / skillMetric.executions) * 100;

    // Adicionar ao histórico de latência
    this.metrics.latencyHistory.push({
      timestamp: now,
      value: duration,
      label: skillName,
    });
  }

  private processConnectionStatus(event: OpenClawEvent, now: number) {
    const serviceName = event.metadata?.service || 'unknown';
    const status = event.metadata?.status || 'offline';
    const latency = event.metadata?.latency || 0;

    let serviceMetric = this.metrics.serviceMetrics.get(serviceName);
    if (!serviceMetric) {
      serviceMetric = {
        name: serviceName,
        status: 'offline',
        latency: 0,
        uptime: 100,
        lastUpdate: now,
      };
      this.metrics.serviceMetrics.set(serviceName, serviceMetric);
    }

    serviceMetric.status = status;
    serviceMetric.latency = latency;
    serviceMetric.lastUpdate = now;
  }

  private processError(event: OpenClawEvent, now: number) {
    this.metrics.errorCount++;
    this.metrics.errorHistory.push({
      timestamp: now,
      value: 1,
      label: event.metadata?.error_type || 'unknown',
    });
  }

  private processMetric(event: OpenClawEvent, now: number) {
    const metricName = event.metadata?.metric_name || 'unknown';
    const value = event.metadata?.value || 0;

    // Armazenar métrica customizada
    if (metricName.includes('latency') || metricName.includes('Latency')) {
      this.metrics.latencyHistory.push({
        timestamp: now,
        value,
        label: metricName,
      });
    }
  }

  private aggregateMetrics(now: number) {
    // Calcular taxa de sucesso geral
    if (this.metrics.totalExecutions > 0) {
      const successCount = Array.from(this.metrics.skillMetrics.values()).reduce(
        (sum, m) => sum + m.successes,
        0
      );
      this.metrics.successRate = (successCount / this.metrics.totalExecutions) * 100;
    }

    // Calcular latência média
    if (this.metrics.latencyHistory.length > 0) {
      const recentLatencies = this.metrics.latencyHistory.filter(
        (p) => now - p.timestamp < 5 * 60 * 1000 // Últimos 5 minutos
      );
      if (recentLatencies.length > 0) {
        this.metrics.avgLatency =
          recentLatencies.reduce((sum, p) => sum + p.value, 0) / recentLatencies.length;
      }
    }

    // Adicionar ao histórico de execução
    this.metrics.executionHistory.push({
      timestamp: now,
      value: this.metrics.totalExecutions,
    });

    // Adicionar ao histórico de taxa de sucesso
    this.metrics.successRateHistory.push({
      timestamp: now,
      value: this.metrics.successRate,
    });

    // Limpar histórico antigo
    this.cleanOldHistory(now);
  }

  private cleanOldHistory(now: number) {
    const cutoff = now - this.historyWindow;

    this.metrics.latencyHistory = this.metrics.latencyHistory.filter((p) => p.timestamp > cutoff);
    this.metrics.executionHistory = this.metrics.executionHistory.filter((p) => p.timestamp > cutoff);
    this.metrics.errorHistory = this.metrics.errorHistory.filter((p) => p.timestamp > cutoff);
    this.metrics.successRateHistory = this.metrics.successRateHistory.filter((p) => p.timestamp > cutoff);
  }

  getMetrics(): AggregatedMetrics {
    return this.metrics;
  }

  getTopSkills(limit: number = 5): SkillMetrics[] {
    return Array.from(this.metrics.skillMetrics.values())
      .sort((a, b) => b.executions - a.executions)
      .slice(0, limit);
  }

  getLatencyTrend(minutes: number = 60): MetricPoint[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.metrics.latencyHistory
      .filter((p) => p.timestamp > cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  getExecutionTrend(minutes: number = 60): MetricPoint[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.metrics.executionHistory
      .filter((p) => p.timestamp > cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  getErrorTrend(minutes: number = 60): MetricPoint[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.metrics.errorHistory
      .filter((p) => p.timestamp > cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  getSuccessRateTrend(minutes: number = 60): MetricPoint[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.metrics.successRateHistory
      .filter((p) => p.timestamp > cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  reset() {
    this.metrics = {
      totalExecutions: 0,
      successRate: 100,
      avgLatency: 0,
      errorCount: 0,
      skillMetrics: new Map(),
      serviceMetrics: new Map(),
      latencyHistory: [],
      executionHistory: [],
      errorHistory: [],
      successRateHistory: [],
    };
  }
}

// Singleton instance
let instance: MetricsAggregator | null = null;

export function getMetricsAggregator(): MetricsAggregator {
  if (!instance) {
    instance = new MetricsAggregator();
  }
  return instance;
}
