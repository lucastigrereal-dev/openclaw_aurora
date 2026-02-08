/**
 * ══════════════════════════════════════════════════════════════════════════════
 * AURORA ADAPTER - Ponte entre Aurora Monitor existente e o novo contrato
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este adapter permite usar o Aurora Monitor existente (OpenClawIntegration)
 * através da nova interface IAurora definida nos contratos.
 *
 * COMO FUNCIONA:
 * 1. Encapsula OpenClawIntegration existente
 * 2. Implementa interface IAurora do contrato
 * 3. Adiciona lógica de autorização que não existia antes
 */

import {
  IAurora,
  AuthorizationRequest,
  AuthorizationResponse,
  MetricThresholds,
  SystemMetrics,
  AuroraEvent,
  AuroraEventHandler,
  HealthLevel,
  CircuitState,
  AnomalyType,
  DEFAULT_THRESHOLDS,
  riskScoreToLevel,
  levelToDecision,
} from '../core/contracts/aurora.contract';
import { generateId, RiskLevel, TrafficLight } from '../core/contracts/types';

// Import do Aurora Monitor existente
import {
  OpenClawIntegration,
  createOpenClawIntegration,
  CircuitBreakerManager,
  circuitBreakerManager,
  RateLimiterManager,
  rateLimiterManager,
} from '../aurora-monitor-ts/src';

// ════════════════════════════════════════════════════════════════════════════
// AURORA ADAPTER
// ════════════════════════════════════════════════════════════════════════════

export class AuroraAdapter implements IAurora {
  private integration: OpenClawIntegration;
  private circuitBreakers: CircuitBreakerManager;
  private rateLimiters: RateLimiterManager;
  private thresholds: MetricThresholds;
  private eventHandlers: Set<AuroraEventHandler> = new Set();
  private checkpoints: Map<string, Record<string, any>> = new Map();
  private activeMonitoring: Set<string> = new Set();

