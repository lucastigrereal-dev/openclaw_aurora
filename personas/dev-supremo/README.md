# Dev Supremo Magnânimo v1.0

**Guardião Técnico Sênior do Hub Enterprise**

---

## Visão Geral

O **Dev Supremo** é uma persona técnica especializada em auditoria de código, arquitetura e compliance. Age como verificador de última instância antes de mudanças irem para produção.

### Responsabilidades

✅ **Detectar riscos** em segurança, performance, arquitetura e compliance
✅ **Auditar código** antes de deployment
✅ **Garantir conformidade** com LGPD, GDPR e políticas internas
✅ **Escalar para humanos** quando incerto (confiança < 70%)
✅ **Prover explicabilidade total** - cada decisão rastreável

### Princípios

1. **Melhor errar no lado conservador** - rejeição duvidosa > aprovação duvidosa
2. **Sem alucinação** - usa checks determinísticos + IA controlada
3. **Explicabilidade total** - toda rejeição vem com evidência e sugestão
4. **Escalação clara** - quando incerto, humano decide
5. **Independência técnica** - sem viés pessoal, apenas fatos

---

## Como Usar

### 1. Auditar Código (CLI)

```bash
cd /mnt/c/Users/lucas/openclaw_aurora/personas/dev-supremo

# Verificar arquivo específico
npx ts-node dev-supremo.ts --file src/api/users.ts

# Ou via API
curl -X POST http://localhost:3000/api/dev-supremo/audit \
  -H "Content-Type: application/json" \
  -d '{
    "code": "...",
    "language": "typescript",
    "project_name": "sales-app",
    "file_path": "src/api/users.ts",
    "description": "User authentication endpoint"
  }'
```

### 2. Auditar Arquitetura

```bash
npx ts-node dev-supremo.ts --architecture \
  --tech-stack "Node.js,Express,PostgreSQL" \
  --deployment "AWS EC2" \
  --expected-load "1000 users/day"
```

### 3. Auditar Compliance (LGPD/GDPR)

```bash
npx ts-node dev-supremo.ts --compliance \
  --collects-pii true \
  --data-types "email,name,location" \
  --has-consent false
```

### 4. Integração com Slack

```
/review code <file_path>
/review architecture
/review compliance
/review status
```

---

## Estrutura de Resposta

Toda auditoria retorna JSON estruturado:

```json
{
  "decision": "REJECTED|APPROVED|NEEDS_HUMAN_REVIEW",
  "confidence": 0.0-1.0,
  "reason": "Específica razão da decisão",
  "rule_triggered": "SECURITY_RULE_NAME ou ARCHITECTURE_PATTERN",
  "evidence": [
    "Prova 1: linha X contém pattern Y",
    "Prova 2: falta validação de entrada"
  ],
  "suggestion": "Ação concreta para corrigir",
  "escalation_required": true,
  "timestamp": "2025-02-07T10:30:00Z",
  "review_id": "review_1707302400000_abc123def"
}
```

---

## Checks Disponíveis

### Checks Determinísticos (100% confiáveis)

| Check | O que detecta | Confiança |
|-------|---------------|-----------|
| `checkSecurity()` | Hardcoded passwords, eval(), innerHTML, SQL injection, CORS aberto | 1.0 |
| `checkPerformance()` | N+1 queries, falta de pagination, loops síncronos, cache headers | 0.95 |
| `checkCompliance()` | Coleta de PII sem consentimento, violações LGPD/GDPR | 1.0 |

### Checks IA-baseados (com limite de confiança)

| Check | O que avalia | Confiança |
|-------|--------------|-----------|
| `auditCode()` | Padrões de arquitetura, error handling, testabilidade | 0.70-0.90 |
| `auditArchitecture()` | Escalabilidade, resiliência, custo-benefício | 0.65-0.85 |

---

## Métricas & Sucesso

O Dev Supremo é medido por:

```
1. bugs_caught_before_prod      [Target: > 5/mês]
2. false_positive_rate          [Target: < 10%]
3. review_time_average          [Target: < 30s]
4. escalation_rate              [Target: < 10%]
5. customer_satisfaction        [Target: > 90%]
```

Se nenhuma métrica melhorar > 20% em 30 dias → redesign.

---

## Integração com CI/CD

### GitHub Actions (Exemplo)

```yaml
name: Dev Supremo Security Review
on: pull_request

jobs:
  dev_supremo_review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Dev Supremo Audit
        run: |
          npx ts-node personas/dev-supremo/dev-supremo.ts \
            --file ${{ github.event.pull_request.files[*] }} \
            --output audit_report.json

      - name: Comment on PR
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            const report = require('./audit_report.json');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `**Dev Supremo Review**: ${report.decision}\n\n${report.reason}`
            })
```

---

## Fluxo de Decisão

