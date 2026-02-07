/**
 * Supabase Archon - Vault Configuration
 * Gerenciamento seguro de secrets
 *
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

export interface VaultConfig {
  supabaseUrl?: string;
  supabaseKey?: string;
  databaseUrl?: string;
  [key: string]: string | undefined;
}

/**
 * Vault Manager - Gerencia secrets de forma segura
 */
export class VaultManager {
  private secrets: Map<string, string>;

  constructor() {
    this.secrets = new Map();
    this.loadFromEnv();
  }

  /**
   * Load secrets from environment variables
   */
  private loadFromEnv() {
    const envVars = [
      'SUPABASE_URL',
      'SUPABASE_KEY',
      'DATABASE_URL',
      'ANTHROPIC_API_KEY',
    ];

    for (const varName of envVars) {
      const value = process.env[varName];
      if (value) {
        this.secrets.set(varName, value);
      }
    }
  }

  /**
   * Get a secret by key
   */
  get(key: string): string | undefined {
    return this.secrets.get(key);
  }

  /**
   * Set a secret (runtime only, not persisted)
   */
  set(key: string, value: string) {
    this.secrets.set(key, value);
  }

  /**
   * Check if a secret exists
   */
  has(key: string): boolean {
    return this.secrets.has(key);
  }

  /**
   * Get all secret keys (not values)
   */
  keys(): string[] {
    return Array.from(this.secrets.keys());
  }

  /**
   * Validate that required secrets are present
   */
  validate(requiredKeys: string[]): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const key of requiredKeys) {
      if (!this.has(key)) {
        missing.push(key);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Get masked secret (for logging)
   */
  getMasked(key: string): string {
    const value = this.get(key);
    if (!value) return '***NOT_SET***';

    if (value.length <= 8) return '***';
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  }
}

/**
 * Global vault instance
 */
let globalVault: VaultManager | null = null;

/**
 * Get or create global vault instance
 */
export function getVault(): VaultManager {
  if (!globalVault) {
    globalVault = new VaultManager();
  }
  return globalVault;
}

/**
 * Helper to get Supabase config from vault
 */
export function getSupabaseConfig(): { url: string; key: string } | null {
  const vault = getVault();

  const url = vault.get('SUPABASE_URL');
  const key = vault.get('SUPABASE_KEY');

  if (!url || !key) {
    return null;
  }

  return { url, key };
}
