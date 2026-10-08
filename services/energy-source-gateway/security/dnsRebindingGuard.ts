/**
 * HOOSHYAR ENERGY SOURCE GATEWAY — DNS REBINDING & SSRF GUARD
 * Stage 13.10.2-C2C: Standalone Gateway Service Implementation
 * 
 * Safely eliminates DNS Rebinding (TOCTOU) vulnerabilities by binding
 * IP validation directly into the socket connection pipeline.
 */

import dns from 'node:dns';
import https from 'node:https';
import { isForbiddenIpAddress, isPrivateOrInternalHost } from './ipValidator.js';
import { GatewaySecurityError } from '../errors.js';

export interface ValidatedDnsResult {
  hostname: string;
  addresses: string[];
  primaryIp: string;
  family: number;
}

/**
 * Resolves all DNS records for a hostname and validates EVERY returned IP address.
 * If ANY resolved IP is private/forbidden, FAILS CLOSED immediately.
 */
export async function resolveAndValidateDns(hostname: string): Promise<ValidatedDnsResult> {
  if (!hostname || typeof hostname !== 'string') {
    throw new GatewaySecurityError('نام دامنه مشخص نشده است.', 'SOURCE_DOMAIN_MISMATCH', 400);
  }

  const cleanHost = hostname.toLowerCase().trim();

  // Direct IP or internal hostname check
  if (isPrivateOrInternalHost(cleanHost)) {
    throw new GatewaySecurityError(
      `دسترسی به آدرس‌های داخلی یا محلی (${cleanHost}) مسدود است.`,
      'SSRF_BLOCKED',
      403
    );
  }

  let records: dns.LookupAddress[];
  try {
    records = await dns.promises.lookup(cleanHost, { all: true, verbatim: true });
  } catch (_err: any) {
    throw new GatewaySecurityError(
      `خطا در تفکیک آدرس شبکه (DNS) برای دامنه '${cleanHost}'. دسترسی مسدود شد.`,
      'ORIGIN_UNREACHABLE',
      502
    );
  }

  if (!records || records.length === 0) {
    throw new GatewaySecurityError(
      `هیچ آدرس IP معتبری برای دامنه '${cleanHost}' یافت نشد.`,
      'ORIGIN_UNREACHABLE',
      502
    );
  }

  const addresses: string[] = [];

  for (const record of records) {
    const ip = record.address;
    addresses.push(ip);

    if (isForbiddenIpAddress(ip)) {
      throw new GatewaySecurityError(
        `دامنه '${cleanHost}' به آدرس غیرمجاز یا محلی (${ip}) تفکیک می‌شود. درخواست مسدود گردید.`,
        'SSRF_BLOCKED',
        403
      );
    }
  }

  return {
    hostname: cleanHost,
    addresses,
    primaryIp: records[0].address,
    family: records[0].family
  };
}

/**
 * Creates an https.Agent that delegates DNS resolution to safe in-line validation.
 * This ensures that the IP connected to by the TLS socket is guaranteed to have passed
 * SSRF validation without allowing a second, unvalidated DNS lookup (DNS Rebinding protection).
 */
export function createSafeHttpsAgent(): https.Agent {
  return new https.Agent({
    keepAlive: false,
    timeout: 10000,
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
        if (err) {
          return callback(err, '', 4);
        }
        if (!addresses || addresses.length === 0) {
          return callback(new GatewaySecurityError('DNS resolution returned no addresses', 'ORIGIN_UNREACHABLE', 502), '', 4);
        }
        for (const addr of addresses) {
          if (isForbiddenIpAddress(addr.address)) {
            return callback(
              new GatewaySecurityError(
                `SSRF protection blocked non-public IP: ${addr.address}`,
                'SSRF_BLOCKED',
                403
              ),
              '',
              4
            );
          }
        }
        // Return verified first IP
        callback(null, addresses[0].address, addresses[0].family);
      });
    }
  });
}
