/**
 * A-01: Unified Metrics Schema - Complete Analytics System
 *
 * Sistema unificado de métricas e analytics para skills
 *
 * Features:
 * - Tracking de execuções
 * - Métricas de performance
 * - Cálculo de custos
 * - ROI por skill
 * - Agregações temporais
 * - Export para análise
 *
 * @version 1.0.0
 * @critical ANALYTICS
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface SkillExecution {
  // Identificação
  id: string;
  skillName: string;
  skillVersion: string;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  duration: number;                        // ms

  // Resultado
  success: boolean;
  error?: string;

  // Input/Output
  inputSize?: number;                      // bytes
  outputSize?: number;                     // bytes

  // Recursos
  memoryUsed?: number;                     // bytes
  cpuUsage?: number;                       // %

  // Custos
  cost?: {
    apiCalls?: number;                     // Número de chamadas API
    tokensUsed?: number;                   // Tokens (LLM)
    estimatedUSD?: number;                 // Custo estimado USD
    provider?: string;                     // Provider (OpenAI, Anthropic, etc)
  };

  // Contexto
  triggeredBy?: string;                    // User/system/cron
  tags?: string[];                         // Tags custom
  metadata?: Record<string, any>;          // Metadata adicional
}

export interface SkillMetricsSummary {
  skillName: string;
  totalExecutions: number;
  successRate: number;                     // 0-1
  failureRate: number;                     // 0-1

  // Performance
  avgDuration: number;                     // ms
  minDuration: number;
  maxDuration: number;
  p95Duration: number;                     // Percentil 95

  // Custos
  totalCost: number;                       // USD
  avgCost: number;                         // USD per execution
  totalTokens: number;
  totalAPICalls: number;

  // ROI (se aplicável)
  roi?: number;                            // %
  timeSaved?: number;                      // hours

  // Trend
  trend?: 'improving' | 'stable' | 'degrading';

  // Período
  periodStart: Date;
  periodEnd: Date;
}

export interface MetricsAggregation {
  period: 'hour' | 'day' | 'week' | 'month';
  timestamp: Date;
  executions: number;
  successCount: number;
  failureCount: number;
  avgDuration: number;
  totalCost: number;
}

export interface MetricsConfig {
  // Storage
  storageDir?: string;                     // Onde salvar métricas
  retention?: number;                      // Dias para manter dados

  // Agregação
  enableAggregation?: boolean;
  aggregationInterval?: number;            // ms

  // Custos
  costCalculator?: (execution: SkillExecution) => number;

  // Export
  enableExport?: boolean;
  exportFormat?: 'json' | 'csv';
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

export class SkillMetricsCollector extends EventEmitter {
  private config: MetricsConfig;
  private executions: Map<string, SkillExecution[]> = new Map();
  private aggregations: Map<string, MetricsAggregation[]> = new Map();

  constructor(config: Partial<MetricsConfig> = {}) {
    super();

    this.config = {
      storageDir: config.storageDir || './metrics',
      retention: config.retention ?? 30,
      enableAggregation: config.enableAggregation ?? true,
      aggregationInterval: config.aggregationInterval ?? 3600000, // 1h
      enableExport: config.enableExport ?? true,
      exportFormat: config.exportFormat || 'json',
      ...config,
    };

    if (this.config.enableAggregation) {
      this.startAggregationWorker();
    }
  }

  /**
   * Registra uma execução de skill
   */
  async record(execution: SkillExecution): Promise<void> {
    const skillName = execution.skillName;

    // Adicionar ao mapa
    if (!this.executions.has(skillName)) {
      this.executions.set(skillName, []);
    }

    this.executions.get(skillName)!.push(execution);

    // Calcular custo se configurado
    if (this.config.costCalculator && !execution.cost?.estimatedUSD) {
      const cost = this.config.costCalculator(execution);
      execution.cost = {
        ...execution.cost,
        estimatedUSD: cost,
      };
    }

    // Persistir
    if (this.config.storageDir) {
      await this.persistExecution(execution);
    }

    this.emit('execution:recorded', execution);
  }

  /**
   * Obtém summary de uma skill
   */
  getSummary(skillName: string, periodDays: number = 7): SkillMetricsSummary {
    const executions = this.executions.get(skillName) || [];

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Filtrar por período
    const periodExecutions = executions.filter(
      e => e.startedAt >= periodStart
    );

    if (periodExecutions.length === 0) {
      return this.getEmptySummary(skillName, periodStart, new Date());
    }

    // Calcular métricas
    const totalExecutions = periodExecutions.length;
    const successCount = periodExecutions.filter(e => e.success).length;
    const failureCount = totalExecutions - successCount;

    const durations = periodExecutions.map(e => e.duration).sort((a, b) => a - b);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = durations[0];
    const maxDuration = durations[durations.length - 1];
    const p95Duration = durations[Math.floor(durations.length * 0.95)];

    const totalCost = periodExecutions.reduce(
      (sum, e) => sum + (e.cost?.estimatedUSD || 0),
      0
    );
    const avgCost = totalCost / totalExecutions;

    const totalTokens = periodExecutions.reduce(
      (sum, e) => sum + (e.cost?.tokensUsed || 0),
      0
    );

    const totalAPICalls = periodExecutions.reduce(
      (sum, e) => sum + (e.cost?.apiCalls || 0),
      0
    );

    return {
      skillName,
      totalExecutions,
      successRate: successCount / totalExecutions,
      failureRate: failureCount / totalExecutions,
      avgDuration,
      minDuration,
      maxDuration,
      p95Duration,
      totalCost,
      avgCost,
      totalTokens,
      totalAPICalls,
      trend: this.calculateTrend(periodExecutions),
      periodStart,
      periodEnd: new Date(),
    };
  }

  /**
   * Obtém todas as métricas
   */
  getAllSummaries(periodDays: number = 7): SkillMetricsSummary[] {
    const summaries: SkillMetricsSummary[] = [];

    for (const skillName of this.executions.keys()) {
      summaries.push(this.getSummary(skillName, periodDays));
    }

    return summaries.sort((a, b) => b.totalExecutions - a.totalExecutions);
  }

  /**
   * Obtém agregações por período
   */
  getAggregations(
    skillName: string,
    period: 'hour' | 'day' | 'week' | 'month'
  ): MetricsAggregation[] {
    const key = `${skillName}:${period}`;
    return this.aggregations.get(key) || [];
  }

  /**
   * Calcula ROI de uma skill
   */
  calculateROI(
    skillName: string,
    timeSavedPerExecution: number,        // hours
    hourlyRate: number = 50               // USD/hour
  ): number {
    const summary = this.getSummary(skillName);

    const timeSaved = summary.totalExecutions * timeSavedPerExecution;
    const valueSaved = timeSaved * hourlyRate;

    if (summary.totalCost === 0) {
      return Infinity;
    }

    return ((valueSaved - summary.totalCost) / summary.totalCost) * 100;
  }

  /**
   * Export métricas
   */
  async export(format: 'json' | 'csv' = 'json'): Promise<string> {
    const summaries = this.getAllSummaries();

    if (format === 'json') {
      return JSON.stringify(summaries, null, 2);
    } else {
      // CSV
      const header = [
        'skillName',
        'totalExecutions',
        'successRate',
        'avgDuration',
        'totalCost',
        'avgCost',
        'roi',
      ].join(',');

      const rows = summaries.map(s =>
        [
          s.skillName,
          s.totalExecutions,
          s.successRate.toFixed(2),
          s.avgDuration.toFixed(0),
          s.totalCost.toFixed(2),
          s.avgCost.toFixed(4),
          s.roi?.toFixed(0) || 'N/A',
        ].join(',')
      );

      return [header, ...rows].join('\n');
    }
  }

  /**
   * Cleanup de métricas antigas
   */
  async cleanup(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retention!);

    let removedCount = 0;

    for (const [skillName, executions] of this.executions.entries()) {
      const filtered = executions.filter(e => e.startedAt >= cutoffDate);
      const removed = executions.length - filtered.length;

      if (removed > 0) {
        this.executions.set(skillName, filtered);
        removedCount += removed;
      }
    }

    return removedCount;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private async persistExecution(execution: SkillExecution): Promise<void> {
    const date = execution.startedAt.toISOString().split('T')[0];
    const dir = path.join(this.config.storageDir!, execution.skillName);
    const file = path.join(dir, `${date}.jsonl`);

    await fs.mkdir(dir, { recursive: true });

    const line = JSON.stringify(execution) + '\n';
    await fs.appendFile(file, line);
  }

  private getEmptySummary(
    skillName: string,
    periodStart: Date,
    periodEnd: Date
  ): SkillMetricsSummary {
    return {
      skillName,
      totalExecutions: 0,
      successRate: 0,
      failureRate: 0,
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      p95Duration: 0,
      totalCost: 0,
      avgCost: 0,
      totalTokens: 0,
      totalAPICalls: 0,
      periodStart,
      periodEnd,
    };
  }

  private calculateTrend(
    executions: SkillExecution[]
  ): 'improving' | 'stable' | 'degrading' {
    if (executions.length < 10) return 'stable';

    // Dividir em duas metades
    const mid = Math.floor(executions.length / 2);
    const firstHalf = executions.slice(0, mid);
    const secondHalf = executions.slice(mid);

    const avgFirst =
      firstHalf.reduce((sum, e) => sum + e.duration, 0) / firstHalf.length;
    const avgSecond =
      secondHalf.reduce((sum, e) => sum + e.duration, 0) / secondHalf.length;

    const improvement = ((avgFirst - avgSecond) / avgFirst) * 100;

    if (improvement > 10) return 'improving';
    if (improvement < -10) return 'degrading';
    return 'stable';
  }

  private startAggregationWorker(): void {
    setInterval(() => {
      this.aggregateMetrics();
    }, this.config.aggregationInterval!);
  }

  private aggregateMetrics(): void {
    for (const [skillName, executions] of this.executions.entries()) {
      const hourlyAgg = this.aggregateByPeriod(executions, 'hour');
      const key = `${skillName}:hour`;
      this.aggregations.set(key, hourlyAgg);
    }
  }

  private aggregateByPeriod(
    executions: SkillExecution[],
    period: 'hour' | 'day' | 'week' | 'month'
  ): MetricsAggregation[] {
    const buckets = new Map<number, SkillExecution[]>();

    for (const exec of executions) {
      const bucket = this.getBucket(exec.startedAt, period);
      if (!buckets.has(bucket)) {
        buckets.set(bucket, []);
      }
      buckets.get(bucket)!.push(exec);
    }

    const aggregations: MetricsAggregation[] = [];

    for (const [bucket, execs] of buckets.entries()) {
      aggregations.push({
        period,
        timestamp: new Date(bucket),
        executions: execs.length,
        successCount: execs.filter(e => e.success).length,
        failureCount: execs.filter(e => !e.success).length,
        avgDuration: execs.reduce((sum, e) => sum + e.duration, 0) / execs.length,
        totalCost: execs.reduce((sum, e) => sum + (e.cost?.estimatedUSD || 0), 0),
      });
    }

    return aggregations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private getBucket(date: Date, period: 'hour' | 'day' | 'week' | 'month'): number {
    const d = new Date(date);

    switch (period) {
      case 'hour':
        d.setMinutes(0, 0, 0);
        break;
      case 'day':
        d.setHours(0, 0, 0, 0);
        break;
      case 'week': {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        break;
      }
      case 'month':
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        break;
    }

    return d.getTime();
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

let globalMetricsCollector: SkillMetricsCollector | null = null;

export function getMetricsCollector(): SkillMetricsCollector {
  if (!globalMetricsCollector) {
    globalMetricsCollector = new SkillMetricsCollector();
  }
  return globalMetricsCollector;
}

// ============================================================================
// COST CALCULATORS
// ============================================================================

/**
 * Calculador de custo para OpenAI/GPT
 */
export function calculateGPTCost(execution: SkillExecution): number {
  if (!execution.cost?.tokensUsed) return 0;

  // Preços GPT-4 (estimativa)
  const costPer1KTokens = 0.03;
  return (execution.cost.tokensUsed / 1000) * costPer1KTokens;
}

/**
 * Calculador de custo para Anthropic/Claude
 */
export function calculateClaudeCost(execution: SkillExecution): number {
  if (!execution.cost?.tokensUsed) return 0;

  // Preços Claude (estimativa)
  const costPer1KTokens = 0.015;
  return (execution.cost.tokensUsed / 1000) * costPer1KTokens;
}

/**
 * Calculador de custo para Ollama (local - grátis)
 */
export function calculateOllamaCost(execution: SkillExecution): number {
  return 0; // Local = grátis
}
