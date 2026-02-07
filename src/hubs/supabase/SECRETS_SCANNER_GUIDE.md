# Supabase Secrets Scanner (S-04) - Guide

## Overview

The Secrets Scanner is a production-ready security skill that scans your codebase for exposed credentials and secrets. It detects:

- **Supabase API Keys** (anon keys, service role keys)
- **Database Connection Strings** (PostgreSQL, MongoDB)
- **Passwords & Passphrases**
- **Authentication Tokens** (JWT, OAuth, API tokens)
- **Git History Artifacts** (optional)

## Features

### Detection Capabilities

1. **API Keys**
   - Supabase API keys
   - OpenAI API keys
   - Generic API keys with patterns like `sk_live_`, `pk_live_`

2. **Connection Strings**
   - PostgreSQL/Postgres connections
   - MongoDB connections
   - Any database URI with credentials

3. **Passwords**
   - Environment variable passwords
   - Config file passwords
   - Inline password assignments

4. **Tokens**
   - JWT tokens
   - Bearer tokens
   - GitHub, Slack, Discord, Telegram tokens
   - Refresh/Access tokens
   - Webhook tokens

### Smart Scanning

- **File Pattern Matching**: Automatically scans `.env*`, config files, source code
- **Recursive Directory Traversal**: Finds secrets deep in nested directories
- **Exclusion Rules**: Skips `node_modules`, `.git`, `dist`, etc.
- **Git History Scanning**: Optional deep scan of git commit history (warning: slow)
- **Line Numbering**: Reports exact location of exposure
- **Severity Classification**: Critical, High, Medium levels

## Usage

### Basic Scan

```typescript
import { SupabaseSecretsScanner } from './supabase-secrets-scanner';

const scanner = new SupabaseSecretsScanner();

const result = await scanner.run({
  scanPath: '/path/to/project',
});

console.log(result.data?.secrets);
// [{
//   type: 'api_key',
//   file: '/path/to/.env',
//   line: 5,
//   snippet: 'SUPABASE_KEY=***[MASKED]***',
//   severity: 'critical',
//   recommendation: 'Move API key to environment variables or use Supabase vault'
// }]
```

### Custom File Patterns

```typescript
const result = await scanner.run({
  scanPath: '/path/to/project',
  filePatterns: [
    '**/.env*',
    '**/config.json',
    '**/database.yml',
    '**/secrets/**',
  ],
});
```

### Include Git History

```typescript
const result = await scanner.run({
  scanPath: '/path/to/project',
  includeGitHistory: true, // Deep scan of git history
});
```

## Response Format

### Success Response

```typescript
{
  success: true,
  data: {
    secrets: ExposedSecret[],
    filesScanned: number,
    patternsMatched: number
  }
}
```

### ExposedSecret Object

```typescript
interface ExposedSecret {
  type: 'api_key' | 'connection_string' | 'password' | 'token';
  file: string;                    // File path
  line: number;                    // Line number
  snippet: string;                 // Masked snippet (max 200 chars)
  severity: 'critical' | 'high' | 'medium';
  recommendation: string;          // Action to take
}
```

## Integration Examples

### 1. In CI/CD Pipeline (GitHub Actions)

```yaml
name: Security Check
on: [pull_request, push]

jobs:
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: |
          npm install
          node -r ts-node -e "
            import { SupabaseSecretsScanner } from './skills/supabase-archon/supabase-secrets-scanner';
            const scanner = new SupabaseSecretsScanner();
            scanner.run({ scanPath: '.', includeGitHistory: false })
              .then(r => {
                if (r.data?.secrets.length) {
                  console.error('SECRETS FOUND!');
                  process.exit(1);
                }
              });
          "
```

### 2. Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

