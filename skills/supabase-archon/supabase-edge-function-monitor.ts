/**
 * Supabase Archon - Edge Function Monitor (S-29)
 * Monitora performance de Edge Functions: invocations, cold starts, erro rate, latência, custo
 *
 * @version 1.0.0
 * @priority P1
 * @category UTIL
 * @status production-ready
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';
import { getVault } from './supabase-vault-config';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Métricas de uma função edge individual
 */
export interface EdgeFunctionMetrics {
  name: string;                    // Nome da função
  invocations: number;             // Total de invocações
  coldStarts: number;              // Total de cold starts
  coldStartRate: number;           // Percentual de cold starts (0-100)
  avgExecutionTimeMs: number;      // Tempo médio de execução em ms
  p95ExecutionTimeMs: number;      // Percentil 95 de execução
  p99ExecutionTimeMs: number;      // Percentil 99 de execução
  errorCount: number;              // Total de erros
  errorRate: number;               // Taxa de erro (0-100)
  costPerInvocation: number;       // Custo em USD por invocação
  totalCost: number;               // Custo total em USD
  lastInvocationAt?: string;       // Timestamp da última invocação
  memoryUsedMb: number;            // Memória média usada em MB
  timeoutCount: number;            // Total de timeouts
}

/**
 * Agregação de métricas de todas as funções
 */
export interface EdgeFunctionsMetrics {
  totalFunctions: number;
  totalInvocations: number;
  totalColdStarts: number;
  globalColdStartRate: number;
  globalErrorRate: number;
  globalAvgExecutionTimeMs: number;
  globalP95ExecutionTimeMs: number;
  globalP99ExecutionTimeMs: number;
  totalCost: number;
  costPerMillion: number;          // Custo por 1 milhão de invocações
  averageMemoryUsedMb: number;
  mostExpensiveFunction: string;
  slowestFunction: string;
}

/**
 * Alerta de edge function
 */
export interface EdgeFunctionAlert {
  level: 'info' | 'warning' | 'critical';
  functionName: string;
  alertType: 'high_cold_start' | 'high_error_rate' | 'slow_execution' |
              'high_cost' | 'high_memory' | 'frequent_timeout' | 'general';
  message: string;
  threshold?: number;
  current?: number;
  timestamp: string;
}

/**
 * Parâmetros de entrada do skill
 */
export interface EdgeFunctionMonitorParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  functionNames?: string[];        // Filtrar funções específicas
  timeRangeHours?: number;         // Range temporal em horas (default: 24)
  thresholds?: {
    coldStartRatePercent?: number;  // default: 20
    errorRatePercent?: number;       // default: 5
    executionTimeMs?: number;        // default: 5000
    costPerMillion?: number;         // default: 100
    memoryUsedMb?: number;           // default: 256
    timeoutCount?: number;           // default: 5
  };
}

/**
 * Resultado do skill
 */
export interface EdgeFunctionMonitorResult extends SkillOutput {
  data?: {
    functions: EdgeFunctionMetrics[];
    aggregated: EdgeFunctionsMetrics;
    alerts: EdgeFunctionAlert[];
    timestamp: string;
    checkDuration: number;           // tempo gasto em ms
  };
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

/**
 * Edge Function Monitor - Monitora performance de Edge Functions do Supabase
 */
export class SupabaseEdgeFunctionMonitor extends Skill {
  private logger = createLogger('edge-function-monitor');
  private defaultThresholds = {
    coldStartRatePercent: 20,
    errorRatePercent: 5,
    executionTimeMs: 5000,
    costPerMillion: 100,
    memoryUsedMb: 256,
    timeoutCount: 5,
  };

