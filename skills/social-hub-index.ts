/**
 * Social Hub Skills - Index & Registry
 *
 * Hub completo de skills para automação de Instagram
 *
 * @version 1.0.0
 */

import { getSkillRegistryV2 } from './skill-registry-v2';
import { SkillStatus, SkillRiskLevel } from './skill-spec';

// Skills - Basic
import { SocialHubPlanner } from './social-hub-planner';
import { SocialHubPubler } from './social-hub-publer';
import { SocialHubCaptionAI } from './social-hub-caption-ai';
import { SocialHubHashtagAI } from './social-hub-hashtag-ai';
import { SocialHubInventory } from './social-hub-inventory';
import { SocialHubAnalytics } from './social-hub-analytics';
import { SocialHubOrchestrator } from './social-hub-orchestrator';

// Skills - Enterprise (NEW)
import { SocialHubPublerV2 } from './social-hub-publer-v2';
import { SocialHubVideoEnricher } from './social-hub-video-enricher';
import { SocialHubQuotaEnforcer } from './social-hub-quota-enforcer';
import { SocialHubAnalyticsCollector } from './social-hub-analytics-collector';
import { SocialHubApprovalWorkflow } from './social-hub-approval-workflow';
import { SocialHubDatabaseManager } from './social-hub-database-manager';
import { SocialHubObservability } from './social-hub-observability';

// Config
import { getSocialHubConfig } from './social-hub-config';

/**
 * Registra todas as skills do Social Hub
 */
export function registerSocialHubSkills(): void {
  const registry = getSkillRegistryV2();

  console.log('[SocialHub] Registering skills...');

  // S-01: Planner
  const planner = new SocialHubPlanner();
  registry.register(planner, {
    name: 'social-hub-planner',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'COMM',
    description: '30-day Instagram content planning with collaboration orchestration',
    tags: ['instagram', 'planning', 'scheduling'],
  });

  // S-02: Publer
  const publer = new SocialHubPubler();
  registry.register(publer, {
    name: 'social-hub-publer',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'COMM',
    description: 'Schedule Instagram posts via Publer API',
    tags: ['instagram', 'publer', 'api', 'scheduling'],
  });

  // S-03: Caption AI
  const captionAI = new SocialHubCaptionAI();
  registry.register(captionAI, {
    name: 'social-hub-caption-ai',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'AI',
    description: 'Generate optimized Instagram captions using Claude AI',
    tags: ['instagram', 'ai', 'captions', 'claude'],
  });

  // S-04: Hashtag AI
  const hashtagAI = new SocialHubHashtagAI();
  registry.register(hashtagAI, {
    name: 'social-hub-hashtag-ai',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'AI',
    description: 'Generate optimized hashtags using performance data + trending',
    tags: ['instagram', 'hashtags', 'optimization'],
  });

  // S-05: Inventory
  const inventory = new SocialHubInventory();
  registry.register(inventory, {
    name: 'social-hub-inventory',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'FILE',
    description: 'Video inventory management with deduplication',
    tags: ['inventory', 'video', 'metadata'],
  });

  // S-06: Analytics
  const analytics = new SocialHubAnalytics();
  registry.register(analytics, {
    name: 'social-hub-analytics',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'WEB',
    description: 'Collect Instagram metrics and generate performance reports',
    tags: ['instagram', 'analytics', 'metrics'],
  });

  // S-07: Orchestrator
  const orchestrator = new SocialHubOrchestrator();
  registry.register(orchestrator, {
    name: 'social-hub-orchestrator',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'UTIL',
    description: 'End-to-end orchestration of Instagram workflow',
    tags: ['orchestration', 'workflow', 'automation'],
  });

  // ============================================================================
  // ENTERPRISE SKILLS (NEW)
  // ============================================================================

  // S-19: Publer V2 (Production-ready)
  const publerV2 = new SocialHubPublerV2();
  registry.register(publerV2, {
    name: 'social-hub-publer-v2',
    version: '2.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'COMM',
    description: 'Production Publer API with retry logic and video upload',
    tags: ['instagram', 'publer', 'api', 'production', 'retry'],
  });

  // S-02: Video Enricher (Claude Vision)
  const videoEnricher = new SocialHubVideoEnricher();
  registry.register(videoEnricher, {
    name: 'social-hub-video-enricher',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'AI',
    description: 'AI video analysis with Claude Vision for content enrichment',
    tags: ['instagram', 'ai', 'vision', 'claude', 'video-analysis'],
  });

  // S-12: Quota Enforcer
  const quotaEnforcer = new SocialHubQuotaEnforcer();
  registry.register(quotaEnforcer, {
    name: 'social-hub-quota-enforcer',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Enforce posting quotas and content distribution rules',
    tags: ['instagram', 'quotas', 'limits', 'validation'],
  });

  // S-25: Analytics Collector (Instagram Graph API)
  const analyticsCollector = new SocialHubAnalyticsCollector();
  registry.register(analyticsCollector, {
    name: 'social-hub-analytics-collector',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'WEB',
    description: 'Collect Instagram metrics via Graph API with viral scoring',
    tags: ['instagram', 'analytics', 'metrics', 'graph-api'],
  });

  // S-32: Approval Workflow
  const approvalWorkflow = new SocialHubApprovalWorkflow();
  registry.register(approvalWorkflow, {
    name: 'social-hub-approval-workflow',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Post approval queue with auto-approve and Telegram notifications',
    tags: ['instagram', 'approval', 'workflow', 'telegram'],
  });

  // S-43: Database Manager
  const databaseManager = new SocialHubDatabaseManager();
  registry.register(databaseManager, {
    name: 'social-hub-database-manager',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'UTIL',
    description: 'PostgreSQL database management with migrations',
    tags: ['database', 'postgresql', 'prisma', 'migration'],
  });

  // S-45: Observability
  const observability = new SocialHubObservability();
  registry.register(observability, {
    name: 'social-hub-observability',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'Observability with logging, metrics, and error tracking',
    tags: ['observability', 'logging', 'metrics', 'monitoring'],
  });

  console.log('[SocialHub] ✓ 14 skills registered successfully (7 basic + 7 enterprise)');
}

