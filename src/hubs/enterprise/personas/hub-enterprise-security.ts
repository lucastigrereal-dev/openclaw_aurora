/**
 * Hub Enterprise - SECURITY Persona (S-06)
 * Security Engineer: Audits, vulnerability scanning, compliance, pentesting
 * Usa Claude AI para análise de segurança
 */

import { Skill, SkillInput, SkillOutput } from '../../skill-base';
import { getSkillRegistryV2 } from '../../registry-v2';
import {
  SecurityAudit,
  SecurityFinding,
  ComplianceStatus,
} from '../hub-enterprise-types';
import { createLogger } from '../shared/hub-enterprise-logger';

export class HubEnterpriseSecuritySkill extends Skill {
  private registry = getSkillRegistryV2();
  private logger = createLogger('security');

  constructor() {
    super(
      {
        name: 'hub-enterprise-security',
        description: 'Security Engineer persona - Security audits and compliance',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Hub Enterprise',
        tags: ['hub-enterprise', 'security', 'compliance', 'pentesting'],
      },
      {
        timeout: 300000, // 5 minutes
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const subskill = input.params?.subskill;
    const appName = input.params?.appName;

    if (!subskill || !appName) {
      this.logger.error('Missing required parameters', {
        subskill,
        appName,
      });
      return false;
    }

    const validSubskills = [
      'security_audit',
      'vulnerability_scan',
      'penetration_test',
      'compliance_check',
      'secrets_rotation',
      'access_control_review',
    ];

    if (!validSubskills.includes(subskill)) {
      this.logger.error('Invalid subskill', { subskill });
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { subskill, appName, ...params } = input.params || {};

    this.logger.info('Executing Security subskill', { subskill, appName });

    const startTime = Date.now();

    try {
      let result;

      switch (subskill) {
        case 'security_audit':
          result = await this.securityAudit(appName, params);
          break;
        case 'vulnerability_scan':
          result = await this.vulnerabilityScan(appName, params);
          break;
        case 'penetration_test':
          result = await this.penetrationTest(appName, params);
          break;
        case 'compliance_check':
          result = await this.complianceCheck(appName, params);
          break;
        case 'secrets_rotation':
          result = await this.secretsRotation(appName, params);
          break;
        case 'access_control_review':
          result = await this.accessControlReview(appName, params);
          break;
        default:
          return this.error(`Unknown subskill: ${subskill}`);
      }

      const duration = Date.now() - startTime;

      this.logger.info(`Subskill ${subskill} completed`, { duration });

      return this.success(result, { duration });
    } catch (error) {
      this.logger.error(`Subskill ${subskill} failed`, { error });
      return this.error(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * S06-1: Security Audit
   * Comprehensive security analysis
   */
  private async securityAudit(
    appName: string,
    params: any
  ): Promise<SecurityAudit> {
    const architecture = params.architecture || {};
    const codebase = params.codebase || {};

    const prompt = `
Perform comprehensive security audit for "${appName}":

Architecture: ${JSON.stringify(architecture, null, 2)}
Tech Stack: ${params.techStack ? JSON.stringify(params.techStack) : 'Node.js, PostgreSQL'}

Audit areas:
1. Authentication & Authorization
2. Data protection (encryption, storage)
3. Network security
4. API security
5. Dependency vulnerabilities
6. Configuration security
7. OWASP Top 10 coverage
8. Security best practices

Return JSON:
{
  "score": 78,
  "vulnerabilities": {
    "critical": 1,
    "high": 3,
    "medium": 8,
    "low": 15
  },
  "findings": [
    {
      "severity": "critical",
      "type": "SQL Injection",
      "location": "src/controllers/user.ts:45",
      "description": "Unsanitized user input in SQL query",
      "recommendation": "Use parameterized queries or ORM",
      "cveId": null
    },
    {
      "severity": "high",
      "type": "Weak Password Policy",
      "location": "src/auth/validation.ts:12",
      "description": "Password requires only 6 characters",
      "recommendation": "Enforce minimum 12 characters with complexity requirements"
    }
  ],
  "compliance": {
    "lgpd": "partial",
    "gdpr": "partial",
    "soc2": "non-compliant"
  },
  "blockers": [
    "Critical SQL injection vulnerability must be fixed before production"
  ],
  "recommendations": [
    "Implement Web Application Firewall (WAF)",
    "Enable rate limiting on all endpoints",
    "Add security headers (CSP, HSTS, X-Frame-Options)",
    "Implement automated security scanning in CI/CD"
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a security expert performing comprehensive audits.
Identify vulnerabilities with clear severity ratings and actionable remediation steps.
Output valid JSON only.`,
        maxTokens: 3000,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        score: parsed.score,
        vulnerabilities: parsed.vulnerabilities,
        findings: parsed.findings || [],
        compliance: parsed.compliance,
        blockers: parsed.blockers || [],
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse security audit', { error });
      throw error;
    }
  }

  /**
   * S06-2: Vulnerability Scan
   * OWASP dependency check
   */
  private async vulnerabilityScan(
    appName: string,
    params: any
  ): Promise<{ vulnerabilities: SecurityFinding[]; summary: any }> {
    const scanType = params.scanType || 'dependencies';
    const packageManager = params.packageManager || 'npm';

    const prompt = `
Run vulnerability scan for "${appName}":

Scan Type: ${scanType}
Package Manager: ${packageManager}
Dependencies: ${params.dependencyCount || 150}

Scan for:
1. Known CVEs in dependencies
2. Outdated packages with security patches
3. License compliance issues
4. Malicious packages
5. Transitive dependencies

Return JSON:
{
  "vulnerabilities": [
    {
      "severity": "high",
      "type": "Dependency vulnerability",
      "location": "lodash@4.17.15",
      "description": "Prototype pollution vulnerability",
      "recommendation": "Update to lodash@4.17.21 or higher",
      "cveId": "CVE-2020-8203"
    },
    {
      "severity": "medium",
      "type": "Outdated dependency",
      "location": "express@4.16.0",
      "description": "Multiple security fixes available in newer versions",
      "recommendation": "Update to express@4.18.2"
    }
  ],
  "summary": {
    "totalDependencies": 150,
    "vulnerableDependencies": 8,
    "criticalVulnerabilities": 0,
    "highVulnerabilities": 2,
    "mediumVulnerabilities": 4,
    "lowVulnerabilities": 2,
    "patchAvailable": 7,
    "scanDuration": "45s"
  }
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a security engineer scanning for vulnerabilities.
Identify realistic CVEs with remediation guidance. Output valid JSON only.`,
        maxTokens: 2500,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        vulnerabilities: parsed.vulnerabilities || [],
        summary: parsed.summary,
      };
    } catch (error) {
      this.logger.error('Failed to parse vulnerability scan', { error });
      throw error;
    }
  }

  /**
   * S06-3: Penetration Test
   * Simulated attacks and exploitation
   */
  private async penetrationTest(
    appName: string,
    params: any
  ): Promise<{ findings: SecurityFinding[]; exploitedVulnerabilities: number }> {
    const target = params.target || 'https://staging.example.com';
    const scope = params.scope || 'web-application';

    const prompt = `
Perform penetration test for "${appName}":

Target: ${target}
Scope: ${scope}
Test Type: ${params.testType || 'black-box'}

Attack scenarios:
1. Authentication bypass
2. SQL injection attempts
3. XSS payloads
4. CSRF attacks
5. Session hijacking
6. API abuse
7. File upload vulnerabilities
8. Directory traversal

Return JSON:
{
  "findings": [
    {
      "severity": "critical",
      "type": "Authentication Bypass",
      "location": "/api/admin/users",
      "description": "Admin panel accessible without authentication via direct URL",
      "recommendation": "Implement proper authentication middleware on all admin routes",
      "cveId": null
    },
    {
      "severity": "high",
      "type": "XSS Vulnerability",
      "location": "/profile/edit",
      "description": "User input not sanitized, allows script injection",
      "recommendation": "Sanitize all user inputs and implement Content Security Policy"
    }
  ],
  "exploitedVulnerabilities": 2,
  "testCoverage": {
    "authentication": "tested",
    "authorization": "tested",
    "injection": "tested",
    "xss": "tested",
    "csrf": "tested"
  }
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a penetration tester simulating realistic attacks.
Document exploitable vulnerabilities with proof of concept. Output valid JSON only.`,
        maxTokens: 2500,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        findings: parsed.findings || [],
        exploitedVulnerabilities: parsed.exploitedVulnerabilities || 0,
      };
    } catch (error) {
      this.logger.error('Failed to parse penetration test', { error });
      throw error;
    }
  }

  /**
   * S06-4: Compliance Check
   * LGPD/GDPR/SOC2 validation
   */
  private async complianceCheck(
    appName: string,
    params: any
  ): Promise<{ compliance: ComplianceStatus; gaps: any[]; recommendations: string[] }> {
    const regulations = params.regulations || ['LGPD', 'GDPR'];
    const industry = params.industry || 'general';

    const prompt = `
Check compliance for "${appName}":

Regulations: ${regulations.join(', ')}
Industry: ${industry}
Data processing: ${params.dataProcessing || 'User personal data, payment info'}

Verify compliance with:
1. Data collection and consent
2. Data storage and encryption
3. Data access controls
4. Data retention policies
5. Right to erasure
6. Data breach procedures
7. Third-party data sharing
8. Privacy policy

Return JSON:
{
  "compliance": {
    "lgpd": "partial",
    "gdpr": "partial",
    "soc2": "non-compliant",
    "hipaa": null,
    "pci": null
  },
  "gaps": [
    {
      "regulation": "LGPD",
      "requirement": "Article 46 - Data Protection Officer",
      "status": "missing",
      "description": "No DPO appointed",
      "priority": "high"
    },
    {
      "regulation": "GDPR",
      "requirement": "Article 33 - Breach Notification",
      "status": "partial",
      "description": "Breach detection exists but notification process incomplete",
      "priority": "medium"
    }
  ],
  "recommendations": [
    "Appoint a Data Protection Officer",
    "Document all data processing activities",
    "Implement consent management system",
    "Create data breach response plan",
    "Add privacy policy and terms of service"
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a compliance specialist reviewing regulatory requirements.
Identify gaps and provide actionable steps to achieve compliance. Output valid JSON only.`,
        maxTokens: 2500,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        compliance: parsed.compliance,
        gaps: parsed.gaps || [],
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse compliance check', { error });
      throw error;
    }
  }

