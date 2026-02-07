# Skill S-27: Compliance Reporter - Quick Reference

## File Location
```
/mnt/c/Users/lucas/openclaw_aurora/skills/supabase-archon/supabase-compliance-reporter.ts
```

## What It Does
Generates comprehensive compliance reports for:
- **LGPD** (Brazilian Privacy Law)
- **GDPR** (European Union Privacy Regulation)
- **SOC2** (Security Audit Standard)

## Key Features

### Audits
- PII field masking and protection
- Data retention policy compliance
- Right-to-delete request tracking
- Audit trail metrics and monitoring

### Reports
- Individual framework reports (LGPD, GDPR, SOC2)
- Combined multi-framework reports
- Compliance scoring (0-100)
- Issue identification
- Actionable recommendations

### Quick Checks
- PII masking status
- Retention policy compliance
- Right-to-delete request processing

## Class Structure

```typescript
export class SupabaseComplianceReporter extends Skill {
  // Main report generation
  async execute(params: ComplianceReporterParams): Promise<ComplianceReporterResult>

  // Framework-specific reports
  async generateLGPDReport(params: SkillInput): Promise<SkillOutput>
  async generateGDPRReport(params: SkillInput): Promise<SkillOutput>
  async generateSOC2Report(params: SkillInput): Promise<SkillOutput>

  // Quick checks
  async checkPIIMasking(params: SkillInput): Promise<SkillOutput>
  async verifyRetentionPolicies(params: SkillInput): Promise<SkillOutput>
  async processRightToDeleteRequest(params: SkillInput): Promise<SkillOutput>
}
```

## API Methods Summary

| Method | Purpose | Returns |
|--------|---------|---------|
| `execute()` | Generate full compliance report | ComplianceReport |
| `generateLGPDReport()` | LGPD-only report | ComplianceReport |
| `generateGDPRReport()` | GDPR-only report | ComplianceReport |
| `generateSOC2Report()` | SOC2-only report | ComplianceReport |
| `checkPIIMasking()` | Quick PII check | Masking statistics |
| `verifyRetentionPolicies()` | Quick retention check | Compliance statistics |
| `processRightToDeleteRequest()` | Handle deletion request | Request tracking |

## Type System

### Key Interfaces (9 total)
1. **PIIField** - PII field with masking info
2. **DataRetentionPolicy** - Retention settings and compliance
3. **RightToDeleteAudit** - Right-to-delete request tracking
4. **SOC2AuditTrail** - Individual audit entries
5. **AuditTrailMetrics** - Aggregated audit metrics
6. **ComplianceScore** - Framework compliance score
7. **ComplianceReport** - Complete compliance report
8. **ComplianceReporterParams** - Input parameters
9. **ComplianceReporterResult** - Output result wrapper

## Mock Data Included

| Category | Count | Status |
|----------|-------|--------|
| PII Fields | 6 | 1 unmasked (issue) |
| Retention Policies | 4 | 1 non-compliant |
| Right-to-Delete Requests | 3 | Mixed statuses |
| Audit Trail Actions | 125K+ | 0.8% failure rate |

## Configuration

| Parameter | Value |
|-----------|-------|
| Timeout | 3 minutes |
| Retries | 1 |
| Category | UTIL |
| Version | 1.0.0 |

## Compliance Scores

### LGPD Score Factors
- PII masking status (-5 per unmasked field)
- Retention policies (-10 per non-compliant)
- Auto-delete functionality (-5 per missing)

### GDPR Score Factors
- PII protection measures (-8 per unmasked)
- Storage limitation (-12 per non-compliant)
- Right-to-delete compliance (-10 per overdue)

### SOC2 Score Factors
- Audit trail completeness (-30 if none)
- Failure rate (-20 if >5%)
- User activity data (-15 if none)
- Access pattern concentration (-10 if high)

## Usage Examples

### Basic Full Report
```typescript
const skill = new SupabaseComplianceReporter();
const result = await skill.execute({
  frameworks: ['LGPD', 'GDPR', 'SOC2'],
  includePIIAudit: true,
  includeRetentionAudit: true,
  includeRightToDelete: true,
  includeAuditTrails: true
});
```

### LGPD Report Only
```typescript
const result = await skill.generateLGPDReport({});
console.log(result.data.frameworks.lgpd.score);
```

### GDPR Report Only
```typescript
const result = await skill.generateGDPRReport({});
console.log(result.data.frameworks.gdpr.recommendations);
```

