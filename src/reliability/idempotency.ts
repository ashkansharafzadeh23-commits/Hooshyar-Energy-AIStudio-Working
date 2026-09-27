/**
 * Idempotency Architecture (PH-4)
 * 
 * The system implements a two-tier idempotency model:
 * 
 * 1. LOCAL IDEMPOTENCY:
 *    - In-memory Idempotency-Key cache (`IdempotencyStore`) with configurable TTL (default 10 min).
 *    - Guards individual application instances against rapid client retries, double clicks, and network re-transmissions.
 *    - Replays cached HTTP status code and response payload with `X-Idempotent-Replay: true`.
 * 
 * 2. DURABLE DOMAIN IDEMPOTENCY:
 *    - High-risk domain mutations (RFQ award, Financing Offer approval, Subscription/Payment verification)
 *      DO NOT rely solely on transient in-memory state.
 *    - They enforce stored state invariants directly in persistent storage:
 *      * RFQ Award: Checks `rfq.status === 'AWARDED'` and matches `rfq.selectedBidId === bid.id`. Rejects double award with HTTP 409.
 *      * Financing Approval: Checks `existingRecords.find(r => r.financingOfferId === offer.id)` before creating ProjectFinancingRecord.
 *      * Subscription Payment: Verifies `tx.status === 'success'` to prevent duplicate subscription creation on payment gateway callback.
 * 
 * 3. DISTRIBUTED IDEMPOTENCY NOT YET VERIFIED:
 *    - A shared distributed key-value cache (e.g. Redis/PostgreSQL idempotency log with distributed advisory locking)
 *      for transport-level Idempotency-Key replay across multiple horizontal container nodes is NOT yet implemented.
 *    - In multi-instance deployments, transport-level deduplication relies on the underlying DURABLE DOMAIN IDEMPOTENCY.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../observability/logger.js';

export const IDEMPOTENCY_TIERS = {
  LOCAL_IDEMPOTENCY: 'In-memory process cache for rapid network retry replay',
  DURABLE_DOMAIN_IDEMPOTENCY: 'Persistent database state invariants for critical operations (RFQ, financing, payments)',
  DISTRIBUTED_IDEMPOTENCY: 'NOT_YET_VERIFIED (requires external distributed lock/key-value store)'
} as const;

export interface IdempotencyRecord {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  createdAt: number;
  expiresAt: number;
}

class IdempotencyStore {
  private records = new Map<string, IdempotencyRecord>();
  private defaultTtlMs = 10 * 60 * 1000; // 10 minutes

  constructor() {
    // Periodic garbage collection every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  public get(key: string): IdempotencyRecord | undefined {
    const record = this.records.get(key);
    if (!record) return undefined;
    if (Date.now() > record.expiresAt) {
      this.records.delete(key);
      return undefined;
    }
    return record;
  }

  public set(key: string, statusCode: number, headers: Record<string, string>, body: any, ttlMs?: number): void {
    const now = Date.now();
    const effectiveTtl = ttlMs || this.defaultTtlMs;
    this.records.set(key, {
      statusCode,
      headers,
      body,
      createdAt: now,
      expiresAt: now + effectiveTtl
    });
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [k, v] of this.records.entries()) {
      if (now > v.expiresAt) {
        this.records.delete(k);
      }
    }
  }

  public clear(): void {
    this.records.clear();
  }
}

export const idempotencyStore = new IdempotencyStore();

/**
 * Express middleware to enforce Idempotency-Key on critical mutations
 */
export function idempotencyMiddleware(scopeOrOptions?: string | { ttlMs?: number }, maybeOptions?: { ttlMs?: number }) {
  const scope = typeof scopeOrOptions === 'string' ? scopeOrOptions : undefined;
  const options = typeof scopeOrOptions === 'object' ? scopeOrOptions : maybeOptions;

  return (req: Request, res: Response, next: NextFunction) => {
    // Only apply to mutations
    if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
      return next();
    }

    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (!idempotencyKey) {
      // If no key provided, proceed normally without caching
      return next();
    }

    const userId = (req as any).user?.id || 'anonymous';
    const prefix = scope ? `${scope}:` : '';
    const storageKey = `${prefix}${req.baseUrl || ''}${req.path}:${userId}:${idempotencyKey}`;

    const cached = idempotencyStore.get(storageKey);
    if (cached) {
      logger.info(`Idempotency key matched; returning cached response`, {
        service: 'IDEMPOTENCY',
        event: 'IDEMPOTENT_REPLAY',
        metadata: { path: req.originalUrl, idempotencyKey }
      });
      res.setHeader('X-Idempotent-Replay', 'true');
      return res.status(cached.statusCode).json(cached.body);
    }

    // Intercept response to store result
    const originalJson = res.json.bind(res);
    res.json = (body: any): Response => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        idempotencyStore.set(storageKey, res.statusCode, {}, body, options?.ttlMs);
      }
      return originalJson(body);
    };

    next();
  };
}
