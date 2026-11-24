/**
 * PostgreSQL connection helper (node-postgres "pg").
 *
 * ALWAYS use parameterized queries — never build SQL with string concatenation:
 *
 *   const { rows } = await query('select * from products where wholesaler_id = $1', [businessId]);
 *
 * Use withTransaction() when several writes must succeed or fail together
 * (e.g. record a sale + reduce inventory + insert a stock movement):
 *
 *   await withTransaction(async (client) => {
 *     await client.query('insert into sales ...', [...]);
 *     await client.query('update inventory ...', [...]);
 *   });
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const { Pool } = pg;

// Return Postgres `numeric` (prices, totals) as JS numbers instead of strings.
pg.types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));
// Return `bigint` (e.g. orders.order_number, count(*)) as JS numbers.
pg.types.setTypeParser(20, (value) => (value === null ? null : Number(value)));

let pool;

function isLocalDatabase(url) {
  return /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
}

/**
 * TLS settings for the database connection.
 * - Local Postgres: no TLS.
 * - DATABASE_CA_CERT set: encrypt AND verify the server certificate (secure default).
 * - Otherwise: only allowed in development, or when DATABASE_SSL_ALLOW_UNVERIFIED=true
 *   is set on purpose. Encrypted but unverified connections can be intercepted
 *   by a man-in-the-middle, so production refuses them by default.
 */
export function buildSslConfig() {
  if (isLocalDatabase(env.databaseUrl)) return false;
  if (env.databaseSsl === 'disable') return false; // Hyperdrive: TLS to Supabase is handled by Cloudflare

  if (env.databaseCaCert) {
    return { ca: env.databaseCaCert, rejectUnauthorized: true };
  }

  if (env.isProduction && !env.databaseSslAllowUnverified) {
    throw new Error(
      'DATABASE_CA_CERT is required in production so the database TLS certificate can be verified. ' +
        'Download it from Supabase → Project Settings → Database → SSL Configuration. See docs/DEPLOYMENT.md',
    );
  }

  console.warn(
    '[db] DATABASE_CA_CERT not set — the connection is encrypted but the server certificate is NOT verified. ' +
      'Set DATABASE_CA_CERT to enable verification.',
  );
  return { rejectUnauthorized: false };
}

// Per-request pools (Cloudflare Workers) live in AsyncLocalStorage for the
// duration of one request; everywhere else a single shared pool is used.
const requestPools = new AsyncLocalStorage();

function createPool({ max = 5 } = {}) {
  return new Pool({
    connectionString: env.databaseUrl,
    ssl: buildSslConfig(),
    // Keep this small: serverless functions open many short-lived pools.
    max,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool() {
  if (!env.databaseUrl) {
    throw ApiError.serviceNotConfigured('Database');
  }
  const scoped = requestPools.getStore();
  if (scoped) return scoped;
  if (!pool) {
    pool = createPool();
    pool.on('error', (err) => console.error('[db] idle client error', err.message));
  }
  return pool;
}

/**
 * Express middleware for Cloudflare Workers: gives each request its own pool
 * (Workers forbid reusing a socket opened by another request) and closes it
 * when the response is done. Hyperdrive keeps the real Supabase connections
 * warm, so opening these is cheap.
 */
export function perRequestPool() {
  return (_req, res, next) => {
    if (!env.databaseUrl) return next();
    const requestPool = createPool({ max: 10 });
    requestPool.on('error', (err) => console.error('[db] request pool error', err.message));
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      requestPool.end().catch(() => {});
    };
    res.once('finish', close);
    res.once('close', close);
    requestPools.run(requestPool, next);
  };
}

/** Run one parameterized query. Returns the pg result ({ rows, rowCount }). */
export function query(text, params = []) {
  return getPool().query(text, params);
}

/** Run `fn(client)` inside BEGIN/COMMIT. Rolls back automatically on error. */
export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

/** Used by /api/health. Never throws. */
export async function checkDatabase() {
  if (!env.databaseUrl) return 'not_configured';
  try {
    await query('select 1');
    return 'connected';
  } catch (err) {
    console.error('[db] health check failed:', err.message);
    return 'error';
  }
}
