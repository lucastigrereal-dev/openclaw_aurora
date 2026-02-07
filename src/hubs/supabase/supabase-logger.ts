/**
 * Supabase Archon - Structured Logger
 * Logs JSON com campos padronizados
 *
 * @version 1.0.0
 */

export interface LogEntry {
  timestamp: string;
  skill: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
  traceId?: string;
}

export class SupabaseLogger {
  private skillName: string;
  private traceId?: string;

  constructor(skillName: string, traceId?: string) {
    this.skillName = skillName;
    this.traceId = traceId;
  }

  private log(level: LogEntry['level'], message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      skill: this.skillName,
      level,
      message,
      context,
      ...(this.traceId && { traceId: this.traceId }),
    };

    // Log to console (JSON format for easy parsing)
    console.log(JSON.stringify(entry));

    // TODO: Send to centralized logging system (Loki, Elasticsearch, etc.)
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }

  /**
   * Create a child logger with the same trace ID
   */
  child(skillName: string): SupabaseLogger {
    return new SupabaseLogger(skillName, this.traceId);
  }

  /**
   * Set trace ID for distributed tracing
   */
  setTraceId(traceId: string) {
    this.traceId = traceId;
  }
}

/**
 * Factory function to create logger
 */
export function createLogger(skillName: string, traceId?: string): SupabaseLogger {
  return new SupabaseLogger(skillName, traceId);
}
