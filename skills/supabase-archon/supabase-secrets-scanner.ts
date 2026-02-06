/**
 * Supabase Archon - Secrets Scanner (S-04)
 * Scans codebase for exposed Supabase credentials and secrets
 *
 * @version 1.0.0
 * @priority P1
 * @category UTIL
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface SecretsScannerParams extends SkillInput {
  scanPath: string;
  includeGitHistory?: boolean;
  filePatterns?: string[];
}

export interface ExposedSecret {
  type: 'api_key' | 'connection_string' | 'password' | 'token';
  file: string;
  line: number;
  snippet: string; // Masked
  severity: 'critical' | 'high' | 'medium';
  recommendation: string;
}

export interface SecretsScannerResult extends SkillOutput {
  data?: {
    secrets: ExposedSecret[];
    filesScanned: number;
    patternsMatched: number;
  };
}

/**
 * Secrets Scanner - Detecta credenciais expostas
 */
export class SupabaseSecretsScanner extends Skill {
  private logger = createLogger('secrets-scanner');

  // Regex patterns for detecting secrets
  private readonly PATTERNS = {
    api_key: [
      /supabase[_-]?key\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|SUPABASE_KEY\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|SUPABASE_ANON_KEY\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|supabase.*anon.*key\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|api[_-]?key\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|sk_live_[a-zA-Z0-9]+|pk_live_[a-zA-Z0-9]+/gi,
    ],
    connection_string: [
      /postgresql:\/\/[^:]+:[^@]+@[^\s:]+:[0-9]+\/[^\s]+/gi,
      /postgres:\/\/[^:]+:[^@]+@[^\s:]+:[0-9]+\/[^\s]+/gi,
      /mongodb\+srv:\/\/[^:]+:[^@]+@[^\s]+/gi,
    ],
    password: [
      /password\s*[:=]\s*['"]([^'"]+)['"]/gi,
      /passwd\s*[:=]\s*['"]([^'"]+)['"]/gi,
      /pwd\s*[:=]\s*['"]([^'"]+)['"]/gi,
      /SUPABASE_PASSWORD\s*[:=]\s*['"]([^'"]+)['"]/gi,
    ],
    token: [
      /token\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|auth[_-]?token\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|bearer\s+([a-zA-Z0-9\-._~+/]+=*)/gi,
      /jwt\s*[:=]\s*['"]([a-zA-Z0-9\-._]+\.?[a-zA-Z0-9\-._]+\.?[a-zA-Z0-9\-._]+)['"]|refresh[_-]?token\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|access[_-]?token\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|github[_-]?token\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|slack[_-]?token\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|discord[_-]?token\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|api[_-]?token\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|telegram[_-]?token\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|webhook[_-]?token\s*[:=]\s*['"]([a-zA-Z0-9\-._~+/]+=*)['"]|openai[_-]?key\s*[:=]\s*['"]sk-[a-zA-Z0-9]+['"]/gi,
    ],
  };

  // Files to scan - environment and configuration files
  private readonly DEFAULT_PATTERNS = [
    '**/.env',
    '**/.env.local',
    '**/.env.*.local',
    '**/.env.production',
    '**/.env.development',
    '**/.env.test',
    '**/config.json',
    '**/config.yaml',
    '**/config.yml',
    '**/config.toml',
    '**/secrets.json',
    '**/settings.json',
    '**/firebase.config.js',
    '**/*.env',
  ];

  // Dangerous files to avoid scanning
  private readonly EXCLUDED_PATTERNS = [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    '.next/**',
    '.venv/**',
    'venv/**',
    '*.pyc',
    '.DS_Store',
    'coverage/**',
    '.cache/**',
  ];

