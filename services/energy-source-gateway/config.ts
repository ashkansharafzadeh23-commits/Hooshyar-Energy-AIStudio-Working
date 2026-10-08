/**
 * HOOSHYAR ENERGY SOURCE GATEWAY — SERVICE CONFIGURATION
 * Stage 13.10.2-C2C: Standalone Gateway Service Implementation
 * 
 * Centralized, secure configuration management for the isolated Gateway service.
 * Enforces strict environment boundaries, secret entropy requirements, and safe defaults.
 */

import { GatewaySecurityError } from './errors.js';

export interface GatewayServiceConfig {
  port: number;
  nodeEnv: string;
  gatewayId: string;
  hmacSecret: string;
  maxPayloadBytes: number;
  fetchTimeoutMs: number;
  maxRedirects: number;
}

export const DEFAULT_GATEWAY_PORT = 3100;
export const DEFAULT_GATEWAY_ID = 'gw-iran-01';
export const MAX_GATEWAY_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const DEFAULT_FETCH_TIMEOUT_MS = 10000; // 10 seconds
export const MAX_ALLOWED_REDIRECTS = 2; // Strict redirect cap

/**
 * Validates and retrieves the HMAC secret from environment.
 * Requires either a 64-character hexadecimal string (representing 256 bits of key material)
 * or a securely generated UTF-8 string of at least 32 bytes.
 * Fails securely if missing or insufficient.
 */
export function getGatewayServiceSecret(overrideSecret?: string): string {
  const secret = overrideSecret || process.env.ENERGY_GATEWAY_HMAC_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new GatewaySecurityError(
      'کلید امنیتی امضای گیت‌وی (ENERGY_GATEWAY_HMAC_SECRET) پیکربندی نشده است.',
      'GATEWAY_SECRET_NOT_CONFIGURED',
      500
    );
  }

  const cleanSecret = secret.trim();
  const byteLength = Buffer.byteLength(cleanSecret, 'utf8');

  // Accept 64-char hex string (32 bytes) or at least 32 UTF-8 bytes
  const isHex64 = cleanSecret.length === 64 && /^[0-9a-fA-F]{64}$/.test(cleanSecret);
  if (!isHex64 && byteLength < 32) {
    throw new GatewaySecurityError(
      'کلید امنیتی گیت‌وی باید حداقل ۳۲ بایت یا یک رشته هگزادسیمال ۶۴ نویسه‌ای باشد.',
      'GATEWAY_SECRET_NOT_CONFIGURED',
      500
    );
  }

  return cleanSecret;
}

/**
 * Loads current gateway service configuration.
 */
export function loadGatewayConfig(overrideSecret?: string): GatewayServiceConfig {
  const port = Number(process.env.ENERGY_GATEWAY_PORT || process.env.PORT || DEFAULT_GATEWAY_PORT);
  const nodeEnv = process.env.NODE_ENV || 'development';
  const gatewayId = process.env.ENERGY_GATEWAY_ID || DEFAULT_GATEWAY_ID;
  const hmacSecret = getGatewayServiceSecret(overrideSecret);

  return {
    port: isNaN(port) ? DEFAULT_GATEWAY_PORT : port,
    nodeEnv,
    gatewayId,
    hmacSecret,
    maxPayloadBytes: MAX_GATEWAY_PAYLOAD_BYTES,
    fetchTimeoutMs: DEFAULT_FETCH_TIMEOUT_MS,
    maxRedirects: MAX_ALLOWED_REDIRECTS
  };
}
