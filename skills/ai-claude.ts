/**
 * Skill: ai.claude
 * Integração com Claude API (Anthropic)
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';

export class AIClaudeSkill extends Skill {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey?: string) {
    super(
      {
        name: 'ai.claude',
        description: 'Envia prompts para Claude API',
        version: '1.0.0',
        category: 'AI',
        tags: ['claude', 'anthropic', 'llm', 'ai'],
      },
      {
        timeout: 120000, // 2 minutos para respostas longas
        retries: 3,
      }
    );
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
  }

  validate(input: SkillInput): boolean {
    if (!this.apiKey) {
      console.error('[ai.claude] API key not configured');
      return false;
    }
    if (!input.prompt || typeof input.prompt !== 'string') {
      return false;
    }
    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const {
      prompt,
      model = 'claude-3-5-sonnet-20241022',
      maxTokens = 4096,
      systemPrompt,
      temperature = 0.7,
    } = input;

    try {
      const messages = [{ role: 'user', content: prompt }];

      const body: any = {
        model,
        max_tokens: maxTokens,
        messages,
        temperature,
      };

      if (systemPrompt) {
        body.system = systemPrompt;
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          content: data.content[0]?.text || '',
          model: data.model,
          usage: data.usage,
          stopReason: data.stop_reason,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
