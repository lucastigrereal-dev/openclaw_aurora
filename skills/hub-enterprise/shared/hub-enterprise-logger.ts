/**
 * Hub Enterprise - Logger Utility
 * Logging estruturado para todas as personas
 */

export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;
  message: string;
  data?: Record<string, any>;
  duration?: number;
}

export class HubEnterpriseLogger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 10000;

  constructor(private component: string) {}

  debug(message: string, data?: Record<string, any>) {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, any>) {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, any>) {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, any>) {
    this.log('error', message, data);
  }

  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, any>
  ) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component: this.component,
      message,
      data,
    };

    this.logs.push(entry);

    // Manter limite de logs em memória
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console em desenvolvimento
    const prefix = `[${entry.component}] [${level.toUpperCase()}]`;
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: string): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  getLogsAfter(timestamp: number): LogEntry[] {
    return this.logs.filter((log) => log.timestamp > timestamp);
  }

  clear() {
    this.logs = [];
  }

  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export function createLogger(component: string): HubEnterpriseLogger {
  return new HubEnterpriseLogger(component);
}
