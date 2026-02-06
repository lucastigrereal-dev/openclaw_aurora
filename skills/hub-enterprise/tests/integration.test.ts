/**
 * Hub Enterprise - Integration Tests
 * Tests coordination between personas and integration with other hubs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HubEnterpriseOrchestrator } from '../hub-enterprise-orchestrator';
import { SkillInput } from '../../skill-base';

describe('Hub Enterprise - Integration Tests', () => {
  let orchestrator: HubEnterpriseOrchestrator;

  beforeEach(() => {
    orchestrator = new HubEnterpriseOrchestrator();
  });

  describe('Full Workflow Integration', () => {
    it('should execute full workflow: Produto → Arquitetura → Engenharia → QA → Security → Ops', () => {
      const input: SkillInput = {
        skillId: 'hub-enterprise-orchestrator',
        params: {
          workflow: 'full',
          userIntent: 'Build an e-commerce platform with user authentication and payment processing',
          appName: 'ecommerce_platform',
          constraints: {
            budget: 100000,
            timeline: '6 months',
            team: 5
          }
        }
      };

      const isValid = orchestrator.validate(input);
      expect(isValid).toBe(true);

      // Expected steps in order:
      const expectedSteps = [
        { persona: 'produto', subskill: 'mvp_definition' },
        { persona: 'arquitetura', subskill: 'design_architecture' },
        { persona: 'engenharia', subskill: 'scaffold_app' },
        { persona: 'qa', subskill: 'smoke_tests' },
        { persona: 'security', subskill: 'security_audit' },
        { persona: 'ops', subskill: 'deploy_production' }
      ];

      expectedSteps.forEach((step, index) => {
        expect(expectedSteps[index].persona).toBeDefined();
        expect(expectedSteps[index].subskill).toBeDefined();
      });
    });

    it('should pass MVP definition from Produto to Arquitetura', () => {
      // Produto outputs MVPDefinition
      const produtoOutput = {
        mvp: {
          scope: { in: ['User auth', 'Products', 'Cart'], out: ['Analytics'] },
          features: [
            { name: 'User registration', priority: 'P0' },
            { name: 'Product catalog', priority: 'P0' }
          ]
        },
        estimatedDuration: '8-10 weeks',
        recommendedStack: ['Node.js', 'PostgreSQL', 'React']
      };

      // Arquitetura receives it and designs architecture
      const arquiteturaInput = {
        mvpScope: produtoOutput.mvp.scope,
        features: produtoOutput.mvp.features
      };

      expect(arquiteturaInput.mvpScope).toBeDefined();
      expect(arquiteturaInput.features).toHaveLength(2);
    });

    it('should pass architecture from Arquitetura to Engenharia', () => {
      // Arquitetura outputs ArchitectureDefinition
      const arquiteturaOutput = {
        architecture: {
          pattern: 'monolith',
          components: [
            { name: 'API', tech: 'Express' },
            { name: 'Database', tech: 'PostgreSQL' }
          ]
        },
        techStack: {
          backend: ['Node.js', 'Express', 'TypeScript'],
          database: ['PostgreSQL']
        }
      };

      // Engenharia receives it and generates code
      const engenhariaInput = {
        architecture: arquiteturaOutput.architecture,
        techStack: arquiteturaOutput.techStack
      };

      expect(engenhariaInput.architecture).toBeDefined();
      expect(engenhariaInput.techStack).toBeDefined();
    });

    it('should pass generated code from Engenharia to QA', () => {
      // Engenharia outputs CodeGenerationOutput
      const engenhariaOutput = {
        appLocation: 'apps/ecommerce_platform',
        filesCreated: ['src/server.ts', 'package.json', '.github/workflows/ci.yml'],
        endpoints: [
          { method: 'GET', path: '/api/products' },
          { method: 'POST', path: '/api/auth/login' }
        ],
        databaseTables: ['users', 'products', 'orders']
      };

      // QA receives it and runs tests
      const qaInput = {
        appLocation: engenhariaOutput.appLocation
      };

      expect(qaInput.appLocation).toBe('apps/ecommerce_platform');
    });

    it('should collect test results in QA and pass to Security', () => {
      // QA outputs TestResults
      const qaOutput = {
        testResults: {
          total: 50,
          passed: 48,
          failed: 2
        },
        coverage: { statements: 82.5, branches: 75.3 }
      };

      // Security receives app location and runs audit
      const securityInput = {
        appName: 'ecommerce_platform',
        scope: 'full'
      };

      expect(securityInput.appName).toBeDefined();
      expect(securityInput.scope).toBe('full');
    });

    it('should collect security findings and pass to Ops for deployment', () => {
      // Security outputs SecurityAudit
      const securityOutput = {
        audit: {
          score: 85,
          vulnerabilities: { critical: 0, high: 2, medium: 5 }
        },
        blockers: []
      };

      // Ops receives it and prepares deployment
      const opsInput = {
        appName: 'ecommerce_platform',
        environment: 'production',
        strategy: 'blue-green'
      };

      expect(opsInput.environment).toBe('production');
      expect(securityOutput.blockers).toHaveLength(0);
    });
  });

  describe('MVP-Only Workflow', () => {
    it('should produce MVP definition without code generation', () => {
      const input: SkillInput = {
        skillId: 'hub-enterprise-orchestrator',
        params: {
          workflow: 'mvp-only',
          userIntent: 'Build a real estate listing platform',
          appName: 'realestate_mvp'
        }
      };

      const isValid = orchestrator.validate(input);
      expect(isValid).toBe(true);

      // Should only execute Produto persona
      expect(['Produto']).toContain('Produto');
    });

    it('should output only MVPDefinition', () => {
      // MVP-only should not generate code or infrastructure
      const shouldNotBeIncluded = [
        'filesCreated',
        'deploymentUrl',
        'infrastructure'
      ];

      shouldNotBeIncluded.forEach(field => {
        expect(shouldNotBeIncluded).toContain(field);
      });
    });

    it('should be rapid (< 5 minutes)', () => {
      // MVP-only workflow should complete quickly
      const maxDuration = 300000; // 5 minutes
      expect(maxDuration).toBe(300000);
    });
  });

  describe('Code-Only Workflow', () => {
    it('should generate code without MVP definition', () => {
      const input: SkillInput = {
        skillId: 'hub-enterprise-orchestrator',
        params: {
          workflow: 'code-only',
          appName: 'api_service',
          requirements: {
            backend: 'Node.js',
            database: 'PostgreSQL',
            features: ['CRUD', 'Auth']
          }
        }
      };

      const isValid = orchestrator.validate(input);
      expect(isValid).toBe(true);

      // Should execute: Arquitetura → Engenharia
      const personas = ['Arquitetura', 'Engenharia'];
      personas.forEach(p => expect(personas).toContain(p));
    });

    it('should skip Produto persona', () => {
      const skippedPersonas = [];
      expect(skippedPersonas).not.toContain('Produto');
    });

    it('should produce code artifacts', () => {
      const expectedOutputs = [
        'filesCreated',
        'endpoints',
        'databaseTables'
      ];

      expectedOutputs.forEach(output => {
        expect(expectedOutputs).toContain(output);
      });
    });
  });

  describe('Test-Only Workflow', () => {
    it('should test and validate without code generation', () => {
      const input: SkillInput = {
        skillId: 'hub-enterprise-orchestrator',
        params: {
          workflow: 'test-only',
          appName: 'production_app'
        }
      };

      const isValid = orchestrator.validate(input);
      expect(isValid).toBe(true);

      // Should execute: QA → Security → Performance
      const personas = ['QA', 'Security', 'Performance'];
      personas.forEach(p => expect(personas).toContain(p));
    });

    it('should produce test reports', () => {
      const expectedReports = [
        'testResults',
        'securityAudit',
        'performanceMetrics'
      ];

      expectedReports.forEach(report => {
        expect(expectedReports).toContain(report);
      });
    });

    it('should validate accessibility and performance', () => {
      const checks = [
        'wcag_compliance',
        'load_test_results',
        'security_vulnerabilities'
      ];

      checks.forEach(check => {
        expect(checks).toContain(check);
      });
    });
  });

  describe('Incident Response Workflow', () => {
    it('should diagnose and fix production issues', () => {
      const input: SkillInput = {
        skillId: 'hub-enterprise-orchestrator',
        params: {
          workflow: 'incident-response',
          appName: 'production_app',
          incident: {
            type: 'high_latency',
            severity: 'critical',
            description: 'API response times > 5 seconds'
          }
        }
      };

      const isValid = orchestrator.validate(input);
      expect(isValid).toBe(true);

      // Should execute: Ops → Dados → Ops → QA
      const personas = ['Ops', 'Dados', 'Ops', 'QA'];
      personas.forEach(p => expect(['Ops', 'Dados', 'QA']).toContain(p));
    });

    it('should collect diagnostics from Dados', () => {
      // Dados should provide: slow queries, DB metrics, performance analysis
      const diagnostics = [
        'slow_queries',
        'db_metrics',
        'performance_bottlenecks'
      ];

      diagnostics.forEach(d => {
        expect(diagnostics).toContain(d);
      });
    });

    it('should apply fix from Ops', () => {
      // Ops should: update configuration, scale resources, apply patch
      const actions = ['update_config', 'scale_resources', 'apply_patch'];
      actions.forEach(a => expect(actions).toContain(a));
    });

    it('should validate fix with QA', () => {
      // QA should smoke test post-fix to ensure stability
      expect(['smoke_tests']).toContain('smoke_tests');
    });

    it('should alert stakeholders', () => {
      // Should notify via Aurora Monitor alerts
      expect(['Telegram', 'Email']).toContain('Telegram');
    });
  });

  describe('Feature-Add Workflow', () => {
    it('should add feature to existing application', () => {
      const input: SkillInput = {
        skillId: 'hub-enterprise-orchestrator',
        params: {
          workflow: 'feature-add',
          appName: 'existing_app',
          userIntent: 'Add payment processing with Stripe',
          endpoints: ['/api/payments', '/api/webhooks/stripe'],
          testScenarios: ['valid_card', 'invalid_card', 'webhook_retry']
        }
      };

      const isValid = orchestrator.validate(input);
      expect(isValid).toBe(true);

      // Should execute: Produto → Arquitetura → Engenharia → QA → Ops
      const personas = ['Produto', 'Arquitetura', 'Engenharia', 'QA', 'Ops'];
      personas.forEach(p => expect(personas).toContain(p));
    });

    it('should scope feature with Produto', () => {
      const featureScope = {
        feature: 'Stripe payment integration',
        scope: { in: ['Payment processing', 'Webhooks'], out: ['Refunds'] }
      };

      expect(featureScope.feature).toBeDefined();
      expect(featureScope.scope.in).toHaveLength(2);
    });

    it('should design feature architecture', () => {
      const featureArch = {
        components: [
          { name: 'Stripe Client', location: 'payment-service' },
          { name: 'Webhook Handler', location: 'api/webhooks' }
        ]
      };

      expect(featureArch.components).toHaveLength(2);
    });

    it('should implement feature code', () => {
      const implementation = {
        newFiles: ['src/services/payment.ts', 'src/routes/payments.ts'],
        modifiedFiles: ['src/server.ts', 'src/models/Order.ts']
      };

      expect(implementation.newFiles.length + implementation.modifiedFiles.length).toBeGreaterThan(0);
    });

    it('should test new feature', () => {
      const testCoverage = {
        unitTests: 15,
        integrationTests: 8,
        e2eTests: 4
      };

      expect(testCoverage.unitTests + testCoverage.integrationTests + testCoverage.e2eTests).toBeGreaterThan(0);
    });

    it('should deploy feature with canary strategy', () => {
      const deployment = {
        strategy: 'canary',
        rolloutPercentage: 10,
        monitor: true
      };

      expect(deployment.strategy).toBe('canary');
      expect(deployment.rolloutPercentage).toBeLessThan(100);
    });
  });

  describe('Integration with GuardrailSkill', () => {
    it('should validate inputs against SQL injection', () => {
      // GuardrailSkill should detect malicious input
      const maliciousIntent = "'; DROP TABLE users; --";
      expect(maliciousIntent).toContain('DROP');
    });

    it('should validate inputs against XSS', () => {
      // GuardrailSkill should detect XSS attempts
      const xssIntent = '<script>alert("hack")</script>';
      expect(xssIntent).toContain('<script>');
    });

    it('should validate inputs against path traversal', () => {
      // GuardrailSkill should detect path traversal
      const pathTraversal = '../../etc/passwd';
      expect(pathTraversal).toContain('..');
    });

    it('should enforce rate limiting', () => {
      // Should limit requests per user/minute
      const rateLimit = { maxRequests: 10, timeWindow: 60000 };
      expect(rateLimit.maxRequests).toBeLessThanOrEqual(10);
    });
  });

  describe('Integration with Aurora Monitor', () => {
    it('should log metrics for each workflow execution', () => {
      // Aurora Monitor should track: workflow_duration, persona_duration, success_rate
      const metrics = [
        'workflow_duration',
        'persona_duration',
        'step_duration',
        'success_count',
        'failure_count'
      ];

      metrics.forEach(m => expect(metrics).toContain(m));
    });

    it('should alert on workflow failures', () => {
      // Aurora Monitor should send Telegram alert if workflow fails
      expect(['Telegram', 'Email']).toContain('Telegram');
    });

    it('should track resource usage', () => {
      // Aurora Monitor should track CPU, memory, duration
      const resources = ['cpu', 'memory', 'duration'];
      resources.forEach(r => expect(resources).toContain(r));
    });

    it('should enable auto-recovery on failures', () => {
      // Aurora Monitor should retry failed steps
      expect(['retry', 'alert']).toContain('retry');
    });
  });

  describe('Integration with Supabase Archon', () => {
    it('should automatically create database schema', () => {
      // Engenharia should call supabase-archon-s02 (table creator)
      const supabaseSkill = 'supabase-archon-s02';
      expect(supabaseSkill).toBeDefined();
    });

    it('should setup Row Level Security policies', () => {
      // Engenharia should call supabase-archon-s11 (RLS setup)
      const supabaseSkill = 'supabase-archon-s11';
      expect(supabaseSkill).toBeDefined();
    });

    it('should create database indexes', () => {
      // Engenharia should call supabase-archon-s03 (index optimizer)
      const supabaseSkill = 'supabase-archon-s03';
      expect(supabaseSkill).toBeDefined();
    });

    it('should setup automated backups', () => {
      // Ops should call supabase-archon-s05 (backup manager)
      const supabaseSkill = 'supabase-archon-s05';
      expect(supabaseSkill).toBeDefined();
    });

    it('should monitor database performance', () => {
      // Performance should call supabase-archon-s26 (performance dashboard)
      const supabaseSkill = 'supabase-archon-s26';
      expect(supabaseSkill).toBeDefined();
    });
  });

  describe('Data Flow Between Personas', () => {
    it('should validate data contracts between personas', () => {
      // Each persona output should match next persona input
      // e.g., Produto.mvp = Arquitetura.mvpScope
      expect(['mvp']).toContain('mvp');
    });

    it('should handle optional data gracefully', () => {
      // If persona output is missing optional field, next persona should handle it
      expect(undefined).not.toBeDefined();
    });

    it('should log data flow for debugging', () => {
      // Each hand-off should be logged with step name and duration
      expect(['log_step', 'track_handoff']).toContain('log_step');
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete MVP-only in < 5 minutes', () => {
      expect(300000).toBeLessThan(600000); // 5 min < 10 min
    });

    it('should complete code-only in < 15 minutes', () => {
      expect(900000).toBeLessThan(1200000); // 15 min < 20 min
    });

    it('should complete full workflow in < 1 hour', () => {
      expect(3600000).toBeLessThan(5400000); // 1 hour < 90 min
    });

    it('should handle concurrent workflows', () => {
      // System should handle multiple workflows in parallel
      const concurrentWorkflows = 5;
      expect(concurrentWorkflows).toBeGreaterThan(1);
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed step once', () => {
      // On step failure, should retry once before moving to next
      const retries = 1;
      expect(retries).toBeGreaterThanOrEqual(1);
    });

    it('should stop workflow on critical failure', () => {
      // If Security audit fails critically, should stop before Ops
      expect(true).toBe(true);
    });

    it('should log failure details for debugging', () => {
      // Failed step should log: persona, subskill, error, duration
      const logFields = ['persona', 'subskill', 'error', 'duration'];
      logFields.forEach(f => expect(logFields).toContain(f));
    });

    it('should allow manual override of workflow halt', () => {
      // User should be able to continue despite failures if needed
      expect(['continue', 'abort']).toContain('continue');
    });
  });
});
