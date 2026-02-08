/**
 * OpenClaw Aurora - Skills Index
 * Registra e exporta todas as skills da estrutura real
 */

// ============================================================================
// EXPORTS BASE
// ============================================================================

export * from './base';
export { getSkillRegistry, SkillRegistry } from './base';

// ============================================================================
// EXPORTS TYPES (compatibility)
// ============================================================================

export type {
  SkillMetadata,
  SkillInput,
  SkillOutput,
  SkillConfig,
  SkillCategory,
} from './base';

// ============================================================================
// REGISTRATION FUNCTION
// ============================================================================

import { getSkillRegistry, SkillRegistry } from './base';

// AI Skills
import { AIClaudeSkill } from './ai/claude';
import { AIGPTSkill } from './ai/gpt';
import { AIOllamaSkill } from './ai/ollama';

// Execution Skills
import { ExecBashSkill } from './execution/bash';

// File Skills
import { FileReadSkill, FileWriteSkill, FileListSkill, FileDeleteSkill, FileCreateSkill } from './file/ops';

// Communication Skills
import { TelegramSendSkill } from './communication/telegram';

// Web Skills (need to check what's exported)
// import { WebFetchSkill } from './web/fetch';

/**
 * Registra todas as skills disponíveis no registry
 */
export function registerAllSkills(registry?: SkillRegistry): SkillRegistry {
  const reg = registry || getSkillRegistry();

  console.log('[Skills] Registering all skills from new structure...');

  try {
    // AI Skills
    reg.register(new AIClaudeSkill());
    reg.register(new AIGPTSkill());
    reg.register(new AIOllamaSkill());

    // Execution Skills
    reg.register(new ExecBashSkill());

    // File Skills
    reg.register(new FileReadSkill());
    reg.register(new FileWriteSkill());
    reg.register(new FileListSkill());
    reg.register(new FileDeleteSkill());
    reg.register(new FileCreateSkill());

    // Communication Skills
    reg.register(new TelegramSendSkill());

    // Web Skills
    // reg.register(new WebFetchSkill());

    const stats = reg.getStats();
    console.log(`[Skills] Registered ${stats.total} skills successfully`);

    // Log by category
    console.log('[Skills] By category:', stats.byCategory);
  } catch (error: any) {
    console.error('[Skills] Error during registration:', error.message);
  }

  return reg;
}

/**
 * Lista resumida de skills disponíveis
 */
export const AVAILABLE_SKILLS = [
  // AI
  { name: 'ai.claude', category: 'AI', description: 'Claude API (Anthropic)', dangerous: false },
  { name: 'ai.gpt', category: 'AI', description: 'GPT API (OpenAI)', dangerous: false },
  { name: 'ai.ollama', category: 'AI', description: 'Ollama (modelos locais)', dangerous: false },

  // EXEC
  { name: 'exec.bash', category: 'EXEC', description: 'Executa comandos bash', dangerous: true },

  // FILE
  { name: 'file.read', category: 'FILE', description: 'Lê arquivos', dangerous: false },
  { name: 'file.write', category: 'FILE', description: 'Escreve arquivos', dangerous: true },
  { name: 'file.list', category: 'FILE', description: 'Lista diretórios', dangerous: false },
  { name: 'file.delete', category: 'FILE', description: 'Deleta arquivos', dangerous: true },
  { name: 'file.create', category: 'FILE', description: 'Cria novos arquivos', dangerous: false },

  // COMM
  { name: 'telegram.send', category: 'COMM', description: 'Envia mensagem Telegram', dangerous: false },

  // WEB
  // { name: 'web.fetch', category: 'WEB', description: 'Requisições HTTP', dangerous: false },
] as const;

/**
 * Agrupa skills por categoria
 */
export function getSkillsByCategory(): Record<string, typeof AVAILABLE_SKILLS[number][]> {
  const byCategory: Record<string, typeof AVAILABLE_SKILLS[number][]> = {};

  for (const skill of AVAILABLE_SKILLS) {
    if (!byCategory[skill.category]) {
      byCategory[skill.category] = [];
    }
    byCategory[skill.category].push(skill);
  }

  return byCategory;
}

/**
 * Lista skills perigosas
 */
export function getDangerousSkills(): typeof AVAILABLE_SKILLS[number][]  {
  return AVAILABLE_SKILLS.filter(s => s.dangerous);
}

/**
 * Lista skills seguras
 */
export function getSafeSkills(): typeof AVAILABLE_SKILLS[number][] {
  return AVAILABLE_SKILLS.filter(s => !s.dangerous);
}
