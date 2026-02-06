// Social Media Skills - Gestao de redes sociais
// Skills: social.post, social.schedule, social.caption, social.reels, social.analytics

import { SkillBase, SkillResult } from './skill-base';

// In-memory schedule storage
const scheduledPosts: Map<string, ScheduledPost> = new Map();
const postHistory: PostRecord[] = [];

interface ScheduledPost {
  id: string;
  platform: string[];
  content: string;
  image?: string;
  scheduledFor: Date;
  status: 'pending' | 'posted' | 'failed';
  hashtags: string[];
}

interface PostRecord {
  id: string;
  platform: string;
  content: string;
  postedAt: Date;
  metrics: { likes: number; comments: number; shares: number; reach: number; };
}

// ============================================================================
// social.post - Posta em redes sociais
// ============================================================================
export class SocialPostSkill extends SkillBase {
  name = 'social.post';
  description = 'Posta no Instagram, Facebook, TikTok';
  category = 'social';
  dangerous = true;

  parameters = {
    platform: { type: 'string', required: true, description: 'Platform: instagram, facebook, tiktok, all' },
    content: { type: 'string', required: true, description: 'Texto do post' },
    image: { type: 'string', required: false, description: 'URL ou caminho da imagem' },
    video: { type: 'string', required: false, description: 'URL ou caminho do video' },
    hashtags: { type: 'array', required: false, description: 'Hashtags' },
    link: { type: 'string', required: false, description: 'Link no post (Facebook)' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const platforms = params.platform === 'all'
        ? ['instagram', 'facebook', 'tiktok']
        : [params.platform];

      const results: any[] = [];

      for (const platform of platforms) {
        const token = this.getToken(platform);

        if (!token) {
          results.push({
            platform,
            status: 'not_configured',
            setup: this.getSetupInstructions(platform),
          });
          continue;
        }

        // Post to platform API
        const result = await this.postTo(platform, params, token);
        results.push(result);

        // Record in history
        postHistory.push({
          id: `post-${Date.now()}`,
          platform,
          content: params.content,
          postedAt: new Date(),
          metrics: { likes: 0, comments: 0, shares: 0, reach: 0 },
        });
      }

      return this.success({ results, platforms });
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  private getToken(platform: string): string | undefined {
    const tokens: Record<string, string | undefined> = {
      instagram: process.env.INSTAGRAM_ACCESS_TOKEN,
      facebook: process.env.FACEBOOK_PAGE_TOKEN,
      tiktok: process.env.TIKTOK_ACCESS_TOKEN,
    };
    return tokens[platform];
  }

  private getSetupInstructions(platform: string): string {
    const instructions: Record<string, string> = {
      instagram: 'Configure INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_BUSINESS_ID no .env (requer Meta Business Suite)',
      facebook: 'Configure FACEBOOK_PAGE_TOKEN e FACEBOOK_PAGE_ID no .env',
      tiktok: 'Configure TIKTOK_ACCESS_TOKEN no .env (requer TikTok Developer)',
    };
    return instructions[platform] || 'Token nao configurado';
  }

  private async postTo(platform: string, params: any, token: string): Promise<any> {
    try {
      if (platform === 'facebook') {
        const pageId = process.env.FACEBOOK_PAGE_ID;
        const message = params.content + (params.hashtags?.length ? '\n\n' + params.hashtags.map((h: string) => `#${h}`).join(' ') : '');

        if (params.image) {
          const res = await fetch(`https://graph.facebook.com/v18.0/${pageId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: params.image, message, access_token: token }),
          });
          const data: any = await res.json();
          return { platform, status: 'posted', postId: data.id };
        } else {
          const res = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, link: params.link, access_token: token }),
          });
          const data: any = await res.json();
          return { platform, status: 'posted', postId: data.id };
        }
      }

      if (platform === 'instagram') {
        const igId = process.env.INSTAGRAM_BUSINESS_ID;
        const caption = params.content + (params.hashtags?.length ? '\n\n' + params.hashtags.map((h: string) => `#${h}`).join(' ') : '');

        // Step 1: Create media container
        const createRes = await fetch(`https://graph.facebook.com/v18.0/${igId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: params.image,
            caption,
            access_token: token,
          }),
        });
        const container: any = await createRes.json();

        // Step 2: Publish
        const publishRes = await fetch(`https://graph.facebook.com/v18.0/${igId}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: container.id, access_token: token }),
        });
        const published: any = await publishRes.json();
        return { platform, status: 'posted', postId: published.id };
      }

      return { platform, status: 'api_pending', message: `${platform} API integration ready` };
    } catch (error: any) {
      return { platform, status: 'error', error: error.message };
    }
  }
}

// ============================================================================
// social.schedule - Agenda posts
// ============================================================================
export class SocialScheduleSkill extends SkillBase {
  name = 'social.schedule';
  description = 'Agenda posts com calendario editorial';
  category = 'social';
  dangerous = false;

  parameters = {
    action: { type: 'string', required: true, description: 'Action: add, list, cancel, calendar' },
    platform: { type: 'string', required: false, description: 'Platform: instagram, facebook, tiktok, all' },
    content: { type: 'string', required: false, description: 'Texto do post' },
    image: { type: 'string', required: false, description: 'Imagem' },
    scheduledFor: { type: 'string', required: false, description: 'Data/hora ISO (ex: 2026-02-10T14:00:00)' },
    hashtags: { type: 'array', required: false, description: 'Hashtags' },
    id: { type: 'string', required: false, description: 'Post ID para cancelar' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      switch (params.action) {
        case 'add': {
          if (!params.content || !params.scheduledFor) {
            return this.error('content e scheduledFor obrigatorios');
          }
          const id = `sched-${Date.now()}`;
          const post: ScheduledPost = {
            id,
            platform: params.platform === 'all' ? ['instagram', 'facebook', 'tiktok'] : [params.platform || 'instagram'],
            content: params.content,
            image: params.image,
            scheduledFor: new Date(params.scheduledFor),
            status: 'pending',
            hashtags: params.hashtags || [],
          };
          scheduledPosts.set(id, post);
          return this.success({ scheduled: post });
        }

        case 'list': {
          const posts = Array.from(scheduledPosts.values())
            .filter(p => p.status === 'pending')
            .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
          return this.success({ posts, total: posts.length });
        }

        case 'cancel': {
          if (!params.id) return this.error('ID obrigatorio');
          scheduledPosts.delete(params.id);
          return this.success({ cancelled: params.id });
        }

        case 'calendar': {
          const posts = Array.from(scheduledPosts.values())
            .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

          const calendar: Record<string, any[]> = {};
          posts.forEach(p => {
            const day = p.scheduledFor.toISOString().split('T')[0];
            if (!calendar[day]) calendar[day] = [];
            calendar[day].push({
              id: p.id,
              time: p.scheduledFor.toISOString().split('T')[1]?.slice(0, 5),
              platform: p.platform,
              content: p.content.slice(0, 50),
              status: p.status,
            });
          });

          return this.success({ calendar });
        }

        default:
          return this.error('Action invalida');
      }
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// social.caption - IA gera legendas + hashtags
// ============================================================================
export class SocialCaptionSkill extends SkillBase {
  name = 'social.caption';
  description = 'IA gera legendas + hashtags para area de saude';
  category = 'social';
  dangerous = false;

  parameters = {
    topic: { type: 'string', required: true, description: 'Tema do post (ex: botox, limpeza de pele)' },
    tone: { type: 'string', required: false, description: 'Tom: professional, friendly, educational, promotional' },
    platform: { type: 'string', required: false, description: 'Platform para otimizar tamanho' },
    includeEmojis: { type: 'boolean', required: false, description: 'Incluir emojis' },
    includeCTA: { type: 'boolean', required: false, description: 'Incluir call to action' },
    language: { type: 'string', required: false, description: 'Idioma (default: pt-BR)' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { topic, tone = 'professional', platform = 'instagram', includeEmojis = true, includeCTA = true } = params;

      // Generate caption using AI if available
      const claudeKey = process.env.ANTHROPIC_API_KEY;

      if (claudeKey) {
        const prompt = `Gere uma legenda para ${platform} sobre "${topic}" para uma clinica de saude/estetica.
Tom: ${tone}
${includeEmojis ? 'Inclua emojis relevantes.' : 'Sem emojis.'}
${includeCTA ? 'Inclua call to action no final.' : ''}
Gere também 15-20 hashtags relevantes em portugues.
Formato: primeiro a legenda, depois as hashtags separadas.`;

        try {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': claudeKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 500,
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          const data: any = await res.json();
          const content = data.content?.[0]?.text || '';

          // Split caption and hashtags
          const parts = content.split(/\n\n(?=#)/);
          const caption = parts[0] || content;
          const hashtagsText = parts[1] || '';
          const hashtags = hashtagsText.match(/#\w+/g) || this.getDefaultHashtags(topic);

          return this.success({ caption, hashtags, topic, platform, generatedByAI: true });
        } catch {
          // Fallback to template
        }
      }

      // Template fallback
      const caption = this.generateTemplate(topic, tone, includeEmojis, includeCTA);
      const hashtags = this.getDefaultHashtags(topic);

      return this.success({ caption, hashtags, topic, platform, generatedByAI: false });
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  private generateTemplate(topic: string, tone: string, emojis: boolean, cta: boolean): string {
    const e = emojis ? '✨ ' : '';
    const ctaText = cta ? '\n\nAgende sua avaliacao! Link na bio.' : '';

    const templates: Record<string, string> = {
      professional: `${e}${topic}: O que voce precisa saber\n\nNossa equipe especializada oferece os melhores tratamentos em ${topic}, com tecnologia de ponta e resultados comprovados.${ctaText}`,
      friendly: `${e}Voce ja conhece os beneficios de ${topic}?\n\nVem descobrir como podemos te ajudar a se sentir ainda melhor!${ctaText}`,
      educational: `${e}Voce sabia?\n\n${topic} e um dos tratamentos mais procurados atualmente. Entenda como funciona e quais os beneficios para a sua saude.${ctaText}`,
      promotional: `${e}PROMOCAO ESPECIAL!\n\n${topic} com condicoes imperdveis este mes. Vagas limitadas!${ctaText}`,
    };

    return templates[tone] || templates.professional;
  }

  private getDefaultHashtags(topic: string): string[] {
    const base = ['#saude', '#bemestar', '#clinica', '#tratamento', '#cuidadocomvoce', '#qualidadedevida'];
    const topicTag = `#${topic.replace(/\s+/g, '').toLowerCase()}`;
    return [topicTag, ...base, '#estetica', '#beleza', '#resultados', '#antesedepois'];
  }
}

// ============================================================================
// social.reels - Gera roteiros de Reels/Shorts
// ============================================================================
export class SocialReelsSkill extends SkillBase {
  name = 'social.reels';
  description = 'Gera roteiros de Reels/Shorts com IA';
  category = 'social';
  dangerous = false;

  parameters = {
    topic: { type: 'string', required: true, description: 'Tema do video' },
    duration: { type: 'number', required: false, description: 'Duracao em segundos (15, 30, 60)' },
    style: { type: 'string', required: false, description: 'Estilo: tutorial, antes_depois, depoimento, dica_rapida, bastidores' },
    hook: { type: 'string', required: false, description: 'Gancho/abertura personalizada' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { topic, duration = 30, style = 'dica_rapida', hook } = params;

      const claudeKey = process.env.ANTHROPIC_API_KEY;

      if (claudeKey) {
        const prompt = `Crie um roteiro de Reels/Shorts de ${duration} segundos sobre "${topic}" para uma clinica.
Estilo: ${style}
${hook ? `Gancho de abertura: ${hook}` : ''}

Formato do roteiro:
[CENA 1 - Xs] Descricao visual | Texto/fala
[CENA 2 - Xs] Descricao visual | Texto/fala
...
MUSICA SUGERIDA: ...
HASHTAGS: ...
LEGENDA: ...`;

        try {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': claudeKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 800,
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          const data: any = await res.json();
          const script = data.content?.[0]?.text || '';

          return this.success({ script, topic, duration, style, generatedByAI: true });
        } catch { /* fallback */ }
      }

      // Template fallback
      const script = this.generateTemplate(topic, duration, style, hook);
      return this.success({ script, topic, duration, style, generatedByAI: false });
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  private generateTemplate(topic: string, duration: number, style: string, hook?: string): string {
    const openingHook = hook || `Voce sabia disso sobre ${topic}?`;

    return `=== ROTEIRO REELS - ${duration}s ===

[CENA 1 - 3s] Close no rosto do profissional
"${openingHook}"

[CENA 2 - 5s] Imagem do procedimento/clinica
"${topic} e um dos tratamentos mais procurados..."

[CENA 3 - 10s] Mostrando o processo/resultado
"Os beneficios incluem..."

[CENA 4 - 5s] Antes e depois / depoimento
"Veja a diferenca..."

[CENA 5 - 5s] Call to action + logo
"Agende sua avaliacao! Link na bio"

MUSICA: Trending audio do momento
LEGENDA: ${openingHook} Confira!
HASHTAGS: #${topic.replace(/\s/g, '')} #reels #clinica #saude`;
  }
}

// ============================================================================
// social.analytics - Metricas de engajamento
// ============================================================================
export class SocialAnalyticsSkill extends SkillBase {
  name = 'social.analytics';
  description = 'Metricas de engajamento por plataforma';
  category = 'social';
  dangerous = false;

  parameters = {
    platform: { type: 'string', required: false, description: 'Platform: instagram, facebook, tiktok, all' },
    period: { type: 'string', required: false, description: 'Period: today, week, month' },
    action: { type: 'string', required: false, description: 'Action: overview, posts, engagement, growth' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { platform = 'all', period = 'month', action = 'overview' } = params;

      // Try to get real data from APIs
      const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
      const fbToken = process.env.FACEBOOK_PAGE_TOKEN;

      if (igToken && (platform === 'instagram' || platform === 'all')) {
        try {
          const igId = process.env.INSTAGRAM_BUSINESS_ID;
          const res = await fetch(
            `https://graph.facebook.com/v18.0/${igId}/insights?metric=impressions,reach,profile_views&period=day&access_token=${igToken}`
          );
          const data: any = await res.json();
          if (data.data) {
            return this.success({ platform: 'instagram', insights: data.data, realData: true });
          }
        } catch { /* fallback */ }
      }

      // Return post history analytics
      const relevantPosts = postHistory.filter(p => {
        if (platform !== 'all' && p.platform !== platform) return false;
        return true;
      });

      const totalLikes = relevantPosts.reduce((s, p) => s + p.metrics.likes, 0);
      const totalComments = relevantPosts.reduce((s, p) => s + p.metrics.comments, 0);
      const totalShares = relevantPosts.reduce((s, p) => s + p.metrics.shares, 0);
      const totalReach = relevantPosts.reduce((s, p) => s + p.metrics.reach, 0);

      return this.success({
        period,
        platform,
        posts: relevantPosts.length,
        metrics: {
          likes: totalLikes,
          comments: totalComments,
          shares: totalShares,
          reach: totalReach,
          engagementRate: totalReach > 0
            ? `${((totalLikes + totalComments + totalShares) / totalReach * 100).toFixed(2)}%`
            : '0%',
        },
        scheduledPosts: Array.from(scheduledPosts.values()).filter(p => p.status === 'pending').length,
        setup: !igToken && !fbToken ? 'Configure tokens de redes sociais no .env para dados reais' : undefined,
      });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

export const socialSkills = [
  new SocialPostSkill(),
  new SocialScheduleSkill(),
  new SocialCaptionSkill(),
  new SocialReelsSkill(),
  new SocialAnalyticsSkill(),
];

export default socialSkills;
