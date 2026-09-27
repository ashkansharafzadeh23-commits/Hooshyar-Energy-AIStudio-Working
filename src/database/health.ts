/**
 * Database Health Abstraction (PH-4)
 * Decouples health routes from concrete storage implementations.
 * Mediates between health probes and active storage adapters (PostgreSQL / JSON).
 * Truthfully reports NOT_CONFIGURED or NOT_PRODUCTION_VERIFIED when PostgreSQL is not connected.
 */

import { checkPostgresConnectivity } from './postgres/connection.js';

export type DatabaseHealthState = 'UP' | 'DOWN' | 'DEGRADED';
export type PostgresVerificationState = 'UP' | 'DOWN' | 'NOT_CONFIGURED' | 'NOT_PRODUCTION_VERIFIED';

export interface StorageAdapterHealth {
  driver: 'postgres' | 'json';
  status: DatabaseHealthState;
  configured: boolean;
  verified: boolean;
  latencyMs?: number;
  details?: string;
}

export interface DatabaseReadinessResult {
  status: DatabaseHealthState;
  activeDriver: 'postgres' | 'json';
  isProductionVerified: boolean;
  postgres: {
    status: PostgresVerificationState;
    verified: boolean;
    latencyMs?: number;
    details?: string;
  };
  jsonAdapter?: {
    status: DatabaseHealthState;
    details: string;
  };
  details: string;
}

/**
 * Checks database readiness through the storage adapter abstraction.
 * The health route itself MUST NOT know about or inspect db.json.
 */
export async function checkDatabaseReadiness(): Promise<DatabaseReadinessResult> {
  const isPostgresDriver = process.env.DB_DRIVER === 'postgres';
  const isProduction = process.env.NODE_ENV === 'production';
  const databaseUrl = process.env.DATABASE_URL;

  // 1. Evaluate PostgreSQL adapter health abstraction
  let postgresStatus: PostgresVerificationState = 'NOT_CONFIGURED';
  let postgresVerified = false;
  let postgresLatencyMs: number | undefined;
  let postgresDetails = 'PostgreSQL is not configured in this environment.';

  if (databaseUrl) {
    const pgCheck = await checkPostgresConnectivity(2500);
    if (pgCheck.ok) {
      postgresStatus = 'UP';
      postgresVerified = true;
      postgresLatencyMs = pgCheck.latencyMs;
      postgresDetails = `PostgreSQL connection verified via SELECT 1 (${pgCheck.latencyMs}ms)`;
    } else {
      postgresStatus = 'NOT_PRODUCTION_VERIFIED';
      postgresVerified = false;
      postgresDetails = `PostgreSQL check failed: ${pgCheck.error || 'Connection error'}`;
    }
  } else {
    postgresStatus = 'NOT_CONFIGURED';
    postgresVerified = false;
    postgresDetails = 'NOT_CONFIGURED: DATABASE_URL is not set.';
  }

  // 2. Evaluate JSON adapter health (for development/test)
  const jsonAdapterHealth = {
    status: 'UP' as DatabaseHealthState,
    details: 'JSON storage adapter initialized and active for development/test mode.'
  };

  // 3. Determine overall database component readiness
  let overallStatus: DatabaseHealthState = 'UP';
  let isProductionVerified = false;
  let overallDetails = '';

  if (isPostgresDriver) {
    if (postgresVerified) {
      overallStatus = 'UP';
      isProductionVerified = true;
      overallDetails = postgresDetails;
    } else {
      overallStatus = 'DOWN';
      isProductionVerified = false;
      overallDetails = postgresDetails;
    }
  } else {
    // JSON storage is the active driver
    if (isProduction) {
      // In production, PostgreSQL is mandatory; do NOT report PostgreSQL UP based on JSON storage!
      overallStatus = 'DOWN';
      isProductionVerified = false;
      overallDetails = `Production requires verified PostgreSQL, but active driver is json. PostgreSQL status: ${postgresStatus}.`;
    } else {
      overallStatus = 'UP';
      isProductionVerified = false;
      overallDetails = `JSON storage adapter active (development/test). PostgreSQL: ${postgresStatus}.`;
    }
  }

  return {
    status: overallStatus,
    activeDriver: isPostgresDriver ? 'postgres' : 'json',
    isProductionVerified,
    postgres: {
      status: postgresStatus,
      verified: postgresVerified,
      latencyMs: postgresLatencyMs,
      details: postgresDetails
    },
    jsonAdapter: isPostgresDriver ? undefined : jsonAdapterHealth,
    details: overallDetails
  };
}
