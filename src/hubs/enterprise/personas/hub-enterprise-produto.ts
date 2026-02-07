/**
 * Hub Enterprise - PRODUTO Persona (S-01)
 * Product Owner: MVP definition, feature scoping, business requirements
 * Usa Claude AI para análise inteligente de requisitos
 */

import { Skill, SkillInput, SkillOutput } from '../../skill-base';
import { getSkillRegistryV2 } from '../../registry-v2';
import {
  MVPDefinition,
  Feature,
  AcceptanceCriteria,
  Risk,
} from '../hub-enterprise-types';
import { createLogger } from '../shared/hub-enterprise-logger';

export class HubEnterpriseProdutoSkill extends Skill {
  private registry = getSkillRegistryV2();
  private logger = createLogger('produto');

  constructor() {
    super(
      {
        name: 'hub-enterprise-produto',
        description: 'Product Owner persona - MVP definition and requirements',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Hub Enterprise',
        tags: ['hub-enterprise', 'product', 'mvp', 'requirements'],
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
    const userIntent = input.params?.userIntent;

    if (!subskill || !appName) {
      this.logger.error('Missing required parameters', {
        subskill,
        appName,
      });
      return false;
    }

    // userIntent é necessário para algumas subskills
    if (['mvp_definition', 'user_stories'].includes(subskill) && !userIntent) {
      this.logger.error('Missing userIntent for subskill', { subskill });
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { subskill, appName, userIntent, ...params } = input.params || {};

    this.logger.info('Executing Produto subskill', { subskill, appName });

    const startTime = Date.now();

    try {
      let result;

      switch (subskill) {
        case 'mvp_definition':
          result = await this.mvpDefinition(appName, userIntent, params);
          break;
        case 'user_stories':
          result = await this.userStories(appName, params.features || []);
          break;
        case 'acceptance_criteria':
          result = await this.acceptanceCriteria(params.features || []);
          break;
        case 'roadmap_planning':
          result = await this.roadmapPlanning(appName, params.features || []);
          break;
        case 'stakeholder_report':
          result = await this.stakeholderReport(appName, params);
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
   * S01-1: MVP Definition
   * Define escopo mínimo viável baseado na intenção do usuário
   */
  private async mvpDefinition(
    appName: string,
    userIntent: string,
    params: any
  ): Promise<MVPDefinition> {
    const prompt = `
Analyze the following user intent and create a detailed MVP (Minimum Viable Product) definition:

User Intent: "${userIntent}"
App Name: "${appName}"
${params.constraints ? `Constraints: ${JSON.stringify(params.constraints)}` : ''}

Output a JSON object with:
1. scope: { in: [...], out: [...] } - What's included and excluded from MVP
2. features: Array of { name, priority (P0-P3), description }
3. acceptanceCriteria: Array of BDD criteria
4. risks: Array of { risk, probability (low/medium/high), impact (low/medium/high), mitigation }
5. estimatedDuration: String like "8-10 weeks"
6. recommendedStack: Array of technologies

Be concise and practical. Focus on what's truly minimal and viable.
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are an experienced Product Manager. Analyze requirements and create clear, structured MVP definitions.
Always output valid JSON. Don't include markdown or explanations outside the JSON.`,
        maxTokens: 2000,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      // Parse JSON from AI response
      let jsonText = aiResult.data?.content || String(aiResult.data);
      // Remove markdown code blocks if present
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        mvp: parsed,
        estimatedDuration: parsed.estimatedDuration || '8-10 weeks',
        recommendedStack: parsed.recommendedStack || [
          'Node.js',
          'PostgreSQL',
          'React',
        ],
        constraints: params.constraints,
      };
    } catch (error) {
      this.logger.error('Failed to parse AI response', {
        response: aiResult.data,
        error,
      });
      throw error;
    }
  }

  /**
   * S01-2: User Stories
   * Gera user stories estruturadas em BDD format
   */
  private async userStories(
    appName: string,
    features: Feature[]
  ): Promise<{ userStories: any[] }> {
    if (features.length === 0) {
      return { userStories: [] };
    }

    const featureSummary = features
      .map((f) => `- ${f.name} (P${f.priority.slice(1)}): ${f.description}`)
      .join('\n');

    const prompt = `
Create detailed user stories for these features in BDD (Behavior-Driven Development) format:

${featureSummary}

For each feature, create 2-3 user stories following this format:
{
  feature: "Feature name",
  stories: [
    {
      title: "User can...",
      asA: "type of user",
      iWant: "action",
      soThat: "benefit",
      acceptanceCriteria: [
        { given: "...", when: "...", then: "..." }
      ]
    }
  ]
}

Output a JSON array of these user story objects.
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a Product Manager expert in BDD. Create clear, actionable user stories.
Always output valid JSON array. No markdown or explanations.`,
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

      return { userStories: parsed };
    } catch (error) {
      this.logger.error('Failed to parse user stories', { error });
      throw error;
    }
  }

  /**
   * S01-3: Acceptance Criteria
   * Cria critérios de aceite estruturados
   */
  private async acceptanceCriteria(
    features: Feature[]
  ): Promise<{ criteria: AcceptanceCriteria[] }> {
    if (features.length === 0) {
      return { criteria: [] };
    }

    const criteria: AcceptanceCriteria[] = [];

    for (const feature of features) {
      // Usar IA para gerar critérios específicos
      const prompt = `
For the feature "${feature.name}", create 3-4 acceptance criteria in Given-When-Then format.

Feature description: ${feature.description}
Priority: ${feature.priority}

Return a JSON array with objects like:
{
  scenario: "descriptive scenario name",
  given: "initial state",
  when: "action",
  then: "expected result"
}
`;

      const aiResult = await this.registry.execute('ai.claude', {
        skillId: 'ai.claude',
        params: {
          prompt,
          systemPrompt: `You are a QA specialist. Create clear, testable acceptance criteria.
Always output valid JSON. No markdown.`,
          maxTokens: 1000,
        },
      });

      if (aiResult.success) {
        try {
          let jsonText = aiResult.data?.content || String(aiResult.data);
          jsonText = jsonText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          const parsed = JSON.parse(jsonText);
          criteria.push(...parsed);
        } catch (error) {
          this.logger.warn(`Failed to parse criteria for ${feature.name}`, {
            error,
          });
        }
      }
    }

    return { criteria };
  }

  /**
   * S01-4: Roadmap Planning
   * Planeja roadmap com releases e timelines
   */
  private async roadmapPlanning(
    appName: string,
    features: Feature[]
  ): Promise<{ roadmap: any[] }> {
    const p0Features = features.filter((f) => f.priority === 'P0');
    const otherFeatures = features.filter((f) => f.priority !== 'P0');

    const prompt = `
Create a 3-month roadmap for "${appName}" with these features:

MVP (P0 - Week 1-4):
${p0Features.map((f) => `- ${f.name}`).join('\n')}

Post-MVP (P1-P2 - Week 5-12):
${otherFeatures.map((f) => `- ${f.name}`).join('\n')}

Return a JSON object with:
{
  releases: [
    {
      name: "Release name",
      version: "1.0.0",
      target: "Week X",
      features: ["feature list"],
      risks: ["potential issues"],
      deliverables: ["what gets shipped"]
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a Product Manager planning product releases.
Create realistic roadmaps with clear milestones.
Always output valid JSON.`,
        maxTokens: 2000,
      },
    });

    if (!aiResult.success) {
      return {
        roadmap: [
          {
            name: 'MVP Release',
            version: '1.0.0',
            target: 'Week 4',
            features: p0Features.map((f) => f.name),
          },
        ],
      };
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);
      return { roadmap: parsed.releases || [] };
    } catch (error) {
      this.logger.warn('Failed to parse roadmap', { error });
      return {
        roadmap: [
          {
            name: 'MVP Release',
            version: '1.0.0',
            target: 'Week 4',
            features: p0Features.map((f) => f.name),
          },
        ],
      };
    }
  }

  /**
   * S01-5: Stakeholder Report
   * Cria relatório executivo para stakeholders
   */
  private async stakeholderReport(
    appName: string,
    params: any
  ): Promise<{ report: string }> {
    const prompt = `
Create an executive summary report for stakeholders about "${appName}" project:

MVP Scope: ${params.mvpScope ? JSON.stringify(params.mvpScope) : 'Not yet defined'}
Features: ${params.features ? params.features.length + ' features' : 'Not yet defined'}
Timeline: ${params.timeline || 'Not specified'}
Budget: ${params.budget ? '$' + params.budget : 'Not specified'}
Team: ${params.team ? params.team + ' people' : 'Not specified'}

Include:
1. Executive Summary (1 paragraph)
2. Key Objectives (3-5 bullets)
3. Timeline and Milestones
4. Resource Requirements
5. Risk Assessment
6. Success Metrics
7. Next Steps

Make it professional, concise, and focused on business value.
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are an experienced Product Manager writing executive reports.
Create professional, business-focused summaries.
Output in markdown format with clear sections.`,
        maxTokens: 1500,
      },
    });

    if (!aiResult.success) {
      return {
        report: `# ${appName} - Executive Summary\n\nProject planning in progress...`,
      };
    }

    return {
      report: aiResult.data?.content || String(aiResult.data),
    };
  }
}

export function createHubEnterpriseProdutoSkill(): HubEnterpriseProdutoSkill {
  return new HubEnterpriseProdutoSkill();
}
