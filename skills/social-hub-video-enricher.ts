/**
 * S-02: Social Hub Video AI Enrichment
 *
 * Analyze videos with Claude Vision API to generate:
 * - Hooks (attention-grabbing opening lines)
 * - Captions (optimized for engagement)
 * - Hashtags (relevant and trending)
 * - CTAs (call-to-actions)
 * - Automatic tema/pilar classification
 * - Keyword and theme extraction
 *
 * @category AI
 * @version 1.0.0
 * @critical HIGH
 * @author Aria (The Alchemist)
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface VideoEnricherInput extends SkillInput {
  anthropicApiKey: string;
  videoPath: string;
  pagina?: string;              // @username for context
  existingMetadata?: {
    titulo?: string;
    descricao?: string;
    duracao?: number;
  };
  analysisDepth?: 'quick' | 'standard' | 'deep'; // Default: standard
}

export interface VideoEnricherOutput extends SkillOutput {
  data?: {
    enrichment: {
      hooks: Array<{
        text: string;
        score: number;           // 0-100
        type: 'question' | 'statement' | 'challenge' | 'revelation';
      }>;
      captions: Array<{
        text: string;
        length: number;
        tone: string;
        cta: string;
      }>;
      hashtags: {
        primary: string[];        // 5-10 principais
        secondary: string[];      // 10-20 complementares
        trending: string[];       // 5 em alta
      };
      classification: {
        tema: string;             // e.g., "maternidade", "viagem"
        pilar: string;            // e.g., "entretenimento", "educacao"
        subTemas: string[];       // Temas secundários
        confidence: number;       // 0-100
      };
      keywords: string[];
      themes: string[];
      emotions: string[];
      targetAudience: string;
      viralPotential: number;     // 0-100
    };
    analysisMetrics: {
      duration: number;
      model: string;
      tokensUsed?: number;
    };
  };
}

export class SocialHubVideoEnricher extends Skill {
  constructor() {
    super(
      {
        name: 'social-hub-video-enricher',
        description: 'AI-powered video analysis with Claude Vision for content enrichment',
        version: '1.0.0',
        category: 'AI',
        author: 'Aria (The Alchemist)',
        tags: ['instagram', 'ai', 'vision', 'claude', 'video-analysis'],
      },
      {
        timeout: 120000, // 2 minutos
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as VideoEnricherInput;

    if (!typed.anthropicApiKey) {
      console.error('[VideoEnricher] Missing anthropicApiKey');
      return false;
    }

    if (!typed.videoPath) {
      console.error('[VideoEnricher] Missing videoPath');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<VideoEnricherOutput> {
    const typed = input as VideoEnricherInput;
    const startTime = Date.now();

    try {
      // 1. Validar arquivo existe
      try {
        await fs.access(typed.videoPath);
        console.log(`[VideoEnricher] Processing video: ${typed.videoPath}`);
      } catch {
        return {
          success: false,
          error: `Video file not found: ${typed.videoPath}`,
        };
      }

      // 2. Extrair frames do vídeo (primeiro, meio, último)
      const frames = await this.extractKeyFrames(typed.videoPath);

      // 3. Converter frames para base64
      const framesBase64 = await Promise.all(
        frames.map(frame => this.imageToBase64(frame))
      );

      // 4. Chamar Claude Vision
      const client = new Anthropic({
        apiKey: typed.anthropicApiKey,
      });

      const prompt = this.buildAnalysisPrompt(typed);

      console.log('[VideoEnricher] Calling Claude Vision API...');

      const message = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              ...framesBase64.map(base64 => ({
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: 'image/jpeg' as const,
                  data: base64,
                },
              })),
            ],
          },
        ],
      });

      // 5. Parsear resposta
      const content = message.content[0];
      if (content.type !== 'text') {
        return {
          success: false,
          error: 'Unexpected response format from Claude Vision',
        };
      }

      const analysis = JSON.parse(content.text);

      // 6. Post-processar e enriquecer
      const enrichment = this.postProcessAnalysis(analysis, typed);

      const duration = Date.now() - startTime;

      console.log(`[VideoEnricher] ✓ Analysis complete in ${(duration / 1000).toFixed(2)}s`);

      return {
        success: true,
        data: {
          enrichment,
          analysisMetrics: {
            duration,
            model: 'claude-3-5-sonnet-20241022',
            tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
          },
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Video enrichment failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Extrai frames chave do vídeo usando ffmpeg
   */
  private async extractKeyFrames(videoPath: string): Promise<string[]> {
    const { execSync } = require('child_process');
    const tmpDir = '/tmp/video-frames-' + Date.now();

    try {
      // Criar diretório temporário
      await fs.mkdir(tmpDir, { recursive: true });

      // Extrair 3 frames (início, meio, fim)
      const outputPattern = path.join(tmpDir, 'frame-%d.jpg');

      execSync(
        `ffmpeg -i "${videoPath}" -vf "select='eq(pict_type,I)'" -frames:v 3 "${outputPattern}" -y`,
        { stdio: 'pipe' }
      );

      // Listar frames gerados
      const files = await fs.readdir(tmpDir);
      const framePaths = files
        .filter(f => f.endsWith('.jpg'))
        .map(f => path.join(tmpDir, f))
        .slice(0, 3); // Garantir max 3 frames

      return framePaths;

    } catch (error) {
      console.warn('[VideoEnricher] ffmpeg failed, using placeholder frames');
      // Fallback: retornar array vazio (análise será baseada em metadata)
      return [];
    }
  }

  /**
   * Converte imagem para base64
   */
  private async imageToBase64(imagePath: string): Promise<string> {
    const buffer = await fs.readFile(imagePath);
    return buffer.toString('base64');
  }

  /**
   * Constrói prompt de análise
   */
  private buildAnalysisPrompt(input: VideoEnricherInput): string {
    const depth = input.analysisDepth || 'standard';
    const pagina = input.pagina || 'generic';

    const depthInstructions = {
      quick: 'Análise rápida focada em hooks e hashtags principais.',
      standard: 'Análise completa com hooks, captions, hashtags e classificação.',
      deep: 'Análise profunda incluindo emoções, público-alvo e potencial viral.',
    };

    return `
Você é um especialista em análise de vídeos para Instagram Reels. Analise as imagens fornecidas (frames do vídeo) e gere insights detalhados para otimizar o conteúdo.

**CONTEXTO:**
- Página: ${pagina}
- Profundidade: ${depth} - ${depthInstructions[depth]}
${input.existingMetadata?.titulo ? `- Título existente: ${input.existingMetadata.titulo}` : ''}
${input.existingMetadata?.descricao ? `- Descrição: ${input.existingMetadata.descricao}` : ''}

**TAREFA:**
Analise o conteúdo visual e gere:

1. **HOOKS** (3-5 opções):
   - Primeira frase que captura atenção
   - Tipos: pergunta, afirmação impactante, desafio, revelação
   - Score de engajamento (0-100)

2. **CAPTIONS** (2-3 variações):
   - Legendas otimizadas (150-220 caracteres)
   - Tom adequado ao conteúdo
   - CTA clara e específica

3. **HASHTAGS**:
   - Primary (5-10): principais e específicos
   - Secondary (10-20): complementares e de nicho
   - Trending (5): em alta no momento

4. **CLASSIFICAÇÃO**:
   - Tema principal (ex: maternidade, viagem, moda)
   - Pilar de conteúdo (entretenimento, educacao, inspiracao)
   - Sub-temas (2-4)
   - Confiança da classificação (0-100)

5. **ANÁLISE ADICIONAL**:
   - Keywords (5-10 palavras-chave)
   - Themes (3-5 temas abordados)
   - Emotions (emoções evocadas)
   - Target Audience (descrição do público)
   - Viral Potential (0-100)

**OUTPUT FORMAT (JSON):**
{
  "hooks": [
    {
      "text": "Hook text here",
      "score": 85,
      "type": "question"
    }
  ],
  "captions": [
    {
      "text": "Caption text here...",
      "length": 180,
      "tone": "inspirador",
      "cta": "Salve este post!"
    }
  ],
  "hashtags": {
    "primary": ["#hashtag1", "#hashtag2"],
    "secondary": ["#hashtag3", "#hashtag4"],
    "trending": ["#trending1"]
  },
  "classification": {
    "tema": "tema principal",
    "pilar": "pilar",
    "subTemas": ["subtema1", "subtema2"],
    "confidence": 90
  },
  "keywords": ["keyword1", "keyword2"],
  "themes": ["theme1", "theme2"],
  "emotions": ["emotion1", "emotion2"],
  "targetAudience": "descrição do público",
  "viralPotential": 75
}

IMPORTANTE: Retorne APENAS o JSON, sem markdown ou formatação extra.
`.trim();
  }

  /**
   * Post-processa e enriquece análise
   */
  private postProcessAnalysis(
    analysis: any,
    input: VideoEnricherInput
  ): NonNullable<VideoEnricherOutput['data']>['enrichment'] {
    // Garantir estrutura completa
    return {
      hooks: analysis.hooks || [],
      captions: analysis.captions || [],
      hashtags: {
        primary: analysis.hashtags?.primary || [],
        secondary: analysis.hashtags?.secondary || [],
        trending: analysis.hashtags?.trending || [],
      },
      classification: {
        tema: analysis.classification?.tema || 'undefined',
        pilar: analysis.classification?.pilar || 'entretenimento',
        subTemas: analysis.classification?.subTemas || [],
        confidence: analysis.classification?.confidence || 0,
      },
      keywords: analysis.keywords || [],
      themes: analysis.themes || [],
      emotions: analysis.emotions || [],
      targetAudience: analysis.targetAudience || 'público geral',
      viralPotential: analysis.viralPotential || 50,
    };
  }
}
