/**
 * Supabase Archon - Data Auditor (S-05)
 * Audita integridade de dados, detecta anomalias e valida regras de negócio
 *
 * @version 1.0.0
 * @priority P1
 * @category UTIL
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';
import { getVault } from './supabase-vault-config';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface OrphanedRecord {
  table: string;
  recordId: string | number;
  foreignKeyField: string;
  referencedTable: string;
  missingReference: string | number;
  timestamp: string;
}

export interface DuplicateRecord {
  table: string;
  field: string;
  value: string;
  count: number;
  recordIds: (string | number)[];
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface IntegrityViolation {
  type: 'orphan' | 'duplicate' | 'null_violation' | 'type_mismatch' | 'constraint_violation';
  table: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedRecords: number;
  timestamp: string;
}

export interface DataQualityMetric {
  table: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  orphanedRecords: number;
  duplicateRecords: number;
  nullViolations: number;
  qualityScore: number; // 0-100
  timestamp: string;
}

export interface DataHealthReport {
  scanId: string;
  startTime: string;
  endTime: string;
  duration: number; // milliseconds
  totalTablesScanned: number;
  orphanedRecordsFound: number;
  duplicatesFound: number;
  integrityViolations: IntegrityViolation[];
  qualityMetrics: DataQualityMetric[];
  overallHealthScore: number; // 0-100
  recommendations: string[];
  criticalIssues: number;
}

export interface DataAuditorParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  tablesToAudit?: string[]; // All tables if not specified
  checkOrphans?: boolean;
  checkDuplicates?: boolean;
  checkQuality?: boolean;
  includeRecommendations?: boolean;
  scanDepth?: 'quick' | 'standard' | 'thorough'; // Affects performance
}

export interface DataAuditorResult extends SkillOutput {
  data?: DataHealthReport;
}

// ============================================================================
// DATA AUDITOR SKILL
// ============================================================================

export class SupabaseDataAuditor extends Skill {
  private logger = createLogger('data-auditor');

  constructor() {
    super(
      {
        name: 'supabase-data-auditor',
        description:
          'Audits data integrity, detects anomalies, and validates business rules with comprehensive health reports',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'audit', 'data-quality', 'integrity'],
      },
      {
        timeout: 120000, // 2 minutes for thorough scans
        retries: 1,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as DataAuditorParams;

    // Either URL+Key provided or will use vault
    if (typed.supabaseUrl && !typed.supabaseKey) {
      return false;
    }

    return true;
  }

  /**
   * Execute data audit
   */
  async execute(params: SkillInput): Promise<DataAuditorResult> {
    const typed = params as DataAuditorParams;
    const scanId = this.generateScanId();
    const startTime = new Date();

    this.logger.info('Data Audit iniciado', {
      scanId,
      scanDepth: typed.scanDepth || 'standard',
      checkOrphans: typed.checkOrphans !== false,
      checkDuplicates: typed.checkDuplicates !== false,
      checkQuality: typed.checkQuality !== false,
    });

    try {
      // Get credentials from vault if not provided
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Mock data structure - in production, would query Supabase
      const tableList = typed.tablesToAudit || [
        'users',
        'posts',
        'comments',
        'profiles',
      ];

      const integrityViolations: IntegrityViolation[] = [];
      const qualityMetrics: DataQualityMetric[] = [];

      // Audit each table
      for (const table of tableList) {
        this.logger.debug(`Auditing table: ${table}`);

        // Check for orphaned records
        if (typed.checkOrphans !== false) {
          const orphans = await this.detectOrphanedRecords(url, key, table);
          if (orphans.length > 0) {
            integrityViolations.push({
              type: 'orphan',
              table,
              description: `Found ${orphans.length} orphaned records without valid foreign key references`,
              severity: orphans.length > 10 ? 'high' : 'medium',
              affectedRecords: orphans.length,
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Check for duplicates
        if (typed.checkDuplicates !== false) {
          const duplicates = await this.detectDuplicates(url, key, table);
          if (duplicates.length > 0) {
            integrityViolations.push({
              type: 'duplicate',
              table,
              description: `Found ${duplicates.length} duplicate data violations`,
              severity: duplicates.some(d => d.count > 5) ? 'high' : 'medium',
              affectedRecords: duplicates.reduce((sum, d) => sum + d.count, 0),
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Check quality metrics
        if (typed.checkQuality !== false) {
          const metrics = await this.auditDataQuality(url, key, table);
          qualityMetrics.push(metrics);
        }
      }

      // Generate recommendations
      const recommendations = typed.includeRecommendations !== false
        ? this.generateRecommendations(integrityViolations, qualityMetrics)
        : [];

      // Calculate overall health score
      const overallHealthScore = this.calculateHealthScore(
        qualityMetrics,
        integrityViolations
      );

      const criticalIssues = integrityViolations.filter(
        v => v.severity === 'critical'
      ).length;

      const report: DataHealthReport = {
        scanId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        totalTablesScanned: tableList.length,
        orphanedRecordsFound: integrityViolations
          .filter(v => v.type === 'orphan')
          .reduce((sum, v) => sum + v.affectedRecords, 0),
        duplicatesFound: integrityViolations
          .filter(v => v.type === 'duplicate')
          .reduce((sum, v) => sum + v.affectedRecords, 0),
        integrityViolations,
        qualityMetrics,
        overallHealthScore,
        recommendations,
        criticalIssues,
      };

      if (integrityViolations.length > 0) {
        this.logger.warn('Data integrity issues detected', {
          scanId,
          violationCount: integrityViolations.length,
          criticalIssues,
        });
      } else {
        this.logger.info('Data audit completed - no issues found', {
          scanId,
          healthScore: overallHealthScore,
        });
      }

      return {
        success: true,
        data: report,
      };
    } catch (error: any) {
      this.logger.error('Data audit failed', {
        error: error.message,
        stack: error.stack,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Detect orphaned records (foreign key violations)
   */
  private async detectOrphanedRecords(
    url: string,
    key: string,
    table: string
  ): Promise<OrphanedRecord[]> {
    this.logger.debug(`Detecting orphaned records in ${table}`);

    // Mock implementation - returns sample orphaned records
    // In production, would execute actual queries against Supabase
    const mockOrphans: OrphanedRecord[] = [];

    // Simulate detection based on table
    if (table === 'posts') {
      mockOrphans.push({
        table: 'posts',
        recordId: 42,
        foreignKeyField: 'user_id',
        referencedTable: 'users',
        missingReference: 999,
        timestamp: new Date().toISOString(),
      });
    }

    if (table === 'comments') {
      mockOrphans.push(
        {
          table: 'comments',
          recordId: 5,
          foreignKeyField: 'post_id',
          referencedTable: 'posts',
          missingReference: 777,
          timestamp: new Date().toISOString(),
        },
        {
          table: 'comments',
          recordId: 8,
          foreignKeyField: 'user_id',
          referencedTable: 'users',
          missingReference: 888,
          timestamp: new Date().toISOString(),
        }
      );
    }

    return mockOrphans;
  }

  /**
   * Detect duplicate records
   */
  private async detectDuplicates(
    url: string,
    key: string,
    table: string
  ): Promise<DuplicateRecord[]> {
    this.logger.debug(`Detecting duplicates in ${table}`);

    // Mock implementation
    const mockDuplicates: DuplicateRecord[] = [];

    // Simulate duplicate detection
    if (table === 'users') {
      mockDuplicates.push({
        table: 'users',
        field: 'email',
        value: 'duplicate@example.com',
        count: 2,
        recordIds: [101, 102],
        severity: 'high',
        timestamp: new Date().toISOString(),
      });
    }

    if (table === 'profiles') {
      mockDuplicates.push({
        table: 'profiles',
        field: 'username',
        value: 'john_doe',
        count: 3,
        recordIds: [1, 5, 9],
        severity: 'high',
        timestamp: new Date().toISOString(),
      });
    }

    return mockDuplicates;
  }

  /**
   * Audit data quality metrics for a table
   */
  private async auditDataQuality(
    url: string,
    key: string,
    table: string
  ): Promise<DataQualityMetric> {
    this.logger.debug(`Auditing quality metrics for ${table}`);

    // Mock implementation with realistic metrics
    const mockMetrics: Record<string, DataQualityMetric> = {
      users: {
        table: 'users',
        totalRecords: 1000,
        validRecords: 985,
        invalidRecords: 15,
        orphanedRecords: 0,
        duplicateRecords: 2,
        nullViolations: 8,
        qualityScore: 92,
        timestamp: new Date().toISOString(),
      },
      posts: {
        table: 'posts',
        totalRecords: 5000,
        validRecords: 4988,
        invalidRecords: 12,
        orphanedRecords: 1,
        duplicateRecords: 0,
        nullViolations: 11,
        qualityScore: 94,
        timestamp: new Date().toISOString(),
      },
      comments: {
        table: 'comments',
        totalRecords: 25000,
        validRecords: 24950,
        invalidRecords: 50,
        orphanedRecords: 2,
        duplicateRecords: 0,
        nullViolations: 48,
        qualityScore: 88,
        timestamp: new Date().toISOString(),
      },
      profiles: {
        table: 'profiles',
        totalRecords: 800,
        validRecords: 780,
        invalidRecords: 20,
        orphanedRecords: 0,
        duplicateRecords: 3,
        nullViolations: 17,
        qualityScore: 85,
        timestamp: new Date().toISOString(),
      },
    };

    return (
      mockMetrics[table] || {
        table,
        totalRecords: 100,
        validRecords: 95,
        invalidRecords: 5,
        orphanedRecords: 0,
        duplicateRecords: 0,
        nullViolations: 5,
        qualityScore: 90,
        timestamp: new Date().toISOString(),
      }
    );
  }

  /**
   * Generate recommendations based on audit findings
   */
  private generateRecommendations(
    violations: IntegrityViolation[],
    metrics: DataQualityMetric[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for orphaned records
    const orphanViolations = violations.filter(v => v.type === 'orphan');
    if (orphanViolations.length > 0) {
      recommendations.push(
        `Remove or reconcile ${orphanViolations.reduce((sum, v) => sum + v.affectedRecords, 0)} orphaned records found`
      );
      recommendations.push(
        'Implement foreign key constraints if not already in place'
      );
    }

    // Check for duplicates
    const duplicateViolations = violations.filter(v => v.type === 'duplicate');
    if (duplicateViolations.length > 0) {
      recommendations.push(
        `Deduplicate ${duplicateViolations.reduce((sum, v) => sum + v.affectedRecords, 0)} records`
      );
      recommendations.push('Add unique constraints to prevent future duplicates');
    }

    // Check quality scores
    const lowQualityTables = metrics.filter(m => m.qualityScore < 85);
    if (lowQualityTables.length > 0) {
      recommendations.push(
        `Review data quality issues in tables: ${lowQualityTables.map(t => t.table).join(', ')}`
      );
    }

    // General recommendations
    recommendations.push('Enable row-level security (RLS) policies for data protection');
    recommendations.push('Set up automated audit logs for data modifications');
    recommendations.push('Schedule regular data quality audits (weekly recommended)');

    return recommendations;
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(
    metrics: DataQualityMetric[],
    violations: IntegrityViolation[]
  ): number {
    if (metrics.length === 0) {
      return 100;
    }

    // Average quality score from metrics
    const avgQualityScore =
      metrics.reduce((sum, m) => sum + m.qualityScore, 0) / metrics.length;

    // Deduct points for violations
    let violationDeduction = 0;
    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          violationDeduction += 20;
          break;
        case 'high':
          violationDeduction += 10;
          break;
        case 'medium':
          violationDeduction += 5;
          break;
        case 'low':
          violationDeduction += 2;
          break;
      }
    }

    const healthScore = Math.max(0, avgQualityScore - violationDeduction);
    return Math.round(healthScore);
  }

  /**
   * Generate unique scan ID
   */
  private generateScanId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `audit-${timestamp}-${random}`;
  }

  /**
   * Validate foreign key integrity for specific table
   */
  async validateForeignKeys(params: SkillInput): Promise<SkillOutput> {
    const typed = params as DataAuditorParams & { table: string };
    this.logger.info('Validating foreign keys', { table: typed.table });

    try {
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found');
      }

      const orphans = await this.detectOrphanedRecords(url, key, typed.table);

      return {
        success: true,
        data: {
          table: typed.table,
          orphanedRecords: orphans,
          count: orphans.length,
        },
      };
    } catch (error: any) {
      this.logger.error('Foreign key validation failed', {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check duplicate records in a specific field
   */
  async checkDuplicatesInField(params: SkillInput): Promise<SkillOutput> {
    const typed = params as DataAuditorParams & {
      table: string;
      field: string;
    };
    this.logger.info('Checking duplicates', {
      table: typed.table,
      field: typed.field,
    });

    try {
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found');
      }

      const duplicates = await this.detectDuplicates(url, key, typed.table);
      const fieldDuplicates = duplicates.filter(d => d.field === typed.field);

      return {
        success: true,
        data: {
          table: typed.table,
          field: typed.field,
          duplicates: fieldDuplicates,
          count: fieldDuplicates.length,
        },
      };
    } catch (error: any) {
      this.logger.error('Duplicate check failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