```
┌─────────────────────────────────┐
│   Código / Arquitetura / Config │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  1. Checks Determinísticos      │
│  (Security, Performance, LGPD)  │
└────────────┬────────────────────┘
             │
    ┌────────┴─────────┐
    │                  │
 CRÍTICO           OK
 ▼                 ▼
REJECTED      ┌──────────────────┐
              │ 2. AI-based      │
              │    Deep Review   │
              └────────┬─────────┘
                       │
            ┌──────────┼──────────┐
            │          │         │
       > 70%      70% (uncertain)
        ▼           ▼
    APPROVED   NEEDS_HUMAN_REVIEW
                 │
                 ▼
            [Escalate to Dev]
```

---

## Regras de Rejeição (Críticas)

### Segurança

- ❌ Hardcoded credentials (passwords, API keys)
- ❌ SQL injection risk (string concatenation in queries)
- ❌ XSS risk (innerHTML without sanitization)
- ❌ Missing authentication on API endpoints
- ❌ Insecure CORS (allow *)
- ❌ Eval function usage

### Compliance

- ❌ Collecting PII without consent
- ❌ Email/health data without explicit consent
- ❌ No data retention policy defined
- ❌ Location data without LGPD consent

### Performance (se > 1000 users)

- ❌ N+1 database queries
- ❌ No pagination on list endpoints
- ❌ Blocking operations in loops

---

## Exemplos de Saída

### Exemplo 1: Rejeição por Segurança

```json
{
  "decision": "REJECTED",
  "confidence": 1.0,
  "reason": "Critical security issue: hardcoded password detected",
  "rule_triggered": "HARDCODED_CREDENTIALS",
  "evidence": [
    "Line 12: const password = 'super_secret_123'"
  ],
  "suggestion": "Use environment variables or secrets manager. Example: const password = process.env.DB_PASSWORD;",
  "escalation_required": true,
  "review_id": "review_1707302400000_abc123"
}
```

### Exemplo 2: Aprovação Condicional

```json
{
  "decision": "APPROVED",
  "confidence": 0.92,
  "reason": "Code passes security and performance checks",
  "rule_triggered": "GENERAL_CODE_QUALITY",
  "evidence": [
    "No hardcoded credentials",
    "Proper error handling",
    "Pagination implemented"
  ],
  "suggestion": "Consider adding integration tests for edge cases",
  "escalation_required": false,
  "review_id": "review_1707302400000_def456"
}
```

### Exemplo 3: Escalação por Incerteza

```json
{
  "decision": "NEEDS_HUMAN_REVIEW",
  "confidence": 0.65,
  "reason": "Code pattern is complex and requires human judgment",
  "rule_triggered": "LOW_CONFIDENCE_AI_REVIEW",
  "evidence": [
    "Custom caching logic detected",
    "Non-standard error handling",
    "Requires domain expertise to evaluate"
  ],
  "suggestion": "Have senior dev review caching strategy",
  "escalation_required": true,
  "review_id": "review_1707302400000_ghi789"
}
```

---

## Roadmap

### ✅ Phase 1 (AGORA) - MVP Executável

- [x] Checks determinísticos (security, performance, compliance)
- [x] System prompt com examples
- [x] CLI interface básico
- [x] JSON response format
- [x] Slack integration

### Phase 2 (Semana 2-3)

- [ ] GitHub Actions integration
- [ ] Dashboard de auditoria
- [ ] Histórico de decisions
- [ ] Métricas e alertas

### Phase 3 (Mês 2)

- [ ] IA-based architecture review
- [ ] Custom rules por projeto
- [ ] Fine-tuning baseado em feedback

### Phase 4+ (Mês 3+)

- [ ] Performance optimization
- [ ] Federated learning dos patterns
- [ ] API pública para extensões

---

## Troubleshooting

### "NEEDS_HUMAN_REVIEW com confiança baixa"

Significa: Dev Supremo não tem certeza. Humano precisa revisar manualmente.
- Verifique se há padrão não-documentado
- Considere adicionar novo check determinístico se pattern é recorrente

### "REJECTED mas acho que deveria passar"

Dev Supremo pode estar conservador. Opções:
1. Ajuste o código conforme sugestão
2. Abra issue pedindo revisão da regra
3. Escale para Dev Supremo review (admin override)

### "API call failed"

Verifique:
- Variável `ANTHROPIC_API_KEY` configurada
- Internet connection
- Rate limits (máx 100 calls/dia)

---

## Configuração Avançada

Edite `dev-supremo.config.json` para:

```json
{
  "cost_limits": {
    "max_api_calls_per_day": 100,
    "budget_per_month": 50
  },
  "escalation_rules": {
    "critical_security": {
      "to": "security_team"
    }
  }
}
```

---

## Suporte

- 📧 Dúvidas: Issue no repositório
- 💬 Chat: `/dev-supremo help`
- 📊 Status: `/dev-supremo status`
- 📈 Métricas: `/dev-supremo metrics`

---

**Dev Supremo Magnânimo v1.0**
_Guardian of Technical Quality_
_"Honesty is the best policy, but honesty without kindness is cruelty."_
