/**
 * OpenClaw Aurora - Folder Structure Migration Script
 *
 * This script migrates the current folder structure to a clean enterprise layout.
 * Run with: npx ts-node scripts/migrate-structure.ts [--dry-run]
 *
 * Phases:
 * 1. Create new directory structure
 * 2. Move documentation to docs/
 * 3. Organize skills into categories
 * 4. Consolidate hubs
 * 5. Move core modules to src/
 */

import { existsSync, mkdirSync, readdirSync, renameSync, statSync, copyFileSync, writeFileSync } from 'fs';
import { join, basename, dirname } from 'path';

const ROOT = '/mnt/c/Users/lucas/openclaw_aurora';
const DRY_RUN = process.argv.includes('--dry-run');

// ============================================================================
// Utilities
// ============================================================================

function log(action: string, from: string, to?: string) {
  const prefix = DRY_RUN ? '[DRY-RUN]' : '[MIGRATE]';
  if (to) {
    console.log(`${prefix} ${action}: ${from} → ${to}`);
  } else {
    console.log(`${prefix} ${action}: ${from}`);
  }
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    log('CREATE DIR', dir);
    if (!DRY_RUN) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

function moveFile(from: string, to: string) {
  if (existsSync(from)) {
    ensureDir(dirname(to));
    log('MOVE', from, to);
    if (!DRY_RUN) {
      renameSync(from, to);
    }
  }
}

function moveDir(from: string, to: string) {
  if (existsSync(from)) {
    ensureDir(dirname(to));
    log('MOVE DIR', from, to);
    if (!DRY_RUN) {
      renameSync(from, to);
    }
  }
}

// ============================================================================
// Phase 1: Create Directory Structure
// ============================================================================

function phase1_createStructure() {
  console.log('\n📁 Phase 1: Creating directory structure...\n');

  const directories = [
    // Source structure
    'src/core/operator',
    'src/core/contracts',
    'src/core/types',
    'src/core/registry',

    // Skills by category
    'src/skills/ai',
    'src/skills/execution',
    'src/skills/file',
    'src/skills/web',
    'src/skills/communication',
    'src/skills/infrastructure',
    'src/skills/security',
    'src/skills/analytics',

    // Hubs
    'src/hubs/enterprise/personas',
    'src/hubs/enterprise/workflows',
    'src/hubs/enterprise/templates',
    'src/hubs/enterprise/shared',
    'src/hubs/supabase',
    'src/hubs/social',

    // Monitor
    'src/monitor/core',
    'src/monitor/collectors',
    'src/monitor/detectors',
    'src/monitor/healing',
    'src/monitor/protection',
    'src/monitor/alerts',

    // API
    'src/api/routes',
    'src/api/middleware',

    // Adapters
    'src/adapters',

    // Config
    'src/config',

    // Documentation
    'docs/architecture',
    'docs/hubs',
    'docs/skills',
    'docs/monitor',
    'docs/api',
    'docs/deployment',
    'docs/guides',

    // Tests
    'tests/unit/skills',
    'tests/unit/hubs',
    'tests/unit/core',
    'tests/integration',
    'tests/e2e',
    'tests/fixtures',

    // UI
    'ui/dashboard',

    // Scripts
    'scripts',

    // Examples
    'examples',
  ];

  for (const dir of directories) {
    ensureDir(join(ROOT, dir));
  }
}

// ============================================================================
// Phase 2: Move Documentation
// ============================================================================

function phase2_moveDocumentation() {
  console.log('\n📚 Phase 2: Moving documentation...\n');

  const docMapping: Record<string, string> = {
    // Architecture docs
    'ESTRUTURA_DEFINITIVA_OPENCLAW.md': 'docs/architecture/structure.md',
    'CANONICAL_MAP.md': 'docs/architecture/canonical-map.md',
    'IMPLEMENTATION_STATUS.md': 'docs/architecture/implementation-status.md',

    // Hub docs
    'HUBS_PURPOSE_GUIDE.md': 'docs/hubs/purpose-guide.md',
    'HUBS_COMPLETE_INVENTORY.md': 'docs/hubs/inventory.md',

    // Deployment docs
    'DEPLOY_SUCESSO.txt': 'docs/deployment/deploy-success.md',

    // Guides
    'BACKEND_IMPLEMENTATION_STATUS.md': 'docs/guides/backend-status.md',
  };

  // Move specific mapped files
  for (const [from, to] of Object.entries(docMapping)) {
    const fromPath = join(ROOT, from);
    const toPath = join(ROOT, to);
    if (existsSync(fromPath)) {
      moveFile(fromPath, toPath);
    }
  }

  // Move all remaining .md files at root to docs/
  const rootFiles = readdirSync(ROOT);
  for (const file of rootFiles) {
    const filePath = join(ROOT, file);
    if (file.endsWith('.md') && statSync(filePath).isFile()) {
      // Skip README.md at root
      if (file === 'README.md') continue;

      // Move to docs/
      const destPath = join(ROOT, 'docs', file);
      if (!existsSync(destPath)) {
        moveFile(filePath, destPath);
      }
    }
  }
}

// ============================================================================
// Phase 3: Organize Skills
// ============================================================================

function phase3_organizeSkills() {
  console.log('\n🎯 Phase 3: Organizing skills...\n');

  const skillMapping: Record<string, string> = {
    // AI skills
    'ai-claude.ts': 'src/skills/ai/claude.ts',
    'ai-gpt.ts': 'src/skills/ai/gpt.ts',
    'ai-ollama.ts': 'src/skills/ai/ollama.ts',

    // Execution skills
    'exec-bash.ts': 'src/skills/execution/bash.ts',
    'exec-extended.ts': 'src/skills/execution/extended.ts',

    // File skills
    'file-ops.ts': 'src/skills/file/ops.ts',
    'file-ops-advanced.ts': 'src/skills/file/advanced.ts',

    // Web skills
    'web-fetch.ts': 'src/skills/web/fetch.ts',

    // Communication skills
    'comm-telegram.ts': 'src/skills/communication/telegram.ts',

    // Infrastructure skills
    'intent-router.ts': 'src/skills/infrastructure/intent-router.ts',
    'skill-scaffolder.ts': 'src/skills/infrastructure/scaffolder.ts',
    'skill-registry-v2.ts': 'src/skills/infrastructure/registry-v2.ts',
    'registry-v2.ts': 'src/skills/infrastructure/registry.ts',

    // Security skills
    'guardrail.ts': 'src/skills/security/guardrail.ts',

    // Base/core skills stay in skills root
    'skill-base.ts': 'src/skills/base.ts',
    'index.ts': 'src/skills/index.ts',
  };

  const skillsDir = join(ROOT, 'skills');
  if (!existsSync(skillsDir)) return;

  for (const [from, to] of Object.entries(skillMapping)) {
    const fromPath = join(skillsDir, from);
    const toPath = join(ROOT, to);
    if (existsSync(fromPath)) {
      moveFile(fromPath, toPath);
    }
  }

  // Move hub-enterprise folder
  const hubEnterpriseSrc = join(skillsDir, 'hub-enterprise');
  const hubEnterpriseDest = join(ROOT, 'src/hubs/enterprise');
  if (existsSync(hubEnterpriseSrc)) {
    // Move personas
    const personasSrc = join(hubEnterpriseSrc, 'personas');
    if (existsSync(personasSrc)) {
      const personaFiles = readdirSync(personasSrc);
      for (const file of personaFiles) {
        moveFile(
          join(personasSrc, file),
          join(hubEnterpriseDest, 'personas', file)
        );
      }
    }

    // Move other files
    const hubFiles = readdirSync(hubEnterpriseSrc);
    for (const file of hubFiles) {
      const filePath = join(hubEnterpriseSrc, file);
      if (statSync(filePath).isFile()) {
        moveFile(filePath, join(hubEnterpriseDest, file));
      }
    }
  }

  // Move supabase-archon folder
  const supabaseSrc = join(skillsDir, 'supabase-archon');
  const supabaseDest = join(ROOT, 'src/hubs/supabase');
  if (existsSync(supabaseSrc)) {
    moveDir(supabaseSrc, supabaseDest);
  }
}

// ============================================================================
// Phase 4: Move Core Modules
// ============================================================================

function phase4_moveCoreModules() {
  console.log('\n🏗️ Phase 4: Moving core modules...\n');

  // Move contracts
  const contractsSrc = join(ROOT, 'contracts');
  const contractsDest = join(ROOT, 'src/core/contracts');
  if (existsSync(contractsSrc)) {
    const files = readdirSync(contractsSrc);
    for (const file of files) {
      moveFile(
        join(contractsSrc, file),
        join(contractsDest, file)
      );
    }
  }

  // Move adapters
  const adaptersSrc = join(ROOT, 'adapters');
  const adaptersDest = join(ROOT, 'src/adapters');
  if (existsSync(adaptersSrc)) {
    const files = readdirSync(adaptersSrc);
    for (const file of files) {
      const filePath = join(adaptersSrc, file);
      if (statSync(filePath).isFile()) {
        moveFile(filePath, join(adaptersDest, file));
      }
    }
  }

  // Move API
  const apiSrc = join(ROOT, 'api');
  const apiDest = join(ROOT, 'src/api');
  if (existsSync(apiSrc)) {
    const files = readdirSync(apiSrc);
    for (const file of files) {
      moveFile(
        join(apiSrc, file),
        join(apiDest, file)
      );
    }
  }

  // Move registry
  const registrySrc = join(ROOT, 'registry');
  const registryDest = join(ROOT, 'src/core/registry');
  if (existsSync(registrySrc)) {
    const files = readdirSync(registrySrc);
    for (const file of files) {
      moveFile(
        join(registrySrc, file),
        join(registryDest, file)
      );
    }
  }

  // Move config
  const configSrc = join(ROOT, 'config');
  const configDest = join(ROOT, 'src/config');
  if (existsSync(configSrc)) {
    const files = readdirSync(configSrc);
    for (const file of files) {
      moveFile(
        join(configSrc, file),
        join(configDest, file)
      );
    }
  }
}

// ============================================================================
// Phase 5: Move Monitor (TypeScript version)
// ============================================================================

function phase5_moveMonitor() {
  console.log('\n📊 Phase 5: Moving Aurora Monitor...\n');

  const monitorSrc = join(ROOT, 'aurora-monitor-ts/src');
  const monitorDest = join(ROOT, 'src/monitor');

  if (existsSync(monitorSrc)) {
    const subdirs = ['core', 'collectors', 'detectors', 'healing', 'protection', 'alerts', 'integrations', 'utils'];

    for (const subdir of subdirs) {
      const srcDir = join(monitorSrc, subdir);
      const destDir = join(monitorDest, subdir);

      if (existsSync(srcDir)) {
        const files = readdirSync(srcDir);
        for (const file of files) {
          moveFile(join(srcDir, file), join(destDir, file));
        }
      }
    }

    // Move root files
    const rootFiles = readdirSync(monitorSrc);
    for (const file of rootFiles) {
      const filePath = join(monitorSrc, file);
      if (statSync(filePath).isFile()) {
        moveFile(filePath, join(monitorDest, file));
      }
    }
  }
}

// ============================================================================
// Phase 6: Move Dashboard
// ============================================================================

function phase6_moveDashboard() {
  console.log('\n🎨 Phase 6: Moving Dashboard...\n');

  const dashboardSrc = join(ROOT, 'dashboard');
  const dashboardDest = join(ROOT, 'ui/dashboard');

  if (existsSync(dashboardSrc) && !existsSync(dashboardDest)) {
    moveDir(dashboardSrc, dashboardDest);
  }
}

// ============================================================================
// Phase 7: Create Index Files
// ============================================================================

function phase7_createIndexFiles() {
  console.log('\n📝 Phase 7: Creating index files...\n');

  // Skills index
  const skillsIndex = `/**
 * OpenClaw Skills Registry
 *
 * Central export point for all skills.
 */

// AI Skills
export * from './ai';

// Execution Skills
export * from './execution';

// File Skills
export * from './file';

// Web Skills
export * from './web';

// Communication Skills
export * from './communication';

// Infrastructure Skills
export * from './infrastructure';

// Security Skills
export * from './security';

// Analytics Skills
export * from './analytics';

// Base
export * from './base';
`;

  const skillsIndexPath = join(ROOT, 'src/skills/index.ts');
  if (!existsSync(skillsIndexPath)) {
    log('CREATE', skillsIndexPath);
    if (!DRY_RUN) {
      writeFileSync(skillsIndexPath, skillsIndex);
    }
  }

  // Hubs index
  const hubsIndex = `/**
 * OpenClaw Hubs Registry
 *
 * Central export point for all hubs.
 */

export * from './enterprise';
export * from './supabase';
export * from './social';
`;

  const hubsIndexPath = join(ROOT, 'src/hubs/index.ts');
  if (!existsSync(hubsIndexPath)) {
    log('CREATE', hubsIndexPath);
    if (!DRY_RUN) {
      writeFileSync(hubsIndexPath, hubsIndex);
    }
  }

  // Main src/index.ts
  const srcIndex = `/**
 * OpenClaw Aurora
 *
 * Main entry point for the OpenClaw Aurora system.
 */

// Core
export * from './core/contracts';
export * from './core/registry';

// Skills
export * from './skills';

// Hubs
export * from './hubs';

// Adapters
export * from './adapters';

// API
export * from './api';

// Monitor
export * from './monitor';

// Config
export * from './config';
`;

  const srcIndexPath = join(ROOT, 'src/index.ts');
  if (!existsSync(srcIndexPath)) {
    log('CREATE', srcIndexPath);
    if (!DRY_RUN) {
      writeFileSync(srcIndexPath, srcIndex);
    }
  }
}

// ============================================================================
// Main
// ============================================================================

function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     OpenClaw Aurora - Folder Structure Migration          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }

  try {
    phase1_createStructure();
    phase2_moveDocumentation();
    phase3_organizeSkills();
    phase4_moveCoreModules();
    phase5_moveMonitor();
    phase6_moveDashboard();
    phase7_createIndexFiles();

    console.log('\n✅ Migration complete!\n');

    if (DRY_RUN) {
      console.log('Run without --dry-run to apply changes.\n');
    } else {
      console.log('Next steps:');
      console.log('1. Update import paths in TypeScript files');
      console.log('2. Update tsconfig.json paths');
      console.log('3. Run tests to verify everything works');
      console.log('4. Remove empty old directories\n');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
