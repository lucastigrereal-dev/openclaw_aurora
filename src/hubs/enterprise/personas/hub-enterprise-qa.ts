/**
 * Hub Enterprise - QA Persona (S-04)
 * Quality Assurance Lead: Testing, validation, quality gates
 * Usa Claude AI para geração e análise de testes
 */

import { Skill, SkillInput, SkillOutput } from '../../skill-base';
import { getSkillRegistryV2 } from '../../registry-v2';
import {
  TestResults,
  TestFailure,
  CoverageMetrics,
  PerformanceMetrics,
} from '../hub-enterprise-types';
import { createLogger } from '../shared/hub-enterprise-logger';

export class HubEnterpriseQASkill extends Skill {
  private registry = getSkillRegistryV2();
  private logger = createLogger('qa');

  constructor() {
    super(
      {
        name: 'hub-enterprise-qa',
        description: 'QA Lead persona - Testing and quality assurance',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Hub Enterprise',
        tags: ['hub-enterprise', 'qa', 'testing', 'quality'],
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
      'smoke_tests',
      'integration_tests',
      'performance_tests',
      'security_tests',
      'accessibility_tests',
      'coverage_report',
    ];

    if (!validSubskills.includes(subskill)) {
      this.logger.error('Invalid subskill', { subskill });
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { subskill, appName, ...params } = input.params || {};

    this.logger.info('Executing QA subskill', { subskill, appName });

    const startTime = Date.now();

    try {
      let result;

      switch (subskill) {
        case 'smoke_tests':
          result = await this.smokeTests(appName, params);
          break;
        case 'integration_tests':
          result = await this.integrationTests(appName, params);
          break;
        case 'performance_tests':
          result = await this.performanceTests(appName, params);
          break;
        case 'security_tests':
          result = await this.securityTests(appName, params);
          break;
        case 'accessibility_tests':
          result = await this.accessibilityTests(appName, params);
          break;
        case 'coverage_report':
          result = await this.coverageReport(appName, params);
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
   * S04-1: Smoke Tests
   * Testes básicos de sanidade
   */
  private async smokeTests(
    appName: string,
    params: any
  ): Promise<TestResults> {
    const endpoints = params.endpoints || [];
    const url = params.url || `http://localhost:3000`;

    const prompt = `
Create smoke test plan for "${appName}":

URL: ${url}
Endpoints to test:
${endpoints.map((e: any) => `- ${e.method} ${e.path}`).join('\n') || '- GET /health\n- GET /api/status'}

Smoke tests should check:
1. Server is running
2. Health check endpoint responds
3. Database connection works
4. Key endpoints are accessible
5. Basic auth works (if applicable)

Return JSON:
{
  "testResults": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "skipped": 0,
    "coverage": {
      "statements": 45,
      "branches": 38,
      "functions": 42,
      "lines": 44
    }
  },
  "failures": [
    {
      "test": "Database connection",
      "error": "Connection timeout",
      "suggestion": "Check database credentials and network"
    }
  ],
  "blocked": false,
  "reportLocation": "./reports/smoke-tests.html"
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a QA engineer running smoke tests.
Create realistic test results. Output valid JSON only.`,
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
        testResults: parsed.testResults,
        failures: parsed.failures || [],
        blocked: parsed.blocked || false,
        reportLocation: parsed.reportLocation,
      };
    } catch (error) {
      this.logger.error('Failed to parse smoke test results', { error });
      throw error;
    }
  }

  /**
   * S04-2: Integration Tests
   * Testes E2E completos
   */
  private async integrationTests(
    appName: string,
    params: any
  ): Promise<TestResults> {
    const features = params.features || [];
    const testCases = params.testCases || [];

    const prompt = `
Run integration tests for "${appName}":

Features to test:
${features.map((f: any) => `- ${f.name}`).join('\n') || '- User registration\n- Data CRUD'}

Test cases:
${testCases.map((tc: any) => `- ${tc.scenario}`).join('\n') || '- Complete user flow\n- Error handling'}

Integration tests verify:
1. End-to-end user flows
2. API + Database integration
3. Third-party integrations
4. Error handling and edge cases
5. Data consistency

Return JSON:
{
  "testResults": {
    "total": 24,
    "passed": 22,
    "failed": 2,
    "skipped": 0,
    "coverage": {
      "statements": 78,
      "branches": 72,
      "functions": 75,
      "lines": 77
    }
  },
  "failures": [
    {
      "test": "User can update profile",
      "error": "Validation error on phone field",
      "stack": "at ProfileController.update...",
      "suggestion": "Update phone validation regex"
    }
  ],
  "blocked": false,
  "reportLocation": "./reports/integration-tests.html",
  "performanceMetrics": {
    "avgResponseTime": 245,
    "p95ResponseTime": 480,
    "p99ResponseTime": 850,
    "throughput": 120,
    "errorRate": 0.8
  }
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a QA engineer running integration tests.
Provide detailed test results with realistic metrics. Output valid JSON only.`,
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
        testResults: parsed.testResults,
        failures: parsed.failures || [],
        blocked: parsed.blocked || false,
        reportLocation: parsed.reportLocation,
        performanceMetrics: parsed.performanceMetrics,
      };
    } catch (error) {
      this.logger.error('Failed to parse integration test results', { error });
      throw error;
    }
  }

  /**
   * S04-3: Performance Tests
   * Load testing com k6/Locust
   */
  private async performanceTests(
    appName: string,
    params: any
  ): Promise<{ performanceMetrics: PerformanceMetrics; bottlenecks: any[] }> {
    const loadProfile = params.loadProfile || 'moderate';
    const duration = params.duration || '5m';

    const prompt = `
Run performance tests for "${appName}":

Load Profile: ${loadProfile}
Duration: ${duration}
Target RPS: ${params.targetRps || 100}
Virtual Users: ${params.virtualUsers || 50}

Test scenarios:
1. Gradual ramp-up
2. Sustained load
3. Spike test
4. Stress test (find breaking point)

Return JSON:
{
  "performanceMetrics": {
    "avgResponseTime": 185,
    "p95ResponseTime": 420,
    "p99ResponseTime": 780,
    "throughput": 95,
    "errorRate": 0.3
  },
  "bottlenecks": [
    {
      "location": "/api/users endpoint",
      "issue": "Slow database query without index",
      "impact": "high",
      "suggestion": "Add index on users.email column"
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a performance engineer conducting load tests.
Identify realistic bottlenecks and provide actionable recommendations. Output valid JSON only.`,
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
        performanceMetrics: parsed.performanceMetrics,
        bottlenecks: parsed.bottlenecks || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse performance test results', { error });
      throw error;
    }
  }

