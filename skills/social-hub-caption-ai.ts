/**
 * S-03: Social Hub Caption AI Skill
 *
 * Gera legendas otimizadas usando Claude AI
 * Baseado em: Optimization #6 do roadmap
 *
 * @category AI
 * @version 1.0.0
 * @critical MEDIUM
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import Anthropic from '@anthropic-ai/sdk';

export interface CaptionAIInput extends SkillInput {
  anthropicApiKey: string;
  videoMetadata: {
    tema: string;              // e.g., "maternidade", "viagem"
    pilar: string;             // e.g., "entretenimento", "educacao"
    pagina: string;            // @username
    gancho: string;            // Hook inicial
    cta: string;               // Call to action
    formato?: string;          // "reel", "stories", "feed"
  };
  variations?: number;         // Quantas variações gerar (default: 3)
  maxLength?: number;          // Tamanho máximo (default: 200)
}

export interface CaptionAIOutput extends SkillOutput {
  data?: {
    variations: Array<{
      caption: string;
      score: number;           // Score de qualidade (0-100)
      tone: string;            // Tom da legenda
      hooks: string[];         // Hooks identificados
    }>;
    recommended: number;       // Índice da variação recomendada
  };
}

export class SocialHubCaptionAI extends Skill {
  constructor() {
    super(
      {
        name: 'social-hub-caption-ai',
        description: 'Generate optimized Instagram captions using Claude AI',
        version: '1.0.0',
        category: 'AI',
        author: 'OpenClaw Aurora',
        tags: ['instagram', 'ai', 'captions', 'claude'],
      },
      {
        timeout: 60000,
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as CaptionAIInput;

    if (!typed.anthropicApiKey) {
      console.error('[CaptionAI] Missing anthropicApiKey');
      return false;
    }

    if (!typed.videoMetadata?.tema || !typed.videoMetadata?.pilar) {
      console.error('[CaptionAI] Missing videoMetadata.tema or videoMetadata.pilar');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<CaptionAIOutput> {
    const typed = input as CaptionAIInput;
    const { videoMetadata } = typed;
    const variations = typed.variations || 3;
    const maxLength = typed.maxLength || 200;

    try {
      const client = new Anthropic({
        apiKey: typed.anthropicApiKey,
      });

      // 1. Determinar tom da página
      const pageTone = this.getPageTone(videoMetadata.pagina);

      // 2. Construir prompt otimizado
      const prompt = this.buildPrompt(videoMetadata, variations, maxLength, pageTone);

      // 3. Chamar Claude
      console.log('[CaptionAI] Generating captions with Claude...');
      const message = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // 4. Parsear resposta
      const content = message.content[0];
      if (content.type !== 'text') {
        return {
          success: false,
          error: 'Unexpected response format from Claude',
        };
      }

      const result = JSON.parse(content.text);

      // 5. Score e análise
      const processedVariations = result.variations.map((v: any, idx: number) => ({
        caption: v.caption,
        score: this.scoreCaption(v.caption, videoMetadata),
        tone: v.tone || pageTone,
        hooks: this.extractHooks(v.caption),
      }));

      // 6. Recomendar melhor
      const recommended = processedVariations.reduce(
        (maxIdx: number, curr: any, idx: number, arr: any[]) =>
          curr.score > arr[maxIdx].score ? idx : maxIdx,
        0
      );

      return {
        success: true,
        data: {
          variations: processedVariations,
          recommended,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Caption generation failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Determina tom da página baseado no @username
   */
  private getPageTone(pagina: string): string {
    const toneMap: Record<string, string> = {
      '@lucasrsmotta': 'profissional, inspirador, líder',
      '@agente.viaja': 'aventureiro, energético, FOMO',
      '@mamae.de.dois': 'caloroso, empático, familiar',
      '@memes.do.lucas': 'engraçado, irreverente, viral',
      '@chef.lucas.motta': 'gourmet, sofisticado, convidativo',
      '@resolutis.tech': 'técnico, confiável, solucionador',
    };

    return toneMap[pagina] || 'engajador, autêntico';
  }

  /**
   * Constrói prompt otimizado para Claude
   */
  private buildPrompt(
    metadata: CaptionAIInput['videoMetadata'],
    variations: number,
    maxLength: number,
    tone: string
  ): string {
    return `
Você é um especialista em copywriting para Instagram Reels. Gere ${variations} variações de legenda otimizadas para engajamento.

**CONTEXTO:**
- Tema: ${metadata.tema}
- Pilar de conteúdo: ${metadata.pilar}
- Página: ${metadata.pagina}
- Gancho base: ${metadata.gancho}
- CTA desejada: ${metadata.cta}
- Formato: ${metadata.formato || 'reel'}

**REQUISITOS:**
- Tom: ${tone}
- Tamanho: ${maxLength - 50}-${maxLength} caracteres
- Incluir 2-3 emojis relevantes (não exagerar)
- Call-to-action clara e específica
- Hook forte nas primeiras 3 palavras
- Criar curiosidade/engajamento (pergunta/desafio)
- Adequado ao algoritmo do Instagram (sem palavras banidas)

**OUTPUT FORMAT (JSON):**
{
  "variations": [
    {
      "caption": "Texto da legenda aqui...",
      "tone": "descrição do tom usado",
      "why": "breve explicação da estratégia (1 frase)"
    }
  ]
}

IMPORTANTE: Retorne APENAS o JSON, sem markdown ou formatação extra.
`.trim();
  }

  /**
   * Calcula score de qualidade da legenda
   */
  private scoreCaption(caption: string, metadata: CaptionAIInput['videoMetadata']): number {
    let score = 50; // Base

    // 1. Tamanho adequado
    if (caption.length >= 150 && caption.length <= 220) score += 15;
    else if (caption.length < 100) score -= 10;

    // 2. Presença de emojis (mas não muitos)
    const emojiCount = (caption.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount >= 2 && emojiCount <= 4) score += 10;
    else if (emojiCount > 6) score -= 5;

    // 3. Call-to-action
    const ctaKeywords = ['comente', 'salve', 'compartilhe', 'marque', 'você', 'responde'];
    const hasCTA = ctaKeywords.some(kw => caption.toLowerCase().includes(kw));
    if (hasCTA) score += 15;

    // 4. Pergunta (engajamento)
    if (caption.includes('?')) score += 10;

    // 5. Menção ao tema
    if (caption.toLowerCase().includes(metadata.tema.toLowerCase())) score += 5;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Extrai hooks da legenda
   */
  private extractHooks(caption: string): string[] {
    const hooks: string[] = [];

    // Primeira frase como hook principal
    const firstSentence = caption.split(/[.!?]/)[0]?.trim();
    if (firstSentence) {
      hooks.push(firstSentence);
    }

    // Perguntas como hooks
    const questions = caption.match(/[^.!?]*\?/g);
    if (questions) {
      hooks.push(...questions.map(q => q.trim()));
    }

    return hooks.slice(0, 3); // Max 3 hooks
  }
}
