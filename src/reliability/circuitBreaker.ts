/**
 * Lightweight Reusable Circuit Breaker (PH-4)
 * States: CLOSED, OPEN, HALF_OPEN
 * Fails fast when OPEN with explicit Service Unavailable; NEVER invents fake fallback data.
 */

import { logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;     // e.g. 5 failures
  resetTimeoutMs?: number;       // e.g. 30000ms
  halfOpenSuccessThreshold?: number; // e.g. 2 successes
}

export class CircuitBreakerOpenError extends Error {
  public readonly code = 'CIRCUIT_BREAKER_OPEN';
  public readonly statusCode = 503;
  public readonly isOperational = true;
  public readonly service: string;

  constructor(service: string) {
    super(`سرویس خارجی '${service}' به دلیل خطاهای پیاپی موقتاً در دسترس نیست (مدار باز است).`);
    this.name = 'CircuitBreakerOpenError';
    this.service = service;
  }
}

export class CircuitBreaker {
  public readonly name: string;
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenSuccessThreshold: number;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold || 2;
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info(`Circuit breaker for '${this.name}' transitioned to HALF_OPEN (probing)`, {
          service: this.name,
          event: 'CIRCUIT_HALF_OPEN'
        });
      }
    }
    return this.state;
  }

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      metrics.recordExternalServiceCall(this.name, 'circuit_check', false, 0);
      throw new CircuitBreakerOpenError(this.name);
    }

    const start = Date.now();
    try {
      const result = await action();
      this.onSuccess();
      metrics.recordExternalServiceCall(this.name, 'execute', true, Date.now() - start);
      return result;
    } catch (err: any) {
      this.onFailure(err);
      metrics.recordExternalServiceCall(this.name, 'execute', false, Date.now() - start);
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        logger.info(`Circuit breaker for '${this.name}' closed after successful probe`, {
          service: this.name,
          event: 'CIRCUIT_CLOSED'
        });
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(error: any): void {
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.failureCount++;
      logger.warn(`Circuit breaker probe for '${this.name}' failed; reopening circuit`, {
        service: this.name,
        event: 'CIRCUIT_REOPENED',
        error: error?.message
      });
    } else {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        logger.error(`Circuit breaker threshold reached for '${this.name}'; opening circuit`, error, {
          service: this.name,
          event: 'CIRCUIT_OPENED',
          metadata: { failureCount: this.failureCount, threshold: this.failureThreshold }
        });
      }
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }

  // Explicitly trip open (useful for testing or emergency overrides)
  public trip(): void {
    this.state = 'OPEN';
    this.lastFailureTime = Date.now();
  }
}

// Global Breakers for External Integrations
export const externalCircuitBreakers = {
  nasaPower: new CircuitBreaker({ name: 'NASA_POWER', failureThreshold: 3, resetTimeoutMs: 20000 }),
  geminiAi: new CircuitBreaker({ name: 'GEMINI_AI', failureThreshold: 3, resetTimeoutMs: 30000 }),
  smsProvider: new CircuitBreaker({ name: 'SMS_PROVIDER', failureThreshold: 4, resetTimeoutMs: 20000 }),
  paymentGateway: new CircuitBreaker({ name: 'PAYMENT_GATEWAY', failureThreshold: 3, resetTimeoutMs: 30000 }),
};
