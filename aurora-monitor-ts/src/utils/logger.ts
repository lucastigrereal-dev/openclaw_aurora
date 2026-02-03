/**
 * Aurora Logger - Sistema de logging estruturado
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  name: string;
  message: string;
  context?: Record<string, any>;
}

export interface AuroraLoggerOptions {
  name: string;
  level?: LogLevel;
  jsonOutput?: boolean;
  timestampFormat?: 'iso' | 'unix' | 'short';
}

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const levelColors: Record<LogLevel, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

const reset = '\x1b[0m';

export class AuroraLogger {
  private name: string;
  private level: LogLevel;
  private jsonOutput: boolean;
  private timestampFormat: 'iso' | 'unix' | 'short';

  constructor(options: AuroraLoggerOptions) {
    this.name = options.name;
    this.level = options.level || 'info';
    this.jsonOutput = options.jsonOutput || false;
    this.timestampFormat = options.timestampFormat || 'iso';
  }

  private shouldLog(level: LogLevel): boolean {
    return levelPriority[level] >= levelPriority[this.level];
  }

  private formatTimestamp(): string {
    const now = new Date();
    switch (this.timestampFormat) {
      case 'unix':
        return String(now.getTime());
      case 'short':
        return now.toLocaleTimeString();
      default:
        return now.toISOString();
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      name: this.name,
      message,
      context,
    };

    if (this.jsonOutput) {
      console.log(JSON.stringify(entry));
    } else {
      const color = levelColors[level];
      const prefix = `${color}[${level.toUpperCase()}]${reset}`;
      const name = `\x1b[35m[${this.name}]${reset}`;
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      console.log(`${entry.timestamp} ${prefix} ${name} ${message}${contextStr}`);
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.log('error', message, context);
  }

  child(name: string): AuroraLogger {
    return new AuroraLogger({
      name: `${this.name}:${name}`,
      level: this.level,
      jsonOutput: this.jsonOutput,
      timestampFormat: this.timestampFormat,
    });
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

// Logger global
export const logger = new AuroraLogger({
  name: 'aurora',
  level: (process.env.AURORA_LOG_LEVEL as LogLevel) || 'info',
  jsonOutput: process.env.NODE_ENV === 'production',
});
