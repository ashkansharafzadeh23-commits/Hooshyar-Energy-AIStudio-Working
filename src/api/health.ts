/**
 * Production Health & Readiness Endpoints (PH-4)
 * /health/live: Returns 200 if process is running
 * /health/ready: Evaluates core dependencies (DB, Security, Memory) without exposing secrets
 * /api/health: Backward-compatible alias
 */

import express, { Request, Response } from 'express';
import { checkDatabaseReadiness } from '../database/health.js';
import { getSecurityConfig } from '../security/config.js';
import { externalCircuitBreakers } from '../reliability/circuitBreaker.js';

const router = express.Router();

export interface ComponentHealth {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  details?: string;
  driver?: string;
  postgresStatus?: string;
  isProductionVerified?: boolean;
}

export interface ReadinessReport {
  status: 'READY' | 'NOT_READY' | 'DEGRADED';
  timestamp: string;
  uptimeSeconds: number;
  components: {
    database: ComponentHealth;
    configuration: ComponentHealth;
    memory: ComponentHealth;
    circuitBreakers: Record<string, string>;
  };
}

// Liveness Probe: process is alive and accepting events
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Readiness Probe: evaluates dependencies safely through abstractions
router.get('/ready', async (_req: Request, res: Response) => {
  const uptime = Math.floor(process.uptime());
  const timestamp = new Date().toISOString();

  // 1. Database Check via Database Health Abstraction (Health route does NOT know about db.json)
  let dbHealth: ComponentHealth = { status: 'UP' };
  try {
    const dbCheck = await checkDatabaseReadiness();
    dbHealth = {
      status: dbCheck.status,
      details: dbCheck.details,
      driver: dbCheck.activeDriver,
      postgresStatus: dbCheck.postgres.status,
      isProductionVerified: dbCheck.isProductionVerified
    };
  } catch (err: any) {
    dbHealth = {
      status: 'DOWN',
      details: 'Database health abstraction check failure: ' + (err?.message || 'unknown error')
    };
  }

  // 2. Configuration Check
  let configHealth: ComponentHealth = { status: 'UP' };
  try {
    const config = getSecurityConfig();
    if (config.isProduction && !process.env.JWT_SECRET) {
      configHealth = { status: 'DOWN', details: 'Critical security environment missing' };
    }
  } catch (err: any) {
    configHealth = { status: 'DOWN', details: 'Configuration inspection error' };
  }

  // 3. Process Memory Check
  let memoryHealth: ComponentHealth = { status: 'UP' };
  const mem = process.memoryUsage();
  const heapUsedMb = Math.round(mem.heapUsed / (1024 * 1024));
  const heapTotalMb = Math.round(mem.heapTotal / (1024 * 1024));
  if (heapTotalMb > 0 && heapUsedMb / heapTotalMb > 0.95) {
    memoryHealth = { status: 'DEGRADED', details: 'High memory pressure (>95% heap)' };
  }

  // 4. Circuit Breakers state
  const cbStates: Record<string, string> = {
    nasa: externalCircuitBreakers.nasaPower.getState(),
    gemini: externalCircuitBreakers.geminiAi.getState(),
    sms: externalCircuitBreakers.smsProvider.getState(),
    payment: externalCircuitBreakers.paymentGateway.getState(),
  };

  const isDegraded = Object.values(cbStates).some(s => s === 'OPEN') || memoryHealth.status === 'DEGRADED';
  const isDown = dbHealth.status === 'DOWN' || configHealth.status === 'DOWN';

  let overallStatus: 'READY' | 'NOT_READY' | 'DEGRADED' = 'READY';
  let httpCode = 200;

  if (isDown) {
    overallStatus = 'NOT_READY';
    httpCode = 503;
  } else if (isDegraded) {
    overallStatus = 'DEGRADED';
    httpCode = 200; // Still ready to serve, but in degraded state
  }

  const report: ReadinessReport = {
    status: overallStatus,
    timestamp,
    uptimeSeconds: uptime,
    components: {
      database: dbHealth,
      configuration: configHealth,
      memory: memoryHealth,
      circuitBreakers: cbStates
    }
  };

  res.status(httpCode).json(report);
});

export default router;