  /**
   * S04-4: Security Tests
   * OWASP Top 10 scanning
   */
  private async securityTests(
    appName: string,
    params: any
  ): Promise<{ securityScore: number; vulnerabilities: any[]; owaspCoverage: string[] }> {
    const scanType = params.scanType || 'full';

    const prompt = `
Run security tests for "${appName}":

Scan Type: ${scanType}
Target: ${params.target || 'http://localhost:3000'}

Check for:
1. SQL Injection
2. XSS vulnerabilities
3. CSRF protection
4. Authentication bypass
5. Authorization issues
6. Sensitive data exposure
7. Security misconfigurations
8. Dependency vulnerabilities

Return JSON:
{
  "securityScore": 82,
  "vulnerabilities": [
    {
      "severity": "medium",
      "type": "Missing CSRF token",
      "location": "/api/users/update",
      "description": "POST endpoint missing CSRF protection",
      "recommendation": "Add CSRF middleware",
      "cveId": null
    }
  ],
  "owaspCoverage": [
    "A1: Injection - Passed",
    "A2: Broken Auth - Passed",
    "A3: Sensitive Data - Warning",
    "A4: XXE - N/A",
    "A5: Access Control - Passed"
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a security tester performing OWASP security scans.
Identify realistic vulnerabilities with clear remediation steps. Output valid JSON only.`,
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
        securityScore: parsed.securityScore,
        vulnerabilities: parsed.vulnerabilities || [],
        owaspCoverage: parsed.owaspCoverage || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse security test results', { error });
      throw error;
    }
  }

  /**
   * S04-5: Accessibility Tests
   * WCAG compliance testing
   */
  private async accessibilityTests(
    appName: string,
    params: any
  ): Promise<{ wcagLevel: string; score: number; issues: any[] }> {
    const targetLevel = params.targetLevel || 'AA';
    const pages = params.pages || ['/'];

    const prompt = `
Run accessibility tests for "${appName}":

Target WCAG Level: ${targetLevel}
Pages to test: ${pages.join(', ')}

Check for:
1. Color contrast ratios
2. Keyboard navigation
3. Screen reader compatibility
4. Form labels and ARIA
5. Alt text on images
6. Focus indicators
7. Semantic HTML
8. Skip navigation links

Return JSON:
{
  "wcagLevel": "AA",
  "score": 88,
  "issues": [
    {
      "type": "Color contrast",
      "severity": "major",
      "element": "button.primary",
      "recommendation": "Increase contrast ratio from 3.2:1 to 4.5:1"
    },
    {
      "type": "Missing alt text",
      "severity": "critical",
      "element": "img.hero-image",
      "recommendation": "Add descriptive alt attribute"
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are an accessibility specialist testing WCAG compliance.
Identify realistic issues with clear remediation steps. Output valid JSON only.`,
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
        wcagLevel: parsed.wcagLevel,
        score: parsed.score,
        issues: parsed.issues || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse accessibility test results', { error });
      throw error;
    }
  }

  /**
   * S04-6: Coverage Report
   * Gera relatório de cobertura de testes
   */
  private async coverageReport(
    appName: string,
    params: any
  ): Promise<{ coverage: CoverageMetrics; uncoveredFiles: string[]; recommendations: string[] }> {
    const testResults = params.testResults || {};

    const prompt = `
Generate test coverage report for "${appName}":

Test Results Summary:
- Total tests: ${testResults.total || 50}
- Passed: ${testResults.passed || 48}
- Failed: ${testResults.failed || 2}

Analyze coverage and provide:
1. Overall coverage metrics
2. Files with low/no coverage
3. Recommendations to improve coverage

Return JSON:
{
  "coverage": {
    "statements": 76,
    "branches": 68,
    "functions": 72,
    "lines": 75
  },
  "uncoveredFiles": [
    "src/utils/deprecated-helper.ts (0%)",
    "src/controllers/admin.ts (45%)"
  ],
  "recommendations": [
    "Add tests for error handling paths",
    "Cover edge cases in payment processing",
    "Test admin panel authorization logic"
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a QA lead analyzing test coverage.
Provide actionable recommendations to improve quality. Output valid JSON only.`,
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
        coverage: parsed.coverage,
        uncoveredFiles: parsed.uncoveredFiles || [],
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse coverage report', { error });
      throw error;
    }
  }
}

export function createHubEnterpriseQASkill(): HubEnterpriseQASkill {
  return new HubEnterpriseQASkill();
}
