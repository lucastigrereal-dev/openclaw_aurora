/**
 * F-02: Skill Registry v2 - Advanced Registry with Versioning & Dependencies
 *
 * Suporta:
 * - Múltiplas versões de skills
 * - Gestão automática de dependências
 * - Detecção de conflitos
 * - Upgrade/downgrade
 * - Validação de compatibilidade
 *
 * @version 2.0.0
 * @critical FOUNDATION
 */

import { EventEmitter } from 'events';
import { Skill, SkillInput, SkillOutput } from './skill-base';
import {
  SkillSpec,
  SkillStatus,
  SkillDependency,
  SemVerValidator,
  SkillSpecValidator,
} from './skill-spec';

// ============================================================================
// TYPES
// ============================================================================

export interface SkillRegistryEntry {
  skill: Skill;
  spec: SkillSpec;
  registeredAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

export interface DependencyResolution {
  skill: string;
  version: string;
  satisfied: boolean;
  availableVersions: string[];
  reason?: string;
}

export interface RegistryStats {
  totalSkills: number;
  totalVersions: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  deprecated: number;
  experimental: number;
}

// ============================================================================
// SKILL REGISTRY V2
// ============================================================================

export class SkillRegistryV2 extends EventEmitter {
  // Armazenamento: skillName -> version -> entry
  private skills: Map<string, Map<string, SkillRegistryEntry>> = new Map();

  // Cache de resoluções de dependência
  private dependencyCache: Map<string, DependencyResolution[]> = new Map();

  /**
   * Registra uma nova skill ou versão
   */
  register(skill: Skill, spec: SkillSpec): void {
    // Validar spec
    const validation = SkillSpecValidator.validate(spec);
    if (!validation.valid) {
      throw new Error(
        `Invalid SkillSpec for ${spec.name}:\n${validation.errors.join('\n')}`
      );
    }

    // Verificar se nome da skill bate com spec
    if (skill.metadata.name !== spec.name) {
      throw new Error(
        `Skill name mismatch: ${skill.metadata.name} !== ${spec.name}`
      );
    }

    // Obter ou criar mapa de versões
    if (!this.skills.has(spec.name)) {
      this.skills.set(spec.name, new Map());
    }

    const versions = this.skills.get(spec.name)!;

    // Verificar se versão já existe
    if (versions.has(spec.version)) {
      console.warn(
        `[RegistryV2] Overwriting ${spec.name}@${spec.version}`
      );
    }

    // Validar dependências
    if (spec.dependencies) {
      const depResolution = this.resolveDependencies(spec.dependencies);
      const unsatisfied = depResolution.filter(d => !d.satisfied);

      if (unsatisfied.length > 0 && !this.allOptional(unsatisfied, spec.dependencies)) {
        throw new Error(
          `Unresolved dependencies for ${spec.name}@${spec.version}:\n` +
          unsatisfied.map(d => `  - ${d.skill}: ${d.reason}`).join('\n')
        );
      }
    }

    // Registrar skill
    const entry: SkillRegistryEntry = {
      skill,
      spec,
      registeredAt: new Date(),
      usageCount: 0,
    };

    versions.set(spec.version, entry);

    // Propagar eventos
    skill.on('start', (data) => this.emit('skill:start', data));
    skill.on('complete', (data) => this.emit('skill:complete', data));
    skill.on('error', (data) => this.emit('skill:error', data));

    this.emit('skill:registered', {
      name: spec.name,
      version: spec.version,
      status: spec.status,
    });

    console.log(
      `[RegistryV2] Registered: ${spec.name}@${spec.version} (${spec.status})`
    );

    // Limpar cache de dependências
    this.dependencyCache.clear();
  }

  /**
   * Remove uma versão específica de uma skill
   */
  unregister(name: string, version: string): boolean {
    const versions = this.skills.get(name);
    if (!versions) return false;

    const removed = versions.delete(version);

    // Se não há mais versões, remove a skill completamente
    if (versions.size === 0) {
      this.skills.delete(name);
    }

    if (removed) {
      this.emit('skill:unregistered', { name, version });
      this.dependencyCache.clear();
    }

    return removed;
  }

