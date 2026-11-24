/**
 * Load the demo data in supabase/seed.sql into the database in DATABASE_URL.
 *
 *   npm run db:seed
 *
 * Refuses to run twice (sales and stock history would be duplicated).
 * Run `npm run db:migrate` first.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, withTransaction } from '../src/db/pool.js';

const seedFile = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'supabase', 'seed.sql');
const DEMO_RETAILER = '11111111-0000-0000-0000-000000000001';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to apps/api/.env (see apps/api/.env.example).');
  process.exit(1);
}

const pool = getPool();
try {
  const { rowCount } = await pool.query('select 1 from businesses where id = $1', [DEMO_RETAILER]);
  if (rowCount > 0) {
    console.log('Demo data is already loaded (FreshMart Kirana exists). Nothing to do.');
  } else {
    await withTransaction((client) => client.query(readFileSync(seedFile, 'utf8')));
    const counts = await pool.query(`select
      (select count(*) from businesses) as businesses, (select count(*) from products) as products,
      (select count(*) from sales) as sales, (select count(*) from orders) as orders`);
    console.log('Demo data loaded:', counts.rows[0]);
    console.log('Next: sign up in the app, then link your account to a demo business (docs/DEPLOYMENT.md).');
  }
} catch (err) {
  console.error(`Seeding failed: ${err.message}`);
  if (/relation .* does not exist/.test(err.message)) console.error('Run `npm run db:migrate` first.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
