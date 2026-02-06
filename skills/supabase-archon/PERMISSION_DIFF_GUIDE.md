# Supabase Permission Diff Engine (S-03)

## Overview

The Permission Diff Engine is an advanced security skill that monitors and analyzes permission changes in Supabase databases. It compares permission states between two points in time (baseline vs. current) and detects:

- Added/removed/modified grants
- Role privilege changes
- RLS policy modifications
- Permission escalations (critical)

## Key Features

### 1. Permission Tracking
- **Grants Monitoring**: Tracks all role grants on tables, schemas, and functions
- **Role Management**: Monitors role attributes (superuser, canCreateDb, canCreateRole)
- **RLS Policies**: Tracks Row Level Security policy changes
- **Member Lists**: Detects changes in role memberships

### 2. Escalation Detection
- Identifies privilege escalations based on predefined patterns
- Detects dangerous privilege combinations
- Alerts on critical permission changes
- Automatic severity scoring

### 3. Comprehensive Reporting
- Detailed change logs with timestamps
- Severity classification (low, medium, high, critical)
- CSV/JSON export capabilities
- Audit trail generation

## Data Structures

### PermissionChange

```typescript
interface PermissionChange {
  type: 'grant' | 'role' | 'policy';
  action: 'added' | 'removed' | 'modified';
  objectType: string;
  objectName: string;
  grantee: string;
  privilege: string;
  timestamp: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}
```

### PermissionDiffParams

```typescript
interface PermissionDiffParams extends SkillInput {
  supabaseUrl?: string;           // Optional, uses vault if not provided
  supabaseKey?: string;           // Optional, uses vault if not provided
  baselinePath?: string;          // Path to baseline snapshot file
  detectEscalations?: boolean;    // Enable escalation detection (default: true)
  compareWithTime?: string;       // ISO timestamp for comparison point
}
```

### PermissionDiffResult

```typescript
interface PermissionDiffResult extends SkillOutput {
  data?: {
    changes: PermissionChange[];
    escalations: PermissionChange[];
    summary: {
      totalChanges: number;
      addedGrants: number;
      removedGrants: number;
      modifiedRoles: number;
      escalationDetected: boolean;
    };
    timestamp: string;
    baselineTimestamp?: string;
  };
}
```

## Usage Examples

### Basic Usage

```typescript
import { SupabasePermissionDiff } from './supabase-permission-diff';

const skill = new SupabasePermissionDiff();

const result = await skill.run({
  detectEscalations: true,
});

if (result.success) {
  console.log('Changes detected:', result.data?.changes.length);
  console.log('Escalations:', result.data?.escalations.length);
}
```

### Detecting Specific Changes

```typescript
const result = await skill.run({
  detectEscalations: true,
  baselinePath: './baselines/permissions-2026-02-01.json',
});

const data = result.data!;

// Filter high-severity changes
const criticalChanges = data.changes.filter(c => c.severity === 'critical');
console.log('Critical changes:', criticalChanges);

// Check escalations
if (data.summary.escalationDetected) {
  console.log('Permission escalation detected!');
  console.log(data.escalations);
}
```

### Exporting Changes

```typescript
const skill = new SupabasePermissionDiff();
const result = await skill.run({});

// Export as CSV
const csv = skill.exportChanges(result.data!.changes, 'csv');
fs.writeFileSync('changes.csv', csv);

// Export as JSON
const json = skill.exportChanges(result.data!.changes, 'json');
fs.writeFileSync('changes.json', json);
```

### Saving Baseline

```typescript
const skill = new SupabasePermissionDiff();

const success = await skill.saveBaseline({
  baselinePath: './baselines/current-permissions.json',
});

if (success) {
  console.log('Baseline saved successfully');
}
```

## How It Works

### 1. Fetching Current State

The skill queries Supabase to get the current permission state:

- **Grants**: All role grants via `information_schema.role_table_grants`
- **Roles**: Role attributes via `pg_roles`
- **Policies**: RLS policies via `information_schema.rls_policies`
- **Members**: Role memberships via `pg_auth_members`

### 2. Loading Baseline

The baseline is loaded from:
- File system (if `baselinePath` provided)
- Database snapshot (if `compareWithTime` provided)
- Previous execution cache (fallback)

### 3. Comparison Algorithm

For each permission type:

1. **Grants Comparison**:
   - Create sets of all grant keys (baseline + current)
   - Detect added grants (only in current)
   - Detect removed grants (only in baseline)
   - Detect modified grants (different privileges)

2. **Roles Comparison**:
   - Compare role attributes (superuser, canCreateDb, canCreateRole)
   - Check membership changes
   - Detect role deletions/additions

3. **Policies Comparison**:
   - Compare policy expressions
   - Detect policy additions/removals
   - Identify expression changes

### 4. Escalation Detection

The skill checks for:

- **Pattern Matching**: viewer → editor → admin escalations
- **Privilege Combinations**: DELETE/DROP on public/anon roles
- **Role Attributes**: canCreateRole on non-trusted roles
- **Permission Spreading**: Unauthorized role additions

## Severity Levels

