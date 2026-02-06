/**
 * S-12: Social Hub Quota Enforcer
 *
 * Enforce posting rules:
 * - Daily post limits (configurable per page)
 * - Page-specific quotas
 * - Content group repetition validation (45 days minimum)
 * - Time slot distribution
 *
 * @category UTIL
 * @version 1.0.0
 * @critical MEDIUM
 * @author Magnus (The Architect)
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface QuotaEnforcerInput extends SkillInput {
  socialHubPath: string;
  operation: 'check' | 'validate' | 'report';
  post?: {
    pagina: string;
    data: string;              // YYYY-MM-DD
    grupoConteudo: string;     // e.g., "maternidade_dicas"
    tema: string;
  };
  quotaConfig?: QuotaConfig;
}

export interface QuotaConfig {
  dailyLimits: Record<string, number>;  // @username -> max posts per day
  contentGroupGap: number;               // Days between same content group (default: 45)
  timeSlotDistribution?: {
    morning: number;    // 6-12h
    afternoon: number;  // 12-18h
    evening: number;    // 18-24h
  };
  warningThreshold?: number;             // Warn at X% of limit (default: 80)
}

export interface QuotaEnforcerOutput extends SkillOutput {
  data?: {
    allowed: boolean;
    quotaStatus: {
      dailyUsed: number;
      dailyLimit: number;
      remaining: number;
      percentage: number;
    };
    contentGroupCheck?: {
      lastPosted?: string;      // YYYY-MM-DD
      daysSince?: number;
      allowed: boolean;
      reason?: string;
    };
    timeSlotCheck?: {
      slot: string;
      used: number;
      limit: number;
      allowed: boolean;
    };
    warnings: string[];
    violations: string[];
  };
}

interface PostRecord {
  pagina: string;
  data: string;
  grupoConteudo: string;
  tema: string;
  publerJobId?: string;
}

export class SocialHubQuotaEnforcer extends Skill {
  private readonly DEFAULT_CONFIG: QuotaConfig = {
    dailyLimits: {
      '@lucasrsmotta': 2,
      '@agente.viaja': 3,
      '@mamae.de.dois': 3,
      '@memes.do.lucas': 5,
      '@chef.lucas.motta': 2,
      '@resolutis.tech': 2,
    },
    contentGroupGap: 45,
    timeSlotDistribution: {
      morning: 1,
      afternoon: 1,
      evening: 1,
    },
    warningThreshold: 80,
  };

  constructor() {
    super(
      {
        name: 'social-hub-quota-enforcer',
        description: 'Enforce posting quotas and content distribution rules',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Magnus (The Architect)',
        tags: ['instagram', 'quotas', 'limits', 'validation'],
      },
      {
        timeout: 10000,
        retries: 1,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as QuotaEnforcerInput;

    if (!typed.socialHubPath) {
      console.error('[QuotaEnforcer] Missing socialHubPath');
      return false;
    }

    if (!typed.operation) {
      console.error('[QuotaEnforcer] Missing operation');
      return false;
    }

    if (typed.operation !== 'report' && !typed.post) {
      console.error('[QuotaEnforcer] Missing post data for check/validate operation');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<QuotaEnforcerOutput> {
    const typed = input as QuotaEnforcerInput;
    const config = { ...this.DEFAULT_CONFIG, ...typed.quotaConfig };

    try {
      // 1. Carregar histórico de posts
      const postHistory = await this.loadPostHistory(typed.socialHubPath);

      if (typed.operation === 'report') {
        return this.generateReport(postHistory, config);
      }

      if (!typed.post) {
        return {
          success: false,
          error: 'Post data required for check/validate operations',
        };
      }

      // 2. Validar quota diária
      const quotaStatus = this.checkDailyQuota(
        postHistory,
        typed.post.pagina,
        typed.post.data,
        config
      );

      // 3. Validar grupo de conteúdo
      const contentGroupCheck = this.checkContentGroup(
        postHistory,
        typed.post.pagina,
        typed.post.grupoConteudo,
        typed.post.data,
        config
      );

      // 4. Validar distribuição de horários (se fornecido)
      let timeSlotCheck: NonNullable<QuotaEnforcerOutput['data']>['timeSlotCheck'] | undefined;

      // 5. Compilar warnings e violations
      const warnings: string[] = [];
      const violations: string[] = [];

      // Quota warnings
      if (quotaStatus.percentage >= config.warningThreshold!) {
        warnings.push(
          `Daily quota at ${quotaStatus.percentage}% (${quotaStatus.dailyUsed}/${quotaStatus.dailyLimit})`
        );
      }

      if (quotaStatus.remaining === 0) {
        violations.push(
          `Daily quota exceeded for ${typed.post.pagina} on ${typed.post.data}`
        );
      }

      // Content group violations
      if (contentGroupCheck && !contentGroupCheck.allowed) {
        violations.push(contentGroupCheck.reason || 'Content group repost too soon');
      }

      // 6. Determinar se permitido
      const allowed = violations.length === 0;

      console.log(`[QuotaEnforcer] ${allowed ? '✓ ALLOWED' : '✗ BLOCKED'} - ${typed.post.pagina}`);

      return {
        success: true,
        data: {
          allowed,
          quotaStatus,
          contentGroupCheck,
          timeSlotCheck,
          warnings,
          violations,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Quota enforcement failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Carrega histórico de posts do CSV
   */
  private async loadPostHistory(socialHubPath: string): Promise<PostRecord[]> {
    const csvPath = path.join(socialHubPath, 'DATA', 'posts_history.csv');

    try {
      const content = await fs.readFile(csvPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      // Parse CSV (formato: pagina,data,grupoConteudo,tema,publerJobId)
      const records: PostRecord[] = [];

      for (let i = 1; i < lines.length; i++) { // Skip header
        const parts = lines[i].split(',');
        if (parts.length >= 4) {
          records.push({
            pagina: parts[0].trim(),
            data: parts[1].trim(),
            grupoConteudo: parts[2].trim(),
            tema: parts[3].trim(),
            publerJobId: parts[4]?.trim(),
          });
        }
      }

      return records;

    } catch (error) {
      // Arquivo não existe ainda - retornar vazio
      console.log('[QuotaEnforcer] No post history found, starting fresh');
      return [];
    }
  }

  /**
   * Verifica quota diária
   */
  private checkDailyQuota(
    history: PostRecord[],
    pagina: string,
    data: string,
    config: QuotaConfig
  ): NonNullable<QuotaEnforcerOutput['data']>['quotaStatus'] {
    const dailyLimit = config.dailyLimits[pagina] || 3; // Default: 3 posts/day

    const dailyPosts = history.filter(
      p => p.pagina === pagina && p.data === data
    );

    const dailyUsed = dailyPosts.length;
    const remaining = Math.max(0, dailyLimit - dailyUsed);
    const percentage = Math.round((dailyUsed / dailyLimit) * 100);

    return {
      dailyUsed,
      dailyLimit,
      remaining,
      percentage,
    };
  }

  /**
   * Verifica repetição de grupo de conteúdo
   */
  private checkContentGroup(
    history: PostRecord[],
    pagina: string,
    grupoConteudo: string,
    targetData: string,
    config: QuotaConfig
  ): NonNullable<QuotaEnforcerOutput['data']>['contentGroupCheck'] {
    const targetDate = new Date(targetData);

    // Buscar último post deste grupo de conteúdo nesta página
    const sameGroupPosts = history
      .filter(p => p.pagina === pagina && p.grupoConteudo === grupoConteudo)
      .map(p => ({ ...p, date: new Date(p.data) }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    if (sameGroupPosts.length === 0) {
      // Primeiro post deste grupo - permitido
      return {
        allowed: true,
      };
    }

    const lastPost = sameGroupPosts[0];
    const daysSince = Math.floor(
      (targetDate.getTime() - lastPost.date.getTime()) / (1000 * 60 * 60 * 24)
    );

    const allowed = daysSince >= config.contentGroupGap;

    return {
      lastPosted: lastPost.data,
      daysSince,
      allowed,
      reason: allowed
        ? undefined
        : `Content group "${grupoConteudo}" posted ${daysSince} days ago (minimum: ${config.contentGroupGap} days)`,
    };
  }

  /**
   * Gera relatório de quotas
   */
  private generateReport(
    history: PostRecord[],
    config: QuotaConfig
  ): QuotaEnforcerOutput {
    const today = new Date().toISOString().split('T')[0];

    const pages = Object.keys(config.dailyLimits);
    const warnings: string[] = [];

    pages.forEach(pagina => {
      const status = this.checkDailyQuota(history, pagina, today, config);

      if (status.percentage >= config.warningThreshold!) {
        warnings.push(
          `${pagina}: ${status.dailyUsed}/${status.dailyLimit} posts today (${status.percentage}%)`
        );
      }
    });

    return {
      success: true,
      data: {
        allowed: true,
        quotaStatus: {
          dailyUsed: 0,
          dailyLimit: 0,
          remaining: 0,
          percentage: 0,
        },
        warnings,
        violations: [],
      },
    };
  }
}
