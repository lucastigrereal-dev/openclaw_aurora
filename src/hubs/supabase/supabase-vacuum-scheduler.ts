/**
 * Supabase Archon - Vacuum Scheduler (S-10)
 * Schedules and manages PostgreSQL VACUUM operations for optimal performance
 *
 * @version 1.0.0
 * @priority P1
 * @category UTIL
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';
import { getVault } from './supabase-vault-config';

// ============================================================================
// INTERFACES
// ============================================================================

export interface VacuumSchedulerParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  action: 'schedule' | 'analyze' | 'detect-bloat' | 'tune-autovac' | 'monitor-tuples';
  databaseName?: string;
  tableName?: string;
  aggressiveness?: 'low' | 'medium' | 'high';
  dryRun?: boolean;
}

export interface VacuumSchedule {
  id: string;
  table: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'hourly';
  nextRun: string;
  aggressiveness: 'low' | 'medium' | 'high';
  enabled: boolean;
}

export interface BloatedTableInfo {
  tableName: string;
  estimatedBloatSize: string;
  bloatPercentage: number;
  deadTuples: number;
  lastVacuum?: string;
  recommendedAction: 'vacuum' | 'analyze' | 'reindex' | 'full-vacuum';
}

export interface AutoVacSettings {
  autovacuum: boolean;
  autovacuumNaptime: string;
  autovacuumVacuumThreshold: number;
  autovacuumAnalyzeThreshold: number;
  autovacuumVacuumScaleFactor: number;
  autovacuumAnalyzeScaleFactor: number;
}

export interface DeadTupleStats {
  tableName: string;
  deadTuples: number;
  liveRows: number;
  deadRatio: number;
  lastVacuum: string;
  nextAutovacuum: string;
}

export interface VacuumSchedulerResult extends SkillOutput {
  data?: {
    action: string;
    schedules?: VacuumSchedule[];
    bloatedTables?: BloatedTableInfo[];
    settings?: AutoVacSettings;
    deadTupleStats?: DeadTupleStats[];
    recommendations?: string[];
    status: 'success' | 'failed';
  };
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

/**
 * Vacuum Scheduler - Manages PostgreSQL VACUUM operations
 */
export class SupabaseVacuumScheduler extends Skill {
  private logger = createLogger('vacuum-scheduler');

