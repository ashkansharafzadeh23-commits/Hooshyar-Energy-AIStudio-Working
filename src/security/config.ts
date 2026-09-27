/**
 * Hooshyar Energy - Central Security Configuration (PH-3)
 */

import { getEnvironmentConfig, maskSecret } from '../config/environment.js';

export { maskSecret };

export interface SecurityConfig {
  isProduction: boolean;
  isTest: boolean;
  jwt: {
    secret: string;
    issuer: string;
    audience: string;
    expiresIn: string;
  };
  otp: {
    length: number;
    expiryMs: number;
    maxAttempts: number;
  };
  cors: {
    allowedOrigins: string[];
  };
  bodyLimit: string;
  mocks: {
    smsConfigured: boolean;
    paymentConfigured: boolean;
    aiConfigured: boolean;
  };
}

export function getSecurityConfig(): SecurityConfig {
  const envConfig = getEnvironmentConfig();

  return {
    isProduction: envConfig.isProduction,
    isTest: envConfig.isTest,
    jwt: {
      secret: envConfig.auth.jwtSecret,
      issuer: envConfig.auth.jwtIssuer,
      audience: envConfig.auth.jwtAudience,
      expiresIn: envConfig.auth.jwtExpiresIn
    },
    otp: {
      length: 6,
      expiryMs: 3 * 60 * 1000, // 3 minutes
      maxAttempts: 3
    },
    cors: {
      allowedOrigins: envConfig.cors.allowedOrigins
    },
    bodyLimit: envConfig.bodyLimit,
    mocks: {
      smsConfigured: envConfig.integrations.sms.configured,
      paymentConfigured: envConfig.integrations.payment.configured,
      aiConfigured: envConfig.integrations.gemini.configured
    }
  };
}
