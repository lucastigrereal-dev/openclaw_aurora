/**
 * Anomaly Detector - Detecção de anomalias em métricas
 *
 * Detecta:
 * - Outliers (Z-Score)
 * - Spikes súbitos
 * - Tendências crescentes (memory leak)
 * - Padrões anormais
 */

import { EventEmitter } from 'events';
import { SystemMetrics } from '../collectors/metrics';
import { AnomalyConfig } from '../core/config';

export enum AnomalyType {
  OUTLIER = 'outlier',
  SPIKE = 'spike',
  GROWING_TREND = 'growing_trend',
  MEMORY_LEAK = 'memory_leak',
  HIGH_ERROR_RATE = 'high_error_rate',
  LATENCY_INCREASE = 'latency_increase',
}

export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface Anomaly {
  type: AnomalyType;
  metric: string;
  value: number;
  expected: number;
  deviation: number;
  severity: AnomalySeverity;
  description: string;
  timestamp: Date;
  context?: Record<string, any>;
}

interface MetricSample {
  value: number;
  timestamp: number;
}

interface MetricHistory {
  samples: MetricSample[];
  mean: number;
  stdDev: number;
  trend: number;
  lastValue: number;
}

export class AnomalyDetector extends EventEmitter {
  private metricsHistory = new Map<string, MetricHistory>();
  private anomalyHistory: Anomaly[] = [];
  private lastDetection: Date | null = null;

  constructor(private readonly config: AnomalyConfig) {
    super();
  }

  /**
   * Adiciona amostra de métricas.
   */
  addSample(metrics: SystemMetrics): void {
    const timestamp = Date.now();

    // Extrai métricas relevantes
    const samples: Record<string, number> = {
      'cpu.percent': metrics.cpu.percent,
      'memory.percent': metrics.memory.percent,
      'memory.heapUsed': metrics.memory.heapUsed,
      'memory.rss': metrics.memory.rss,
      'disk.percent': metrics.disk.percent,
      'eventLoop.lag': metrics.eventLoop?.lag || 0,
    };

    for (const [name, value] of Object.entries(samples)) {
      this.addMetricSample(name, value, timestamp);
    }
  }

  /**
   * Adiciona amostra de métrica individual.
   */
  addMetricSample(metric: string, value: number, timestamp?: number): void {
    if (!this.metricsHistory.has(metric)) {
      this.metricsHistory.set(metric, {
        samples: [],
        mean: 0,
        stdDev: 0,
        trend: 0,
        lastValue: value,
      });
    }

    const history = this.metricsHistory.get(metric)!;
    history.samples.push({
      value,
      timestamp: timestamp || Date.now(),
    });

    // Mantém apenas amostras dentro da janela
    const windowMs = this.config.windowSize * this.config.detectionInterval;
    const cutoff = Date.now() - windowMs;
    history.samples = history.samples.filter(s => s.timestamp > cutoff);

    // Atualiza estatísticas
    this.updateStats(metric);
  }

  /**
   * Adiciona métrica customizada de erro.
   */
  addErrorMetric(service: string, errorCount: number): void {
    this.addMetricSample(`errors.${service}`, errorCount);
  }

  /**
   * Adiciona métrica de latência.
   */
  addLatencyMetric(service: string, latencyMs: number): void {
    this.addMetricSample(`latency.${service}`, latencyMs);
  }

  /**
   * Atualiza estatísticas de uma métrica.
   */
  private updateStats(metric: string): void {
    const history = this.metricsHistory.get(metric);
    if (!history || history.samples.length < 2) return;

    const values = history.samples.map(s => s.value);

    // Média
    history.mean = values.reduce((a, b) => a + b, 0) / values.length;

    // Desvio padrão
    const squaredDiffs = values.map(v => Math.pow(v - history.mean, 2));
    history.stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);

    // Tendência (slope usando regressão linear simples)
    if (history.samples.length >= 3) {
      const n = history.samples.length;
      const firstHalf = values.slice(0, Math.floor(n / 2));
      const secondHalf = values.slice(Math.floor(n / 2));
      const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      history.trend = ((secondMean - firstMean) / firstMean) * 100; // Percentual
    }

