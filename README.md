# StockLume

**Smart inventory and replenishment for retailers and their wholesalers.**
Retailers track stock and sales; StockLume predicts which products are likely to run out, prepares replenishment orders the retailer reviews and submits, and wholesalers fulfil them — with inventory updating automatically at each step.

> College project · team of 4 · Next.js + Express + Supabase PostgreSQL

## How it works (project flow)

| # | Step | Module |
|---|---|---|
| 1 | **Authentication** — sign up / log in as a Retailer or Wholesaler | Member 1 |
| 2 | **Business connections** — retailers see their wholesalers; wholesalers see their retailers | Member 1 |
| 3 | **Product management** — wholesalers add products, prices and quantities | Member 1 |
| 4 | **Inventory management** — retailers track product stock | Member 2 |
| 5 | **Sales recording** — sales reduce inventory automatically (simulated for the demo) | Member 2 |
| 6 | **Stock prediction** — probability-based stockout risk from sales history | Member 2 |
| 7 | **Low-stock alerts** — retailers are alerted before items run out | Member 2 |
| 8 | **Automated order suggestions** — replenishment list from connected wholesalers | Member 3 |
| 9 | **Order customization** — add/remove products, change quantities | Member 3 |
| 10 | **Retailer confirmation** — retailer reviews and submits the final order | Member 3 |
| 11 | **Wholesaler notification** — *only after submission* | Member 3 + 4 |
| 12 | **Order processing** — wholesaler accepts/rejects and dispatches | Member 3 |
| 13 | **Delivery confirmation** — retailer confirms receipt; inventory updates | Member 3 |
| 14 | **Dashboards & analytics** — inventory, orders, sales stats and alerts | Member 4 |


⭐ **Key rule:** an order suggestion is never sent to a wholesaler until the retailer explicitly submits it. Order statuses: `DRAFT → SUBMITTED → ACCEPTED → DISPATCHED → DELIVERED`, plus `REJECTED` and `CANCELLED`.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, next-themes |
| Backend | Node.js 20+, Express 5 (JavaScript ES modules), `pg` (parameterized SQL) |
| Database | PostgreSQL on Supabase |
| Auth | Supabase Auth (JWT verified by the API) |
| Deployment | Cloudflare Workers — Next.js via OpenNext, Express API, Hyperdrive to Supabase |

## Repository structure

```
stocklume/
├── apps/
│   ├── web/                    Next.js frontend  (@stocklume/web)
│   │   └── src/{app,components,lib,providers,types,hooks}
│   └── api/                    Express backend   (@stocklume/api)
│       └── src/
│           ├── routes/         one router per module
│           ├── controllers/    one controller per module
│           ├── services/       business logic + SQL, one per module
│           ├── db/             pg pool, transactions, Supabase client
│           ├── middleware/     auth (requireAuth / requireRole), errors
│           ├── config/         env validation
│           └── utils/          ApiError, sendSuccess
├── supabase/
│   ├── migrations/             SQL migrations (never edit applied ones)
│   └── seed.sql                demo data
├── docs/                       shared contracts (see below)
├── .github/                    PR template
├── .env.example                overview of all variables
├── CONTRIBUTING.md
└── package.json                npm workspaces
```

## Getting started

### Prerequisites

- Node.js **20.9+** (22 recommended) and npm 10+
- Git
- A Supabase project — only needed for features that use the database or login (ask the lead for the team credentials)

### Setup

```bash
git clone https://github.com/Nishant25code/StockLume.git
cd StockLume
npm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# fill in the Supabase values (see "Environment variables")
```

### Database (first time, done once by the lead for the shared project)

With `DATABASE_URL` set in `apps/api/.env`:

```bash
npm run db:migrate   # create all tables (applies supabase/migrations, safe to rerun)
npm run db:seed      # demo businesses, products, inventory, 30 days of sales, sample orders
```

Supabase Auth settings (email sign-in, "Confirm email", redirect URLs) and how to log in as a demo business: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#1-supabase-database--auth).

### Run

