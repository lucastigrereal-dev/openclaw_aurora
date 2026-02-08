# Supabase Secrets Scanner (S-04) - Architecture Diagram

## Class Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     Skill (Base Class)                      │
│  ─────────────────────────────────────────────────────────  │
│  - metadata: SkillMetadata                                  │
│  - config: SkillConfig                                      │
│  + abstract execute(): Promise<SkillOutput>                 │
│  + validate(): boolean                                      │
│  + run(): Promise<SkillOutput> (with metrics)               │
│  + enable/disable()                                         │
└────────────────────────────▲────────────────────────────────┘
                             │
                             │ extends
                             │
┌────────────────────────────┴────────────────────────────────┐
│           SupabaseSecretsScanner extends Skill              │
│  ─────────────────────────────────────────────────────────  │
│  PROPERTIES:                                                 │
│  - logger: SupabaseLogger                                   │
│  - PATTERNS: Record<string, RegExp[]>                       │
│  - DEFAULT_PATTERNS: string[]                               │
│  - EXCLUDED_PATTERNS: string[]                              │
│  ─────────────────────────────────────────────────────────  │
│  PUBLIC METHODS:                                             │
│  + execute(params): Promise<SecretscannerResult>            │
│  + validate(input): boolean                                 │
│  ─────────────────────────────────────────────────────────  │
│  PRIVATE METHODS:                                            │
│  - scanFile(filePath): ExposedSecret[]                      │
│  - scanGitHistory(scanPath): ExposedSecret[]                │
│  - scanDirectoryForFiles(dir, patterns): string[]           │
│  - walkDirectory(dir, pattern, results): void               │
│  - isExcluded(pathStr): boolean                             │
│  - matchesPattern(line, patterns): boolean                  │
│  - maskSecret(snippet): string                              │
│  - groupBySeverity(secrets): Record<string, number>         │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────────────────┐
│   Input Parameters   │
│ ─────────────────── │
│ scanPath: string    │
│ filePatterns?: []   │
│ includeGitHistory?  │
└──────────┬───────────┘
           │
           ▼
    ┌─────────────────────────────────────┐
    │    validate(input): boolean          │
    │ ─────────────────────────────────── │
    │ ✓ scanPath exists?                  │
    │ ✓ scanPath is directory?            │
    └──────────┬──────────────────────────┘
               │
        ┌──────▼──────┐
        │   Valid?    │
        └──┬───────┬──┘
          NO      YES
           │       │
       Error      ▼
           │  ┌──────────────────────────────────────┐
           │  │  scanDirectoryForFiles()             │
           │  │ ──────────────────────────────────  │
           │  │ 1. Get patterns (default or custom)  │
           │  │ 2. Walk directory tree               │
           │  │ 3. Match files against patterns      │
           │  │ 4. Exclude unwanted dirs             │
           │  │ Returns: string[] (file paths)       │
           │  └──────────────┬───────────────────────┘
           │                 │
           │                 ▼
           │    ┌────────────────────────┐
           │    │  For each file found   │
           │    └────────────┬───────────┘
           │                 │
           │                 ▼
           │    ┌──────────────────────────────┐
           │    │    scanFile(filePath)        │
           │    │ ──────────────────────────  │
           │    │ 1. Read file content         │
           │    │ 2. Split into lines          │
           │    │ 3. For each line:            │
           │    │    - Skip empty/comments     │
           │    │    - Check against patterns: │
           │    │      • API keys              │
           │    │      • Connection strings    │
           │    │      • Passwords             │
           │    │      • Tokens                │
           │    │ 4. Create ExposedSecret      │
           │    │ Returns: ExposedSecret[]     │
           │    └──────────┬──────────────────┘
           │               │
           │               ▼
           │    ┌─────────────────────────────────┐
           │    │   Pattern Matching              │
           │    │ ──────────────────────────────  │
           │    │ matchesPattern(line, patterns)  │
           │    │ - Run regex against line       │
           │    │ - Reset regex state            │
           │    │ - Return boolean               │
           │    └──────────┬────────────────────┘
           │               │
           │               ▼
           │    ┌─────────────────────────────────┐
           │    │   Secret Masking                │
           │    │ ──────────────────────────────  │
           │    │ maskSecret(snippet)             │
           │    │ - Replace secrets with masks    │
           │    │ - Preserve context              │
           │    │ - Limit length to 200 chars     │
           │    └──────────┬────────────────────┘
           │               │
           │               ▼
           │    ┌─────────────────────────────────┐
           │    │  Create ExposedSecret Object    │
           │    │ ──────────────────────────────  │
           │    │ - type (api_key, etc)           │
           │    │ - file (path)                   │
           │    │ - line (number)                 │
           │    │ - snippet (masked)              │
           │    │ - severity (critical/high)      │
           │    │ - recommendation                │
           │    └──────────┬────────────────────┘
           │               │
           │    ┌──────────▼──────────┐
           │    │ Accumulate Secrets  │
           │    └──────────┬──────────┘
           │               │
           │    ┌──────────▼──────────────────┐
           │    │ includeGitHistory? Check    │
           │    └──┬──────────────────┬───────┘
           │      YES               NO
           │       │                 │
           │       ▼                 ▼
           │  ┌──────────────┐  ┌─────────────┐
           │  │scanGitHistory│  │Skip git     │
           │  │for secrets   │  │scan         │
           │  └──┬───────────┘  │             │
           │     │              └──┬──────────┘
           │     └──────────┬───────┘
           │                ▼
           │    ┌───────────────────────────────┐
           │    │  groupBySeverity()            │
           │    │ ─────────────────────────────  │
           │    │ Count secrets by severity:    │
           │    │ - critical                    │
           │    │ - high                        │
           │    │ - medium                      │
           │    └───────────┬───────────────────┘
           │                │
           └────────┬───────┘
                    ▼
           ┌────────────────────────────┐
           │  Return SecretscannerResult │
           │ ───────────────────────── │
           │ success: boolean           │
           │ data?: {                   │
           │   secrets: ExposedSecret[] │
           │   filesScanned: number     │
           │   patternsMatched: number  │
           │ }                          │
           └────────────────────────────┘
