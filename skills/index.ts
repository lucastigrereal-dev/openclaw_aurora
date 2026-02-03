/**
 * OpenClaw Aurora - Skills Index
 * Registra e exporta todas as skills (incluindo executor skills)
 */

// Base
export * from './skill-base';

// Skills individuais
export * from './exec-bash';
export * from './ai-claude';
export * from './ai-gpt';
export * from './ai-ollama';
export * from './file-ops';
export * from './comm-telegram';
export * from './web-fetch';
export * from './util-misc';

// NEW: Extended skills (executor capabilities)
export * from './exec-extended';
export * from './browser-control';
export * from './autopc-control';
export * from './security-config';

// Imports para registro
import { getSkillRegistry, SkillRegistry } from './skill-base';
import { ExecBashSkill } from './exec-bash';
import { AIClaudeSkill } from './ai-claude';
import { AIGPTSkill } from './ai-gpt';
import { AIOllamaSkill } from './ai-ollama';
import { FileReadSkill, FileWriteSkill, FileListSkill, FileDeleteSkill } from './file-ops';
import { TelegramSendSkill, TelegramGetUpdatesSkill } from './comm-telegram';
import { WebFetchSkill, WebScrapeSkill } from './web-fetch';
import { UtilSleepSkill, UtilDatetimeSkill, UtilUUIDSkill, UtilHashSkill, UtilJSONSkill } from './util-misc';

// NEW: Extended skill imports
import { execExtendedSkills } from './exec-extended';
import { browserSkills } from './browser-control';
import { autopcSkills } from './autopc-control';
import { securityManager, isSkillAllowed } from './security-config';

/**
 * Registra todas as skills no registry
 */
export function registerAllSkills(registry?: SkillRegistry): SkillRegistry {
  const reg = registry || getSkillRegistry();

  console.log('[Skills] Registering all skills...');

  // EXEC (basic)
  reg.register(new ExecBashSkill());

  // AI
  reg.register(new AIClaudeSkill());
  reg.register(new AIGPTSkill());
  reg.register(new AIOllamaSkill());

  // FILE
  reg.register(new FileReadSkill());
  reg.register(new FileWriteSkill());
  reg.register(new FileListSkill());
  reg.register(new FileDeleteSkill());

  // COMM
  reg.register(new TelegramSendSkill());
  reg.register(new TelegramGetUpdatesSkill());

  // WEB
  reg.register(new WebFetchSkill());
  reg.register(new WebScrapeSkill());

  // UTIL
  reg.register(new UtilSleepSkill());
  reg.register(new UtilDatetimeSkill());
  reg.register(new UtilUUIDSkill());
  reg.register(new UtilHashSkill());
  reg.register(new UtilJSONSkill());

  // NEW: Extended Exec Skills (PowerShell, Python, Node, Background, Sudo)
  console.log('[Skills] Registering extended exec skills...');
  execExtendedSkills.forEach(skill => {
    if (isSkillAllowed(skill.name)) {
      reg.register(skill as any);
    } else {
      console.log(`[Skills] Skipped (blocked): ${skill.name}`);
    }
  });

  // NEW: Browser Control Skills
  console.log('[Skills] Registering browser skills...');
  browserSkills.forEach(skill => {
    if (isSkillAllowed(skill.name)) {
      reg.register(skill as any);
    } else {
      console.log(`[Skills] Skipped (blocked): ${skill.name}`);
    }
  });

  // NEW: AutoPC Skills
  console.log('[Skills] Registering autopc skills...');
  autopcSkills.forEach(skill => {
    if (isSkillAllowed(skill.name)) {
      reg.register(skill as any);
    } else {
      console.log(`[Skills] Skipped (blocked): ${skill.name}`);
    }
  });

  console.log(`[Skills] Registered ${reg.getStats().total} skills`);

  return reg;
}

/**
 * Registra TODAS as skills (ignora security config - DEV MODE)
 */
export function registerAllSkillsUnsafe(registry?: SkillRegistry): SkillRegistry {
  const reg = registry || getSkillRegistry();

  console.log('[Skills] ⚠️ UNSAFE MODE - Registering ALL skills...');

  // Enable dev mode
  securityManager.enableDevMode();

  // Basic skills
  reg.register(new ExecBashSkill());
  reg.register(new AIClaudeSkill());
  reg.register(new AIGPTSkill());
  reg.register(new AIOllamaSkill());
  reg.register(new FileReadSkill());
  reg.register(new FileWriteSkill());
  reg.register(new FileListSkill());
  reg.register(new FileDeleteSkill());
  reg.register(new TelegramSendSkill());
  reg.register(new TelegramGetUpdatesSkill());
  reg.register(new WebFetchSkill());
  reg.register(new WebScrapeSkill());
  reg.register(new UtilSleepSkill());
  reg.register(new UtilDatetimeSkill());
  reg.register(new UtilUUIDSkill());
  reg.register(new UtilHashSkill());
  reg.register(new UtilJSONSkill());

  // Extended exec skills
  execExtendedSkills.forEach(skill => reg.register(skill as any));

  // Browser skills
  browserSkills.forEach(skill => reg.register(skill as any));

  // AutoPC skills
  autopcSkills.forEach(skill => reg.register(skill as any));

  console.log(`[Skills] ⚠️ Registered ${reg.getStats().total} skills (ALL ENABLED)`);

  return reg;
}

