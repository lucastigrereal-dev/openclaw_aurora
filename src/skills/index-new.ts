/**
 * OpenClaw Aurora - Skills Index (Nova Estrutura)
 * Registra e exporta todas as skills da estrutura de pastas
 */

// Base
export * from './base';
export { getSkillRegistry, SkillRegistry } from './infrastructure/registry';

// Export de skills individuais por categoria
// Nota: As skills estão organizadas em subpastas

import { SkillRegistry } from './infrastructure/registry';

/**
 * Registra todas as skills no registry
 * Esta versão usa a estrutura real de pastas
 */
export function registerAllSkills(registry?: SkillRegistry): SkillRegistry {
  const { getSkillRegistry: getRegistry } = require('./infrastructure/registry');
  const reg = registry || getRegistry();

  console.log('[Skills] Registering skills from folder structure...');

  // Tenta importar e registrar skills dinamicamente
  try {
    // AI Skills
    try {
      const { registerClaudeSkill } = require('./ai/claude');
      if (registerClaudeSkill) registerClaudeSkill(reg);
    } catch (e) {
      console.log('[Skills] ai/claude not available');
    }

    try {
      const { registerGPTSkill } = require('./ai/gpt');
      if (registerGPTSkill) registerGPTSkill(reg);
    } catch (e) {
      console.log('[Skills] ai/gpt not available');
    }

    try {
      const { registerOllamaSkill } = require('./ai/ollama');
      if (registerOllamaSkill) registerOllamaSkill(reg);
    } catch (e) {
      console.log('[Skills] ai/ollama not available');
    }

    // Execution Skills
    try {
      const { registerBashSkill } = require('./execution/bash');
      if (registerBashSkill) registerBashSkill(reg);
    } catch (e) {
      console.log('[Skills] execution/bash not available');
    }

    try {
      const { registerExtendedSkills } = require('./execution/extended');
      if (registerExtendedSkills) registerExtendedSkills(reg);
    } catch (e) {
      console.log('[Skills] execution/extended not available');
    }

    // File Skills
    try {
      const { registerFileSkills } = require('./file/ops');
      if (registerFileSkills) registerFileSkills(reg);
    } catch (e) {
      console.log('[Skills] file/ops not available');
    }

    // Communication Skills
    try {
      const { registerTelegramSkills } = require('./communication/telegram');
      if (registerTelegramSkills) registerTelegramSkills(reg);
    } catch (e) {
      console.log('[Skills] communication/telegram not available');
    }

    // Web Skills
    try {
      const { registerWebSkills } = require('./web/fetch');
      if (registerWebSkills) registerWebSkills(reg);
    } catch (e) {
      console.log('[Skills] web/fetch not available');
    }

    const stats = reg.getStats();
    console.log(`[Skills] Registered ${stats.total} skills successfully`);
  } catch (error: any) {
    console.error('[Skills] Error during registration:', error.message);
  }

  return reg;
}

/**
 * Lista resumida de skills (pode não estar completo)
 */
export const AVAILABLE_SKILLS = [
  // AI
  { name: 'ai.claude', category: 'AI', description: 'Claude API (Anthropic)', dangerous: false },
  { name: 'ai.gpt', category: 'AI', description: 'GPT API (OpenAI)', dangerous: false },
  { name: 'ai.ollama', category: 'AI', description: 'Ollama (modelos locais)', dangerous: false },

  // EXEC
  { name: 'exec.bash', category: 'EXEC', description: 'Executa comandos bash', dangerous: true },
  { name: 'exec.powershell', category: 'EXEC', description: 'Executa comandos PowerShell', dangerous: true },
  { name: 'exec.python', category: 'EXEC', description: 'Executa scripts Python', dangerous: true },

  // FILE
  { name: 'file.read', category: 'FILE', description: 'Lê arquivos', dangerous: false },
  { name: 'file.write', category: 'FILE', description: 'Escreve arquivos', dangerous: true },
  { name: 'file.list', category: 'FILE', description: 'Lista diretórios', dangerous: false },
  { name: 'file.delete', category: 'FILE', description: 'Deleta arquivos', dangerous: true },

  // COMM
  { name: 'telegram.send', category: 'COMM', description: 'Envia mensagem Telegram', dangerous: false },
  { name: 'telegram.getUpdates', category: 'COMM', description: 'Recebe updates Telegram', dangerous: false },

  // WEB
  { name: 'web.fetch', category: 'WEB', description: 'Requisições HTTP', dangerous: false },
  { name: 'web.scrape', category: 'WEB', description: 'Extrai dados de páginas', dangerous: false },
] as const;

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
