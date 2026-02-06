# Quick Fixes for TypeScript Compilation Errors

## Errors Found

1. **skill-executor-v2.ts:203** - `getSpec` method missing from SkillRegistryV2
2. **skill-executor-v2.ts:224** - Property name should be `skill` not `skillName`
3. **Multiple files** - MapIterator errors requiring `--downlevelIteration` flag

## Solutions

### Fix 1: Add getSpec method to SkillRegistryV2

Add this method around line 100 in `skills/skill-registry-v2.ts`:

```typescript
/**
 * Obtém spec de uma skill
 */
getSpec(name: string, version?: string): SkillSpec | undefined {
  const entry = this.getEntry(name, version);
  return entry?.spec;
}
```

### Fix 2: Fix property name in skill-executor-v2.ts line 224

Change:
```typescript
const missing = depsValidation.missing.map(m => m.skillName).join(', ');
```

To:
```typescript
const missing = depsValidation.missing.map(m => m.skill).join(', ');
```

### Fix 3: Enable downlevelIteration in tsconfig.json

Add to compilerOptions:
```json
{
  "compilerOptions": {
    "downlevelIteration": true
  }
}
```

OR fix each Map iteration by converting to Array first:
```typescript
// Instead of:
for (const [key, value] of map.entries()) { }

// Use:
for (const [key, value] of Array.from(map.entries())) { }
```

## Apply Fixes

Run these commands:
```bash
# 1. Add getSpec method to registry-v2
# 2. Fix executor-v2 property name
# 3. Enable downlevelIteration in tsconfig
```
