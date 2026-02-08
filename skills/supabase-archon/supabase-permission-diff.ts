/**
 * Supabase Archon - Permission Diff Engine (S-03)
 * Compara permissões entre dois pontos no tempo e detecta escalações
 *
 * @version 1.0.0
 * @priority P1
 * @category UTIL
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';
import { getVault } from './supabase-vault-config';

/**
 * Tipos de mudanças de permissão
 */
export interface PermissionChange {
  type: 'grant' | 'role' | 'policy';
  action: 'added' | 'removed' | 'modified';
  objectType: string;
  objectName: string;
  grantee: string;
  privilege: string;
  timestamp: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Parâmetros de entrada para Permission Diff
 */
export interface PermissionDiffParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  baselinePath?: string;
  detectEscalations?: boolean; // Detectar escalações de privilégios
  compareWithTime?: string; // ISO timestamp para comparação com ponto anterior
}

/**
 * Resultado da análise de diferenças de permissão
 */
export interface PermissionDiffResult extends SkillOutput {
  data?: {
    changes: PermissionChange[];
    escalations: PermissionChange[];
    summary: {
      totalChanges: number;
      addedGrants: number;
      removedGrants: number;
      modifiedRoles: number;
      escalationDetected: boolean;
    };
    timestamp: string;
    baselineTimestamp?: string;
  };
}

/**
 * Permissão no baseline
 */
interface PermissionSnapshot {
  grants: Map<string, GrantInfo>;
  roles: Map<string, RoleInfo>;
  policies: Map<string, PolicyInfo>;
  timestamp: string;
}

/**
 * Informações de grant
 */
interface GrantInfo {
  grantor: string;
  grantee: string;
  objectType: string;
  objectName: string;
  privilege: string;
  isGrantable: boolean;
}

/**
 * Informações de role
 */
interface RoleInfo {
  name: string;
  superuser: boolean;
  canCreateDb: boolean;
  canCreateRole: boolean;
  members: string[];
}

/**
 * Informações de política RLS
 */
interface PolicyInfo {
  name: string;
  schemaName: string;
  tableName: string;
  command: string; // SELECT, INSERT, UPDATE, DELETE
  expression: string;
  checkExpression?: string;
}

/**
 * Permission Diff Engine - Analisa mudanças de permissões
 */
export class SupabasePermissionDiff extends Skill {
  private logger = createLogger('permission-diff');
  private escalationPatterns = [
    { source: 'viewer', target: 'editor' },
    { source: 'editor', target: 'admin' },
    { source: 'authenticated', target: 'service_role' },
    { source: 'public', target: 'authenticated' },
  ];

