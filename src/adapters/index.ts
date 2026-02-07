/**
 * ══════════════════════════════════════════════════════════════════════════════
 * ADAPTERS INDEX - Exporta todos os adapters
 * ══════════════════════════════════════════════════════════════════════════════
 */

// Skill Adapter
export {
  SkillAdapter,
  SkillRegistryAdapter,
  getSkillRegistryAdapter,
  adaptSkill,
} from './skill.adapter';

// Aurora Adapter
export {
  AuroraAdapter,
  getAuroraAdapter,
  createAuroraAdapter,
} from './aurora.adapter';

// Hub Enterprise Adapter
export {
  HubEnterpriseAdapter,
  getHubEnterpriseAdapter,
  createHubEnterpriseAdapter,
  ENTERPRISE_MANIFEST,
} from './hub.adapter';

// Hub Supabase Adapter (30 skills)
export {
  HubSupabaseAdapter,
  getHubSupabaseAdapter,
  createHubSupabaseAdapter,
  SUPABASE_MANIFEST,
} from './hub-supabase.adapter';

// Hub Social Adapter (14 skills)
export {
  HubSocialAdapter,
  getHubSocialAdapter,
  createHubSocialAdapter,
  SOCIAL_MANIFEST,
} from './hub-social.adapter';

// Operator Adapter
export {
  OperatorAdapter,
  getOperatorAdapter,
  createOperatorAdapter,
} from './operator.adapter';

// Versão
export const ADAPTERS_VERSION = '2.0.0';

// Hub Summary
export const HUB_REGISTRY = {
  enterprise: {
    adapter: 'HubEnterpriseAdapter',
    skills: 9, // 9 personas
    workflows: 6,
    description: 'App development with 9 AI personas',
  },
  supabase: {
    adapter: 'HubSupabaseAdapter',
    skills: 30, // 30 database skills
    workflows: 6,
    description: 'PostgreSQL/Supabase database management',
  },
  social: {
    adapter: 'HubSocialAdapter',
    skills: 14, // 7 basic + 7 enterprise
    workflows: 7,
    description: 'Instagram automation with AI',
  },
} as const;

export const TOTAL_SKILLS_AVAILABLE = 53; // 9 + 30 + 14
