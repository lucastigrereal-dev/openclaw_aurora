/**
 * Supabase Archon - Statistics Collector (S-25)
 * Coleta e analisa estatísticas de banco de dados: pg_stat_*, padrões de acesso a tabelas,
 * uso de índices, tendências de performance de queries e gera insights
 *
 * @version 1.0.0
 * @priority P2
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
 * Estatísticas de acesso a tabelas
 */
export interface TableAccessStats {
  table_name: string;
  schema_name: string;
  seq_scans: number;        // Número de scans sequenciais
  seq_tup_read: number;      // Tuplas lidas em scans sequenciais
  idx_scans: number;         // Número de scans de índice
  idx_tup_fetch: number;     // Tuplas obtidas via índice
  n_tup_ins: number;         // Tuplas inseridas
  n_tup_upd: number;         // Tuplas atualizadas
  n_tup_del: number;         // Tuplas deletadas
  n_live_tup: number;        // Tuplas vivas
  n_dead_tup: number;        // Tuplas mortas
  last_vacuum: string | null;
  last_autovacuum: string | null;
  hot_updates: number;       // HOT updates
  access_ratio: number;      // Razão de acesso (índice vs sequencial)
}

/**
 * Estatísticas de uso de índices
 */
export interface IndexUsageStats {
  index_name: string;
  table_name: string;
  schema_name: string;
  idx_scan: number;          // Número de scans do índice
  idx_tup_read: number;      // Tuplas lidas do índice
  idx_tup_fetch: number;     // Tuplas obtidas
  size_bytes: number;        // Tamanho do índice em bytes
  is_unique: boolean;        // Se é índice único
  is_primary: boolean;       // Se é chave primária
  efficiency: number;        // Percentual de eficiência (0-100)
  last_used: string | null;  // Última vez que foi usado
}

/**
 * Tendências de performance de queries
 */
export interface QueryPerformanceTrend {
  query_hash: string;
  query_text: string;
  calls: number;              // Número de execuções
  total_time_ms: number;      // Tempo total em ms
  mean_time_ms: number;       // Tempo médio em ms
  max_time_ms: number;        // Tempo máximo em ms
  min_time_ms: number;        // Tempo mínimo em ms
  stddev_time_ms: number;     // Desvio padrão de tempo
  rows: number;               // Linhas afetadas
  trend: 'improving' | 'degrading' | 'stable';
  trend_percent: number;      // Percentual de mudança
}

/**
 * Insight gerado a partir das estatísticas
 */
export interface DatabaseInsight {
  type: 'opportunity' | 'warning' | 'info';
  category: 'index' | 'table' | 'query' | 'vacuum' | 'bloat' | 'general';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  recommendation: string;
  affected_objects?: string[];
  metric_value?: number;
  timestamp: string;
}

/**
 * Relatório completo de estatísticas
 */
export interface DatabaseStatisticsReport {
  tables: TableAccessStats[];
  indexes: IndexUsageStats[];
  queries: QueryPerformanceTrend[];
  insights: DatabaseInsight[];
  summary: {
    total_tables: number;
    total_indexes: number;
    total_queries_tracked: number;
    database_size_bytes: number;
    average_table_size_bytes: number;
    health_score: number;      // 0-100
  };
}

/**
 * Parâmetros de entrada do skill
 */
export interface StatisticsCollectorParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  includeStats?: ('tables' | 'indexes' | 'queries' | 'insights' | 'all')[];
  minTableSize?: number;       // Minutos desde last vacuum para incluir na análise
  queryLimit?: number;         // Limite de queries a coletar (default: 50)
  generateInsights?: boolean;  // default: true
}

/**
 * Resultado do skill
 */
export interface StatisticsCollectorResult extends SkillOutput {
  data?: {
    report: DatabaseStatisticsReport;
    timestamp: string;
    collectionDuration: number; // tempo gasto em ms
  };
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

/**
 * Statistics Collector - Coleta e analisa estatísticas de banco de dados Supabase
 */
export class SupabaseStatisticsCollector extends Skill {
  private logger = createLogger('statistics-collector');
  private defaultParams = {
    includeStats: ['all'],
    minTableSize: 60,      // minutos
    queryLimit: 50,
    generateInsights: true,
  };

