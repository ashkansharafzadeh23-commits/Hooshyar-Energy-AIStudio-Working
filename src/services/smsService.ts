/**
 * Hooshyar Energy — SMS Production Boundary Service (PH-5)
 * 
 * Provides truthful status classification and secure dispatching for SMS/OTP notifications:
 *  - PRODUCTION_VERIFIED / CONFIGURED_NOT_VERIFIED / NOT_CONFIGURED
 *  - Enforces production fail-fast when SMS is required but unconfigured
 *  - Protects against credential logging or raw OTP leakage
 *  - Timeout & circuit breaker protection for SMS provider APIs
 */

import { externalClient } from '../reliability/externalClient.js';
import { logger } from '../observability/logger.js';
import { mockGuards } from '../security/mockGuard.js';
import { getEnvironmentConfig, maskSecret } from '../config/environment.js';

export type SmsProductionStatus =
  | 'PRODUCTION_VERIFIED'
  | 'CONFIGURED_NOT_VERIFIED'
  | 'NOT_CONFIGURED';

export interface SendOtpResult {
  success: boolean;
  provider: string;
  messageId?: string;
  status: SmsProductionStatus;
  simulated?: boolean;
}

export class SmsService {
  /**
   * Truthfully determines SMS provider readiness status
   */
  public getSmsProductionStatus(): SmsProductionStatus {
    const config = getEnvironmentConfig();
    return config.integrations.sms.status;
  }

  /**
   * Validates standard Iranian mobile number formats (09XXXXXXXXX or +989XXXXXXXXX)
   */
  public validatePhoneNumber(phone: string): boolean {
    if (!phone) return false;
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    const iranPhoneRegex = /^(\+98|0)?9\d{9}$/;
    return iranPhoneRegex.test(cleaned);
  }

  /**
   * Sends OTP code via configured SMS provider or safe dev simulator
   */
  public async sendOtp(phone: string, code: string): Promise<SendOtpResult> {
    if (!this.validatePhoneNumber(phone)) {
      throw new Error('شماره همراه وارد شده نامعتبر است.');
    }

    const config = getEnvironmentConfig();
    const apiKey = process.env.SMS_API_KEY || process.env.KAVENEGAR_API_KEY;

    // In production, block if not configured
    if (config.isProduction && !apiKey) {
      throw new Error('SERVICE_NOT_CONFIGURED: SMS service is not configured in production. Mock SMS delivery is prohibited.');
    }

    // 1. Production / Configured Dispatch via Kavenegar / FarazSMS REST API
    if (apiKey) {
      const isKavenegar = Boolean(process.env.KAVENEGAR_API_KEY);
      const endpoint = isKavenegar
        ? `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`
        : (process.env.SMS_API_URL || 'https://ippanel.com/services.jspd');

      try {
        const payload = isKavenegar
          ? { receptor: phone, token: code, template: process.env.SMS_TEMPLATE || 'hooshyar-verify' }
          : { op: 'pattern', user: process.env.SMS_USER, pass: apiKey, fromNum: process.env.SMS_SENDER, toNum: phone, pattern_code: process.env.SMS_PATTERN, input_data: { code } };

        const response = await externalClient.post(endpoint, payload, {
          timeoutMs: 5000,
          service: isKavenegar ? 'KAVENEGAR_SMS' : 'FARAZ_SMS',
          operation: 'SEND_OTP',
          isIdempotent: false
        });

        logger.info('SMS OTP dispatched successfully via provider', {
          service: 'SMS_SERVICE',
          event: 'SMS_DISPATCHED',
          metadata: {
            provider: isKavenegar ? 'KAVENEGAR' : 'FARAZ_SMS',
            phone: `${phone.slice(0, 4)}***${phone.slice(-2)}`,
            status: response.status
          }
        });

        return {
          success: true,
          provider: isKavenegar ? 'KAVENEGAR' : 'FARAZ_SMS',
          messageId: response.data?.entries?.[0]?.messageid || response.data?.message_id || 'OK',
          status: 'CONFIGURED_NOT_VERIFIED'
        };
      } catch (err: any) {
        logger.error('SMS provider dispatch failed', err, {
          service: 'SMS_SERVICE',
          event: 'SMS_PROVIDER_ERROR',
          metadata: {
            provider: isKavenegar ? 'KAVENEGAR' : 'FARAZ_SMS',
            phone: `${phone.slice(0, 4)}***${phone.slice(-2)}`
          }
        });

        if (config.isProduction) {
          throw new Error('ارسال پیامک با خطا مواجه شد. لطفاً دقایقی دیگر مجدداً تلاش نمایید.');
        }
      }
    }

    // 2. Development / Test safe simulated dispatch
    logger.info(`[DEV-SMS] Simulated OTP delivery to ${phone.slice(0, 4)}***${phone.slice(-2)}`, {
      service: 'SMS_SERVICE',
      event: 'DEV_SMS_SIMULATION',
      metadata: { isDev: true, keyConfigured: Boolean(apiKey) }
    });

    return {
      success: true,
      provider: 'SIMULATOR',
      messageId: `DEV_MSG_${Date.now()}`,
      status: 'NOT_CONFIGURED',
      simulated: true
    };
  }
}

export const smsService = new SmsService();
