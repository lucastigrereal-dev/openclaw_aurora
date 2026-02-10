/**
 * Skill Executor - OpenClaw Aurora
 * Executa skills com proteção do Aurora Monitor
 */

import { EventEmitter } from 'events';
import {
  getSkillRegistry,
  SkillRegistry,
  SkillInput,
  SkillOutput,
  registerAllSkills,
} from './skills/index';
import {
  AuroraMonitor,
  getAuroraMonitor,
  wrapWithCircuitBreaker,
} from './aurora-openclaw-integration';

// ============================================================================
// TIPOS
// ============================================================================

export interface ExecutionRequest {
  id: string;
  skill: string;
  input: SkillInput;
  userId?: string;
  chatId?: string;
  timestamp: number;
  requiresApproval?: boolean;
}

export interface ExecutionResult {
  id: string;
  skill: string;
  output: SkillOutput;
  startTime: number;
  endTime: number;
  duration: number;
  approved?: boolean;
}

export interface PendingApproval {
  request: ExecutionRequest;
  resolver: (approved: boolean) => void;
  timeout: NodeJS.Timeout;
}

// ============================================================================
// SKILL EXECUTOR
// ============================================================================

export class SkillExecutor extends EventEmitter {
  private registry: SkillRegistry;
  private monitor: AuroraMonitor;
  private executionHistory: ExecutionResult[] = [];
  private pendingApprovals: Map<string, PendingApproval> = new Map();
  private maxHistory = 1000;
  private approvalTimeout = 60000; // 1 minuto para aprovar

  constructor(registry?: SkillRegistry, monitor?: AuroraMonitor) {
    super();
    this.registry = registry || getSkillRegistry();
    this.monitor = monitor || getAuroraMonitor();

    // Registra todas as skills
    registerAllSkills(this.registry);

    // Conecta eventos do registry ao monitor
    this.registry.on('skill:start', (data) => {
      this.monitor.incrementMetric('skills.executions');
      this.emit('execution:start', data);
    });

    this.registry.on('skill:complete', (data) => {
      this.monitor.incrementMetric('skills.success');
      this.monitor.recordMetric(`skill.${data.skill}.latency`, data.result.duration || 0);
      this.emit('execution:complete', data);
    });

    this.registry.on('skill:error', (data) => {
      this.monitor.incrementMetric('skills.errors');
      this.emit('execution:error', data);
    });

    console.log('[Executor] Initialized with Aurora Monitor protection');
  }

  /**
   * Executa uma skill com proteção
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    const skill = this.registry.get(request.skill);

    if (!skill) {
      const result: ExecutionResult = {
        id: request.id,
        skill: request.skill,
        output: { success: false, error: `Skill not found: ${request.skill}` },
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
      };
      this.addToHistory(result);
      return result;
    }

    // Verifica se requer aprovação
    if (skill.config.requiresApproval || request.requiresApproval) {
      const approved = await this.waitForApproval(request);
      if (!approved) {
        const result: ExecutionResult = {
          id: request.id,
          skill: request.skill,
          output: { success: false, error: 'Execution not approved' },
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          approved: false,
        };
        this.addToHistory(result);
        return result;
      }
    }

    // Usa Circuit Breaker para skills de AI
    let output: SkillOutput;

    if (skill.metadata.category === 'AI') {
      // Protege chamadas de IA com Circuit Breaker
      const protectedExecute = wrapWithCircuitBreaker(
        this.monitor,
        request.skill,
        () => skill.run(request.input)
      );
      output = await protectedExecute();
    } else {
      output = await skill.run(request.input);
    }

    const result: ExecutionResult = {
      id: request.id,
      skill: request.skill,
      output,
      startTime,
      endTime: Date.now(),
      duration: Date.now() - startTime,
      approved: true,
    };

    this.addToHistory(result);
    return result;
  }

  /**
   * Execução simplificada
   */
  async run(skill: string, input: SkillInput): Promise<SkillOutput> {
    const request: ExecutionRequest = {
      id: this.generateId(),
      skill,
      input,
      timestamp: Date.now(),
    };
    const result = await this.execute(request);
    return result.output;
  }

  /**
   * Aguarda aprovação do usuário
   */
  private waitForApproval(request: ExecutionRequest): Promise<boolean> {
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

  /**
   * Aprova uma execução pendente
   */
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

  /**
   * Rejeita uma execução pendente
   */
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

  /**
   * Lista skills disponíveis
   */
  listSkills() {
    return this.registry.listAll();
  }

  /**
   * Retorna estatísticas
   */
  getStats() {
    const registryStats = this.registry.getStats();
    const recent = this.executionHistory.slice(-100);
    const successful = recent.filter(r => r.output.success).length;
    const failed = recent.filter(r => !r.output.success).length;

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
    };
  }

  /**
   * Retorna histórico de execuções
   */
  getHistory(limit = 50): ExecutionResult[] {
    return this.executionHistory.slice(-limit);
  }

  private addToHistory(result: ExecutionResult): void {
    this.executionHistory.push(result);
    if (this.executionHistory.length > this.maxHistory) {
      this.executionHistory.shift();
    }
  }

  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

// Singleton
let executorInstance: SkillExecutor | null = null;

export function getSkillExecutor(): SkillExecutor {
  if (!executorInstance) {
    executorInstance = new SkillExecutor();
  }
  return executorInstance;
}
