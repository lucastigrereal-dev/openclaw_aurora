/**
 * S-04: Social Hub Hashtag AI Skill
 *
 * Gera hashtags otimizadas usando performance histórica + trending
 * Baseado em: Optimization #3 do roadmap
 *
 * @category AI
 * @version 1.0.0
 * @critical MEDIUM
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import axios from 'axios';

export interface HashtagAIInput extends SkillInput {
  videoMetadata: {
    tema: string;
    pilar: string;
    pagina: string;
  };
  historicalData?: any;        // Dados de performance passada
  trendingApiKey?: string;     // RapidAPI key para trending hashtags
  maxHashtags?: number;        // Max hashtags (default: 30)
  strategy?: 'balanced' | 'reach' | 'engagement' | 'viral';
}

export interface HashtagAIOutput extends SkillOutput {
  data?: {
    hashtags: Array<{
      tag: string;
      category: 'proven' | 'trending' | 'branded' | 'experimental';
      score: number;
      reach?: number;          // Estimativa de alcance
    }>;
    total: number;
    reachEstimate: number;
    engagementPotential: number;
  };
}

export class SocialHubHashtagAI extends Skill {
  constructor() {
    super(
      {
        name: 'social-hub-hashtag-ai',
        description: 'Generate optimized hashtags using historical performance + trending data',
        version: '1.0.0',
        category: 'AI',
        author: 'OpenClaw Aurora',
        tags: ['instagram', 'hashtags', 'optimization', 'trending'],
      },
      {
        timeout: 30000,
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as HashtagAIInput;

    if (!typed.videoMetadata?.tema) {
      console.error('[HashtagAI] Missing videoMetadata.tema');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<HashtagAIOutput> {
    const typed = input as HashtagAIInput;
    const { videoMetadata } = typed;
    const maxHashtags = typed.maxHashtags || 30;
    const strategy = typed.strategy || 'balanced';

    try {
      const hashtags: NonNullable<HashtagAIOutput['data']>['hashtags'] = [];

      // 1. Top performers históricos por tema
      const provenHashtags = this.getProvenHashtags(
        videoMetadata.tema,
        typed.historicalData
      );
      hashtags.push(...provenHashtags.slice(0, 12));

      // 2. Trending hashtags (se API disponível)
      if (typed.trendingApiKey) {
        try {
          const trendingHashtags = await this.fetchTrendingHashtags(
            videoMetadata.tema,
            typed.trendingApiKey
          );
          hashtags.push(...trendingHashtags.slice(0, 8));
        } catch (error) {
          console.warn('[HashtagAI] Failed to fetch trending hashtags:', error);
        }
      } else {
        // Fallback: trending baseadas em padrões conhecidos
        const fallbackTrending = this.getFallbackTrending(videoMetadata.tema);
        hashtags.push(...fallbackTrending.slice(0, 8));
      }

      // 3. Hashtag branded da página
      const brandedTag = videoMetadata.pagina.replace('@', '');
      hashtags.push({
        tag: `#${brandedTag}`,
        category: 'branded',
        score: 100,
      });

      // 4. Experimentais (A/B testing)
      if (Math.random() < 0.3) { // 30% chance
        const experimentalHashtags = this.getExperimentalHashtags(
          videoMetadata.tema,
          2
        );
        hashtags.push(...experimentalHashtags);
      }

      // 5. Aplicar estratégia
      const optimizedHashtags = this.applyStrategy(hashtags, strategy);

      // 6. Limitar ao máximo
      const finalHashtags = optimizedHashtags.slice(0, maxHashtags);

      // 7. Calcular métricas
      const reachEstimate = finalHashtags.reduce((sum: number, h: any) => sum + (h.reach || 0), 0);
      const engagementPotential = finalHashtags.reduce((sum: number, h: any) => sum + h.score, 0) / finalHashtags.length;

      return {
        success: true,
        data: {
          hashtags: finalHashtags,
          total: finalHashtags.length,
          reachEstimate,
          engagementPotential,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Hashtag generation failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Obtém hashtags com melhor performance histórica
   */
  private getProvenHashtags(
    tema: string,
    historicalData?: any
  ): NonNullable<HashtagAIOutput['data']>['hashtags'] {
    // Se temos dados históricos, usar
    if (historicalData?.hashtags?.[tema]) {
      return historicalData.hashtags[tema]
        .sort((a: any, b: any) => b.performance - a.performance)
        .slice(0, 15)
        .map((h: any) => ({
          tag: h.tag,
          category: 'proven' as const,
          score: h.performance,
          reach: h.avgReach,
        }));
    }

    // Fallback: hashtags conhecidas por tema
    const knownHashtags = this.getKnownHashtagsByTema(tema);
    return knownHashtags.map(tag => ({
      tag,
      category: 'proven' as const,
      score: 70,
      reach: 5000,
    }));
  }

  /**
   * Busca trending hashtags via API
   */
  private async fetchTrendingHashtags(
    tema: string,
    apiKey: string
  ): Promise<NonNullable<HashtagAIOutput['data']>['hashtags']> {
    // Exemplo com RapidAPI Instagram hashtags
    const response = await axios.get(
      'https://instagram-hashtag-scraper.p.rapidapi.com/trending',
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'instagram-hashtag-scraper.p.rapidapi.com',
        },
        params: {
          keyword: tema,
          limit: 10,
        },
      }
    );

    return response.data.hashtags.map((h: any) => ({
      tag: h.name,
      category: 'trending' as const,
      score: 80,
      reach: h.posts_count / 100, // Estimativa
    }));
  }

  /**
   * Trending hashtags fallback (sem API)
   */
  private getFallbackTrending(tema: string): NonNullable<HashtagAIOutput['data']>['hashtags'] {
    const trendingPatterns: Record<string, string[]> = {
      maternidade: ['#maedemenino', '#maedemenina', '#maternidadereal', '#vidademae'],
      viagem: ['#viajar', '#destinosdossonhos', '#trip', '#adventure'],
      gastronomia: ['#foodporn', '#comidacaseira', '#receitas', '#chef'],
      memes: ['#memesbrasil', '#humor', '#viral', '#engracado'],
    };

    const tags = trendingPatterns[tema] || [`#${tema}`, '#brasil', '#explore'];

    return tags.map(tag => ({
      tag,
      category: 'trending' as const,
      score: 75,
      reach: 10000,
    }));
  }

  /**
   * Hashtags experimentais para A/B testing
   */
  private getExperimentalHashtags(
    tema: string,
    count: number
  ): NonNullable<HashtagAIOutput['data']>['hashtags'] {
    const experimental = [
      `#${tema}2026`,
      `#${tema}dicas`,
      `#novoem${tema}`,
    ];

    return experimental.slice(0, count).map(tag => ({
      tag,
      category: 'experimental' as const,
      score: 60,
      reach: 2000,
    }));
  }

  /**
   * Aplica estratégia de seleção
   */
  private applyStrategy(
    hashtags: NonNullable<HashtagAIOutput['data']>['hashtags'],
    strategy: string
  ): NonNullable<HashtagAIOutput['data']>['hashtags'] {
    switch (strategy) {
      case 'reach':
        // Priorizar hashtags com maior alcance
        return hashtags.sort((a: any, b: any) => (b.reach || 0) - (a.reach || 0));

      case 'engagement':
        // Priorizar hashtags com melhor score (engajamento histórico)
        return hashtags.sort((a: any, b: any) => b.score - a.score);

      case 'viral':
        // Mix de trending + experimental
        return hashtags.sort((a: any, b: any) => {
          const scoreA = a.category === 'trending' ? 2 : a.category === 'experimental' ? 1.5 : 1;
          const scoreB = b.category === 'trending' ? 2 : b.category === 'experimental' ? 1.5 : 1;
          return scoreB - scoreA;
        });

      case 'balanced':
      default:
        // Mix equilibrado
        return hashtags;
    }
  }

  /**
   * Hashtags conhecidas por tema
   */
  private getKnownHashtagsByTema(tema: string): string[] {
    const hashtagMap: Record<string, string[]> = {
      maternidade: [
        '#maternidade', '#mae', '#bebe', '#maternar', '#maternidadereal',
        '#vidademae', '#mamae', '#filhos', '#criancas', '#familia',
        '#gravidez', '#gestante', '#maternando', '#amor'
      ],
      viagem: [
        '#viagem', '#travel', '#turismo', '#destinos', '#viajar',
        '#trip', '#adventure', '#wanderlust', '#travelblogger', '#instatravel',
        '#ferias', '#passaporte', '#praia', '#montanha'
      ],
      gastronomia: [
        '#gastronomia', '#food', '#comida', '#receita', '#culinaria',
        '#foodporn', '#chef', '#cozinha', '#delicia', '#gourmet',
        '#receitas', '#cozinhar', '#jantar', '#almoco'
      ],
      memes: [
        '#memes', '#meme', '#humor', '#engracado', '#risadas',
        '#viral', '#memesbrasil', '#zueira', '#comedia', '#funny',
        '#piada', '#rir', '#diversao', '#lol'
      ],
    };

    return hashtagMap[tema] || [`#${tema}`, '#instagram', '#brasil', '#explore'];
  }
}
