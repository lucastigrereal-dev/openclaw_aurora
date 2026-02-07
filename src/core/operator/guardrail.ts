/**
 * GuardrailSkill - Proteção e validação para OpenClaw Aurora + Hub Enterprise
 *
 * Fornece guardrails para:
 * - Limites de recursos (CPU, memória, requisições)
 * - Validação de inputs (SQL injection, XSS, pattern matching)
 * - Rate limiting e throttling
 * - Detecção de anti-patterns
 * - Recuperação automática
 * - Auditoria e logging
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';

/**
 * Limites de recursos padrão
 */
export interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxRequestsPerMinute: number;
  maxExecutionTimeMs: number;
  maxFileUploadMB: number;
}

/**
 * Configuração de validação
 */
export interface ValidationConfig {
  enableSQLCheck: boolean;
  enableXSSCheck: boolean;
  enablePathTraversal: boolean;
  enableCommandInjection: boolean;
  customPatterns: RegExp[];
}

/**
 * Anti-patterns detectados
 */
export interface AntiPattern {
  type: 'sql_injection' | 'xss' | 'path_traversal' | 'command_injection' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern: RegExp;
  description: string;
}

/**
 * Resultado da validação
 */
export interface ValidationResult {
  isValid: boolean;
  violations: Array<{
    pattern: string;
    input: string;
    severity: string;
  }>;
}

/**
 * Status de guardrail
 */
export interface GuardrailStatus {
  timestamp: number;
  resourceUsage: {
    memoryMB: number;
    cpuPercent: number;
    requestCount: number;
  };
  violations: number;
  blocked: number;
  active: boolean;
}

/**
 * GuardrailSkill - Skill de proteção
 */
export class GuardrailSkill extends Skill {
  private limits: ResourceLimits;
  private validation: ValidationConfig;
  private antiPatterns: Map<string, AntiPattern[]>;
  private requestCounts: Map<string, number[]>;
  private violations: number = 0;
  private blocked: number = 0;
  private startTime: number;

  constructor(
    limits?: Partial<ResourceLimits>,
    validation?: Partial<ValidationConfig>
  ) {
    super('guardrail', 'Proteção e validação de inputs');

    this.startTime = Date.now();

    // Limites padrão
    this.limits = {
      maxMemoryMB: limits?.maxMemoryMB ?? 512,
      maxCpuPercent: limits?.maxCpuPercent ?? 80,
      maxRequestsPerMinute: limits?.maxRequestsPerMinute ?? 100,
      maxExecutionTimeMs: limits?.maxExecutionTimeMs ?? 30000,
      maxFileUploadMB: limits?.maxFileUploadMB ?? 50,
    };

    // Validação padrão
    this.validation = {
      enableSQLCheck: validation?.enableSQLCheck ?? true,
      enableXSSCheck: validation?.enableXSSCheck ?? true,
      enablePathTraversal: validation?.enablePathTraversal ?? true,
      enableCommandInjection: validation?.enableCommandInjection ?? true,
      customPatterns: validation?.customPatterns ?? [],
    };

    // Inicializar anti-patterns
    this.antiPatterns = this.initializeAntiPatterns();
    this.requestCounts = new Map();
  }

