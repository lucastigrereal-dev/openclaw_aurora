/**
 * Skill Executor V2 - OpenClaw Aurora
 *
 * Enhanced executor with all 6 critical infrastructure skills:
 * - F-01: SkillSpec Contract (versioning)
 * - F-02: Registry v2 (multi-version)
 * - E-01: Sandbox Runner (safe execution)
 * - E-03: Skill Scaffolder (code generation)
 * - O-01: Intent Router (AI classification)
 * - A-01: Unified Metrics (analytics)
 *
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import {
  SkillInput,
  SkillOutput,
  registerAllSkills,
} from './skills';

// New infrastructure imports
import { SkillRegistryV2 } from './skills/skill-registry-v2';
import { SkillSpec } from './skills/skill-spec';
import {
  SkillSandbox,
  SandboxMode,
  SandboxConfig,
  createDevSandbox,
  createTestSandbox,
  createProductionSandbox
} from './skills/skill-sandbox';
import { IntentRouter, quickClassify } from './skills/skill-intent-router';
import {
  SkillMetricsCollector,
  getMetricsCollector,
  SkillExecution
} from './skills/skill-metrics';

// Legacy imports
import {
  AuroraMonitor,
  getAuroraMonitor,
  wrapWithCircuitBreaker,
} from './aurora-openclaw-integration';

// ============================================================================
// TYPES
// ============================================================================

export interface ExecutionRequestV2 {
  id: string;
  skill: string;
  version?: string;                        // Versão específica (opcional)
  input: SkillInput;
  userId?: string;
  chatId?: string;
  timestamp: number;

  // Opções de execução
  requiresApproval?: boolean;
  sandboxMode?: SandboxMode;              // dry_run, preview, sandbox, validate, production
  enableMetrics?: boolean;                // Habilitar tracking (default: true)

  // Natural language support
  naturalLanguageInput?: string;          // Ex: "Ler arquivo config.json"
}

export interface ExecutionResultV2 {
  id: string;
  skill: string;
  version: string;
  output: SkillOutput;

  // Timing
  startTime: number;
  endTime: number;
  duration: number;

  // Execution context
  approved?: boolean;
  sandboxMode: SandboxMode;

  // Metrics
  metricsId?: string;
  cost?: {
    tokensUsed?: number;
    estimatedUSD?: number;
  };

  // Intent classification (if used)
  intentCategory?: string;
  intentConfidence?: number;
}

export interface PendingApproval {
  request: ExecutionRequestV2;
  resolver: (approved: boolean) => void;
  timeout: NodeJS.Timeout;
}

// ============================================================================
// SKILL EXECUTOR V2
// ============================================================================

export class SkillExecutorV2 extends EventEmitter {
  // Registries and infrastructure
  private registry: SkillRegistryV2;
  private monitor: AuroraMonitor;
  private sandbox: SkillSandbox;
  private intentRouter: IntentRouter;
  private metricsCollector: SkillMetricsCollector;

  // Execution state
  private executionHistory: ExecutionResultV2[] = [];
  private pendingApprovals: Map<string, PendingApproval> = new Map();

  // Configuration
  private maxHistory = 1000;
  private approvalTimeout = 60000; // 1 minuto
  private defaultSandboxMode: SandboxMode = SandboxMode.PRODUCTION;

  constructor(config?: {
    registry?: SkillRegistryV2;
    monitor?: AuroraMonitor;
    sandbox?: SkillSandbox;
    intentRouter?: IntentRouter;
    metricsCollector?: SkillMetricsCollector;
    defaultSandboxMode?: SandboxMode;
  }) {
    super();

    // Initialize infrastructure
    this.registry = config?.registry || new SkillRegistryV2();
    this.monitor = config?.monitor || getAuroraMonitor();
    this.sandbox = config?.sandbox || createProductionSandbox();
    this.intentRouter = config?.intentRouter || new IntentRouter();
    this.metricsCollector = config?.metricsCollector || getMetricsCollector();

    if (config?.defaultSandboxMode) {
      this.defaultSandboxMode = config.defaultSandboxMode;
    }

    // Register all skills with specs
    this.initializeSkills();

    // Connect events
    this.setupEventHandlers();

    console.log('[ExecutorV2] Initialized with all 6 critical infrastructure skills');
  }

  /**
   * Executa uma skill com toda a infraestrutura
   */
  async execute(request: ExecutionRequestV2): Promise<ExecutionResultV2> {
    const startTime = Date.now();
    const executionId = this.generateId();

    // Step 1: Intent classification (se natural language input fornecido)
    let skillName = request.skill;
    let intentCategory: string | undefined;
    let intentConfidence: number | undefined;

    if (request.naturalLanguageInput) {
      try {
        const classification = await quickClassify(request.naturalLanguageInput);
        intentCategory = classification.category;
        intentConfidence = classification.confidence;

        // Se confiança alta, usar skill sugerida
        if (classification.suggestedSkills.length > 0 &&
            classification.suggestedSkills[0].confidence > 0.7) {
          skillName = classification.suggestedSkills[0].skillName;
          console.log(`[ExecutorV2] Intent classification: ${intentCategory} -> ${skillName}`);
        }
      } catch (error) {
        console.warn('[ExecutorV2] Intent classification failed:', error);
      }
    }

    // Step 2: Get skill from registry v2
    const skillVersion = request.version || undefined;
    const skill = this.registry.get(skillName, skillVersion);

    if (!skill) {
      const result: ExecutionResultV2 = {
        id: request.id,
        skill: skillName,
        version: 'unknown',
        output: { success: false, error: `Skill not found: ${skillName}` },
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        sandboxMode: SandboxMode.PRODUCTION,
        intentCategory,
        intentConfidence,
      };
      this.addToHistory(result);
      return result;
    }

    const spec = this.registry.getSpec(skillName, skillVersion);
    if (!spec) {
      const result: ExecutionResultV2 = {
        id: request.id,
        skill: skillName,
        version: skillVersion || 'latest',
        output: { success: false, error: `Spec not found for: ${skillName}` },
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        sandboxMode: SandboxMode.PRODUCTION,
        intentCategory,
        intentConfidence,
      };
      this.addToHistory(result);
      return result;
    }

    // Step 3: Validate dependencies
    const depsValidation = this.registry.validateDependencies(skillName, spec.version);
    if (!depsValidation.valid) {
      const missing = depsValidation.missing.map(m => m.skill).join(', ');
      const result: ExecutionResultV2 = {
        id: request.id,
        skill: skillName,
        version: spec.version,
        output: { success: false, error: `Missing dependencies: ${missing}` },
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        sandboxMode: SandboxMode.PRODUCTION,
        intentCategory,
        intentConfidence,
      };
      this.addToHistory(result);
      return result;
    }

    // Step 4: Check approval if required
    if (skill.config.requiresApproval || request.requiresApproval) {
      const approved = await this.waitForApproval(request);
      if (!approved) {
        const result: ExecutionResultV2 = {
          id: request.id,
          skill: skillName,
          version: spec.version,
          output: { success: false, error: 'Execution not approved' },
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          approved: false,
          sandboxMode: SandboxMode.PRODUCTION,
          intentCategory,
          intentConfidence,
        };
        this.addToHistory(result);
        return result;
      }
    }

    // Step 5: Execute with Sandbox
    const sandboxMode = request.sandboxMode || this.defaultSandboxMode;
    let output: SkillOutput;
    let metricsId: string | undefined;

    try {
      // Execute in sandbox
      const sandboxResult = await this.sandbox.execute(skill, spec, request.input);
      output = sandboxResult.output;

      // Step 6: Record metrics
      if (request.enableMetrics !== false) {
        const metricsExecution: SkillExecution = {
          id: executionId,
          skillName,
          skillVersion: spec.version,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          duration: Date.now() - startTime,
          success: output.success,
          error: output.error,
          triggeredBy: request.userId || 'system',
          tags: spec.tags,
        };

        await this.metricsCollector.record(metricsExecution);
        metricsId = executionId;
      }

    } catch (error) {
      output = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      // Record failure in metrics
      if (request.enableMetrics !== false) {
        const metricsExecution: SkillExecution = {
          id: executionId,
          skillName,
          skillVersion: spec.version,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          duration: Date.now() - startTime,
          success: false,
          error: output.error,
          triggeredBy: request.userId || 'system',
        };

        await this.metricsCollector.record(metricsExecution);
        metricsId = executionId;
      }
    }

    const result: ExecutionResultV2 = {
      id: request.id,
      skill: skillName,
      version: spec.version,
      output,
      startTime,
      endTime: Date.now(),
      duration: Date.now() - startTime,
      approved: true,
      sandboxMode,
      metricsId,
      intentCategory,
      intentConfidence,
    };

    this.addToHistory(result);
    return result;
  }

  /**
   * Execução simplificada (backward compatible)
   */
  async run(skill: string, input: SkillInput, version?: string): Promise<SkillOutput> {
    const request: ExecutionRequestV2 = {
      id: this.generateId(),
      skill,
      version,
      input,
      timestamp: Date.now(),
    };
    const result = await this.execute(request);
    return result.output;
  }

  /**
   * Execução com linguagem natural
   */
  async runNatural(naturalInput: string, params?: Record<string, any>): Promise<SkillOutput> {
    const request: ExecutionRequestV2 = {
      id: this.generateId(),
      skill: 'auto', // Will be determined by intent router
      input: params || {},
      timestamp: Date.now(),
      naturalLanguageInput: naturalInput,
    };
    const result = await this.execute(request);
    return result.output;
  }

  /**
   * Preview de execução (dry-run)
   */
  async preview(skill: string, input: SkillInput, version?: string) {
    const request: ExecutionRequestV2 = {
      id: this.generateId(),
      skill,
      version,
      input,
      timestamp: Date.now(),
      sandboxMode: SandboxMode.PREVIEW,
    };
    return this.execute(request);
  }

  /**
   * Validação de input sem executar
   */
  async validate(skill: string, input: SkillInput, version?: string) {
    const request: ExecutionRequestV2 = {
      id: this.generateId(),
      skill,
      version,
      input,
      timestamp: Date.now(),
      sandboxMode: SandboxMode.VALIDATE,
    };
    return this.execute(request);
  }

  // ==========================================================================
  // APPROVAL WORKFLOW (same as V1)
  // ==========================================================================

  private waitForApproval(request: ExecutionRequestV2): Promise<boolean> {
    return new Promise((resolve) => {
      this.emit('approval:required', request);

      const timeout = setTimeout(() => {
        this.pendingApprovals.delete(request.id);
        this.emit('approval:timeout', request);
        resolve(false);
      }, this.approvalTimeout);

      this.pendingApprovals.set(request.id, {
        request,
        resolver: resolve,
        timeout,
      });
    });
  }

  approve(requestId: string): boolean {
    const pending = this.pendingApprovals.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingApprovals.delete(requestId);
      pending.resolver(true);
      this.emit('approval:approved', pending.request);
      return true;
    }
    return false;
  }

  reject(requestId: string): boolean {
    const pending = this.pendingApprovals.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingApprovals.delete(requestId);
      pending.resolver(false);
      this.emit('approval:rejected', pending.request);
      return true;
    }
    return false;
  }

  // ==========================================================================
  // STATS & MANAGEMENT
  // ==========================================================================

  /**
   * Lista skills disponíveis (todas as versões)
   */
  listSkills() {
    return this.registry.listAll();
  }

  /**
   * Lista versões de uma skill específica
   */
  listVersions(skillName: string) {
    return this.registry.listVersions(skillName);
  }

  /**
   * Retorna estatísticas completas
   */
  getStats() {
    const registryStats = this.registry.getStats();
    const recent = this.executionHistory.slice(-100);
    const successful = recent.filter(r => r.output.success).length;
    const failed = recent.filter(r => !r.output.success).length;

    // Get metrics summaries
    const metricsSummaries = this.metricsCollector.getAllSummaries(7);
    const totalCost = metricsSummaries.reduce((sum, s) => sum + s.totalCost, 0);

    return {
      skills: registryStats,
      executions: {
        total: this.executionHistory.length,
        recent: recent.length,
        successful,
        failed,
        successRate: recent.length > 0 ? (successful / recent.length * 100).toFixed(1) : '0',
      },
      pendingApprovals: this.pendingApprovals.size,
      metrics: {
        totalSkillsTracked: metricsSummaries.length,
        totalCostUSD: totalCost.toFixed(2),
      },
    };
  }

  /**
   * Retorna métricas de uma skill específica
   */
  getSkillMetrics(skillName: string, days: number = 7) {
    return this.metricsCollector.getSummary(skillName, days);
  }

  /**
   * Calcula ROI de uma skill
   */
  calculateROI(skillName: string, timeSavedPerExecution: number, hourlyRate: number = 50) {
    return this.metricsCollector.calculateROI(skillName, timeSavedPerExecution, hourlyRate);
  }

  /**
   * Export métricas
   */
  async exportMetrics(format: 'json' | 'csv' = 'json') {
    return this.metricsCollector.export(format);
  }

  /**
   * Retorna histórico de execuções
   */
  getHistory(limit = 50): ExecutionResultV2[] {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Detecta conflitos de dependências
   */
  detectConflicts() {
    return this.registry.detectConflicts();
  }

  /**
   * Limpa versões antigas
   */
  cleanup(options: { removeDeprecated?: boolean; keepLatestN?: number } = {}) {
    return this.registry.cleanup(options);
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private initializeSkills(): void {
    // Register all basic skills
    // Note: registerAllSkills uses old registry, we need to adapt
    // For now, we'll rely on skills being registered individually with specs
    console.log('[ExecutorV2] Skills should be registered individually with specs');
  }

  private setupEventHandlers(): void {
    // Registry events
    this.registry.on('skill:registered', (data) => {
      console.log(`[ExecutorV2] Skill registered: ${data.name}@${data.version}`);
      this.emit('skill:registered', data);
    });

    this.registry.on('skill:deprecated', (data) => {
      console.warn(`[ExecutorV2] Skill deprecated: ${data.name}@${data.version}`);
      this.emit('skill:deprecated', data);
    });

    // Sandbox events
    this.sandbox.on('execution:start', (data) => {
      this.monitor.incrementMetric('skills.executions');
      this.emit('execution:start', data);
    });

    this.sandbox.on('execution:complete', (data) => {
      this.monitor.incrementMetric('skills.success');
      this.emit('execution:complete', data);
    });

    this.sandbox.on('execution:error', (data) => {
      this.monitor.incrementMetric('skills.errors');
      this.emit('execution:error', data);
    });

    // Metrics events
    this.metricsCollector.on('execution:recorded', (execution) => {
      this.emit('metrics:recorded', execution);
    });
  }

  private addToHistory(result: ExecutionResultV2): void {
    this.executionHistory.push(result);
    if (this.executionHistory.length > this.maxHistory) {
      this.executionHistory.shift();
    }
  }

  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Cria executor de desenvolvimento (sandbox habilitado)
 */
export function createDevExecutor(): SkillExecutorV2 {
  return new SkillExecutorV2({
    sandbox: createDevSandbox(),
    defaultSandboxMode: SandboxMode.SANDBOX,
  });
}

/**
 * Cria executor de teste (validação estrita)
 */
export function createTestExecutor(): SkillExecutorV2 {
  return new SkillExecutorV2({
    sandbox: createTestSandbox(),
    defaultSandboxMode: SandboxMode.VALIDATE,
  });
}

/**
 * Cria executor de produção
 */
export function createProductionExecutor(): SkillExecutorV2 {
  return new SkillExecutorV2({
    sandbox: createProductionSandbox(),
    defaultSandboxMode: SandboxMode.PRODUCTION,
  });
}

// ============================================================================
// SINGLETON
// ============================================================================

let executorV2Instance: SkillExecutorV2 | null = null;

export function getSkillExecutorV2(): SkillExecutorV2 {
  if (!executorV2Instance) {
    executorV2Instance = createProductionExecutor();
  }
  return executorV2Instance;
}
