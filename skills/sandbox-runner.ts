/**
 * E-01: Sandbox Runner (Dry-Run Mode)
 * Executa skills em modo simulacao - sem efeitos colaterais reais
 */

import { SkillInput, SkillOutput, getSkillRegistry } from './skill-base';
import { getSkillRegistryV2, SkillSpec } from './registry-v2';

// ============================================================================
// TIPOS
// ============================================================================

export interface SandboxResult {
  skill: string;
  mode: 'sandbox';
  wouldExecute: boolean;
  simulatedOutput: SkillOutput;
  validation: {
    inputValid: boolean;
    dependenciesMet: boolean;
    riskLevel: string;
    approvalRequired: boolean;
    skillExists: boolean;
    skillEnabled: boolean;
  };
  warnings: string[];
  duration: number;
}

export interface SandboxOptions {
  /** Simular resposta de sucesso (default: true) */
  simulateSuccess?: boolean;
  /** Simular dados de retorno */
  mockData?: any;
  /** Verificar dependencias */
  checkDependencies?: boolean;
  /** Tempo simulado de execucao em ms */
  simulatedLatency?: number;
}

// ============================================================================
// SANDBOX RUNNER
// ============================================================================

export class SandboxRunner {
  /**
   * Executa skill em modo sandbox (dry-run)
   * Nenhum efeito colateral real acontece
   */
  async run(
    skillName: string,
    input: SkillInput,
    options: SandboxOptions = {}
  ): Promise<SandboxResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const registry = getSkillRegistry();
    const registryV2 = getSkillRegistryV2();
    const skill = registry.get(skillName);
    const spec = registryV2.get(skillName);

    // Validacao basica
    const skillExists = !!skill;
    const skillEnabled = skill ? skill.isEnabled() : false;

    if (!skillExists) {
      warnings.push(`Skill "${skillName}" nao encontrada no registry`);
    }

    if (skillExists && !skillEnabled) {
      warnings.push(`Skill "${skillName}" esta desabilitada`);
    }

    // Validacao de input
    let inputValid = true;
    if (skill) {
      try {
        inputValid = skill.validate(input);
        if (!inputValid) {
          warnings.push('Input falhou na validacao da skill');
        }
      } catch (e: any) {
        inputValid = false;
        warnings.push(`Erro na validacao: ${e.message}`);
      }
    }

    // Verificar dependencias via RegistryV2
    let dependenciesMet = true;
    if (options.checkDependencies !== false && spec) {
      const depCheck = registryV2.checkDependencies(skillName);
      dependenciesMet = depCheck.ok;
      if (!depCheck.ok) {
        warnings.push(`Dependencias faltando: ${depCheck.missing.join(', ')}`);
      }
    }

    // Determinar risco e aprovacao
    const riskLevel = spec?.risk || (this.isDangerous(skillName) ? 'high' : 'safe');
    const approvalRequired = spec?.approval === 'requires_approval' ||
      (skill?.config.requiresApproval ?? false);

    if (approvalRequired) {
      warnings.push('Esta skill requer aprovacao antes de executar');
    }

    if (riskLevel === 'high' || riskLevel === 'critical') {
      warnings.push(`Skill com risco ${riskLevel} - use com cuidado`);
    }

    // Validacoes especificas por tipo de skill
    this.validateByType(skillName, input, warnings);

    // Simular latencia se pedido
    if (options.simulatedLatency) {
      await new Promise(r => setTimeout(r, options.simulatedLatency));
    }

    // Gerar output simulado
    const simulateSuccess = options.simulateSuccess ?? true;
    const wouldExecute = skillExists && skillEnabled && inputValid && dependenciesMet;

    const simulatedOutput: SkillOutput = wouldExecute && simulateSuccess
      ? {
          success: true,
          data: options.mockData || this.generateMockOutput(skillName, input),
          duration: options.simulatedLatency || Math.floor(Math.random() * 500) + 50,
        }
      : {
          success: false,
          error: !skillExists
            ? `Skill not found: ${skillName}`
            : !skillEnabled
            ? 'Skill is disabled'
            : !inputValid
            ? 'Invalid input'
            : 'Dependencies not met',
        };

