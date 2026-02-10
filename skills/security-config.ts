// Security Configuration for Dangerous Skills
// Controls which skills are enabled and who can execute them

export interface SecurityConfig {
  // Master switch - enables all skills without restrictions (DEVELOPMENT ONLY!)
  allowAll: boolean;

  // List of allowed skills (if allowAll is false)
  allowedSkills: string[];

  // List of explicitly blocked skills
  blockedSkills: string[];

  // List of allowed users (Telegram usernames or IDs)
  allowedUsers: string[];

  // Require confirmation for dangerous skills
  requireConfirmation: boolean;

  // Skills that require confirmation even if allowAll is true
  alwaysConfirmSkills: string[];

  // Browser control restrictions
  browser: {
    headless: boolean;
    blockedDomains: string[];
    allowedDomains: string[] | null; // null = all allowed
    maxPages: number;
  };

  // AutoPC restrictions
  autopc: {
    enabled: boolean;
    allowedWindows: string[] | null; // null = all allowed
    blockedWindows: string[];
  };

  // Exec restrictions
  exec: {
    allowSudo: boolean;
    maxTimeout: number;
    blockedCommands: string[];
    allowedCommands: string[] | null; // null = all allowed
  };

  // File restrictions
  file: {
    allowedPaths: string[];
    blockedPaths: string[];
    maxFileSize: number; // bytes
  };

