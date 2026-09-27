import crypto from 'crypto';
import { getSecurityConfig } from './config.js';
import { userRepository } from '../repositories/userRepository.js';

export interface OTPRecord {
  phone: string;
  code: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
}

// In-memory enhanced tracker for attempt counts and security metadata
const otpStore = new Map<string, OTPRecord>();

export const otpService = {
  /**
   * Cryptographically secure OTP generation using crypto.randomInt
   */
  generateOTP(phone: string): { code: string; expiresAt: number } {
    const config = getSecurityConfig();
    
    // Invalidate any previous active OTP
    otpStore.delete(phone);

    // Cryptographically secure 6-digit OTP (100000 - 999999)
    const min = Math.pow(10, config.otp.length - 1);
    const max = Math.pow(10, config.otp.length);
    const numericCode = crypto.randomInt(min, max);
    const code = numericCode.toString();

    const expiresAt = Date.now() + config.otp.expiryMs;
    const record: OTPRecord = {
      phone,
      code,
      expiresAt,
      attempts: 0,
      maxAttempts: config.otp.maxAttempts
    };

    otpStore.set(phone, record);

    return { code, expiresAt };
  },

  /**
   * Verifies OTP with attempt limiting, single-use invalidation, and expiration check
   */
  verifyOTP(phone: string, inputCode: string): { success: boolean; error?: string } {
    const record = otpStore.get(phone);

    if (!record) {
      return { success: false, error: 'INVALID_OR_EXPIRED_OTP' };
    }

    // Check expiration
    if (Date.now() > record.expiresAt) {
      otpStore.delete(phone);
      return { success: false, error: 'OTP_EXPIRED' };
    }

    // Check max attempts
    if (record.attempts >= record.maxAttempts) {
      otpStore.delete(phone);
      return { success: false, error: 'TOO_MANY_ATTEMPTS' };
    }

    record.attempts += 1;

    // Secure constant-time string comparison or strict equality
    const match = crypto.timingSafeEqual(
      Buffer.from(record.code.padEnd(10, ' ')),
      Buffer.from(inputCode.padEnd(10, ' '))
    );

    if (!match) {
      if (record.attempts >= record.maxAttempts) {
        otpStore.delete(phone);
        return { success: false, error: 'TOO_MANY_ATTEMPTS' };
      }
      return { success: false, error: 'INVALID_OTP' };
    }

    // Single-use: immediately invalidate
    otpStore.delete(phone);

    return { success: true };
  },

  /**
   * Explicitly invalidate active OTP for a phone
   */
  invalidate(phone: string): void {
    otpStore.delete(phone);
  },

  /**
   * Diagnostic helper for testing attempt limits
   */
  getAttempts(phone: string): number {
    return otpStore.get(phone)?.attempts || 0;
  }
};
