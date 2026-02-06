/**
 * S-25: Social Hub Analytics Collector
 *
 * Collect Instagram metrics using Graph API:
 * - Post performance (reach, engagement, saves)
 * - Viral score calculation
 * - Historical trend analysis
 * - Performance benchmarks
 *
 * @category WEB
 * @version 1.0.0
 * @critical MEDIUM
 * @author Aria (The Alchemist)
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import axios from 'axios';

export interface AnalyticsCollectorInput extends SkillInput {
  instagramAccessToken: string;
  instagramBusinessAccountId: string;
  operation: 'collect' | 'analyze' | 'benchmark';
  postId?: string;                    // Para collect de post específico
  dateRange?: {
    startDate: string;                // YYYY-MM-DD
    endDate: string;                  // YYYY-MM-DD
  };
  includeComparison?: boolean;        // Comparar com média
}

export interface AnalyticsCollectorOutput extends SkillOutput {
  data?: {
    metrics?: {
      postId: string;
      reach: number;
      impressions: number;
      engagement: number;
      likes: number;
      comments: number;
      shares: number;
      saves: number;
      engagementRate: number;         // Percentage
      viralScore: number;             // 0-100
      timestamp: string;
    };
    analysis?: {
      totalPosts: number;
      avgReach: number;
      avgEngagement: number;
      avgViralScore: number;
      topPerformers: Array<{
        postId: string;
        viralScore: number;
        reason: string;
      }>;
      trends: {
        reachTrend: 'up' | 'down' | 'stable';
        engagementTrend: 'up' | 'down' | 'stable';
      };
    };
    benchmark?: {
      category: string;
      avgReach: number;
      avgEngagementRate: number;
      topPercentile: number;          // Where this account ranks
    };
  };
}

interface InstagramMediaMetrics {
  id: string;
  reach?: number;
  impressions?: number;
  engagement?: number;
  like_count?: number;
  comments_count?: number;
  shares?: number;
  saved?: number;
  timestamp?: string;
}

export class SocialHubAnalyticsCollector extends Skill {
  private readonly GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

  constructor() {
    super(
      {
        name: 'social-hub-analytics-collector',
        description: 'Collect and analyze Instagram metrics via Graph API',
        version: '1.0.0',
        category: 'WEB',
        author: 'Aria (The Alchemist)',
        tags: ['instagram', 'analytics', 'metrics', 'graph-api'],
      },
      {
        timeout: 60000,
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as AnalyticsCollectorInput;

    if (!typed.instagramAccessToken) {
      console.error('[AnalyticsCollector] Missing instagramAccessToken');
      return false;
    }

    if (!typed.instagramBusinessAccountId) {
      console.error('[AnalyticsCollector] Missing instagramBusinessAccountId');
      return false;
    }

    if (!typed.operation) {
      console.error('[AnalyticsCollector] Missing operation');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<AnalyticsCollectorOutput> {
    const typed = input as AnalyticsCollectorInput;

    try {
      switch (typed.operation) {
        case 'collect':
          return await this.collectMetrics(typed);

        case 'analyze':
          return await this.analyzePerformance(typed);

        case 'benchmark':
          return await this.generateBenchmark(typed);

        default:
          return {
            success: false,
            error: `Unknown operation: ${typed.operation}`,
          };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Analytics collection failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Coleta métricas de um post específico ou posts recentes
   */
  private async collectMetrics(
    input: AnalyticsCollectorInput
  ): Promise<AnalyticsCollectorOutput> {
    if (input.postId) {
      // Coletar métricas de post específico
      const metrics = await this.fetchPostMetrics(
        input.postId,
        input.instagramAccessToken
      );

      const processed = this.processMetrics(metrics);

      console.log(`[AnalyticsCollector] ✓ Collected metrics for post ${input.postId}`);

      return {
        success: true,
        data: { metrics: processed },
      };

    } else {
      // Coletar métricas de posts recentes
      const recentPosts = await this.fetchRecentPosts(
        input.instagramBusinessAccountId,
        input.instagramAccessToken,
        input.dateRange
      );

      console.log(`[AnalyticsCollector] ✓ Collected ${recentPosts.length} posts`);

      // Para múltiplos posts, retornar análise agregada
      return this.analyzePerformance(input);
    }
  }

  /**
   * Analisa performance ao longo do tempo
   */
  private async analyzePerformance(
    input: AnalyticsCollectorInput
  ): Promise<AnalyticsCollectorOutput> {
    const posts = await this.fetchRecentPosts(
      input.instagramBusinessAccountId,
      input.instagramAccessToken,
      input.dateRange
    );

    if (posts.length === 0) {
      return {
        success: false,
        error: 'No posts found in date range',
      };
    }

    const processedMetrics = posts.map(p => this.processMetrics(p));

    // Calcular médias
    const avgReach = this.average(processedMetrics.map((m: any) => m?.reach || 0));
    const avgEngagement = this.average(processedMetrics.map((m: any) => m?.engagement || 0));
    const avgViralScore = this.average(processedMetrics.map((m: any) => m?.viralScore || 0));

    // Identificar top performers (top 20%)
    const sortedByViral = [...processedMetrics].sort((a: any, b: any) => (b?.viralScore || 0) - (a?.viralScore || 0));
    const topCount = Math.max(1, Math.ceil(sortedByViral.length * 0.2));
    const topPerformers = sortedByViral.slice(0, topCount).map((m: any) => ({
      postId: m?.postId || '',
      viralScore: m?.viralScore || 0,
      reason: this.getPerformanceReason(m),
    }));

    // Calcular trends (comparar primeira metade vs segunda metade)
    const midpoint = Math.floor(processedMetrics.length / 2);
    const firstHalf = processedMetrics.slice(0, midpoint);
    const secondHalf = processedMetrics.slice(midpoint);

    const reachTrend = this.calculateTrend(
      this.average(firstHalf.map((m: any) => m?.reach || 0)),
      this.average(secondHalf.map((m: any) => m?.reach || 0))
    );

    const engagementTrend = this.calculateTrend(
      this.average(firstHalf.map((m: any) => m?.engagementRate || 0)),
      this.average(secondHalf.map((m: any) => m?.engagementRate || 0))
    );

    console.log(`[AnalyticsCollector] ✓ Analyzed ${posts.length} posts`);

    return {
      success: true,
      data: {
        analysis: {
          totalPosts: posts.length,
          avgReach,
          avgEngagement,
          avgViralScore,
          topPerformers,
          trends: {
            reachTrend,
            engagementTrend,
          },
        },
      },
    };
  }

  /**
   * Gera benchmark comparativo
   */
  private async generateBenchmark(
    input: AnalyticsCollectorInput
  ): Promise<AnalyticsCollectorOutput> {
    // Para benchmark real, precisaríamos de dados de outros accounts
    // Por ora, retornar benchmark baseado em médias da indústria

    const posts = await this.fetchRecentPosts(
      input.instagramBusinessAccountId,
      input.instagramAccessToken
    );

    const processedMetrics = posts.map(p => this.processMetrics(p));
    const avgReach = this.average(processedMetrics.map((m: any) => m?.reach || 0));
    const avgEngagementRate = this.average(processedMetrics.map((m: any) => m?.engagementRate || 0));

    // Benchmarks da indústria (valores médios)
    const industryAvgReach = 10000;
    const industryAvgEngagement = 3.5;

    const topPercentile = this.calculatePercentile(avgReach, avgEngagementRate);

    return {
      success: true,
      data: {
        benchmark: {
          category: 'content_creator',
          avgReach: industryAvgReach,
          avgEngagementRate: industryAvgEngagement,
          topPercentile,
        },
      },
    };
  }

  /**
   * Busca métricas de um post via Graph API
   */
  private async fetchPostMetrics(
    postId: string,
    accessToken: string
  ): Promise<InstagramMediaMetrics> {
    const response = await axios.get(
      `${this.GRAPH_API_BASE}/${postId}/insights`,
      {
        params: {
          metric: 'reach,impressions,engagement,likes,comments,shares,saved',
          access_token: accessToken,
        },
      }
    );

    // Parsear resposta da API
    const insights = response.data.data;
    const metrics: InstagramMediaMetrics = { id: postId };

    insights.forEach((insight: any) => {
      const value = insight.values[0]?.value || 0;
      switch (insight.name) {
        case 'reach':
          metrics.reach = value;
          break;
        case 'impressions':
          metrics.impressions = value;
          break;
        case 'engagement':
          metrics.engagement = value;
          break;
        // Adicionar outros conforme necessário
      }
    });

    return metrics;
  }

  /**
   * Busca posts recentes
   */
  private async fetchRecentPosts(
    accountId: string,
    accessToken: string,
    dateRange?: AnalyticsCollectorInput['dateRange']
  ): Promise<InstagramMediaMetrics[]> {
    const response = await axios.get(
      `${this.GRAPH_API_BASE}/${accountId}/media`,
      {
        params: {
          fields: 'id,timestamp,insights.metric(reach,impressions,engagement)',
          access_token: accessToken,
          limit: 50,
        },
      }
    );

    const media = response.data.data || [];

    // Filtrar por data range se fornecido
    let filtered = media;
    if (dateRange) {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);

      filtered = media.filter((m: any) => {
        const postDate = new Date(m.timestamp);
        return postDate >= start && postDate <= end;
      });
    }

    return filtered.map((m: any) => ({
      id: m.id,
      timestamp: m.timestamp,
      ...this.parseInsights(m.insights?.data || []),
    }));
  }

  /**
   * Parseia insights da API
   */
  private parseInsights(insights: any[]): Partial<InstagramMediaMetrics> {
    const parsed: Partial<InstagramMediaMetrics> = {};

    insights.forEach((insight: any) => {
      const value = insight.values?.[0]?.value || 0;
      parsed[insight.name as keyof InstagramMediaMetrics] = value;
    });

    return parsed;
  }

  /**
   * Processa e calcula métricas derivadas
   */
  private processMetrics(raw: InstagramMediaMetrics): NonNullable<AnalyticsCollectorOutput['data']>['metrics'] {
    const reach = raw.reach || 0;
    const engagement = raw.engagement || 0;
    const likes = raw.like_count || 0;
    const comments = raw.comments_count || 0;
    const saves = raw.saved || 0;

    const engagementRate = reach > 0 ? (engagement / reach) * 100 : 0;

    const viralScore = this.calculateViralScore({
      reach,
      engagement,
      engagementRate,
      saves,
      comments,
    });

    return {
      postId: raw.id,
      reach,
      impressions: raw.impressions || reach,
      engagement,
      likes,
      comments,
      shares: raw.shares || 0,
      saves,
      engagementRate,
      viralScore,
      timestamp: raw.timestamp || new Date().toISOString(),
    };
  }

  /**
   * Calcula viral score (0-100)
   */
  private calculateViralScore(metrics: {
    reach: number;
    engagement: number;
    engagementRate: number;
    saves: number;
    comments: number;
  }): number {
    let score = 0;

    // Reach (30 pontos)
    score += Math.min(30, (metrics.reach / 10000) * 30);

    // Engagement rate (40 pontos)
    score += Math.min(40, (metrics.engagementRate / 10) * 40);

    // Saves (15 pontos - mais valioso)
    score += Math.min(15, (metrics.saves / 100) * 15);

    // Comments (15 pontos - indica conexão)
    score += Math.min(15, (metrics.comments / 50) * 15);

    return Math.round(Math.min(100, score));
  }

  /**
   * Calcula média
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calcula trend
   */
  private calculateTrend(before: number, after: number): 'up' | 'down' | 'stable' {
    const change = ((after - before) / before) * 100;

    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  /**
   * Calcula percentil
   */
  private calculatePercentile(reach: number, engagementRate: number): number {
    // Simplificado - em produção usaríamos dados reais
    const reachScore = Math.min(50, (reach / 20000) * 50);
    const engagementScore = Math.min(50, (engagementRate / 5) * 50);

    return Math.round(reachScore + engagementScore);
  }

  /**
   * Identifica razão de alta performance
   */
  private getPerformanceReason(
    metrics: NonNullable<AnalyticsCollectorOutput['data']>['metrics']
  ): string {
    if (metrics?.saves && metrics.saves > 100) return 'High saves (valuable content)';
    if (metrics?.comments && metrics.comments > 50) return 'High comments (engaging conversation)';
    if (metrics?.engagementRate && metrics.engagementRate > 8) return 'Exceptional engagement rate';
    if (metrics?.reach && metrics.reach > 20000) return 'Exceptional reach';
    return 'Strong overall performance';
  }
}