/**
 * Obtém estatísticas do hub
 */
export function getSocialHubStats() {
  const registry = getSkillRegistryV2();

  const socialHubSkills = registry.listAll().filter(spec =>
    spec.name.startsWith('social-hub-')
  );

  return {
    totalSkills: socialHubSkills.length,
    skills: socialHubSkills.map(spec => ({
      name: spec.name,
      version: spec.version,
      status: spec.status,
      category: spec.category,
    })),
  };
}

/**
 * Executa workflow completo (atalho)
 */
export async function runFullWorkflow(overrides?: any) {
  const registry = getSkillRegistryV2();
  const config = getSocialHubConfig();

  return registry.execute('social-hub-orchestrator', {
    ...config,
    workflow: 'full',
    ...overrides,
  });
}

/**
 * Executa apenas planejamento (atalho)
 */
export async function runPlanning(daysAhead = 30, forceReplan = false) {
  const registry = getSkillRegistryV2();
  const config = getSocialHubConfig();

  return registry.execute('social-hub-planner', {
    socialHubPath: config.socialHubPath,
    daysAhead,
    forceReplan,
  });
}

/**
 * Gera caption com AI (atalho)
 */
export async function generateCaption(videoMetadata: any, variations = 3) {
  const registry = getSkillRegistryV2();
  const config = getSocialHubConfig();

  return registry.execute('social-hub-caption-ai', {
    anthropicApiKey: config.anthropicApiKey,
    videoMetadata,
    variations,
  });
}

/**
 * Gera hashtags otimizadas (atalho)
 */
export async function generateHashtags(
  videoMetadata: any,
  strategy: 'balanced' | 'reach' | 'engagement' | 'viral' = 'balanced'
) {
  const registry = getSkillRegistryV2();
  const config = getSocialHubConfig();

  return registry.execute('social-hub-hashtag-ai', {
    videoMetadata,
    strategy,
    trendingApiKey: config.trendingApiKey,
  });
}

/**
 * Agenda post no Publer (atalho)
 */
export async function schedulePost(post: any, dryRun = false) {
  const registry = getSkillRegistryV2();
  const config = getSocialHubConfig();

  return registry.execute('social-hub-publer', {
    publisherApiKey: config.publisherApiKey,
    post,
    dryRun,
  });
}

// Exports - Basic Skills
export {
  SocialHubPlanner,
  SocialHubPubler,
  SocialHubCaptionAI,
  SocialHubHashtagAI,
  SocialHubInventory,
  SocialHubAnalytics,
  SocialHubOrchestrator,
};

// Exports - Enterprise Skills
export {
  SocialHubPublerV2,
  SocialHubVideoEnricher,
  SocialHubQuotaEnforcer,
  SocialHubAnalyticsCollector,
  SocialHubApprovalWorkflow,
  SocialHubDatabaseManager,
  SocialHubObservability,
};

export { getSocialHubConfig, updateSocialHubConfig } from './social-hub-config';
