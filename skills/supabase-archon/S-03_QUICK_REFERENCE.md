# S-03: Permission Diff Engine - Quick Reference

## At a Glance

**Name**: Supabase Permission Diff Engine
**Version**: 1.0.0
**Category**: UTIL
**Priority**: P1
**Status**: Production Ready (Mock Data)

---

## Quick Start

### Installation

```typescript
import { SupabasePermissionDiff } from './supabase-permission-diff';
```

### Basic Usage

```typescript
const skill = new SupabasePermissionDiff();
const result = await skill.run({ detectEscalations: true });

if (result.success) {
  console.log('Changes:', result.data?.changes.length);
  console.log('Escalations:', result.data?.escalations.length);
}
```

### With Baseline

```typescript
const result = await skill.run({
  baselinePath: './baselines/permissions.json',
  detectEscalations: true,
});
```

---

## What It Does

| Feature | Description |
|---------|-------------|
| **Change Detection** | Tracks grants, roles, and RLS policy changes |
| **Escalation Detection** | Identifies privilege escalations automatically |
| **Baseline Comparison** | Compares current state with saved baseline |
| **Severity Scoring** | Classifies changes (low/medium/high/critical) |
| **Export** | Save results as JSON or CSV |

---

## Key Methods

```typescript
// Main Analysis
execute(params: SkillInput): Promise<SkillOutput>

// Baseline Management
saveBaseline(params: SkillInput): Promise<boolean>

// Export Results
exportChanges(changes: PermissionChange[], format: 'json' | 'csv'): string
```

---

## Input Parameters

```typescript
{
  supabaseUrl?: string;        // Uses vault if not provided
  supabaseKey?: string;        // Uses vault if not provided
  baselinePath?: string;       // Path to baseline snapshot
  detectEscalations?: boolean; // Default: true
  compareWithTime?: string;    // ISO timestamp
}
```

---

## Output Structure

```typescript
{
  success: boolean;
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
  };
  error?: string;
}
```

---

## Severity Levels

| Level | Indicates | Examples |
|-------|-----------|----------|
| **Critical** | Dangerous escalations | public with DELETE, superuser escalation |
| **High** | Significant grants | DELETE, UPDATE on tables |
| **Medium** | Moderate changes | RLS modifications, role updates |
| **Low** | Harmless changes | Revoked permissions |

---

## Detected Changes

### Grants
- New grants added
- Grants removed
- Privileges modified

### Roles
- Attribute changes (superuser, canCreateRole)
- Membership changes
- Role additions/removals

### Policies
- RLS policy additions
- RLS policy removals
- Expression modifications

---

## Escalation Patterns

```typescript
Detected automatically:
- viewer → editor → admin
- public → authenticated
- authenticated → service_role
- DELETE/UPDATE on public/anon roles
- canCreateRole on untrusted roles
```

---

## Integration

### Registry
```typescript
registry.execute('supabase-permission-diff', params)
```

### Vault
```typescript
getVault().get('SUPABASE_URL')
getVault().get('SUPABASE_KEY')
```

### Logging
```typescript
this.logger.info('message', { context })
this.logger.error('message', { context })
```

---

## Common Tasks

### Check for Escalations
```typescript
const result = await skill.run({ detectEscalations: true });
if (result.data?.escalations.length > 0) {
  // Alert!
}
```

### Export Changes
```typescript
const csv = skill.exportChanges(result.data?.changes, 'csv');
fs.writeFileSync('changes.csv', csv);
```

### Compare with Baseline
```typescript
const result = await skill.run({
  baselinePath: './baseline.json'
});
```

### Save Current State
```typescript
await skill.saveBaseline({
  baselinePath: './new-baseline.json'
});
```

---

## File Locations

```
/mnt/c/Users/lucas/openclaw_aurora/skills/supabase-archon/
├── supabase-permission-diff.ts    (Main implementation)
├── test-permission-diff.ts        (Usage examples)
├── PERMISSION_DIFF_GUIDE.md       (Full documentation)
├── USAGE_EXAMPLES.md              (14+ examples)
├── S-03_IMPLEMENTATION_SUMMARY.md (Technical details)
└── S-03_QUICK_REFERENCE.md        (This file)
```

