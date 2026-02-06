/**
 * Skill Health Check System - OpenClaw Aurora
 * Sistema de auto-diagnóstico que detecta problemas antes que causem crashes
 *
 * Funcionalidades:
 * - Valida imports e exports de todos os módulos de skills
 * - Verifica integridade das classes (métodos obrigatórios)
 * - Detecta skills duplicadas
 * - Monitora saúde em runtime
 * - Gera relatórios de diagnóstico
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TIPOS
// ============================================================================

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: Date;
  checks: CheckResult[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failures: number;
  };
}

export interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
  fix?: string;
}

export interface SkillValidation {
  file: string;
  skillName: string;
  hasExecute: boolean;
  hasName: boolean;
  hasDescription: boolean;
  imports: string[];
  exports: string[];
  issues: string[];
}

// ============================================================================
// SKILL HEALTH CHECKER
// ============================================================================

export class SkillHealthChecker {
  private skillsDir: string;
  private lastCheck: HealthCheckResult | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(skillsDir: string = path.join(__dirname)) {
    this.skillsDir = skillsDir;
  }

  /**
   * Executa diagnóstico completo do sistema de skills
   */
  async runFullDiagnostic(): Promise<HealthCheckResult> {
    const checks: CheckResult[] = [];

    // 1. Verificar arquivos de skills existem
    checks.push(await this.checkSkillFilesExist());

    // 2. Verificar imports/exports
    checks.push(...await this.checkImportsExports());

    // 3. Verificar skills duplicadas
    checks.push(await this.checkDuplicateSkills());

    // 4. Verificar métodos obrigatórios
    checks.push(...await this.checkRequiredMethods());

    // 5. Verificar skill-base.ts tem exports necessários
    checks.push(await this.checkSkillBaseExports());

    // 6. Verificar index.ts registra todas as skills
    checks.push(await this.checkIndexRegistration());

    // Calcular sumário
    const summary = {
      total: checks.length,
      passed: checks.filter(c => c.status === 'pass').length,
      warnings: checks.filter(c => c.status === 'warn').length,
      failures: checks.filter(c => c.status === 'fail').length,
    };

    const status = summary.failures > 0 ? 'critical'
                 : summary.warnings > 0 ? 'warning'
                 : 'healthy';

    this.lastCheck = {
      status,
      timestamp: new Date(),
      checks,
      summary,
    };

    return this.lastCheck;
  }

  /**
   * Verificar se arquivos de skills existem
   */
  private async checkSkillFilesExist(): Promise<CheckResult> {
    const requiredFiles = [
      'skill-base.ts',
      'index.ts',
      'exec-bash.ts',
      'ai-claude.ts',
      'file-ops.ts',
    ];

    const missing: string[] = [];
    for (const file of requiredFiles) {
      const filePath = path.join(this.skillsDir, file);
      if (!fs.existsSync(filePath)) {
        missing.push(file);
      }
    }

    if (missing.length > 0) {
      return {
        name: 'skill-files-exist',
        status: 'fail',
        message: `Arquivos de skills ausentes: ${missing.join(', ')}`,
        details: { missing },
        fix: 'Verifique se os arquivos foram deletados ou movidos',
      };
    }

    return {
      name: 'skill-files-exist',
      status: 'pass',
      message: 'Todos os arquivos de skills principais existem',
    };
  }

  /**
   * Verificar imports e exports de cada arquivo
   */
  private async checkImportsExports(): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const skillFiles = this.getSkillFiles();

    for (const file of skillFiles) {
      const filePath = path.join(this.skillsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extrair imports
      const importMatches = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]\.\/skill-base['"]/g);

      if (importMatches) {
        for (const imp of importMatches) {
          const imported = imp.match(/\{([^}]+)\}/)?.[1]?.split(',').map(s => s.trim()) || [];

          // Verificar se imports existem em skill-base.ts
          const validExports = ['Skill', 'SkillBase', 'SkillInput', 'SkillOutput', 'SkillResult',
                               'SkillMetadata', 'SkillCategory', 'SkillConfig', 'SkillRegistry',
                               'getSkillRegistry'];

          const invalid = imported.filter(i => !validExports.includes(i));

          if (invalid.length > 0) {
            results.push({
              name: `imports-${file}`,
              status: 'fail',
              message: `${file}: Imports inválidos de skill-base: ${invalid.join(', ')}`,
              details: { file, invalid, imported },
              fix: `Verificar se ${invalid.join(', ')} estão exportados em skill-base.ts`,
            });
          }
        }
      }
    }

    if (results.length === 0) {
      results.push({
        name: 'imports-valid',
        status: 'pass',
        message: 'Todos os imports de skill-base são válidos',
      });
    }

    return results;
  }

  /**
   * Verificar skills duplicadas (mesmo nome)
   */
  private async checkDuplicateSkills(): Promise<CheckResult> {
    const skillNames = new Map<string, string[]>();
    const skillFiles = this.getSkillFiles();

    for (const file of skillFiles) {
      const filePath = path.join(this.skillsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Procurar por name = 'skill.name'
      const nameMatches = content.matchAll(/name\s*=\s*['"]([^'"]+)['"]/g);

      for (const match of nameMatches) {
        const skillName = match[1];
        if (!skillNames.has(skillName)) {
          skillNames.set(skillName, []);
        }
        skillNames.get(skillName)!.push(file);
      }
    }

    const duplicates: { name: string; files: string[] }[] = [];
    for (const [name, files] of skillNames) {
      if (files.length > 1) {
        duplicates.push({ name, files });
      }
    }

    if (duplicates.length > 0) {
      return {
        name: 'no-duplicate-skills',
        status: 'warn',
        message: `Skills duplicadas encontradas: ${duplicates.map(d => d.name).join(', ')}`,
        details: { duplicates },
        fix: 'Renomear ou remover skills duplicadas',
      };
    }

    return {
      name: 'no-duplicate-skills',
      status: 'pass',
      message: `Nenhuma skill duplicada (${skillNames.size} skills únicas)`,
    };
  }

  /**
   * Verificar se classes têm métodos obrigatórios
   */
  private async checkRequiredMethods(): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const skillFiles = this.getSkillFiles().filter(f =>
      f !== 'skill-base.ts' &&
      f !== 'index.ts' &&
      !f.includes('health-check') &&
      !f.includes('registry-v2') &&
      !f.includes('sandbox-runner') &&
      !f.includes('skill-scaffolder') &&
      !f.includes('intent-router')
    );

    for (const file of skillFiles) {
      const filePath = path.join(this.skillsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Encontrar classes que extendem Skill ou SkillBase
      const classMatches = content.matchAll(/class\s+(\w+)\s+extends\s+(Skill|SkillBase)/g);

      for (const match of classMatches) {
        const className = match[1];

        // Verificar se tem método execute
        const hasExecute = content.includes(`async execute(`) ||
                          content.includes(`execute(`);

        if (!hasExecute) {
          results.push({
            name: `required-methods-${className}`,
            status: 'fail',
            message: `${file}: Classe ${className} não tem método execute()`,
            details: { file, className },
            fix: `Adicionar método execute(params): Promise<SkillResult> na classe ${className}`,
          });
        }
      }
    }

    if (results.length === 0) {
      results.push({
        name: 'required-methods',
        status: 'pass',
        message: 'Todas as classes de skills têm métodos obrigatórios',
      });
    }

    return results;
  }

  /**
   * Verificar se skill-base.ts exporta tudo necessário
   */
  private async checkSkillBaseExports(): Promise<CheckResult> {
    const skillBasePath = path.join(this.skillsDir, 'skill-base.ts');
    const content = fs.readFileSync(skillBasePath, 'utf-8');

    const requiredExports = [
      'Skill',
      'SkillBase',
      'SkillInput',
      'SkillOutput',
      'SkillResult',
      'SkillRegistry',
      'getSkillRegistry',
    ];

    const missing: string[] = [];
    for (const exp of requiredExports) {
      // Verificar export class, export interface, export function, etc
      const hasExport = content.includes(`export class ${exp}`) ||
                       content.includes(`export abstract class ${exp}`) ||
                       content.includes(`export interface ${exp}`) ||
                       content.includes(`export function ${exp}`) ||
                       content.includes(`export { ${exp}`) ||
                       content.includes(`export {${exp}`);

      if (!hasExport) {
        missing.push(exp);
      }
    }

    if (missing.length > 0) {
      return {
        name: 'skill-base-exports',
        status: 'fail',
        message: `skill-base.ts não exporta: ${missing.join(', ')}`,
        details: { missing },
        fix: `Adicionar exports para: ${missing.join(', ')}`,
      };
    }

    return {
      name: 'skill-base-exports',
      status: 'pass',
      message: 'skill-base.ts exporta todas as classes/interfaces necessárias',
    };
  }

  /**
   * Verificar se index.ts importa e registra todas as skills
   */
  private async checkIndexRegistration(): Promise<CheckResult> {
    const indexPath = path.join(this.skillsDir, 'index.ts');

    if (!fs.existsSync(indexPath)) {
      return {
        name: 'index-registration',
        status: 'fail',
        message: 'index.ts não encontrado',
        fix: 'Criar arquivo index.ts que importa e registra todas as skills',
      };
    }

    const content = fs.readFileSync(indexPath, 'utf-8');

    // Contar imports de skills
    const imports = content.match(/import.*from\s+['"]\.\//g)?.length || 0;

    // Contar registros
    const registers = (content.match(/reg\.register\(/g)?.length || 0) +
                     (content.match(/\.forEach\(skill\s*=>/g)?.length || 0);

    if (imports < 5) {
      return {
        name: 'index-registration',
        status: 'warn',
        message: `Poucos imports em index.ts (${imports}). Algumas skills podem não estar registradas.`,
        details: { imports, registers },
        fix: 'Verificar se todas as skills estão sendo importadas em index.ts',
      };
    }

    return {
      name: 'index-registration',
      status: 'pass',
      message: `index.ts: ${imports} imports, registrando skills corretamente`,
    };
  }

  /**
   * Obter lista de arquivos de skills
   */
  private getSkillFiles(): string[] {
    try {
      return fs.readdirSync(this.skillsDir)
        .filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
    } catch {
      return [];
    }
  }

  /**
   * Iniciar monitoramento contínuo
   */
  startContinuousMonitoring(intervalMs: number = 60000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    console.log(`[HealthCheck] Monitoramento iniciado (intervalo: ${intervalMs}ms)`);

    this.checkInterval = setInterval(async () => {
      const result = await this.runFullDiagnostic();

      if (result.status === 'critical') {
        console.error('[HealthCheck] CRÍTICO:', result.checks.filter(c => c.status === 'fail'));
      } else if (result.status === 'warning') {
        console.warn('[HealthCheck] Avisos:', result.checks.filter(c => c.status === 'warn'));
      }
    }, intervalMs);
  }

  /**
   * Parar monitoramento contínuo
   */
  stopContinuousMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[HealthCheck] Monitoramento parado');
    }
  }

  /**
   * Obter último resultado de check
   */
  getLastCheck(): HealthCheckResult | null {
    return this.lastCheck;
  }

  /**
   * Gerar relatório formatado
   */
  generateReport(result?: HealthCheckResult): string {
    const r = result || this.lastCheck;
    if (!r) return 'Nenhum diagnóstico executado ainda.';

    const lines: string[] = [
      '╔════════════════════════════════════════════════════════════╗',
      '║           RELATÓRIO DE SAÚDE DO SISTEMA DE SKILLS          ║',
      '╠════════════════════════════════════════════════════════════╣',
      `║ Status: ${r.status.toUpperCase().padEnd(49)}║`,
      `║ Data: ${r.timestamp.toISOString().padEnd(51)}║`,
      '╠════════════════════════════════════════════════════════════╣',
      `║ Total de verificações: ${String(r.summary.total).padEnd(34)}║`,
      `║ ✅ Passou: ${String(r.summary.passed).padEnd(46)}║`,
      `║ ⚠️  Avisos: ${String(r.summary.warnings).padEnd(45)}║`,
      `║ ❌ Falhas: ${String(r.summary.failures).padEnd(46)}║`,
      '╠════════════════════════════════════════════════════════════╣',
    ];

    // Adicionar detalhes das verificações
    for (const check of r.checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      lines.push(`║ ${icon} ${check.name.substring(0, 55).padEnd(55)}║`);

      if (check.status !== 'pass') {
        const msgLines = this.wrapText(check.message, 54);
        for (const line of msgLines) {
          lines.push(`║    ${line.padEnd(54)}║`);
        }
        if (check.fix) {
          lines.push(`║    FIX: ${check.fix.substring(0, 48).padEnd(48)}║`);
        }
      }
    }

    lines.push('╚════════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxWidth) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
  }
}

// ============================================================================
// SINGLETON E FUNÇÕES UTILITÁRIAS
// ============================================================================

let healthCheckerInstance: SkillHealthChecker | null = null;

export function getHealthChecker(): SkillHealthChecker {
  if (!healthCheckerInstance) {
    healthCheckerInstance = new SkillHealthChecker();
  }
  return healthCheckerInstance;
}

/**
 * Executa diagnóstico rápido e retorna resultado
 */
export async function quickHealthCheck(): Promise<HealthCheckResult> {
  return getHealthChecker().runFullDiagnostic();
}

/**
 * Executa diagnóstico e imprime relatório no console
 */
export async function printHealthReport(): Promise<void> {
  const checker = getHealthChecker();
  const result = await checker.runFullDiagnostic();
  console.log(checker.generateReport(result));
}

// Auto-executar se rodado diretamente
if (require.main === module) {
  printHealthReport().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Erro no health check:', err);
    process.exit(1);
  });
}

export default SkillHealthChecker;
