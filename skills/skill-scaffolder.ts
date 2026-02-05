/**
 * E-03: Skill Scaffolder
 * Gera novas skills automaticamente com boilerplate, validacao e registro
 */

import * as fs from 'fs';
import * as path from 'path';
import { SkillSpec, SkillStatus, RiskLevel, ApprovalPolicy, FieldSpec } from './registry-v2';

// ============================================================================
// TIPOS
// ============================================================================

export interface ScaffoldRequest {
  /** Nome da skill (ex: "seo.audit") */
  name: string;
  /** Descricao da skill */
  description: string;
  /** Categoria (EXEC, AI, FILE, etc) */
  category: string;
  /** Nivel de risco */
  risk?: RiskLevel;
  /** Skill perigosa? */
  dangerous?: boolean;
  /** Campos de input */
  inputs?: FieldSpec[];
  /** Campos de output */
  outputs?: FieldSpec[];
  /** Dependencias de outras skills */
  dependencies?: string[];
  /** Tags */
  tags?: string[];
  /** Autor */
  author?: string;
}

export interface ScaffoldResult {
  success: boolean;
  filePath?: string;
  className?: string;
  spec?: SkillSpec;
  code?: string;
  error?: string;
}

// ============================================================================
// SKILL SCAFFOLDER
// ============================================================================

export class SkillScaffolder {
  private skillsDir: string;

  constructor(skillsDir?: string) {
    this.skillsDir = skillsDir || path.join(process.cwd(), 'skills');
  }