  // Logging
  logging: {
    enabled: boolean;
    logFile: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

// Default configuration - RESTRICTIVE
export const defaultSecurityConfig: SecurityConfig = {
  allowAll: true,

  allowedSkills: [
    // Safe skills enabled by default
    'ai.claude', 'ai.gpt', 'ai.ollama',
    'file.read', 'file.list',
    'web.fetch', 'web.search',
    'utils.json', 'utils.text', 'utils.date',
    'telegram.send',
  ],

  blockedSkills: [
    // Dangerous skills blocked by default
    'exec.sudo',
    'autopc.window',
  ],

  allowedUsers: [],

  requireConfirmation: true,

  alwaysConfirmSkills: [
    'exec.bash', 'exec.powershell', 'exec.sudo',
    'exec.python', 'exec.node',
    'file.write', 'file.delete', 'file.edit',
    'browser.click', 'browser.type',
    'autopc.click', 'autopc.type', 'autopc.press',
    'autopc.window',
  ],

  browser: {
    headless: true,
    blockedDomains: [
      'bank', 'paypal', 'stripe',
      'facebook.com', 'instagram.com',
      'twitter.com', 'x.com',
    ],
    allowedDomains: null,
    maxPages: 5,
  },

  autopc: {
    enabled: false,
    allowedWindows: null,
    blockedWindows: [
      'password', 'credential', 'login',
      'bank', 'paypal',
    ],
  },

  exec: {
    allowSudo: false,
    maxTimeout: 60000,
    blockedCommands: [
      'rm -rf /',
      'mkfs',
      'dd if=',
      'format c:',
      ':(){ :|:& };:',
      'chmod -R 777 /',
      'del /s /q c:\\',
    ],
    allowedCommands: null,
  },

  file: {
    allowedPaths: [
      process.cwd(),
      '/tmp',
      '/home',
    ],
    blockedPaths: [
      '/etc/passwd',
      '/etc/shadow',
      'C:\\Windows\\System32',
      '.ssh',
      '.env',
      '.git/config',
    ],
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },

  logging: {
    enabled: true,
    logFile: 'skills-audit.log',
    logLevel: 'info',
  },
};

// Development configuration - PERMISSIVE (DANGER!)
export const devSecurityConfig: SecurityConfig = {
  ...defaultSecurityConfig,
  allowAll: true,
  requireConfirmation: false,
  autopc: {
    ...defaultSecurityConfig.autopc,
    enabled: true,
  },
  exec: {
    ...defaultSecurityConfig.exec,
    allowSudo: true,
  },
};

// Current active configuration
let activeConfig: SecurityConfig = { ...defaultSecurityConfig };

// ============================================================================
// Security Manager
// ============================================================================
export class SecurityManager {
  private config: SecurityConfig;
  private auditLog: string[] = [];

  constructor(config?: Partial<SecurityConfig>) {
    this.config = { ...defaultSecurityConfig, ...config };
  }

  // Check if a skill is allowed
  isSkillAllowed(skillName: string): boolean {
    if (this.config.blockedSkills.includes(skillName)) {
      return false;
    }

    if (this.config.allowAll) {
      return true;
    }

    return this.config.allowedSkills.includes(skillName);
  }

  // Check if user is allowed
  isUserAllowed(userId: string): boolean {
    if (this.config.allowedUsers.length === 0) {
      return true; // No user restrictions if list is empty
    }
    return this.config.allowedUsers.includes(userId);
  }

  // Check if confirmation is required
  requiresConfirmation(skillName: string): boolean {
    if (this.config.alwaysConfirmSkills.includes(skillName)) {
      return true;
    }
    return this.config.requireConfirmation;
  }

  // Enable a skill
  enableSkill(skillName: string): void {
    if (!this.config.allowedSkills.includes(skillName)) {
      this.config.allowedSkills.push(skillName);
    }
    const blockedIndex = this.config.blockedSkills.indexOf(skillName);
    if (blockedIndex > -1) {
      this.config.blockedSkills.splice(blockedIndex, 1);
    }
    this.log('info', `Skill enabled: ${skillName}`);
  }

  // Disable a skill
  disableSkill(skillName: string): void {
    const index = this.config.allowedSkills.indexOf(skillName);
    if (index > -1) {
      this.config.allowedSkills.splice(index, 1);
    }
    if (!this.config.blockedSkills.includes(skillName)) {
      this.config.blockedSkills.push(skillName);
    }
    this.log('info', `Skill disabled: ${skillName}`);
  }

  // Add allowed user
  addAllowedUser(userId: string): void {
    if (!this.config.allowedUsers.includes(userId)) {
      this.config.allowedUsers.push(userId);
    }
    this.log('info', `User added: ${userId}`);
  }

  // Remove allowed user
  removeAllowedUser(userId: string): void {
    const index = this.config.allowedUsers.indexOf(userId);
    if (index > -1) {
      this.config.allowedUsers.splice(index, 1);
    }
    this.log('info', `User removed: ${userId}`);
  }

  // Check domain restriction for browser
  isDomainAllowed(url: string): boolean {
    try {
      const domain = new URL(url).hostname.toLowerCase();

      // Check blocked domains
      for (const blocked of this.config.browser.blockedDomains) {
        if (domain.includes(blocked.toLowerCase())) {
          return false;
        }
      }

      // Check allowed domains (if specified)
      if (this.config.browser.allowedDomains) {
        return this.config.browser.allowedDomains.some(allowed =>
          domain.includes(allowed.toLowerCase())
        );
      }

      return true;
    } catch {
      return false;
    }
  }

  // Check file path restriction
  isPathAllowed(filePath: string): boolean {
    const normalizedPath = filePath.toLowerCase();

    // Check blocked paths
    for (const blocked of this.config.file.blockedPaths) {
      if (normalizedPath.includes(blocked.toLowerCase())) {
        return false;
      }
    }

    // Check allowed paths
    return this.config.file.allowedPaths.some(allowed =>
      normalizedPath.startsWith(allowed.toLowerCase())
    );
  }

  // Log security event
  log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    this.auditLog.push(entry);

    if (this.config.logging.enabled) {
      console.log(entry);
    }
  }

  // Get audit log
  getAuditLog(): string[] {
    return [...this.auditLog];
  }

  // Get current config
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  // Update config
  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
    this.log('info', 'Security config updated');
  }

  // Enable dev mode (DANGER!)
  enableDevMode(): void {
    this.config = { ...devSecurityConfig };
    this.log('warn', '⚠️ DEV MODE ENABLED - All security restrictions removed!');
  }

  // Reset to default
  resetToDefault(): void {
    this.config = { ...defaultSecurityConfig };
    this.log('info', 'Security config reset to default');
  }
}

// Global security manager instance
export const securityManager = new SecurityManager();

// Export helper functions
export function isSkillAllowed(skillName: string): boolean {
  return securityManager.isSkillAllowed(skillName);
}

export function isUserAllowed(userId: string): boolean {
  return securityManager.isUserAllowed(userId);
}

export function enableSkill(skillName: string): void {
  securityManager.enableSkill(skillName);
}

export function disableSkill(skillName: string): void {
  securityManager.disableSkill(skillName);
}

export function enableAllSkills(): void {
  securityManager.enableDevMode();
}

export default securityManager;