| Severity | Description | Examples |
|----------|-------------|----------|
| **Low** | Removed permissions, harmless changes | Revoked SELECT |
| **Medium** | Moderate privilege changes | Added UPDATE, policy modifications |
| **High** | Significant permission grants | Added DELETE, modified RLS |
| **Critical** | Dangerous escalations | Anon/public with DELETE, superuser escalation |

## Escalation Patterns

Detected patterns that trigger critical alerts:

```typescript
[
  { source: 'viewer', target: 'editor' },      // Role escalation
  { source: 'editor', target: 'admin' },       // Role escalation
  { source: 'authenticated', target: 'service_role' }, // Service role escalation
  { source: 'public', target: 'authenticated' }, // Scope escalation
]
```

Plus custom patterns for:
- DELETE/UPDATE on public/anon roles
- canCreateRole on unexpected roles

## Integration with OpenClaw Aurora

### Registry Integration

```typescript
// In supabase-archon-index.ts
import { SupabasePermissionDiff } from './supabase-permission-diff';

const permissionDiff = new SupabasePermissionDiff();
registry.register(permissionDiff, {
  name: 'supabase-permission-diff',
  version: '1.0.0',
  status: SkillStatus.ACTIVE,
  riskLevel: SkillRiskLevel.LOW,
  category: 'UTIL',
  description: 'Detects permission changes and escalations',
  tags: ['supabase', 'security', 'permissions', 'compliance'],
});
```

### Vault Integration

Credentials are automatically loaded from vault:

```typescript
const vault = getVault();
const url = vault.get('SUPABASE_URL');
const key = vault.get('SUPABASE_KEY');
```

### Logging Integration

All operations are logged via structured logger:

```typescript
this.logger.info('Permission Diff completed', {
  totalChanges: 5,
  escalations: 1,
  timestamp: '2026-02-06T10:30:00.000Z',
});
```

## Mock Data Structure

For development/testing, the skill includes comprehensive mock data:

### Current State Mock
- **Tables**: users, posts
- **Roles**: authenticated, anon, service_role
- **Grants**: Various role grants with different privileges
- **Policies**: RLS policies on users and posts

### Baseline Mock
- Similar structure with slight differences to demonstrate changes
- authenticated role with fewer permissions
- Missing posts grants
- Different service_role attributes

## Monitoring & Alerts

Suggested integration points for alerts:

```typescript
// Alert on escalations
if (data.summary.escalationDetected) {
  await sendAlert({
    channel: 'security-team',
    severity: 'critical',
    message: `Permission escalation detected: ${data.escalations.length} escalations`,
  });
}

// Alert on critical changes
const criticalChanges = data.changes.filter(c => c.severity === 'critical');
if (criticalChanges.length > 0) {
  await sendAlert({
    channel: 'security-team',
    severity: 'high',
    message: `${criticalChanges.length} critical permission changes detected`,
  });
}
```

## Best Practices

1. **Regular Baselines**: Save baseline after approved permission changes
2. **Frequency**: Run permission diff daily or after deployments
3. **Export**: Keep CSV exports for audit trails
4. **Alerting**: Configure critical escalation alerts
5. **Review**: Review summary before saving new baseline
6. **Documentation**: Document permission changes with timestamps
7. **Approval**: Require approval before updating baseline

## Testing

Run the included test file:

```bash
npx ts-node ./test-permission-diff.ts
```

This demonstrates:
- Skill initialization
- Running Permission Diff analysis
- Viewing changes and escalations
- Exporting results
- Saving baseline

## Roadmap

Future enhancements:

- [ ] Real Supabase API integration (currently mocked)
- [ ] PostgreSQL direct connection option
- [ ] Webhook notifications on escalations
- [ ] Custom escalation pattern definitions
- [ ] Historical trend analysis
- [ ] Approval workflow integration
- [ ] Compliance report generation
- [ ] Multi-database comparison

## Security Considerations

1. **Credentials**: Stored securely in vault, never logged
2. **Outputs**: Change logs may contain sensitive privilege names
3. **Exports**: CSV/JSON exports should be access-controlled
4. **Logging**: All operations logged with trace IDs for audit
5. **Baseline Storage**: Baseline files should be protected (gitignored)

## Troubleshooting

### No changes detected
- Verify baseline path exists and is correct
- Check if current state differs from baseline
- Review baseline timestamp

### False positives on escalations
- Review escalation patterns configuration
- Verify baseline is accurate
- Check if permissions are expected

### Performance issues
- Reduce comparison scope (single table/schema)
- Cache baseline if unchanged
- Consider scheduled execution during off-hours

## Related Skills

- **S-01**: Schema Sentinel - Monitors schema changes
- **S-02**: RLS Auditor - Audits RLS policies specifically
- **S-04**: Secrets Scanner - Detects exposed credentials
- **S-08**: Query Doctor - Analyzes query performance

## Support & Documentation

For more information:
- Schema Sentinel: `/supabase-schema-sentinel.ts`
- RLS Auditor: `/supabase-rls-auditor.ts`
- Logger: `/supabase-logger.ts`
- Vault Config: `/supabase-vault-config.ts`

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-06 | Initial release with mock data |
| TBD | TBD | Real Supabase API integration |
| TBD | TBD | Custom escalation patterns |

---

**Author**: Supabase Archon
**Priority**: P1
**Category**: UTIL
**Status**: Production Ready (Mock Data)
