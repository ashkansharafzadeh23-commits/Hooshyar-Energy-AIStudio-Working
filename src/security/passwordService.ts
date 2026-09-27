import crypto from 'crypto';

const KEY_LENGTH = 64;

export const passwordService = {
  /**
   * Hashes a password with a cryptographically secure random salt using scrypt
   */
  hashPassword(password: string): string {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
    return `${salt}:${derivedKey.toString('hex')}`;
  },

  /**
   * Verifies password against stored hash using constant-time comparison
   */
  verifyPassword(password: string, storedHash: string): boolean {
    if (!password || !storedHash) return false;
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;

    const [salt, key] = parts;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);

    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  },

  /**
   * Sanitizes user object to guarantee password/hash is never exposed in API responses
   */
  sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, 'password' | 'passwordHash'> {
    if (!user) return user;
    const { password, passwordHash, ...safeUser } = user;
    return safeUser as Omit<T, 'password' | 'passwordHash'>;
  }
};