/**
 * Lista resumida de todas as skills disponíveis
 */
export const AVAILABLE_SKILLS = [
  // EXEC (basic)
  { name: 'exec.bash', category: 'EXEC', description: 'Executa comandos bash', dangerous: true },

  // EXEC (extended)
  { name: 'exec.powershell', category: 'EXEC', description: 'Executa comandos PowerShell', dangerous: true },
  { name: 'exec.python', category: 'EXEC', description: 'Executa scripts Python', dangerous: true },
  { name: 'exec.node', category: 'EXEC', description: 'Executa scripts Node.js', dangerous: true },
  { name: 'exec.background', category: 'EXEC', description: 'Roda processos em background', dangerous: true },
  { name: 'exec.sudo', category: 'EXEC', description: 'Executa com privilégios elevados', dangerous: true },
  { name: 'exec.eval', category: 'EXEC', description: 'Avalia expressão JavaScript', dangerous: true },

  // AI
  { name: 'ai.claude', category: 'AI', description: 'Claude API (Anthropic)', dangerous: false },
  { name: 'ai.gpt', category: 'AI', description: 'GPT API (OpenAI)', dangerous: false },
  { name: 'ai.ollama', category: 'AI', description: 'Ollama (modelos locais)', dangerous: false },

  // FILE
  { name: 'file.read', category: 'FILE', description: 'Lê arquivos', dangerous: false },
  { name: 'file.write', category: 'FILE', description: 'Escreve arquivos', dangerous: true },
  { name: 'file.list', category: 'FILE', description: 'Lista diretórios', dangerous: false },
  { name: 'file.delete', category: 'FILE', description: 'Deleta arquivos', dangerous: true },

  // BROWSER
  { name: 'browser.open', category: 'BROWSER', description: 'Abre URL no navegador', dangerous: true },
  { name: 'browser.click', category: 'BROWSER', description: 'Clica em elemento', dangerous: true },
  { name: 'browser.type', category: 'BROWSER', description: 'Digita texto em campo', dangerous: true },
  { name: 'browser.screenshot', category: 'BROWSER', description: 'Captura screenshot da página', dangerous: false },
  { name: 'browser.extract', category: 'BROWSER', description: 'Extrai dados da página', dangerous: false },
  { name: 'browser.pdf', category: 'BROWSER', description: 'Gera PDF da página', dangerous: false },
  { name: 'browser.wait', category: 'BROWSER', description: 'Aguarda elemento ou tempo', dangerous: false },
  { name: 'browser.close', category: 'BROWSER', description: 'Fecha navegador/página', dangerous: false },

  // AUTOPC
  { name: 'autopc.click', category: 'AUTOPC', description: 'Clica na tela (x, y)', dangerous: true },
  { name: 'autopc.move', category: 'AUTOPC', description: 'Move mouse', dangerous: true },
  { name: 'autopc.type', category: 'AUTOPC', description: 'Digita texto no teclado', dangerous: true },
  { name: 'autopc.press', category: 'AUTOPC', description: 'Pressiona tecla especial', dangerous: true },
  { name: 'autopc.screenshot', category: 'AUTOPC', description: 'Screenshot do desktop', dangerous: false },
  { name: 'autopc.window', category: 'AUTOPC', description: 'Gerencia janelas', dangerous: true },
  { name: 'autopc.scroll', category: 'AUTOPC', description: 'Scroll do mouse', dangerous: true },

  // COMM
  { name: 'telegram.send', category: 'COMM', description: 'Envia mensagem Telegram', dangerous: false },
  { name: 'telegram.getUpdates', category: 'COMM', description: 'Recebe updates Telegram', dangerous: false },

  // WEB
  { name: 'web.fetch', category: 'WEB', description: 'Requisições HTTP', dangerous: false },
  { name: 'web.scrape', category: 'WEB', description: 'Extrai dados de páginas', dangerous: false },
  { name: 'web.post', category: 'WEB', description: 'POST para webhooks/APIs', dangerous: true },

  // UTIL
  { name: 'util.sleep', category: 'UTIL', description: 'Aguarda tempo', dangerous: false },
  { name: 'util.datetime', category: 'UTIL', description: 'Operações de data/hora', dangerous: false },
  { name: 'util.uuid', category: 'UTIL', description: 'Gera UUIDs', dangerous: false },
  { name: 'util.hash', category: 'UTIL', description: 'Calcula hashes', dangerous: false },
  { name: 'util.json', category: 'UTIL', description: 'Operações JSON', dangerous: false },
] as const;

/**
 * Lista skills por categoria
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
export function getDangerousSkills(): typeof AVAILABLE_SKILLS[number][] {
  return AVAILABLE_SKILLS.filter(s => s.dangerous);
}

/**
 * Lista skills seguras
 */
export function getSafeSkills(): typeof AVAILABLE_SKILLS[number][] {
  return AVAILABLE_SKILLS.filter(s => !s.dangerous);
}

// Export security manager
export { securityManager };