  /**
   * Obtém uma versão específica de uma skill
   */
  get(name: string, version?: string): Skill | undefined {
    const versions = this.skills.get(name);
    if (!versions) return undefined;

    // Se versão especificada, retornar exata
    if (version) {
      const entry = versions.get(version);
      return entry?.skill;
    }

    // Caso contrário, retornar versão mais recente ACTIVE
    const activeVersions = Array.from(versions.entries())
      .filter(([_, entry]) => entry.spec.status === SkillStatus.ACTIVE)
      .sort((a, b) => SemVerValidator.compare(b[0], a[0]));

    if (activeVersions.length > 0) {
      return activeVersions[0][1].skill;
    }

    // Se não há ACTIVE, retornar versão mais recente qualquer
    const allVersions = Array.from(versions.entries())
      .sort((a, b) => SemVerValidator.compare(b[0], a[0]));

    return allVersions[0]?.[1].skill;
  }

  /**
   * Obtém entry completo (skill + spec)
   */
  getEntry(name: string, version?: string): SkillRegistryEntry | undefined {
    const versions = this.skills.get(name);
    if (!versions) return undefined;

    if (version) {
      return versions.get(version);
    }

    // Retornar versão mais recente ACTIVE
    const activeVersions = Array.from(versions.entries())
      .filter(([_, entry]) => entry.spec.status === SkillStatus.ACTIVE)
      .sort((a, b) => SemVerValidator.compare(b[0], a[0]));

    if (activeVersions.length > 0) {
      return activeVersions[0][1];
    }

    // Se não há ACTIVE, retornar versão mais recente
    const allVersions = Array.from(versions.entries())
      .sort((a, b) => SemVerValidator.compare(b[0], a[0]));

    return allVersions[0]?.[1];
  }

  /**
   * Obtém apenas o spec de uma skill
   */
  getSpec(name: string, version?: string): SkillSpec | undefined {
    const entry = this.getEntry(name, version);
    return entry?.spec;
  }

  /**
   * Lista todas as versões disponíveis de uma skill
   */
  listVersions(name: string): string[] {
    const versions = this.skills.get(name);
    if (!versions) return [];

    return Array.from(versions.keys()).sort((a, b) =>
      SemVerValidator.compare(b, a)
    );
  }

  /**
   * Encontra versão que satisfaz um range semver
   */
  findMatchingVersion(name: string, versionRange: string): string | undefined {
    const versions = this.listVersions(name);

    for (const version of versions) {
      if (SemVerValidator.satisfies(version, versionRange)) {
        const entry = this.getEntry(name, version);
        // Priorizar versões ACTIVE
        if (entry && entry.spec.status === SkillStatus.ACTIVE) {
          return version;
        }
      }
    }

    // Se não encontrou ACTIVE, aceitar qualquer status
    for (const version of versions) {
      if (SemVerValidator.satisfies(version, versionRange)) {
        return version;
      }
    }

    return undefined;
  }

  /**
   * Executa uma skill com resolução automática de versão
   */
  async execute(
    name: string,
    input: SkillInput,
    versionRange?: string
  ): Promise<SkillOutput> {
    let skill: Skill | undefined;

    if (versionRange) {
      const version = this.findMatchingVersion(name, versionRange);
      if (!version) {
        return {
          success: false,
          error: `No version of ${name} satisfies ${versionRange}`,
        };
      }
      skill = this.get(name, version);
    } else {
      skill = this.get(name);
    }

    if (!skill) {
      return {
        success: false,
        error: `Skill not found: ${name}`,
      };
    }

    // Atualizar stats de uso
    const entry = this.getEntry(name, skill.metadata.version);
    if (entry) {
      entry.lastUsed = new Date();
      entry.usageCount++;
    }

    return skill.run(input);
  }

  /**
   * Resolve dependências de uma skill
   */
  resolveDependencies(
    dependencies: SkillDependency[]
  ): DependencyResolution[] {
    const cacheKey = JSON.stringify(dependencies);

    if (this.dependencyCache.has(cacheKey)) {
      return this.dependencyCache.get(cacheKey)!;
    }

    const resolutions: DependencyResolution[] = [];

    for (const dep of dependencies) {
      const availableVersions = this.listVersions(dep.skillName);
      const matchingVersion = this.findMatchingVersion(
        dep.skillName,
        dep.version
      );

      const resolution: DependencyResolution = {
        skill: dep.skillName,
        version: dep.version,
        satisfied: !!matchingVersion,
        availableVersions,
      };

      if (!matchingVersion) {
        if (availableVersions.length === 0) {
          resolution.reason = 'Skill not found';
        } else {
          resolution.reason = `No version satisfies ${dep.version}. Available: ${availableVersions.join(', ')}`;
        }
      }

      resolutions.push(resolution);
    }

    this.dependencyCache.set(cacheKey, resolutions);
    return resolutions;
  }

