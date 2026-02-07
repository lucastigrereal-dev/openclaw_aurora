/**
 * ══════════════════════════════════════════════════════════════════════════════
 * AURORA CONTRACT - O Guardião do OpenClaw
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este contrato define COMO a Aurora funciona.
 *
 * RESPONSABILIDADES DA AURORA:
 * ✅ Autorizar ou bloquear planos de execução
 * ✅ Monitorar métricas do sistema em tempo real
 * ✅ Detectar anomalias (loops, vazamentos, overload)
 * ✅ Aplicar limites (rate limit, circuit breaker)
 * ✅ Alertar humanos quando necessário
 * ✅ Auto-heal quando possível
 * ✅ Criar checkpoints para recovery
 *
 * O QUE A AURORA NÃO FAZ:
 * ❌ Executar skills ou hubs
 * ❌ Tomar decisões de negócio
 * ❌ Planejar execuções
 * ❌ Ignorar o Operator
 */

import {
  ExecutionPlan,
  ExecutionLimits,
  RiskLevel,
  Permission,
  ResourceManifest,
  ExecutionStep,
} from './operator.contract';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS BASE
// ════════════════════════════════════════════════════════════════════════════

/** Nível de saúde do sistema */
export type HealthLevel = 'healthy' | 'degraded' | 'critical' | 'down';

/** Nível de alerta */
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

/** Decisão da Aurora */
export type AuthorizationDecision = 'allowed' | 'limited' | 'requires_confirmation' | 'blocked';

/** Status do circuit breaker */
export type CircuitState = 'closed' | 'half-open' | 'open';

/** Tipo de anomalia detectada */
export type AnomalyType =
  | 'loop'
  | 'memory_leak'
  | 'cpu_spike'
  | 'disk_full'
  | 'rate_exceeded'
  | 'error_burst'
  | 'timeout_cascade'
  | 'deadlock'
  | 'unauthorized_access'
  | 'suspicious_pattern';

// ════════════════════════════════════════════════════════════════════════════
// PEDIDO DE AUTORIZAÇÃO (Operator → Aurora)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Pedido de autorização que o Operator envia para Aurora.
 * Isso acontece ANTES de qualquer execução.
 */
export interface AuthorizationRequest {
  /** ID único do pedido */
  request_id: string;

  /** ID do plano de execução */
  plan_id: string;

  /** ID da intenção original */
  intent_id: string;

  /** De onde veio o pedido */
  origin: 'cockpit' | 'telegram' | 'api' | 'websocket' | 'internal' | 'cli';

  /** Usuário que pediu */
  user_id?: string;

  /** Plano completo de execução */
  plan: ExecutionPlan;

  /** Recursos que serão tocados */
  resources: ResourceManifest;

  /** Nível de risco calculado pelo Operator */
  risk_level: RiskLevel;

  /** Permissões necessárias */
  permissions_required: Permission[];

  /** Limites sugeridos pelo Operator */
  suggested_limits: ExecutionLimits;

  /** Modo de execução */
  mode: 'dry-run' | 'real';

  /** Contexto extra */
  context?: Record<string, any>;

  /** Quando foi criado */
  timestamp: Date;
}

// ════════════════════════════════════════════════════════════════════════════
// RESPOSTA DA AURORA (Aurora → Operator)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Resposta da Aurora ao pedido de autorização.
 */
export interface AuthorizationResponse {
  /** ID do pedido original */
  request_id: string;

  /** Decisão tomada */
  decision: AuthorizationDecision;

  /** Score de risco calculado (0-100) */
  risk_score: number;

  /** Nível de semáforo */
  level: 'green' | 'yellow' | 'orange' | 'red';

  /** Se permitido, quais limites foram impostos */
  imposed_limits?: ExecutionLimits;

  /** Regras adicionais que devem ser seguidas */
  rules?: AuthorizationRule[];

  /** Se requer confirmação, mensagem para o humano */
  confirmation_prompt?: string;

  /** Motivo da decisão (técnico) */
  reason: string;

  /** Mensagem legível para humanos */
  message: string;

  /** Fatores que influenciaram a decisão */
  risk_factors?: RiskFactor[];

  /** Tempo de validade da autorização (ms) */
  valid_for_ms: number;

  /** Quando a resposta foi gerada */
  timestamp: Date;
}

/**
 * Regra que deve ser seguida durante a execução
 */
