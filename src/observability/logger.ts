/**
 * Centralized Structured Logging Architecture (PH-4)
 * Supports levels: ERROR, WARN, INFO, DEBUG
 * Enforces secret & credential redaction
 * Reuses request correlation ID
 */

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Sensitive keys to scrub recursively
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwordhash/i,
  /otp/i,
  /jwt/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /apikey/i,
  /secret/i,
  /credential/i,
  /database_url/i,
  /db_url/i,
  /connectionstring/i,
  /privatekey/i,
  /cardnumber/i,
  /cvv/i,
  /kavenegar/i,
  /zarinpal/i,
];

/**
 * Deep redaction of sensitive properties and string values
 */
export function redactSensitiveData(obj: any, depth = 0): any {
  if (depth > 6) return '[TRUNCATED_MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Redact JWT-like strings
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(obj)) {
      return '[REDACTED_JWT]';
    }
    // Redact Bearer tokens
    if (obj.toLowerCase().startsWith('bearer ')) {
      return 'Bearer [REDACTED_TOKEN]';
    }
    // Redact database urls
    if (obj.includes('postgres://') || obj.includes('postgresql://')) {
      return '[REDACTED_DATABASE_URL]';
    }
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, depth + 1));
  }

  // If Error instance
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : obj.stack,
    };
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
    if (isSensitive) {
      clean[key] = '[REDACTED]';
    } else {
      clean[key] = redactSensitiveData(value, depth + 1);
    }
  }

  return clean;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId?: string;
  event?: string;
  service?: string;
  message: string;
  metadata?: Record<string, any>;
  error?: any;
}

class StructuredLogger {
  private activeLevel: LogLevel;

  constructor() {
    const configuredLevel = (process.env.LOG_LEVEL || '').toUpperCase() as LogLevel;
    if (LOG_LEVEL_SEVERITY[configuredLevel] !== undefined) {
      this.activeLevel = configuredLevel;
    } else {
      // Production must NOT default to DEBUG
      this.activeLevel = process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG';
    }
  }

  public setLevel(level: LogLevel): void {
    this.activeLevel = level;
  }

  public getLevel(): LogLevel {
    return this.activeLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_SEVERITY[level] <= LOG_LEVEL_SEVERITY[this.activeLevel];
  }

  private write(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const safeEntry: LogEntry = {
      timestamp: entry.timestamp || new Date().toISOString(),
      level: entry.level,
      message: entry.message,
      ...(entry.requestId ? { requestId: entry.requestId } : {}),
      ...(entry.event ? { event: entry.event } : {}),
      ...(entry.service ? { service: entry.service } : {}),
      ...(entry.metadata ? { metadata: redactSensitiveData(entry.metadata) } : {}),
      ...(entry.error ? { error: redactSensitiveData(entry.error) } : {}),
    };

    const serialized = JSON.stringify(safeEntry);

    if (entry.level === 'ERROR') {
      console.error(serialized);
    } else if (entry.level === 'WARN') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  public info(message: string, context?: { requestId?: string; event?: string; service?: string; metadata?: Record<string, any> }): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      ...context,
    });
  }

  public warn(message: string, context?: { requestId?: string; event?: string; service?: string; metadata?: Record<string, any>; error?: any }): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      ...context,
    });
  }

  public error(message: string, error?: any, context?: { requestId?: string; event?: string; service?: string; metadata?: Record<string, any> }): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error,
      ...context,
    });
  }

  public debug(message: string, context?: { requestId?: string; event?: string; service?: string; metadata?: Record<string, any> }): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message,
      ...context,
    });
  }

  /**
   * Creates a contextual child logger with fixed requestId and service
   */
  public withContext(defaults: { requestId?: string; service?: string }): ContextualLogger {
    return new ContextualLogger(this, defaults);
  }
}

export class ContextualLogger {
  constructor(
    private parent: StructuredLogger,
    private defaults: { requestId?: string; service?: string }
  ) {}

  public info(message: string, context?: { event?: string; metadata?: Record<string, any> }): void {
    this.parent.info(message, { ...this.defaults, ...context });
  }

  public warn(message: string, context?: { event?: string; metadata?: Record<string, any>; error?: any }): void {
    this.parent.warn(message, { ...this.defaults, ...context });
  }

  public error(message: string, error?: any, context?: { event?: string; metadata?: Record<string, any> }): void {
    this.parent.error(message, error, { ...this.defaults, ...context });
  }

  public debug(message: string, context?: { event?: string; metadata?: Record<string, any> }): void {
    this.parent.debug(message, { ...this.defaults, ...context });
  }
}

export const logger = new StructuredLogger();