```

## Pattern Matching Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PATTERNS Object                          │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  api_key: RegExp[]                                          │
│  ├─ /SUPABASE_KEY\s*[:=].../ (CRITICAL)                    │
│  ├─ /SUPABASE_ANON_KEY\s*[:=].../ (CRITICAL)               │
│  ├─ /sk_live_[a-zA-Z0-9]+/ (OpenAI)                       │
│  └─ /pk_live_[a-zA-Z0-9]+/ (Generic)                      │
│                                                              │
│  connection_string: RegExp[]                                │
│  ├─ /postgresql:\/\/[user:pass@host:port]/ (CRITICAL)     │
│  ├─ /postgres:\/\/[user:pass@host:port]/ (CRITICAL)       │
│  └─ /mongodb\+srv:\/\/[user:pass@host]/ (CRITICAL)        │
│                                                              │
│  password: RegExp[]                                         │
│  ├─ /password\s*[:=]\s*['"][^'"]+['"]/ (HIGH)             │
│  ├─ /passwd\s*[:=]\s*['"][^'"]+['"]/ (HIGH)               │
│  ├─ /pwd\s*[:=]\s*['"][^'"]+['"]/ (HIGH)                  │
│  └─ /SUPABASE_PASSWORD\s*[:=].../ (HIGH)                  │
│                                                              │
│  token: RegExp[]                                            │
│  ├─ /jwt\s*[:=].*\..*\./ (JWT - HIGH)                     │
│  ├─ /bearer\s+[a-zA-Z0-9]/ (Bearer - HIGH)                │
│  ├─ /github[_-]?token\s*[:=]/ (GitHub - HIGH)             │
│  ├─ /slack[_-]?token\s*[:=]/ (Slack - HIGH)               │
│  ├─ /discord[_-]?token\s*[:=]/ (Discord - HIGH)           │
│  ├─ /telegram[_-]?token\s*[:=]/ (Telegram - HIGH)         │
│  └─ /webhook[_-]?token\s*[:=]/ (Webhook - HIGH)           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## File Scanning Architecture

```
┌──────────────────────────────────┐
│     scanDirectoryForFiles()       │
└──────────────────┬───────────────┘
                   │
        ┌──────────▼──────────────────────────────────┐
        │ DEFAULT_PATTERNS or Custom Patterns         │
        │ ─────────────────────────────────────────  │
        │ [                                           │
        │   '**/.env',                                │
        │   '**/.env.local',                          │
        │   '**/.env.*.local',                        │
        │   '**/config.json',                         │
        │   '**/config.yaml',                         │
        │   '**/secrets.json',                        │
        │   ... (14 total)                            │
        │ ]                                           │
        └──────────┬───────────────────────────────────┘
                   │
        ┌──────────▼────────────────────────────────────┐
        │ For each pattern:                             │
        │ ────────────────────────────────────────────  │
        │ If pattern contains '**':                     │
        │   → Call walkDirectory() (recursive)          │
        │ Else:                                         │
        │   → Direct path match                        │
        └──────────┬───────────────────────────────────┘
                   │
        ┌──────────▼──────────────────────────────────────┐
        │ walkDirectory(dir, pattern, results)            │
        │ ────────────────────────────────────────────── │
        │ 1. List directory entries                       │
        │ 2. For each entry:                             │
        │    - Skip if in EXCLUDED_PATTERNS              │
        │    - If directory: recurse                     │
        │    - If file: match against pattern            │
        │ 3. Add matches to results array                │
        │ 4. Return array                                │
        └──────────┬──────────────────────────────────────┘
                   │
        ┌──────────▼──────────────────────────────────────┐
        │ EXCLUDED_PATTERNS Filtering                     │
        │ ────────────────────────────────────────────── │
        │ Automatically skip:                             │
        │ • node_modules/**      (dependencies)          │
        │ • .git/**              (version control)       │
        │ • dist/**              (build output)          │
        │ • build/**             (build output)          │
        │ • .next/**             (Next.js)               │
        │ • .venv/**             (Python env)            │
        │ • venv/**              (Python env)            │
        │ • *.pyc                (Python compiled)       │
        │ • .DS_Store            (macOS metadata)        │
        │ • coverage/**          (test coverage)         │
        │ • .cache/**            (cache)                 │
        └──────────┬──────────────────────────────────────┘
                   │
        ┌──────────▼──────────────────────────────────────┐
        │ Return unique file paths:                       │
        │ ────────────────────────────────────────────── │
        │ [                                              │
        │   '/app/.env',                                 │
        │   '/app/.env.production',                      │
        │   '/app/config/config.json',                   │
        │   ...                                          │
        │ ]                                              │
        └──────────────────────────────────────────────────┘
```

## Severity Classification

```
┌──────────────────────────────────────────────────────────┐
│           SEVERITY Levels & Classification               │
│  ────────────────────────────────────────────────────── │
│                                                          │
│  CRITICAL:                                              │
│  ├─ API Keys (Supabase, OpenAI, etc)                   │
│  │  └─ Impact: Full service access                     │
│  │  └─ Recommendation: Rotate immediately              │
│  │                                                      │
│  └─ Connection Strings                                 │
│     └─ Impact: Database access                        │
│     └─ Recommendation: Change credentials              │
│                                                          │
│  HIGH:                                                  │
│  ├─ Passwords                                          │
│  │  └─ Impact: Account compromise                      │
│  │  └─ Recommendation: Change password                │
│  │                                                      │
│  └─ Authentication Tokens                              │
│     └─ Impact: Impersonation/data access              │
│     └─ Recommendation: Rotate token                    │
│                                                          │
│  MEDIUM:                                                │
│  └─ Unconfirmed patterns                               │
│     └─ Impact: Potentially sensitive                   │
│     └─ Recommendation: Manual review                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Logging Flow

```
┌──────────────────────────────────────────────────────┐
│         All operations logged via Logger             │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  createLogger('secrets-scanner')                    │
│  │                                                   │
│  ├─ logger.info('Secrets Scanner iniciado', {...}) │
│  │                                                   │
│  ├─ logger.debug('Files found for scanning', {...}) │
│  │                                                   │
│  ├─ logger.warn('Error scanning file', {...})      │
│  │                                                   │
│  ├─ logger.warn('Exposed secrets detected!', {...})│
│  │                                                   │
│  └─ logger.error('Secrets Scanner failed', {...})   │
│                                                      │
│  Output Format (JSON):                              │
│  {                                                   │
│    "timestamp": "2026-02-06T03:47:00.000Z",         │
│    "skill": "secrets-scanner",                      │
│    "level": "info|warn|error|debug",                │
│    "message": "...",                                │
│    "context": { ... }                               │
│  }                                                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Execution Timeline

```
T+0ms:    Skill invoked
├─ Validate input (20ms)
│  └─ Check scanPath exists
│  └─ Check is directory
│
T+20ms:   Execute begins
├─ Find files (50-500ms)
│  └─ Walk directory tree
│  └─ Match patterns
│  └─ Exclude unwanted dirs
│
T+70-520ms: Scan files (500-5000ms)
│  ├─ Read each file
│  ├─ Split into lines
│  ├─ Check each line vs patterns
│  ├─ Create ExposedSecret objects
│  └─ Accumulate results
│
T+570-5520ms: Optional git history (0-60000ms)
│  └─ Execute git log command
│  └─ Parse diff output
│  └─ Find secrets in commits
│
T+5520-65520ms: Group results (10ms)
│  └─ Count by severity
│  └─ Sort findings
│
T+65530ms: Return results
└─ SecretscannerResult object
```

---

**Architecture Version**: 1.0.0
**Last Updated**: 2026-02-06
**Status**: Production Ready
