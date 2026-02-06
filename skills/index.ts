/**
 * OpenClaw Aurora - Skills Index
 * Registra e exporta todas as skills
 */

// Base
export * from './skill-base';

// Infrastructure (New Critical Skills)
export * from './skill-spec';
export * from './skill-registry-v2';
export * from './skill-sandbox';
export * from './skill-scaffolder';
export * from './skill-intent-router';
export * from './skill-metrics';

// Skills individuais
export * from './exec-bash';
export * from './ai-claude';
export * from './ai-gpt';
export * from './ai-ollama';
export * from './file-ops';
export * from './file-ops-advanced';
export * from './comm-telegram';
export * from './web-fetch';
export * from './util-misc';

// Imports para registro
import { getSkillRegistry, SkillRegistry } from './skill-base';
import { ExecBashSkill } from './exec-bash';
import { AIClaudeSkill } from './ai-claude';
import { AIGPTSkill } from './ai-gpt';
import { AIOllamaSkill } from './ai-ollama';
import { FileReadSkill, FileWriteSkill, FileListSkill, FileDeleteSkill, FileCreateSkill } from './file-ops';
import { FileCreateAdvancedSkill } from './file-ops-advanced';
import { TelegramSendSkill, TelegramGetUpdatesSkill } from './comm-telegram';
import { WebFetchSkill, WebScrapeSkill } from './web-fetch';
import { UtilSleepSkill, UtilDatetimeSkill, UtilUUIDSkill, UtilHashSkill, UtilJSONSkill } from './util-misc';

/**
 * Registra todas as skills no registry
 */
export function registerAllSkills(registry?: SkillRegistry): SkillRegistry {
  const reg = registry || getSkillRegistry();

  console.log('[Skills] Registering all skills...');

  // EXEC
  reg.register(new ExecBashSkill());

  // AI
  reg.register(new AIClaudeSkill());
  reg.register(new AIGPTSkill());
  reg.register(new AIOllamaSkill());

  // FILE
  reg.register(new FileReadSkill());
  reg.register(new FileWriteSkill());
  reg.register(new FileCreateSkill());
  reg.register(new FileCreateAdvancedSkill());
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

  console.log(`[Skills] Registered ${reg.getStats().total} skills`);

  return reg;
}

/**
 * Lista resumida de todas as skills disponíveis
 */
export const AVAILABLE_SKILLS = [
  // EXEC
  { name: 'exec.bash', category: 'EXEC', description: 'Executa comandos bash' },

  // AI
  { name: 'ai.claude', category: 'AI', description: 'Claude API (Anthropic)' },
  { name: 'ai.gpt', category: 'AI', description: 'GPT API (OpenAI)' },
  { name: 'ai.ollama', category: 'AI', description: 'Ollama (modelos locais)' },

  // FILE
  { name: 'file.read', category: 'FILE', description: 'Lê arquivos' },
  { name: 'file.write', category: 'FILE', description: 'Escreve arquivos' },
  { name: 'file.create', category: 'FILE', description: 'Cria novos arquivos' },
  { name: 'file.create.advanced', category: 'FILE', description: 'Cria arquivos com recursos avançados (validação, templates, atomic writes, backup)' },
  { name: 'file.list', category: 'FILE', description: 'Lista diretórios' },
  { name: 'file.delete', category: 'FILE', description: 'Deleta arquivos' },

  // COMM
  { name: 'telegram.send', category: 'COMM', description: 'Envia mensagem Telegram' },
  { name: 'telegram.getUpdates', category: 'COMM', description: 'Recebe updates Telegram' },

  // WEB
  { name: 'web.fetch', category: 'WEB', description: 'Requisições HTTP' },
  { name: 'web.scrape', category: 'WEB', description: 'Extrai dados de páginas' },

  // UTIL
  { name: 'util.sleep', category: 'UTIL', description: 'Aguarda tempo' },
  { name: 'util.datetime', category: 'UTIL', description: 'Operações de data/hora' },
  { name: 'util.uuid', category: 'UTIL', description: 'Gera UUIDs' },
  { name: 'util.hash', category: 'UTIL', description: 'Calcula hashes' },
  { name: 'util.json', category: 'UTIL', description: 'Operações JSON' },
] as const;
