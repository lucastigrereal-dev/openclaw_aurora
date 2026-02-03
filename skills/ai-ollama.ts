/**
 * Skill: ai.ollama
 * Integração com Ollama (LLMs locais)
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';

export class AIOllamaSkill extends Skill {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    super(
      {
        name: 'ai.ollama',
        description: 'Executa modelos locais via Ollama',
        version: '1.0.0',
        category: 'AI',
        tags: ['ollama', 'local', 'llm', 'ai'],
      },
      {
        timeout: 300000, // 5 minutos para modelos locais
        retries: 2,
      }
    );
    this.baseUrl = baseUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
  }

  validate(input: SkillInput): boolean {
    if (!input.prompt || typeof input.prompt !== 'string') {
      return false;
    }
    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const {
      prompt,
      model = 'llama3.2',
      systemPrompt,
      stream = false,
    } = input;

    try {
      const body: any = {
        model,
        prompt,
        stream,
      };

      if (systemPrompt) {
        body.system = systemPrompt;
      }

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          content: data.response || '',
          model: data.model,
          done: data.done,
          totalDuration: data.total_duration,
          evalCount: data.eval_count,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Lista modelos disponíveis
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }
}