export interface AuthorizationRule {
  /** Tipo da regra */
  type: 'must' | 'must_not' | 'prefer' | 'avoid';

  /** Categoria */
  category: 'file' | 'network' | 'process' | 'database' | 'git' | 'system' | 'general';

  /** Descrição da regra */
  description: string;

  /** Padrão para match (regex ou glob) */
  pattern?: string;

  /** Nível de enforcement */
  enforcement: 'strict' | 'soft';
}

/**
 * Fator que contribuiu para o score de risco
 */
export interface RiskFactor {
  /** Nome do fator */
  name: string;

  /** Contribuição para o score (0-100) */
  contribution: number;

  /** Descrição */
  description: string;

  /** Pode ser mitigado? */
  mitigatable: boolean;

  /** Como mitigar */
  mitigation?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// MÉTRICAS E THRESHOLDS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Configuração de thresholds para cada métrica
 */
export interface MetricThresholds {
  // ─────────────────────────────────────────────────────────────────────────
  // Saúde do Processo
  // ─────────────────────────────────────────────────────────────────────────

  cpu: {
    /** % de CPU que dispara alerta amarelo */
    warning: number; // default: 80
    /** % de CPU que dispara alerta vermelho */
    critical: number; // default: 90
    /** Segundos que precisa ficar acima para disparar */
    duration_seconds: number; // default: 120
  };

  memory: {
    /** % de RAM que dispara alerta amarelo */
    warning: number; // default: 85
    /** % de RAM que dispara alerta vermelho */
    critical: number; // default: 95
    /** % de crescimento em X segundos que indica leak */
    growth_rate_warning: number; // default: 10 (% em 180s)
    growth_rate_critical: number; // default: 20
    growth_window_seconds: number; // default: 180
  };

