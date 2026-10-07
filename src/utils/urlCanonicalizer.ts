/**
 * HOOSHYAR ENERGY — URL CANONICALIZATION & SANITIZATION UTILITY
 * Stage 13.10.2 Secure Ingestion Foundation
 * 
 * Enforces strict URL safety and deterministic canonicalization:
 * - Requires HTTPS protocol
 * - Lowercases hostname and strips default ports
 * - Strips userinfo credentials
 * - Strips URL fragments
 * - Strips known marketing/analytics tracking parameters
 * - Preserves substantive query parameters sorted deterministically
 * - Rejects dangerous pseudo-protocols (javascript:, data:, file:, vbscript:, etc.)
 */

// Tracking parameters stripped during canonicalization
const TRACKING_PARAM_PATTERNS = [
  /^utm_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^ga_/i,
  /^mc_cid$/i,
  /^mc_eid$/i,
  /^igshid$/i,
  /^_hsenc$/i,
  /^_hsmi$/i,
  /^ysclid$/i
];

export interface CanonicalUrlResult {
  isValid: boolean;
  canonicalUrl?: string;
  error?: string;
  hostname?: string;
}

/**
 * Checks if a parameter name is a tracking parameter.
 */
function isTrackingParameter(paramName: string): boolean {
  return TRACKING_PARAM_PATTERNS.some(pattern => pattern.test(paramName));
}

/**
 * Validates and canonicalizes an external energy source URL.
 */
export function canonicalizeSourceUrl(rawUrl: string): CanonicalUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'آدرس اینترنتی ارائه نشده است.' };
  }

  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();

  // Reject dangerous pseudo-protocols
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('ftp:') ||
    lower.startsWith('blob:')
  ) {
    return { isValid: false, error: 'پروتکل آدرس نامعتبر یا ناامن است.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, error: 'فرمت آدرس اینترنتی نامعتبر است.' };
  }

  // Enforce HTTPS
  if (parsed.protocol !== 'https:') {
    return { isValid: false, error: 'پروتکل آدرس باید حتماً HTTPS باشد.' };
  }

  // Reject credentials in userinfo (https://user:pass@host)
  if (parsed.username || parsed.password) {
    return { isValid: false, error: 'درج نام کاربری و رمز در آدرس مجاز نمی‌باشد.' };
  }

  const hostname = parsed.hostname.toLowerCase().trim();
  if (!hostname || hostname.includes('..') || hostname.startsWith('.') || hostname.endsWith('.')) {
    return { isValid: false, error: 'نام دامنه آدرس نامعتبر است.' };
  }

  // Clean pathname: collapse double slashes, normalize trailing slash
  let cleanPath = parsed.pathname.replace(/\/+/g, '/');
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }

  // Filter and sort query parameters deterministically
  const cleanParams = new URLSearchParams();
  const sortedKeys = Array.from(parsed.searchParams.keys()).sort();

  for (const key of sortedKeys) {
    if (!isTrackingParameter(key)) {
      const values = parsed.searchParams.getAll(key);
      for (const val of values) {
        cleanParams.append(key, val);
      }
    }
  }

  const queryString = cleanParams.toString();
  const canonicalUrl = `https://${hostname}${cleanPath}${queryString ? `?${queryString}` : ''}`;

  return {
    isValid: true,
    canonicalUrl,
    hostname
  };
}

/**
 * Validates whether an IP address is a private, loopback, link-local, multicast,
 * carrier-grade NAT, or reserved/forbidden address (Anti-SSRF).
 */
