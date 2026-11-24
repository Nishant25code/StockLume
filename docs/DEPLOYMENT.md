# Deployment

> Status: login, sign-up and every module are built and tested locally (against a Supabase Auth stand-in and a real Postgres). Connecting your real Supabase project and Vercel still has to be done once — follow these steps, then tick the checklist at the bottom.

## 1. Supabase (database + auth)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine). Pick the region closest to your users (e.g. Mumbai `ap-south-1`).
2. **Put the connection values in `apps/api/.env`** (see step 5 for where each one is), then **apply the schema and demo data** from the repo root:
   ```bash
   npm run db:migrate     # runs every file in supabase/migrations not applied yet (tracked in stocklume_migrations)
   npm run db:seed        # loads supabase/seed.sql once (refuses to run twice)
   npm run db:migrate -- --status   # see what is applied / pending
   ```
   Already pasted the SQL into the Supabase **SQL Editor** by hand? Run `npm run db:migrate -- --baseline` once so future migrations are tracked from there. Use one method per database — don't mix in `supabase db push`.
3. **Auth** (Authentication → Sign In / Providers → Email: enabled):
   - **"Confirm email" OFF (easiest for the demo):** sign-up logs the user in immediately and creates their business.
   - **"Confirm email" ON:** sign-up shows "Check your email"; after clicking the link and signing in, the app shows a prefilled **Set up your business** page (`/onboarding`).
   - Authentication → URL Configuration: **Site URL** = `http://localhost:3000` locally (your Vercel web URL in production), and add `http://localhost:3000/login` and `https://<web-project>.vercel.app/login` to **Redirect URLs** (used by the confirmation email).
4. **Use the demo data with a real login (optional)** — new sign-ups get their own empty business. To log in *as* a seeded demo business instead:
   - Sign up in the app (any email), copy the user's UUID from Supabase → Authentication → Users.
   - If you already completed sign-up, you own a new empty business; the SQL below moves your login to the demo business instead.
   - Run this SQL in the SQL Editor:
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

- [ ] Supabase project created, `npm run db:migrate` + `npm run db:seed` run against it
- [ ] Email auth enabled; "Confirm email" choice made; Site URL + Redirect URLs set
- [ ] API project deployed, `/api/health` shows `database: connected`
- [ ] Web project deployed, env vars set
- [ ] `CORS_ORIGINS` includes the web URL
- [ ] Supabase Site URL set to the web URL
- [ ] Sign-up → register → dashboard works on production
- [ ] Demo walkthrough of all 14 flow steps on production
