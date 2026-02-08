/**
 * Skills de Web/HTTP
 * web.fetch, web.scrape
 */

import { Skill, SkillInput, SkillOutput } from '../base';

// ============================================================================
// WEB.FETCH
// ============================================================================

export class WebFetchSkill extends Skill {
  constructor() {
    super(
      {
        name: 'web.fetch',
        description: 'Faz requisições HTTP',
        version: '1.0.0',
        category: 'WEB',
        tags: ['http', 'fetch', 'api', 'request'],
      },
      {
        timeout: 30000,
        retries: 3,
      }
    );
  }

  validate(input: SkillInput): boolean {
    if (!input.url || typeof input.url !== 'string') {
      return false;
    }
    try {
      new URL(input.url);
      return true;
    } catch {
      return false;
    }
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      responseType = 'json',
    } = input;

    try {
      const options: RequestInit = {
        method,
        headers: {
          'User-Agent': 'OpenClaw-Aurora/1.0',
          ...headers,
        },
      };

      if (body && method !== 'GET') {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
        if (!headers['Content-Type']) {
          (options.headers as any)['Content-Type'] = 'application/json';
        }
      }

      const response = await fetch(url, options);
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let data: any;
      switch (responseType) {
        case 'json':
          data = await response.json();
          break;
        case 'text':
          data = await response.text();
          break;
        case 'blob':
          data = await response.blob();
          break;
        default:
          data = await response.text();
      }

      return {
        success: response.ok,
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: data,
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

// ============================================================================
// WEB.SCRAPE (básico, sem browser)
// ============================================================================

export class WebScrapeSkill extends Skill {
  constructor() {
    super(
      {
        name: 'web.scrape',
        description: 'Extrai conteúdo de páginas web',
        version: '1.0.0',
        category: 'WEB',
        tags: ['scrape', 'extract', 'html', 'web'],
      },
      { timeout: 30000 }
    );
  }

  validate(input: SkillInput): boolean {
    if (!input.url || typeof input.url !== 'string') {
      return false;
    }
    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { url, selector, extractType = 'text' } = input;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenClaw-Aurora/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();

      // Extração básica sem DOM parser (para Node.js simples)
      let extracted: any = {
        html,
        length: html.length,
      };

      // Extrai título
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch) {
        extracted.title = titleMatch[1].trim();
      }

      // Extrai meta description
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
      if (descMatch) {
        extracted.description = descMatch[1].trim();
      }

      // Remove tags HTML para texto puro
      if (extractType === 'text') {
        extracted.text = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 10000); // Limita a 10k caracteres
      }

      // Extrai links
      const links: string[] = [];
      const linkRegex = /<a[^>]*href=["']([^"']*)["']/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null && links.length < 100) {
        links.push(match[1]);
      }
      extracted.links = links;

      return {
        success: true,
        data: extracted,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
