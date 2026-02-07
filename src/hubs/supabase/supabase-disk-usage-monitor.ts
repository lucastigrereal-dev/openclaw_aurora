/**
 * Supabase Archon - Disk Usage Monitor (S-26)
 * Monitora uso de disco e prediz problemas de capacidade
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
 * Métrica de tamanho de tabela
 */
export interface TableDiskUsage {
  schema: string;
  table: string;
  size_mb: number;
  size_bytes: number;
  rows: number;
  avg_row_size_bytes: number;
  percentage_of_total: number;
}

/**
 * Métrica de tamanho de índice
 */
export interface IndexDiskUsage {
  schema: string;
  table: string;
  index_name: string;
  size_mb: number;
  size_bytes: number;
}

/**
 * Métrica de disco geral
 */
export interface DiskUsageSummary {
  total_size_gb: number;
  used_size_gb: number;
  free_size_gb: number;
  usage_percent: number;
  database_size_gb: number;
  unlogged_tables_size_gb: number;
  external_objects_size_gb: number;
}

/**
 * Predição de capacidade
 */
export interface CapacityPrediction {
  current_usage_percent: number;
  daily_growth_mb: number;
  weekly_growth_mb: number;
  monthly_growth_mb: number;
  projected_full_date: string | null;
  days_until_critical: number | null;
  days_until_full: number | null;
  trend: 'increasing' | 'stable' | 'decreasing';
}

/**
 * Objeto de grande tamanho
 */
export interface LargeObject {
  oid: string;
  size_mb: number;
  size_bytes: number;
  owner?: string;
  created_at?: string;
  last_modified?: string;
}

/**
 * Recomendação de limpeza
 */
export interface CleanupRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  table?: string;
  action: string;
  estimated_space_mb: number;
  reason: string;
}

/**
 * Alerta de disco
 */
export interface DiskAlert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  affected_component: 'database' | 'table' | 'large_object' | 'capacity';
  metric_value?: number;
  threshold?: number;
  timestamp: string;
}

/**
 * Parâmetros de entrada do skill
 */
export interface DiskMonitorParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  includeAnalysis?: ('tables' | 'indexes' | 'objects' | 'prediction' | 'recommendations' | 'all')[];
  topTablesCount?: number;          // default: 10
  topIndexesCount?: number;         // default: 10
  thresholds?: {
    criticalUsagePercent?: number;  // default: 95
    warningUsagePercent?: number;   // default: 85
    largeTableMb?: number;          // default: 1000
    largeObjectMb?: number;         // default: 100
  };
}

/**
 * Resultado do skill
 */
export interface DiskMonitorResult extends SkillOutput {
  data?: {
    summary: DiskUsageSummary;
    topTables: TableDiskUsage[];
    topIndexes: IndexDiskUsage[];
    largeObjects: LargeObject[];
    prediction: CapacityPrediction;
    alerts: DiskAlert[];
    recommendations: CleanupRecommendation[];
    timestamp: string;
    checkDuration: number;
  };
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

/**
 * Disk Usage Monitor - Monitora uso de disco do Supabase
 */
export class SupabaseDiskUsageMonitor extends Skill {
  private logger = createLogger('disk-usage-monitor');
  private defaultThresholds = {
    criticalUsagePercent: 95,
    warningUsagePercent: 85,
    largeTableMb: 1000,
    largeObjectMb: 100,
  };

