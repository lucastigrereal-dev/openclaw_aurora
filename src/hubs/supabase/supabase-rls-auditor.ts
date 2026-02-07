/**
 * Supabase Archon - RLS Auditor Pro (S-02)
 * Audita todas as políticas de Row Level Security e detecta configurações fracas
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

export interface RLSViolation {
  table: string;
  schema: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'no_rls' | 'missing_policy' | 'weak_policy';
  description: string;
  recommendation: string;
}

export interface RLSAuditorParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  strictMode?: boolean; // Fail on any violation
  schemaFilter?: string; // Audit specific schema only (default: 'public')
  excludeTables?: string[]; // Tables to exclude from audit
}

export interface RLSAuditorResult extends SkillOutput {
  data?: {
    violations: RLSViolation[];
    tablesAudited: number;
    policiesChecked: number;
    score: number; // 0-100
    summary: {
      critical: number;
      warning: number;
      info: number;
    };
  };
}

interface TableInfo {
  schema: string;
  table: string;
  rlsEnabled: boolean;
}

interface PolicyInfo {
  table: string;
  schema: string;
  name: string;
  command: string;
  quality: 'strong' | 'weak';
}

// ============================================================================
// RLS AUDITOR
// ============================================================================

/**
 * RLS Auditor Pro - Audita políticas RLS no Supabase
 */
export class SupabaseRLSAuditor extends Skill {
  private logger = createLogger('rls-auditor');