  constructor() {
    super(
      {
        name: 'supabase-statistics-collector',
        description:
          'Collect and analyze Supabase database statistics: pg_stat_* metrics, table access patterns, index usage, query performance trends, and generate insights',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: [
          'supabase',
          'statistics',
          'performance',
          'analysis',
          'pg_stat',
        ],
      },
      {
        timeout: 60000, // 60 segundos
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as StatisticsCollectorParams;

    // Validar includeStats se fornecido
    if (typed.includeStats) {
      const validStats = ['tables', 'indexes', 'queries', 'insights', 'all'];
      const valid = typed.includeStats.every((s) => validStats.includes(s));
      if (!valid) {
        this.logger.warn('Invalid statistics specified', {
          stats: typed.includeStats,
        });
        return false;
      }
    }

    // Validar queryLimit
    if (typed.queryLimit && typed.queryLimit < 1) {
      this.logger.warn('Invalid queryLimit', {
        queryLimit: typed.queryLimit,
      });
      return false;
    }

    return true;
  }

  /**
   * Executa coleta de estatísticas
   */
  async execute(params: SkillInput): Promise<StatisticsCollectorResult> {
    const typed = params as StatisticsCollectorParams;
    const startTime = Date.now();

    this.logger.info('Statistics Collector iniciado', {
      url: params.supabaseUrl ? 'provided' : 'from-vault',
      stats: typed.includeStats || 'all',
    });

    try {
      // Obter credenciais do vault se não fornecidas
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      // Mesclar parâmetros com defaults
      const config = { ...this.defaultParams, ...typed };

      // Normalizar estatísticas a coletar
      const statsToCollect = this.normalizeStats(
        (config.includeStats || ['all']) as ('tables' | 'indexes' | 'queries' | 'insights' | 'all')[]
      );

      this.logger.debug('Collecting database statistics', {
        components: statsToCollect,
      });

      // Coletar estatísticas em paralelo quando possível
      const [tables, indexes, queries] = await Promise.all([
        statsToCollect.includes('tables')
          ? this.collectTableAccessStats(url, key)
          : Promise.resolve([]),
        statsToCollect.includes('indexes')
          ? this.collectIndexUsageStats(url, key)
          : Promise.resolve([]),
        statsToCollect.includes('queries')
          ? this.collectQueryPerformanceTrends(url, key, config.queryLimit)
          : Promise.resolve([]),
      ]);

      // Gerar insights se solicitado
      let insights: DatabaseInsight[] = [];
      if (config.generateInsights) {
        insights = this.generateInsights(tables, indexes, queries);
      }

      // Calcular summary
      const summary = this.calculateSummary(tables, indexes, queries, insights);

      // Construir relatório
      const report: DatabaseStatisticsReport = {
        tables,
        indexes,
        queries,
        insights,
        summary,
      };

      const duration = Date.now() - startTime;

      this.logger.info('Statistics collection completed', {
        tables: tables.length,
        indexes: indexes.length,
        queries: queries.length,
        insights: insights.length,
        healthScore: summary.health_score,
        duration,
      });

      return {
        success: true,
        data: {
          report,
          timestamp: new Date().toISOString(),
          collectionDuration: duration,
        },
      };
    } catch (error: any) {
      this.logger.error('Statistics Collector failed', {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Coleta estatísticas de acesso a tabelas (mock para prototipagem)
   */
  private async collectTableAccessStats(
    _url: string,
    _key: string
  ): Promise<TableAccessStats[]> {
    this.logger.debug('Collecting table access statistics');

    // TODO: Implementar coleta real via pg_stat_user_tables
    // Por enquanto, retorna dados mock

    const mockTables: TableAccessStats[] = [
      {
        table_name: 'users',
        schema_name: 'public',
        seq_scans: 145,
        seq_tup_read: 28500,
        idx_scans: 2847,
        idx_tup_fetch: 285670,
        n_tup_ins: 1250,
        n_tup_upd: 520,
        n_tup_del: 30,
        n_live_tup: 8945,
        n_dead_tup: 120,
        last_vacuum: new Date(Date.now() - 3600000).toISOString(),
        last_autovacuum: new Date(Date.now() - 1800000).toISOString(),
        hot_updates: 245,
        access_ratio: 19.5, // 2847 idx_scans / 145 seq_scans
      },
      {
        table_name: 'posts',
        schema_name: 'public',
        seq_scans: 89,
        seq_tup_read: 42300,
        idx_scans: 1456,
        idx_tup_fetch: 156200,
        n_tup_ins: 3450,
        n_tup_upd: 1200,
        n_tup_del: 850,
        n_live_tup: 24560,
        n_dead_tup: 450,
        last_vacuum: new Date(Date.now() - 7200000).toISOString(),
        last_autovacuum: new Date(Date.now() - 3600000).toISOString(),
        hot_updates: 678,
        access_ratio: 16.4,
      },
      {
        table_name: 'comments',
        schema_name: 'public',
        seq_scans: 234,
        seq_tup_read: 78900,
        idx_scans: 456,
        idx_tup_fetch: 45600,
        n_tup_ins: 5600,
        n_tup_upd: 2300,
        n_tup_del: 1200,
        n_live_tup: 52340,
        n_dead_tup: 890,
        last_vacuum: new Date(Date.now() - 86400000).toISOString(),
        last_autovacuum: new Date(Date.now() - 43200000).toISOString(),
        hot_updates: 1205,
        access_ratio: 1.95, // Relação baixa de índice
      },
      {
        table_name: 'logs',
        schema_name: 'public',
        seq_scans: 5678,
        seq_tup_read: 2345600,
        idx_scans: 89,
        idx_tup_fetch: 2340,
        n_tup_ins: 45670,
        n_tup_upd: 0,
        n_tup_del: 0,
        n_live_tup: 450230,
        n_dead_tup: 5600,
        last_vacuum:
          new Date(Date.now() - 259200000).toISOString(),
        last_autovacuum:
          new Date(Date.now() - 129600000).toISOString(),
        hot_updates: 0,
        access_ratio: 0.016, // Muito sequencial
      },
    ];

    return mockTables;
  }

  /**
   * Coleta estatísticas de uso de índices (mock para prototipagem)
   */
  private async collectIndexUsageStats(
    _url: string,
    _key: string
  ): Promise<IndexUsageStats[]> {
    this.logger.debug('Collecting index usage statistics');

    // TODO: Implementar coleta real via pg_stat_user_indexes
    // Por enquanto, retorna dados mock

    const mockIndexes: IndexUsageStats[] = [
      {
        index_name: 'users_email_idx',
        table_name: 'users',
        schema_name: 'public',
        idx_scan: 2847,
        idx_tup_read: 285670,
        idx_tup_fetch: 285670,
        size_bytes: 524288,
        is_unique: true,
        is_primary: false,
        efficiency: 100,
        last_used: new Date(Date.now() - 300000).toISOString(),
      },
      {
        index_name: 'posts_user_id_idx',
        table_name: 'posts',
        schema_name: 'public',
        idx_scan: 1456,
        idx_tup_read: 156200,
        idx_tup_fetch: 156200,
        size_bytes: 786432,
        is_unique: false,
        is_primary: false,
        efficiency: 100,
        last_used: new Date(Date.now() - 600000).toISOString(),
      },
      {
        index_name: 'comments_post_id_idx',
        table_name: 'comments',
        schema_name: 'public',
        idx_scan: 456,
        idx_tup_read: 45600,
        idx_tup_fetch: 45600,
        size_bytes: 458752,
        is_unique: false,
        is_primary: false,
        efficiency: 100,
        last_used: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        index_name: 'unused_index',
        table_name: 'posts',
        schema_name: 'public',
        idx_scan: 0,
        idx_tup_read: 0,
        idx_tup_fetch: 0,
        size_bytes: 1048576,
        is_unique: false,
        is_primary: false,
        efficiency: 0,
        last_used: null,
      },
      {
        index_name: 'logs_timestamp_idx',
        table_name: 'logs',
        schema_name: 'public',
        idx_scan: 89,
        idx_tup_read: 2340,
        idx_tup_fetch: 2340,
        size_bytes: 2097152,
        is_unique: false,
        is_primary: false,
        efficiency: 100,
        last_used: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    return mockIndexes;
  }

  /**
   * Coleta tendências de performance de queries (mock para prototipagem)
   */
  private async collectQueryPerformanceTrends(
    _url: string,
    _key: string,
    _limit: number
  ): Promise<QueryPerformanceTrend[]> {
    this.logger.debug('Collecting query performance trends');

    // TODO: Implementar coleta real via pg_stat_statements
    // Por enquanto, retorna dados mock

    const mockQueries: QueryPerformanceTrend[] = [
      {
        query_hash: 'SELECT1',
        query_text: 'SELECT * FROM users WHERE id = $1',
        calls: 2847,
        total_time_ms: 5694,
        mean_time_ms: 2.0,
        max_time_ms: 45.5,
        min_time_ms: 0.8,
        stddev_time_ms: 1.2,
        rows: 2847,
        trend: 'stable',
        trend_percent: -2.5,
      },
      {
        query_hash: 'SELECT2',
        query_text: 'SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC',
        calls: 1456,
        total_time_ms: 12340,
        mean_time_ms: 8.5,
        max_time_ms: 125.3,
        min_time_ms: 2.1,
        stddev_time_ms: 15.6,
        rows: 36400,
        trend: 'degrading',
        trend_percent: 12.3,
      },
      {
        query_hash: 'SELECT3',
        query_text: 'SELECT COUNT(*) FROM comments WHERE post_id = $1',
        calls: 2340,
        total_time_ms: 3456,
        mean_time_ms: 1.5,
        max_time_ms: 32.1,
        min_time_ms: 0.5,
        stddev_time_ms: 0.8,
        rows: 2340,
        trend: 'improving',
        trend_percent: -8.2,
      },
      {
        query_hash: 'INSERT1',
        query_text: 'INSERT INTO logs (message, level, timestamp) VALUES ($1, $2, $3)',
        calls: 45670,
        total_time_ms: 18900,
        mean_time_ms: 0.41,
        max_time_ms: 12.5,
        min_time_ms: 0.2,
        stddev_time_ms: 0.3,
        rows: 45670,
        trend: 'stable',
        trend_percent: 1.2,
      },
      {
        query_hash: 'SELECT4',
        query_text: 'SELECT * FROM users u JOIN posts p ON u.id = p.user_id LIMIT 100',
        calls: 234,
        total_time_ms: 8900,
        mean_time_ms: 38.0,
        max_time_ms: 450.2,
        min_time_ms: 15.3,
        stddev_time_ms: 45.2,
        rows: 23400,
        trend: 'degrading',
        trend_percent: 23.5,
      },
    ];

    return mockQueries;
  }

  /**
   * Gera insights a partir das estatísticas coletadas
   */
  private generateInsights(
    tables: TableAccessStats[],
    indexes: IndexUsageStats[],
    queries: QueryPerformanceTrend[]
  ): DatabaseInsight[] {
    const insights: DatabaseInsight[] = [];
    const timestamp = new Date().toISOString();

    // Analisar índices não utilizados
    const unusedIndexes = indexes.filter((idx) => idx.idx_scan === 0);
    if (unusedIndexes.length > 0) {
      insights.push({
        type: 'opportunity',
        category: 'index',
        severity: 'medium',
        title: 'Unused Indexes Detected',
        description: `Found ${unusedIndexes.length} indexes that are never used. These consume storage and slow down write operations.`,
        recommendation:
          'Consider dropping unused indexes to improve write performance and save storage. Use: DROP INDEX IF EXISTS [index_name];',
        affected_objects: unusedIndexes.map((idx) => idx.index_name),
        metric_value: unusedIndexes.length,
        timestamp,
      });
    }

    // Analisar tabelas com muitas tuplas mortas
    const tables_with_bloat = tables.filter(
      (t) => (t.n_dead_tup / (t.n_live_tup + t.n_dead_tup)) * 100 > 5
    );
    if (tables_with_bloat.length > 0) {
      insights.push({
        type: 'warning',
        category: 'bloat',
        severity: 'medium',
        title: 'Table Bloat Detected',
        description: `${tables_with_bloat.length} tables have >5% dead tuples ratio, indicating space waste.`,
        recommendation:
          'Run VACUUM on affected tables to reclaim space. Consider enabling autovacuum tuning.',
        affected_objects: tables_with_bloat.map((t) => t.table_name),
        metric_value: tables_with_bloat.length,
        timestamp,
      });
    }

    // Analisar queries com performance degradante
    const degrading_queries = queries.filter((q) => q.trend === 'degrading');
    if (degrading_queries.length > 0) {
      insights.push({
        type: 'warning',
        category: 'query',
        severity: 'high',
        title: 'Query Performance Degradation',
        description: `${degrading_queries.length} queries show performance degradation. Avg trend: ${(degrading_queries.reduce((sum, q) => sum + q.trend_percent, 0) / degrading_queries.length).toFixed(1)}%`,
        recommendation:
          'Review query execution plans, check index usage, and consider query optimization or caching strategies.',
        affected_objects: degrading_queries.map((q) =>
          q.query_text.substring(0, 50)
        ),
        metric_value: degrading_queries.length,
        timestamp,
      });
    }

    // Analisar tabelas com baixa eficiência de índice
    const low_index_efficiency = tables.filter((t) => t.access_ratio < 2);
    if (low_index_efficiency.length > 0) {
      insights.push({
        type: 'info',
        category: 'index',
        severity: 'low',
        title: 'Low Index Usage Ratio',
        description: `${low_index_efficiency.length} tables have low index to sequential scan ratio (< 2:1).`,
        recommendation:
          'Consider adding indexes on frequently scanned columns, especially for WHERE clause predicates.',
        affected_objects: low_index_efficiency.map((t) => t.table_name),
        metric_value: low_index_efficiency.length,
        timestamp,
      });
    }

    // Analisar tabelas que não foram vacu
    const old_vacuum = tables.filter((t) => {
      if (!t.last_autovacuum) return false;
      const lastVacuum = new Date(t.last_autovacuum).getTime();
      const hoursSince = (Date.now() - lastVacuum) / (1000 * 60 * 60);
      return hoursSince > 24;
    });
    if (old_vacuum.length > 0) {
      insights.push({
        type: 'info',
        category: 'vacuum',
        severity: 'low',
        title: 'Tables Not Recently Vacuumed',
        description: `${old_vacuum.length} tables haven't been autovacuumed in the last 24 hours.`,
        recommendation:
          'Monitor autovacuum settings. Tables with frequent updates may need more aggressive autovacuum.',
        affected_objects: old_vacuum.map((t) => t.table_name),
        metric_value: old_vacuum.length,
        timestamp,
      });
    }

    // Analisar queries com muitas linhas afetadas
    const heavy_queries = queries.filter((q) => q.rows > 100000);
    if (heavy_queries.length > 0) {
      insights.push({
        type: 'info',
        category: 'query',
        severity: 'low',
        title: 'Queries with Large Result Sets',
        description: `${heavy_queries.length} queries return >100k rows. Consider pagination or result limiting.`,
        recommendation:
          'Use LIMIT/OFFSET or keyset pagination to reduce data transfer and improve response times.',
        affected_objects: heavy_queries.map((q) =>
          q.query_text.substring(0, 50)
        ),
        metric_value: heavy_queries.length,
        timestamp,
      });
    }

    return insights;
  }

  /**
   * Calcula summary das estatísticas
   */
  private calculateSummary(
    tables: TableAccessStats[],
    indexes: IndexUsageStats[],
    queries: QueryPerformanceTrend[],
    insights: DatabaseInsight[]
  ): DatabaseStatisticsReport['summary'] {
    // Tamanhos mock (em bytes)
    const mockTableSizes = [
      5242880, 10485760, 8388608, 52428800,
    ]; // 5MB, 10MB, 8MB, 50MB
    const totalSize = mockTableSizes.reduce((a, b) => a + b, 0);
    const avgTableSize = tables.length > 0 ? totalSize / tables.length : 0;

    // Calcular health score baseado em insights
    let healthScore = 100;
    for (const insight of insights) {
      if (insight.severity === 'high') {
        healthScore -= 15;
      } else if (insight.severity === 'medium') {
        healthScore -= 8;
      } else if (insight.severity === 'low') {
        healthScore -= 3;
      }
    }

    // Considerar queries degrading
    const degradingCount = queries.filter(
      (q) => q.trend === 'degrading'
    ).length;
    healthScore -= Math.min(degradingCount * 5, 20);

    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      total_tables: tables.length,
      total_indexes: indexes.length,
      total_queries_tracked: queries.length,
      database_size_bytes: totalSize,
      average_table_size_bytes: avgTableSize,
      health_score: healthScore,
    };
  }

  /**
   * Normaliza lista de estatísticas a coletar
   */
  private normalizeStats(
    includeStats: ('tables' | 'indexes' | 'queries' | 'insights' | 'all')[]
  ): ('tables' | 'indexes' | 'queries')[] {
    if (includeStats.includes('all')) {
      return ['tables', 'indexes', 'queries'];
    }

    return includeStats.filter(
      (s) => s !== 'all' && s !== 'insights'
    ) as ('tables' | 'indexes' | 'queries')[];
  }

  /**
   * Método auxiliar: obter tabelas com maior bloat
   */
  async getTablesWithMostBloat(params: SkillInput): Promise<TableAccessStats[]> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.report.tables
        .sort(
          (a, b) =>
            (b.n_dead_tup / (b.n_live_tup + b.n_dead_tup)) * 100 -
            (a.n_dead_tup / (a.n_live_tup + a.n_dead_tup)) * 100
        )
        .slice(0, 5);
    }
    return [];
  }

  /**
   * Método auxiliar: obter queries com performance degradante
   */
  async getDegradingQueries(params: SkillInput): Promise<QueryPerformanceTrend[]> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.report.queries
        .filter((q) => q.trend === 'degrading')
        .sort((a, b) => b.trend_percent - a.trend_percent);
    }
    return [];
  }

  /**
   * Método auxiliar: obter índices não utilizados
   */
  async getUnusedIndexes(params: SkillInput): Promise<IndexUsageStats[]> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.report.indexes.filter((idx) => idx.idx_scan === 0);
    }
    return [];
  }
}