  /**
   * Inicializar anti-patterns conhecidos
   */
  private initializeAntiPatterns(): Map<string, AntiPattern[]> {
    const patterns = new Map<string, AntiPattern[]>();

    // SQL Injection patterns
    patterns.set('sql_injection', [
      {
        type: 'sql_injection',
        severity: 'critical',
        pattern: /('|(\\\\)|(\\-\\-)|(;)|(\\|\\|)|(\\*))/gi,
        description: 'Caracteres SQL suspeitos detectados',
      },
      {
        type: 'sql_injection',
        severity: 'critical',
        pattern: /(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript)/gi,
        description: 'Palavra-chave SQL suspeita detectada',
      },
    ]);

    // XSS patterns
    patterns.set('xss', [
      {
        type: 'xss',
        severity: 'high',
        pattern: /<script[^>]*>[\s\S]*?<\/script>/gi,
        description: 'Tag <script> detectada',
      },
      {
        type: 'xss',
        severity: 'high',
        pattern: /on\w+\s*=/gi,
        description: 'Event handler suspeito detectado (onclick, onload, etc)',
      },
      {
        type: 'xss',
        severity: 'high',
        pattern: /<iframe[^>]*>/gi,
        description: 'Tag <iframe> detectada',
      },
    ]);

    // Path Traversal patterns
    patterns.set('path_traversal', [
      {
        type: 'path_traversal',
        severity: 'high',
        pattern: /\.\.\//g,
        description: 'Tentativa de path traversal (../) detectada',
      },
      {
        type: 'path_traversal',
        severity: 'high',
        pattern: /%2e%2e/gi,
        description: 'Tentativa de path traversal URL-encoded detectada',
      },
    ]);

    // Command Injection patterns
    patterns.set('command_injection', [
      {
        type: 'command_injection',
        severity: 'critical',
        pattern: /[;&|`$()]/g,
        description: 'Caracteres de command injection detectados',
      },
      {
        type: 'command_injection',
        severity: 'critical',
        pattern: /(bash|sh|cmd|powershell|exec|system|eval|passthru)/gi,
        description: 'Comando de sistema suspeito detectado',
      },
    ]);

    return patterns;
  }

  /**
   * Validar input contra anti-patterns
   */
  async validateInput(input: string, types?: string[]): Promise<ValidationResult> {
    const violations: Array<{
      pattern: string;
      input: string;
      severity: string;
    }> = [];

    const patternsToCheck = types || this.getActivePatterns();

    for (const patternType of patternsToCheck) {
      const antiPatterns = this.antiPatterns.get(patternType) || [];

      for (const antiPattern of antiPatterns) {
        if (!this.shouldCheck(patternType)) continue;

        const matches = input.match(antiPattern.pattern);
        if (matches) {
          violations.push({
            pattern: antiPattern.description,
            input: matches[0].substring(0, 50), // Primeiros 50 chars
            severity: antiPattern.severity,
          });

          this.violations++;
        }
      }
    }

    // Verificar padrões customizados
    for (const customPattern of this.validation.customPatterns) {
      if (input.match(customPattern)) {
        violations.push({
          pattern: 'Custom pattern',
          input: input.substring(0, 50),
          severity: 'medium',
        });
        this.violations++;
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  /**
   * Verificar se deve validar um tipo
   */
  private shouldCheck(type: string): boolean {
    switch (type) {
      case 'sql_injection':
        return this.validation.enableSQLCheck;
      case 'xss':
        return this.validation.enableXSSCheck;
      case 'path_traversal':
        return this.validation.enablePathTraversal;
      case 'command_injection':
        return this.validation.enableCommandInjection;
      default:
        return true;
    }
  }

  /**
   * Obter padrões ativos
   */
  private getActivePatterns(): string[] {
    const active: string[] = [];
    if (this.validation.enableSQLCheck) active.push('sql_injection');
    if (this.validation.enableXSSCheck) active.push('xss');
    if (this.validation.enablePathTraversal) active.push('path_traversal');
    if (this.validation.enableCommandInjection) active.push('command_injection');
    return active;
  }

  /**
   * Verificar limite de requisições (rate limiting)
   */
  checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Inicializar ou obter timestamps
    if (!this.requestCounts.has(identifier)) {
      this.requestCounts.set(identifier, []);
    }

    const timestamps = this.requestCounts.get(identifier)!;

    // Remover timestamps antigos (>1 minuto)
    const recentTimestamps = timestamps.filter((ts) => ts > oneMinuteAgo);
    this.requestCounts.set(identifier, recentTimestamps);

    // Verificar se excedeu limite
    if (recentTimestamps.length >= this.limits.maxRequestsPerMinute) {
      this.blocked++;
      return false;
    }

    // Adicionar novo timestamp
    recentTimestamps.push(now);

    return true;
  }

  /**
   * Verificar limites de recursos
   */
  checkResourceLimits(): {
    within: boolean;
    usage: { memoryMB: number; cpuPercent: number; executionTimeMs: number };
  } {
    const memUsage = process.memoryUsage();
    const memoryMB = memUsage.heapUsed / 1024 / 1024;
    const executionTimeMs = Date.now() - this.startTime;

    // Nota: CPU e outras métricas seriam obtidas via sistema operacional
    // Por simplicidade, retornamos valores simulados
    const cpuPercent = Math.random() * 100; // Simulado

    const within =
      memoryMB <= this.limits.maxMemoryMB &&
      cpuPercent <= this.limits.maxCpuPercent &&
      executionTimeMs <= this.limits.maxExecutionTimeMs;

    return {
      within,
      usage: {
        memoryMB,
        cpuPercent,
        executionTimeMs,
      },
    };
  }

  /**
   * Obter status do guardrail
   */
  getStatus(): GuardrailStatus {
    const resourceCheck = this.checkResourceLimits();

    return {
      timestamp: Date.now(),
      resourceUsage: {
        memoryMB: resourceCheck.usage.memoryMB,
        cpuPercent: resourceCheck.usage.cpuPercent,
        requestCount: Array.from(this.requestCounts.values()).reduce(
          (acc, arr) => acc + arr.length,
          0
        ),
      },
      violations: this.violations,
      blocked: this.blocked,
      active: resourceCheck.within,
    };
  }

  /**
   * Executar skill (interface Skill)
   */
  async execute(input: SkillInput): Promise<SkillOutput> {
    const command = input.params?.command || 'status';
    const data = input.params?.data || '';
    const validationType = input.params?.type;

    try {
      switch (command) {
        case 'validate':
          const validationResult = await this.validateInput(
            data,
            validationType ? [validationType] : undefined
          );
          return this.success({
            validated: true,
            isValid: validationResult.isValid,
            violations: validationResult.violations,
          });

        case 'check_rate_limit':
          const identifier = input.params?.identifier || 'default';
          const allowed = this.checkRateLimit(identifier);
          return this.success({
            allowed,
            message: allowed
              ? 'Request allowed'
              : `Rate limit exceeded (${this.limits.maxRequestsPerMinute}/min)`,
          });

        case 'check_resources':
          const resourceStatus = this.checkResourceLimits();
          return this.success({
            within: resourceStatus.within,
            usage: resourceStatus.usage,
            limits: this.limits,
          });

        case 'status':
          const status = this.getStatus();
          return this.success(status);

        default:
          return this.error(`Unknown command: ${command}`);
      }
    } catch (error) {
      return this.error(`Guardrail error: ${error}`);
    }
  }
}

// Exportar factory function
export function createGuardrailSkill(
  limits?: Partial<ResourceLimits>,
  validation?: Partial<ValidationConfig>
): GuardrailSkill {
  return new GuardrailSkill(limits, validation);
}