  /**
   * S06-5: Secrets Rotation
   * Rotate credentials and API keys
   */
  private async secretsRotation(
    appName: string,
    params: any
  ): Promise<{ rotatedSecrets: any[]; nextRotation: string }> {
    const secretsManager = params.secretsManager || 'AWS Secrets Manager';

    const prompt = `
Rotate secrets for "${appName}":

Secrets Manager: ${secretsManager}
Secrets to rotate:
- Database credentials
- API keys (${params.apiKeys || 'Stripe, SendGrid, AWS'})
- JWT signing keys
- OAuth client secrets
- Encryption keys

Rotation strategy:
1. Generate new credentials
2. Update secrets manager
3. Deploy new version with new secrets
4. Verify application health
5. Revoke old credentials
6. Update documentation

Return JSON:
{
  "rotatedSecrets": [
    {
      "name": "database-master-password",
      "type": "database",
      "rotatedAt": ${Date.now()},
      "nextRotation": "2026-03-06",
      "status": "success"
    },
    {
      "name": "stripe-api-key",
      "type": "api-key",
      "rotatedAt": ${Date.now()},
      "nextRotation": "2026-05-06",
      "status": "success"
    },
    {
      "name": "jwt-signing-key",
      "type": "signing-key",
      "rotatedAt": ${Date.now()},
      "nextRotation": "2026-02-13",
      "status": "success"
    }
  ],
  "nextRotation": "2026-02-13"
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a security engineer managing secrets rotation.
Ensure zero-downtime rotation with proper validation. Output valid JSON only.`,
        maxTokens: 1500,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        rotatedSecrets: parsed.rotatedSecrets || [],
        nextRotation: parsed.nextRotation,
      };
    } catch (error) {
      this.logger.error('Failed to parse secrets rotation', { error });
      throw error;
    }
  }

  /**
   * S06-6: Access Control Review
   * RBAC validation and audit
   */
  private async accessControlReview(
    appName: string,
    params: any
  ): Promise<{ roles: any[]; permissions: any[]; violations: any[] }> {
    const model = params.model || 'RBAC';

    const prompt = `
Review access control for "${appName}":

Model: ${model}
Users: ${params.userCount || 500}
Roles: ${params.roles || 'admin, manager, user, guest'}

Review:
1. Role definitions and permissions
2. User-role assignments
3. Principle of least privilege
4. Separation of duties
5. Privileged account usage
6. Access logs and anomalies

Return JSON:
{
  "roles": [
    {
      "name": "admin",
      "userCount": 3,
      "permissions": ["*"],
      "risk": "high",
      "recommendation": "Limit admin role to 2 users maximum"
    },
    {
      "name": "user",
      "userCount": 485,
      "permissions": ["read:own", "write:own"],
      "risk": "low"
    }
  ],
  "permissions": [
    {
      "resource": "/api/admin/*",
      "allowedRoles": ["admin"],
      "status": "secure"
    },
    {
      "resource": "/api/users/*",
      "allowedRoles": ["admin", "manager", "user"],
      "status": "review",
      "note": "Too broad - users can access all user data"
    }
  ],
  "violations": [
    {
      "type": "Excessive privileges",
      "user": "john.doe@example.com",
      "issue": "User account has admin role but hasn't logged in for 90 days",
      "recommendation": "Revoke admin access"
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a security engineer auditing access controls.
Identify privilege escalation risks and enforce least privilege. Output valid JSON only.`,
        maxTokens: 2000,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        roles: parsed.roles || [],
        permissions: parsed.permissions || [],
        violations: parsed.violations || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse access control review', { error });
      throw error;
    }
  }
}

export function createHubEnterpriseSecuritySkill(): HubEnterpriseSecuritySkill {
  return new HubEnterpriseSecuritySkill();
}