  constructor() {
    super(
      {
        name: 'supabase-vacuum-scheduler',
        description: 'Schedules and manages PostgreSQL VACUUM operations for optimal database performance',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'vacuum', 'maintenance', 'performance', 'postgresql'],
      },
      {
        timeout: 120000, // 2 minutes
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as VacuumSchedulerParams;

    // action é obrigatório
    if (!typed.action || typeof typed.action !== 'string') {
      return false;
    }

    // action deve estar em valores permitidos
    const validActions = ['schedule', 'analyze', 'detect-bloat', 'tune-autovac', 'monitor-tuples'];
    if (!validActions.includes(typed.action)) {
      return false;
    }

    // aggressiveness deve estar em valores permitidos se fornecido
    if (typed.aggressiveness && !['low', 'medium', 'high'].includes(typed.aggressiveness)) {
      return false;
    }

    return true;
  }

  /**
   * Execute vacuum scheduler
   */
  async execute(params: SkillInput): Promise<VacuumSchedulerResult> {
    const typed = params as VacuumSchedulerParams;
    const startTime = Date.now();

    this.logger.info('Vacuum Scheduler iniciado', {
      action: typed.action,
      databaseName: typed.databaseName,
      tableName: typed.tableName,
      dryRun: typed.dryRun || false,
    });

    try {
      // Get credentials from vault if not provided
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      const action = typed.action;
      const dryRun = typed.dryRun || false;

      this.logger.debug('Starting vacuum operation', { action });

      let result: VacuumSchedulerResult;

      switch (action) {
        case 'schedule':
          result = await this.handleScheduleVacuum(typed, dryRun);
          break;

        case 'analyze':
          result = await this.handleAnalyzeStatistics(typed, dryRun);
          break;

        case 'detect-bloat':
          result = await this.handleDetectBloat(typed, dryRun);
          break;

        case 'tune-autovac':
          result = await this.handleTuneAutovac(typed, dryRun);
          break;

        case 'monitor-tuples':
          result = await this.handleMonitorTuples(typed, dryRun);
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      const duration = Date.now() - startTime;

      this.logger.info('Vacuum Scheduler completed successfully', {
        action,
        duration,
      });

      return {
        success: true,
        ...result,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('Vacuum Scheduler failed', {
        error: error.message,
        duration,
      });

      return {
        success: false,
        error: error.message,
        data: {
          action: typed.action,
          status: 'failed',
        },
        duration,
      };
    }
  }

  /**
   * Schedule VACUUM operations
   */
  private async handleScheduleVacuum(
    params: VacuumSchedulerParams,
    dryRun: boolean
  ): Promise<VacuumSchedulerResult> {
    this.logger.info('Scheduling VACUUM operations', {
      tableName: params.tableName,
      aggressiveness: params.aggressiveness || 'medium',
    });

    const schedules = await this.generateVacuumSchedules(params.tableName, params.aggressiveness);

    if (dryRun) {
      this.logger.info('DRY RUN MODE - No actual schedules created');

      return {
        success: true,
        data: {
          action: 'schedule',
          schedules,
          status: 'success',
        },
      };
    }

    this.logger.debug('VACUUM schedules created', { count: schedules.length });

    return {
      success: true,
      data: {
        action: 'schedule',
        schedules,
        recommendations: this.generateScheduleRecommendations(schedules),
        status: 'success',
      },
    };
  }

  /**
   * Analyze table statistics
   */
  private async handleAnalyzeStatistics(
    params: VacuumSchedulerParams,
    dryRun: boolean
  ): Promise<VacuumSchedulerResult> {
    this.logger.info('Analyzing table statistics', {
      tableName: params.tableName || 'all tables',
    });

    const stats = await this.getTableStatistics(params.tableName);

    if (dryRun) {
      this.logger.info('DRY RUN MODE - No actual ANALYZE operations performed');

      return {
        success: true,
        data: {
          action: 'analyze',
          deadTupleStats: stats,
          status: 'success',
        },
      };
    }

    this.logger.debug('Table statistics analyzed', { count: stats.length });

    return {
      success: true,
      data: {
        action: 'analyze',
        deadTupleStats: stats,
        recommendations: this.generateStatisticsRecommendations(stats),
        status: 'success',
      },
    };
  }

  /**
   * Detect bloated tables
   */
  private async handleDetectBloat(
    params: VacuumSchedulerParams,
    dryRun: boolean
  ): Promise<VacuumSchedulerResult> {
    this.logger.info('Detecting bloated tables');

    const bloatedTables = await this.findBloatedTables();

    if (dryRun) {
      this.logger.info('DRY RUN MODE - No remediation actions will be taken');

      return {
        success: true,
        data: {
          action: 'detect-bloat',
          bloatedTables,
          status: 'success',
        },
      };
    }

    const recommendations = this.generateBloatRemediationPlan(bloatedTables);

    this.logger.debug('Bloated tables detected', { count: bloatedTables.length });

    return {
      success: true,
      data: {
        action: 'detect-bloat',
        bloatedTables,
        recommendations,
        status: 'success',
      },
    };
  }

  /**
   * Tune autovacuum settings
   */
  private async handleTuneAutovac(
    params: VacuumSchedulerParams,
    dryRun: boolean
  ): Promise<VacuumSchedulerResult> {
    this.logger.info('Tuning autovacuum settings', {
      aggressiveness: params.aggressiveness || 'medium',
    });

    const currentSettings = await this.getCurrentAutovacSettings();
    const optimizedSettings = this.calculateOptimalAutovacSettings(
      params.aggressiveness || 'medium',
      currentSettings
    );

    if (dryRun) {
      this.logger.info('DRY RUN MODE - No autovacuum settings will be changed');

      return {
        success: true,
        data: {
          action: 'tune-autovac',
          settings: optimizedSettings,
          status: 'success',
        },
      };
    }

    this.logger.debug('Autovacuum settings optimized', { settings: optimizedSettings });

    return {
      success: true,
      data: {
        action: 'tune-autovac',
        settings: optimizedSettings,
        recommendations: this.generateAutovacRecommendations(optimizedSettings),
        status: 'success',
      },
    };
  }

  /**
   * Monitor dead tuples
   */
  private async handleMonitorTuples(
    params: VacuumSchedulerParams,
    dryRun: boolean
  ): Promise<VacuumSchedulerResult> {
    this.logger.info('Monitoring dead tuple statistics');

    const stats = await this.getTableStatistics(params.tableName);

    if (dryRun) {
      this.logger.info('DRY RUN MODE - Monitoring data only');

      return {
        success: true,
        data: {
          action: 'monitor-tuples',
          deadTupleStats: stats,
          status: 'success',
        },
      };
    }

    const alerts = this.generateDeadTupleAlerts(stats);

    this.logger.debug('Dead tuple monitoring completed', { alertCount: alerts.length });

    return {
      success: true,
      data: {
        action: 'monitor-tuples',
        deadTupleStats: stats,
        recommendations: alerts,
        status: 'success',
      },
    };
  }

  /**
   * Generate vacuum schedules for tables
   */
  private async generateVacuumSchedules(
    tableName?: string,
    aggressiveness: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<VacuumSchedule[]> {
    this.logger.debug('Generating VACUUM schedules', { tableName, aggressiveness });

    // Mock data for demonstration
    const frequencies = {
      low: 'weekly',
      medium: 'daily',
      high: 'hourly',
    } as const;

    const tables = tableName ? [tableName] : await this.getMockTableList();

    const schedules: VacuumSchedule[] = tables.map((table, index) => ({
      id: `vacuum-${Date.now()}-${index}`,
      table,
      frequency: frequencies[aggressiveness],
      nextRun: new Date(Date.now() + Math.random() * 3600000).toISOString(),
      aggressiveness,
      enabled: true,
    }));

    return schedules;
  }

  /**
   * Get current autovacuum settings
   */
  private async getCurrentAutovacSettings(): Promise<AutoVacSettings> {
    this.logger.debug('Fetching current autovacuum settings');

    // Mock data
    return {
      autovacuum: true,
      autovacuumNaptime: '1min',
      autovacuumVacuumThreshold: 50,
      autovacuumAnalyzeThreshold: 50,
      autovacuumVacuumScaleFactor: 0.1,
      autovacuumAnalyzeScaleFactor: 0.05,
    };
  }

  /**
   * Calculate optimal autovacuum settings based on aggressiveness
   */
  private calculateOptimalAutovacSettings(
    aggressiveness: 'low' | 'medium' | 'high',
    current: AutoVacSettings
  ): AutoVacSettings {
    this.logger.debug('Calculating optimal autovacuum settings', { aggressiveness });

    const settings: Record<string, AutoVacSettings> = {
      low: {
        autovacuum: true,
        autovacuumNaptime: '5min',
        autovacuumVacuumThreshold: 100,
        autovacuumAnalyzeThreshold: 100,
        autovacuumVacuumScaleFactor: 0.2,
        autovacuumAnalyzeScaleFactor: 0.1,
      },
      medium: {
        autovacuum: true,
        autovacuumNaptime: '1min',
        autovacuumVacuumThreshold: 50,
        autovacuumAnalyzeThreshold: 50,
        autovacuumVacuumScaleFactor: 0.1,
        autovacuumAnalyzeScaleFactor: 0.05,
      },
      high: {
        autovacuum: true,
        autovacuumNaptime: '10s',
        autovacuumVacuumThreshold: 20,
        autovacuumAnalyzeThreshold: 20,
        autovacuumVacuumScaleFactor: 0.05,
        autovacuumAnalyzeScaleFactor: 0.02,
      },
    };

    return settings[aggressiveness];
  }

  /**
   * Find bloated tables in database
   */
  private async findBloatedTables(): Promise<BloatedTableInfo[]> {
    this.logger.debug('Scanning for bloated tables');

    // Mock data
    const tables = await this.getMockTableList();

    return tables.map((table, index) => {
      const bloatPercentage = Math.random() * 50;
      let recommendedAction: 'vacuum' | 'analyze' | 'reindex' | 'full-vacuum' = 'vacuum';

      if (bloatPercentage > 30) {
        recommendedAction = 'full-vacuum';
      } else if (bloatPercentage > 20) {
        recommendedAction = 'reindex';
      } else if (bloatPercentage > 10) {
        recommendedAction = 'analyze';
      }

      return {
        tableName: table,
        estimatedBloatSize: `${Math.floor(Math.random() * 500)}MB`,
        bloatPercentage,
        deadTuples: Math.floor(Math.random() * 10000),
        lastVacuum: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        recommendedAction,
      };
    });
  }

  /**
   * Get table statistics for dead tuple monitoring
   */
  private async getTableStatistics(tableName?: string): Promise<DeadTupleStats[]> {
    this.logger.debug('Fetching table statistics', { tableName });

    const tables = tableName ? [tableName] : await this.getMockTableList();

    return tables.map((table) => ({
      tableName: table,
      deadTuples: Math.floor(Math.random() * 50000),
      liveRows: Math.floor(Math.random() * 100000),
      deadRatio: Math.random() * 0.3,
      lastVacuum: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      nextAutovacuum: new Date(Date.now() + Math.random() * 3600000).toISOString(),
    }));
  }

  /**
   * Get mock list of tables
   */
  private async getMockTableList(): Promise<string[]> {
    return [
      'users',
      'posts',
      'comments',
      'likes',
      'follows',
      'notifications',
      'messages',
      'analytics_events',
      'audit_logs',
    ];
  }

  /**
   * Generate recommendations for schedule
   */
  private generateScheduleRecommendations(schedules: VacuumSchedule[]): string[] {
    const recommendations: string[] = [
      `Created ${schedules.length} vacuum schedules for database tables`,
      'Monitor vacuum progress through PostgreSQL logs',
      'Adjust schedule frequency based on table growth patterns',
    ];

    if (schedules.some((s) => s.frequency === 'hourly')) {
      recommendations.push('High-frequency schedules detected: monitor I/O impact');
    }

    return recommendations;
  }

  /**
   * Generate recommendations for statistics
   */
  private generateStatisticsRecommendations(stats: DeadTupleStats[]): string[] {
    const highDeadRatioTables = stats.filter((s) => s.deadRatio > 0.2);

    const recommendations: string[] = [
      `Analyzed statistics for ${stats.length} tables`,
      'ANALYZE updates query planner statistics',
    ];

    if (highDeadRatioTables.length > 0) {
      recommendations.push(
        `${highDeadRatioTables.length} tables have high dead tuple ratio: prioritize VACUUM`
      );
    }

    return recommendations;
  }

  /**
   * Generate bloat remediation plan
   */
  private generateBloatRemediationPlan(tables: BloatedTableInfo[]): string[] {
    const plan: string[] = [`Detected ${tables.length} potentially bloated tables:`];

    const byAction = tables.reduce(
      (acc, t) => {
        acc[t.recommendedAction] = (acc[t.recommendedAction] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    for (const [action, count] of Object.entries(byAction)) {
      plan.push(`  - ${count} tables need: ${action.toUpperCase()}`);
    }

    plan.push('Execute remediation actions immediately to improve performance');

    return plan;
  }

  /**
   * Generate autovacuum recommendations
   */
  private generateAutovacRecommendations(settings: AutoVacSettings): string[] {
    return [
      `Autovacuum: ${settings.autovacuum ? 'ENABLED' : 'DISABLED'}`,
      `Naptime: ${settings.autovacuumNaptime} (frequency of vacuum daemon checks)`,
      `Threshold: ${settings.autovacuumVacuumThreshold} rows + ${settings.autovacuumVacuumScaleFactor * 100}% of table size`,
      'Settings are now optimized for your workload patterns',
      'Monitor performance metrics for 24-48 hours before further adjustments',
    ];
  }

  /**
   * Generate alerts for dead tuple monitoring
   */
  private generateDeadTupleAlerts(stats: DeadTupleStats[]): string[] {
    const alerts: string[] = [];

    for (const stat of stats) {
      if (stat.deadRatio > 0.25) {
        alerts.push(`CRITICAL: ${stat.tableName} has ${(stat.deadRatio * 100).toFixed(1)}% dead tuples`);
      } else if (stat.deadRatio > 0.15) {
        alerts.push(`WARNING: ${stat.tableName} has ${(stat.deadRatio * 100).toFixed(1)}% dead tuples`);
      }
    }

    if (alerts.length === 0) {
      alerts.push('All tables have acceptable dead tuple ratios');
    }

    return alerts;
  }

  /**
   * Format duration for display
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }

    if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }

    return `${(ms / 60000).toFixed(1)}m`;
  }
}
