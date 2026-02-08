/**
 * Skills - Compatibilidade Raiz
 * Este arquivo existe para manter compatibilidade com imports legados './skills'
 * Reexporta tudo da nova estrutura src/skills/
 */

// ============================================================================
// RE-EXPORTS
// ============================================================================

// Base types e classes
export * from './src/skills/base';

// Registry functions
export { getSkillRegistry, SkillRegistry } from './src/skills/base';

// Registration function
export { registerAllSkills, AVAILABLE_SKILLS, getSkillsByCategory, getDangerousSkills, getSafeSkills } from './src/skills/index';

// Types (compat)
export type {
  SkillInput,
  SkillOutput,
  SkillMetadata,
  SkillCategory,
  SkillConfig,
} from './src/skills/base';