  /**
   * Gera uma nova skill completa
   */
  scaffold(request: ScaffoldRequest): ScaffoldResult {
    try {
      // Validar request
      const validation = this.validateRequest(request);
      if (!validation.ok) {
        return { success: false, error: validation.error };
      }

      // Gerar nomes
      const className = this.toClassName(request.name);
      const fileName = this.toFileName(request.name);
      const filePath = path.join(this.skillsDir, fileName);

      // Verificar se ja existe
      if (fs.existsSync(filePath)) {
        return { success: false, error: `Arquivo ja existe: ${fileName}` };
      }

      // Gerar spec
      const spec = this.buildSpec(request);

      // Gerar codigo
      const code = this.generateCode(request, className, spec);

      // Escrever arquivo
      fs.writeFileSync(filePath, code, 'utf-8');

      console.log(`[Scaffolder] Created: ${filePath}`);

      return {
        success: true,
        filePath,
        className,
        spec,
        code,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Gera o codigo sem escrever no disco (preview)
   */
  preview(request: ScaffoldRequest): ScaffoldResult {
    try {
      const validation = this.validateRequest(request);
      if (!validation.ok) {
        return { success: false, error: validation.error };
      }

      const className = this.toClassName(request.name);
      const spec = this.buildSpec(request);
      const code = this.generateCode(request, className, spec);

      return {
        success: true,
        className,
        spec,
        code,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Gera multiplas skills de uma vez
   */
  scaffoldBatch(requests: ScaffoldRequest[]): ScaffoldResult[] {
    return requests.map(req => this.scaffold(req));
  }

  // ============================================================================
  // GERACAO DE CODIGO
  // ============================================================================

  private generateCode(request: ScaffoldRequest, className: string, spec: SkillSpec): string {
    const inputInterface = this.generateInputInterface(request);
    const validateMethod = this.generateValidateMethod(request);
    const executeBody = this.generateExecuteBody(request);
    const category = request.category.toUpperCase();

    return `/**
 * Skill: ${request.name}
 * ${request.description}
 *
 * Gerado automaticamente pelo Skill Scaffolder
 * Data: ${new Date().toISOString()}
 */

import { Skill, SkillInput, SkillOutput, SkillCategory } from './skill-base';

// ============================================================================
// TIPOS
// ============================================================================

${inputInterface}

// ============================================================================
// SKILL: ${request.name}
// ============================================================================

export class ${className} extends Skill {
  constructor() {
    super(
      {
        name: '${request.name}',
        description: '${request.description}',
        version: '1.0.0',
        category: '${category}' as SkillCategory,
        tags: ${JSON.stringify(request.tags || [request.category.toLowerCase()])},
      },
      {
        timeout: 30000,
        retries: ${request.risk === 'high' || request.risk === 'critical' ? 1 : 3},
        requiresApproval: ${request.dangerous ? 'true' : 'false'},
      }
    );
  }

${validateMethod}

  async execute(input: SkillInput): Promise<SkillOutput> {
    const startTime = Date.now();

    try {
${executeBody}
    } catch (error: any) {
      return {
        success: false,
        error: \`[${request.name}] \${error.message}\`,
        duration: Date.now() - startTime,
      };
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const ${this.toInstanceName(request.name)} = new ${className}();
`;
  }

  private generateInputInterface(request: ScaffoldRequest): string {
    if (!request.inputs || request.inputs.length === 0) {
      return `interface ${this.toClassName(request.name)}Input {
  [key: string]: any;
}`;
    }

    const fields = request.inputs.map(f => {
      const optional = f.required ? '' : '?';
      const tsType = this.fieldTypeToTS(f.type);
      return `  /** ${f.description} */\n  ${f.name}${optional}: ${tsType};`;
    }).join('\n');

    return `interface ${this.toClassName(request.name)}Input {\n${fields}\n}`;
  }

  private generateValidateMethod(request: ScaffoldRequest): string {
    if (!request.inputs || request.inputs.length === 0) {
      return `  validate(input: SkillInput): boolean {
    return true;
  }`;
    }

    const requiredChecks = request.inputs
      .filter(f => f.required)
      .map(f => `    if (!input.${f.name}) return false;`)
      .join('\n');

    return `  validate(input: SkillInput): boolean {
${requiredChecks || '    // Nenhum campo obrigatorio'}
    return true;
  }`;
  }

  private generateExecuteBody(request: ScaffoldRequest): string {
    const inputFields = (request.inputs || [])
      .map(f => `      const ${f.name} = input.${f.name}${f.default !== undefined ? ` || ${JSON.stringify(f.default)}` : ''};`)
      .join('\n');

    return `${inputFields || '      // TODO: Extrair inputs'}

      // TODO: Implementar logica da skill "${request.name}"
      // Dica: Use this.emit('progress', { percent: 50 }) para progresso

      return {
        success: true,
        data: {
          message: '${request.name} executado com sucesso',
          // TODO: Retornar dados reais
        },
        duration: Date.now() - startTime,
      };`;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private validateRequest(request: ScaffoldRequest): { ok: boolean; error?: string } {
    if (!request.name || !request.name.includes('.')) {
      return { ok: false, error: 'Nome deve ter formato "categoria.acao" (ex: "seo.audit")' };
    }
    if (!request.description) {
      return { ok: false, error: 'Descricao e obrigatoria' };
    }
    if (!request.category) {
      return { ok: false, error: 'Categoria e obrigatoria' };
    }
    if (request.name.length > 50) {
      return { ok: false, error: 'Nome muito longo (max 50 chars)' };
    }
    return { ok: true };
  }

  private buildSpec(request: ScaffoldRequest): SkillSpec {
    const risk = request.risk || (request.dangerous ? 'high' : 'safe');
    const approval: ApprovalPolicy = request.dangerous ? 'requires_approval' : 'auto';

    return {
      name: request.name,
      version: '1.0.0',
      status: 'draft' as SkillStatus,
      category: request.category.toUpperCase(),
      description: request.description,
      risk,
      approval,
      dangerous: request.dangerous || false,
      dependencies: request.dependencies || [],
      capabilities: [],
      inputs: request.inputs || [],
      outputs: request.outputs || [
        { name: 'result', type: 'object', required: true, description: 'Resultado da execucao' },
      ],
      tags: request.tags || [request.category.toLowerCase()],
      author: request.author || 'openclaw-aurora',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * "seo.audit" -> "SEOAuditSkill"
   */
  private toClassName(name: string): string {
    return name
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'Skill';
  }

  /**
   * "seo.audit" -> "seo-audit.ts"
   */
  private toFileName(name: string): string {
    return name.replace(/\./g, '-') + '.ts';
  }

  /**
   * "seo.audit" -> "seoAuditSkill"
   */
  private toInstanceName(name: string): string {
    const parts = name.split('.');
    return parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'Skill';
  }

  private fieldTypeToTS(type: string): string {
    switch (type) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'array': return 'any[]';
      case 'object': return 'Record<string, any>';
      default: return 'any';
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let scaffolderInstance: SkillScaffolder | null = null;

export function getSkillScaffolder(): SkillScaffolder {
  if (!scaffolderInstance) {
    scaffolderInstance = new SkillScaffolder();
  }
  return scaffolderInstance;
}
