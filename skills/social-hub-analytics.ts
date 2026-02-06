/**
 * S-06: Social Hub Analytics Skill
 *
 * Coleta métricas do Instagram e gera relatórios
 * Baseado em: Optimization #4 do roadmap
 *
 * @category WEB
 * @version 1.0.0
 * @critical HIGH
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AnalyticsInput extends SkillInput {
  instagramAccessToken: string;
  instagramBusinessAccountId: string;
  pages?: string[];            // Páginas específicas (default: todas)
  dateRange?: {
    start: string;             // YYYY-MM-DD
    end: string;               // YYYY-MM-DD
  };
  metrics?: string[];          // Métricas específicas
}

export interface AnalyticsOutput extends SkillOutput {
  data?: {
    summary: {
      totalPosts: number;
      totalReach: number;
      totalEngagement: number;
      avgEngagementRate: number;
      topPerformers: Array<{
        postId: string;
        reach: number;
        engagement: number;
      }>;
    };
    byPage: Record<string, any>;
    trends: {
      bestPostingTimes: string[];
      topHashtags: Array<{ tag: string; avgEngagement: number }>;
      bestThemes: string[];
    };
    reportFile: string;
  };
}

export class SocialHubAnalytics extends Skill {
  private readonly INSTAGRAM_API_BASE = 'https://graph.facebook.com/v18.0';

  constructor() {
    super(
      {
        name: 'social-hub-analytics',
        description: 'Collect Instagram metrics and generate performance reports',
        version: '1.0.0',
        category: 'WEB',
        author: 'OpenClaw Aurora',
        tags: ['instagram', 'analytics', 'metrics', 'reporting'],
      },
      {
        timeout: 90000,
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as AnalyticsInput;

    if (!typed.instagramAccessToken) {
      console.error('[SocialHubAnalytics] Missing instagramAccessToken');
      return false;
    }

    if (!typed.instagramBusinessAccountId) {
      console.error('[SocialHubAnalytics] Missing instagramBusinessAccountId');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<AnalyticsOutput> {
    const typed = input as AnalyticsInput;

    try {
      // 1. Definir range de datas
      const dateRange = typed.dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      };

      // 2. Buscar posts do período
      console.log('[SocialHubAnalytics] Fetching Instagram posts...');
      const posts = await this.fetchPosts(
        typed.instagramBusinessAccountId,
        typed.instagramAccessToken,
        dateRange
      );

      // 3. Coletar insights de cada post
      console.log('[SocialHubAnalytics] Collecting post insights...');
      const insights = await this.fetchPostInsights(
        posts,
        typed.instagramAccessToken,
        typed.metrics || ['reach', 'engagement', 'impressions', 'saved']
      );

      // 4. Agregar métricas
      const summary = this.aggregateMetrics(insights);

      // 5. Análise de tendências
      const trends = this.analyzeTrends(insights);

      // 6. Métricas por página (se múltiplas)
      const byPage: Record<string, any> = {};
      if (typed.pages && typed.pages.length > 0) {
        for (const page of typed.pages) {
          const pageInsights = insights.filter((i: any) => i.username === page);
          byPage[page] = this.aggregateMetrics(pageInsights);
        }
      }

      // 7. Gerar relatório
      const reportFile = await this.generateReport({
        summary,
        trends,
        byPage,
        dateRange,
      });

      return {
        success: true,
        data: {
          summary,
          byPage,
          trends,
          reportFile,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (axios.isAxiosError(error) && error.response) {
        const apiError = error.response.data?.error?.message || error.response.statusText;
        return {
          success: false,
          error: `Instagram API error: ${apiError}`,
        };
      }

      return {
        success: false,
        error: `Analytics collection failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Busca posts do Instagram Business
   */
  private async fetchPosts(
    accountId: string,
    accessToken: string,
    dateRange: { start: string; end: string }
  ): Promise<any[]> {
    const response = await axios.get(
      `${this.INSTAGRAM_API_BASE}/${accountId}/media`,
      {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp,username',
          since: new Date(dateRange.start).getTime() / 1000,
          until: new Date(dateRange.end).getTime() / 1000,
          access_token: accessToken,
        },
      }
    );

    return response.data.data || [];
  }

  /**
   * Coleta insights de cada post
   */
  private async fetchPostInsights(
    posts: any[],
    accessToken: string,
    metrics: string[]
  ): Promise<any[]> {
    const insights: any[] = [];

    for (const post of posts) {
      try {
        const response = await axios.get(
          `${this.INSTAGRAM_API_BASE}/${post.id}/insights`,
          {
            params: {
              metric: metrics.join(','),
              access_token: accessToken,
            },
          }
        );

        const insightData = response.data.data.reduce((acc: any, metric: any) => {
          acc[metric.name] = metric.values[0]?.value || 0;
          return acc;
        }, {});

        insights.push({
          ...post,
          ...insightData,
          engagement: (insightData.likes || 0) + (insightData.comments || 0),
        });

      } catch (error) {
        console.warn(`[SocialHubAnalytics] Failed to fetch insights for post ${post.id}`);
      }
    }

    return insights;
  }

  /**
   * Agrega métricas gerais
   */
  private aggregateMetrics(insights: any[]): NonNullable<AnalyticsOutput['data']>['summary'] {
    const totalPosts = insights.length;
    const totalReach = insights.reduce((sum, i) => sum + (i.reach || 0), 0);
    const totalEngagement = insights.reduce((sum, i) => sum + (i.engagement || 0), 0);
    const avgEngagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

    // Top performers
    const topPerformers = insights
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5)
      .map(i => ({
        postId: i.id,
        reach: i.reach || 0,
        engagement: i.engagement || 0,
      }));

    return {
      totalPosts,
      totalReach,
      totalEngagement,
      avgEngagementRate,
      topPerformers,
    };
  }

  /**
   * Analisa tendências
   */
  private analyzeTrends(insights: any[]): NonNullable<AnalyticsOutput['data']>['trends'] {
    // 1. Melhores horários de postagem
    const hourlyEngagement: Record<number, number[]> = {};

    for (const post of insights) {
      const hour = new Date(post.timestamp).getHours();
      if (!hourlyEngagement[hour]) hourlyEngagement[hour] = [];
      hourlyEngagement[hour].push(post.engagement || 0);
    }

    const avgByHour = Object.entries(hourlyEngagement)
      .map(([hour, engagements]) => ({
        hour: parseInt(hour),
        avg: engagements.reduce((a, b) => a + b, 0) / engagements.length,
      }))
      .sort((a, b) => b.avg - a.avg);

    const bestPostingTimes = avgByHour.slice(0, 3).map(h => `${h.hour}:00`);

    // 2. Top hashtags
    const hashtagEngagement: Record<string, number[]> = {};

    for (const post of insights) {
      const hashtags = (post.caption || '').match(/#\w+/g) || [];
      for (const tag of hashtags) {
        if (!hashtagEngagement[tag]) hashtagEngagement[tag] = [];
        hashtagEngagement[tag].push(post.engagement || 0);
      }
    }

    const topHashtags = Object.entries(hashtagEngagement)
      .map(([tag, engagements]) => ({
        tag,
        avgEngagement: engagements.reduce((a, b) => a + b, 0) / engagements.length,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 10);

    // 3. Melhores temas (placeholder - precisa metadata)
    const bestThemes = ['entretenimento', 'educacao', 'inspiracao'];

    return {
      bestPostingTimes,
      topHashtags,
      bestThemes,
    };
  }

  /**
   * Gera relatório em JSON
   */
  private async generateReport(data: any): Promise<string> {
    const reportPath = `/tmp/instagram_analytics_${Date.now()}.json`;

    await fs.writeFile(
      reportPath,
      JSON.stringify(data, null, 2),
      'utf-8'
    );

    return reportPath;
  }
}