  constructor(integration?: OpenClawIntegration) {
    this.integration = integration || createOpenClawIntegration();
    this.circuitBreakers = circuitBreakerManager;
    this.rateLimiters = rateLimiterManager;
    this.thresholds = { ...DEFAULT_THRESHOLDS };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AUTORIZAÇÃO
  // ──────────────────────────────────────────────────────────────────────────

  async authorize(request: AuthorizationRequest): Promise<AuthorizationResponse> {
    const startTime = Date.now();

    // 1. Calcular score de risco
    const riskScore = this.calculateRiskScore(request);
    const level = riskScoreToLevel(riskScore);
    const decision = levelToDecision(level);

    // 2. Verificar rate limits
    const rateLimitOk = await this.checkRateLimit(request.origin, 'authorize');
    if (!rateLimitOk) {
      return this.createResponse(request.request_id, 'blocked', 100, 'red', 'Rate limit exceeded');
    }

    // 3. Verificar circuit breakers
    for (const api of request.resources.external_apis) {
      const circuitState = await this.getCircuitState(api);
      if (circuitState === 'open') {
        return this.createResponse(
          request.request_id,
          'blocked',
          90,
          'red',
          `Circuit breaker open for: ${api}`
        );
      }
    }

    // 4. Verificar padrões destrutivos
    const destructiveCheck = this.checkDestructivePatterns(request);
    if (destructiveCheck.blocked) {
      return this.createResponse(
        request.request_id,
        'blocked',
        95,
        'red',
        destructiveCheck.reason!,
        destructiveCheck.factors
      );
    }

    // 5. Verificar se precisa confirmação
    if (decision === 'requires_confirmation') {
      return this.createResponse(
        request.request_id,
        'requires_confirmation',
        riskScore,
        level,
        'Human confirmation required',
        undefined,
        this.generateConfirmationPrompt(request)
      );
    }

    // 6. Aplicar limites se necessário
    const imposedLimits = decision === 'limited' ? this.calculateImposedLimits(request) : undefined;

    return this.createResponse(
      request.request_id,
      decision,
      riskScore,
      level,
      'Authorized',
      undefined,
      undefined,
      imposedLimits
    );
  }

  async confirmAuthorization(request_id: string, approved: boolean): Promise<AuthorizationResponse> {
    if (approved) {
      return this.createResponse(request_id, 'allowed', 50, 'yellow', 'Confirmed by human');
    }
    return this.createResponse(request_id, 'blocked', 100, 'red', 'Rejected by human');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MONITORAMENTO
  // ──────────────────────────────────────────────────────────────────────────

  async startMonitoring(plan_id: string): Promise<void> {
    this.activeMonitoring.add(plan_id);
    this.emitEvent({
      type: 'HEALTH',
      status: 'healthy',
      metrics: await this.getMetrics(),
      message: `Started monitoring plan ${plan_id}`,
    });
  }

  async stopMonitoring(plan_id: string): Promise<void> {
    this.activeMonitoring.delete(plan_id);
  }

  async reportStepProgress(
    plan_id: string,
    step_id: string,
    status: 'started' | 'completed' | 'failed',
    details?: Record<string, any>
  ): Promise<void> {
    // Emit event for failed steps
    if (status === 'failed') {
      this.emitEvent({
        type: 'ANOMALY',
        anomaly_type: 'rate_exceeded', // Using valid AnomalyType
        severity: 'medium',
        details: { plan_id, step_id, ...details },
        recommended_action: 'alert',
      });
    }
  }

  async getMetrics(): Promise<SystemMetrics> {
    // Simple in-memory metrics without external collector
    return {
      timestamp: new Date(),
      cpu_percent: 0,
      memory_percent: 0,
      memory_bytes: 0,
      disk_percent: 0,
      disk_free_bytes: 0,
      active_executions: this.activeMonitoring.size,
      queued_executions: 0,
      errors_last_minute: 0,
      success_rate_last_minute: 100,
      avg_execution_time_ms: 0,
      requests_last_second: 0,
      requests_last_minute: 0,
      channel_latencies: {},
      channel_statuses: {},
    };
  }

  async getHealthStatus(): Promise<HealthLevel> {
    const metrics = await this.getMetrics();

    if (metrics.cpu_percent > this.thresholds.cpu.critical) return 'critical';
    if (metrics.memory_percent > this.thresholds.memory.critical) return 'critical';
    if (metrics.cpu_percent > this.thresholds.cpu.warning) return 'degraded';
    if (metrics.memory_percent > this.thresholds.memory.warning) return 'degraded';

    return 'healthy';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PROTEÇÃO
  // ──────────────────────────────────────────────────────────────────────────

  async checkRateLimit(origin: string, action: string): Promise<boolean> {
    try {
      const limiter = this.rateLimiters.get(origin) || this.rateLimiters.get('default');
      if (!limiter) return true;

      // Use acquire() method - returns true if token acquired
      return limiter.acquire();
    } catch {
      return true; // Fail open
    }
  }

  async getCircuitState(target: string): Promise<CircuitState> {
    const breaker = this.circuitBreakers.get(target);
    if (!breaker) return 'closed';

    const state = breaker.getState();
    switch (state) {
      case 'OPEN':
        return 'open';
      case 'HALF_OPEN':
        return 'half-open';
      default:
        return 'closed';
    }
  }

  async openCircuit(target: string, reason: string): Promise<void> {
    // Note: CircuitBreaker opens automatically after failures via onFailure()
    // We emit the event but can't force-open from outside

    this.emitEvent({
      type: 'CIRCUIT_BREAKER',
      state: 'open',
      target,
      reason,
      retry_after_ms: 30000,
    });
  }

  async attemptCircuitClose(target: string): Promise<boolean> {
    const breaker = this.circuitBreakers.get(target);
    if (!breaker) return true;

    try {
      return breaker.getState() !== 'OPEN';
    } catch {
      return false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RECOVERY
  // ──────────────────────────────────────────────────────────────────────────

  async createCheckpoint(plan_id: string, state: Record<string, any>): Promise<string> {
    const checkpoint_id = generateId('chk');
    this.checkpoints.set(checkpoint_id, {
      plan_id,
      state,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    });
    return checkpoint_id;
  }

  async getCheckpoint(checkpoint_id: string): Promise<Record<string, any> | null> {
    const checkpoint = this.checkpoints.get(checkpoint_id);
    if (!checkpoint) return null;
    if (new Date() > checkpoint.expires_at) {
      this.checkpoints.delete(checkpoint_id);
      return null;
    }
    return checkpoint.state;
  }

  async attemptAutoHeal(anomaly: AnomalyType, target: string): Promise<boolean> {
    this.emitEvent({
      type: 'AUTO_HEAL',
      action: 'restart',
      target,
      success: true,
      details: `Auto-heal attempted for ${anomaly} on ${target}`,
    });

    // Por enquanto, só logamos - implementação real dependeria do target
    console.log(`[Aurora] Auto-heal: ${anomaly} on ${target}`);
    return true;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CONFIGURAÇÃO
  // ──────────────────────────────────────────────────────────────────────────

  async getThresholds(): Promise<MetricThresholds> {
    return this.thresholds;
  }

  async updateThresholds(updates: Partial<MetricThresholds>): Promise<void> {
    this.thresholds = { ...this.thresholds, ...updates };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EVENTOS
  // ──────────────────────────────────────────────────────────────────────────

  onEvent(handler: AuroraEventHandler): void {
    this.eventHandlers.add(handler);
  }

  offEvent(handler: AuroraEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  private emitEvent(event: AuroraEvent): void {
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('[Aurora] Event handler error:', error);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ──────────────────────────────────────────────────────────────────────────

  private calculateRiskScore(request: AuthorizationRequest): number {
    let score = 0;

    // Risco base por nível
    const baseRisk: Record<RiskLevel, number> = {
      low: 10,
      medium: 40,
      high: 70,
      critical: 90,
    };
    score += baseRisk[request.risk_level];

    // Ajustes por recursos
    if (request.resources.files_delete.length > 0) score += 20;
    if (request.resources.files_write.length > 50) score += 15;
    if (request.resources.databases.length > 0) score += 10;
    if (request.resources.external_apis.length > 5) score += 10;

    // Ajuste por permissões perigosas
    const dangerousPerms = ['database:admin', 'system:admin', 'git:force', 'credentials:write'];
    const hasDangerous = request.permissions_required.some((p) => dangerousPerms.includes(p));
    if (hasDangerous) score += 20;

    // Modo dry-run reduz risco
    if (request.mode === 'dry-run') score = Math.floor(score * 0.5);

    return Math.min(100, Math.max(0, score));
  }

  private checkDestructivePatterns(
    request: AuthorizationRequest
  ): { blocked: boolean; reason?: string; factors?: any[] } {
    const patterns = this.thresholds.security.destructive_patterns;

    // Verifica nos steps do plano
    for (const step of request.plan.steps) {
      const stepStr = JSON.stringify(step.params).toLowerCase();
      for (const pattern of patterns) {
        if (stepStr.includes(pattern.toLowerCase())) {
          return {
            blocked: true,
            reason: `Destructive pattern detected: ${pattern}`,
            factors: [{ name: 'destructive_command', contribution: 100, description: pattern, mitigatable: false }],
          };
        }
      }
    }

    // Verifica arquivos sensíveis
    const sensitivePatterns = this.thresholds.security.sensitive_file_patterns;
    for (const file of [...request.resources.files_write, ...request.resources.files_delete]) {
      for (const pattern of sensitivePatterns) {
        if (file.includes(pattern.replace('*', ''))) {
          return {
            blocked: true,
            reason: `Sensitive file access: ${file}`,
            factors: [{ name: 'sensitive_file', contribution: 80, description: file, mitigatable: true }],
          };
        }
      }
    }

    // Verifica mudança em massa
    const totalChanges =
      request.resources.files_write.length + request.resources.files_delete.length;
    if (totalChanges > this.thresholds.security.max_files_before_confirmation) {
      return {
        blocked: false, // Não bloqueia, mas vai pedir confirmação
        reason: `Mass file change: ${totalChanges} files`,
      };
    }

    return { blocked: false };
  }

  private generateConfirmationPrompt(request: AuthorizationRequest): string {
    const lines = [
      `⚠️ Confirmação necessária para execução`,
      ``,
      `📋 Plano: ${request.plan_id}`,
      `📍 Origem: ${request.origin}`,
      `⚡ Risco: ${request.risk_level.toUpperCase()}`,
      ``,
      `📁 Arquivos a modificar: ${request.resources.files_write.length}`,
      `🗑️ Arquivos a deletar: ${request.resources.files_delete.length}`,
      `🌐 APIs externas: ${request.resources.external_apis.length}`,
      ``,
      `Deseja continuar?`,
    ];
    return lines.join('\n');
  }

  private calculateImposedLimits(request: AuthorizationRequest): any {
    return {
      max_duration_ms: Math.min(request.suggested_limits.max_duration_ms, 60000),
      max_retries_per_step: Math.min(request.suggested_limits.max_retries_per_step, 2),
      actions_per_second: Math.min(request.suggested_limits.actions_per_second, 5),
    };
  }

  private createResponse(
    request_id: string,
    decision: any,
    riskScore: number,
    level: TrafficLight,
    reason: string,
    factors?: any[],
    confirmationPrompt?: string,
    imposedLimits?: any
  ): AuthorizationResponse {
    return {
      request_id,
      decision,
      risk_score: riskScore,
      level,
      imposed_limits: imposedLimits,
      confirmation_prompt: confirmationPrompt,
      reason,
      message: reason,
      risk_factors: factors,
      valid_for_ms: 60000,
      timestamp: new Date(),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

let auroraInstance: AuroraAdapter | null = null;

export function getAuroraAdapter(): AuroraAdapter {
  if (!auroraInstance) {
    auroraInstance = new AuroraAdapter();
  }
  return auroraInstance;
}

export function createAuroraAdapter(integration?: OpenClawIntegration): AuroraAdapter {
  return new AuroraAdapter(integration);
}
