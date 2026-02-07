/**
 * F-02: Skill Registry v2
 * Upgrade do registry com versão, status, dependências e capabilities
 */

// ============================================================================
// TIPOS DO REGISTRY V2
// ============================================================================

export type SkillStatus = 'draft' | 'stable' | 'deprecated';

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export type ApprovalPolicy = 'auto' | 'auto_with_log' | 'requires_approval' | 'blocked';

export interface SkillSpec {
  name: string;
  version: string;
  status: SkillStatus;
  category: string;
  description: string;
  risk: RiskLevel;
  approval: ApprovalPolicy;
  dangerous: boolean;
  dependencies: string[];       // Outras skills necessarias
  capabilities: string[];       // O que esta skill pode fazer (ex: 'network', 'filesystem', 'process')
  inputs: FieldSpec[];          // Schema dos inputs
  outputs: FieldSpec[];         // Schema dos outputs
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface FieldSpec {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: any;
}

// ============================================================================
// REGISTRY V2
// ============================================================================

export class SkillRegistryV2 {
  private specs: Map<string, SkillSpec> = new Map();

  /**
   * Registra ou atualiza spec de uma skill
   */
  register(spec: SkillSpec): void {
    const existing = this.specs.get(spec.name);
    if (existing) {
      // Se ja existe, valida versao
      if (this.compareVersions(spec.version, existing.version) <= 0) {
        console.log(`[RegistryV2] Skip ${spec.name} v${spec.version} (already have v${existing.version})`);
        return;
      }
    }
    this.specs.set(spec.name, { ...spec, updatedAt: new Date().toISOString() });
    console.log(`[RegistryV2] Registered: ${spec.name} v${spec.version} [${spec.status}]`);
  }

  /**
   * Busca spec por nome
   */
  get(name: string): SkillSpec | undefined {
    return this.specs.get(name);
  }

  /**
   * Lista todas as specs
   */
  getAll(): SkillSpec[] {
    return Array.from(this.specs.values());
  }

  /**
   * Filtra por status
   */
  getByStatus(status: SkillStatus): SkillSpec[] {
    return this.getAll().filter(s => s.status === status);
  }

  /**
   * Filtra por categoria
   */
  getByCategory(category: string): SkillSpec[] {
    return this.getAll().filter(s => s.category === category);
  }

  /**
   * Filtra por nivel de risco
   */
  getByRisk(risk: RiskLevel): SkillSpec[] {
    return this.getAll().filter(s => s.risk === risk);
  }

  /**
   * Verifica se todas as dependencias de uma skill estao disponiveis
   */
  checkDependencies(name: string): { ok: boolean; missing: string[] } {
    const spec = this.specs.get(name);
    if (!spec) return { ok: false, missing: [name] };

    const missing = spec.dependencies.filter(dep => !this.specs.has(dep));
    return { ok: missing.length === 0, missing };
  }

