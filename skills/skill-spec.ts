/**
 * F-01: SkillSpec Contract - Extended Skill Specification
 *
 * Padronização com versionamento semântico, status, dependências,
 * níveis de risco, e schema de input/output
 *
 * @version 1.0.0
 * @critical FOUNDATION
 */

import { SkillMetadata, SkillCategory } from './skill-base';

// ============================================================================
// SKILL STATUS
// ============================================================================

export enum SkillStatus {
  ACTIVE = 'active',           // Produção estável
  BETA = 'beta',               // Testes em produção
  EXPERIMENTAL = 'experimental', // Em desenvolvimento
  DEPRECATED = 'deprecated',   // Descontinuada (usar alternativa)
  DISABLED = 'disabled',       // Desabilitada temporariamente
}

// ============================================================================
// SKILL RISK LEVEL
// ============================================================================

export enum SkillRiskLevel {
  LOW = 'low',           // Operações seguras (read-only)
  MEDIUM = 'medium',     // Modificações reversíveis
  HIGH = 'high',         // Modificações críticas (write, delete)
  CRITICAL = 'critical', // Operações irreversíveis (system-level)
}

// ============================================================================
// SKILL DEPENDENCIES
// ============================================================================

export interface SkillDependency {
  skillName: string;
  version: string;      // Semver: "^1.0.0", ">=2.0.0", "1.2.3"
  optional?: boolean;   // Se true, skill roda mesmo sem dependência
}

// ============================================================================
// SKILL IO SCHEMA
// ============================================================================

export interface SkillIOSchema {
  input?: {
    required: string[];           // Campos obrigatórios
    optional?: string[];          // Campos opcionais
    types?: Record<string, string>; // Tipos esperados
    examples?: any[];             // Exemplos de input válido
  };
  output?: {
    successFields: string[];      // Campos no output de sucesso
    errorFields?: string[];       // Campos no output de erro
    examples?: any[];             // Exemplos de output
  };
}

// ============================================================================
// SKILL SPEC CONTRACT (EXTENDED)
// ============================================================================

export interface SkillSpec extends SkillMetadata {
  // Campos base (herdados de SkillMetadata)
  // name: string;
  // description: string;
  // version: string;
  // category: SkillCategory;
  // author?: string;
  // tags?: string[];

  // NOVOS CAMPOS (F-01)
  status: SkillStatus;
  riskLevel: SkillRiskLevel;
  dependencies?: SkillDependency[];
  ioSchema?: SkillIOSchema;

  // Metadata adicional
  changelog?: {
    version: string;
    date: string;
    changes: string[];
  }[];
  deprecationReason?: string;  // Se status = DEPRECATED
  alternativeTo?: string;      // Skill substituta
  estimatedDuration?: number;  // Duração estimada (ms)
  costEstimate?: number;       // Custo estimado (USD)
}

// ============================================================================
// SEMVER UTILITIES
// ============================================================================

export class SemVerValidator {
  /**
   * Valida se uma versão está no formato semver correto
   * @example "1.0.0", "2.3.1-beta", "1.0.0-rc.1"
   */
  static isValidSemVer(version: string): boolean {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(-[a-zA-Z0-9.-]+)?$/;
    return semverRegex.test(version);
  }

  /**
   * Compara duas versões semver
   * @returns -1 se v1 < v2, 0 se igual, 1 se v1 > v2
   */
  static compare(v1: string, v2: string): number {
    const parts1 = this.parseSemVer(v1);
    const parts2 = this.parseSemVer(v2);

    if (!parts1 || !parts2) return 0;

    // Compara major, minor, patch
    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }

    return 0;
  }

  /**
   * Verifica se uma versão satisfaz um range semver
   * @example satisfies("1.2.3", "^1.0.0") => true
   */
  static satisfies(version: string, range: string): boolean {
    // Implementação simplificada de ranges semver
    if (range.startsWith('^')) {
      // Caret: ^1.2.3 = >=1.2.3 <2.0.0
      const minVersion = range.slice(1);
      const [major] = this.parseSemVer(minVersion) || [0];
      const [actualMajor] = this.parseSemVer(version) || [0];

      return actualMajor === major && this.compare(version, minVersion) >= 0;
    } else if (range.startsWith('>=')) {
      // Greater or equal
      const minVersion = range.slice(2);
      return this.compare(version, minVersion) >= 0;
    } else if (range.startsWith('~')) {
      // Tilde: ~1.2.3 = >=1.2.3 <1.3.0
      const minVersion = range.slice(1);
      const [major, minor] = this.parseSemVer(minVersion) || [0, 0];
      const [actualMajor, actualMinor] = this.parseSemVer(version) || [0, 0];

      return (
        actualMajor === major &&
        actualMinor === minor &&
        this.compare(version, minVersion) >= 0
      );
    } else {
      // Exact match
      return version === range;
    }
  }

  private static parseSemVer(version: string): [number, number, number] | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }
}

// ============================================================================
// SKILL SPEC VALIDATOR
// ============================================================================