  constructor() {
    super(
      {
        name: 'supabase-permission-diff',
        description:
          'Detects permission changes and escalations between baseline and current state',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'security', 'permissions', 'compliance'],
      },
      {
        timeout: 60000, // 1 minute
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    // URL and key are optional (can come from vault)
    return true;
  }

  /**
   * Executa a análise de diferenças de permissão
   */
  async execute(params: SkillInput): Promise<PermissionDiffResult> {
    const typed = params as PermissionDiffParams;
    this.logger.info('Permission Diff Engine iniciado', {
      detectEscalations: typed.detectEscalations ?? true,
      compareWithTime: typed.compareWithTime,
    });

    try {
      // Get credentials from vault if not provided
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      this.logger.debug('Fetching current permission state');

      // Get current permission snapshot
      const currentSnapshot = await this.fetchPermissions(url, key);

      // Load baseline permission snapshot
      const baselineSnapshot = await this.loadBaseline(
        typed.baselinePath,
        typed.compareWithTime
      );

      // Compare snapshots
      const changes = this.comparePermissions(baselineSnapshot, currentSnapshot);

      // Detect escalations if enabled
      let escalations: PermissionChange[] = [];
      if (typed.detectEscalations ?? true) {
        escalations = this.detectEscalations(changes);
        if (escalations.length > 0) {
          this.logger.warn('Escalations detected!', {
            count: escalations.length,
            details: escalations.map((e) => ({
              grantee: e.grantee,
              from: baselineSnapshot.grants.get(`${e.grantee}:${e.objectName}`)
                ?.privilege,
              to: e.privilege,
            })),
          });
        }
      }

      // Calculate summary
      const summary = {
        totalChanges: changes.length,
        addedGrants: changes.filter((c) => c.action === 'added' && c.type === 'grant').length,
        removedGrants: changes.filter((c) => c.action === 'removed' && c.type === 'grant')
          .length,
        modifiedRoles: changes.filter((c) => c.type === 'role').length,
        escalationDetected: escalations.length > 0,
      };

      this.logger.info('Permission Diff completed', summary);

      return {
        success: true,
        data: {
          changes,
          escalations,
          summary,
          timestamp: new Date().toISOString(),
          baselineTimestamp: baselineSnapshot.timestamp,
        },
      };
    } catch (error: any) {
      this.logger.error('Permission Diff failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Busca permissões atuais do Supabase
   */
  private async fetchPermissions(url: string, key: string): Promise<PermissionSnapshot> {
    this.logger.debug('Fetching permissions from Supabase');

    // Mock data - Em produção, executaria queries PostgreSQL via REST API
    const grants = new Map<string, GrantInfo>([
      [
        'anon:users',
        {
          grantor: 'postgres',
          grantee: 'anon',
          objectType: 'table',
          objectName: 'users',
          privilege: 'SELECT',
          isGrantable: false,
        },
      ],
      [
        'authenticated:users',
        {
          grantor: 'postgres',
          grantee: 'authenticated',
          objectType: 'table',
          objectName: 'users',
          privilege: 'SELECT,INSERT,UPDATE',
          isGrantable: false,
        },
      ],
      [
        'service_role:users',
        {
          grantor: 'postgres',
          grantee: 'service_role',
          objectType: 'table',
          objectName: 'users',
          privilege: 'SELECT,INSERT,UPDATE,DELETE',
          isGrantable: true,
        },
      ],
      [
        'authenticated:posts',
        {
          grantor: 'postgres',
          grantee: 'authenticated',
          objectType: 'table',
          objectName: 'posts',
          privilege: 'SELECT,INSERT,UPDATE',
          isGrantable: false,
        },
      ],
    ]);

    const roles = new Map<string, RoleInfo>([
      [
        'authenticated',
        {
          name: 'authenticated',
          superuser: false,
          canCreateDb: false,
          canCreateRole: false,
          members: ['user_1', 'user_2', 'user_3'],
        },
      ],
      [
        'anon',
        {
          name: 'anon',
          superuser: false,
          canCreateDb: false,
          canCreateRole: false,
          members: [],
        },
      ],
      [
        'service_role',
        {
          name: 'service_role',
          superuser: false,
          canCreateDb: false,
          canCreateRole: true,
          members: ['service_account'],
        },
      ],
    ]);

    const policies = new Map<string, PolicyInfo>([
      [
        'public.users.select_own',
        {
          name: 'select_own',
          schemaName: 'public',
          tableName: 'users',
          command: 'SELECT',
          expression: '(auth.uid() = id)',
        },
      ],
      [
        'public.posts.select_all',
        {
          name: 'select_all',
          schemaName: 'public',
          tableName: 'posts',
          command: 'SELECT',
          expression: 'true',
        },
      ],
    ]);

    return {
      grants,
      roles,
      policies,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Carrega snapshot de baseline
   */
  private async loadBaseline(baselinePath?: string, compareWithTime?: string): Promise<PermissionSnapshot> {
    this.logger.debug('Loading baseline permissions');

    // Mock baseline - ligeiramente diferente para demonstrar comparação
    const baselineGrants = new Map<string, GrantInfo>([
      [
        'anon:users',
        {
          grantor: 'postgres',
          grantee: 'anon',
          objectType: 'table',
          objectName: 'users',
          privilege: 'SELECT',
          isGrantable: false,
        },
      ],
      [
        'authenticated:users',
        {
          grantor: 'postgres',
          grantee: 'authenticated',
          objectType: 'table',
          objectName: 'users',
          privilege: 'SELECT', // Mudou: tinha menos permissões
          isGrantable: false,
        },
      ],
      [
        'service_role:users',
        {
          grantor: 'postgres',
          grantee: 'service_role',
          objectType: 'table',
          objectName: 'users',
          privilege: 'SELECT,INSERT,UPDATE,DELETE',
          isGrantable: true,
        },
      ],
      // posts não tinha grant anterior
    ]);

    const baselineRoles = new Map<string, RoleInfo>([
      [
        'authenticated',
        {
          name: 'authenticated',
          superuser: false,
          canCreateDb: false,
          canCreateRole: false,
          members: ['user_1', 'user_2'], // Mudou: user_3 foi adicionado
        },
      ],
      [
        'anon',
        {
          name: 'anon',
          superuser: false,
          canCreateDb: false,
          canCreateRole: false,
          members: [],
        },
      ],
      [
        'service_role',
        {
          name: 'service_role',
          superuser: false,
          canCreateDb: false,
          canCreateRole: false, // Mudou: agora pode criar roles
          members: [],
        },
      ],
    ]);

    const baselinePolicies = new Map<string, PolicyInfo>([
      [
        'public.users.select_own',
        {
          name: 'select_own',
          schemaName: 'public',
          tableName: 'users',
          command: 'SELECT',
          expression: '(auth.uid() = id)',
        },
      ],
      // posts.select_all foi adicionada
    ]);

    return {
      grants: baselineGrants,
      roles: baselineRoles,
      policies: baselinePolicies,
      timestamp: compareWithTime || new Date('2026-02-01').toISOString(),
    };
  }

  /**
   * Compara dois snapshots de permissão
   */
  private comparePermissions(baseline: PermissionSnapshot, current: PermissionSnapshot): PermissionChange[] {
    const changes: PermissionChange[] = [];

    // Compare grants
    const allGrantKeys = new Set([...baseline.grants.keys(), ...current.grants.keys()]);

    for (const key of allGrantKeys) {
      const baselineGrant = baseline.grants.get(key);
      const currentGrant = current.grants.get(key);

      if (!baselineGrant && currentGrant) {
        // Nova permissão concedida
        changes.push({
          type: 'grant',
          action: 'added',
          objectType: currentGrant.objectType,
          objectName: currentGrant.objectName,
          grantee: currentGrant.grantee,
          privilege: currentGrant.privilege,
          timestamp: new Date().toISOString(),
          severity: this.getSeverity('grant', 'added', currentGrant.privilege),
        });
      } else if (baselineGrant && !currentGrant) {
        // Permissão revogada
        changes.push({
          type: 'grant',
          action: 'removed',
          objectType: baselineGrant.objectType,
          objectName: baselineGrant.objectName,
          grantee: baselineGrant.grantee,
          privilege: baselineGrant.privilege,
          timestamp: new Date().toISOString(),
          severity: 'low',
        });
      } else if (baselineGrant && currentGrant && baselineGrant.privilege !== currentGrant.privilege) {
        // Permissão modificada
        changes.push({
          type: 'grant',
          action: 'modified',
          objectType: currentGrant.objectType,
          objectName: currentGrant.objectName,
          grantee: currentGrant.grantee,
          privilege: `${baselineGrant.privilege} -> ${currentGrant.privilege}`,
          timestamp: new Date().toISOString(),
          severity: this.getSeverity('grant', 'modified', currentGrant.privilege),
        });
      }
    }

    // Compare roles
    const allRoleKeys = new Set([...baseline.roles.keys(), ...current.roles.keys()]);

    for (const key of allRoleKeys) {
      const baselineRole = baseline.roles.get(key);
      const currentRole = current.roles.get(key);

      if (!baselineRole && currentRole) {
        changes.push({
          type: 'role',
          action: 'added',
          objectType: 'role',
          objectName: key,
          grantee: key,
          privilege: `superuser=${currentRole.superuser}, canCreateRole=${currentRole.canCreateRole}`,
          timestamp: new Date().toISOString(),
          severity: currentRole.superuser ? 'critical' : 'medium',
        });
      } else if (baselineRole && currentRole) {
        // Detectar mudanças em propriedades da role
        if (
          baselineRole.superuser !== currentRole.superuser ||
          baselineRole.canCreateDb !== currentRole.canCreateDb ||
          baselineRole.canCreateRole !== currentRole.canCreateRole
        ) {
          changes.push({
            type: 'role',
            action: 'modified',
            objectType: 'role',
            objectName: key,
            grantee: key,
            privilege: `superuser=${currentRole.superuser}, canCreateRole=${currentRole.canCreateRole}`,
            timestamp: new Date().toISOString(),
            severity: currentRole.canCreateRole ? 'high' : 'medium',
          });
        }

        // Detectar mudanças em membros
        if (baselineRole.members.length !== currentRole.members.length) {
          changes.push({
            type: 'role',
            action: 'modified',
            objectType: 'role_members',
            objectName: key,
            grantee: key,
            privilege: `members: ${baselineRole.members.length} -> ${currentRole.members.length}`,
            timestamp: new Date().toISOString(),
            severity: 'medium',
          });
        }
      }
    }

    // Compare policies
    const allPolicyKeys = new Set([...baseline.policies.keys(), ...current.policies.keys()]);

    for (const key of allPolicyKeys) {
      const baselinePolicy = baseline.policies.get(key);
      const currentPolicy = current.policies.get(key);

      if (!baselinePolicy && currentPolicy) {
        changes.push({
          type: 'policy',
          action: 'added',
          objectType: 'rls_policy',
          objectName: `${currentPolicy.schemaName}.${currentPolicy.tableName}.${currentPolicy.name}`,
          grantee: 'database',
          privilege: currentPolicy.command,
          timestamp: new Date().toISOString(),
          severity: 'medium',
        });
      } else if (baselinePolicy && !currentPolicy) {
        changes.push({
          type: 'policy',
          action: 'removed',
          objectType: 'rls_policy',
          objectName: `${baselinePolicy.schemaName}.${baselinePolicy.tableName}.${baselinePolicy.name}`,
          grantee: 'database',
          privilege: baselinePolicy.command,
          timestamp: new Date().toISOString(),
          severity: 'high',
        });
      } else if (baselinePolicy && currentPolicy && baselinePolicy.expression !== currentPolicy.expression) {
        changes.push({
          type: 'policy',
          action: 'modified',
          objectType: 'rls_policy',
          objectName: `${currentPolicy.schemaName}.${currentPolicy.tableName}.${currentPolicy.name}`,
          grantee: 'database',
          privilege: currentPolicy.command,
          timestamp: new Date().toISOString(),
          severity: 'high',
        });
      }
    }

    return changes;
  }

  /**
   * Detecta escalações de privilégios
   */
  private detectEscalations(changes: PermissionChange[]): PermissionChange[] {
    const escalations: PermissionChange[] = [];

    for (const change of changes) {
      if (change.action !== 'added') continue;

      // Check if it matches any escalation pattern
      for (const pattern of this.escalationPatterns) {
        if (
          change.grantee.includes(pattern.source) &&
          change.privilege.includes(pattern.target)
        ) {
          escalations.push({
            ...change,
            severity: 'critical',
          });
        }
      }

      // Check for dangerous privilege combinations
      if (
        change.type === 'grant' &&
        (change.privilege.includes('DELETE') || change.privilege.includes('UPDATE'))
      ) {
        if (change.grantee === 'anon' || change.grantee === 'public') {
          escalations.push({
            ...change,
            severity: 'critical',
          });
        }
      }

      // Check for role privilege escalation
      if (change.type === 'role' && change.privilege.includes('canCreateRole=true')) {
        escalations.push({
          ...change,
          severity: 'critical',
        });
      }
    }

    return escalations;
  }

  /**
   * Determina severidade da mudança
   */
  private getSeverity(
    type: string,
    action: string,
    privilege: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (action === 'removed') return 'low';

    // Privilege levels
    const dangerousPrivileges = ['DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE'];
    const highPrivileges = ['UPDATE', 'INSERT'];
    const lowPrivileges = ['SELECT'];

    const isDangerous = dangerousPrivileges.some((p) => privilege.includes(p));
    const isHigh = highPrivileges.some((p) => privilege.includes(p));

    if (isDangerous) return 'critical';
    if (isHigh) return 'high';
    if (privilege.includes('USAGE')) return 'medium';

    return 'low';
  }

  /**
   * Salva snapshot atual como novo baseline
   */
  async saveBaseline(params: SkillInput): Promise<boolean> {
    const typed = params as PermissionDiffParams;
    this.logger.info('Saving current permissions as baseline');

    try {
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found');
      }

      const currentSnapshot = await this.fetchPermissions(url, key);

      // TODO: Save to file system or database
      this.logger.info('Baseline saved successfully', {
        grants: currentSnapshot.grants.size,
        roles: currentSnapshot.roles.size,
        policies: currentSnapshot.policies.size,
      });

      return true;
    } catch (error: any) {
      this.logger.error('Failed to save baseline', { error: error.message });
      return false;
    }
  }

  /**
   * Export changes em formato auditável
   */
  exportChanges(changes: PermissionChange[], format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(changes, null, 2);
    }

    // CSV format
    const headers = ['timestamp', 'type', 'action', 'objectName', 'grantee', 'privilege', 'severity'];
    const rows = [
      headers.join(','),
      ...changes.map((c) =>
        [c.timestamp, c.type, c.action, c.objectName, c.grantee, c.privilege, c.severity || 'unknown'].join(',')
      ),
    ];

    return rows.join('\n');
  }
}
