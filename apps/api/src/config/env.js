/**
 * Environment variable loading + validation.
 *
 * - In production a missing required variable stops the server with a
 *   clear error, so misconfiguration is caught immediately.
 * - In development we only warn, so `/api/health` still works before you have
 *   Supabase credentials. Endpoints that need the database will return a
 *   503 "SERVICE_NOT_CONFIGURED" error instead.
 */

const REQUIRED = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];

const nodeEnv = process.env.NODE_ENV ?? 'development';
// On Cloudflare Workers the database URL comes from the Hyperdrive binding, which
// is only readable inside a request (src/worker.js sets it per request).
const databaseUrlFromBinding = process.env.DATABASE_URL_SOURCE === 'hyperdrive';
const missing = REQUIRED.filter(
  (key) => !(key === 'DATABASE_URL' && databaseUrlFromBinding) && !process.env[key]?.trim(),
);

if (missing.length > 0) {
  const message = `Missing environment variables: ${missing.join(', ')}. See apps/api/.env.example`;
  if (nodeEnv === 'production') {
    throw new Error(message);
  }
  console.warn(`[env] ${message}`);
}

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: Number(process.env.PORT) || 4000,
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Read on every use (a getter), so a value set per request by the Worker is seen.
  get databaseUrl() {
    return process.env.DATABASE_URL ?? '';
  },
  // Supabase's root CA (PEM). Lets us verify the database server's TLS certificate.
  // Escaped "\n" sequences are turned back into real newlines for single-line env values.
  databaseCaCert: (process.env.DATABASE_CA_CERT ?? '').replace(/\\n/g, '\n').trim(),
  // Explicit, documented escape hatch — encrypted but NOT verified. Avoid in production.
  databaseSslAllowUnverified: process.env.DATABASE_SSL_ALLOW_UNVERIFIED === 'true',
  // 'disable' only when something else handles TLS to Supabase — e.g. Cloudflare
  // Hyperdrive, whose local connection string is plain TCP inside Cloudflare.
  databaseSsl: process.env.DATABASE_SSL === 'disable' ? 'disable' : 'auto',
  // Cloudflare Workers cannot reuse a connection across requests, so the Worker
  // sets this to open a small pool per request (see db/pool.js).
  dbPoolPerRequest: process.env.DB_POOL_PER_REQUEST === 'true',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  missing,
});
