/**
 * HOOSHYAR ENERGY SOURCE GATEWAY — IN-MEMORY RATE LIMITER
 * Stage 13.10.2-C2C: Standalone Gateway Service Implementation
 * 
 * Process-local sliding window rate limiter for defense-in-depth.
 * 
 * ARCHITECTURAL LIMITATION NOTICE:
 * This in-memory implementation is intended strictly for the single-instance pilot.
 * In a horizontally-scaled multi-instance cluster, this must be replaced with
 * a distributed atomic store (e.g. Redis sliding window / token bucket).
 */

import { GatewaySecurityError } from '../errors.js';

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

export class GatewayRateLimiter {
  private readonly buckets: Map<string, RateLimitBucket> = new Map();
  private readonly maxTokens: number;
  private readonly refillRatePerMs: number;

  /**
   * @param maxRequests Maximum burst requests allowed
   * @param windowMs Time window in milliseconds for maxRequests
   */
  constructor(maxRequests = 60, windowMs = 60000) {
    this.maxTokens = maxRequests;
    this.refillRatePerMs = maxRequests / windowMs;
  }

  /**
   * Consumes a token for a given key (IP address or client identifier).
   * Throws RATE_LIMIT_EXCEEDED if limit exceeded.
   */
  public checkAndConsume(key: string): void {
    if (!key) return;
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens - 1, lastRefill: now };
      this.buckets.set(key, bucket);
      return;
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = elapsed * this.refillRatePerMs;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      throw new GatewaySecurityError(
        'نرخ ارسال درخواست‌ها بیش از سقف مجاز است. لطفاً کمی بعد مجدداً تلاش فرمایید.',
        'RATE_LIMIT_EXCEEDED',
        429
      );
    }

    bucket.tokens -= 1;
  }

  /**
   * Cleans up idle buckets.
   */
  public cleanup(maxIdleMs = 300000): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxIdleMs) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Resets all buckets (useful in test suites).
   */
  public reset(): void {
    this.buckets.clear();
  }
}

export const defaultGatewayRateLimiter = new GatewayRateLimiter(60, 60000);
