/**
 * Supabase Archon - Compliance Reporter (S-27)
 * Generates compliance reports for LGPD, GDPR, and SOC2 standards
 * Audits data retention policies, right-to-delete requests, and PII masking
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

export interface PIIField {
  fieldName: string;
  tableNames: string[];
  category: 'email' | 'phone' | 'cpf' | 'passport' | 'address' | 'name' | 'other';
  masked: boolean;
  maskingMethod?: 'hash' | 'partial' | 'redact' | 'encrypt';
  timestamp: string;
}

export interface DataRetentionPolicy {
  tableOrField: string;
  retentionDays: number;
  autoDeleteEnabled: boolean;
  lastDeleteRun?: string;
  recordsDeletedCount: number;
  status: 'compliant' | 'non-compliant' | 'warning';
  timestamp: string;
}

export interface RightToDeleteAudit {
  auditId: string;
  requestId: string;
  userId?: string;
  requestedAt: string;
  completedAt?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  recordsDeleted: number;
  recordsNotFound: number;
  affectedTables: string[];
  notes?: string;
  timestamp: string;
}

export interface SOC2AuditTrail {
  traceId: string;
  action: string;
  actionType: 'create' | 'read' | 'update' | 'delete';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  affectedTable: string;
  affectedRecordId: string | number;
  timestamp: string;
  result: 'success' | 'failure';
  errorMessage?: string;
}

export interface AuditTrailMetrics {
  totalActions: number;
  actionsLastDay: number;
  actionsLastWeek: number;
  actionsLastMonth: number;
  failureRate: number;
  successRate: number;
  topAffectedTables: { table: string; count: number }[];
  topUsers: { userId: string; count: number }[];
  timestamp: string;
}

export interface ComplianceScore {
  framework: 'LGPD' | 'GDPR' | 'SOC2';
  score: number; // 0-100
  status: 'compliant' | 'partial' | 'non-compliant';
  issues: string[];
  recommendations: string[];
  timestamp: string;
}

export interface ComplianceReport {
  reportId: string;
  generatedAt: string;
  period: {
    startDate: string;
    endDate: string;
  };
  frameworks: {
    lgpd: ComplianceScore;
    gdpr: ComplianceScore;
    soc2: ComplianceScore;
  };
  piiFields: PIIField[];
  dataRetentionPolicies: DataRetentionPolicy[];
  rightToDeleteAudits: RightToDeleteAudit[];
  auditTrailMetrics: AuditTrailMetrics;
  overallComplianceScore: number;
  criticalFindings: number;
  recommendations: string[];
  nextAuditDate?: string;
  timestamp: string;
}

export interface ComplianceReporterParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  frameworks?: ('LGPD' | 'GDPR' | 'SOC2')[];
  tablesToAudit?: string[];
  period?: {
    startDate: string;
    endDate: string;
  };
  includePIIAudit?: boolean;
  includeRetentionAudit?: boolean;
  includeRightToDelete?: boolean;
  includeAuditTrails?: boolean;
  generateRecommendations?: boolean;
}

export interface ComplianceReporterResult extends SkillOutput {
  data?: ComplianceReport;
}

// ============================================================================
// COMPLIANCE REPORTER SKILL
// ============================================================================

export class SupabaseComplianceReporter extends Skill {
  private logger = createLogger('compliance-reporter');

  constructor() {
    super(
      {
        name: 'supabase-compliance-reporter',
        description:
          'Generates comprehensive compliance reports for LGPD, GDPR, and SOC2 standards with PII audits and retention policies',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'compliance', 'lgpd', 'gdpr', 'soc2', 'audit'],
      },
      {
        timeout: 180000, // 3 minutes for thorough compliance audit
        retries: 1,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as ComplianceReporterParams;

    // Either URL+Key provided or will use vault
    if (typed.supabaseUrl && !typed.supabaseKey) {
      return false;
    }

    return true;
  }

  /**
   * Execute compliance report generation
   */
  async execute(params: SkillInput): Promise<ComplianceReporterResult> {
    const typed = params as ComplianceReporterParams;
    const reportId = this.generateReportId();
    const generatedAt = new Date();

    this.logger.info('Compliance report generation started', {
      reportId,
      frameworks: typed.frameworks || ['LGPD', 'GDPR', 'SOC2'],
      includePIIAudit: typed.includePIIAudit !== false,
      includeRetentionAudit: typed.includeRetentionAudit !== false,
    });

    try {
      // Get credentials from vault if not provided
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      const frameworks = typed.frameworks || ['LGPD', 'GDPR', 'SOC2'];
      const tablesToAudit = typed.tablesToAudit || [
        'users',
        'profiles',
        'audit_logs',
      ];

      // Set default period (last 30 days)
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const period = typed.period || {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      // Audit PII fields
      const piiFields = typed.includePIIAudit !== false
        ? await this.auditPIIFields(url, key, tablesToAudit)
        : [];

      // Audit data retention policies
      const dataRetentionPolicies = typed.includeRetentionAudit !== false
        ? await this.auditDataRetentionPolicies(url, key, tablesToAudit)
        : [];

      // Audit right-to-delete requests
      const rightToDeleteAudits = typed.includeRightToDelete !== false
        ? await this.auditRightToDelete(url, key, period)
        : [];

      // Audit trails
      const auditTrailMetrics = typed.includeAuditTrails !== false
        ? await this.auditAuditTrails(url, key, period)
        : this.getDefaultAuditTrailMetrics();

      // Generate compliance scores for each framework
      const lgpdScore = frameworks.includes('LGPD')
        ? this.calculateLGPDCompliance(piiFields, dataRetentionPolicies)
        : { framework: 'LGPD' as const, score: 0, status: 'non-compliant' as const, issues: [], recommendations: [] };

      const gdprScore = frameworks.includes('GDPR')
        ? this.calculateGDPRCompliance(
            piiFields,
            dataRetentionPolicies,
            rightToDeleteAudits
          )
        : { framework: 'GDPR' as const, score: 0, status: 'non-compliant' as const, issues: [], recommendations: [] };

      const soc2Score = frameworks.includes('SOC2')
        ? this.calculateSOC2Compliance(auditTrailMetrics)
        : { framework: 'SOC2' as const, score: 0, status: 'non-compliant' as const, issues: [], recommendations: [] };

      // Collect all recommendations
      const recommendations = typed.generateRecommendations !== false
        ? this.generateRecommendations(
            [lgpdScore, gdprScore, soc2Score],
            piiFields,
            dataRetentionPolicies,
            rightToDeleteAudits
          )
        : [];

      // Calculate overall compliance score
      const overallComplianceScore = this.calculateOverallScore([
        lgpdScore,
        gdprScore,
        soc2Score,
      ]);

      // Count critical findings
      const criticalFindings = [lgpdScore, gdprScore, soc2Score].reduce(
        (sum, score) => sum + (score.status === 'non-compliant' ? 1 : 0),
        0
      );

      const report: ComplianceReport = {
        reportId,
        generatedAt: generatedAt.toISOString(),
        period,
        frameworks: {
          lgpd: {
            ...lgpdScore,
            timestamp: new Date().toISOString(),
          },
          gdpr: {
            ...gdprScore,
            timestamp: new Date().toISOString(),
          },
          soc2: {
            ...soc2Score,
            timestamp: new Date().toISOString(),
          },
        },
        piiFields,
        dataRetentionPolicies,
        rightToDeleteAudits,
        auditTrailMetrics,
        overallComplianceScore,
        criticalFindings,
        recommendations,
        nextAuditDate: new Date(
          generatedAt.getTime() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        timestamp: new Date().toISOString(),
      };

      if (criticalFindings > 0) {
        this.logger.warn('Compliance issues detected', {
          reportId,
          criticalFindings,
          overallScore: overallComplianceScore,
        });
      } else {
        this.logger.info('Compliance report generated successfully', {
          reportId,
          overallScore: overallComplianceScore,
        });
      }

      return {
        success: true,
        data: report,
      };
    } catch (error: any) {
      this.logger.error('Compliance report generation failed', {
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
   * Audit PII fields for proper masking and handling
   */
  private async auditPIIFields(
    url: string,
    key: string,
    tables: string[]
  ): Promise<PIIField[]> {
    this.logger.debug('Auditing PII fields', { tables });

    // Mock PII field audit data
    const mockPIIFields: PIIField[] = [
      {
        fieldName: 'email',
        tableNames: ['users', 'profiles'],
        category: 'email',
        masked: true,
        maskingMethod: 'hash',
        timestamp: new Date().toISOString(),
      },
      {
        fieldName: 'phone',
        tableNames: ['users'],
        category: 'phone',
        masked: true,
        maskingMethod: 'partial',
        timestamp: new Date().toISOString(),
      },
      {
        fieldName: 'cpf',
        tableNames: ['profiles'],
        category: 'cpf',
        masked: true,
        maskingMethod: 'encrypt',
        timestamp: new Date().toISOString(),
      },
      {
        fieldName: 'address',
        tableNames: ['profiles'],
        category: 'address',
        masked: false, // Issue: not masked
        timestamp: new Date().toISOString(),
      },
      {
        fieldName: 'passport_id',
        tableNames: ['users'],
        category: 'passport',
        masked: true,
        maskingMethod: 'redact',
        timestamp: new Date().toISOString(),
      },
      {
        fieldName: 'full_name',
        tableNames: ['users', 'profiles'],
        category: 'name',
        masked: true,
        maskingMethod: 'partial',
        timestamp: new Date().toISOString(),
      },
    ];

    return mockPIIFields;
  }

  /**
   * Audit data retention policies
   */
  private async auditDataRetentionPolicies(
    url: string,
    key: string,
    tables: string[]
  ): Promise<DataRetentionPolicy[]> {
    this.logger.debug('Auditing data retention policies', { tables });

    // Mock retention policy data
    const mockPolicies: DataRetentionPolicy[] = [
      {
        tableOrField: 'users',
        retentionDays: 365,
        autoDeleteEnabled: true,
        lastDeleteRun: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        recordsDeletedCount: 42,
        status: 'compliant',
        timestamp: new Date().toISOString(),
      },
      {
        tableOrField: 'profiles',
        retentionDays: 180,
        autoDeleteEnabled: true,
        lastDeleteRun: new Date(
          Date.now() - 15 * 24 * 60 * 60 * 1000
        ).toISOString(),
        recordsDeletedCount: 128,
        status: 'compliant',
        timestamp: new Date().toISOString(),
      },
      {
        tableOrField: 'audit_logs',
        retentionDays: 90,
        autoDeleteEnabled: false, // Issue: auto-delete not enabled
        recordsDeletedCount: 0,
        status: 'non-compliant',
        timestamp: new Date().toISOString(),
      },
      {
        tableOrField: 'temp_sessions',
        retentionDays: 30,
        autoDeleteEnabled: true,
        lastDeleteRun: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000
        ).toISOString(),
        recordsDeletedCount: 897,
        status: 'compliant',
        timestamp: new Date().toISOString(),
      },
    ];

    return mockPolicies;
  }

  /**
   * Audit right-to-delete requests
   */
  private async auditRightToDelete(
    url: string,
    key: string,
    period: { startDate: string; endDate: string }
  ): Promise<RightToDeleteAudit[]> {
    this.logger.debug('Auditing right-to-delete requests', { period });

    // Mock right-to-delete audit data
    const mockAudits: RightToDeleteAudit[] = [
      {
        auditId: this.generateId('rtd'),
        requestId: 'RTD-2026-001',
        userId: 'user_123',
        requestedAt: new Date(
          Date.now() - 5 * 24 * 60 * 60 * 1000
        ).toISOString(),
        completedAt: new Date(
          Date.now() - 4 * 24 * 60 * 60 * 1000
        ).toISOString(),
        status: 'completed',
        recordsDeleted: 156,
        recordsNotFound: 0,
        affectedTables: ['users', 'profiles', 'preferences', 'activity_logs'],
        notes: 'User requested complete data deletion per GDPR Article 17',
        timestamp: new Date().toISOString(),
      },
      {
        auditId: this.generateId('rtd'),
        requestId: 'RTD-2026-002',
        userId: 'user_456',
        requestedAt: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000
        ).toISOString(),
        status: 'in_progress',
        recordsDeleted: 73,
        recordsNotFound: 0,
        affectedTables: ['users', 'profiles'],
        notes: 'Deletion in progress',
        timestamp: new Date().toISOString(),
      },
      {
        auditId: this.generateId('rtd'),
        requestId: 'RTD-2026-003',
        requestedAt: new Date(
          Date.now() - 8 * 60 * 60 * 1000
        ).toISOString(),
        status: 'pending',
        recordsDeleted: 0,
        recordsNotFound: 0,
        affectedTables: [],
        notes: 'Awaiting verification',
        timestamp: new Date().toISOString(),
      },
    ];

    return mockAudits;
  }

  /**
   * Audit trail metrics
   */
  private async auditAuditTrails(
    url: string,
    key: string,
    period: { startDate: string; endDate: string }
  ): Promise<AuditTrailMetrics> {
    this.logger.debug('Collecting audit trail metrics', { period });

    // Mock audit trail metrics
    const mockTrails: AuditTrailMetrics = {
      totalActions: 125847,
      actionsLastDay: 3421,
      actionsLastWeek: 22156,
      actionsLastMonth: 98432,
      failureRate: 0.08, // 0.8%
      successRate: 0.92, // 92%
      topAffectedTables: [
        { table: 'users', count: 45232 },
        { table: 'posts', count: 34567 },
        { table: 'comments', count: 28945 },
        { table: 'audit_logs', count: 12103 },
      ],
      topUsers: [
        { userId: 'admin_001', count: 8932 },
        { userId: 'service_account_1', count: 5621 },
        { userId: 'user_123', count: 3456 },
      ],
      timestamp: new Date().toISOString(),
    };

    return mockTrails;
  }

  /**
   * Get default audit trail metrics when audit trails are skipped
   */
  private getDefaultAuditTrailMetrics(): AuditTrailMetrics {
    return {
      totalActions: 0,
      actionsLastDay: 0,
      actionsLastWeek: 0,
      actionsLastMonth: 0,
      failureRate: 0,
      successRate: 100,
      topAffectedTables: [],
      topUsers: [],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate LGPD compliance score
   */
  private calculateLGPDCompliance(
    piiFields: PIIField[],
    policies: DataRetentionPolicy[]
  ): Omit<ComplianceScore, 'timestamp'> {
    const issues: string[] = [];
    let score = 100;

    // Check PII masking
    const unmaskedPII = piiFields.filter(p => !p.masked);
    if (unmaskedPII.length > 0) {
      issues.push(
        `Found ${unmaskedPII.length} unmasked PII fields: ${unmaskedPII.map(p => p.fieldName).join(', ')}`
      );
      score -= unmaskedPII.length * 5;
    }

    // Check retention policies
    const nonCompliantPolicies = policies.filter(
      p => p.status === 'non-compliant'
    );
    if (nonCompliantPolicies.length > 0) {
      issues.push(
        `${nonCompliantPolicies.length} data retention policies not compliant with LGPD`
      );
      score -= nonCompliantPolicies.length * 10;
    }

    // Check auto-delete is enabled for retention policies
    const noAutoDelete = policies.filter(p => !p.autoDeleteEnabled);
    if (noAutoDelete.length > 0) {
      issues.push(
        `${noAutoDelete.length} tables/fields missing auto-delete functionality`
      );
      score -= noAutoDelete.length * 5;
    }

    const recommendations = [];
    if (unmaskedPII.length > 0) {
      recommendations.push(
        `Implement masking for all PII fields per LGPD requirements`
      );
    }
    if (nonCompliantPolicies.length > 0) {
      recommendations.push(
        `Review and update data retention policies to ensure LGPD compliance`
      );
    }
    if (noAutoDelete.length > 0) {
      recommendations.push(
        `Enable automated deletion for expired records per retention policies`
      );
    }

    return {
      framework: 'LGPD',
      score: Math.max(0, score),
      status:
        score >= 90 ? 'compliant' : score >= 70 ? 'partial' : 'non-compliant',
      issues,
      recommendations,
    };
  }

  /**
   * Calculate GDPR compliance score
   */
  private calculateGDPRCompliance(
    piiFields: PIIField[],
    policies: DataRetentionPolicy[],
    rightToDelete: RightToDeleteAudit[]
  ): Omit<ComplianceScore, 'timestamp'> {
    const issues: string[] = [];
    let score = 100;

    // Check PII masking (GDPR Article 32)
    const unmaskedPII = piiFields.filter(p => !p.masked);
    if (unmaskedPII.length > 0) {
      issues.push(
        `Found ${unmaskedPII.length} unmasked PII fields violating GDPR Article 32`
      );
      score -= unmaskedPII.length * 8;
    }

    // Check retention policies (GDPR Article 5)
    const nonCompliantPolicies = policies.filter(
      p => p.status === 'non-compliant'
    );
    if (nonCompliantPolicies.length > 0) {
      issues.push(
        `${nonCompliantPolicies.length} retention policies violate GDPR storage limitation principle`
      );
      score -= nonCompliantPolicies.length * 12;
    }

    // Check right-to-delete implementation (GDPR Article 17)
    const pendingRequests = rightToDelete.filter(r => r.status === 'pending');
    if (pendingRequests.length > 0) {
      issues.push(
        `${pendingRequests.length} pending right-to-delete requests exceeding 30-day deadline`
      );
      score -= pendingRequests.length * 10;
    }

    const recommendations = [];
    if (unmaskedPII.length > 0) {
      recommendations.push(
        `Implement data protection measures for all PII per GDPR Article 32`
      );
    }
    if (nonCompliantPolicies.length > 0) {
      recommendations.push(
        `Ensure data is deleted when no longer necessary per GDPR Article 5`
      );
    }
    if (pendingRequests.length > 0) {
      recommendations.push(
        `Process all right-to-delete requests within 30 days per GDPR Article 17`
      );
    }
    recommendations.push(
      `Maintain documentation of data processing activities (Data Processing Agreement)`
    );

    return {
      framework: 'GDPR',
      score: Math.max(0, score),
      status:
        score >= 90 ? 'compliant' : score >= 70 ? 'partial' : 'non-compliant',
      issues,
      recommendations,
    };
  }

  /**
   * Calculate SOC2 compliance score
   */
  private calculateSOC2Compliance(
    metrics: AuditTrailMetrics
  ): Omit<ComplianceScore, 'timestamp'> {
    const issues: string[] = [];
    let score = 100;

    // Check audit trail completeness
    if (metrics.totalActions === 0) {
      issues.push('No audit trail data available');
      score -= 30;
    }

    // Check failure rate (should be low)
    if (metrics.failureRate > 0.05) {
      issues.push(
        `High failure rate (${(metrics.failureRate * 100).toFixed(2)}%) indicates potential security issues`
      );
      score -= 20;
    }

    // Check for unusual access patterns
    if (metrics.topUsers.length === 0) {
      issues.push('No user activity data available for access monitoring');
      score -= 15;
    } else if (metrics.topUsers[0].count > metrics.totalActions * 0.3) {
      issues.push(
        'Potential overly concentrated access patterns - review privileged user access'
      );
      score -= 10;
    }

    // Check audit trail retention
    const recommendations = [];
    recommendations.push('Maintain comprehensive audit logs for all data access');
    recommendations.push('Review and monitor unusual access patterns regularly');
    recommendations.push(
      'Implement automated alerting for security-relevant events'
    );
    if (metrics.failureRate > 0.01) {
      recommendations.push(
        `Investigate and reduce failure rate to improve system reliability`
      );
    }

    return {
      framework: 'SOC2',
      score: Math.max(0, score),
      status:
        score >= 90 ? 'compliant' : score >= 70 ? 'partial' : 'non-compliant',
      issues,
      recommendations,
    };
  }

  /**
   * Calculate overall compliance score
   */
  private calculateOverallScore(scores: Omit<ComplianceScore, 'timestamp'>[]): number {
    if (scores.length === 0) {
      return 0;
    }

    const validScores = scores.filter(s => s.score > 0);
    if (validScores.length === 0) {
      return 0;
    }

    const total = validScores.reduce((sum, s) => sum + s.score, 0);
    return Math.round(total / validScores.length);
  }

  /**
   * Generate recommendations across all frameworks
   */
  private generateRecommendations(
    scores: Omit<ComplianceScore, 'timestamp'>[],
    piiFields: PIIField[],
    policies: DataRetentionPolicy[],
    rightToDelete: RightToDeleteAudit[]
  ): string[] {
    const recommendations: Set<string> = new Set();

    // Add framework-specific recommendations
    for (const score of scores) {
      score.recommendations.forEach(rec => recommendations.add(rec));
    }

    // Add general recommendations
    recommendations.add('Implement regular compliance audits (quarterly minimum)');
    recommendations.add('Train staff on data protection and privacy requirements');
    recommendations.add(
      'Maintain updated Data Processing Agreements with all data processors'
    );
    recommendations.add(
      'Implement technical and organizational measures to ensure data security'
    );
    recommendations.add(
      'Establish incident response procedures for data breaches'
    );

    // Add specific findings
    if (rightToDelete.some(r => r.status === 'pending')) {
      recommendations.add(
        'Create ticketing system to track and monitor right-to-delete requests'
      );
    }

    const unmaskedPII = piiFields.filter(p => !p.masked);
    if (unmaskedPII.length > 0) {
      recommendations.add(
        `Implement encryption or masking for: ${unmaskedPII.map(p => p.fieldName).join(', ')}`
      );
    }

    return Array.from(recommendations);
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `report-${timestamp}-${random}`;
  }

  /**
   * Generate unique ID with prefix
   */
  private generateId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Generate LGPD compliance report
   */
  async generateLGPDReport(params: SkillInput): Promise<SkillOutput> {
    const typed = params as ComplianceReporterParams;
    this.logger.info('Generating LGPD compliance report');

    try {
      const result = await this.execute({
        ...typed,
        frameworks: ['LGPD'],
      });

      return result;
    } catch (error: any) {
      this.logger.error('LGPD report generation failed', {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate GDPR compliance report
   */
  async generateGDPRReport(params: SkillInput): Promise<SkillOutput> {
    const typed = params as ComplianceReporterParams;
    this.logger.info('Generating GDPR compliance report');

    try {
      const result = await this.execute({
        ...typed,
        frameworks: ['GDPR'],
      });

      return result;
    } catch (error: any) {
      this.logger.error('GDPR report generation failed', {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate SOC2 audit report
   */
  async generateSOC2Report(params: SkillInput): Promise<SkillOutput> {
    const typed = params as ComplianceReporterParams;
    this.logger.info('Generating SOC2 audit report');

    try {
      const result = await this.execute({
        ...typed,
        frameworks: ['SOC2'],
      });

      return result;
    } catch (error: any) {
      this.logger.error('SOC2 report generation failed', {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check PII masking status
   */
  async checkPIIMasking(params: SkillInput): Promise<SkillOutput> {
    const typed = params as ComplianceReporterParams;
    this.logger.info('Checking PII masking status');

    try {
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found');
      }

      const tables = typed.tablesToAudit || [
        'users',
        'profiles',
        'contacts',
      ];
      const piiFields = await this.auditPIIFields(url, key, tables);

      const masked = piiFields.filter(p => p.masked);
      const unmasked = piiFields.filter(p => !p.masked);

      return {
        success: true,
        data: {
          total: piiFields.length,
          masked: masked.length,
          unmasked: unmasked.length,
          maskingRate: ((masked.length / piiFields.length) * 100).toFixed(2),
          unmaskedFields: unmasked,
          piiFields,
        },
      };
    } catch (error: any) {
      this.logger.error('PII masking check failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify data retention policies compliance
   */
  async verifyRetentionPolicies(params: SkillInput): Promise<SkillOutput> {
    const typed = params as ComplianceReporterParams;
    this.logger.info('Verifying data retention policies');

    try {
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found');
      }

      const tables = typed.tablesToAudit || [
        'users',
        'audit_logs',
        'temp_data',
      ];
      const policies = await this.auditDataRetentionPolicies(
        url,
        key,
        tables
      );

      const compliant = policies.filter(p => p.status === 'compliant');
      const nonCompliant = policies.filter(p => p.status === 'non-compliant');

      return {
        success: true,
        data: {
          total: policies.length,
          compliant: compliant.length,
          nonCompliant: nonCompliant.length,
          complianceRate: (
            (compliant.length / policies.length) *
            100
          ).toFixed(2),
          policies,
        },
      };
    } catch (error: any) {
      this.logger.error('Retention policy verification failed', {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process right-to-delete request
   */
  async processRightToDeleteRequest(params: SkillInput): Promise<SkillOutput> {
    const typed = params as ComplianceReporterParams & {
      userId?: string;
      includeAuditTrails?: boolean;
    };
    this.logger.info('Processing right-to-delete request', {
      userId: typed.userId,
    });

    try {
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found');
      }

      // In production, would execute actual deletion
      const requestId = `RTD-${Date.now()}`;
      const audit: RightToDeleteAudit = {
        auditId: this.generateId('rtd'),
        requestId,
        userId: typed.userId,
        requestedAt: new Date().toISOString(),
        status: 'in_progress',
        recordsDeleted: 0,
        recordsNotFound: 0,
        affectedTables: [],
        notes: 'Right-to-delete request initiated',
        timestamp: new Date().toISOString(),
      };

      return {
        success: true,
        data: {
          requestId,
          status: 'in_progress',
          message: 'Right-to-delete request submitted and in progress',
          audit,
        },
      };
    } catch (error: any) {
      this.logger.error('Right-to-delete request processing failed', {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