  /**
   * Resolve ordem de execucao respeitando dependencias (topological sort)
   */
  resolveExecutionOrder(names: string[]): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);
      const spec = this.specs.get(name);
      if (spec) {
        for (const dep of spec.dependencies) {
          visit(dep);
        }
      }
      order.push(name);
    };

    for (const name of names) {
      visit(name);
    }

    return order;
  }

  /**
   * Depreca uma skill
   */
  deprecate(name: string): boolean {
    const spec = this.specs.get(name);
    if (!spec) return false;
    spec.status = 'deprecated';
    spec.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Promove skill de draft para stable
   */
  promote(name: string): boolean {
    const spec = this.specs.get(name);
    if (!spec || spec.status !== 'draft') return false;
    spec.status = 'stable';
    spec.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Determina politica de aprovacao baseado no risco
   */
  getApprovalPolicy(name: string): ApprovalPolicy {
    const spec = this.specs.get(name);
    if (!spec) return 'blocked';
    return spec.approval;
  }

  /**
   * Estatisticas do registry
   */
  getStats() {
    const all = this.getAll();
    const byStatus: Record<string, number> = {};
    const byRisk: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const spec of all) {
      byStatus[spec.status] = (byStatus[spec.status] || 0) + 1;
      byRisk[spec.risk] = (byRisk[spec.risk] || 0) + 1;
      byCategory[spec.category] = (byCategory[spec.category] || 0) + 1;
    }

    return {
      total: all.length,
      byStatus,
      byRisk,
      byCategory,
      stable: byStatus['stable'] || 0,
      draft: byStatus['draft'] || 0,
      deprecated: byStatus['deprecated'] || 0,
    };
  }

  /**
   * Exporta todo o registry como JSON
   */
  exportJSON(): string {
    return JSON.stringify({
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      stats: this.getStats(),
      skills: this.getAll(),
    }, null, 2);
  }

  /**
   * Importa specs de JSON
   */
  importJSON(json: string): number {
    const data = JSON.parse(json);
    const skills: SkillSpec[] = data.skills || data;
    let count = 0;
    for (const spec of skills) {
      this.register(spec);
      count++;
    }
    return count;
  }

  /**
   * Compara versoes semver simples (major.minor.patch)
   */
  private compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  /**
   * Executa uma skill usando o SkillRegistry V1
   * Compatibilidade com código que espera execute() no registry
   */
  async execute(skillName: string, input: any): Promise<any> {
    const { getSkillRegistry } = await import('./skill-base');
    const registry = getSkillRegistry();
    const skill = registry.get(skillName);
    if (!skill) {
      return { success: false, error: `Skill not found: ${skillName}` };
    }
    return skill.run(input);
  }
}

// ============================================================================
// BUILDER - Cria SkillSpec a partir das skills existentes
// ============================================================================

/**
 * Converte AVAILABLE_SKILLS para SkillSpec
 */
export function buildSpecFromAvailable(skill: {
  name: string;
  category: string;
  description: string;
  dangerous: boolean;
}): SkillSpec {
  const risk: RiskLevel = skill.dangerous ? 'high' : 'safe';
  const approval: ApprovalPolicy = skill.dangerous ? 'requires_approval' : 'auto';

  return {
    name: skill.name,
    version: '1.0.0',
    status: 'stable' as SkillStatus,
    category: skill.category,
    description: skill.description,
    risk,
    approval,
    dangerous: skill.dangerous,
    dependencies: [],
    capabilities: inferCapabilities(skill.name, skill.category),
    inputs: [],
    outputs: [{ name: 'result', type: 'object', required: true, description: 'Resultado da execucao' }],
    tags: [skill.category.toLowerCase()],
    author: 'openclaw-aurora',
    createdAt: '2026-02-04T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Infere capabilities baseado no nome e categoria da skill
 */
function inferCapabilities(name: string, category: string): string[] {
  const caps: string[] = [];

  if (category === 'EXEC' || name.startsWith('exec.')) caps.push('process', 'shell');
  if (category === 'FILE' || name.startsWith('file.')) caps.push('filesystem');
  if (category === 'BROWSER' || name.startsWith('browser.')) caps.push('network', 'browser');
  if (category === 'AUTOPC' || name.startsWith('autopc.')) caps.push('desktop', 'input');
  if (category === 'AI' || name.startsWith('ai.')) caps.push('network', 'ai');
  if (category === 'WEB' || name.startsWith('web.')) caps.push('network');
  if (category === 'COMM' || name.startsWith('telegram.')) caps.push('network', 'messaging');
  if (category === 'MARKETING' || name.startsWith('marketing.')) caps.push('data', 'marketing');
  if (category === 'SOCIAL' || name.startsWith('social.')) caps.push('network', 'social');
  if (category === 'CONTENT' || name.startsWith('content.')) caps.push('ai', 'content');
  if (category === 'REVIEWS' || name.startsWith('reviews.')) caps.push('network', 'reputation');
  if (category === 'ANALYTICS' || name.startsWith('analytics.')) caps.push('data', 'analytics');
  if (category === 'UTIL') caps.push('utility');

  return [...new Set(caps)];
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
