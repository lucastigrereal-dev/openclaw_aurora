/**
 * Hub Enterprise - Central Registry
 * Registra todas as personas e o orchestrator
 */

import { SkillRegistryV2, SkillStatus, SkillRiskLevel } from '../skill-base';
import { createHubEnterpriseProdutoSkill } from './personas/hub-enterprise-produto';
import { createHubEnterpriseArquiteturaSkill } from './personas/hub-enterprise-arquitetura';
import { createHubEnterpriseEngenhariaSkill } from './personas/hub-enterprise-engenharia';
import { createHubEnterpriseQASkill } from './personas/hub-enterprise-qa';
import { createHubEnterpriseOpsSkill } from './personas/hub-enterprise-ops';
import { createHubEnterpriseSecuritySkill } from './personas/hub-enterprise-security';
import { createHubEnterpriseDadosSkill } from './personas/hub-enterprise-dados';
import { createHubEnterpriseDesignSkill } from './personas/hub-enterprise-design';
import { createHubEnterprisePerformanceSkill } from './personas/hub-enterprise-performance';
import { createHubEnterpriseOrchestrator } from './hub-enterprise-orchestrator';

export function registerHubEnterpriseSkills(): void {
  const registry = SkillRegistryV2.getInstance();

  console.log('[HubEnterprise] 🏭 Starting Hub Enterprise skill registration...');

  // S-01: Produto Persona
  registry.register(createHubEnterpriseProdutoSkill(), {
    name: 'hub-enterprise-produto',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description:
      'Product Owner persona - MVP definition, feature scoping, requirements',
    tags: ['hub-enterprise', 'product', 'mvp', 'requirements', 'p1'],
  });

  // S-02: Arquitetura Persona
  registry.register(createHubEnterpriseArquiteturaSkill(), {
    name: 'hub-enterprise-arquitetura',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'UTIL',
    description:
      'Architecture persona - system design, tech stack, scalability planning',
    tags: ['hub-enterprise', 'architecture', 'design', 'tech-stack', 'p2'],
  });

  // S-03: Engenharia Persona
  registry.register(createHubEnterpriseEngenhariaSkill(), {
    name: 'hub-enterprise-engenharia',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'EXEC',
    description:
      'Engineering persona - code generation, scaffolding, CI/CD setup',
    tags: ['hub-enterprise', 'engineering', 'code-gen', 'scaffold', 'p3'],
  });

  // S-04: QA Persona
  registry.register(createHubEnterpriseQASkill(), {
    name: 'hub-enterprise-qa',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description: 'QA persona - testing, validation, quality assurance',
    tags: ['hub-enterprise', 'qa', 'testing', 'validation', 'p4'],
  });

  // S-05: Ops Persona
  registry.register(createHubEnterpriseOpsSkill(), {
    name: 'hub-enterprise-ops',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.HIGH,
    category: 'EXEC',
    description:
      'DevOps persona - infrastructure, deployment, monitoring, incident response',
    tags: ['hub-enterprise', 'ops', 'devops', 'deployment', 'p5'],
  });

  // S-06: Security Persona
  registry.register(createHubEnterpriseSecuritySkill(), {
    name: 'hub-enterprise-security',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.HIGH,
    category: 'UTIL',
    description:
      'Security persona - audits, vulnerability scanning, compliance checks',
    tags: ['hub-enterprise', 'security', 'compliance', 'audit', 'p6'],
  });

  // S-07: Dados Persona
  registry.register(createHubEnterpriseDadosSkill(), {
    name: 'hub-enterprise-dados',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description:
      'Data persona - dashboards, analytics, data pipelines, reporting',
    tags: ['hub-enterprise', 'data', 'analytics', 'dashboard', 'p7'],
  });

  // S-08: Design Persona
  registry.register(createHubEnterpriseDesignSkill(), {
    name: 'hub-enterprise-design',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.LOW,
    category: 'UTIL',
    description:
      'Design persona - wireframes, design systems, accessibility, UX flows',
    tags: ['hub-enterprise', 'design', 'ux', 'ui', 'p8'],
  });

  // S-09: Performance Persona
  registry.register(createHubEnterprisePerformanceSkill(), {
    name: 'hub-enterprise-performance',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'UTIL',
    description:
      'Performance persona - optimization, load testing, SLO monitoring',
    tags: ['hub-enterprise', 'performance', 'sre', 'optimization', 'p9'],
  });

  // Orchestrator
  registry.register(createHubEnterpriseOrchestrator(), {
    name: 'hub-enterprise-orchestrator',
    version: '1.0.0',
    status: SkillStatus.ACTIVE,
    riskLevel: SkillRiskLevel.MEDIUM,
    category: 'UTIL',
    description:
      'Orchestrator - coordinates all personas in 6 workflows (full, mvp-only, code-only, test-only, incident-response, feature-add)',
    tags: ['hub-enterprise', 'orchestration', 'workflow', 'automation'],
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