  /**
   * Valida se todas as dependências de uma skill estão satisfeitas
   */
  validateDependencies(name: string, version: string): {
    valid: boolean;
    missing: DependencyResolution[];
  } {
    const entry = this.getEntry(name, version);
    if (!entry || !entry.spec.dependencies) {
      return { valid: true, missing: [] };
    }

    const resolutions = this.resolveDependencies(entry.spec.dependencies);
    const missing = resolutions.filter(
      r => !r.satisfied && !this.isOptionalDep(r.skill, entry.spec.dependencies!)
    );

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Lista todas as skills (última versão de cada)
   */
  listAll(): SkillSpec[] {
    const specs: SkillSpec[] = [];

    for (const [name, versions] of this.skills.entries()) {
      const entry = this.getEntry(name);
      if (entry) {
        specs.push(entry.spec);
      }
    }

    return specs;
  }

  /**
   * Estatísticas do registry
   */
  getStats(): RegistryStats {
    let totalVersions = 0;
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let deprecated = 0;
    let experimental = 0;

    for (const [_, versions] of this.skills.entries()) {
      totalVersions += versions.size;

      for (const [_, entry] of versions.entries()) {
        const status = entry.spec.status;
        const category = entry.spec.category;

        byStatus[status] = (byStatus[status] || 0) + 1;
        byCategory[category] = (byCategory[category] || 0) + 1;

        if (status === SkillStatus.DEPRECATED) deprecated++;
        if (status === SkillStatus.EXPERIMENTAL) experimental++;
      }
    }

    return {
      totalSkills: this.skills.size,
      totalVersions,
      byStatus,
      byCategory,
      deprecated,
      experimental,
    };
  }

  /**
   * Detecta conflitos de dependências
   */
  detectConflicts(): Array<{
    skill: string;
    version: string;
    conflicts: string[];
  }> {
    const conflicts: Array<{
      skill: string;
      version: string;
      conflicts: string[];
    }> = [];

    for (const [name, versions] of this.skills.entries()) {
      for (const [version, entry] of versions.entries()) {
        if (!entry.spec.dependencies) continue;

        const validation = this.validateDependencies(name, version);
        if (!validation.valid) {
          conflicts.push({
            skill: name,
            version,
            conflicts: validation.missing.map(m => `${m.skill}: ${m.reason}`),
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Limpa versões antigas/deprecadas
   */
  cleanup(options: {
    removeDeprecated?: boolean;
    keepLatestN?: number;
  } = {}): number {
    let removed = 0;

    for (const [name, versions] of this.skills.entries()) {
      const versionList = Array.from(versions.entries()).sort((a, b) =>
        SemVerValidator.compare(b[0], a[0])
      );

      // Remover deprecated
      if (options.removeDeprecated) {
        for (const [version, entry] of versionList) {
          if (entry.spec.status === SkillStatus.DEPRECATED) {
            this.unregister(name, version);
            removed++;
          }
        }
      }

      // Manter apenas N versões mais recentes
      if (options.keepLatestN) {
        const toRemove = versionList.slice(options.keepLatestN);
        for (const [version, _] of toRemove) {
          this.unregister(name, version);
          removed++;
        }
      }
    }

    return removed;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private allOptional(
    unsatisfied: DependencyResolution[],
    deps: SkillDependency[]
  ): boolean {
    return unsatisfied.every(u =>
      deps.find(d => d.skillName === u.skill)?.optional
    );
  }

  private isOptionalDep(
    skillName: string,
    deps: SkillDependency[]
  ): boolean {
    return deps.find(d => d.skillName === skillName)?.optional || false;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let registryV2Instance: SkillRegistryV2 | null = null;

export function getSkillRegistryV2(): SkillRegistryV2 {
  if (!registryV2Instance) {
    registryV2Instance = new SkillRegistryV2();
  }
  return registryV2Instance;
}

// ============================================================================
// MIGRATION HELPER
// ============================================================================

/**
 * Migra skills do SkillRegistry v1 para v2
 */
export function migrateToV2(
  skillsV1: Skill[],
  specs: Map<string, SkillSpec>
): SkillRegistryV2 {
  const registryV2 = new SkillRegistryV2();

  for (const skill of skillsV1) {
    const spec = specs.get(skill.metadata.name);

    if (!spec) {
      console.warn(
        `[Migration] No SkillSpec for ${skill.metadata.name}, skipping`
      );
      continue;
    }

    try {
      registryV2.register(skill, spec);
    } catch (error) {
      console.error(
        `[Migration] Failed to register ${skill.metadata.name}:`,
        error
      );
    }
  }

  console.log(`[Migration] Migrated ${skillsV1.length} skills to RegistryV2`);
  return registryV2;
}