  disk: {
    /** % de disco que dispara alerta amarelo */
    warning: number; // default: 85
    /** % de disco que dispara alerta vermelho */
    critical: number; // default: 95
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Saúde de Execução
  // ─────────────────────────────────────────────────────────────────────────

  execution: {
    /** Multiplicador do tempo esperado que dispara alerta */
    time_warning_multiplier: number; // default: 3
    /** Multiplicador que dispara corte */
    time_critical_multiplier: number; // default: 5

    /** Erros por minuto que dispara alerta */
    errors_per_minute_warning: number; // default: 5
    /** Erros por minuto que dispara corte */
    errors_per_minute_critical: number; // default: 10

    /** Repetições da mesma ação que indica loop (alerta) */
    loop_detection_warning: number; // default: 10
    /** Repetições que confirma loop (corte) */
    loop_detection_critical: number; // default: 20

    /** Taxa de sucesso mínima (%) antes de alertar */
    success_rate_warning: number; // default: 80
    /** Taxa de sucesso mínima (%) antes de cortar */
    success_rate_critical: number; // default: 50
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Segurança
  // ─────────────────────────────────────────────────────────────────────────

  security: {
    /** Número de arquivos alterados que requer confirmação */
    max_files_before_confirmation: number; // default: 200

    /** Padrões de comandos destrutivos (sempre bloqueiam) */
    destructive_patterns: string[]; // default: ['rm -rf', 'DROP TABLE', 'DELETE FROM', 'format']

    /** Arquivos sensíveis que sempre alertam */
    sensitive_file_patterns: string[]; // default: ['.env', 'credentials', 'secrets', 'private']

    /** Operações que requerem confirmação em produção */
    production_confirmation_required: string[]; // default: ['deploy', 'migrate', 'push --force']
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Rate Limiting
  // ─────────────────────────────────────────────────────────────────────────

  rate_limits: {
    /** Requisições por segundo por origem */
    requests_per_second: number; // default: 10
    /** Burst máximo */
    burst_size: number; // default: 50
    /** Ações internas por segundo */
    internal_actions_per_second: number; // default: 100
  };
}

/**
 * Métricas coletadas em tempo real
 */
export interface SystemMetrics {
  /** Timestamp da coleta */
  timestamp: Date;

  // Processo
  cpu_percent: number;
  memory_percent: number;
  memory_bytes: number;
  disk_percent: number;
  disk_free_bytes: number;

  // Execução
  active_executions: number;
  queued_executions: number;
  errors_last_minute: number;
  success_rate_last_minute: number;
  avg_execution_time_ms: number;

  // Rate
  requests_last_second: number;
  requests_last_minute: number;

  // Canais
  channel_latencies: Record<string, number>;
  channel_statuses: Record<string, 'up' | 'degraded' | 'down'>;
}

// ════════════════════════════════════════════════════════════════════════════
// EVENTOS DA AURORA (Aurora → Operator)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Eventos que a Aurora emite durante a execução.
 * O Operator DEVE reagir a esses eventos.
 */
export type AuroraEvent =
  // ─────────────────────────────────────────────────────────────────────────
  // Status de saúde
  // ─────────────────────────────────────────────────────────────────────────
  | {
      type: 'HEALTH';
      status: HealthLevel;
      metrics: SystemMetrics;
      message: string;
    }

  // ─────────────────────────────────────────────────────────────────────────
  // Alertas
  // ─────────────────────────────────────────────────────────────────────────
  | {
      type: 'ALERT';
      level: AlertLevel;
      metric: string;
      current_value: number;
      threshold: number;
      message: string;
    }

  // ─────────────────────────────────────────────────────────────────────────
  // Limites aplicados
  // ─────────────────────────────────────────────────────────────────────────
  | {
      type: 'LIMIT';
      action: 'rate_limited' | 'throttled' | 'reduced';
      reason: string;
      new_limits: Partial<ExecutionLimits>;
    }

  // ─────────────────────────────────────────────────────────────────────────
  // Pausa (requer ação humana ou timeout)
  // ─────────────────────────────────────────────────────────────────────────
  | {
      type: 'PAUSE';
      plan_id: string;
      reason: string;
      awaiting: 'human_confirmation' | 'timeout' | 'cooldown';
      timeout_ms?: number;
      confirmation_prompt?: string;
    }

  // ─────────────────────────────────────────────────────────────────────────
  // Corte (execução interrompida)
  // ─────────────────────────────────────────────────────────────────────────
  | {
      type: 'CUT';
      plan_id: string;
      step_id?: string;
      reason: string;
      anomaly?: AnomalyType;
      checkpoint_id: string;
      can_resume: boolean;
      can_rollback: boolean;
    }

  // ─────────────────────────────────────────────────────────────────────────
  // Retomada
  // ─────────────────────────────────────────────────────────────────────────
  | {
      type: 'RESUME';
      plan_id: string;
      from_checkpoint: string;
      with_limits?: Partial<ExecutionLimits>;
    }

  // ─────────────────────────────────────────────────────────────────────────
  // Circuit Breaker
  // ─────────────────────────────────────────────────────────────────────────
  | {
      type: 'CIRCUIT_BREAKER';
      state: CircuitState;
      target: string;
      reason: string;
      retry_after_ms?: number;
    }

  // ─────────────────────────────────────────────────────────────────────────
  // Anomalia detectada
  // ─────────────────────────────────────────────────────────────────────────
  | {
      type: 'ANOMALY';
      anomaly_type: AnomalyType;
      severity: 'low' | 'medium' | 'high' | 'critical';
      details: Record<string, any>;
      recommended_action: 'monitor' | 'alert' | 'pause' | 'cut';
    }

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-heal
  // ─────────────────────────────────────────────────────────────────────────
  | {
      type: 'AUTO_HEAL';
      action: string;
      target: string;
      success: boolean;
      details?: string;
    };

export type AuroraEventHandler = (event: AuroraEvent) => void | Promise<void>;

// ════════════════════════════════════════════════════════════════════════════
// INTERFACE DA AURORA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Interface principal da Aurora.
 * Qualquer implementação da Aurora DEVE seguir este contrato.
 */
export interface IAurora {
  // ─────────────────────────────────────────────────────────────────────────
  // Autorização
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Avalia um pedido de autorização.
   * Chamado pelo Operator ANTES de executar qualquer plano.
   */
  authorize(request: AuthorizationRequest): Promise<AuthorizationResponse>;

  /**
   * Confirma uma autorização que estava pendente.
   * Chamado quando humano aprova uma execução.
   */
  confirmAuthorization(request_id: string, approved: boolean): Promise<AuthorizationResponse>;

  // ─────────────────────────────────────────────────────────────────────────
  // Monitoramento
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Inicia monitoramento de uma execução.
   */
  startMonitoring(plan_id: string): Promise<void>;

  /**
   * Para monitoramento de uma execução.
   */
  stopMonitoring(plan_id: string): Promise<void>;

  /**
   * Reporta progresso de um step (chamado pelo Operator durante execução).
   */
  reportStepProgress(
    plan_id: string,
    step_id: string,
    status: 'started' | 'completed' | 'failed',
    details?: Record<string, any>
  ): Promise<void>;

  /**
   * Obtém métricas atuais do sistema.
   */
  getMetrics(): Promise<SystemMetrics>;

  /**
   * Obtém status de saúde do sistema.
   */
  getHealthStatus(): Promise<HealthLevel>;

  // ─────────────────────────────────────────────────────────────────────────
  // Proteção
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifica se rate limit permite a ação.
   */
  checkRateLimit(origin: string, action: string): Promise<boolean>;

  /**
   * Obtém estado do circuit breaker para um target.
   */
  getCircuitState(target: string): Promise<CircuitState>;

  /**
   * Força abertura do circuit breaker.
   */
  openCircuit(target: string, reason: string): Promise<void>;

  /**
   * Tenta fechar o circuit breaker (half-open).
   */
  attemptCircuitClose(target: string): Promise<boolean>;

  // ─────────────────────────────────────────────────────────────────────────
  // Recovery
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Cria um checkpoint.
   */
  createCheckpoint(plan_id: string, state: Record<string, any>): Promise<string>;

  /**
   * Obtém um checkpoint.
   */
  getCheckpoint(checkpoint_id: string): Promise<Record<string, any> | null>;

  /**
   * Tenta auto-heal de um problema.
   */
  attemptAutoHeal(anomaly: AnomalyType, target: string): Promise<boolean>;

  // ─────────────────────────────────────────────────────────────────────────
  // Configuração
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Obtém thresholds atuais.
   */
  getThresholds(): Promise<MetricThresholds>;

  /**
   * Atualiza thresholds.
   */
  updateThresholds(updates: Partial<MetricThresholds>): Promise<void>;

  // ─────────────────────────────────────────────────────────────────────────
  // Eventos
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Registra handler para eventos da Aurora.
   */
  onEvent(handler: AuroraEventHandler): void;

  /**
   * Remove handler de eventos.
   */
  offEvent(handler: AuroraEventHandler): void;
}

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO PADRÃO
// ════════════════════════════════════════════════════════════════════════════

/**
 * Thresholds padrão recomendados
 */
export const DEFAULT_THRESHOLDS: MetricThresholds = {
  cpu: {
    warning: 80,
    critical: 90,
    duration_seconds: 120,
  },
  memory: {
    warning: 85,
    critical: 95,
    growth_rate_warning: 10,
    growth_rate_critical: 20,
    growth_window_seconds: 180,
  },
  disk: {
    warning: 85,
    critical: 95,
  },
  execution: {
    time_warning_multiplier: 3,
    time_critical_multiplier: 5,
    errors_per_minute_warning: 5,
    errors_per_minute_critical: 10,
    loop_detection_warning: 10,
    loop_detection_critical: 20,
    success_rate_warning: 80,
    success_rate_critical: 50,
  },
  security: {
    max_files_before_confirmation: 200,
    destructive_patterns: [
      'rm -rf',
      'rmdir /s',
      'del /f /s',
      'DROP TABLE',
      'DROP DATABASE',
      'DELETE FROM',
      'TRUNCATE',
      'format',
      'mkfs',
      '--force',
      '--hard',
    ],
    sensitive_file_patterns: [
      '.env',
      '.env.*',
      'credentials',
      'secrets',
      'private',
      '*.pem',
      '*.key',
      '*password*',
      '*token*',
      '*api_key*',
    ],
    production_confirmation_required: [
      'deploy',
      'migrate',
      'push --force',
      'push -f',
      'reset --hard',
      'rebase',
    ],
  },
  rate_limits: {
    requests_per_second: 10,
    burst_size: 50,
    internal_actions_per_second: 100,
  },
};

/**
 * Mapeamento de score de risco para nível
 */
export function riskScoreToLevel(score: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (score < 30) return 'green';
  if (score < 60) return 'yellow';
  if (score < 80) return 'orange';
  return 'red';
}

/**
 * Mapeamento de nível para decisão sugerida
 */
export function levelToDecision(level: 'green' | 'yellow' | 'orange' | 'red'): AuthorizationDecision {
  switch (level) {
    case 'green':
      return 'allowed';
    case 'yellow':
      return 'limited';
    case 'orange':
      return 'requires_confirmation';
    case 'red':
      return 'blocked';
  }
}
