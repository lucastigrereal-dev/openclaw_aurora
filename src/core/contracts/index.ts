/**
 * ══════════════════════════════════════════════════════════════════════════════
 * OPENCLAW CONTRACTS - Índice Principal
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este arquivo exporta todos os contratos do OpenClaw.
 *
 * COMO USAR:
 * ```typescript
 * import {
 *   // Operator
 *   IOperator,
 *   UserIntent,
 *   ExecutionPlan,
 *   ExecutionResult,
 *
 *   // Aurora
 *   IAurora,
 *   AuthorizationRequest,
 *   AuthorizationResponse,
 *   AuroraEvent,
 *
 *   // Hubs
 *   IHub,
 *   HubManifest,
 *   HubExecutionRequest,
 *
 *   // Skills
 *   ISkill,
 *   SkillMetadata,
 *   SkillExecutionRequest,
 * } from './contracts';
 * ```
 *
 * ESTRUTURA:
 * - operator.contract.ts: Cérebro do sistema
 * - aurora.contract.ts: Guardião/Monitor
 * - hub.contract.ts: Domínios especializados
 * - skill.contract.ts: Capacidades atômicas
 */

// ════════════════════════════════════════════════════════════════════════════
// OPERATOR CONTRACT
// ════════════════════════════════════════════════════════════════════════════

export {
  // Tipos base
  type RequestOrigin,
  type ExecutionMode,
  type StepStatus,
  type ExecutionStatus,
  type StepActionType,

  // Intenção
  type UserIntent,
  type IntentType,
  type SessionContext,
  type ConversationMessage,

  // Plano
  type ExecutionPlan,
  type ExecutionStep,
  type StepCondition,
  type RollbackCommand,

  // Recursos
  type ResourceManifest,
  type RiskLevel,
  type Permission,
  type ExecutionLimits,

  // Resultado
  type ExecutionResult,
  type StepResult,
  type StepError,
  type ExecutionError,
  type ExecutionMetrics,

  // Checkpoint
  type ExecutionCheckpoint,

  // Interface
  type IOperator,
  type SkillRegistration,
  type HubRegistration,
  type SkillHandler,
  type HubHandler,

  // Eventos
  type OperatorEvent,
  type OperatorEventHandler,
} from './operator.contract';

// ════════════════════════════════════════════════════════════════════════════
// AURORA CONTRACT
// ════════════════════════════════════════════════════════════════════════════

export {
  // Tipos base
  type HealthLevel,
  type AlertLevel,
  type AuthorizationDecision,
  type CircuitState,
  type AnomalyType,

  // Autorização
  type AuthorizationRequest,
  type AuthorizationResponse,
  type AuthorizationRule,
  type RiskFactor,

  // Métricas
  type MetricThresholds,
  type SystemMetrics,

  // Eventos
  type AuroraEvent,
  type AuroraEventHandler,

  // Interface
  type IAurora,

  // Constantes
  DEFAULT_THRESHOLDS,
  riskScoreToLevel,
  levelToDecision,
} from './aurora.contract';

// ════════════════════════════════════════════════════════════════════════════
// HUB CONTRACT
// ════════════════════════════════════════════════════════════════════════════

export {
  // Tipos base
  type HubStatus,
  type WorkflowStatus,
  type HubCategory,

  // Manifest
  type HubManifest,
  type WorkflowDefinition,
  type WorkflowStepDefinition,
  type HubDependency,
  type ParameterDefinition,
  type HubConfigSchema,

  // Personas
  type PersonaDefinition,
  type SubskillDefinition,

  // Execução
  type HubExecutionRequest,
  type HubExecutionResult,
  type HubStepResult,
  type PersonaResult,
  type SubskillResult,
  type HubError,
  type HubArtifact,
  type HubMetrics,

  // Interface
  type IHub,
  type ValidationResult as HubValidationResult,
  type ValidationError as HubValidationError,

  // Eventos
  type HubEvent,
  type HubEventHandler,

  // Templates e referências
  HUB_MANIFEST_TEMPLATE,
  EXISTING_HUBS,
} from './hub.contract';

// ════════════════════════════════════════════════════════════════════════════
// SKILL CONTRACT
// ════════════════════════════════════════════════════════════════════════════

export {
  // Tipos base
  type SkillCategory,
  type SkillStatus,
  type SkillExecutionStatus,

  // Definição
  type SkillMetadata,
  type MethodDefinition,
  type ParameterSchema,
  type ReturnSchema,
  type MethodExample,

  // Execução
  type SkillExecutionRequest,
  type SkillExecutionResult,
  type SkillError,
  type SkillMetrics,

  // Interface
  type ISkill,
  type ValidationResult as SkillValidationResult,

  // Classe base
  BaseSkill,

  // Registry
  type ISkillRegistry,

  // Referências
  CORE_SKILLS_METADATA,
} from './skill.contract';

// ════════════════════════════════════════════════════════════════════════════
// VERSÃO DOS CONTRATOS
// ════════════════════════════════════════════════════════════════════════════

export const CONTRACTS_VERSION = '1.0.0';

export const CONTRACTS_INFO = {
  version: CONTRACTS_VERSION,
  created: '2026-02-07',
  author: 'OpenClaw Team',
  components: {
    operator: 'Cérebro - planeja e executa',
    aurora: 'Guardião - monitora e protege',
    hub: 'Domínio - orquestra workflows',
    skill: 'Capacidade - executa ações atômicas',
  },
  rules: {
    'apps-to-operator': 'Apps chamam Operator, nunca Hubs direto',
    'operator-to-aurora': 'Operator pede autorização antes de executar',
    'operator-to-skills': 'Operator executa skills e hubs',
    'hubs-no-import-hubs': 'Hubs não importam outros hubs',
    'skills-atomic': 'Skills fazem uma coisa só',
    'aurora-no-execute': 'Aurora não executa, só vigia',
  },
};