  constructor() {
    super(
      {
        name: 'supabase-rls-auditor',
        description: 'Audits Row Level Security policies and detects weak configurations',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'security', 'rls', 'audit'],
      },
      {
        timeout: 60000, // 1 minute
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as RLSAuditorParams;

    // URL and key are optional (can come from vault)
    return true;
  }

  /**
   * Execute RLS audit
   */
  async execute(params: SkillInput): Promise<RLSAuditorResult> {
    const typed = params as RLSAuditorParams;
    const startTime = Date.now();

    this.logger.info('RLS Auditor Pro iniciado', {
      strictMode: typed.strictMode || false,
      schemaFilter: typed.schemaFilter || 'public',
    });

    try {
      // Get credentials from vault if not provided
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      // Fetch tables and RLS status
      const tables = await this.fetchTables(url, key, typed.schemaFilter || 'public');
      this.logger.debug(`Fetched ${tables.length} tables`);

      // Fetch RLS policies
      const policies = await this.fetchPolicies(url, key, typed.schemaFilter || 'public');
      this.logger.debug(`Fetched ${policies.length} RLS policies`);

      // Audit RLS configurations
      const violations = await this.auditRLS(tables, policies, typed.excludeTables || []);

      // Calculate score
      const score = this.calculateScore(tables.length, violations);

      const summary = {
        critical: violations.filter(v => v.severity === 'critical').length,
        warning: violations.filter(v => v.severity === 'warning').length,
        info: violations.filter(v => v.severity === 'info').length,
      };

      if (violations.length > 0) {
        this.logger.warn('RLS violations detected', {
          count: violations.length,
          ...summary,
        });

        // In strict mode, fail if any violations found
        if (typed.strictMode) {
          return {
            success: false,
            error: `Found ${violations.length} RLS violations in strict mode`,
            data: {
              violations,
              tablesAudited: tables.length,
              policiesChecked: policies.length,
              score,
              summary,
            },
          };
        }
      } else {
        this.logger.info('No RLS violations detected', {
          tablesAudited: tables.length,
          score,
        });
      }

      return {
        success: true,
        data: {
          violations,
          tablesAudited: tables.length,
          policiesChecked: policies.length,
          score,
          summary,
        },
      };
    } catch (error: any) {
      this.logger.error('RLS Auditor failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Fetch all tables from schema
   */
  private async fetchTables(url: string, key: string, schema: string): Promise<TableInfo[]> {
    this.logger.debug('Fetching tables from schema', { schema });

    // TODO: Execute query via Supabase REST API or direct PostgreSQL connection
    // Query: SELECT table_schema, table_name FROM information_schema.tables
    //        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

    // Mock data for now
    return [
      { schema: 'public', table: 'users', rlsEnabled: true },
      { schema: 'public', table: 'profiles', rlsEnabled: true },
      { schema: 'public', table: 'posts', rlsEnabled: false }, // Missing RLS!
      { schema: 'public', table: 'comments', rlsEnabled: false }, // Missing RLS!
      { schema: 'public', table: 'audit_logs', rlsEnabled: true },
    ];
  }

  /**
   * Fetch RLS policies for tables
   */
  private async fetchPolicies(url: string, key: string, schema: string): Promise<PolicyInfo[]> {
    this.logger.debug('Fetching RLS policies', { schema });

    // TODO: Execute query via pg_policies system view or pg_catalog
    // Query: SELECT * FROM pg_policies WHERE schemaname = 'public'

    // Mock data for now
    return [
      {
        table: 'users',
        schema: 'public',
        name: 'users_select',
        command: 'SELECT',
        quality: 'strong',
      },
      {
        table: 'users',
        schema: 'public',
        name: 'users_update_self',
        command: 'UPDATE',
        quality: 'strong',
      },
      {
        table: 'users',
        schema: 'public',
        name: 'users_delete',
        command: 'DELETE',
        quality: 'weak', // Too permissive
      },
      {
        table: 'profiles',
        schema: 'public',
        name: 'profiles_select',
        command: 'SELECT',
        quality: 'strong',
      },
      {
        table: 'profiles',
        schema: 'public',
        name: 'profiles_update',
        command: 'UPDATE',
        quality: 'weak', // Missing role check
      },
      {
        table: 'audit_logs',
        schema: 'public',
        name: 'audit_logs_select_admin',
        command: 'SELECT',
        quality: 'strong',
      },
    ];
  }

  /**
   * Audit RLS configuration and detect violations
   */
  private async auditRLS(
    tables: TableInfo[],
    policies: PolicyInfo[],
    excludeTables: string[]
  ): Promise<RLSViolation[]> {
    const violations: RLSViolation[] = [];
    const policyMap = new Map<string, PolicyInfo[]>();

    // Build map of policies by table
    for (const policy of policies) {
      const key = `${policy.schema}.${policy.table}`;
      if (!policyMap.has(key)) {
        policyMap.set(key, []);
      }
      policyMap.get(key)!.push(policy);
    }

    // Audit each table
    for (const table of tables) {
      const key = `${table.schema}.${table.table}`;

      // Skip excluded tables
      if (excludeTables.includes(table.table)) {
        this.logger.debug(`Skipping excluded table: ${table.table}`);
        continue;
      }

      // Check if RLS is enabled
      if (!table.rlsEnabled) {
        violations.push({
          table: table.table,
          schema: table.schema,
          severity: 'critical',
          type: 'no_rls',
          description: `Table "${table.table}" does not have Row Level Security (RLS) enabled`,
          recommendation: `Enable RLS with: ALTER TABLE ${table.schema}.${table.table} ENABLE ROW LEVEL SECURITY;`,
        });
        continue;
      }

      // Check if table has policies
      const tablePolicies = policyMap.get(key) || [];

      if (tablePolicies.length === 0) {
        violations.push({
          table: table.table,
          schema: table.schema,
          severity: 'critical',
          type: 'missing_policy',
          description: `Table "${table.table}" has RLS enabled but no policies defined`,
          recommendation: `Create at least one RLS policy for ${table.schema}.${table.table}`,
        });
        continue;
      }

      // Check for weak policies
      const weakPolicies = tablePolicies.filter(p => p.quality === 'weak');

      for (const policy of weakPolicies) {
        violations.push({
          table: table.table,
          schema: table.schema,
          severity: 'warning',
          type: 'weak_policy',
          description: `Policy "${policy.name}" on table "${table.table}" is potentially weak or too permissive`,
          recommendation: `Review and tighten policy: ${policy.schema}.${policy.table}.${policy.name}`,
        });
      }

      // Check for missing commands
      const commands = new Set(tablePolicies.map(p => p.command));
      const recommendedCommands = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
      const missingCommands = recommendedCommands.filter(cmd => !commands.has(cmd));

      if (missingCommands.length > 0) {
        violations.push({
          table: table.table,
          schema: table.schema,
          severity: 'info',
          type: 'missing_policy',
          description: `Table "${table.table}" is missing RLS policies for: ${missingCommands.join(', ')}`,
          recommendation: `Define RLS policies for the following operations: ${missingCommands.join(', ')}`,
        });
      }
    }

    return violations;
  }

  /**
   * Calculate RLS security score (0-100)
   */
  private calculateScore(totalTables: number, violations: RLSViolation[]): number {
    if (totalTables === 0) return 100;

    const criticalScore = violations.filter(v => v.severity === 'critical').length * 20;
    const warningScore = violations.filter(v => v.severity === 'warning').length * 5;

    const deduction = Math.min(criticalScore + warningScore, 100);
    return Math.max(0, 100 - deduction);
  }

  /**
   * Generate HTML report
   */
  async generateReport(result: RLSAuditorResult): Promise<string> {
    const data = result.data!;
    const violations = data.violations || [];

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>RLS Audit Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
    .score { font-size: 24px; font-weight: bold; }
    .critical { color: #d32f2f; }
    .warning { color: #f57c00; }
    .info { color: #1976d2; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
    th { background-color: #f5f5f5; }
    .violation { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
    .violation.critical { border-color: #d32f2f; background: #ffebee; }
    .violation.warning { border-color: #f57c00; background: #fff3e0; }
    .violation.info { border-color: #1976d2; background: #e3f2fd; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RLS Security Audit Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>
    <div class="score">
      Score: <span class="${data.score >= 80 ? '' : data.score >= 50 ? 'warning' : 'critical'}">
        ${data.score}/100
      </span>
    </div>
  </div>

  <div style="margin-top: 20px;">
    <h2>Summary</h2>
    <table>
      <tr>
        <td>Tables Audited</td>
        <td>${data.tablesAudited}</td>
      </tr>
      <tr>
        <td>Policies Checked</td>
        <td>${data.policiesChecked}</td>
      </tr>
      <tr>
        <td><span class="critical">Critical</span></td>
        <td>${data.summary?.critical || 0}</td>
      </tr>
      <tr>
        <td><span class="warning">Warning</span></td>
        <td>${data.summary?.warning || 0}</td>
      </tr>
      <tr>
        <td><span class="info">Info</span></td>
        <td>${data.summary?.info || 0}</td>
      </tr>
    </table>
  </div>

  <div style="margin-top: 20px;">
    <h2>Violations</h2>
    ${
      violations.length === 0
        ? '<p style="color: green;">No violations found!</p>'
        : violations
            .map(
              v => `
      <div class="violation ${v.severity}">
        <strong>[${v.severity.toUpperCase()}]</strong> ${v.table} (${v.schema})
        <p style="margin: 10px 0 0 0;">${v.description}</p>
        <p style="margin: 10px 0 0 0; color: #666;"><em>Recommendation:</em> ${v.recommendation}</p>
      </div>
    `
            )
            .join('')
    }
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Export violations to CSV
   */
  async exportToCSV(violations: RLSViolation[]): Promise<string> {
    const headers = ['Table', 'Schema', 'Severity', 'Type', 'Description', 'Recommendation'];
    const rows = violations.map(v => [
      v.table,
      v.schema,
      v.severity,
      v.type,
      `"${v.description}"`,
      `"${v.recommendation}"`,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    return csv;
  }
}
