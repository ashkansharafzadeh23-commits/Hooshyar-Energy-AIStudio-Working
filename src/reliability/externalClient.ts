/**
 * External Service Client Resilience (PH-4)
 * Enforces finite configurable timeouts on all external requests.
 * Implements bounded exponential backoff with jitter ONLY for safe, transient failures.
 * Strictly prohibits retrying non-idempotent mutations.
 */

import { logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';
import { extractSafeExternalErrorMetadata } from './errorRedaction.js';

export interface ExternalRequestConfig {
  service: string;
  operation: string;
  timeoutMs?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  isIdempotent?: boolean; // If false, retries are strictly forbidden!
}

export class ExternalServiceTimeoutError extends Error {
  public readonly code = 'EXTERNAL_SERVICE_TIMEOUT';
  public readonly statusCode = 504;
  public readonly isOperational = true;
  public readonly service: string;
  public readonly timeoutMs: number;

  constructor(service: string, timeoutMs: number) {
    super(`پاسخ سرویس خارجی '${service}' بیش از زمان مجاز (${timeoutMs} میلی‌ثانیه) به طول انجامید.`);
    this.name = 'ExternalServiceTimeoutError';
    this.service = service;
    this.timeoutMs = timeoutMs;
  }
}

export class ExternalServiceUnavailableError extends Error {
  public readonly code = 'EXTERNAL_SERVICE_UNAVAILABLE';
  public readonly statusCode = 503;
  public readonly isOperational = true;
  public readonly service: string;

  constructor(service: string, details?: string) {
    super(`سرویس خارجی '${service}' در حال حاضر در دسترس نیست${details ? `: ${details}` : ''}.`);
    this.name = 'ExternalServiceUnavailableError';
    this.service = service;
  }
}

// Configurable external timeouts
export const DEFAULT_TIMEOUTS: Record<string, number> = {
  NASA_POWER: Number(process.env.NASA_POWER_TIMEOUT_MS) || 10000,
  GEMINI_AI: Number(process.env.GEMINI_TIMEOUT_MS) || 15000,
  SMS_PROVIDER: Number(process.env.SMS_TIMEOUT_MS) || 8000,
  PAYMENT_GATEWAY: Number(process.env.PAYMENT_TIMEOUT_MS) || 10000,
  DEFAULT: 10000,
};

/**
 * Checks if an error is considered transient and safe to retry.
 */
export function isTransientError(error: any): boolean {
  if (!error) return false;

  // Timeout errors are transient
  if (error instanceof ExternalServiceTimeoutError || error.code === 'ETIMEDOUT' || error.name === 'AbortError') {
    return true;
  }

  // Network connection failures
  const networkCodes = ['ECONNRESET', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENOTFOUND', 'EPIPE'];
  if (error.code && networkCodes.includes(error.code)) {
    return true;
  }

  // HTTP status codes
  const status = error.statusCode || error.status || (error.response && error.response.status);
  if (status === 429) return true; // Rate limiting
  if (status === 502 || status === 503 || status === 504) return true; // Gateway/upstream issues

  // Fetch standard error message checks
  const msg = String(error.message || '').toLowerCase();
  if (msg.includes('fetch failed') || msg.includes('network error') || msg.includes('connection reset')) {
    return true;
  }

  return false;
}

/**
 * Executes an async task with a strict timeout using Promise.race and optional AbortController.
 */
export async function executeWithTimeout<T>(
  action: (signal?: AbortSignal) => Promise<T>,
  service: string,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  let timer: any = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ExternalServiceTimeoutError(service, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([action(controller.signal), timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Executes an external operation with configurable timeout and bounded retry policy.
 * NEVER retries if `isIdempotent: false`.
 */
export async function callExternalService<T>(
  action: (signal?: AbortSignal) => Promise<T>,
  config: ExternalRequestConfig
): Promise<T> {
  const timeoutMs = config.timeoutMs || DEFAULT_TIMEOUTS[config.service] || DEFAULT_TIMEOUTS.DEFAULT;
  const isIdempotent = config.isIdempotent ?? true; // Safe by default for read-only / idempotent queries
  const maxRetries = isIdempotent ? (config.maxRetries ?? 2) : 0; // Strictly 0 retries for non-idempotent operations
  const initialBackoff = config.initialBackoffMs ?? 300;
  const maxBackoff = config.maxBackoffMs ?? 2500;

  let attempt = 0;
  const startTime = Date.now();

  while (attempt <= maxRetries) {
    attempt++;
    const attemptStart = Date.now();
    try {
      const result = await executeWithTimeout(action, config.service, timeoutMs);
      metrics.recordExternalServiceCall(config.service, config.operation, true, Date.now() - attemptStart);
      return result;
    } catch (error: any) {
      metrics.recordExternalServiceCall(config.service, config.operation, false, Date.now() - attemptStart);

      const isTransient = isTransientError(error);
      const canRetry = isIdempotent && isTransient && attempt <= maxRetries;
      const safeMeta = extractSafeExternalErrorMetadata(config.service, error);

      logger.warn(`External request failed: ${config.service}.${config.operation} (attempt ${attempt}/${maxRetries + 1})`, {
        service: config.service,
        event: 'EXTERNAL_CALL_FAILURE',
        metadata: {
          operation: config.operation,
          attempt,
          maxRetries,
          isIdempotent,
          isTransient,
          willRetry: canRetry,
          httpStatus: safeMeta.httpStatus,
          errorCategory: safeMeta.errorCategory,
          safeSummary: safeMeta.safeSummary
        },
      });

      if (!canRetry) {
        throw error;
      }

      // Exponential backoff with jitter
      const expBackoff = Math.min(maxBackoff, initialBackoff * Math.pow(2, attempt - 1));
      const jitter = Math.random() * (expBackoff * 0.3); // up to 30% jitter
      const delayMs = Math.floor(expBackoff + jitter);

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new ExternalServiceUnavailableError(config.service, 'حداکثر دفعات تلاش مجدد سپری شد.');
}

/**
 * Resilient HTTP client wrapper enforcing timeouts, metric recording, and error redaction.
 */
export const externalClient = {
  async post<T = any>(
    url: string,
    body: any,
    options: {
      service?: string;
      operation?: string;
      timeoutMs?: number;
      isIdempotent?: boolean;
      headers?: Record<string, string>;
    } = {}
  ): Promise<{ status: number; data: T }> {
    const service = options.service || 'EXTERNAL_SERVICE';
    const operation = options.operation || 'POST';

    return callExternalService(async (signal) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        body: JSON.stringify(body),
        signal
      });

      const data = await response.json().catch(() => ({}));
      return {
        status: response.status,
        data: data as T
      };
    }, {
      service,
      operation,
      timeoutMs: options.timeoutMs,
      isIdempotent: options.isIdempotent ?? false
    });
  },

  async get<T = any>(
    url: string,
    options: {
      service?: string;
      operation?: string;
      timeoutMs?: number;
      headers?: Record<string, string>;
    } = {}
  ): Promise<{ status: number; data: T }> {
    const service = options.service || 'EXTERNAL_SERVICE';
    const operation = options.operation || 'GET';

    return callExternalService(async (signal) => {
      const response = await fetch(url, {
        method: 'GET',
        headers: options.headers || {},
        signal
      });

      const data = await response.json().catch(() => ({}));
      return {
        status: response.status,
        data: data as T
      };
    }, {
      service,
      operation,
      timeoutMs: options.timeoutMs,
      isIdempotent: true
    });
  }
};

