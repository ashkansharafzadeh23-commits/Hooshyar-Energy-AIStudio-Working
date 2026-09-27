/**
 * Hooshyar Energy — Central Production Environment Contract (PH-5)
 * 
 * Provides strict, fail-fast validation of environment variables at startup.
 * Enforces production safety invariants:
 *  - Production must FAIL FAST if critical variables (NODE_ENV, DATABASE_URL, JWT_SECRET, CORS) are missing.
 *  - Silent fallback from PostgreSQL to JSON storage is strictly prohibited in production.
 *  - Silent fallback from production secrets to default secrets is strictly prohibited.
 *  - Optional external integrations (Gemini, SMS, Zarinpal, NASA) expose their readiness truthfully.
 *  - Secret values are NEVER printed or logged.
 */

export type AppEnvironment = 'production' | 'development' | 'test';

export interface DatabaseConfig {
  driver: 'postgres' | 'json';
  url?: string;
  isConfigured: boolean;
  maxConnections: number;
  connectionTimeoutMs: number;
  ssl: boolean;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtIssuer: string;
  jwtAudience: string;
}

export interface CorsConfig {
  allowedOrigins: string[];
}

export interface IntegrationsStatus {
  gemini: {
    configured: boolean;
    status: 'CONFIGURED' | 'NOT_CONFIGURED';
  };
  nasa: {
    configured: boolean;
    status: 'CONFIGURED' | 'AVAILABLE';
  };
  sms: {
    configured: boolean;
    provider?: string;
    status: 'CONFIGURED_NOT_VERIFIED' | 'NOT_CONFIGURED' | 'PRODUCTION_VERIFIED';
  };
  payment: {
    configured: boolean;
    sandbox: boolean;
    status: 'PRODUCTION_VERIFIED' | 'SANDBOX_ONLY' | 'NOT_CONFIGURED' | 'NOT_VERIFIED';
  };
  monitoring: {
    configured: boolean;
    status: 'TRUTHFUL_TELEMETRY';
  };
}

export interface EnvironmentConfig {
  env: AppEnvironment;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  port: number;
  database: DatabaseConfig;
  auth: AuthConfig;
  cors: CorsConfig;
  bodyLimit: string;
  integrations: IntegrationsStatus;
}

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: EnvironmentConfig;
}

/**
 * Mask secrets for safe diagnostics and structured logging
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return '[NOT_CONFIGURED]';
  if (secret.length <= 6) return '******';
  return `${secret.substring(0, 3)}...${secret.substring(secret.length - 3)}`;
}

/**
 * Validates the runtime environment against production standards
 */
