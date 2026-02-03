/**
 * Skill: ai.gpt
 * Integração com OpenAI GPT API
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';

export class AIGPTSkill extends Skill {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(apiKey?: string) {
    super(
      {
        name: 'ai.gpt',
        description: 'Envia prompts para OpenAI GPT',
        version: '1.0.0',
        category: 'AI',
        tags: ['gpt', 'openai', 'llm', 'ai', 'chatgpt'],
      },
      {
        timeout: 120000,
        retries: 3,
      }
    );
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
  }

  validate(input: SkillInput): boolean {
    if (!this.apiKey) {
      console.error('[ai.gpt] API key not configured');
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
      model = 'gpt-4o',
      maxTokens = 4096,
      systemPrompt = 'You are a helpful assistant.',
      temperature = 0.7,
    } = input;

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ];

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          content: data.choices[0]?.message?.content || '',
          model: data.model,
          usage: data.usage,
          finishReason: data.choices[0]?.finish_reason,
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
