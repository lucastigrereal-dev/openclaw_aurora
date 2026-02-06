/**
 * Social Hub Configuration
 *
 * Configuração centralizada para o Hub de Skills do Instagram
 *
 * @version 1.0.0
 */

export interface SocialHubConfig {
  // Publer API
  publisherApiKey: string;

  // Instagram Business API
  instagramAccessToken?: string;
  instagramBusinessAccountId?: string;

  // Anthropic AI
  anthropicApiKey: string;

  // Trending Hashtags API (RapidAPI)
  trendingApiKey?: string;

  // Caminhos
  socialHubPath: string;        // Caminho do projeto SOCIAL-HUB

  // Configurações padrão
  defaults: {
    planningDays: number;        // Dias de planejamento (default: 30)
    captionVariations: number;   // Variações de legenda (default: 3)
    maxHashtags: number;         // Max hashtags (default: 30)
    batchSize: number;           // Batch para agendamento (default: 10)
  };
}

/**
 * Carrega configuração do ambiente ou arquivo
 */
export function loadSocialHubConfig(): SocialHubConfig {
  // Tentar carregar de variáveis de ambiente primeiro
  const config: SocialHubConfig = {
    publisherApiKey: process.env.PUBLER_API_KEY || 'cb8e8eda44390f8878f5b5ad9ddd19d84c165748e5b65a09',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

    instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
    instagramBusinessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,

    trendingApiKey: process.env.RAPIDAPI_KEY,

    socialHubPath: process.env.SOCIAL_HUB_PATH || '/mnt/c/Users/lucas/Downloads/Downloads_COMET/social-hub-moltbot/SOCIAL-HUB',

    defaults: {
      planningDays: 30,
      captionVariations: 3,
      maxHashtags: 30,
      batchSize: 10,
    },
  };

  return config;
}

/**
 * Valida configuração
 */
export function validateSocialHubConfig(config: SocialHubConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Obrigatórios
  if (!config.publisherApiKey) {
    errors.push('Missing publisherApiKey');
  }

  if (!config.anthropicApiKey) {
    errors.push('Missing anthropicApiKey (required for AI features)');
  }

  if (!config.socialHubPath) {
    errors.push('Missing socialHubPath');
  }

  // Warnings (não impedem funcionamento)
  if (!config.instagramAccessToken) {
    console.warn('[SocialHubConfig] Instagram access token not configured - analytics disabled');
  }

  if (!config.trendingApiKey) {
    console.warn('[SocialHubConfig] Trending API key not configured - using fallback hashtags');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Singleton da configuração
 */
let configInstance: SocialHubConfig | null = null;

export function getSocialHubConfig(): SocialHubConfig {
  if (!configInstance) {
    configInstance = loadSocialHubConfig();

    const validation = validateSocialHubConfig(configInstance);
    if (!validation.valid) {
      throw new Error(
        `Invalid Social Hub configuration:\n${validation.errors.join('\n')}`
      );
    }
  }

  return configInstance;
}

/**
 * Atualiza configuração em runtime
 */
export function updateSocialHubConfig(updates: Partial<SocialHubConfig>): void {
  if (!configInstance) {
    configInstance = loadSocialHubConfig();
  }

  configInstance = {
    ...configInstance,
    ...updates,
  };

  const validation = validateSocialHubConfig(configInstance);
  if (!validation.valid) {
    throw new Error(
      `Invalid configuration after update:\n${validation.errors.join('\n')}`
    );
  }
}
