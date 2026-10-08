/**
 * HOOSHYAR ENERGY SOURCE GATEWAY — RESOURCE POLICY REGISTRY
 * Stage 13.10.2-C2C: Standalone Gateway Service Implementation
 * 
 * Server-controlled mapping of (sourceId, resourceKey) to verified upstream URL policies.
 * 
 * CRITICAL SCOPE INVARIANT:
 * In Stage 13.10.2-C2C, there are strictly ZERO verified live SATBA resource mappings.
 * Production registry initializes completely empty.
 * Any request attempting to fetch an unconfigured resourceKey fails closed with RESOURCE_POLICY_VIOLATION.
 */

import { EnergyGatewayResourcePolicy } from './types.js';
import { GatewaySecurityError } from './errors.js';

export class GatewayResourcePolicyRegistry {
  private readonly policies: Map<string, EnergyGatewayResourcePolicy> = new Map();

  private makeKey(sourceId: string, resourceKey: string): string {
    return `${sourceId.trim()}::${resourceKey.trim()}`;
  }

  /**
   * Registers a server-controlled resource policy.
   */
  public registerPolicy(policy: EnergyGatewayResourcePolicy): void {
    if (!policy || !policy.sourceId || !policy.resourceKey || !policy.targetUrl) {
      throw new GatewaySecurityError('سیاست منبع نامعتبر است.', 'RESOURCE_POLICY_VIOLATION', 400);
    }
    this.policies.set(this.makeKey(policy.sourceId, policy.resourceKey), policy);
  }

  /**
   * Retrieves a registered policy by sourceId and resourceKey.
   */
  public getPolicy(sourceId: string, resourceKey: string): EnergyGatewayResourcePolicy | undefined {
    return this.policies.get(this.makeKey(sourceId, resourceKey));
  }

  /**
   * Resolves a resource policy or throws RESOURCE_POLICY_VIOLATION if unconfigured.
   */
  public resolvePolicy(sourceId: string, resourceKey: string): EnergyGatewayResourcePolicy {
    const policy = this.getPolicy(sourceId, resourceKey);
    if (!policy) {
      throw new GatewaySecurityError(
        `هیچ سیاست دسترسی معتبر و تأییدشده‌ای برای منبع '${sourceId}' و کلید منبع '${resourceKey}' در گیت‌وی پیکربندی نشده است.`,
        'RESOURCE_POLICY_VIOLATION',
        400
      );
    }
    return policy;
  }

  /**
   * Returns the count of registered resource policies.
   */
  public get count(): number {
    return this.policies.size;
  }

  /**
   * Clears all registered policies.
   */
  public clear(): void {
    this.policies.clear();
  }
}

/**
 * Authoritative production registry.
 * Strictly initialized with 0 live mappings in Stage 13.10.2-C2C.
 */
export const defaultGatewayPolicyRegistry = new GatewayResourcePolicyRegistry();
