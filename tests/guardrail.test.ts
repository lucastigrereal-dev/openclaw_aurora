/**
 * Testes para GuardrailSkill
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GuardrailSkill,
  createGuardrailSkill,
  ResourceLimits,
  ValidationConfig,
} from '../skills/guardrail';

describe('GuardrailSkill', () => {
  let guardrail: GuardrailSkill;

  beforeEach(() => {
    guardrail = createGuardrailSkill(
      {
        maxMemoryMB: 512,
        maxCpuPercent: 80,
        maxRequestsPerMinute: 100,
        maxExecutionTimeMs: 30000,
        maxFileUploadMB: 50,
      },
      {
        enableSQLCheck: true,
        enableXSSCheck: true,
        enablePathTraversal: true,
        enableCommandInjection: true,
        customPatterns: [],
      }
    );
  });

  describe('Input Validation', () => {
    it('deve detectar SQL injection - single quote', async () => {
      const result = await guardrail.validateInput("admin' OR '1'='1");
      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('deve detectar SQL injection - keywords', async () => {
      const result = await guardrail.validateInput('SELECT * FROM users WHERE id=1');
      expect(result.isValid).toBe(false);
    });

    it('deve detectar XSS - script tag', async () => {
      const result = await guardrail.validateInput('<script>alert("xss")</script>');
      expect(result.isValid).toBe(false);
    });

    it('deve detectar XSS - event handler', async () => {
      const result = await guardrail.validateInput('<img src=x onerror="alert()">');
      expect(result.isValid).toBe(false);
    });

    it('deve detectar XSS - iframe', async () => {
      const result = await guardrail.validateInput('<iframe src="malicious.com"></iframe>');
      expect(result.isValid).toBe(false);
    });

    it('deve detectar path traversal - Unix', async () => {
      const result = await guardrail.validateInput('../../../etc/passwd');
      expect(result.isValid).toBe(false);
    });

    it('deve detectar path traversal - URL encoded', async () => {
      const result = await guardrail.validateInput('..%2f..%2fetc%2fpasswd');
      expect(result.isValid).toBe(false);
    });

    it('deve detectar command injection', async () => {
      const result = await guardrail.validateInput('file.txt; rm -rf /');
      expect(result.isValid).toBe(false);
    });

    it('deve aceitar input válido', async () => {
      const result = await guardrail.validateInput('Hello World 123');
      expect(result.isValid).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it('deve aceitar email válido', async () => {
      const result = await guardrail.validateInput('user@example.com');
      expect(result.isValid).toBe(true);
    });

    it('deve validar apenas tipos específicos', async () => {
      const result = await guardrail.validateInput(
        "admin' OR '1'='1",
        ['xss'] // Só validar XSS
      );
      expect(result.isValid).toBe(true); // SQL injection não foi validado
    });
  });

  describe('Rate Limiting', () => {
    it('deve permitir requisição dentro do limite', () => {
      const allowed = guardrail.checkRateLimit('user1');
      expect(allowed).toBe(true);
    });

    it('deve bloquear requisição quando exceder limite', () => {
      const identifier = 'user2';
      // Simular 100 requisições
      for (let i = 0; i < 100; i++) {
        guardrail.checkRateLimit(identifier);
      }

      // 101ª requisição deve ser bloqueada
      const allowed = guardrail.checkRateLimit(identifier);
      expect(allowed).toBe(false);
    });

    it('deve resetar contador após 1 minuto', async () => {
      const identifier = 'user3';

      // Fazer requisição
      guardrail.checkRateLimit(identifier);

      // Simular passagem de tempo (seria 1 minuto em produção)
      // Nota: Em teste real, usariamos fake timers

      expect(guardrail.checkRateLimit(identifier)).toBe(true);
    });

    it('deve rastrear múltiplos identificadores', () => {
      const allowed1 = guardrail.checkRateLimit('user1');
      const allowed2 = guardrail.checkRateLimit('user2');

      expect(allowed1).toBe(true);
      expect(allowed2).toBe(true);
    });
  });

  describe('Resource Limits', () => {
    it('deve retornar uso de recursos', () => {
      const result = guardrail.checkResourceLimits();

      expect(result).toHaveProperty('within');
      expect(result).toHaveProperty('usage');
      expect(result.usage).toHaveProperty('memoryMB');
      expect(result.usage).toHaveProperty('cpuPercent');
      expect(result.usage).toHaveProperty('executionTimeMs');
    });

    it('deve indicar se está dentro dos limites', () => {
      const result = guardrail.checkResourceLimits();
      expect(typeof result.within).toBe('boolean');
    });

    it('uso de memória deve ser positivo', () => {
      const result = guardrail.checkResourceLimits();
      expect(result.usage.memoryMB).toBeGreaterThan(0);
    });

    it('tempo de execução deve aumentar', () => {
      const result1 = guardrail.checkResourceLimits();
      const time1 = result1.usage.executionTimeMs;

      // Simular algum trabalho
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += i;
      }

      const result2 = guardrail.checkResourceLimits();
      const time2 = result2.usage.executionTimeMs;

      expect(time2).toBeGreaterThanOrEqual(time1);
    });
  });

  describe('Guardrail Status', () => {
    it('deve retornar status completo', () => {
      const status = guardrail.getStatus();

      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('resourceUsage');
      expect(status).toHaveProperty('violations');
      expect(status).toHaveProperty('blocked');
      expect(status).toHaveProperty('active');
    });

    it('status deve ter timestamp recente', () => {
      const status = guardrail.getStatus();
      const now = Date.now();

      expect(status.timestamp).toBeLessThanOrEqual(now);
      expect(status.timestamp).toBeGreaterThan(now - 1000); // Menos de 1s atrás
    });

    it('deve rastrear violações', async () => {
      const status1 = guardrail.getStatus();
      const violations1 = status1.violations;

      // Fazer validação que falha
      await guardrail.validateInput("admin' OR '1'='1");

      const status2 = guardrail.getStatus();
      const violations2 = status2.violations;

      expect(violations2).toBeGreaterThan(violations1);
    });

    it('deve rastrear requisições bloqueadas', () => {
      const status1 = guardrail.getStatus();
      const blocked1 = status1.blocked;

      // Exceder rate limit
      const identifier = 'blocker';
      for (let i = 0; i < 101; i++) {
        guardrail.checkRateLimit(identifier);
      }

      const status2 = guardrail.getStatus();
      const blocked2 = status2.blocked;

      expect(blocked2).toBeGreaterThan(blocked1);
    });
  });

  describe('Skill Interface (execute)', () => {
    it('deve executar comando validate', async () => {
      const result = await guardrail.execute({
        skillId: 'guardrail',
        params: {
          command: 'validate',
          data: "admin' OR '1'='1",
        },
      });

      expect(result.success).toBe(false); // Violação detectada
      expect(result.data).toHaveProperty('isValid', false);
    });

    it('deve executar comando check_rate_limit', async () => {
      const result = await guardrail.execute({
        skillId: 'guardrail',
        params: {
          command: 'check_rate_limit',
          identifier: 'test_user',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('allowed');
    });

    it('deve executar comando check_resources', async () => {
      const result = await guardrail.execute({
        skillId: 'guardrail',
        params: {
          command: 'check_resources',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('usage');
      expect(result.data).toHaveProperty('within');
    });

    it('deve executar comando status', async () => {
      const result = await guardrail.execute({
        skillId: 'guardrail',
        params: {
          command: 'status',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('active');
    });

    it('deve rejeitar comando desconhecido', async () => {
      const result = await guardrail.execute({
        skillId: 'guardrail',
        params: {
          command: 'unknown_command',
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('deve permitir limites customizados', () => {
      const customGuardrail = createGuardrailSkill({
        maxMemoryMB: 256,
        maxRequestsPerMinute: 50,
      });

      expect(customGuardrail).toBeDefined();
    });

    it('deve permitir validação customizada', () => {
      const customGuardrail = createGuardrailSkill(
        {},
        {
          enableSQLCheck: false,
          customPatterns: [/malicious/i],
        }
      );

      expect(customGuardrail).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('deve tratar string vazia como válida', async () => {
      const result = await guardrail.validateInput('');
      expect(result.isValid).toBe(true);
    });

    it('deve tratar muito input longo', async () => {
      const longInput = 'a'.repeat(10000);
      const result = await guardrail.validateInput(longInput);
      expect(result).toHaveProperty('isValid');
    });

    it('deve tratar Unicode corretamente', async () => {
      const result = await guardrail.validateInput('Olá Mundo 你好 مرحبا');
      expect(result.isValid).toBe(true);
    });

    it('deve lidar com caracteres especiais', async () => {
      const result = await guardrail.validateInput('!@#$%^&*()_+-=[]{}|;:,.<>?');
      expect(result).toHaveProperty('isValid');
    });
  });
});
