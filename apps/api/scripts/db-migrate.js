/**
 * Apply SQL migrations from supabase/migrations to the database in DATABASE_URL.
 *
 *   npm run db:migrate              apply every migration not applied yet
 *   npm run db:migrate -- --status  list applied / pending migrations
 *   npm run db:migrate -- --baseline
 *        mark ALL migration files as applied WITHOUT running them — only for a
 *        database where the SQL was already pasted into the Supabase SQL Editor.
 *
 * Applied migrations are recorded in public.stocklume_migrations. Each file runs
 * inside one transaction, so a failing migration changes nothing.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, withTransaction } from '../src/db/pool.js';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'supabase', 'migrations');
const args = new Set(process.argv.slice(2));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to apps/api/.env (see apps/api/.env.example).');
  process.exit(1);
}

const pool = getPool();
try {
  await pool.query(`create table if not exists public.stocklume_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`);
  // Keep the bookkeeping table private like every other table (RLS on, no policies).
  await pool.query('alter table public.stocklume_migrations enable row level security');

  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const { rows } = await pool.query('select name from public.stocklume_migrations');
  const applied = new Set(rows.map((r) => r.name));
  const pending = files.filter((f) => !applied.has(f));

  if (args.has('--status')) {
    for (const f of files) console.log(`${applied.has(f) ? '✓ applied ' : '· pending '} ${f}`);
  } else if (args.has('--baseline')) {
    for (const f of pending) await pool.query('insert into public.stocklume_migrations (name) values ($1)', [f]);
    console.log(`Marked ${pending.length} migration(s) as applied without running them.`);
  } else if (pending.length === 0) {
    console.log('Database is up to date — no pending migrations.');
  } else {
    for (const f of pending) {
      process.stdout.write(`Applying ${f} … `);
      await withTransaction(async (client) => {
        await client.query(readFileSync(join(migrationsDir, f), 'utf8'));
        await client.query('insert into public.stocklume_migrations (name) values ($1)', [f]);
      });
      console.log('done');
    }
    console.log(`Applied ${pending.length} migration(s).`);
  }
} catch (err) {
  console.error(`\nMigration failed: ${err.message}`);
  if (/already exists/.test(err.message)) {
    console.error('Looks like this SQL was already run by hand. If the schema is complete, run: npm run db:migrate -- --baseline');
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}