```bash
npm run dev          # API → http://localhost:4000  ·  Web → http://localhost:3000
```

| Command (from repo root) | What it does |
|---|---|
| `npm run dev` | Run API and web together |
| `npm run dev:api` / `npm run dev:web` | Run one app |
| `npm run lint` | ESLint (web) + import check (API) |
| `npm run typecheck` | TypeScript check (web) |
| `npm run build:web` | Production build of the frontend |
| `npm run check` | lint + build — run before every PR |
| `npm run db:migrate` | Apply pending SQL migrations to `DATABASE_URL` (`-- --status` to list) |
| `npm run db:seed` | Load the demo data once |
| `npm test --workspace @stocklume/api` | API unit tests |

Health check: `curl http://localhost:4000/api/health`

```json
{ "success": true, "data": { "status": "ok", "checks": { "database": "connected", "supabaseAuth": "configured" } } }
```

Without a `.env`, the API still starts in development and reports `"not_configured"`.

**Logging in:** create an account on `/login` (choose Retailer or Wholesaler) — Supabase Auth stores the password, and the API creates your business. In development the login page also has **Retailer UI / Wholesaler UI** preview buttons that show the screens with demo data and no login; they are hidden in production.

## Environment variables

| Variable | App | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | api | ✅ | Supabase Postgres URI (Transaction pooler, port 6543) |
| `DATABASE_CA_CERT` | api | ✅ in production | Supabase root CA (PEM) — enables TLS certificate verification ([why](docs/DEPLOYMENT.md#1-supabase-database--auth)) |
| `SUPABASE_URL` | api | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | api | ✅ | Supabase anon key (used to verify user tokens) |
| `CORS_ORIGINS` | api | | Comma-separated allowed origins (default `http://localhost:3000`) |
| `PORT` | api | | Default `4000` |
| `NEXT_PUBLIC_API_URL` | web | ✅ | API base URL including `/api` |
| `NEXT_PUBLIC_SUPABASE_URL` | web | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | ✅ | Supabase anon key (public by design) |

`.env` files are git-ignored. **Never commit real credentials** — this repository is public.

## Deployment

Live on Cloudflare Workers:

- **App:** https://stocklume-web.gamingnishant2507.workers.dev
- **API:** https://stocklume-api.gamingnishant2507.workers.dev/api/health

```bash
npm run cf:deploy --workspace @stocklume/api   # deploy the API Worker
npm run cf:deploy --workspace @stocklume/web   # build with OpenNext + deploy the frontend
```

Step-by-step (Supabase, Hyperdrive, Workers): [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

| Doc | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, folder structure, **auth & role authorization flow** |
| [docs/DATABASE.md](docs/DATABASE.md) | **ER diagram**, tables, ownership, constraints, demo data |
| [docs/API.md](docs/API.md) | **Response/error format**, conventions, **REST endpoint plan** |
| [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md) | **Order status lifecycle**, **inventory update rules**, notifications |
| [docs/STOCKOUT_MODEL.md](docs/STOCKOUT_MODEL.md) | Probability-based stockout prediction + threshold fallback |
| [docs/MODULES.md](docs/MODULES.md) | **Module ownership**, file map, first tasks per member |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Supabase + Cloudflare Workers setup and checklist |
| [CONTRIBUTING.md](CONTRIBUTING.md) | **Branch naming**, running apps, migrations, PRs, avoiding conflicts |

## Team

| Name | GitHub | Role |
|---|---|---|
| **Nishant Jain** (lead) | [@Nishant25code](https://github.com/Nishant25code) | Project lead: management, Supabase & Cloudflare setup, authentication, integration |
| **Noor Hora** | [@noor0021](https://github.com/noor0021) | Backend: orders & fulfilment, sales, stockout prediction; UI redesign |
| **Celina** | [@cellinaachari505](https://github.com/cellinaachari505) | Database, connections, products, inventory & reorder rules |
| **Kalpana Beniwal** | [@KalpnaBeniwal868](https://github.com/KalpnaBeniwal868) | Notifications, dashboards, analytics, inventory & orders UI |



