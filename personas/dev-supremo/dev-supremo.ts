/**
 * Dev Supremo Magnânimo v1.0
 * ========================================
 * Persona Técnica: Guardião Sênior de Qualidade
 *
 * Responsabilidades:
 * - Detectar falhas em segurança, arquitetura, performance
 * - Auditar código antes de produção
 * - Garantir compliance (LGPD/GDPR)
 * - Escalar para humano quando incerto (< 70% confiança)
 *
 * Princípio: Melhor errar no lado conservador
 */

import Anthropic from "@anthropic-ai/sdk";

// ============================================
// TIPOS
// ============================================

interface DevSupremoReview {
  decision: "APPROVED" | "REJECTED" | "NEEDS_HUMAN_REVIEW";
  confidence: number; // 0.0 - 1.0
  reason: string;
  rule_triggered: string;
  evidence: string[];
  suggestion: string;
  escalation_required: boolean;
  timestamp: string;
  review_id: string;
}

interface CodeContext {
  code: string;
  language: string;
  project_name: string;
  file_path: string;
  description?: string;
}

interface ArchitectureContext {
  architecture_description: string;
  tech_stack: string[];
  deployment_target: string;
  expected_load: string;
}

interface ComplianceContext {
  collects_personal_data: boolean;
  data_types: string[];
  retention_days?: number;
  has_user_consent?: boolean;
  gdpr_applicable: boolean;
  lgpd_applicable: boolean;
}

// ============================================
// CHECKS DETERMINÍSTICOS (100% confiáveis)
// ============================================

