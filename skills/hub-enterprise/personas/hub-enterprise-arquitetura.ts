/**
 * Hub Enterprise - ARQUITETURA Persona (S-02)
 * Solutions Architect: System design, tech stack, API contracts, scaling
 * Usa Claude AI para design inteligente de arquitetura
 */

import { Skill, SkillInput, SkillOutput } from '../../skill-base';
import { getSkillRegistryV2 } from '../../registry-v2';
import {
  ArchitectureDefinition,
  ArchitectureComponent,
  Integration,
  ArchitectureDecision,
} from '../hub-enterprise-types';
import { createLogger } from '../shared/hub-enterprise-logger';

export class HubEnterpriseArquiteturaSkill extends Skill {
  private registry = getSkillRegistryV2();
  private logger = createLogger('arquitetura');

  constructor() {
    super(
      {
        name: 'hub-enterprise-arquitetura',
        description: 'Solutions Architect persona - System design and architecture',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Hub Enterprise',
        tags: ['hub-enterprise', 'architecture', 'design', 'scalability'],
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
      'design_architecture',
      'select_tech_stack',
      'define_api_contracts',
      'plan_scaling',
      'design_data_model',
      'security_review',
    ];

    if (!validSubskills.includes(subskill)) {
      this.logger.error('Invalid subskill', { subskill });
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { subskill, appName, ...params } = input.params || {};

    this.logger.info('Executing Arquitetura subskill', { subskill, appName });

    const startTime = Date.now();

    try {
      let result;

      switch (subskill) {
        case 'design_architecture':
          result = await this.designArchitecture(appName, params);
          break;
        case 'select_tech_stack':
          result = await this.selectTechStack(appName, params);
          break;
        case 'define_api_contracts':
          result = await this.defineApiContracts(appName, params);
          break;
        case 'plan_scaling':
          result = await this.planScaling(appName, params);
          break;
        case 'design_data_model':
          result = await this.designDataModel(appName, params);
          break;
        case 'security_review':
          result = await this.securityReview(appName, params);
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
   * S02-1: Design Architecture
   * Cria diagrama e definição de arquitetura do sistema
   */
  private async designArchitecture(
    appName: string,
    params: any
  ): Promise<ArchitectureDefinition> {
    const prompt = `
Design a complete system architecture for "${appName}":

Requirements:
${params.requirements ? JSON.stringify(params.requirements) : 'Standard web application'}
Expected Load: ${params.expectedLoad || '1000 req/min'}
Budget: ${params.budget || 'Medium'}
Team Size: ${params.teamSize || '3-5 engineers'}

Create a detailed architecture including:
1. Pattern: monolith/microservices/serverless/hybrid
2. Components: List all major components with tech, purpose, replicas
3. Data Flow: Describe how data flows through the system
4. Integrations: External services and APIs
5. ADRs: 3-5 Architecture Decision Records with rationale

Output as JSON:
{
  "architecture": {
    "pattern": "...",
    "components": [{ "name": "...", "tech": "...", "purpose": "...", "replicas": 1 }],
    "dataFlow": "...",
    "integrations": [{ "service": "...", "protocol": "...", "authentication": "..." }]
  },
  "techStack": {
    "backend": [],
    "frontend": [],
    "database": [],
    "infrastructure": []
  },
  "adrs": [{ "decision": "...", "rationale": "...", "alternatives": [], "consequences": "..." }]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are an expert Solutions Architect. Design scalable, maintainable systems.
Always output valid JSON. No markdown or explanations outside JSON.`,
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
        architecture: parsed.architecture,
        techStack: parsed.techStack,
        adrs: parsed.adrs || [],
        scalingPlan: 'Horizontal scaling with load balancer',
        securityArchitecture: 'Defense in depth with WAF, encryption, RBAC',
      };
    } catch (error) {
      this.logger.error('Failed to parse architecture design', { error });
      throw error;
    }
  }

  /**
   * S02-2: Select Tech Stack
   * Escolhe tecnologias baseado em requisitos
   */
  private async selectTechStack(
    appName: string,
    params: any
  ): Promise<{ techStack: any; justification: string }> {
    const prompt = `
Select the optimal tech stack for "${appName}":

Requirements:
- Type: ${params.appType || 'web application'}
- Scale: ${params.scale || 'medium'}
- Team Experience: ${params.teamExperience || 'intermediate'}
- Constraints: ${params.constraints ? JSON.stringify(params.constraints) : 'none'}

Recommend specific technologies for:
1. Backend framework
2. Frontend framework
3. Database (primary + cache)
4. Infrastructure/hosting
5. CI/CD tools
6. Monitoring tools

Return JSON:
{
  "techStack": {
    "backend": ["Node.js", "Express"],
    "frontend": ["React", "TailwindCSS"],
    "database": ["PostgreSQL", "Redis"],
    "infrastructure": ["AWS", "Docker", "Kubernetes"],
    "cicd": ["GitHub Actions"],
    "monitoring": ["Prometheus", "Grafana"]
  },
  "justification": "Detailed explanation of choices..."
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a tech lead selecting appropriate technologies.
Consider scalability, maintainability, team experience, and cost.
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
        techStack: parsed.techStack,
        justification: parsed.justification,
      };
    } catch (error) {
      this.logger.error('Failed to parse tech stack', { error });
      throw error;
    }
  }

  /**
   * S02-3: Define API Contracts
   * Cria OpenAPI ou GraphQL schemas
   */
  private async defineApiContracts(
    appName: string,
    params: any
  ): Promise<{ apiType: string; schema: any; endpoints: any[] }> {
    const apiType = params.apiType || 'REST';
    const features = params.features || [];

    const prompt = `
Create ${apiType} API contracts for "${appName}":

Features to expose:
${features.map((f: any) => `- ${f.name}: ${f.description}`).join('\n')}

${
  apiType === 'REST'
    ? `Generate OpenAPI 3.0 schema with:
- Paths and operations
- Request/response schemas
- Authentication
- Rate limiting`
    : `Generate GraphQL schema with:
- Types
- Queries
- Mutations
- Subscriptions (if needed)`
}

Return JSON:
{
  "apiType": "REST" or "GraphQL",
  "schema": { OpenAPI or GraphQL schema },
  "endpoints": [
    {
      "method": "GET/POST/etc",
      "path": "/api/...",
      "description": "...",
      "auth": "public/jwt/oauth",
      "requestBody": "...",
      "responseBody": "..."
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are an API architect. Design clean, RESTful or GraphQL APIs.
Follow industry best practices. Output valid JSON.`,
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
        apiType: parsed.apiType || apiType,
        schema: parsed.schema,
        endpoints: parsed.endpoints || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse API contracts', { error });
      throw error;
    }
  }

  /**
   * S02-4: Plan Scaling
   * Define estratégia de escalabilidade
   */
  private async planScaling(
    appName: string,
    params: any
  ): Promise<{ scalingStrategy: any; capacityPlan: any }> {
    const prompt = `
Create a scaling strategy for "${appName}":

Current Stats:
- Users: ${params.currentUsers || 1000}
- Requests/min: ${params.currentRpm || 500}
- Data Size: ${params.dataSize || '10GB'}

Growth Projections:
- Expected growth: ${params.growth || '50% per quarter'}
- Peak load multiplier: ${params.peakMultiplier || '3x'}

Plan for:
1. Horizontal vs Vertical scaling approach
2. Auto-scaling rules and thresholds
3. Database scaling (read replicas, sharding)
4. Caching strategy
5. CDN usage
6. Load balancing approach

Return JSON:
{
  "scalingStrategy": {
    "approach": "horizontal/vertical/hybrid",
    "autoScaling": { "minInstances": 2, "maxInstances": 10, "targetCPU": 70 },
    "database": "...",
    "caching": "...",
    "cdn": "...",
    "loadBalancing": "..."
  },
  "capacityPlan": {
    "currentCapacity": "...",
    "6MonthsForecast": "...",
    "12MonthsForecast": "...",
    "estimatedCost": "..."
  }
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a scalability expert. Plan for growth while optimizing costs.
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
        scalingStrategy: parsed.scalingStrategy,
        capacityPlan: parsed.capacityPlan,
      };
    } catch (error) {
      this.logger.error('Failed to parse scaling plan', { error });
      throw error;
    }
  }

  /**
   * S02-5: Design Data Model
   * Cria database schema otimizado
   */
  private async designDataModel(
    appName: string,
    params: any
  ): Promise<{ dataModel: any; migrations: string[] }> {
    const entities = params.entities || [];

    const prompt = `
Design a database schema for "${appName}":

Entities needed:
${entities.map((e: any) => `- ${e.name}: ${e.description || ''}`).join('\n')}

Database Type: ${params.dbType || 'PostgreSQL'}

Create:
1. Tables with columns, types, constraints
2. Relationships (1:1, 1:N, M:N)
3. Indexes for performance
4. Denormalization strategy if needed
5. Migration scripts

Return JSON:
{
  "dataModel": {
    "tables": [
      {
        "name": "users",
        "columns": [
          { "name": "id", "type": "uuid", "primaryKey": true },
          { "name": "email", "type": "varchar(255)", "unique": true }
        ],
        "indexes": ["email"],
        "relationships": []
      }
    ]
  },
  "migrations": ["CREATE TABLE users (...)", "CREATE INDEX ..."]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a database architect. Design normalized, performant schemas.
Include proper indexes and constraints. Output valid JSON.`,
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
        dataModel: parsed.dataModel,
        migrations: parsed.migrations || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse data model', { error });
      throw error;
    }
  }

  /**
   * S02-6: Security Review
   * Analisa segurança da arquitetura
   */
  private async securityReview(
    appName: string,
    params: any
  ): Promise<{ securityReport: any; recommendations: string[] }> {
    const architecture = params.architecture || {};

    const prompt = `
Perform a security review of the architecture for "${appName}":

Architecture Summary:
${JSON.stringify(architecture, null, 2)}

Review:
1. Authentication & Authorization
2. Data encryption (at rest and in transit)
3. Network security
4. API security
5. Secret management
6. OWASP Top 10 coverage
7. Compliance requirements

Return JSON:
{
  "securityReport": {
    "score": 85,
    "authentication": { "status": "good/needs-work/missing", "notes": "..." },
    "encryption": { "status": "...", "notes": "..." },
    "networkSecurity": { "status": "...", "notes": "..." },
    "apiSecurity": { "status": "...", "notes": "..." },
    "secretManagement": { "status": "...", "notes": "..." },
    "owaspCoverage": ["A1: Injection", "A2: ..."]
  },
  "recommendations": [
    "Implement rate limiting on all public endpoints",
    "Enable WAF for DDoS protection"
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a security architect. Identify vulnerabilities and recommend mitigations.
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
        securityReport: parsed.securityReport,
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse security review', { error });
      throw error;
    }
  }
}

export function createHubEnterpriseArquiteturaSkill(): HubEnterpriseArquiteturaSkill {
  return new HubEnterpriseArquiteturaSkill();
}
