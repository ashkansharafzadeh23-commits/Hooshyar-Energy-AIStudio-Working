/**
 * HOOSHYAR ENERGY — OFFICIAL IRAN ENERGY SOURCE REGISTRY
 * Stage 13.10.2 Secure Ingestion Foundation
 * 
 * Central registry of authoritative Tier-1 Iranian energy publishers.
 * Conservative configuration:
 * - Unconfirmed automated endpoints (API/RSS) are NOT enabled.
 * - fetchMethod defaults to MANUAL_CURATION until confirmed.
 * - requiresReview is strictly true for all sources.
 * - Strict domain matching prevents subdomain spoofing / deception.
 */

import { EnergySource } from '../../types/energyCenter.js';

export const OFFICIAL_ENERGY_SOURCES: EnergySource[] = [
  {
    id: 'src_satba',
    name: 'سازمان انرژی‌های تجدیدپذیر و بهره‌وری انرژی برق (ساتبا)',
    organization: 'ساتبا',
    officialDomain: 'satba.gov.ir',
    baseUrl: 'https://satba.gov.ir',
    sourceType: 'REGULATOR',
    trustTier: 'TIER_1_OFFICIAL_PRIMARY',
    contentCategories: ['regulations', 'tariffs_purchase', 'tenders_calls', 'investment_opportunities', 'news_announcements'],
    fetchMethod: 'MANUAL_CURATION',
    enabled: true,
    requiresReview: true,
    fetchIntervalMinutes: 720,
    consecutiveFailures: 0,
    circuitBreakerTripped: false,
    createdAt: '2026-10-07T00:00:00.000Z',
    updatedAt: '2026-10-07T00:00:00.000Z'
  },
  {
    id: 'src_tavanir',
    name: 'شرکت مدیریت تولید، انتقال و توزیع نیروی برق ایران (توانیر)',
    organization: 'توانیر',
    officialDomain: 'tavanir.org.ir',
    baseUrl: 'https://tavanir.org.ir',
    sourceType: 'GRID_OPERATOR',
    trustTier: 'TIER_1_OFFICIAL_PRIMARY',
    contentCategories: ['news_announcements', 'regulations', 'tariffs_purchase'],
    fetchMethod: 'MANUAL_CURATION',
    enabled: true,
    requiresReview: true,
    fetchIntervalMinutes: 720,
    consecutiveFailures: 0,
    circuitBreakerTripped: false,
    createdAt: '2026-10-07T00:00:00.000Z',
    updatedAt: '2026-10-07T00:00:00.000Z'
  },
  {
    id: 'src_moe',
    name: 'وزارت نیرو',
    organization: 'وزارت نیرو',
    officialDomain: 'moe.gov.ir',
    baseUrl: 'https://moe.gov.ir',
    sourceType: 'GOVERNMENT',
    trustTier: 'TIER_1_OFFICIAL_PRIMARY',
    contentCategories: ['regulations', 'tariffs_purchase', 'news_announcements'],
    fetchMethod: 'MANUAL_CURATION',
    enabled: true,
    requiresReview: true,
    fetchIntervalMinutes: 1440,
    consecutiveFailures: 0,
    circuitBreakerTripped: false,
    createdAt: '2026-10-07T00:00:00.000Z',
    updatedAt: '2026-10-07T00:00:00.000Z'
  },
  {
    id: 'src_irenex',
    name: 'شرکت بورس انرژی ایران',
    organization: 'بورس انرژی ایران',
    officialDomain: 'irenex.ir',
    baseUrl: 'https://irenex.ir',
    sourceType: 'EXCHANGE',
    trustTier: 'TIER_1_OFFICIAL_PRIMARY',
    contentCategories: ['energy_exchange', 'news_announcements'],
    fetchMethod: 'MANUAL_CURATION',
    enabled: true,
    requiresReview: true,
    fetchIntervalMinutes: 1440,
    consecutiveFailures: 0,
    circuitBreakerTripped: false,
    createdAt: '2026-10-07T00:00:00.000Z',
    updatedAt: '2026-10-07T00:00:00.000Z'
  },
  {
    id: 'src_igmc',
    name: 'شرکت مدیریت شبکه برق ایران',
    organization: 'مدیریت شبکه برق ایران',
    officialDomain: 'igmc.ir',
    baseUrl: 'https://igmc.ir',
    sourceType: 'GRID_OPERATOR',
    trustTier: 'TIER_1_OFFICIAL_PRIMARY',
    contentCategories: ['regulations', 'energy_exchange'],
    fetchMethod: 'MANUAL_CURATION',
    enabled: true,
    requiresReview: true,
    fetchIntervalMinutes: 1440,
    consecutiveFailures: 0,
    circuitBreakerTripped: false,
    createdAt: '2026-10-07T00:00:00.000Z',
    updatedAt: '2026-10-07T00:00:00.000Z'
  },
  {
    id: 'src_qavanin',
    name: 'سامانه ملی قوانین و مقررات جمهوری اسلامی ایران',
    organization: 'معاونت حقوقی ریاست جمهوری',
    officialDomain: 'dotic.ir',
    baseUrl: 'https://dotic.ir',
    sourceType: 'LEGAL',
    trustTier: 'TIER_1_OFFICIAL_PRIMARY',
    contentCategories: ['regulations'],
    fetchMethod: 'MANUAL_CURATION',
    enabled: true,
    requiresReview: true,
    fetchIntervalMinutes: 1440,
    consecutiveFailures: 0,
    circuitBreakerTripped: false,
    createdAt: '2026-10-07T00:00:00.000Z',
    updatedAt: '2026-10-07T00:00:00.000Z'
  }
];

/**
 * Retrieves all registered energy sources.
 */
export function getAllEnergySources(): EnergySource[] {
  return [...OFFICIAL_ENERGY_SOURCES];
}

/**
 * Retrieves enabled energy sources.
 */
export function getEnabledEnergySources(): EnergySource[] {
  return OFFICIAL_ENERGY_SOURCES.filter(s => s.enabled && !s.circuitBreakerTripped);
}

/**
 * Retrieves a source by its unique ID.
 */
export function getEnergySourceById(id: string): EnergySource | undefined {
  if (!id) return undefined;
  return OFFICIAL_ENERGY_SOURCES.find(s => s.id === id);
}

/**
 * Retrieves an energy source by hostname (exact domain or subdomain).
 */
export function getEnergySourceByHost(hostname: string): EnergySource | undefined {
  if (!hostname) return undefined;
  const host = hostname.toLowerCase().trim();

  return OFFICIAL_ENERGY_SOURCES.find(source => {
    const domain = source.officialDomain.toLowerCase();
    return host === domain || host.endsWith('.' + domain);
  });
}

/**
 * Gets list of all allowed official domain names.
 */
export function getAllowedDomains(): string[] {
  return OFFICIAL_ENERGY_SOURCES.map(s => s.officialDomain.toLowerCase());
}

/**
 * Strictly verifies whether a given hostname is an authorized official energy publisher.
 * Rejects deceptive hostnames like "satba.gov.ir.attacker.com".
 */
export function isAllowedEnergySourceHost(hostname: string): boolean {
  if (!hostname || typeof hostname !== 'string') return false;
  const host = hostname.toLowerCase().trim();

  // Reject IP addresses masquerading as hostnames
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(':')) {
    return false;
  }

  return OFFICIAL_ENERGY_SOURCES.some(source => {
    if (!source.enabled) return false;
    const allowedDomain = source.officialDomain.toLowerCase();
    // Must either match exactly or be a strict subdomain ending with .domain
    return host === allowedDomain || host.endsWith('.' + allowedDomain);
  });
}