class DeterministicChecks {
  /**
   * Security Check - Busca patterns perigosos no código
   * Sem IA, sem alucinação - apenas regex
   */
  checkSecurity(code: string, language: string): {
    failed: boolean;
    issues: Array<{
      rule: string;
      pattern: string;
      severity: "critical" | "high" | "medium";
      line?: number;
    }>;
  } {
    const issues: Array<{
      rule: string;
      pattern: string;
      severity: "critical" | "high" | "medium";
      line?: number;
    }> = [];

    // Pattern 1: Hardcoded Passwords
    const passwordPattern =
      /password\s*=\s*["']([^"']+)["']|secret\s*=\s*["']([^"']+)["']/gi;
    if (passwordPattern.test(code)) {
      issues.push({
        rule: "HARDCODED_CREDENTIALS",
        pattern: "password/secret in source code",
        severity: "critical",
      });
    }

    // Pattern 2: eval() usage
    if (/\beval\s*\(/.test(code)) {
      issues.push({
        rule: "EVAL_USAGE",
        pattern: "eval() function used",
        severity: "critical",
      });
    }

    // Pattern 3: innerHTML (XSS)
    if (/\.innerHTML\s*=/.test(code)) {
      issues.push({
        rule: "XSS_RISK_INNERHTML",
        pattern: ".innerHTML assignment",
        severity: "high",
      });
    }

    // Pattern 4: SQL Concatenation
    if (/query\s*=\s*["']\s*.*\+|query\s*=\s*f["'].*{/i.test(code)) {
      issues.push({
        rule: "SQL_INJECTION_RISK",
        pattern: "SQL query concatenation detected",
        severity: "critical",
      });
    }

    // Pattern 5: Missing CORS validation
    if (/cors\s*:\s*true|cors:\s*{.*\*/.test(code)) {
      issues.push({
        rule: "CORS_TOO_PERMISSIVE",
        pattern: "CORS allows all origins",
        severity: "high",
      });
    }

    // Pattern 6: Missing authentication
    if (
      /router\.(get|post|put|delete)\s*\(["']\/api/.test(code) &&
      !/middleware.*auth|verify.*token|authenticat/.test(code)
    ) {
      // Simple heuristic - may have false positives
      // but better conservative for security
      issues.push({
        rule: "POTENTIAL_MISSING_AUTH",
        pattern: "API endpoint without visible auth check",
        severity: "high",
      });
    }

    return {
      failed: issues.length > 0,
      issues,
    };
  }

  /**
   * Performance Check - Busca anti-patterns de performance
   */
  checkPerformance(code: string, context: CodeContext): {
    failed: boolean;
    issues: Array<{
      rule: string;
      description: string;
      severity: "high" | "medium" | "low";
    }>;
  } {
    const issues: Array<{
      rule: string;
      description: string;
      severity: "high" | "medium" | "low";
    }> = [];

    // Pattern 1: N+1 queries (heuristic)
    if (/for\s*\(.*\)\s*{[\s\S]*?\.(find|query|select)\(/i.test(code)) {
      issues.push({
        rule: "POTENTIAL_N_PLUS_1",
        description: "Loop with database query detected - potential N+1",
        severity: "high",
      });
    }

    // Pattern 2: Missing pagination
    if (
      /\.find\(\)|\.all\(\)|SELECT \*/i.test(code) &&
      !/limit|skip|offset|pagina/i.test(code)
    ) {
      issues.push({
        rule: "MISSING_PAGINATION",
        description: "Query without pagination on potentially large dataset",
        severity: "high",
      });
    }

    // Pattern 3: Synchronous operations in loops
    if (/for.*sleep\(|for.*wait|forEach.*async\s+\(/.test(code)) {
      issues.push({
        rule: "BLOCKING_LOOP",
        description: "Synchronous/blocking operation in loop",
        severity: "medium",
      });
    }

    // Pattern 4: No caching headers
    if (
      /router\.(get|post)\(.*res\.json\(/.test(code) &&
      !/cache|etag|last-modified|expires/i.test(code)
    ) {
      issues.push({
        rule: "MISSING_CACHE_HEADERS",
        description: "API endpoint without cache headers",
        severity: "medium",
      });
    }

    return {
      failed: issues.length > 0,
      issues,
    };
  }

  /**
   * Compliance Check - Validações de LGPD/GDPR
   */
  checkCompliance(context: ComplianceContext): {
    failed: boolean;
    issues: Array<{
      rule: string;
      description: string;
      severity: "critical" | "high" | "medium";
    }>;
  } {
    const issues: Array<{
      rule: string;
      description: string;
      severity: "critical" | "high" | "medium";
    }> = [];

    // Rule 1: Collecting PII without consent
    if (context.collects_personal_data && !context.has_user_consent) {
      issues.push({
        rule: "PII_WITHOUT_CONSENT",
        description: "Collecting personal data without documented consent",
        severity: "critical",
      });
    }

    // Rule 2: Email collection without privacy policy
    if (
      context.data_types.includes("email") &&
      !context.has_user_consent
    ) {
      issues.push({
        rule: "EMAIL_COLLECTION_NO_CONSENT",
        description: "Email collection requires explicit consent (LGPD/GDPR)",
        severity: "critical",
      });
    }

    // Rule 3: Location data
    if (
      context.data_types.includes("location") &&
      context.lgpd_applicable
    ) {
      issues.push({
        rule: "LOCATION_DATA_LGPD",
        description: "Location data requires special handling under LGPD",
        severity: "high",
      });
    }

    // Rule 4: Health/biometric data
    if (
      (context.data_types.includes("health") ||
        context.data_types.includes("biometric")) &&
      !context.has_user_consent
    ) {
      issues.push({
        rule: "SENSITIVE_DATA_NO_CONSENT",
        description: "Health/biometric data requires explicit consent",
        severity: "critical",
      });
    }

    // Rule 5: No retention policy
    if (
      context.collects_personal_data &&
      context.retention_days === undefined
    ) {
      issues.push({
        rule: "NO_DATA_RETENTION_POLICY",
        description: "Personal data collection must have defined retention policy",
        severity: "high",
      });
    }

    return {
      failed: issues.length > 0,
      issues,
    };
  }
}

// ============================================
// DEV SUPREMO - ORCHESTRADOR PRINCIPAL
// ============================================

export class DevSupremo {
  private client: InstanceType<typeof Anthropic>;
  private checks: DeterministicChecks;

  private readonly SYSTEM_PROMPT = `You are Dev Supremo Magnânimo v1.0 - a senior technical auditor for the Hub Enterprise.

Your role:
- Audit code, architecture, and deployment decisions
- Identify risks in security, performance, compliance, reliability
- Provide actionable recommendations
- ALWAYS be honest, even if feedback is harsh
- NEVER approve something you're unsure about

Guidelines:
1. If confidence < 70%, respond with NEEDS_HUMAN_REVIEW
2. Always cite which rule/pattern triggered rejection
3. Provide specific evidence (line numbers, examples, references)
4. Suggest concrete fixes, not vague improvements
5. Separate CRITICAL from MEDIUM issues

Output format (JSON):
{
  "decision": "APPROVED|REJECTED|NEEDS_HUMAN_REVIEW",
  "confidence": 0.0-1.0,
  "reason": "specific reason",
  "rule_triggered": "RULE_NAME",
  "evidence": ["specific evidence 1", "specific evidence 2"],
  "suggestion": "concrete fix",
  "escalation_required": boolean
}`;

  constructor() {
    this.client = new Anthropic();
    this.checks = new DeterministicChecks();
  }

  /**
   * MAIN ENTRY POINT: Audita código
   */
  async auditCode(context: CodeContext): Promise<DevSupremoReview> {
    const review_id = `review_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    console.log(`[Dev Supremo] Starting audit: ${review_id}`);

    // ===== STEP 1: Deterministic Checks (100% confiável)
    console.log(`[Dev Supremo] Running deterministic security checks...`);
    const securityCheck = this.checks.checkSecurity(context.code, context.language);

    if (securityCheck.failed && securityCheck.issues.length > 0) {
      const critical = securityCheck.issues.filter((i) => i.severity === "critical");
      if (critical.length > 0) {
        return {
          decision: "REJECTED",
          confidence: 1.0, // Deterministic = 100%
          reason: `Critical security issues found: ${critical.map((i) => i.rule).join(", ")}`,
          rule_triggered: critical[0].rule,
          evidence: critical.map((i) => `${i.rule}: ${i.pattern}`),
          suggestion: `Remove hardcoded credentials, eval(), innerHTML assignments, and SQL concatenation.`,
          escalation_required: true,
          timestamp: new Date().toISOString(),
          review_id,
        };
      }
    }

    // ===== STEP 2: AI-based deeper review (if passed deterministic)
    console.log(`[Dev Supremo] Running AI-based architecture review...`);

    const aiReview = await this.callClaude({
      code_snippet: context.code.slice(0, 2000), // First 2000 chars to save tokens
      context_description: context.description || "Code review",
      language: context.language,
      project: context.project_name,
    });

    // If AI is uncertain, escalate
    if (aiReview.confidence < 0.7) {
      return {
        decision: "NEEDS_HUMAN_REVIEW",
        confidence: aiReview.confidence,
        reason: aiReview.reason,
        rule_triggered: "LOW_CONFIDENCE_AI_REVIEW",
        evidence: aiReview.evidence,
        suggestion: aiReview.suggestion,
        escalation_required: true,
        timestamp: new Date().toISOString(),
        review_id,
      };
    }

    return {
      decision: aiReview.decision,
      confidence: aiReview.confidence,
      reason: aiReview.reason,
      rule_triggered: aiReview.rule,
      evidence: aiReview.evidence,
      suggestion: aiReview.suggestion,
      escalation_required: aiReview.escalation,
      timestamp: new Date().toISOString(),
      review_id,
    };
  }

  /**
   * Audit Architecture/Design
   */
  async auditArchitecture(
    context: ArchitectureContext
  ): Promise<DevSupremoReview> {
    const review_id = `arch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    console.log(`[Dev Supremo] Auditing architecture: ${review_id}`);

    const prompt = `
Review this architecture for a Hub Enterprise application:

Tech Stack: ${context.tech_stack.join(", ")}
Deployment Target: ${context.deployment_target}
Expected Load: ${context.expected_load}

Architecture Description:
${context.architecture_description}

Evaluate:
1. Scalability - Can it handle the expected load?
2. Resilience - Failure modes and recovery?
3. Security - Auth, encryption, isolation?
4. Cost efficiency - Is this the right choice for requirements?
5. Team capability - Can the team maintain this?

Be critical. If any major risk exists, recommend redesign.
`;

    const response = await this.client.messages.create({
      model: "claude-opus-4-1-20250805",
      max_tokens: 1024,
      system: this.SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const parsed = JSON.parse(responseText);
      return {
        decision: parsed.decision,
        confidence: parsed.confidence,
        reason: parsed.reason,
        rule_triggered: parsed.rule_triggered,
        evidence: parsed.evidence || [],
        suggestion: parsed.suggestion,
        escalation_required: parsed.escalation_required || false,
        timestamp: new Date().toISOString(),
        review_id,
      };
    } catch (e) {
      return {
        decision: "NEEDS_HUMAN_REVIEW",
        confidence: 0.5,
        reason: "AI response parsing failed",
        rule_triggered: "PARSE_ERROR",
        evidence: [responseText.slice(0, 200)],
        suggestion: "Manual review required",
        escalation_required: true,
        timestamp: new Date().toISOString(),
        review_id,
      };
    }
  }

  /**
   * Audit Compliance (LGPD/GDPR)
   */
  async auditCompliance(
    context: ComplianceContext
  ): Promise<DevSupremoReview> {
    const review_id = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    console.log(`[Dev Supremo] Auditing compliance: ${review_id}`);

    // ===== Step 1: Deterministic compliance check
    const complianceCheck = this.checks.checkCompliance(context);

    if (complianceCheck.failed) {
      const critical = complianceCheck.issues.filter(
        (i) => i.severity === "critical"
      );
      if (critical.length > 0) {
        return {
          decision: "REJECTED",
          confidence: 1.0,
          reason: `Compliance violations: ${critical.map((i) => i.rule).join(", ")}`,
          rule_triggered: critical[0].rule,
          evidence: critical.map((i) => i.description),
          suggestion: `Implement explicit user consent before collecting personal data.`,
          escalation_required: true,
          timestamp: new Date().toISOString(),
          review_id,
        };
      }
    }

    return {
      decision: "APPROVED",
      confidence: 0.95,
      reason: "Compliance checks passed",
      rule_triggered: "COMPLIANCE_OK",
      evidence: ["No critical compliance issues detected"],
      suggestion: "Continue with implementation",
      escalation_required: false,
      timestamp: new Date().toISOString(),
      review_id,
    };
  }

  /**
   * Call Claude for deeper analysis
   */
  private async callClaude(input: {
    code_snippet: string;
    context_description: string;
    language: string;
    project: string;
  }): Promise<{
    decision: "APPROVED" | "REJECTED" | "NEEDS_HUMAN_REVIEW";
    confidence: number;
    reason: string;
    rule: string;
    evidence: string[];
    suggestion: string;
    escalation: boolean;
  }> {
    const prompt = `
Review this ${input.language} code for ${input.project}:

\`\`\`${input.language}
${input.code_snippet}
\`\`\`

Context: ${input.context_description}

Evaluate for:
1. Architecture patterns (is it following good practices?)
2. Error handling (are errors handled gracefully?)
3. Testability (is this code testable?)
4. Code clarity (is this understandable?)
5. Potential bugs (obvious issues?)

Respond with decision and reasoning.
`;

    try {
      const response = await this.client.messages.create({
        model: "claude-opus-4-1-20250805",
        max_tokens: 512,
        system: this.SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const responseText =
        response.content[0].type === "text" ? response.content[0].text : "";

      try {
        const parsed = JSON.parse(responseText);
        return {
          decision: parsed.decision || "NEEDS_HUMAN_REVIEW",
          confidence: parsed.confidence || 0.5,
          reason: parsed.reason || "No detailed reason provided",
          rule: parsed.rule_triggered || "CUSTOM_AI_REVIEW",
          evidence: parsed.evidence || [],
          suggestion: parsed.suggestion || "See details above",
          escalation: parsed.escalation_required || false,
        };
      } catch {
        // If Claude response isn't valid JSON, be conservative
        return {
          decision: "NEEDS_HUMAN_REVIEW",
          confidence: 0.4,
          reason: "AI provided analysis but needs human interpretation",
          rule: "AI_RESPONSE_UNCLEAR",
          evidence: [responseText.slice(0, 300)],
          suggestion: "Request human review",
          escalation: true,
        };
      }
    } catch (error) {
      console.error(`[Dev Supremo] API Error:`, error);
      return {
        decision: "NEEDS_HUMAN_REVIEW",
        confidence: 0,
        reason: "API call failed",
        rule: "API_ERROR",
        evidence: [String(error)],
        suggestion: "Retry or escalate",
        escalation: true,
      };
    }
  }
}

// ============================================
// MAIN - Test
// ============================================

async function main() {
  const devSupremo = new DevSupremo();

  // Test 1: Security Review
  console.log("\n=== TEST 1: Security Review ===");
  const securityReview = await devSupremo.auditCode({
    code: `
      const password = "super_secret_123";
      router.get('/api/users', (req, res) => {
        const query = "SELECT * FROM users WHERE id=" + req.params.id;
        db.query(query, (err, results) => {
          res.json(results);
        });
      });
    `,
    language: "javascript",
    project: "sales-app",
    file_path: "src/routes/users.js",
    description: "User API endpoint",
  });
  console.log(JSON.stringify(securityReview, null, 2));

  // Test 2: Compliance Review
  console.log("\n=== TEST 2: Compliance Review ===");
  const complianceReview = await devSupremo.auditCompliance({
    collects_personal_data: true,
    data_types: ["email", "name"],
    has_user_consent: false,
    retention_days: undefined,
    gdpr_applicable: true,
    lgpd_applicable: true,
  });
  console.log(JSON.stringify(complianceReview, null, 2));

  // Test 3: Architecture Review
  console.log("\n=== TEST 3: Architecture Review ===");
  const archReview = await devSupremo.auditArchitecture({
    architecture_description: `
      Monolithic Node.js app with Express
      Single PostgreSQL database
      Deployed on EC2 instance
      No load balancing
      No caching layer
    `,
    tech_stack: ["Node.js", "Express", "PostgreSQL", "EC2"],
    deployment_target: "AWS EC2",
    expected_load: "1000 users/day",
  });
  console.log(JSON.stringify(archReview, null, 2));
}

main().catch(console.error);