### Quick PII Check
```typescript
const result = await skill.checkPIIMasking({
  tablesToAudit: ['users', 'profiles']
});
console.log(`${result.data.maskingRate}% masked`);
```

### Process Right-to-Delete
```typescript
const result = await skill.processRightToDeleteRequest({
  userId: 'user_123'
});
console.log(`Request: ${result.data.requestId}`);
```

## Key Exports

### Interfaces (9)
- `PIIField`
- `DataRetentionPolicy`
- `RightToDeleteAudit`
- `SOC2AuditTrail`
- `AuditTrailMetrics`
- `ComplianceScore`
- `ComplianceReport`
- `ComplianceReporterParams`
- `ComplianceReporterResult`

### Class (1)
- `SupabaseComplianceReporter`

## Dependencies

| Module | Purpose |
|--------|---------|
| `../skill-base` | Base Skill class |
| `./supabase-logger` | Structured logging |
| `./supabase-vault-config` | Credentials management |

## Input Parameters

```typescript
interface ComplianceReporterParams {
  supabaseUrl?: string;              // Optional Supabase URL
  supabaseKey?: string;              // Optional Supabase key
  frameworks?: ('LGPD'|'GDPR'|'SOC2')[]; // Frameworks (default: all)
  tablesToAudit?: string[];          // Tables to audit
  period?: {startDate, endDate};     // Date range
  includePIIAudit?: boolean;         // Include PII check
  includeRetentionAudit?: boolean;   // Include retention check
  includeRightToDelete?: boolean;    // Include deletion audit
  includeAuditTrails?: boolean;      // Include audit trails
  generateRecommendations?: boolean; // Generate recommendations
}
```

## Output Structure

```typescript
interface ComplianceReport {
  reportId: string;                   // Unique report ID
  generatedAt: string;                // Generation timestamp
  period: {startDate, endDate};       // Audit period
  frameworks: {
    lgpd: ComplianceScore,           // LGPD results
    gdpr: ComplianceScore,           // GDPR results
    soc2: ComplianceScore            // SOC2 results
  };
  piiFields: PIIField[];             // PII audit results
  dataRetentionPolicies: DataRetentionPolicy[]; // Policies
  rightToDeleteAudits: RightToDeleteAudit[];    // Deletions
  auditTrailMetrics: AuditTrailMetrics;        // Metrics
  overallComplianceScore: number;    // 0-100
  criticalFindings: number;           // Issue count
  recommendations: string[];          // Recommendations
  nextAuditDate?: string;            // Suggested audit date
  timestamp: string;                  // Report timestamp
}
```

## Recommendations Categories

### LGPD Recommendations
- Implement masking for unmasked PII
- Review and update retention policies
- Enable automated data deletion

### GDPR Recommendations
- Implement Article 32 data protection measures
- Ensure Article 5 storage limitation
- Process Article 17 deletion requests within 30 days
- Maintain Data Processing Agreements

### SOC2 Recommendations
- Maintain comprehensive audit logs
- Monitor unusual access patterns
- Implement automated alerting
- Reduce system failure rates

### General Recommendations
- Schedule quarterly compliance audits
- Train staff on data protection
- Maintain Data Processing Agreements
- Implement security measures
- Establish incident response procedures

## Compliance Status Meanings

| Status | Meaning | Score |
|--------|---------|-------|
| compliant | Meets framework requirements | >= 90 |
| partial | Some requirements not met | 70-89 |
| non-compliant | Significant gaps | < 70 |

## Error Handling

All methods:
- Validate Supabase credentials
- Handle missing data gracefully
- Return detailed error messages
- Log errors for debugging
- Never throw unhandled exceptions

## Documentation Files

1. **Skill Implementation:** `/mnt/c/Users/lucas/openclaw_aurora/skills/supabase-archon/supabase-compliance-reporter.ts` (31 KB)
2. **Full Documentation:** `/mnt/c/Users/lucas/openclaw_aurora/COMPLIANCE_REPORTER_S27_DOCUMENTATION.md` (19 KB)
3. **This Quick Reference:** This file

## Next Steps

1. Integrate with OpenClaw Aurora skill registry
2. Replace mock data with real Supabase queries
3. Add production logging endpoints
4. Create automated report scheduling
5. Integrate with notification system
6. Add dashboard visualization
7. Implement additional frameworks (HIPAA, ISO27001, CCPA)

## Support

For questions or issues:
- Check the full documentation for detailed examples
- Review mock data structure for expected output format
- Verify Supabase credentials are properly configured
- Check logs for detailed error messages