  constructor() {
    super(
      {
        name: 'supabase-disk-usage-monitor',
        description:
          'Monitor disk usage and predict capacity issues: per-table usage, indexes, large objects, growth trends, and cleanup recommendations',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'monitoring', 'disk', 'storage', 'capacity', 'prediction'],
      },
      {
        timeout: 60000, // 60 segundos
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as DiskMonitorParams;

    // Validar includeAnalysis se fornecido
    if (typed.includeAnalysis) {
      const validAnalysis = [
        'tables',
        'indexes',
        'objects',
        'prediction',
        'recommendations',
        'all',
      ];
      const valid = typed.includeAnalysis.every((a) =>
        validAnalysis.includes(a)
      );
      if (!valid) {
        this.logger.warn('Invalid analysis types specified', {
          analysis: typed.includeAnalysis,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Executa monitoramento de disco
   */
  async execute(params: SkillInput): Promise<DiskMonitorResult> {
    const typed = params as DiskMonitorParams;
    const startTime = Date.now();

    this.logger.info('Disk Usage Monitor iniciado', {
      url: typed.supabaseUrl ? 'provided' : 'from-vault',
      analysis: typed.includeAnalysis || 'all',
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

      // Determinar quais análises coletar
      const analysisToCollect = this.normalizeAnalysis(
        typed.includeAnalysis || ['all']
      );

      this.logger.debug('Collecting disk usage metrics', {
        components: analysisToCollect,
      });

      // Coletar dados em paralelo
      const [summary, tables, indexes, objects, prediction] = await Promise.all([
        this.collectDiskSummary(url, key),
        analysisToCollect.includes('tables')
          ? this.collectTableDiskUsage(url, key, typed.topTablesCount || 10)
          : Promise.resolve([]),
        analysisToCollect.includes('indexes')
          ? this.collectIndexDiskUsage(url, key, typed.topIndexesCount || 10)
          : Promise.resolve([]),
        analysisToCollect.includes('objects')
          ? this.collectLargeObjects(url, key, thresholds.largeObjectMb)
          : Promise.resolve([]),
        analysisToCollect.includes('prediction')
          ? this.predictCapacityIssues()
          : Promise.resolve(this.getDefaultCapacityPrediction()),
      ]);

      // Detectar alertas
      const alerts = this.detectAlerts(summary, tables, objects, prediction, thresholds);

      // Gerar recomendações
      const recommendations = this.generateRecommendations(
        summary,
        tables,
        objects,
        alerts,
        thresholds
      );

      const duration = Date.now() - startTime;

      if (alerts.length > 0) {
        this.logger.warn('Disk usage alerts detected', {
          alertCount: alerts.length,
          criticalCount: alerts.filter((a) => a.level === 'critical').length,
          alerts: alerts.map((a) => ({
            level: a.level,
            component: a.affected_component,
            message: a.message,
          })),
        });
      } else {
        this.logger.info('Disk usage is healthy', {
          usagePercent: summary.usage_percent.toFixed(2),
        });
      }

      return {
        success: true,
        data: {
          summary,
          topTables: tables,
          topIndexes: indexes,
          largeObjects: objects,
          prediction,
          alerts,
          recommendations,
          timestamp: new Date().toISOString(),
          checkDuration: duration,
        },
      };
    } catch (error: any) {
      this.logger.error('Disk Usage Monitor failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Coleta resumo de uso de disco (mock)
   */
  private async collectDiskSummary(
    _url: string,
    _key: string
  ): Promise<DiskUsageSummary> {
    this.logger.debug('Collecting disk summary');

    // Mock data para prototipagem
    const total_size_gb = 100;
    const used_size_gb = Math.floor(Math.random() * 70) + 20; // 20-90 GB
    const usage_percent = (used_size_gb / total_size_gb) * 100;

    return {
      total_size_gb,
      used_size_gb,
      free_size_gb: total_size_gb - used_size_gb,
      usage_percent,
      database_size_gb: used_size_gb * 0.85,
      unlogged_tables_size_gb: used_size_gb * 0.1,
      external_objects_size_gb: used_size_gb * 0.05,
    };
  }

  /**
   * Coleta uso de disco por tabela (mock)
   */
  private async collectTableDiskUsage(
    _url: string,
    _key: string,
    topCount: number
  ): Promise<TableDiskUsage[]> {
    this.logger.debug('Collecting table disk usage', { topCount });

    // Mock data para prototipagem
    const tables: TableDiskUsage[] = [];
    const schemas = ['public', 'auth', 'storage'];

    for (let i = 0; i < topCount; i++) {
      const schema = schemas[Math.floor(Math.random() * schemas.length)];
      const size_mb = Math.floor(Math.random() * 5000) + 100; // 100-5100 MB
      const rows = Math.floor(Math.random() * 10000000) + 1000;

      tables.push({
        schema,
        table: `table_${i + 1}`,
        size_mb,
        size_bytes: size_mb * 1024 * 1024,
        rows,
        avg_row_size_bytes: Math.floor((size_mb * 1024 * 1024) / rows),
        percentage_of_total: Math.random() * 10 + 1,
      });
    }

    // Ordenar por tamanho decrescente
    return tables.sort((a, b) => b.size_mb - a.size_mb);
  }

  /**
   * Coleta uso de disco por índice (mock)
   */
  private async collectIndexDiskUsage(
    _url: string,
    _key: string,
    topCount: number
  ): Promise<IndexDiskUsage[]> {
    this.logger.debug('Collecting index disk usage', { topCount });

    // Mock data para prototipagem
    const indexes: IndexDiskUsage[] = [];
    const schemas = ['public', 'auth'];

    for (let i = 0; i < topCount; i++) {
      const schema = schemas[Math.floor(Math.random() * schemas.length)];
      const size_mb = Math.floor(Math.random() * 500) + 10; // 10-510 MB

      indexes.push({
        schema,
        table: `table_${i + 1}`,
        index_name: `idx_table_${i + 1}_col`,
        size_mb,
        size_bytes: size_mb * 1024 * 1024,
      });
    }

    // Ordenar por tamanho decrescente
    return indexes.sort((a, b) => b.size_mb - a.size_mb);
  }

  /**
   * Coleta large objects (mock)
   */
  private async collectLargeObjects(
    _url: string,
    _key: string,
    thresholdMb: number
  ): Promise<LargeObject[]> {
    this.logger.debug('Collecting large objects', { thresholdMb });

    // Mock data para prototipagem
    const objects: LargeObject[] = [];
    const count = Math.floor(Math.random() * 5) + 1; // 1-5 large objects

    for (let i = 0; i < count; i++) {
      const size_mb = Math.floor(Math.random() * 500) + thresholdMb;

      objects.push({
        oid: `${10000 + i}`,
        size_mb,
        size_bytes: size_mb * 1024 * 1024,
        owner: 'postgres',
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        last_modified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return objects.sort((a, b) => b.size_mb - a.size_mb);
  }

  /**
   * Prediz problemas de capacidade (mock)
   */
  private async predictCapacityIssues(): Promise<CapacityPrediction> {
    this.logger.debug('Predicting capacity issues');

    // Mock data para prototipagem
    const current_usage_percent = Math.floor(Math.random() * 70) + 20; // 20-90%
    const daily_growth_mb = Math.floor(Math.random() * 100) + 10; // 10-110 MB/dia
    const monthly_growth_mb = daily_growth_mb * 30;

    let projected_full_date: string | null = null;
    let days_until_full: number | null = null;
    let days_until_critical: number | null = null;

    if (daily_growth_mb > 0 && current_usage_percent < 100) {
      const days_to_full = Math.ceil(
        ((100 - current_usage_percent) / 100) * (365 * 1000) / daily_growth_mb
      );
      const days_to_critical = Math.ceil(
        ((95 - current_usage_percent) / 100) * (365 * 1000) / daily_growth_mb
      );

      if (days_to_full > 0) {
        const fullDate = new Date();
        fullDate.setDate(fullDate.getDate() + days_to_full);
        projected_full_date = fullDate.toISOString().split('T')[0];
        days_until_full = days_to_full;
      }

      if (days_to_critical > 0) {
        days_until_critical = days_to_critical;
      }
    }

    return {
      current_usage_percent,
      daily_growth_mb: Math.round(daily_growth_mb * 100) / 100,
      weekly_growth_mb: Math.round(daily_growth_mb * 7 * 100) / 100,
      monthly_growth_mb: Math.round(monthly_growth_mb * 100) / 100,
      projected_full_date,
      days_until_critical,
      days_until_full,
      trend: daily_growth_mb > 50 ? 'increasing' : daily_growth_mb > 20 ? 'stable' : 'decreasing',
    };
  }

  /**
   * Detecta alertas de disco
   */
  private detectAlerts(
    summary: DiskUsageSummary,
    tables: TableDiskUsage[],
    objects: LargeObject[],
    prediction: CapacityPrediction,
    thresholds: {
      criticalUsagePercent: number;
      warningUsagePercent: number;
      largeTableMb: number;
      largeObjectMb: number;
    }
  ): DiskAlert[] {
    const alerts: DiskAlert[] = [];
    const timestamp = new Date().toISOString();

    // Verificar uso crítico de disco
    if (summary.usage_percent > thresholds.criticalUsagePercent) {
      alerts.push({
        level: 'critical',
        message: `Critical disk usage: ${summary.usage_percent.toFixed(1)}%`,
        affected_component: 'database',
        metric_value: summary.usage_percent,
        threshold: thresholds.criticalUsagePercent,
        timestamp,
      });
    } else if (summary.usage_percent > thresholds.warningUsagePercent) {
      alerts.push({
        level: 'warning',
        message: `High disk usage: ${summary.usage_percent.toFixed(1)}%`,
        affected_component: 'database',
        metric_value: summary.usage_percent,
        threshold: thresholds.warningUsagePercent,
        timestamp,
      });
    }

    // Verificar tabelas grandes
    const largeTables = tables.filter((t) => t.size_mb > thresholds.largeTableMb);
    if (largeTables.length > 0) {
      const largestTable = largeTables[0];
      alerts.push({
        level: 'info',
        message: `Large table detected: ${largestTable.schema}.${largestTable.table} (${largestTable.size_mb}MB)`,
        affected_component: 'table',
        metric_value: largestTable.size_mb,
        threshold: thresholds.largeTableMb,
        timestamp,
      });
    }

    // Verificar large objects
    const largeLargeObjects = objects.filter((o) => o.size_mb > thresholds.largeObjectMb);
    if (largeLargeObjects.length > 0) {
      alerts.push({
        level: 'info',
        message: `Large object detected: OID ${largeLargeObjects[0].oid} (${largeLargeObjects[0].size_mb}MB)`,
        affected_component: 'large_object',
        metric_value: largeLargeObjects[0].size_mb,
        threshold: thresholds.largeObjectMb,
        timestamp,
      });
    }

    // Verificar predição de capacidade
    if (prediction.days_until_critical && prediction.days_until_critical < 30) {
      alerts.push({
        level: 'warning',
        message: `Disk will be critical in ${prediction.days_until_critical} days at current growth rate`,
        affected_component: 'capacity',
        metric_value: prediction.days_until_critical,
        timestamp,
      });
    }

    if (prediction.trend === 'increasing' && prediction.days_until_full && prediction.days_until_full < 90) {
      alerts.push({
        level: 'warning',
        message: `Disk capacity will be exceeded in ${prediction.days_until_full} days at current growth rate`,
        affected_component: 'capacity',
        metric_value: prediction.days_until_full,
        timestamp,
      });
    }

    return alerts;
  }

  /**
   * Gera recomendações de limpeza
   */
  private generateRecommendations(
    summary: DiskUsageSummary,
    tables: TableDiskUsage[],
    objects: LargeObject[],
    alerts: DiskAlert[],
    thresholds: {
      criticalUsagePercent: number;
      warningUsagePercent: number;
      largeTableMb: number;
      largeObjectMb: number;
    }
  ): CleanupRecommendation[] {
    const recommendations: CleanupRecommendation[] = [];

    // Recomendar limpeza de tabelas grandes se uso está alto
    if (summary.usage_percent > thresholds.warningUsagePercent) {
      const largeTables = tables.filter((t) => t.size_mb > thresholds.largeTableMb);

      for (const table of largeTables.slice(0, 3)) {
        recommendations.push({
          priority: summary.usage_percent > thresholds.criticalUsagePercent ? 'critical' : 'high',
          table: `${table.schema}.${table.table}`,
          action: `Archive or delete old records from ${table.schema}.${table.table}`,
          estimated_space_mb: Math.floor(table.size_mb * 0.3), // Estimar 30% de limpeza
          reason: `Large table consuming ${table.size_mb}MB. Archiving old data can free up space.`,
        });
      }
    }

    // Recomendar limpeza de large objects
    if (objects.length > 0) {
      for (const obj of objects.slice(0, 2)) {
        recommendations.push({
          priority: 'medium',
          action: `Review and cleanup large object ${obj.oid}`,
          estimated_space_mb: Math.floor(obj.size_mb * 0.8),
          reason: `Large object ${obj.oid} consuming ${obj.size_mb}MB. Consider if still needed.`,
        });
      }
    }

    // Recomendar VACUUM e ANALYZE
    if (tables.length > 0 && summary.usage_percent > 70) {
      recommendations.push({
        priority: 'medium',
        action: 'Run VACUUM ANALYZE on public schema',
        estimated_space_mb: Math.floor(summary.used_size_gb * 1024 * 0.05),
        reason: 'VACUUM can reclaim space from deleted rows and update table statistics.',
      });
    }

    // Recomendar limpeza de índices não utilizados
    if (summary.usage_percent > thresholds.warningUsagePercent) {
      recommendations.push({
        priority: 'low',
        action: 'Review and drop unused indexes',
        estimated_space_mb: 50,
        reason: 'Unused indexes consume disk space without providing performance benefits.',
      });
    }

    // Ordenar por prioridade
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  /**
   * Normaliza lista de análises a coletar
   */
  private normalizeAnalysis(
    includeAnalysis: ('tables' | 'indexes' | 'objects' | 'prediction' | 'recommendations' | 'all')[]
  ): ('tables' | 'indexes' | 'objects' | 'prediction')[] {
    if (includeAnalysis.includes('all')) {
      return ['tables', 'indexes', 'objects', 'prediction'];
    }

    return includeAnalysis.filter(
      (a) => a !== 'all' && a !== 'recommendations'
    ) as ('tables' | 'indexes' | 'objects' | 'prediction')[];
  }

  /**
   * Retorna predição de capacidade padrão
   */
  private getDefaultCapacityPrediction(): CapacityPrediction {
    return {
      current_usage_percent: 0,
      daily_growth_mb: 0,
      weekly_growth_mb: 0,
      monthly_growth_mb: 0,
      projected_full_date: null,
      days_until_critical: null,
      days_until_full: null,
      trend: 'stable',
    };
  }

  /**
   * Método auxiliar: obter snapshot rápido de uso de disco
   */
  async quickDiskCheck(params: SkillInput): Promise<number> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.summary.usage_percent;
    }
    return 0;
  }

  /**
   * Método auxiliar: verificar se há alertas críticos de disco
   */
  async hasCriticalDiskAlerts(params: SkillInput): Promise<boolean> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.alerts.some((a) => a.level === 'critical');
    }
    return false;
  }

  /**
   * Método auxiliar: obter tabelas maiores
   */
  async getLargestTables(params: SkillInput, limit: number = 10): Promise<TableDiskUsage[]> {
    const typed = params as DiskMonitorParams;
    const result = await this.execute({
      ...params,
      includeAnalysis: ['tables'],
      topTablesCount: limit,
    });

    if (result.success && result.data) {
      return result.data.topTables;
    }
    return [];
  }

  /**
   * Método auxiliar: obter recomendações de limpeza
   */
  async getCleanupPlan(params: SkillInput): Promise<CleanupRecommendation[]> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.recommendations;
    }
    return [];
  }
}
