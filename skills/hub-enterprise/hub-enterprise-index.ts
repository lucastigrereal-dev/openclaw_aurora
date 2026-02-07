/**
 * Hub Enterprise - Central Registry
 * Registra todas as personas e o orchestrator
 */

import { getSkillRegistryV2 } from '../skill-base';

export function registerHubEnterpriseSkills(): void {
  const registry = getSkillRegistryV2();

  console.log('[HubEnterprise] 🏭 Starting Hub Enterprise skill registration...');

  // S-01: Produto Persona
  registry.register({
    name: 'hub-enterprise-produto',
    version: '1.0.0',
    status: 'stable',
    risk: 'low',
    category: 'UTIL',
    description:
      'Product Owner persona - MVP definition, feature scoping, requirements',
    tags: ['hub-enterprise', 'product', 'mvp', 'requirements', 'p1'],
    author: 'Hub Enterprise',
    approval: 'blocked',
    dangerous: false,
    dependencies: [],
    capabilities: ['ai', 'utility'],
    inputs: [],
    outputs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // S-02: Arquitetura Persona
  registry.register({
    name: 'hub-enterprise-arquitetura',
    version: '1.0.0',
    status: 'stable',
    risk: 'medium',
    category: 'UTIL',
    description: 'Architecture persona - system design, tech stack, scalability planning',
    tags: ['hub-enterprise', 'architecture', 'design', 'tech-stack', 'p2'],
    author: 'Hub Enterprise',
    approval: 'blocked',
    dangerous: false,
    dependencies: [],
    capabilities: ['ai', 'utility'],
    inputs: [],
    outputs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // S-03: Engenharia Persona
  registry.register({
    name: 'hub-enterprise-engenharia',
    version: '1.0.0',
    status: 'stable',
    risk: 'medium',
    category: 'EXEC',
    description: 'Engineering persona - code generation, scaffolding, CI/CD setup',
    tags: ['hub-enterprise', 'engineering', 'code-gen', 'scaffold', 'p3'],
    author: 'Hub Enterprise',
    approval: 'blocked',
    dangerous: false,
    dependencies: [],
    capabilities: ['process', 'shell', 'utility'],
    inputs: [],
    outputs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // S-04: QA Persona
  registry.register({
    name: 'hub-enterprise-qa',
    version: '1.0.0',
    status: 'stable',
    risk: 'low',
    category: 'UTIL',
    description: 'QA persona - testing, validation, quality assurance',
    tags: ['hub-enterprise', 'qa', 'testing', 'validation', 'p4'],
    author: 'Hub Enterprise',
    approval: 'blocked',
    dangerous: false,
    dependencies: [],
    capabilities: ['utility'],
    inputs: [],
    outputs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // S-05: Ops Persona
  registry.register({
    name: 'hub-enterprise-ops',
    version: '1.0.0',
    status: 'stable',
    risk: 'high',
    category: 'EXEC',
    description: 'DevOps persona - infrastructure, deployment, monitoring, incident response',
    tags: ['hub-enterprise', 'ops', 'devops', 'deployment', 'p5'],
    author: 'Hub Enterprise',
    approval: 'blocked',
    dangerous: false,
    dependencies: [],
    capabilities: ['process', 'shell', 'network'],
    inputs: [],
    outputs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // S-06: Security Persona
  registry.register({
    name: 'hub-enterprise-security',
    version: '1.0.0',
    status: 'stable',
    risk: 'high',
    category: 'UTIL',
    description: 'Security persona - audits, vulnerability scanning, compliance checks',
    tags: ['hub-enterprise', 'security', 'compliance', 'audit', 'p6'],
    author: 'Hub Enterprise',
    approval: 'blocked',
    dangerous: false,
    dependencies: [],
    capabilities: ['utility', 'network'],
    inputs: [],
    outputs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // S-07: Dados Persona
  registry.register({
    name: 'hub-enterprise-dados',
    version: '1.0.0',
    status: 'stable',
    risk: 'low',
    category: 'UTIL',
    description: 'Data persona - dashboards, analytics, data pipelines, reporting',
    tags: ['hub-enterprise', 'data', 'analytics', 'dashboard', 'p7'],
    author: 'Hub Enterprise',
    approval: 'blocked',
    dangerous: false,
    dependencies: [],
    capabilities: ['data', 'utility'],
    inputs: [],
    outputs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // S-08: Design Persona
  registry.register({
    name: 'hub-enterprise-design',
    version: '1.0.0',
    status: 'stable',
    risk: 'low',
    category: 'UTIL',
    description: 'Design persona - wireframes, design systems, accessibility, UX flows',
    tags: ['hub-enterprise', 'design', 'ux', 'ui', 'p8'],
    author: 'Hub Enterprise',
    approval: 'blocked',
    dangerous: false,
    dependencies: [],
    capabilities: ['utility'],
    inputs: [],
    outputs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // S-09: Performance Persona
  registry.register({
    name: 'hub-enterprise-performance',
    version: '1.0.0',
    status: 'stable',
    risk: 'medium',
    category: 'UTIL',
    description: 'Performance persona - optimization, load testing, SLO monitoring',
    tags: ['hub-enterprise', 'performance', 'sre', 'optimization', 'p9'],
    author: 'Hub Enterprise',
    approval: 'blocked',
    dangerous: false,
    dependencies: [],
    capabilities: ['utility'],
    inputs: [],
    outputs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Orchestrator
  registry.register({
    name: 'hub-enterprise-orchestrator',
    version: '1.0.0',
    status: 'stable',
    risk: 'medium',
    category: 'UTIL',
    description: 'Orchestrator - coordinates all personas in 6 workflows (full, mvp-only, code-only, test-only, incident-response, feature-add)',
    tags: ['hub-enterprise', 'orchestration', 'workflow', 'automation'],
    author: 'Hub Enterprise',
    approval: 'blocked',
    dangerous: false,
    dependencies: [],
    capabilities: ['utility'],
    inputs: [],
    outputs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log('[HubEnterprise] ✅ Successfully registered 10 skills:');
  console.log(
    '  - 9 Personas (Produto, Arquitetura, Engenharia, QA, Ops, Security, Dados, Design, Performance)'
  );
  console.log('  - 1 Orchestrator (with 6 workflows)');
  console.log('[HubEnterprise] 📊 Total: 55+ subskills powered by Claude AI');
}

export function getHubEnterpriseStatus(): Record<string, any> {
  return {
    name: 'Hub Enterprise',
    version: '1.0.0',
    status: 'active',
    personas: [
      'hub-enterprise-produto',
      'hub-enterprise-arquitetura',
      'hub-enterprise-engenharia',
      'hub-enterprise-qa',
      'hub-enterprise-ops',
      'hub-enterprise-security',
      'hub-enterprise-dados',
      'hub-enterprise-design',
      'hub-enterprise-performance',
    ],
    orchestrator: 'hub-enterprise-orchestrator',
    workflows: [
      'full',
      'mvp-only',
      'code-only',
      'test-only',
      'incident-response',
      'feature-add',
    ],
    totalSubskills: 55,
    aiProvider: 'claude',
  };
}

export default registerHubEnterpriseSkills;