export class SkillSpecValidator {
  /**
   * Valida um SkillSpec completo
   */
  static validate(spec: SkillSpec): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar campos obrigatórios
    if (!spec.name || spec.name.length === 0) {
      errors.push('name is required');
    }

    if (!spec.description || spec.description.length === 0) {
      errors.push('description is required');
    }

    if (!spec.version || !SemVerValidator.isValidSemVer(spec.version)) {
      errors.push('version must be valid semver (e.g., 1.0.0)');
    }

    if (!spec.category) {
      errors.push('category is required');
    }

    if (!spec.status || !Object.values(SkillStatus).includes(spec.status)) {
      errors.push('status must be a valid SkillStatus');
    }

    if (!spec.riskLevel || !Object.values(SkillRiskLevel).includes(spec.riskLevel)) {
      errors.push('riskLevel must be a valid SkillRiskLevel');
    }

    // Validar dependências
    if (spec.dependencies) {
      spec.dependencies.forEach((dep, index) => {
        if (!dep.skillName) {
          errors.push(`dependencies[${index}].skillName is required`);
        }
        if (!dep.version || !this.isValidVersionRange(dep.version)) {
          errors.push(`dependencies[${index}].version must be valid semver range`);
        }
      });
    }

    // Validar deprecation
    if (spec.status === SkillStatus.DEPRECATED && !spec.deprecationReason) {
      errors.push('deprecationReason is required when status is DEPRECATED');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static isValidVersionRange(range: string): boolean {
    // Aceita: "1.0.0", "^1.0.0", ">=1.0.0", "~1.2.3"
    return /^[~^>=]*\d+\.\d+\.\d+/.test(range);
  }
}

// ============================================================================
// SKILL SPEC BUILDER (Factory Pattern)
// ============================================================================

export class SkillSpecBuilder {
  private spec: Partial<SkillSpec> = {};

  setName(name: string): this {
    this.spec.name = name;
    return this;
  }

  setDescription(description: string): this {
    this.spec.description = description;
    return this;
  }

  setVersion(version: string): this {
    if (!SemVerValidator.isValidSemVer(version)) {
      throw new Error(`Invalid semver: ${version}`);
    }
    this.spec.version = version;
    return this;
  }

  setCategory(category: SkillCategory): this {
    this.spec.category = category;
    return this;
  }

  setStatus(status: SkillStatus): this {
    this.spec.status = status;
    return this;
  }

  setRiskLevel(level: SkillRiskLevel): this {
    this.spec.riskLevel = level;
    return this;
  }

  setAuthor(author: string): this {
    this.spec.author = author;
    return this;
  }

  setTags(tags: string[]): this {
    this.spec.tags = tags;
    return this;
  }

  addDependency(skillName: string, version: string, optional: boolean = false): this {
    if (!this.spec.dependencies) {
      this.spec.dependencies = [];
    }
    this.spec.dependencies.push({ skillName, version, optional });
    return this;
  }

  setIOSchema(schema: SkillIOSchema): this {
    this.spec.ioSchema = schema;
    return this;
  }

  addChangelogEntry(version: string, date: string, changes: string[]): this {
    if (!this.spec.changelog) {
      this.spec.changelog = [];
    }
    this.spec.changelog.push({ version, date, changes });
    return this;
  }

  setDeprecation(reason: string, alternativeTo?: string): this {
    this.spec.status = SkillStatus.DEPRECATED;
    this.spec.deprecationReason = reason;
    if (alternativeTo) {
      this.spec.alternativeTo = alternativeTo;
    }
    return this;
  }

  setEstimatedDuration(ms: number): this {
    this.spec.estimatedDuration = ms;
    return this;
  }

  setCostEstimate(usd: number): this {
    this.spec.costEstimate = usd;
    return this;
  }

  build(): SkillSpec {
    const validation = SkillSpecValidator.validate(this.spec as SkillSpec);

    if (!validation.valid) {
      throw new Error(
        `Invalid SkillSpec:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`
      );
    }

    return this.spec as SkillSpec;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Cria um SkillSpec básico rapidamente
 */
export function createBasicSpec(
  name: string,
  description: string,
  category: SkillCategory,
  riskLevel: SkillRiskLevel = SkillRiskLevel.LOW
): SkillSpec {
  return new SkillSpecBuilder()
    .setName(name)
    .setDescription(description)
    .setVersion('1.0.0')
    .setCategory(category)
    .setStatus(SkillStatus.ACTIVE)
    .setRiskLevel(riskLevel)
    .build();
}

/**
 * Cria um SkillSpec experimental
 */
export function createExperimentalSpec(
  name: string,
  description: string,
  category: SkillCategory
): SkillSpec {
  return new SkillSpecBuilder()
    .setName(name)
    .setDescription(description)
    .setVersion('0.1.0')
    .setCategory(category)
    .setStatus(SkillStatus.EXPERIMENTAL)
    .setRiskLevel(SkillRiskLevel.MEDIUM)
    .build();
}