---

## Mock Data Included

**Current State**:
- 4 grants (multi-role, multi-table)
- 3 roles (authenticated, anon, service_role)
- 2 RLS policies

**Baseline**:
- Similar with differences to show changes
- Demonstrates escalations
- Shows permission modifications

---

## Performance

| Aspect | Value |
|--------|-------|
| Timeout | 60 seconds |
| Complexity | O(n) where n = permissions |
| Memory | O(n) for snapshots |
| Execution | < 1 second (mock data) |

---

## Error Handling

```typescript
if (!result.success) {
  console.error(result.error);
  // Handle error
}
```

Common errors:
- "Supabase credentials not found in params or vault"
- File I/O errors (missing baseline)
- Invalid parameters

---

## Logging

All operations logged:
```
[permission-diff] INFO: Permission Diff initiated
[permission-diff] DEBUG: Fetching permissions
[permission-diff] WARN: Escalations detected
[permission-diff] ERROR: Failed to load baseline
```

---

## Best Practices

1. **Schedule regularly** - Daily checks recommended
2. **Save baselines** - After approved permission changes only
3. **Review changes** - Always verify before updating baseline
4. **Export logs** - Keep audit trail
5. **Set alerts** - Notify on escalations
6. **Document** - Record all permission changes
7. **Test** - Verify in dev/staging first

---

## Escalation Alert Example

```typescript
if (result.data?.summary.escalationDetected) {
  await sendAlert({
    severity: 'CRITICAL',
    message: 'Permission escalation detected!',
    details: result.data?.escalations,
  });
}
```

---

## Export Examples

### CSV Export
```typescript
const csv = skill.exportChanges(changes, 'csv');
// timestamp,type,action,objectName,grantee,privilege,severity
// 2026-02-06T10:30:00Z,grant,added,users,authenticated,SELECT,low
```

### JSON Export
```typescript
const json = skill.exportChanges(changes, 'json');
// [{ type: "grant", action: "added", ... }]
```

---

## Event Listeners

```typescript
skill.on('start', (data) => { /* started */ });
skill.on('complete', (data) => { /* finished */ });
skill.on('error', (data) => { /* failed */ });
```

---

## Related Skills

- **S-01**: Schema Sentinel - Schema changes
- **S-02**: RLS Auditor - RLS policies
- **S-04**: Secrets Scanner - Exposed secrets

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No changes detected | Check baseline path and comparison time |
| False escalations | Review baseline accuracy |
| Performance slow | Run during off-peak hours |
| Credential errors | Check vault configuration |

---

## Resources

- [Full Guide](./PERMISSION_DIFF_GUIDE.md) - Comprehensive documentation
- [Usage Examples](./USAGE_EXAMPLES.md) - 14+ real-world examples
- [Implementation Summary](./S-03_IMPLEMENTATION_SUMMARY.md) - Technical details
- [Verification Checklist](./S-03_VERIFICATION_CHECKLIST.md) - Quality assurance

---

## Version Info

- **Version**: 1.0.0
- **Release Date**: 2026-02-06
- **Status**: Production Ready (Mock Data)
- **Next Version**: TBD (Real API)

---

## Support

For issues or questions:
1. Check [PERMISSION_DIFF_GUIDE.md](./PERMISSION_DIFF_GUIDE.md)
2. Review [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md)
3. See [test-permission-diff.ts](./test-permission-diff.ts)

---

## Quick Copy-Paste Templates

### Template 1: Daily Check
```typescript
const skill = new SupabasePermissionDiff();
const result = await skill.run({ detectEscalations: true });
if (result.data?.escalations.length > 0) {
  // Alert on escalations
}
```

### Template 2: Audit Report
```typescript
const result = await skill.run({});
const csv = skill.exportChanges(result.data!.changes, 'csv');
fs.writeFileSync('audit.csv', csv);
```

### Template 3: Baseline Update
```typescript
const result = await skill.run({});
if (result.success) {
  await skill.saveBaseline({});
}
```

---

**Last Updated**: 2026-02-06
**Created for**: OpenClaw Aurora - Supabase Archon Suite
