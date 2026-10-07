/**
 * HOOSHYAR ENERGY — REPLAY PROTECTION & NONCE STORE
 * Stage 13.10.2-C2B: Secure Source Gateway Protocol Foundation
 * 
 * Cryptographically random nonce generation and sliding-window replay protection.
 * 
 * ARCHITECTURAL LIMITATION NOTICE:
 * This in-memory implementation is intended strictly for the single-instance pilot.
 * In a horizontally-scaled multi-process/cluster production environment, this must be
 * replaced with an atomic distributed store (e.g. Redis SET NX with EXPIRE)
 * without altering the IGatewayNonceStore interface or protocol contracts.
 */

import crypto from 'node:crypto';
import { IGatewayNonceStore } from '../../../types/energyGateway.js';

export const DEFAULT_NONCE_RETENTION_MS = 10 * 60 * 1000; // 10 minutes

interface StoredNonce {
  expiresAt: number;
}

export class InMemoryGatewayNonceStore implements IGatewayNonceStore {
  private readonly nonces: Map<string, StoredNonce> = new Map();
  private readonly defaultRetentionMs: number;

  constructor(defaultRetentionMs = DEFAULT_NONCE_RETENTION_MS) {
    this.defaultRetentionMs = defaultRetentionMs;
  }

  /**
   * Checks whether the nonce has already been seen and is not expired.
   */
  public hasSeen(nonce: string): boolean {
    if (!nonce || typeof nonce !== 'string') return false;
    const entry = this.nonces.get(nonce);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.nonces.delete(nonce);
      return false;
    }

    return true;
  }

  /**
   * Records a nonce as seen with an expiration timestamp.
   */
  public markSeen(nonce: string, ttlMs?: number): void {
    if (!nonce || typeof nonce !== 'string') return;
    const effectiveTtl = ttlMs ?? this.defaultRetentionMs;
    this.nonces.set(nonce, {
      expiresAt: Date.now() + effectiveTtl
    });
  }

  /**
   * Purges all expired nonces to maintain bounded memory footprint.
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [nonce, entry] of this.nonces.entries()) {
      if (now > entry.expiresAt) {
        this.nonces.delete(nonce);
      }
    }
  }

  /**
   * Clears all stored nonces (useful in test suites).
   */
  public clear(): void {
    this.nonces.clear();
  }

  /**
   * Returns current active nonce count.
   */
  public get size(): number {
    this.cleanup();
    return this.nonces.size;
  }
}

/**
 * Generates a cryptographically random, collision-resistant UUID v4 nonce.
 */
export function generateGatewayNonce(): string {
  return crypto.randomUUID();
}

/**
 * Shared singleton instance for the main application process.
 */
export const defaultNonceStore = new InMemoryGatewayNonceStore();
