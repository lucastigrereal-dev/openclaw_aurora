/**
 * Hub Enterprise - ENGENHARIA Persona (S-03)
 * Engineering Lead: Code generation, CI/CD, infrastructure setup
 * Usa Claude AI para scaffolding e implementação
 */

import { Skill, SkillInput, SkillOutput } from '../../skill-base';
import { getSkillRegistryV2 } from '../../registry-v2';
import {
  CodeGenerationOutput,
  CodeFile,
  ApiEndpoint,
} from '../hub-enterprise-types';
import { createLogger } from '../shared/hub-enterprise-logger';

export class HubEnterpriseEngenhariaSkill extends Skill {
  private registry = getSkillRegistryV2();
  private logger = createLogger('engenharia');

  constructor() {
    super(
      {
        name: 'hub-enterprise-engenharia',
        description: 'Engineering Lead persona - Code generation and infrastructure',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Hub Enterprise',
        tags: ['hub-enterprise', 'engineering', 'code', 'ci-cd'],
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
      'scaffold_app',
      'setup_database',
      'setup_cicd',
      'generate_api',
      'setup_auth',
      'setup_monitoring',
      'generate_tests',
    ];

    if (!validSubskills.includes(subskill)) {
      this.logger.error('Invalid subskill', { subskill });
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { subskill, appName, ...params } = input.params || {};

    this.logger.info('Executing Engenharia subskill', { subskill, appName });

    const startTime = Date.now();

    try {
      let result;

      switch (subskill) {
        case 'scaffold_app':
          result = await this.scaffoldApp(appName, params);
          break;
        case 'setup_database':
          result = await this.setupDatabase(appName, params);
          break;
        case 'setup_cicd':
          result = await this.setupCicd(appName, params);
          break;
        case 'generate_api':
          result = await this.generateApi(appName, params);
          break;
        case 'setup_auth':
          result = await this.setupAuth(appName, params);
          break;
        case 'setup_monitoring':
          result = await this.setupMonitoring(appName, params);
          break;
        case 'generate_tests':
          result = await this.generateTests(appName, params);
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
   * S03-1: Scaffold App
   * Cria estrutura inicial da aplicação
   */
  private async scaffoldApp(
    appName: string,
    params: any
  ): Promise<CodeGenerationOutput> {
    const techStack = params.techStack || {};
    const features = params.features || [];

    const prompt = `
Generate a complete app scaffold for "${appName}":

Tech Stack:
- Backend: ${techStack.backend?.join(', ') || 'Node.js, Express'}
- Frontend: ${techStack.frontend?.join(', ') || 'React'}
- Database: ${techStack.database?.join(', ') || 'PostgreSQL'}

Features to include:
${features.map((f: any) => `- ${f.name}`).join('\n') || '- User authentication\n- CRUD operations'}

Generate file structure with:
1. Backend API structure
2. Frontend component structure
3. Database connection setup
4. Environment configuration
5. Package.json with dependencies
6. README with setup instructions

Return JSON:
{
  "appLocation": "./apps/${appName}",
  "filesCreated": [
    { "path": "src/index.ts", "size": 1024 },
    { "path": "package.json", "size": 512 }
  ],
  "endpoints": [],
  "databaseTables": [],
  "nextSteps": [
    "npm install",
    "npm run dev"
  ],
  "integrations": []
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a senior engineer setting up new projects.
Create clean, maintainable project structures following best practices.
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
        appLocation: parsed.appLocation || `./apps/${appName}`,
        filesCreated: parsed.filesCreated || [],
        endpoints: parsed.endpoints || [],
        databaseTables: parsed.databaseTables || [],
        nextSteps: parsed.nextSteps || [],
        integrations: parsed.integrations || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse scaffold output', { error });
      throw error;
    }
  }

  /**
   * S03-2: Setup Database
   * Configura banco de dados e migrations
   */
  private async setupDatabase(
    appName: string,
    params: any
  ): Promise<{ config: any; migrations: string[]; seedData: any }> {
    const dbType = params.dbType || 'PostgreSQL';
    const dataModel = params.dataModel || {};

    const prompt = `
Setup database configuration for "${appName}":

Database: ${dbType}
Data Model: ${JSON.stringify(dataModel, null, 2)}

Generate:
1. Database connection configuration
2. Migration scripts for all tables
3. Seed data for development
4. Database utility functions (query helpers)

Return JSON:
{
  "config": {
    "host": "localhost",
    "port": 5432,
    "database": "${appName}",
    "connectionString": "postgresql://...",
    "poolSize": 10
  },
  "migrations": [
    "001_create_users_table.sql",
    "002_create_posts_table.sql"
  ],
  "seedData": {
    "users": [{ "email": "admin@example.com", "role": "admin" }]
  }
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a database engineer. Setup production-ready database configurations.
Output valid JSON only.`,
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
        config: parsed.config,
        migrations: parsed.migrations || [],
        seedData: parsed.seedData || {},
      };
    } catch (error) {
      this.logger.error('Failed to parse database setup', { error });
      throw error;
    }
  }

  /**
   * S03-3: Setup CI/CD
   * Configura pipelines de CI/CD
   */
  private async setupCicd(
    appName: string,
    params: any
  ): Promise<{ cicdConfig: any; workflows: string[] }> {
    const provider = params.cicdProvider || 'GitHub Actions';
    const deployTarget = params.deployTarget || 'Railway';

    const prompt = `
Setup CI/CD pipeline for "${appName}":

Provider: ${provider}
Deploy Target: ${deployTarget}
Environment: ${params.environment || 'staging, production'}

Create pipeline with:
1. Linting and formatting
2. Unit tests
3. Integration tests
4. Build step
5. Deploy to staging (on PR)
6. Deploy to production (on merge to main)
7. Rollback capability

Return JSON:
{
  "cicdConfig": {
    "provider": "${provider}",
    "configFile": ".github/workflows/deploy.yml",
    "triggers": ["push", "pull_request"],
    "environments": ["staging", "production"]
  },
  "workflows": [
    "test-and-build",
    "deploy-staging",
    "deploy-production"
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a DevOps engineer. Create robust CI/CD pipelines.
Output valid JSON only.`,
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
        cicdConfig: parsed.cicdConfig,
        workflows: parsed.workflows || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse CI/CD setup', { error });
      throw error;
    }
  }

  /**
   * S03-4: Generate API
   * Gera endpoints REST ou GraphQL
   */
  private async generateApi(
    appName: string,
    params: any
  ): Promise<{ endpoints: ApiEndpoint[]; documentation: string }> {
    const apiType = params.apiType || 'REST';
    const features = params.features || [];

    const prompt = `
Generate ${apiType} API implementation for "${appName}":

Features:
${features.map((f: any) => `- ${f.name}: ${f.description || ''}`).join('\n')}

Create:
1. Route handlers
2. Controllers
3. Validators
4. Error handling
5. API documentation

Return JSON:
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/users",
      "description": "List all users",
      "auth": "jwt",
      "requestBody": null,
      "responseBody": "{ users: User[] }"
    }
  ],
  "documentation": "OpenAPI/GraphQL schema as string"
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a backend engineer. Create RESTful or GraphQL APIs following best practices.
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
        endpoints: parsed.endpoints || [],
        documentation: parsed.documentation || '',
      };
    } catch (error) {
      this.logger.error('Failed to parse API generation', { error });
      throw error;
    }
  }

  /**
   * S03-5: Setup Auth
   * Implementa autenticação JWT/OAuth
   */
  private async setupAuth(
    appName: string,
    params: any
  ): Promise<{ authConfig: any; endpoints: ApiEndpoint[] }> {
    const authType = params.authType || 'JWT';

    const prompt = `
Setup authentication for "${appName}":

Auth Type: ${authType}
Providers: ${params.providers || 'Email/Password'}
Features: ${params.features || 'Login, Register, Password Reset'}

Implement:
1. Auth middleware
2. Token generation/validation
3. Password hashing
4. Session management
5. Auth endpoints

Return JSON:
{
  "authConfig": {
    "type": "${authType}",
    "tokenExpiry": "24h",
    "refreshTokenExpiry": "30d",
    "passwordPolicy": "min 8 chars, 1 uppercase, 1 number",
    "providers": ["email", "google", "github"]
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/auth/login",
      "description": "User login",
      "auth": "public",
      "requestBody": "{ email, password }",
      "responseBody": "{ token, refreshToken }"
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a security engineer. Implement secure authentication systems.
Output valid JSON only.`,
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
        authConfig: parsed.authConfig,
        endpoints: parsed.endpoints || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse auth setup', { error });
      throw error;
    }
  }

  /**
   * S03-6: Setup Monitoring
   * Configura Prometheus/Grafana
   */
  private async setupMonitoring(
    appName: string,
    params: any
  ): Promise<{ monitoringConfig: any; dashboards: any[] }> {
    const tools = params.tools || ['Prometheus', 'Grafana'];

    const prompt = `
Setup monitoring for "${appName}":

Tools: ${tools.join(', ')}
Metrics to track:
- Request rate and latency
- Error rate
- CPU/Memory usage
- Database performance
- Custom business metrics

Create:
1. Prometheus configuration
2. Grafana dashboards
3. Alert rules
4. Health check endpoints

Return JSON:
{
  "monitoringConfig": {
    "prometheus": {
      "scrapeInterval": "15s",
      "targets": ["localhost:9090"]
    },
    "grafana": {
      "port": 3000,
      "datasources": ["prometheus"]
    },
    "alerts": [
      { "name": "High Error Rate", "condition": "error_rate > 0.05", "severity": "critical" }
    ]
  },
  "dashboards": [
    { "name": "API Performance", "panels": 8 }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are an SRE engineer. Setup comprehensive monitoring systems.
Output valid JSON only.`,
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
        monitoringConfig: parsed.monitoringConfig,
        dashboards: parsed.dashboards || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse monitoring setup', { error });
      throw error;
    }
  }

  /**
   * S03-7: Generate Tests
   * Cria testes unitários e de integração
   */
  private async generateTests(
    appName: string,
    params: any
  ): Promise<{ testSuites: any[]; coverageTarget: number }> {
    const endpoints = params.endpoints || [];
    const components = params.components || [];

    const prompt = `
Generate test suites for "${appName}":

Endpoints to test:
${endpoints.map((e: any) => `- ${e.method} ${e.path}`).join('\n') || '- /api/users'}

Components to test:
${components.map((c: any) => `- ${c.name}`).join('\n') || '- UserList, UserForm'}

Create:
1. Unit tests for business logic
2. Integration tests for API endpoints
3. E2E tests for critical flows
4. Test fixtures and mocks
5. Coverage configuration (target 80%+)

Return JSON:
{
  "testSuites": [
    {
      "name": "API Tests",
      "type": "integration",
      "framework": "Jest",
      "files": ["users.test.ts", "posts.test.ts"],
      "estimatedTests": 24
    }
  ],
  "coverageTarget": 80
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a QA engineer. Create comprehensive test suites.
Output valid JSON only.`,
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
        testSuites: parsed.testSuites || [],
        coverageTarget: parsed.coverageTarget || 80,
      };
    } catch (error) {
      this.logger.error('Failed to parse test generation', { error });
      throw error;
    }
  }
}

export function createHubEnterpriseEngenhariaSkill(): HubEnterpriseEngenhariaSkill {
  return new HubEnterpriseEngenhariaSkill();
}
