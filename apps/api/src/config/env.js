/**
 * Environment variable loading + validation.
 *
 * - In production (Vercel) a missing required variable stops the server with a
 *   clear error, so misconfiguration is caught immediately.
 * - In development we only warn, so `/api/health` still works before you have
 *   Supabase credentials. Endpoints that need the database will return a
 *   503 "SERVICE_NOT_CONFIGURED" error instead.
 */

const REQUIRED = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];

const nodeEnv = process.env.NODE_ENV ?? 'development';
const missing = REQUIRED.filter((key) => !process.env[key]?.trim());

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
  databaseUrl: process.env.DATABASE_URL ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  missing,
});
