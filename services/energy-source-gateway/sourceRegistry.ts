/**
 * HOOSHYAR ENERGY SOURCE GATEWAY — AUTHORITATIVE SOURCE REGISTRY
 * Stage 13.10.2-C2C: Standalone Gateway Service Implementation
 * 
 * Server-authoritative source registry owned and enforced by the Gateway itself.
 * The Gateway NEVER trusts caller metadata for outbound network authorizations.
 */

import { GatewaySourceConfig } from './types.js';
import { GatewaySecurityError } from './errors.js';

export const GATEWAY_SOURCE_REGISTRY: Record<string, GatewaySourceConfig> = {
  src_satba: {
    id: 'src_satba',
    name: 'سازمان انرژی‌های تجدیدپذیر و بهره‌وری انرژی برق (ساتبا)',
    officialDomain: 'satba.gov.ir',
    allowedSubdomains: ['satba.gov.ir', 'www.satba.gov.ir', 'news.satba.gov.ir'],
    isActive: true
  },
  // Inactive Tier-1 registered publishers (prepared for future stages, not active in C2C)
  src_tavanir: {
    id: 'src_tavanir',
    name: 'شرکت مادر تخصصی مدیریت ساخت و تهیه کالای آب و برق (توانیر)',
    officialDomain: 'tavanir.org.ir',
    allowedSubdomains: ['tavanir.org.ir', 'www.tavanir.org.ir'],
    isActive: false
  },
  src_moe: {
    id: 'src_moe',
    name: 'وزارت نیرو جمهوری اسلامی ایران',
    officialDomain: 'moe.gov.ir',
    allowedSubdomains: ['moe.gov.ir', 'www.moe.gov.ir', 'news.moe.gov.ir'],
    isActive: false
  },
  src_irenex: {
    id: 'src_irenex',
    name: 'بورس انرژی ایران',
    officialDomain: 'irenex.ir',
    allowedSubdomains: ['irenex.ir', 'www.irenex.ir'],
    isActive: false
  },
  src_igmc: {
    id: 'src_igmc',
    name: 'شرکت مدیریت شبکه برق ایران',
    officialDomain: 'igmc.ir',
    allowedSubdomains: ['igmc.ir', 'www.igmc.ir'],
    isActive: false
  },
  src_dotic: {
    id: 'src_dotic',
    name: 'سامانه ملی قوانین و مقررات جمهوری اسلامی ایران',
    officialDomain: 'dotic.ir',
    allowedSubdomains: ['dotic.ir', 'www.dotic.ir'],
    isActive: false
  }
};

/**
 * Retrieves a source by ID from the authoritative gateway registry.
 * Validates that the source exists and is actively enabled.
 */
export function getAuthoritativeGatewaySource(sourceId: string): GatewaySourceConfig {
  if (!sourceId || typeof sourceId !== 'string') {
    throw new GatewaySecurityError('شناسه منبع مشخص نشده است.', 'UNKNOWN_SOURCE', 400);
  }

  const cleanId = sourceId.trim();
  const source = GATEWAY_SOURCE_REGISTRY[cleanId];

  if (!source) {
    throw new GatewaySecurityError(`منبع با شناسه '${cleanId}' در سامانه گیت‌وی ثبت نشده است.`, 'UNKNOWN_SOURCE', 400);
  }

  if (!source.isActive) {
    throw new GatewaySecurityError(`منبع '${source.name}' در این مرحله فعال نمی‌باشد.`, 'RESOURCE_POLICY_VIOLATION', 403);
  }

  return source;
}

/**
 * Validates that a candidate hostname strictly belongs to the authoritative source.
 * Prevents deceptive suffixes (e.g. satba.gov.ir.attacker.com) and unauthorized subdomains.
 */
export function isAllowedGatewaySourceHostname(hostname: string, source: GatewaySourceConfig): boolean {
  if (!hostname || !source) return false;
  const h = hostname.toLowerCase().trim();
  const root = source.officialDomain.toLowerCase().trim();

  // Exact domain match
  if (h === root) return true;

  // Exact configured subdomain match
  if (source.allowedSubdomains.map(s => s.toLowerCase()).includes(h)) {
    return true;
  }

  // Strict subdomain structure check: must end with .root and have valid alphanumeric subdomain labels
  if (h.endsWith(`.${root}`)) {
    const prefix = h.slice(0, -(root.length + 1));
    return prefix.length > 0 && prefix.split('.').every(label => /^[a-z0-9-]+$/.test(label));
  }

  return false;
}
