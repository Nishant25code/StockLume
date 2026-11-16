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

export function getPool() {
  if (!env.databaseUrl) {
    throw ApiError.serviceNotConfigured('Database');
  }
  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      // Supabase requires SSL; a local Postgres usually does not.
      ssl: isLocalDatabase(env.databaseUrl) ? false : { rejectUnauthorized: false },
      // Keep this small: serverless functions open many short-lived pools.
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on('error', (err) => console.error('[db] idle client error', err.message));
  }
  return pool;
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
