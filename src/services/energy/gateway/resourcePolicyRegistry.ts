/**
 * HOOSHYAR ENERGY — GATEWAY RESOURCE POLICY FOUNDATION
 * Stage 13.10.2-C2B: Secure Source Gateway Protocol Foundation
 * 
 * Provides contract and registry mechanisms for server-controlled source resource policies.
 * 
 * IMPORTANT ARCHITECTURAL RULE:
 * This stage creates ONLY the extensible contract mechanism and policy evaluator.
 * SATBA-specific and other publisher-specific path rules remain unconfigured until
 * live verification in Stage 13.10.2-C2D. No fake or speculative endpoints are registered here.
 */

import { EnergyGatewayResourcePolicy } from '../../../types/energyGateway.js';
import { GatewaySecurityError } from './gatewayErrors.js';

export class ResourcePolicyRegistry {
  private readonly policies: Map<string, EnergyGatewayResourcePolicy> = new Map();

  private makeKey(sourceId: string, resourceKey: string): string {
    return `${sourceId.trim()}::${resourceKey.trim()}`;
  }

  /**
   * Registers a server-controlled resource policy for a specific source and resource key.
   */
  public registerPolicy(policy: EnergyGatewayResourcePolicy): void {
    if (!policy || !policy.sourceId || !policy.resourceKey) {
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
   * Validates whether a candidate target URL conforms to the allowed hostnames and path patterns of the policy.
   */
  public validateUrlAgainstPolicy(
    sourceId: string, 
    resourceKey: string, 
    candidateUrl: string
  ): { isValid: boolean; reason?: string } {
    const policy = this.getPolicy(sourceId, resourceKey);
    if (!policy) {
      return { 
        isValid: false, 
        reason: `سیاست دسترسی برای منبع '${sourceId}' و کلید '${resourceKey}' تعریف نشده است.` 
      };
    }

    let parsed: URL;
    try {
      parsed = new URL(candidateUrl);
    } catch {
      return { isValid: false, reason: 'فرمت آدرس نامعتبر است.' };
    }

    const hostname = parsed.hostname.toLowerCase();
    const isHostnameAllowed = policy.allowedHostnames.some(h => 
      hostname === h.toLowerCase() || hostname.endsWith(`.${h.toLowerCase()}`)
    );

    if (!isHostnameAllowed) {
      return { 
        isValid: false, 
        reason: `دامنه '${hostname}' در فهرست دامنه‌های مجاز این منبع تعریف نشده است.` 
      };
    }

    if (policy.allowedPathPatterns && policy.allowedPathPatterns.length > 0) {
      const pathname = parsed.pathname;
      const isPathAllowed = policy.allowedPathPatterns.some(pattern => {
        if (pattern.startsWith('^') || pattern.endsWith('$')) {
          return new RegExp(pattern).test(pathname);
        }
        return pathname.startsWith(pattern);
      });

      if (!isPathAllowed) {
        return { 
          isValid: false, 
          reason: `مسیر '${pathname}' با الگوهای مجاز سیاست منبع مطابقت ندارد.` 
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Clears registered policies (useful in test fixtures).
   */
  public clear(): void {
    this.policies.clear();
  }
}

/**
 * Shared singleton registry for source resource policies.
 */
export const defaultResourcePolicyRegistry = new ResourcePolicyRegistry();
