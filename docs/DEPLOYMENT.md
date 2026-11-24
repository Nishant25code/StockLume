# Deployment

> Status: the repository is **prepared** for Supabase and Vercel, but neither has been connected or tested yet. Follow these steps once, then tick the checklist at the bottom.

## 1. Supabase (database + auth)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine). Pick the region closest to your users (e.g. Mumbai `ap-south-1`).
2. **Apply the schema and migrations** — either:
   - **Dashboard:** SQL Editor → paste `supabase/migrations/20261116000000_initial_schema.sql` → Run. Then paste `supabase/migrations/20261124000000_add_performance_indexes.sql` → Run. Then paste `supabase/seed.sql` → Run.
   - **CLI:** `npx supabase login` → `npx supabase link --project-ref <ref>` → `npx supabase db push`, then run `seed.sql` in the SQL Editor.
3. **Auth:** Authentication → Providers → Email: enabled. For the demo you can turn off "Confirm email" so sign-up works instantly.
4. **Link Supabase Auth user to a demo business (Required for local/demo API testing)**:
   - After signing up an email in Supabase (or running sign up in the app), copy the user's UUID from Supabase Dashboard -> Authentication -> Users.
   - Run this SQL query to link the test user to one of the seeded businesses:
     ```sql
     -- To test as Retailer (FreshMart Kirana):
     insert into profiles (id, business_id, full_name, email)
     values ('<your-auth-user-uuid>', '11111111-0000-0000-0000-000000000001', 'FreshMart Owner', 'retailer@example.com')
     on conflict (id) do update set business_id = excluded.business_id;

     -- Or to test as Wholesaler (Metro Wholesale Co):
     insert into profiles (id, business_id, full_name, email)
     values ('<your-auth-user-uuid>', '22222222-0000-0000-0000-000000000001', 'Metro Manager', 'metro@example.com')
     on conflict (id) do update set business_id = excluded.business_id;
     ```
5. **Collect values:**

   | Variable | Where in Supabase |
   |---|---|
   | `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
   | `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → `anon` public key |
   | `DATABASE_URL` | Connect → **Transaction pooler** (port `6543`) URI, with your DB password |
   | `DATABASE_CA_CERT` | Project Settings → Database → **SSL Configuration → Download certificate** — paste the file's contents |

   **Why the CA certificate?** It lets the API check that it is really talking to Supabase (TLS certificate verification), not just that the connection is encrypted. Without it, someone between Vercel and Supabase could impersonate the database. In production the API **refuses to start** without `DATABASE_CA_CERT`. (Escape hatch, not recommended: `DATABASE_SSL_ALLOW_UNVERIFIED=true`.) In local development it only prints a warning.

   Share these with the team privately (not in Git, not in a public chat).

## 2. Vercel — two projects, one repository

Import the GitHub repository into Vercel **twice**.

### API project (`stocklume-api`)

| Setting | Value |
|---|---|
| Root Directory | `apps/api` |
| Framework Preset | Express (auto-detected from `src/app.js`) — "Other" also works |
| Install Command | default (`npm install` — Vercel uses the root workspace lockfile) |
| Build Command | none |
| Environment variables | `DATABASE_URL`, `DATABASE_CA_CERT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CORS_ORIGINS=https://<web-project>.vercel.app` |

`src/app.js` default-exports the Express app, which Vercel runs as a serverless function. `server.js` skips `listen()` when the `VERCEL` env var is present. In production, missing env variables make the function fail fast with a clear message in the Vercel logs.

Verify: `https://<api-project>.vercel.app/api/health` → `"database": "connected"`.

### Web project (`stocklume-web`)

| Setting | Value |
|---|---|
| Root Directory | `apps/web` |
| Framework Preset | Next.js |
| Environment variables | `NEXT_PUBLIC_API_URL=https://<api-project>.vercel.app/api`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

After the web project gets its URL, add it to the API's `CORS_ORIGINS` and redeploy the API. In Supabase → Authentication → URL Configuration, set **Site URL** to the web URL.

### Preview deployments

Every PR gets preview URLs for both projects. Preview web builds call the production API unless you set `NEXT_PUBLIC_API_URL` per-environment. Keep it simple: test PRs locally, use previews for UI review.

## 3. Checklist (Member 4 owns this)

- [ ] Supabase project created, migration + seed applied
- [ ] Email auth enabled
- [ ] API project deployed, `/api/health` shows `database: connected`
- [ ] Web project deployed, env vars set
- [ ] `CORS_ORIGINS` includes the web URL
- [ ] Supabase Site URL set to the web URL
- [ ] Sign-up → register → dashboard works on production
- [ ] Demo walkthrough of all 14 flow steps on production
