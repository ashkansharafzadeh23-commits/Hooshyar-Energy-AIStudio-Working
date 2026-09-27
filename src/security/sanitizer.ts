/**
 * Sensitive Data Sanitizer & Response Serializer
 * Recursively strips credentials, secrets, password hashes, and OTP codes before sending responses.
 */

const BLOCKED_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'otp',
  'code',
  'jwtsecret',
  'jwt_secret',
  'apikey',
  'api_key',
  'clientsecret',
  'client_secret',
  'tokensecret',
  'secretkey',
  'secret_key',
  'privatekey',
  'private_key'
]);

export function sanitizeResponseData<T>(data: T, allowedFields?: Set<string>): T {
  if (data === null || data === undefined) return data;

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponseData(item, allowedFields)) as unknown as T;
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    const lower = key.toLowerCase();

    // Skip blocked security sensitive keys
    if (BLOCKED_KEYS.has(lower) && (!allowedFields || !allowedFields.has(key))) {
      continue;
    }

    if (value && typeof value === 'object') {
      result[key] = sanitizeResponseData(value, allowedFields);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
