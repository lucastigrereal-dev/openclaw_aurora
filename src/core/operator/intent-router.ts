/**
 * O-01: Intent Router Pro
 * Classifica entrada em intencao + urgencia + categoria + skill recomendada
 * Suporta portugues e ingles
 */

import { AVAILABLE_SKILLS } from './index';

// ============================================================================
// TIPOS
// ============================================================================

export interface IntentResult {
  /** Intencao detectada */
  intent: IntentType;
  /** Confianca 0-1 */
  confidence: number;
  /** Skill recomendada */
  suggestedSkill: string | null;
  /** Skills alternativas */
  alternatives: string[];
  /** Urgencia */
  urgency: 'low' | 'medium' | 'high' | 'critical';
  /** Categoria detectada */
  category: string;
  /** Entidades extraidas (urls, paths, numeros, etc) */
  entities: Record<string, string>;
  /** Input pre-processado pra skill */
  preparedInput: Record<string, any>;
}

export type IntentType =
  | 'execute_command'     // Rodar algo no terminal
  | 'ask_ai'             // Perguntar algo pra IA
  | 'browse_web'         // Navegar/interagir com browser
  | 'control_desktop'    // Controlar desktop (click, type, etc)
  | 'manage_file'        // Operacao de arquivo
  | 'send_message'       // Enviar mensagem
  | 'generate_content'   // Gerar conteudo (blog, caption, etc)
  | 'analyze_data'       // Analisar metricas/dados
  | 'manage_marketing'   // Marketing (leads, funil, ads)
  | 'social_media'       // Redes sociais
  | 'check_status'       // Status do sistema
  | 'get_help'           // Pedir ajuda
  | 'unknown';           // Nao identificado

// ============================================================================
// PATTERNS - Portugues + Ingles
// ============================================================================

interface PatternRule {
  intent: IntentType;
  patterns: RegExp[];
  category: string;
  defaultSkill: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  entityExtractors?: Record<string, RegExp>;
}