    history.lastValue = values[values.length - 1];
  }

  /**
   * Detecta anomalias em todas as métricas.
   */
  detect(): Anomaly[] {
    const anomalies: Anomaly[] = [];
    this.lastDetection = new Date();

    for (const [metric, history] of this.metricsHistory) {
      if (history.samples.length < 3) continue;

      // 1. Detecta outliers (Z-Score)
      const outlier = this.detectOutlier(metric, history);
      if (outlier) anomalies.push(outlier);

      // 2. Detecta spikes
      const spike = this.detectSpike(metric, history);
      if (spike) anomalies.push(spike);

      // 3. Detecta tendências
      const trend = this.detectTrend(metric, history);
      if (trend) anomalies.push(trend);

      // 4. Detecta memory leak
      if (metric.includes('memory') || metric.includes('heap')) {
        const leak = this.detectMemoryLeak(metric, history);
        if (leak) anomalies.push(leak);
      }
    }

    // Registra anomalias
    for (const anomaly of anomalies) {
      this.anomalyHistory.push(anomaly);
      this.emit('anomaly', anomaly);
    }

    // Limita histórico
    if (this.anomalyHistory.length > 1000) {
      this.anomalyHistory = this.anomalyHistory.slice(-500);
    }

    return anomalies;
  }

  /**
   * Detecta outlier usando Z-Score.
   */
  private detectOutlier(metric: string, history: MetricHistory): Anomaly | null {
    if (history.stdDev === 0) return null;

    const zScore = Math.abs((history.lastValue - history.mean) / history.stdDev);

    if (zScore > this.config.zScoreThreshold) {
      const severity = this.getSeverity(zScore, [3, 4, 5]);

      return {
        type: AnomalyType.OUTLIER,
        metric,
        value: history.lastValue,
        expected: history.mean,
        deviation: zScore,
        severity,
        description: `${metric} is ${zScore.toFixed(2)} standard deviations from mean (${history.lastValue.toFixed(2)} vs expected ${history.mean.toFixed(2)})`,
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Detecta spike (mudança súbita).
   */
  private detectSpike(metric: string, history: MetricHistory): Anomaly | null {
    if (history.samples.length < 2) return null;

    const prevValue = history.samples[history.samples.length - 2].value;
    const currentValue = history.lastValue;

    if (prevValue === 0) return null;

    const changeRatio = currentValue / prevValue;

    if (changeRatio > this.config.spikeMultiplier) {
      const severity = this.getSeverity(changeRatio, [2, 3, 5]);

      return {
        type: AnomalyType.SPIKE,
        metric,
        value: currentValue,
        expected: prevValue,
        deviation: changeRatio,
        severity,
        description: `${metric} spiked ${changeRatio.toFixed(1)}x (${prevValue.toFixed(2)} -> ${currentValue.toFixed(2)})`,
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Detecta tendência crescente.
   */
  private detectTrend(metric: string, history: MetricHistory): Anomaly | null {
    if (Math.abs(history.trend) > this.config.trendThreshold) {
      const isGrowing = history.trend > 0;
      const severity = this.getSeverity(Math.abs(history.trend), [20, 40, 60]);

      return {
        type: AnomalyType.GROWING_TREND,
        metric,
        value: history.lastValue,
        expected: history.mean,
        deviation: history.trend,
        severity,
        description: `${metric} showing ${isGrowing ? 'growing' : 'declining'} trend of ${history.trend.toFixed(1)}%`,
        timestamp: new Date(),
        context: { trend: history.trend, isGrowing },
      };
    }

    return null;
  }

  /**
   * Detecta potencial memory leak.
   */
  private detectMemoryLeak(metric: string, history: MetricHistory): Anomaly | null {
    // Memory leak: tendência crescente contínua sem quedas
    if (history.trend < 10 || history.samples.length < 10) return null;

    // Verifica se não houve quedas significativas
    const values = history.samples.map(s => s.value);
    let consecutiveIncreases = 0;
    let maxConsecutive = 0;

    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) {
        consecutiveIncreases++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveIncreases);
      } else {
        consecutiveIncreases = 0;
      }
    }

    // Se mais de 70% das amostras são aumentos consecutivos
    if (maxConsecutive > history.samples.length * 0.7) {
      return {
        type: AnomalyType.MEMORY_LEAK,
        metric,
        value: history.lastValue,
        expected: history.samples[0].value,
        deviation: ((history.lastValue - history.samples[0].value) / history.samples[0].value) * 100,
        severity: AnomalySeverity.HIGH,
        description: `Potential memory leak in ${metric}: continuous growth of ${history.trend.toFixed(1)}%`,
        timestamp: new Date(),
        context: {
          startValue: history.samples[0].value,
          endValue: history.lastValue,
          samples: history.samples.length,
        },
      };
    }

    return null;
  }

  /**
   * Determina severidade baseada em thresholds.
   */
  private getSeverity(value: number, thresholds: [number, number, number]): AnomalySeverity {
    if (value >= thresholds[2]) return AnomalySeverity.CRITICAL;
    if (value >= thresholds[1]) return AnomalySeverity.HIGH;
    if (value >= thresholds[0]) return AnomalySeverity.MEDIUM;
    return AnomalySeverity.LOW;
  }

  /**
   * Retorna histórico de anomalias.
   */
  getHistory(limit?: number): Anomaly[] {
    if (limit) {
      return this.anomalyHistory.slice(-limit);
    }
    return [...this.anomalyHistory];
  }

  /**
   * Retorna anomalias por tipo.
   */
  getByType(type: AnomalyType): Anomaly[] {
    return this.anomalyHistory.filter(a => a.type === type);
  }

  /**
   * Retorna anomalias por severidade.
   */
  getBySeverity(minSeverity: AnomalySeverity): Anomaly[] {
    const severityOrder = [
      AnomalySeverity.LOW,
      AnomalySeverity.MEDIUM,
      AnomalySeverity.HIGH,
      AnomalySeverity.CRITICAL,
    ];
    const minIndex = severityOrder.indexOf(minSeverity);
    return this.anomalyHistory.filter(a =>
      severityOrder.indexOf(a.severity) >= minIndex
    );
  }

  /**
   * Retorna estatísticas.
   */
  getStats(): {
    totalAnomalies: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    lastDetection: Date | null;
    metricsTracked: number;
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const anomaly of this.anomalyHistory) {
      byType[anomaly.type] = (byType[anomaly.type] || 0) + 1;
      bySeverity[anomaly.severity] = (bySeverity[anomaly.severity] || 0) + 1;
    }

    return {
      totalAnomalies: this.anomalyHistory.length,
      byType,
      bySeverity,
      lastDetection: this.lastDetection,
      metricsTracked: this.metricsHistory.size,
    };
  }

  /**
   * Limpa histórico.
   */
  clearHistory(): void {
    this.anomalyHistory = [];
  }

  /**
   * Reseta detector.
   */
  reset(): void {
    this.metricsHistory.clear();
    this.anomalyHistory = [];
    this.lastDetection = null;
  }
}