    return {
      skill: skillName,
      mode: 'sandbox',
      wouldExecute,
      simulatedOutput,
      validation: {
        inputValid,
        dependenciesMet,
        riskLevel,
        approvalRequired,
        skillExists,
        skillEnabled,
      },
      warnings,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Testa uma sequencia de skills em sandbox
   */
  async runSequence(
    steps: Array<{ skill: string; input: SkillInput }>,
    options: SandboxOptions = {}
  ): Promise<{
    results: SandboxResult[];
    allPassed: boolean;
    totalWarnings: number;
    executionOrder: string[];
  }> {
    const registryV2 = getSkillRegistryV2();
    const skillNames = steps.map(s => s.skill);
    const executionOrder = registryV2.resolveExecutionOrder(skillNames);

    const results: SandboxResult[] = [];
    let allPassed = true;

    // Executa na ordem resolvida
    for (const name of executionOrder) {
      const step = steps.find(s => s.skill === name);
      if (!step) continue;

      const result = await this.run(step.skill, step.input, options);
      results.push(result);

      if (!result.wouldExecute) {
        allPassed = false;
      }
    }

    return {
      results,
      allPassed,
      totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
      executionOrder,
    };
  }

  /**
   * Validacoes especificas por tipo de skill
   */
  private validateByType(skillName: string, input: SkillInput, warnings: string[]): void {
    // EXEC: verificar comandos perigosos
    if (skillName.startsWith('exec.')) {
      const cmd = input.command || input.code || '';
      const dangerPatterns = [/rm\s+-rf/i, /format\s+/i, /del\s+\/f/i, /shutdown/i, /reboot/i];
      for (const pattern of dangerPatterns) {
        if (pattern.test(cmd)) {
          warnings.push(`Comando potencialmente destrutivo detectado: ${pattern.source}`);
        }
      }
    }

    // FILE: verificar paths perigosos
    if (skillName.startsWith('file.')) {
      const path = input.path || input.filePath || '';
      if (path.includes('..')) warnings.push('Path com ".." detectado - possivel path traversal');
      if (path.startsWith('/etc') || path.startsWith('C:\\Windows')) {
        warnings.push('Acesso a diretorio de sistema detectado');
      }
    }

    // BROWSER: verificar URLs
    if (skillName.startsWith('browser.')) {
      const url = input.url || '';
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        warnings.push('URL sem protocolo HTTP/HTTPS');
      }
    }

    // AI: verificar tokens
    if (skillName.startsWith('ai.')) {
      const maxTokens = input.maxTokens || input.max_tokens || 0;
      if (maxTokens > 4000) {
        warnings.push(`maxTokens alto (${maxTokens}) - custo elevado`);
      }
    }
  }

  /**
   * Verifica se skill e perigosa pelo nome
   */
  private isDangerous(name: string): boolean {
    const dangerousPrefixes = ['exec.', 'autopc.', 'browser.open', 'browser.click', 'browser.type'];
    return dangerousPrefixes.some(p => name.startsWith(p)) ||
      name === 'file.write' || name === 'file.delete';
  }

  /**
   * Gera output mockado baseado no tipo de skill
   */
  private generateMockOutput(skillName: string, input: SkillInput): any {
    const category = skillName.split('.')[0];

    switch (category) {
      case 'exec':
        return { stdout: '[SANDBOX] Comando simulado com sucesso', stderr: '', exitCode: 0 };
      case 'ai':
        return { content: '[SANDBOX] Resposta simulada da IA para: ' + (input.prompt || '').slice(0, 50) };
      case 'file':
        if (skillName === 'file.read') return { content: '[SANDBOX] Conteudo simulado do arquivo' };
        if (skillName === 'file.list') return { files: ['arquivo1.txt', 'arquivo2.ts', 'pasta/'] };
        return { written: true };
      case 'browser':
        if (skillName === 'browser.screenshot') return { path: '/tmp/sandbox-screenshot.png' };
        if (skillName === 'browser.extract') return { data: '[SANDBOX] Dados extraidos simulados' };
        return { ok: true };
      case 'autopc':
        if (skillName === 'autopc.screenshot') return { path: '/tmp/sandbox-desktop.png' };
        return { ok: true };
      case 'telegram':
        return { messageId: 99999, sent: true };
      case 'web':
        return { status: 200, body: '[SANDBOX] Response simulado' };
      case 'marketing':
      case 'social':
      case 'content':
      case 'reviews':
      case 'analytics':
        return { result: `[SANDBOX] ${skillName} executado com sucesso`, data: {} };
      default:
        return { ok: true };
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let sandboxInstance: SandboxRunner | null = null;

export function getSandboxRunner(): SandboxRunner {
  if (!sandboxInstance) {
    sandboxInstance = new SandboxRunner();
  }
  return sandboxInstance;
}
