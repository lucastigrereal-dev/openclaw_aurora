/**
 * ══════════════════════════════════════════════════════════════════════════════
 * TIPOS ESSENCIAIS - Tipos compartilhados por todos os contratos
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este arquivo contém os tipos MÍNIMOS que todos os componentes usam.
 * Importar daqui evita dependências circulares.
 */

// ════════════════════════════════════════════════════════════════════════════
// IDENTIFICADORES
// ════════════════════════════════════════════════════════════════════════════

export type ExecutionId = string;
export type PlanId = string;
export type StepId = string;
export type SkillName = string;
export type HubName = string;
export type CheckpointId = string;

// ════════════════════════════════════════════════════════════════════════════
// ORIGENS E MODOS
// ════════════════════════════════════════════════════════════════════════════

export type Origin = 'cockpit' | 'telegram' | 'api' | 'websocket' | 'internal' | 'cli';
export type ExecutionMode = 'dry-run' | 'real';

// ════════════════════════════════════════════════════════════════════════════
// RISCO E PERMISSÕES
// ════════════════════════════════════════════════════════════════════════════

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type RiskScore = number; // 0-100

export type Permission =
  | 'file:read'
  | 'file:write'
  | 'file:delete'
  | 'file:execute'
  | 'network:outbound'
  | 'network:inbound'
  | 'process:spawn'
  | 'process:kill'
  | 'database:read'
  | 'database:write'
  | 'database:admin'
  | 'git:read'
  | 'git:write'
  | 'git:push'
  | 'git:force'
  | 'system:read'
  | 'system:write'
  | 'system:admin'
  | 'credentials:read'
  | 'credentials:write'
  | 'ai:invoke'
  | 'browser:control'
  | 'comm:send';

// ════════════════════════════════════════════════════════════════════════════
// STATUS
// ════════════════════════════════════════════════════════════════════════════

export type ExecutionStatus = 'queued' | 'authorized' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';
export type HealthLevel = 'healthy' | 'degraded' | 'critical' | 'down';
export type AuthorizationDecision = 'allowed' | 'limited' | 'requires_confirmation' | 'blocked';
export type TrafficLight = 'green' | 'yellow' | 'orange' | 'red';

// ════════════════════════════════════════════════════════════════════════════
// LIMITES
// ════════════════════════════════════════════════════════════════════════════

export interface ExecutionLimits {
  max_duration_ms: number;
  max_retries_per_step: number;
  max_files_changed: number;
  max_bytes_written: number;
  max_external_requests: number;
  max_processes: number;
  actions_per_second: number;
}

export const DEFAULT_LIMITS: ExecutionLimits = {
  max_duration_ms: 300000, // 5 min
  max_retries_per_step: 3,
  max_files_changed: 100,
  max_bytes_written: 10 * 1024 * 1024, // 10MB
  max_external_requests: 50,
  max_processes: 5,
  actions_per_second: 10,
};

// ════════════════════════════════════════════════════════════════════════════
// RECURSOS
// ════════════════════════════════════════════════════════════════════════════

export interface ResourceManifest {
  files_read: string[];
  files_write: string[];
  files_delete: string[];
  directories: string[];
  repositories: string[];
  external_urls: string[];
  databases: string[];
  external_apis: string[];
  system_services: string[];
}

export const EMPTY_RESOURCES: ResourceManifest = {
  files_read: [],
  files_write: [],
  files_delete: [],
  directories: [],
  repositories: [],
  external_urls: [],
  databases: [],
  external_apis: [],
  system_services: [],
};

// ════════════════════════════════════════════════════════════════════════════
// ERROS
// ════════════════════════════════════════════════════════════════════════════

export interface BaseError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// MÉTRICAS
// ════════════════════════════════════════════════════════════════════════════

export interface BaseMetrics {
  duration_ms: number;
  started_at: Date;
  completed_at: Date;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

export function riskScoreToLight(score: RiskScore): TrafficLight {
  if (score < 30) return 'green';
  if (score < 60) return 'yellow';
  if (score < 80) return 'orange';
  return 'red';
}

export function lightToDecision(light: TrafficLight): AuthorizationDecision {
  switch (light) {
    case 'green': return 'allowed';
    case 'yellow': return 'limited';
    case 'orange': return 'requires_confirmation';
    case 'red': return 'blocked';
  }
}
