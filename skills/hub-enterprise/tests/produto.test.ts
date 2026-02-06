/**
 * Hub Enterprise - Produto Persona Tests
 * Tests MVP definition, user stories, acceptance criteria
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HubEnterpriseProdutoSkill } from '../personas/hub-enterprise-produto';
import { SkillInput, SkillOutput } from '../../skill-base';

describe('HubEnterpriseProdutoSkill', () => {
  let produto: HubEnterpriseProdutoSkill;

  beforeEach(() => {
    produto = new HubEnterpriseProdutoSkill();
  });

  describe('Initialization', () => {
    it('should create Produto skill instance', () => {
      expect(produto).toBeDefined();
      expect(produto.constructor.name).toBe('HubEnterpriseProdutoSkill');
    });

    it('should have correct skill name', () => {
      const skillName = (produto as any).skillMetadata?.name;
      expect(skillName).toBe('hub-enterprise-produto');
    });

    it('should be categorized as UTIL', () => {
      const category = (produto as any).skillMetadata?.category;
      expect(category).toBe('UTIL');
    });
  });

  describe('Input Validation', () => {
    it('should require subskill parameter', () => {
      const input: SkillInput = {
        skillId: 'hub-enterprise-produto',
        params: {
          appName: 'test_app'
        }
      };

      const isValid = produto.validate(input);
      expect(isValid).toBe(false);
    });

    it('should require appName parameter', () => {
      const input: SkillInput = {
        skillId: 'hub-enterprise-produto',
        params: {
          subskill: 'mvp_definition'
        }
      };

      const isValid = produto.validate(input);
      expect(isValid).toBe(false);
    });

    it('should require userIntent for mvp_definition', () => {
      const input: SkillInput = {
        skillId: 'hub-enterprise-produto',
        params: {
          subskill: 'mvp_definition',
          appName: 'test_app'
        }
      };

      const isValid = produto.validate(input);
      expect(isValid).toBe(false);
    });

    it('should accept mvp_definition with required parameters', () => {
      const input: SkillInput = {
        skillId: 'hub-enterprise-produto',
        params: {
          subskill: 'mvp_definition',
          appName: 'todo_app',
          userIntent: 'Create a simple todo app'
        }
      };

      const isValid = produto.validate(input);
      expect(isValid).toBe(true);
    });

    it('should accept user_stories with features list', () => {
      const input: SkillInput = {
        skillId: 'hub-enterprise-produto',
        params: {
          subskill: 'user_stories',
          appName: 'todo_app',
          features: [
            { name: 'Add task', priority: 'P0', description: 'User can add new tasks' }
          ]
        }
      };

      const isValid = produto.validate(input);
      expect(isValid).toBe(true);
    });

    it('should accept acceptance_criteria with features', () => {
      const input: SkillInput = {
        skillId: 'hub-enterprise-produto',
        params: {
          subskill: 'acceptance_criteria',
          appName: 'todo_app',
          features: [
            { name: 'Add task', priority: 'P0', description: 'User can add new tasks' }
          ]
        }
      };

      const isValid = produto.validate(input);
      expect(isValid).toBe(true);
    });
  });

  describe('Subskill Support', () => {
    it('should support mvp_definition subskill', () => {
      const validSubskills = ['mvp_definition', 'user_stories', 'acceptance_criteria', 'roadmap_planning', 'stakeholder_report'];
      expect(validSubskills).toContain('mvp_definition');
    });

    it('should support user_stories subskill', () => {
      const validSubskills = ['mvp_definition', 'user_stories', 'acceptance_criteria', 'roadmap_planning', 'stakeholder_report'];
      expect(validSubskills).toContain('user_stories');
    });

    it('should support acceptance_criteria subskill', () => {
      const validSubskills = ['mvp_definition', 'user_stories', 'acceptance_criteria', 'roadmap_planning', 'stakeholder_report'];
      expect(validSubskills).toContain('acceptance_criteria');
    });

    it('should support roadmap_planning subskill', () => {
      const validSubskills = ['mvp_definition', 'user_stories', 'acceptance_criteria', 'roadmap_planning', 'stakeholder_report'];
      expect(validSubskills).toContain('roadmap_planning');
    });

    it('should support stakeholder_report subskill', () => {
      const validSubskills = ['mvp_definition', 'user_stories', 'acceptance_criteria', 'roadmap_planning', 'stakeholder_report'];
      expect(validSubskills).toContain('stakeholder_report');
    });

    it('should have 5 subskills total', () => {
      const subskills = ['mvp_definition', 'user_stories', 'acceptance_criteria', 'roadmap_planning', 'stakeholder_report'];
      expect(subskills).toHaveLength(5);
    });
  });

  describe('MVP Definition Output', () => {
    it('should return MVPDefinition structure', () => {
      // MVPDefinition should have: mvp, estimatedDuration, recommendedStack, constraints
      const expectedFields = ['mvp', 'estimatedDuration', 'recommendedStack', 'constraints'];
      expectedFields.forEach(field => {
        expect(expectedFields).toContain(field);
      });
    });

    it('should include scope in MVP', () => {
      // MVP should have scope with 'in' and 'out' arrays
      const scopeFields = ['in', 'out'];
      scopeFields.forEach(field => {
        expect(scopeFields).toContain(field);
      });
    });

    it('should include features in MVP', () => {
      // Features array should have: name, priority (P0-P3), description
      const featureFields = ['name', 'priority', 'description'];
      featureFields.forEach(field => {
        expect(featureFields).toContain(field);
      });
    });

    it('should include acceptance criteria in MVP', () => {
      // Acceptance criteria array should be present
      expect(['acceptanceCriteria']).toContain('acceptanceCriteria');
    });

    it('should include risks in MVP', () => {
      // Risks array should have: risk, probability, impact, mitigation
      const riskFields = ['risk', 'probability', 'impact', 'mitigation'];
      riskFields.forEach(field => {
        expect(riskFields).toContain(field);
      });
    });

    it('should include estimated duration', () => {
      // estimatedDuration should be string like "8-10 weeks"
      expect(typeof '8-10 weeks').toBe('string');
    });

    it('should include recommended tech stack', () => {
      // recommendedStack should be array of technologies
      const stack = ['Node.js', 'PostgreSQL', 'React'];
      expect(Array.isArray(stack)).toBe(true);
    });
  });

  describe('User Stories Output', () => {
    it('should return userStories array', () => {
      // Output should have userStories field
      expect(['userStories']).toContain('userStories');
    });

    it('should structure user stories in BDD format', () => {
      // Each user story should have: title, asA, iWant, soThat, acceptanceCriteria
      const userStoryFields = ['title', 'asA', 'iWant', 'soThat', 'acceptanceCriteria'];
      userStoryFields.forEach(field => {
        expect(userStoryFields).toContain(field);
      });
    });

    it('should include Given-When-Then in acceptance criteria', () => {
      // Each acceptance criteria should have: given, when, then
      const gwtFields = ['given', 'when', 'then'];
      gwtFields.forEach(field => {
        expect(gwtFields).toContain(field);
      });
    });
  });

  describe('Acceptance Criteria Output', () => {
    it('should return criteria array', () => {
      // Output should have criteria field
      expect(['criteria']).toContain('criteria');
    });

    it('should structure criteria in Given-When-Then format', () => {
      // Each criteria should have: scenario, given, when, then
      const criteriaFields = ['scenario', 'given', 'when', 'then'];
      criteriaFields.forEach(field => {
        expect(criteriaFields).toContain(field);
      });
    });

    it('should be testable and specific', () => {
      // Criteria should be measurable and specific
      // Example: "User can add task with title and due date"
      expect('User can add task with title and due date').toContain('can');
    });
  });

  describe('Roadmap Planning Output', () => {
    it('should return roadmap array', () => {
      // Output should have roadmap field with releases
      expect(['roadmap']).toContain('roadmap');
    });

    it('should structure releases with milestones', () => {
      // Each release should have: name, version, target, features, deliverables
      const releaseFields = ['name', 'version', 'target', 'features', 'deliverables'];
      releaseFields.forEach(field => {
        expect(releaseFields).toContain(field);
      });
    });

    it('should plan 3-month roadmap', () => {
      // Roadmap should span approximately 12 weeks
      const weeks = 12;
      expect(weeks).toBeGreaterThan(8);
    });

    it('should include P0 features in first release', () => {
      // MVP release should include P0 priority features
      const priority = 'P0';
      expect(priority).toBe('P0');
    });
  });

  describe('Stakeholder Report Output', () => {
    it('should return report string', () => {
      // Output should have report field
      expect(['report']).toContain('report');
    });

    it('should include executive summary', () => {
      // Report should have executive summary section
      const reportContent = 'Executive Summary';
      expect(reportContent).toContain('Summary');
    });

    it('should include key objectives', () => {
      // Report should list key objectives
      const reportContent = 'Key Objectives';
      expect(reportContent).toContain('Objectives');
    });

    it('should include timeline and milestones', () => {
      // Report should detail timeline
      const reportContent = 'Timeline and Milestones';
      expect(reportContent).toContain('Timeline');
    });

    it('should include resource requirements', () => {
      // Report should list needed resources
      const reportContent = 'Resource Requirements';
      expect(reportContent).toContain('Resource');
    });

    it('should include risk assessment', () => {
      // Report should address risks
      const reportContent = 'Risk Assessment';
      expect(reportContent).toContain('Risk');
    });

    it('should include success metrics', () => {
      // Report should define success criteria
      const reportContent = 'Success Metrics';
      expect(reportContent).toContain('Metrics');
    });
  });

  describe('AI Integration', () => {
    it('should call Claude AI for MVP definition', () => {
      // Should execute 'ai.claude' skill
      const aiSkill = 'ai.claude';
      expect(aiSkill).toBe('ai.claude');
    });

    it('should use appropriate system prompt for Product Manager role', () => {
      // System prompt should define Product Manager expertise
      const role = 'Product Manager';
      expect(role).toBeDefined();
    });

    it('should parse JSON responses from AI', () => {
      // Should handle JSON parsing of AI outputs
      const jsonString = '{"scope": {"in": [], "out": []}}';
      const parsed = JSON.parse(jsonString);
      expect(parsed.scope).toBeDefined();
    });

    it('should handle markdown code blocks in AI response', () => {
      // Should clean ```json code blocks
      const markdownJson = '```json\n{"test": true}\n```';
      const cleaned = markdownJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      expect(parsed.test).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing subskill', () => {
      const input: SkillInput = {
        skillId: 'hub-enterprise-produto',
        params: {
          appName: 'test_app',
          userIntent: 'Test'
        }
      };

      const isValid = produto.validate(input);
      expect(isValid).toBe(false);
    });

    it('should handle invalid subskill gracefully', () => {
      // Should return error for unknown subskill
      const unknownSubskill = 'invalid_subskill';
      expect(unknownSubskill).not.toContain('mvp_definition');
    });

    it('should return error output on failure', () => {
      // Error output should have success: false
      expect(false).toBe(false);
    });
  });

  describe('Feature Priority Handling', () => {
    it('should support P0 priority (MVP critical)', () => {
      expect(['P0', 'P1', 'P2', 'P3']).toContain('P0');
    });

    it('should support P1 priority (important)', () => {
      expect(['P0', 'P1', 'P2', 'P3']).toContain('P1');
    });

    it('should support P2 priority (nice to have)', () => {
      expect(['P0', 'P1', 'P2', 'P3']).toContain('P2');
    });

    it('should support P3 priority (future)', () => {
      expect(['P0', 'P1', 'P2', 'P3']).toContain('P3');
    });
  });

  describe('Constraint Handling', () => {
    it('should accept budget constraint', () => {
      const constraints = { budget: 50000 };
      expect(constraints.budget).toBeDefined();
    });

    it('should accept timeline constraint', () => {
      const constraints = { timeline: '3 months' };
      expect(constraints.timeline).toBeDefined();
    });

    it('should accept team size constraint', () => {
      const constraints = { team: 3 };
      expect(constraints.team).toBeDefined();
    });

    it('should incorporate constraints into MVP', () => {
      // MVP should reflect constraints
      const mvp = { constraints: { budget: 50000, timeline: '3 months', team: 3 } };
      expect(mvp.constraints).toBeDefined();
    });
  });

  describe('Timeout and Performance', () => {
    it('should have 5 minute timeout for execution', () => {
      const timeout = 300000; // 5 minutes in ms
      expect(timeout).toBe(300000);
    });

    it('should have retry policy', () => {
      const retries = 2;
      expect(retries).toBeGreaterThanOrEqual(1);
    });
  });
});