export function validateEnvironment(customEnv?: NodeJS.ProcessEnv): ValidationReport {
  const envSource = customEnv || process.env;
  const rawEnv = (envSource.NODE_ENV || 'development').toLowerCase();
  const env: AppEnvironment = (rawEnv === 'production' || rawEnv === 'test') ? rawEnv : 'development';
  const isProduction = env === 'production';
  const isTest = env === 'test';
  const isDevelopment = env === 'development';

  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Port Configuration
  const port = parseInt(envSource.PORT || '3000', 10);

  // 2. JWT Configuration & Secret
  let jwtSecret = envSource.JWT_SECRET || '';
  if (!jwtSecret) {
    if (isProduction) {
      errors.push('CRITICAL: JWT_SECRET environment variable is missing in production mode.');
    } else {
      jwtSecret = 'dev_insecure_ephemeral_secret';
      warnings.push('JWT_SECRET is not set; using insecure ephemeral fallback for dev/test.');
    }
  } else if (isProduction && jwtSecret.length < 32) {
    errors.push('CRITICAL: JWT_SECRET in production must be at least 32 characters long for cryptographic security.');
  }

  const auth: AuthConfig = {
    jwtSecret,
    jwtExpiresIn: envSource.JWT_EXPIRES_IN || '7d',
    jwtIssuer: envSource.JWT_ISSUER || 'hooshyar-energy',
    jwtAudience: envSource.JWT_AUDIENCE || 'hooshyar-api'
  };

  // 3. Database Configuration
  const databaseUrl = envSource.DATABASE_URL;
  const rawDriver = (envSource.DB_DRIVER || '').toLowerCase();
  let driver: 'postgres' | 'json' = isProduction ? 'postgres' : (rawDriver === 'postgres' ? 'postgres' : 'json');

  if (isProduction) {
    if (!databaseUrl) {
      errors.push('CRITICAL: DATABASE_URL is missing in production mode. Silent fallback to JSON storage is strictly prohibited.');
    }
    if (rawDriver === 'json') {
      errors.push('CRITICAL: DB_DRIVER cannot be set to "json" in production mode.');
    }
  } else if (!databaseUrl && driver === 'postgres') {
    warnings.push('DB_DRIVER=postgres requested but DATABASE_URL is missing; falling back to JSON driver for local dev.');
    driver = 'json';
  }

  const ssl = isProduction || envSource.PG_SSL === 'true' || Boolean(databaseUrl && databaseUrl.includes('sslmode=require'));
  const database: DatabaseConfig = {
    driver,
    url: databaseUrl,
    isConfigured: Boolean(databaseUrl),
    maxConnections: parseInt(envSource.PG_MAX_CONNECTIONS || '20', 10),
    connectionTimeoutMs: parseInt(envSource.PG_CONNECTION_TIMEOUT_MS || '5000', 10),
    ssl
  };

  // 4. CORS Allowed Origins
  let allowedOrigins: string[] = [];
  if (envSource.ALLOWED_ORIGINS || envSource.CORS_ALLOWED_ORIGINS) {
    const rawOrigins = envSource.ALLOWED_ORIGINS || envSource.CORS_ALLOWED_ORIGINS || '';
    allowedOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);
  } else if (isProduction) {
    errors.push('CRITICAL: ALLOWED_ORIGINS (or CORS_ALLOWED_ORIGINS) must be explicitly configured in production.');
  } else {
    allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
  }

  const cors: CorsConfig = { allowedOrigins };

  // 5. External Integrations Status (Truthful evaluation without mandatory failure unless required)
  const geminiConfigured = Boolean(envSource.GEMINI_API_KEY);
  const smsConfigured = Boolean(envSource.SMS_API_KEY || envSource.KAVENEGAR_API_KEY);
  const zarinpalConfigured = Boolean(envSource.ZARINPAL_MERCHANT_ID);
  const zarinpalSandbox = envSource.ZARINPAL_SANDBOX === 'true';

  let paymentStatus: 'PRODUCTION_VERIFIED' | 'SANDBOX_ONLY' | 'NOT_CONFIGURED' | 'NOT_VERIFIED' = 'NOT_CONFIGURED';
  if (zarinpalConfigured) {
    paymentStatus = zarinpalSandbox ? 'SANDBOX_ONLY' : 'NOT_VERIFIED';
  }

  const integrations: IntegrationsStatus = {
    gemini: {
      configured: geminiConfigured,
      status: geminiConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED'
    },
    nasa: {
      configured: true,
      status: 'AVAILABLE' // NASA POWER public satellite open data API
    },
    sms: {
      configured: smsConfigured,
      provider: envSource.SMS_API_KEY ? 'FARAZ_SMS' : (envSource.KAVENEGAR_API_KEY ? 'KAVENEGAR' : undefined),
      status: smsConfigured ? 'CONFIGURED_NOT_VERIFIED' : 'NOT_CONFIGURED'
    },
    payment: {
      configured: zarinpalConfigured,
      sandbox: zarinpalSandbox,
      status: paymentStatus
    },
    monitoring: {
      configured: true,
      status: 'TRUTHFUL_TELEMETRY'
    }
  };

  const config: EnvironmentConfig = {
    env,
    isProduction,
    isDevelopment,
    isTest,
    port,
    database,
    auth,
    cors,
    bodyLimit: envSource.BODY_LIMIT || '1mb',
    integrations
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config
  };
}

let cachedConfig: EnvironmentConfig | null = null;

/**
 * Get active environment configuration with caching
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  if (!cachedConfig) {
    const report = validateEnvironment();
    if (!report.isValid && report.config.isProduction) {
      throw new Error(`CRITICAL_ENVIRONMENT_CONFIGURATION_FAILURE:\n${report.errors.join('\n')}`);
    }
    cachedConfig = report.config;
  }
  return cachedConfig;
}

/**
 * Resets cached environment (for testing purposes)
 */
export function resetEnvironmentConfig(): void {
  cachedConfig = null;
}

/**
 * Strict fail-fast assertion for production startup
 */
export function assertProductionReadiness(customEnv?: NodeJS.ProcessEnv): EnvironmentConfig {
  const report = validateEnvironment(customEnv);
  if (!report.isValid) {
    const errorMsg = [
      '================================================================',
      'FATAL: HOOSHYAR ENERGY PRODUCTION READINESS GATE FAILED',
      '================================================================',
      ...report.errors,
      '================================================================'
    ].join('\n');
    throw new Error(errorMsg);
  }
  return report.config;
}
