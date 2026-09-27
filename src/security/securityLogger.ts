/**
 * Safe Security Logger for Hooshyar Energy
 * Automatically redacts sensitive fields (passwords, OTPs, JWTs, Authorization headers, API keys)
 */

const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*/gi,
  /(password|secret|token|otp|authorization|apiKey|api_key|database_url)=([^&\s]+)/gi,
  /("password"|"secret"|"token"|"otp"|"code"|"authorization"):\s*"[^"]*"/gi
];

export function redactSensitiveData(input: any): any {
  if (!input) return input;

  if (typeof input === 'string') {
    let redacted = input;
    // Redact JWT tokens
    redacted = redacted.replace(/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[REDACTED_JWT]');
    // Redact Bearer headers
    redacted = redacted.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED_TOKEN]');
    // Redact potential 4-6 digit standalone OTP mentions when prefixed
    redacted = redacted.replace(/(OTP[:\s]+)\d{4,6}/gi, '$1[REDACTED_OTP]');
    return redacted;
  }

  if (typeof input === 'object') {
    if (Array.isArray(input)) {
      return input.map(redactSensitiveData);
    }
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('password') ||
        lower.includes('secret') ||
        lower.includes('jwt') ||
        lower === 'token' ||
        lower === 'otp' ||
        lower === 'authorization' ||
        lower.includes('apikey') ||
        lower.includes('api_key') ||
        lower.includes('database_url')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = redactSensitiveData(value);
      }
    }
    return sanitized;
  }

  return input;
}

export type SecurityEventType = 
  | 'AUTH_FAILURE'
  | 'AUTH_SUCCESS'
  | 'AUTHZ_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_TOKEN'
  | 'IDOR_ATTEMPT'
  | 'VALIDATION_FAILURE'
  | 'MOCK_BLOCKED';

export const securityLogger = {
  logSecurityEvent(event: {
    type: SecurityEventType;
    requestId?: string;
    userId?: string;
    ip?: string;
    path?: string;
    details?: any;
  }): void {
    const sanitizedDetails = redactSensitiveData(event.details);
    const logEntry = {
      timestamp: new Date().toISOString(),
      securityEvent: event.type,
      requestId: event.requestId || 'unknown',
      userId: event.userId || 'anonymous',
      ip: event.ip || 'unknown',
      path: event.path || 'unknown',
      details: sanitizedDetails
    };

    // Safe structured logging
    console.warn(`[SECURITY] ${event.type}: ${JSON.stringify(logEntry)}`);
  }
};