node -r ts-node -e "
  import { SupabaseSecretsScanner } from './skills/supabase-archon/supabase-secrets-scanner';
  const scanner = new SupabaseSecretsScanner();
  scanner.run({ scanPath: '.', includeGitHistory: false })
    .then(r => {
      if (r.data?.secrets.length) {
        console.error('Commit blocked: Secrets detected');
        r.data.secrets.forEach(s => {
          console.error(\`  \${s.file}:\${s.line} - \${s.type}\`);
        });
        process.exit(1);
      }
    });
"
```

### 3. Scheduled Security Audits

```typescript
// Run hourly audit
setInterval(async () => {
  const scanner = new SupabaseSecretsScanner();
  const result = await scanner.run({
    scanPath: '/var/app',
    includeGitHistory: false,
  });

  if (result.data?.secrets.length) {
    // Send alert to Telegram, Slack, etc.
    await alertSecurityTeam(result.data.secrets);
  }
}, 3600000); // Every hour
```

## Configuration

### Tuning Detection Sensitivity

The skill comes with production-ready patterns that balance detection accuracy with false positives. Patterns can be customized by extending the class:

```typescript
class CustomSecretsScanner extends SupabaseSecretsScanner {
  private readonly PATTERNS = {
    // Add custom patterns
    api_key: [
      /custom_pattern_here/gi,
      ...super['PATTERNS'].api_key,
    ],
  };
}
```

### Excluding Paths

Currently excludes:
- `node_modules/**`
- `.git/**`
- `dist/**`
- `build/**`
- `.next/**`
- `venv/**`
- `.cache/**`

To customize, extend the class:

```typescript
class CustomSecretsScanner extends SupabaseSecretsScanner {
  private readonly EXCLUDED_PATTERNS = [
    ...super['EXCLUDED_PATTERNS'],
    'custom-ignored-dir/**',
  ];
}
```

## Security Considerations

### What This Skill Does

- Scans files on disk
- Matches regex patterns
- Reports findings with masked snippets
- Logs to stdout (JSON format)

### What This Skill Does NOT Do

- Does NOT send files to external services
- Does NOT store secrets
- Does NOT modify files
- Does NOT commit to git

### Best Practices

1. **Run Before Deployment**: Always scan before pushing to production
2. **Check Git History**: Use `includeGitHistory: true` on critical repos
3. **Rotate Exposed Secrets**: Immediately rotate any detected credentials
4. **Use `.gitignore`**: Ensure `.env*` files are in `.gitignore`
5. **Use Vaults**: Store secrets in Supabase vault or environment variables

## Performance

- **Typical Scan**: 100-500ms for standard projects
- **Large Projects**: 2-5 seconds for 10k+ files
- **Git History Scan**: 30+ seconds depending on repo size
- **Memory**: ~50-100MB for large codebases

## Limitations

1. **Pattern-Based**: Relies on regex patterns; not AI-based detection
2. **False Positives**: May flag benign patterns (commented examples, docs)
3. **Encoding**: Only scans UTF-8 text files
4. **Performance**: Git history scan is slow on large repos
5. **Binary Files**: Cannot scan binary files

## Troubleshooting

### Scanner Not Finding Files

```typescript
// Check what files are being scanned
const result = await scanner.run({
  scanPath: '/path',
  filePatterns: ['**/.env*'], // Verify patterns
});

console.log(`Scanned ${result.data?.filesScanned} files`);
```

### False Positives

If getting false positives on commented examples or documentation:

```typescript
// Exclude those files
const result = await scanner.run({
  scanPath: '/path',
  filePatterns: [
    '**/.env*',
    '**/config.json',
    // Don't include:
    // '**/*.md' - skip documentation
  ],
});
```

### Git History Scan Too Slow

```typescript
// Start without git history for faster feedback
const result = await scanner.run({
  scanPath: '/path',
  includeGitHistory: false, // Skip initially
});

// Run separately with longer timeout
scanner.config.timeout = 300000; // 5 minutes
await scanner.run({
  scanPath: '/path',
  includeGitHistory: true,
});
```

## Response Examples

### Example 1: No Secrets Found

```json
{
  "success": true,
  "data": {
    "secrets": [],
    "filesScanned": 24,
    "patternsMatched": 0
  },
  "duration": 342
}
```

### Example 2: Secrets Detected

```json
{
  "success": true,
  "data": {
    "secrets": [
      {
        "type": "api_key",
        "file": "/app/.env.production",
        "line": 3,
        "snippet": "SUPABASE_KEY=***[MASKED]***",
        "severity": "critical",
        "recommendation": "Move API key to environment variables or use Supabase vault"
      },
      {
        "type": "connection_string",
        "file": "/app/config/db.json",
        "line": 12,
        "snippet": "postgres://***[MASKED]***",
        "severity": "critical",
        "recommendation": "Store connection strings in environment variables, never in code"
      }
    ],
    "filesScanned": 24,
    "patternsMatched": 2
  },
  "duration": 456
}
```

## Related Skills

- **S-01**: Schema Sentinel - Monitor schema changes
- **S-02**: Policy Guardian - RLS policy validation
- **S-03**: Index Wizard - Performance optimization
- **S-05**: Audit Logger - Comprehensive audit logging

## Support & Issues

For issues or feature requests:
1. Check existing patterns match your secret types
2. Verify file paths and patterns are correct
3. Check logs for regex compile errors
4. Enable debug logging with `logger.debug()`

---

**Version**: 1.0.0
**Last Updated**: 2026-02-06
**Status**: Production Ready