  constructor() {
    super(
      {
        name: 'supabase-edge-function-monitor',
        description:
          'Monitor Supabase Edge Functions performance: invocations, cold starts, error rate, execution time, costs',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'edge-functions', 'monitoring', 'performance', 'cost'],
      },
      {
        timeout: 60000, // 60 segundos
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as EdgeFunctionMonitorParams;

    // Validar timeRangeHours se fornecido
    if (typed.timeRangeHours && typed.timeRangeHours <= 0) {
      this.logger.warn('Invalid timeRangeHours specified', {
        timeRangeHours: typed.timeRangeHours,
      });
      return false;
    }

    // Validar thresholds se fornecidos
    if (typed.thresholds) {
      const { coldStartRatePercent, errorRatePercent, memoryUsedMb } = typed.thresholds;
      if (
        (coldStartRatePercent && (coldStartRatePercent < 0 || coldStartRatePercent > 100)) ||
        (errorRatePercent && (errorRatePercent < 0 || errorRatePercent > 100)) ||
        (memoryUsedMb && memoryUsedMb <= 0)
      ) {
        this.logger.warn('Invalid thresholds specified', { thresholds: typed.thresholds });
        return false;
      }
    }

    return true;
  }

  /**
   * Executa coleta de métricas de Edge Functions
   */
  async execute(params: SkillInput): Promise<EdgeFunctionMonitorResult> {
    const typed = params as EdgeFunctionMonitorParams;
    const startTime = Date.now();

    this.logger.info('Edge Function Monitor iniciado', {
      timeRange: typed.timeRangeHours || 24,
      functionCount: typed.functionNames?.length || 'all',
    });

    try {
      // Obter credenciais do vault se não fornecidas
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      // Mesclar thresholds com defaults
      const thresholds = { ...this.defaultThresholds, ...typed.thresholds };
      const timeRangeHours = typed.timeRangeHours || 24;

      this.logger.debug('Collecting edge function metrics', {
        timeRange: timeRangeHours,
        thresholds,
      });

      // Coletar métricas de funções edge
      const functions = await this.collectEdgeFunctionMetrics(
        url,
        key,
        typed.functionNames,
        timeRangeHours
      );

      // Agregar métricas
      const aggregated = this.aggregateMetrics(functions);

      // Detectar anomalias
      const alerts = this.detectAnomalies(functions, aggregated, thresholds);

      const duration = Date.now() - startTime;

      if (alerts.length > 0) {
        this.logger.warn('Edge function issues detected', {
          alertCount: alerts.length,
          alerts: alerts.map((a) => ({
            level: a.level,
            functionName: a.functionName,
            alertType: a.alertType,
            message: a.message,
          })),
        });
      } else {
        this.logger.info('All edge function checks passed', {
          totalFunctions: functions.length,
        });
      }

      return {
        success: true,
        data: {
          functions,
          aggregated,
          alerts,
          timestamp: new Date().toISOString(),
          checkDuration: duration,
        },
      };
    } catch (error: any) {
      this.logger.error('Edge Function Monitor failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Coleta métricas de Edge Functions (mock para prototipagem)
   */
  private async collectEdgeFunctionMetrics(
    _url: string,
    _key: string,
    functionNames?: string[],
    _timeRangeHours?: number
  ): Promise<EdgeFunctionMetrics[]> {
    this.logger.debug('Collecting edge function metrics');

    // TODO: Implementar coleta real via Supabase Management API
    // Por enquanto, retorna dados mock

    const defaultFunctions = [
      'process-invoice',
      'send-email-notification',
      'resize-image',
      'generate-report',
      'sync-external-api',
    ];

    const functionsToMonitor = functionNames || defaultFunctions;

    return functionsToMonitor.map((name, index) => {
      const invocations = Math.floor(Math.random() * 50000) + 5000; // 5k-55k
      const coldStarts = Math.floor(invocations * (Math.random() * 0.3 + 0.05)); // 5-35% cold starts
      const errorCount = Math.floor(invocations * (Math.random() * 0.05 + 0.001)); // 0.1-5.1% errors
      const timeoutCount = Math.floor(Math.random() * 15);

      const avgExecutionTimeMs = Math.random() * 2000 + 100; // 100-2100ms
      const p95ExecutionTimeMs = avgExecutionTimeMs * (Math.random() * 3 + 2); // 2-5x average
      const p99ExecutionTimeMs = avgExecutionTimeMs * (Math.random() * 5 + 4); // 4-9x average

      const memoryUsedMb = Math.random() * 256 + 64; // 64-320 MB
      const costPerInvocation = (invocations * memoryUsedMb) / 1000000 * 0.00001; // estimado
      const totalCost = costPerInvocation * invocations;

      return {
        name,
        invocations,
        coldStarts,
        coldStartRate: (coldStarts / invocations) * 100,
        avgExecutionTimeMs: Math.round(avgExecutionTimeMs * 100) / 100,
        p95ExecutionTimeMs: Math.round(p95ExecutionTimeMs * 100) / 100,
        p99ExecutionTimeMs: Math.round(p99ExecutionTimeMs * 100) / 100,
        errorCount,
        errorRate: (errorCount / invocations) * 100,
        costPerInvocation: Math.round(costPerInvocation * 100000) / 100000,
        totalCost: Math.round(totalCost * 10000) / 10000,
        lastInvocationAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        memoryUsedMb: Math.round(memoryUsedMb * 100) / 100,
        timeoutCount,
      };
    });
  }

  /**
   * Agrega métricas de todas as funções
   */
  private aggregateMetrics(functions: EdgeFunctionMetrics[]): EdgeFunctionsMetrics {
    const totalFunctions = functions.length;
    const totalInvocations = functions.reduce((sum, f) => sum + f.invocations, 0);
    const totalColdStarts = functions.reduce((sum, f) => sum + f.coldStarts, 0);
    const totalErrors = functions.reduce((sum, f) => sum + f.errorCount, 0);
    const totalCost = functions.reduce((sum, f) => sum + f.totalCost, 0);

    const globalColdStartRate = totalInvocations > 0 ? (totalColdStarts / totalInvocations) * 100 : 0;
    const globalErrorRate = totalInvocations > 0 ? (totalErrors / totalInvocations) * 100 : 0;

    const globalAvgExecutionTimeMs =
      totalFunctions > 0
        ? functions.reduce((sum, f) => sum + f.avgExecutionTimeMs, 0) / totalFunctions
        : 0;

    const globalP95ExecutionTimeMs =
      totalFunctions > 0
        ? functions.reduce((sum, f) => sum + f.p95ExecutionTimeMs, 0) / totalFunctions
        : 0;

    const globalP99ExecutionTimeMs =
      totalFunctions > 0
        ? functions.reduce((sum, f) => sum + f.p99ExecutionTimeMs, 0) / totalFunctions
        : 0;

    const costPerMillion = totalInvocations > 0 ? (totalCost / totalInvocations) * 1000000 : 0;

    const averageMemoryUsedMb =
      totalFunctions > 0
        ? functions.reduce((sum, f) => sum + f.memoryUsedMb, 0) / totalFunctions
        : 0;

    const mostExpensiveFunction = functions.length > 0
      ? functions.reduce((prev, curr) => (curr.totalCost > prev.totalCost ? curr : prev)).name
      : 'N/A';

    const slowestFunction = functions.length > 0
      ? functions.reduce((prev, curr) =>
          curr.p99ExecutionTimeMs > prev.p99ExecutionTimeMs ? curr : prev
        ).name
      : 'N/A';

    return {
      totalFunctions,
      totalInvocations,
      totalColdStarts,
      globalColdStartRate: Math.round(globalColdStartRate * 100) / 100,
      globalErrorRate: Math.round(globalErrorRate * 100) / 100,
      globalAvgExecutionTimeMs: Math.round(globalAvgExecutionTimeMs * 100) / 100,
      globalP95ExecutionTimeMs: Math.round(globalP95ExecutionTimeMs * 100) / 100,
      globalP99ExecutionTimeMs: Math.round(globalP99ExecutionTimeMs * 100) / 100,
      totalCost: Math.round(totalCost * 10000) / 10000,
      costPerMillion: Math.round(costPerMillion * 10000) / 10000,
      averageMemoryUsedMb: Math.round(averageMemoryUsedMb * 100) / 100,
      mostExpensiveFunction,
      slowestFunction,
    };
  }

  /**
   * Detecta anomalias nas métricas de Edge Functions
   */
  private detectAnomalies(
    functions: EdgeFunctionMetrics[],
    aggregated: EdgeFunctionsMetrics,
    thresholds: {
      coldStartRatePercent: number;
      errorRatePercent: number;
      executionTimeMs: number;
      costPerMillion: number;
      memoryUsedMb: number;
      timeoutCount: number;
    }
  ): EdgeFunctionAlert[] {
    const alerts: EdgeFunctionAlert[] = [];
    const timestamp = new Date().toISOString();

    // Verificar cada função individualmente
    for (const func of functions) {
      // Cold start rate elevada
      if (func.coldStartRate > thresholds.coldStartRatePercent) {
        alerts.push({
          level: func.coldStartRate > 50 ? 'critical' : 'warning',
          functionName: func.name,
          alertType: 'high_cold_start',
          message: `High cold start rate: ${func.coldStartRate.toFixed(2)}%`,
          threshold: thresholds.coldStartRatePercent,
          current: func.coldStartRate,
          timestamp,
        });
      }

      // Taxa de erro elevada
      if (func.errorRate > thresholds.errorRatePercent) {
        alerts.push({
          level: func.errorRate > 10 ? 'critical' : 'warning',
          functionName: func.name,
          alertType: 'high_error_rate',
          message: `High error rate: ${func.errorRate.toFixed(2)}%`,
          threshold: thresholds.errorRatePercent,
          current: func.errorRate,
          timestamp,
        });
      }

      // Execution time elevado
      if (func.p99ExecutionTimeMs > thresholds.executionTimeMs) {
        alerts.push({
          level: func.p99ExecutionTimeMs > thresholds.executionTimeMs * 2 ? 'critical' : 'warning',
          functionName: func.name,
          alertType: 'slow_execution',
          message: `Slow execution time (p99): ${func.p99ExecutionTimeMs.toFixed(2)}ms`,
          threshold: thresholds.executionTimeMs,
          current: func.p99ExecutionTimeMs,
          timestamp,
        });
      }

      // Custo elevado
      if (func.costPerInvocation * 1000000 > thresholds.costPerMillion / 1000) {
        alerts.push({
          level: 'warning',
          functionName: func.name,
          alertType: 'high_cost',
          message: `High cost per invocation: $${func.costPerInvocation.toFixed(6)}`,
          current: func.costPerInvocation,
          timestamp,
        });
      }

      // Memória elevada
      if (func.memoryUsedMb > thresholds.memoryUsedMb) {
        alerts.push({
          level: func.memoryUsedMb > thresholds.memoryUsedMb * 1.5 ? 'warning' : 'info',
          functionName: func.name,
          alertType: 'high_memory',
          message: `High memory usage: ${func.memoryUsedMb.toFixed(2)}MB`,
          threshold: thresholds.memoryUsedMb,
          current: func.memoryUsedMb,
          timestamp,
        });
      }

      // Timeouts frequentes
      if (func.timeoutCount > thresholds.timeoutCount) {
        alerts.push({
          level: 'warning',
          functionName: func.name,
          alertType: 'frequent_timeout',
          message: `Frequent timeouts detected: ${func.timeoutCount} timeouts`,
          threshold: thresholds.timeoutCount,
          current: func.timeoutCount,
          timestamp,
        });
      }
    }

    // Verificar alertas agregados
    if (aggregated.globalErrorRate > thresholds.errorRatePercent * 2) {
      alerts.push({
        level: 'critical',
        functionName: 'GLOBAL',
        alertType: 'high_error_rate',
        message: `Global error rate is critical: ${aggregated.globalErrorRate.toFixed(2)}%`,
        threshold: thresholds.errorRatePercent,
        current: aggregated.globalErrorRate,
        timestamp,
      });
    }

    if (aggregated.costPerMillion > thresholds.costPerMillion) {
      alerts.push({
        level: 'warning',
        functionName: 'GLOBAL',
        alertType: 'high_cost',
        message: `Global cost per million invocations is high: $${aggregated.costPerMillion.toFixed(2)}`,
        threshold: thresholds.costPerMillion,
        current: aggregated.costPerMillion,
        timestamp,
      });
    }

    return alerts;
  }

  /**
   * Método auxiliar: obter função mais cara
   */
  async getMostExpensiveFunction(params: SkillInput): Promise<string | null> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.aggregated.mostExpensiveFunction;
    }
    return null;
  }

  /**
   * Método auxiliar: obter função mais lenta
   */
  async getSlowestFunction(params: SkillInput): Promise<string | null> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.aggregated.slowestFunction;
    }
    return null;
  }

  /**
   * Método auxiliar: obter custo total de Edge Functions
   */
  async getTotalCost(params: SkillInput): Promise<number | null> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.aggregated.totalCost;
    }
    return null;
  }

  /**
   * Método auxiliar: obter taxa de erro global
   */
  async getGlobalErrorRate(params: SkillInput): Promise<number | null> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.aggregated.globalErrorRate;
    }
    return null;
  }
}
