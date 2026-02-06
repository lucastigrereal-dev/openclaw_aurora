/**
 * Hub Enterprise - Configuration
 * Configurações centralizadas para o Hub Enterprise
 */

export interface HubConfig {
  // Timeouts
  timeouts: {
    personaExecution: number; // ms
    orchestratorTimeout: number; // ms
    aiCallTimeout: number; // ms
  };

  // Rate limits
  rateLimits: {
    maxRequestsPerMinute: number;
    maxPersonasPerDay: number;
    maxAppsCreatedPerDay: number;
  };

  // Resource limits
  resourceLimits: {
    maxAppSizeMB: number;
    maxFilesPerApp: number;
    maxCodeGenerationTokens: number;
  };

  // AI Configuration
  ai: {
    provider: 'claude' | 'gpt' | 'both';
    model: string;
    maxTokens: number;
    temperature: number;
  };

  // Template paths
  templates: {
    baseDir: string;
    backendTemplates: string[];
    frontendTemplates: string[];
    dataTemplates: string[];
  };

  // Output paths
  output: {
    appsDir: string;
    logsDir: string;
    reportsDir: string;
  };

  // Feature flags
  features: {
    enableSupabaseArchon: boolean;
    enableGuardrail: boolean;
    enableAuroraMonitor: boolean;
    enableSocialHubIntegration: boolean;
  };

  // Integrations
  integrations: {
    supabaseUrl?: string;
    telegramBotToken?: string;
    githubuApiToken?: string;
  };
}

const defaultConfig: HubConfig = {
  timeouts: {
    personaExecution: 300000, // 5 minutes
    orchestratorTimeout: 600000, // 10 minutes
    aiCallTimeout: 60000, // 1 minute
  },

  rateLimits: {
    maxRequestsPerMinute: 10,
    maxPersonasPerDay: 100,
    maxAppsCreatedPerDay: 20,
  },

  resourceLimits: {
    maxAppSizeMB: 100,
    maxFilesPerApp: 500,
    maxCodeGenerationTokens: 4000,
  },

  ai: {
    provider: 'claude',
    model: 'claude-3-sonnet-20240229',
    maxTokens: 4000,
    temperature: 0.7,
  },

  templates: {
    baseDir: 'skills/hub-enterprise/templates',
    backendTemplates: [
      'rest-api-express',
      'graphql-apollo',
      'grpc-service',
      'message-queue',
      'serverless-lambda',
    ],
    frontendTemplates: ['react-spa', 'nextjs-app', 'admin-dashboard'],
    dataTemplates: ['postgresql', 'mongodb', 'redis', 'elasticsearch'],
  },

  output: {
    appsDir: 'apps',
    logsDir: 'logs/hub-enterprise',
    reportsDir: 'reports/hub-enterprise',
  },

  features: {
    enableSupabaseArchon: true,
    enableGuardrail: true,
    enableAuroraMonitor: true,
    enableSocialHubIntegration: false,
  },

  integrations: {
    supabaseUrl: process.env.SUPABASE_URL,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    githubuApiToken: process.env.GITHUB_TOKEN,
  },
};

let currentConfig = { ...defaultConfig };

export function getConfig(): HubConfig {
  return currentConfig;
}

export function setConfig(config: Partial<HubConfig>) {
  currentConfig = { ...currentConfig, ...config };
}

export function resetConfig() {
  currentConfig = { ...defaultConfig };
}

export default currentConfig;