const RULES: PatternRule[] = [
  // EXECUTE COMMAND
  {
    intent: 'execute_command',
    patterns: [
      /^(execute?|roda?|run)\s+/i,
      /^(exec|ps|py|node)\s+/i,
      /\b(terminal|shell|bash|powershell|comando)\b/i,
      /^[\$>]\s*/,
      /\b(instala[r]?|install|npm|pip|apt)\s/i,
    ],
    category: 'EXEC',
    defaultSkill: 'exec.bash',
    urgency: 'medium',
    entityExtractors: {
      command: /(?:execute?|roda?|run)\s+(.+)/i,
    },
  },

  // ASK AI
  {
    intent: 'ask_ai',
    patterns: [
      /\b(pergunt[ae]|ask|explain|explica|o que [ée]|como funciona|me diz|me fala)\b/i,
      /\b(resuma|resume|traduz[ai]?|translate|analise?|avali[ae])\b/i,
      /\b(gere? um texto|escreva?|write|redija)\b/i,
      /\?$/,
    ],
    category: 'AI',
    defaultSkill: 'ai.claude',
    urgency: 'low',
    entityExtractors: {
      prompt: /(?:pergunt[ae]|ask|explica)\s+(.+)/i,
    },
  },

  // BROWSE WEB
  {
    intent: 'browse_web',
    patterns: [
      /\b(abr[ae]|open|naveg[ae]|acessa?)\s+(https?:\/\/|www\.)/i,
      /\b(screenshot|captura|print)\s+(d[ao]|of|from)?\s*(p[aá]gina|page|site|url)/i,
      /\b(extrair?|extract|scrape?)\s+(dados?|data|info)/i,
      /\b(clica?|click)\s+(em|on|no|na)\s+/i,
      /\b(digit[ae]|type)\s+(no|in|em)\s+(campo|field|input)/i,
      /\bhttps?:\/\/\S+/i,
    ],
    category: 'BROWSER',
    defaultSkill: 'browser.open',
    urgency: 'medium',
    entityExtractors: {
      url: /\b(https?:\/\/\S+)/i,
      selector: /(?:clica?|click)\s+(?:em|on|no|na)\s+["']?([^"'\s]+)/i,
    },
  },

  // CONTROL DESKTOP
  {
    intent: 'control_desktop',
    patterns: [
      /\b(clica?|click)\s+(?:em|na?o?)?\s*(\d+)\s*[,\s]\s*(\d+)/i,
      /\b(move?|mover?)\s+(mouse|cursor)/i,
      /\b(press(?:ion[ae])?|aperta?)\s+(enter|tab|esc|ctrl|alt|shift)/i,
      /\b(screenshot|captura|print)\s+(d[ao]|of)?\s*(tela|desktop|screen)/i,
      /\b(janel[ao]|window)\s+(list|foc|minim|maxim|fecha|close)/i,
      /\b(scroll|rola[r]?)\s+(up|down|cima|baixo)/i,
      /\b(digit[ae]|type)\s+["'](.+?)["']/i,
    ],
    category: 'AUTOPC',
    defaultSkill: 'autopc.click',
    urgency: 'medium',
    entityExtractors: {
      x: /(\d{2,4})\s*[,\s]\s*\d{2,4}/,
      y: /\d{2,4}\s*[,\s]\s*(\d{2,4})/,
      key: /(?:press(?:ion[ae])?|aperta?)\s+(\w+)/i,
      text: /(?:digit[ae]|type)\s+["'](.+?)["']/i,
    },
  },

  // MANAGE FILE
  {
    intent: 'manage_file',
    patterns: [
      /\b(l[eê][r]?|read|abre?|cat)\s+(arquivo|file|ficheiro)/i,
      /\b(escrev[ae]|write|salva?|save)\s+(arquivo|file|em)\b/i,
      /\b(list[ae]|ls|dir)\s+(pasta|folder|dir)/i,
      /\b(delet[ae]|remov[ae]|delete|remove|rm)\s+(arquivo|file)/i,
      /\b(l[eê][r]?|read|cat)\s+\S+\.\w{1,5}$/i,
    ],
    category: 'FILE',
    defaultSkill: 'file.read',
    urgency: 'low',
    entityExtractors: {
      path: /\b([\/\\]?\S+\.\w{1,5})\b/,
    },
  },

  // SEND MESSAGE
  {
    intent: 'send_message',
    patterns: [
      /\b(envi[ae]|send|mand[ae])\s+(mensagem|message|msg)/i,
      /\b(telegram|whatsapp|email|sms)\b/i,
      /\b(notific[ae]|notify|alert[ae])\b/i,
    ],
    category: 'COMM',
    defaultSkill: 'telegram.send',
    urgency: 'medium',
    entityExtractors: {
      message: /(?:envi[ae]|send|mand[ae])\s+(?:mensagem|message|msg)\s+["']?(.+)/i,
    },
  },

  // GENERATE CONTENT
  {
    intent: 'generate_content',
    patterns: [
      /\b(gera?|create|cria?)\s+(post|legenda|caption|artigo|blog|email|video|reel)/i,
      /\b(escrev[ae]|write)\s+(artigo|blog|post|email|legenda)/i,
      /\b(legenda|caption|hashtag)\s+(para?|for|do|da)/i,
      /\b(roteiro|script)\s+(de|para?|for)\s+(video|reel|short)/i,
      /\b(template|modelo)\s+(de|para?|for)\s+(email)/i,
      /\b(seo|otimiz)/i,
    ],
    category: 'CONTENT',
    defaultSkill: 'content.blog',
    urgency: 'low',
    entityExtractors: {
      topic: /(?:sobre|about|para?|for)\s+["']?(.+?)["']?\s*$/i,
      type: /\b(post|legenda|caption|artigo|blog|email|video|reel|short)\b/i,
    },
  },

  // ANALYZE DATA
  {
    intent: 'analyze_data',
    patterns: [
      /\b(analise?|analyze|relat[oó]rio|report|dashboard|metricas?|metrics)\b/i,
      /\b(roi|conversao|conversion|funil|funnel)\b/i,
      /\b(quantos?|quanto|how many|how much)\b/i,
      /\b(estat[ií]sticas?|stats|statistics)\b/i,
    ],
    category: 'ANALYTICS',
    defaultSkill: 'analytics.dashboard',
    urgency: 'low',
    entityExtractors: {
      period: /\b(hoje|today|semana|week|m[eê]s|month|ano|year)\b/i,
      channel: /\b(google|facebook|instagram|tiktok|email|telegram)\b/i,
    },
  },

  // MANAGE MARKETING
  {
    intent: 'manage_marketing',
    patterns: [
      /\b(lead[s]?|captac[aã]o|prospect)\b/i,
      /\b(funil|funnel|pipeline)\b/i,
      /\b(landing\s?page|pagina\s+de\s+captura)\b/i,
      /\b(ads?|an[uú]ncio|campanha|campaign)\b/i,
    ],
    category: 'MARKETING',
    defaultSkill: 'marketing.leads',
    urgency: 'medium',
    entityExtractors: {
      action: /\b(adicionar|add|listar|list|buscar|search|atualizar|update)\b/i,
    },
  },

  // SOCIAL MEDIA
  {
    intent: 'social_media',
    patterns: [
      /\b(post[ae]r?|publicar?|publish)\s+(no|na|on|em)\s+(instagram|facebook|tiktok)/i,
      /\b(agend[ae]r?|schedule)\s+(post|publicacao)/i,
      /\b(redes?\s+sociais?|social\s+media)\b/i,
      /\b(stories?|reels?|shorts?)\b/i,
    ],
    category: 'SOCIAL',
    defaultSkill: 'social.post',
    urgency: 'medium',
    entityExtractors: {
      platform: /\b(instagram|facebook|tiktok|twitter|linkedin)\b/i,
    },
  },

  // CHECK STATUS
  {
    intent: 'check_status',
    patterns: [
      /\b(status|estado|saude|health)\s+(do|da|of)?\s*(sistema|system|bot|server)?\b/i,
      /\b(como\s+est[aá]|how\s+is)\s+(o|the)?\s*(sistema|system|bot)?\b/i,
      /\b(uptime|online|ativo|running)\b/i,
      /^\/status$/i,
    ],
    category: 'SYSTEM',
    defaultSkill: '',
    urgency: 'low',
  },

  // GET HELP
  {
    intent: 'get_help',
    patterns: [
      /\b(ajuda|help|socorro|como\s+usar|how\s+to)\b/i,
      /\b(o\s+que\s+voc[eê]\s+(faz|pode|consegue))\b/i,
      /\b(quais?\s+(skills?|comandos?|commands?))\b/i,
      /^\/help$/i,
      /^\/skills$/i,
    ],
    category: 'SYSTEM',
    defaultSkill: '',
    urgency: 'low',
  },
];

// ============================================================================
// INTENT ROUTER
// ============================================================================

export class IntentRouter {
  private rules: PatternRule[] = RULES;

  /**
   * Classifica uma mensagem e retorna intencao + skill recomendada
   */
  route(message: string): IntentResult {
    const trimmed = message.trim();
    if (!trimmed) {
      return this.buildResult('unknown', 0, null, [], 'low', 'UNKNOWN', {}, {});
    }

    // 1. Tentar match por comando direto (/exec, /ask, etc)
    const directMatch = this.matchDirectCommand(trimmed);
    if (directMatch) return directMatch;

    // 2. Tentar match por patterns
    let bestMatch: { rule: PatternRule; confidence: number } | null = null;

    for (const rule of this.rules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(trimmed)) {
          const confidence = this.calculateConfidence(trimmed, rule);
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { rule, confidence };
          }
          break; // Ja matchou esse rule, proximo
        }
      }
    }

    if (!bestMatch) {
      // 3. Fallback: se tem ? no final, assume pergunta para IA
      if (trimmed.endsWith('?')) {
        return this.buildResult('ask_ai', 0.5, 'ai.claude', ['ai.gpt', 'ai.ollama'], 'low', 'AI', {},
          { prompt: trimmed });
      }

      return this.buildResult('unknown', 0, null, [], 'low', 'UNKNOWN', {}, {});
    }

    // Extrair entidades
    const entities: Record<string, string> = {};
    if (bestMatch.rule.entityExtractors) {
      for (const [key, regex] of Object.entries(bestMatch.rule.entityExtractors)) {
        const match = trimmed.match(regex);
        if (match && match[1]) {
          entities[key] = match[1].trim();
        }
      }
    }

    // Determinar skill especifica
    const { skill, alternatives } = this.resolveSkill(bestMatch.rule, trimmed, entities);

    // Preparar input
    const preparedInput = this.prepareInput(bestMatch.rule.intent, skill, trimmed, entities);

    return this.buildResult(
      bestMatch.rule.intent,
      bestMatch.confidence,
      skill,
      alternatives,
      bestMatch.rule.urgency,
      bestMatch.rule.category,
      entities,
      preparedInput
    );
  }

  /**
   * Match comandos diretos (ex: /exec ls, /ask pergunta)
   */
  private matchDirectCommand(message: string): IntentResult | null {
    const commandMap: Record<string, { intent: IntentType; skill: string; category: string }> = {
      '/exec': { intent: 'execute_command', skill: 'exec.bash', category: 'EXEC' },
      '/ps': { intent: 'execute_command', skill: 'exec.powershell', category: 'EXEC' },
      '/py': { intent: 'execute_command', skill: 'exec.python', category: 'EXEC' },
      '/node': { intent: 'execute_command', skill: 'exec.node', category: 'EXEC' },
      '/ask': { intent: 'ask_ai', skill: 'ai.claude', category: 'AI' },
      '/gpt': { intent: 'ask_ai', skill: 'ai.gpt', category: 'AI' },
      '/open': { intent: 'browse_web', skill: 'browser.open', category: 'BROWSER' },
      '/screenshot': { intent: 'browse_web', skill: 'browser.screenshot', category: 'BROWSER' },
      '/click': { intent: 'control_desktop', skill: 'autopc.click', category: 'AUTOPC' },
      '/pcclick': { intent: 'control_desktop', skill: 'autopc.click', category: 'AUTOPC' },
      '/pctype': { intent: 'control_desktop', skill: 'autopc.type', category: 'AUTOPC' },
      '/pcscreen': { intent: 'control_desktop', skill: 'autopc.screenshot', category: 'AUTOPC' },
      '/read': { intent: 'manage_file', skill: 'file.read', category: 'FILE' },
      '/write': { intent: 'manage_file', skill: 'file.write', category: 'FILE' },
      '/ls': { intent: 'manage_file', skill: 'file.list', category: 'FILE' },
    };

    for (const [cmd, config] of Object.entries(commandMap)) {
      if (message.startsWith(cmd + ' ') || message === cmd) {
        const args = message.slice(cmd.length).trim();
        return this.buildResult(
          config.intent, 1.0, config.skill, [],
          'medium', config.category,
          { args },
          this.prepareInput(config.intent, config.skill, args, { args })
        );
      }
    }

    return null;
  }

  /**
   * Calcula confianca do match
   */
  private calculateConfidence(message: string, rule: PatternRule): number {
    let matchCount = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(message)) matchCount++;
    }

    // Base: quantos patterns matcharam
    let confidence = Math.min(0.4 + (matchCount * 0.2), 0.95);

    // Boost: mensagem curta e direta
    if (message.split(' ').length <= 5) confidence += 0.1;

    // Boost: tem entidade extraida
    if (rule.entityExtractors) {
      for (const regex of Object.values(rule.entityExtractors)) {
        if (regex.test(message)) confidence += 0.05;
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Resolve skill especifica dentro da categoria
   */
  private resolveSkill(
    rule: PatternRule,
    message: string,
    entities: Record<string, string>
  ): { skill: string; alternatives: string[] } {
    const msg = message.toLowerCase();
    let skill = rule.defaultSkill;
    const alternatives: string[] = [];

    // Resolucoes especificas por intent
    switch (rule.intent) {
      case 'execute_command':
        if (/powershell|ps1/i.test(msg)) skill = 'exec.powershell';
        else if (/python|\.py/i.test(msg)) skill = 'exec.python';
        else if (/node|\.js|\.ts/i.test(msg)) skill = 'exec.node';
        alternatives.push('exec.bash', 'exec.powershell', 'exec.python', 'exec.node');
        break;

      case 'ask_ai':
        if (/gpt|openai/i.test(msg)) skill = 'ai.gpt';
        else if (/ollama|local/i.test(msg)) skill = 'ai.ollama';
        alternatives.push('ai.claude', 'ai.gpt', 'ai.ollama');
        break;

      case 'browse_web':
        if (/screenshot|captura|print/i.test(msg)) skill = 'browser.screenshot';
        else if (/extrai|extract|scrape/i.test(msg)) skill = 'browser.extract';
        else if (/pdf/i.test(msg)) skill = 'browser.pdf';
        else if (/clica?|click/i.test(msg)) skill = 'browser.click';
        else if (/digit|type/i.test(msg)) skill = 'browser.type';
        alternatives.push('browser.open', 'browser.screenshot', 'browser.extract');
        break;

      case 'control_desktop':
        if (/screenshot|captura|print|tela|screen/i.test(msg)) skill = 'autopc.screenshot';
        else if (/press|aperta|tecla/i.test(msg)) skill = 'autopc.press';
        else if (/digit|type/i.test(msg)) skill = 'autopc.type';
        else if (/move|mover|cursor/i.test(msg)) skill = 'autopc.move';
        else if (/janel|window/i.test(msg)) skill = 'autopc.window';
        else if (/scroll|rola/i.test(msg)) skill = 'autopc.scroll';
        alternatives.push('autopc.click', 'autopc.screenshot', 'autopc.type');
        break;

      case 'manage_file':
        if (/escrev|write|salv/i.test(msg)) skill = 'file.write';
        else if (/list|ls|dir/i.test(msg)) skill = 'file.list';
        else if (/delet|remov|rm/i.test(msg)) skill = 'file.delete';
        alternatives.push('file.read', 'file.write', 'file.list');
        break;

      case 'generate_content':
        if (/legenda|caption|hashtag/i.test(msg)) skill = 'social.caption';
        else if (/email|template/i.test(msg)) skill = 'content.email';
        else if (/video|roteiro|script/i.test(msg)) skill = 'content.video';
        else if (/reel|short/i.test(msg)) skill = 'social.reels';
        else if (/image|arte|design/i.test(msg)) skill = 'content.image';
        alternatives.push('content.blog', 'social.caption', 'content.email', 'content.video');
        break;

      case 'analyze_data':
        if (/roi/i.test(msg)) skill = 'analytics.roi';
        else if (/convers[aã]o|conversion|funil|funnel/i.test(msg)) skill = 'analytics.conversion';
        else if (/relat[oó]rio|report/i.test(msg)) skill = 'analytics.report';
        alternatives.push('analytics.dashboard', 'analytics.roi', 'analytics.report');
        break;

      case 'manage_marketing':
        if (/landing|p[aá]gina/i.test(msg)) skill = 'marketing.landing';
        else if (/funil|funnel/i.test(msg)) skill = 'marketing.funnel';
        else if (/ads?|an[uú]ncio/i.test(msg)) skill = 'marketing.ads';
        alternatives.push('marketing.leads', 'marketing.landing', 'marketing.funnel');
        break;

      case 'social_media':
        if (/agend|schedule/i.test(msg)) skill = 'social.schedule';
        else if (/analytic|metr/i.test(msg)) skill = 'social.analytics';
        else if (/legenda|caption/i.test(msg)) skill = 'social.caption';
        else if (/reel|short/i.test(msg)) skill = 'social.reels';
        alternatives.push('social.post', 'social.schedule', 'social.caption');
        break;
    }

    // Remove a skill principal das alternatives
    return {
      skill,
      alternatives: alternatives.filter(a => a !== skill),
    };
  }

  /**
   * Prepara input pra skill baseado na intencao
   */
  private prepareInput(
    intent: IntentType,
    skill: string,
    message: string,
    entities: Record<string, string>
  ): Record<string, any> {
    switch (intent) {
      case 'execute_command':
        return { command: entities.command || entities.args || message };
      case 'ask_ai':
        return { prompt: entities.prompt || entities.args || message };
      case 'browse_web':
        return {
          url: entities.url || '',
          selector: entities.selector || '',
        };
      case 'control_desktop':
        return {
          x: entities.x ? parseInt(entities.x) : undefined,
          y: entities.y ? parseInt(entities.y) : undefined,
          key: entities.key || '',
          text: entities.text || '',
        };
      case 'manage_file':
        return { path: entities.path || '', content: '' };
      case 'send_message':
        return { message: entities.message || message };
      case 'generate_content':
        return {
          topic: entities.topic || message,
          type: entities.type || 'blog',
        };
      case 'analyze_data':
        return {
          period: entities.period || 'month',
          channel: entities.channel || 'all',
        };
      case 'manage_marketing':
        return { action: entities.action || 'list' };
      case 'social_media':
        return { platform: entities.platform || 'instagram' };
      default:
        return { raw: message };
    }
  }

  private buildResult(
    intent: IntentType,
    confidence: number,
    suggestedSkill: string | null,
    alternatives: string[],
    urgency: 'low' | 'medium' | 'high' | 'critical',
    category: string,
    entities: Record<string, string>,
    preparedInput: Record<string, any>
  ): IntentResult {
    return {
      intent,
      confidence: Math.round(confidence * 100) / 100,
      suggestedSkill,
      alternatives,
      urgency,
      category,
      entities,
      preparedInput,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let routerInstance: IntentRouter | null = null;

export function getIntentRouter(): IntentRouter {
  if (!routerInstance) {
    routerInstance = new IntentRouter();
  }
  return routerInstance;
}