  constructor() {
    super(
      {
        name: 'supabase-secrets-scanner',
        description: 'Scans codebase for exposed Supabase credentials and secrets',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'security', 'secrets', 'scanning'],
      },
      {
        timeout: 120000, // 2 minutes
        retries: 1,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as SecretsScannerParams;

    if (!typed.scanPath) {
      this.logger.warn('scanPath is required');
      return false;
    }

    if (!fs.existsSync(typed.scanPath)) {
      this.logger.warn('scanPath does not exist', { path: typed.scanPath });
      return false;
    }

    return true;
  }

  /**
   * Execute secrets scanning
   */
  async execute(params: SkillInput): Promise<SecretsScannerResult> {
    const typed = params as SecretsScannerParams;
    const startTime = Date.now();

    this.logger.info('Secrets Scanner iniciado', {
      path: typed.scanPath,
      includeGitHistory: typed.includeGitHistory || false,
      patterns: typed.filePatterns?.length || 'default',
    });

    try {
      const secrets: ExposedSecret[] = [];
      const filePatterns = typed.filePatterns || this.DEFAULT_PATTERNS;
      const scannedFiles = this.scanDirectoryForFiles(
        typed.scanPath,
        filePatterns
      );

      this.logger.debug('Files found for scanning', {
        count: scannedFiles.length,
      });

      // Scan each file for secrets
      for (const filePath of scannedFiles) {
        try {
          const fileSecrets = this.scanFile(filePath);
          secrets.push(...fileSecrets);
        } catch (error: any) {
          this.logger.warn('Error scanning file', {
            file: filePath,
            error: error.message,
          });
        }
      }

      // Optionally scan git history
      if (typed.includeGitHistory) {
        this.logger.debug('Scanning git history for secrets');
        const gitSecrets = this.scanGitHistory(typed.scanPath);
        secrets.push(...gitSecrets);
      }

      if (secrets.length > 0) {
        this.logger.warn('Exposed secrets detected!', {
          count: secrets.length,
          bySeverity: this.groupBySeverity(secrets),
        });

        // Log each secret (masked)
        secrets.forEach(secret => {
          this.logger.warn('Secret found', {
            type: secret.type,
            file: secret.file,
            line: secret.line,
            severity: secret.severity,
          });
        });
      } else {
        this.logger.info('No exposed secrets detected');
      }

      return {
        success: true,
        data: {
          secrets,
          filesScanned: scannedFiles.length,
          patternsMatched: secrets.length,
        },
      };
    } catch (error: any) {
      this.logger.error('Secrets Scanner failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Scan a single file for secrets
   */
  private scanFile(filePath: string): ExposedSecret[] {
    const secrets: ExposedSecret[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const lineNumber = index + 1;

        // Skip empty lines and comments
        if (!line.trim() || line.trim().startsWith('#')) {
          return;
        }

        // Check for API keys
        if (this.matchesPattern(line, this.PATTERNS.api_key)) {
          secrets.push({
            type: 'api_key',
            file: filePath,
            line: lineNumber,
            snippet: this.maskSecret(line),
            severity: 'critical',
            recommendation:
              'Move API key to environment variables or use Supabase vault',
          });
        }

        // Check for connection strings
        if (this.matchesPattern(line, this.PATTERNS.connection_string)) {
          secrets.push({
            type: 'connection_string',
            file: filePath,
            line: lineNumber,
            snippet: this.maskSecret(line),
            severity: 'critical',
            recommendation:
              'Store connection strings in environment variables, never in code',
          });
        }

        // Check for passwords
        if (this.matchesPattern(line, this.PATTERNS.password)) {
          secrets.push({
            type: 'password',
            file: filePath,
            line: lineNumber,
            snippet: this.maskSecret(line),
            severity: 'high',
            recommendation: 'Move password to environment variables or secrets manager',
          });
        }

        // Check for tokens
        if (this.matchesPattern(line, this.PATTERNS.token)) {
          secrets.push({
            type: 'token',
            file: filePath,
            line: lineNumber,
            snippet: this.maskSecret(line),
            severity: 'high',
            recommendation: 'Rotate token immediately and move to secrets manager',
          });
        }
      });
    } catch (error: any) {
      this.logger.error('Error reading file', {
        file: filePath,
        error: error.message,
      });
    }

    return secrets;
  }

  /**
   * Scan git history for secrets
   */
  private scanGitHistory(scanPath: string): ExposedSecret[] {
    const secrets: ExposedSecret[] = [];

    try {
      // Get all commits that touched files with potential secrets
      const command = `cd "${scanPath}" && git log -p --all -- "*.env*" "*.json" "*.yaml" "*.yml" 2>/dev/null | head -10000`;
      const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

      const lines = output.split('\n');
      let currentFile = '';
      let lineNumber = 0;

      lines.forEach(line => {
        // Track file changes
        if (line.startsWith('diff --git')) {
          const match = line.match(/b\/(.*?)$/);
          currentFile = match ? match[1] : '';
          lineNumber = 0;
        }

        // Check for secrets in diff output
        if (line.startsWith('+') || line.startsWith('-')) {
          lineNumber++;

          // Only check added lines
          if (line.startsWith('+') && !line.startsWith('+++')) {
            const contentLine = line.substring(1);

            if (this.matchesPattern(contentLine, this.PATTERNS.api_key)) {
              secrets.push({
                type: 'api_key',
                file: `${currentFile} (git history)`,
                line: lineNumber,
                snippet: this.maskSecret(contentLine),
                severity: 'critical',
                recommendation:
                  'Secret committed to git history. Use git-filter-repo to remove',
              });
            }

            if (
              this.matchesPattern(
                contentLine,
                this.PATTERNS.connection_string
              )
            ) {
              secrets.push({
                type: 'connection_string',
                file: `${currentFile} (git history)`,
                line: lineNumber,
                snippet: this.maskSecret(contentLine),
                severity: 'critical',
                recommendation:
                  'Secret committed to git history. Use git-filter-repo to remove',
              });
            }
          }
        }
      });
    } catch (error: any) {
      this.logger.warn('Could not scan git history', { error: error.message });
    }

    return secrets;
  }

  /**
   * Scan directory for files matching patterns
   */
  private scanDirectoryForFiles(
    directory: string,
    patterns: string[]
  ): string[] {
    const files: string[] = [];

    const recursiveSearch = (dir: string, pattern: string) => {
      try {
        // Simple glob-like pattern matching
        if (pattern.includes('**')) {
          // Recursive pattern
          const basePattern = pattern.replace('**/', '').replace('**', '');
          this.walkDirectory(dir, basePattern, files);
        } else {
          // Direct match
          const fullPath = path.join(dir, pattern);
          if (fs.existsSync(fullPath)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Silently skip inaccessible paths
      }
    };

    patterns.forEach(pattern => {
      recursiveSearch(directory, pattern);
    });

    // Remove duplicates and excluded files
    const uniqueFiles = Array.from(new Set(files));
    return uniqueFiles.filter(f => !this.isExcluded(f));
  }

  /**
   * Walk directory tree to find matching files
   */
  private walkDirectory(
    dir: string,
    pattern: string,
    results: string[]
  ): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (this.isExcluded(entry.name)) {
          continue;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          this.walkDirectory(fullPath, pattern, results);
        } else if (this.matchesPattern(entry.name, [new RegExp(pattern)])) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Silently skip inaccessible directories
    }
  }

  /**
   * Check if path should be excluded
   */
  private isExcluded(pathStr: string): boolean {
    return this.EXCLUDED_PATTERNS.some(pattern => {
      const regexPattern = pattern.replace('**/', '.*').replace('*', '.*');
      return new RegExp(regexPattern).test(pathStr);
    });
  }

  /**
   * Check if line matches any pattern
   */
  private matchesPattern(line: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => {
      pattern.lastIndex = 0; // Reset regex
      return pattern.test(line);
    });
  }

  /**
   * Mask secret value in snippet
   */
  private maskSecret(snippet: string): string {
    // Mask any potential secrets while preserving context
    return snippet
      .replace(/['"]([a-zA-Z0-9\-._~+/=]{20,})['"]/, '***[MASKED]***')
      .replace(/(password\s*[:=]\s*)['"]([^'"]+)['"]/gi, '$1***[MASKED]***')
      .replace(/(token\s*[:=]\s*)['"]([^'"]+)['"]/gi, '$1***[MASKED]***')
      .replace(/(key\s*[:=]\s*)['"]([^'"]+)['"]/gi, '$1***[MASKED]***')
      .replace(/(@[a-zA-Z0-9\-._:]+)/g, '***[MASKED]***')
      .substring(0, 200); // Limit length
  }

  /**
   * Group secrets by severity
   */
  private groupBySeverity(
    secrets: ExposedSecret[]
  ): Record<string, number> {
    const result: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
    };

    secrets.forEach(secret => {
      result[secret.severity]++;
    });

    return result;
  }
}