export function isForbiddenIpAddress(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return true;
  let cleanIp = ip.toLowerCase().trim();

  // Strip brackets if IPv6 [::1]
  if (cleanIp.startsWith('[') && cleanIp.endsWith(']')) {
    cleanIp = cleanIp.slice(1, -1);
  }

  // Handle IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (cleanIp.startsWith('::ffff:')) {
    const remainder = cleanIp.slice(7);
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(remainder)) {
      cleanIp = remainder;
    } else if (/^[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(remainder)) {
      const parts = remainder.split(':');
      const num1 = parseInt(parts[0], 16);
      const num2 = parseInt(parts[1], 16);
      const b1 = (num1 >> 8) & 0xff;
      const b2 = num1 & 0xff;
      const b3 = (num2 >> 8) & 0xff;
      const b4 = num2 & 0xff;
      cleanIp = `${b1}.${b2}.${b3}.${b4}`;
    } else {
      return true; // Malformed mapped address -> fail closed
    }
  }

  // IPv4 evaluation
  const ipv4Parts = cleanIp.split('.');
  if (ipv4Parts.length === 4 && ipv4Parts.every(p => /^\d+$/.test(p))) {
    const [o1, o2, o3, o4] = ipv4Parts.map(Number);
    if ([o1, o2, o3, o4].some(o => o < 0 || o > 255 || isNaN(o))) return true;

    // 0.0.0.0/8 (Current network)
    if (o1 === 0) return true;
    // 10.0.0.0/8 (Private)
    if (o1 === 10) return true;
    // 100.64.0.0/10 (Carrier-Grade NAT: 100.64.0.0 - 100.127.255.255)
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (o1 === 127) return true;
    // 169.254.0.0/16 (Link-local / Cloud metadata)
    if (o1 === 169 && o2 === 254) return true;
    // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (o1 === 192 && o2 === 0 && o3 === 0) return true;
    // 192.0.2.0/24 (TEST-NET-1)
    if (o1 === 192 && o2 === 0 && o3 === 2) return true;
    // 192.88.99.0/24 (6to4 Relay)
    if (o1 === 192 && o2 === 88 && o3 === 99) return true;
    // 192.168.0.0/16 (Private)
    if (o1 === 192 && o2 === 168) return true;
    // 198.18.0.0/15 (Benchmarking: 198.18.0.0 - 198.19.255.255)
    if (o1 === 198 && (o2 === 18 || o2 === 19)) return true;
    // 198.51.100.0/24 (TEST-NET-2)
    if (o1 === 198 && o2 === 51 && o3 === 100) return true;
    // 203.0.113.0/24 (TEST-NET-3)
    if (o1 === 203 && o2 === 0 && o3 === 113) return true;
    // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
    if (o1 >= 224 && o1 <= 239) return true;
    // 240.0.0.0/4 (Reserved / Broadcast: 240.0.0.0 - 255.255.255.255)
    if (o1 >= 240) return true;

    return false;
  }

  // IPv6 evaluation
  if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1') return true;
  if (cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:0') return true;

  // fc00::/7 (Unique Local Address - fc00... / fd00...)
  if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true;

  // fe80::/10 (Link-Local Unicast - fe8..., fe9..., fea..., feb...)
  if (/^fe[89ab]/i.test(cleanIp)) return true;

  // ff00::/8 (Multicast)
  if (cleanIp.startsWith('ff')) return true;

  // 2001:db8::/32 (Documentation)
  if (cleanIp.startsWith('2001:db8') || cleanIp.startsWith('2001:0db8')) return true;

  return false;
}

/**
 * Validates whether an IP address or hostname is a private/internal network address (Anti-SSRF).
 */
export function isPrivateOrInternalAddress(host: string): boolean {
  if (!host) return true;
  const h = host.toLowerCase().trim();

  // Localhost & loopback strings
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '0.0.0.0') {
    return true;
  }

  // Internal corporate/cluster suffixes
  if (
    h.endsWith('.local') || 
    h.endsWith('.internal') || 
    h.endsWith('.corp') || 
    h.endsWith('.lan') ||
    h.endsWith('.home') ||
    h.endsWith('.arpa')
  ) {
    return true;
  }

  // Check if direct IP address
  return isForbiddenIpAddress(h);
}
