import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.js';

let pool: any = null;
let pgDb: any = null;

export const getPostgresDB = () => {
  if (pgDb) return pgDb;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    if (process.env.NODE_ENV === 'production' && process.env.DB_DRIVER === 'postgres') {
      throw new Error("FATAL: DATABASE_URL is missing in production environment");
    }
    // Return a dummy/mock if not strict to prevent crashing during build or unrelated tests
    return null;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const ssl = isProduction || process.env.PG_SSL === 'true' || (databaseUrl && databaseUrl.includes('sslmode=require'));

  pool = new Pool({
    connectionString: databaseUrl,
    max: parseInt(process.env.PG_MAX_CONNECTIONS || '20', 10),
    connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || '5000', 10),
    idleTimeoutMillis: 30000,
    ssl: ssl ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false' } : false
  });

  pgDb = drizzle(pool, { schema });
  return pgDb;
};

export const closePostgresDB = async () => {
  if (pool) {
    await pool.end();
  }
};

export const checkPostgresConnectivity = async (timeoutMs: number = 2500): Promise<{
  ok: boolean;
  status: 'UP' | 'DOWN' | 'NOT_CONFIGURED' | 'NOT_PRODUCTION_VERIFIED';
  latencyMs?: number;
  error?: string;
}> => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return {
      ok: false,
      status: 'NOT_CONFIGURED',
      error: 'DATABASE_URL is not configured'
    };
  }

  let tempPool = pool;
  let shouldCloseTemp = false;
  if (!tempPool) {
    tempPool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: timeoutMs,
    });
    shouldCloseTemp = true;
  }

  const start = Date.now();
  let client: any = null;
  try {
    client = await tempPool.connect();
    await client.query('SELECT 1');
    const latencyMs = Date.now() - start;
    return {
      ok: true,
      status: 'UP',
      latencyMs
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 'NOT_PRODUCTION_VERIFIED',
      error: err?.message || 'Failed to execute SELECT 1 on PostgreSQL'
    };
  } finally {
    if (client) {
      try { client.release(); } catch {}
    }
    if (shouldCloseTemp && !pool) {
      try { await tempPool.end(); } catch {}
    }
  }
};

