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
| Deployment | Vercel — two projects (web + API) from this repo |

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

In the Supabase dashboard → **SQL Editor**, run:
1. `supabase/migrations/20261116000000_initial_schema.sql`
2. `supabase/seed.sql` (demo businesses, products, inventory and 30 days of sales)

Details and the CLI alternative: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#1-supabase-database--auth).

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

Health check: `curl http://localhost:4000/api/health`

```json
{ "success": true, "data": { "status": "ok", "checks": { "database": "connected", "supabaseAuth": "configured" } } }
```

Without a `.env`, the API still starts in development and reports `"not_configured"`.

Until login is implemented, the login page has **Retailer UI / Wholesaler UI** preview buttons so you can work on pages for either role.

## Environment variables

| Variable | App | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | api | ✅ | Supabase Postgres URI (Transaction pooler, port 6543) |
| `SUPABASE_URL` | api | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | api | ✅ | Supabase anon key (used to verify user tokens) |
| `CORS_ORIGINS` | api | | Comma-separated allowed origins (default `http://localhost:3000`) |
| `PORT` | api | | Default `4000` |
| `NEXT_PUBLIC_API_URL` | web | ✅ | API base URL including `/api` |
| `NEXT_PUBLIC_SUPABASE_URL` | web | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | ✅ | Supabase anon key (public by design) |

`.env` files are git-ignored. **Never commit real credentials** — this repository is public.

## Deployment

Two Vercel projects from this repository: **`apps/web`** (Next.js) and **`apps/api`** (Express). Step-by-step: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

> Supabase and Vercel are not connected yet — the project is prepared for them.

## Documentation

| Doc | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, folder structure, **auth & role authorization flow** |
| [docs/DATABASE.md](docs/DATABASE.md) | **ER diagram**, tables, ownership, constraints, demo data |
| [docs/API.md](docs/API.md) | **Response/error format**, conventions, **REST endpoint plan** |
| [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md) | **Order status lifecycle**, **inventory update rules**, notifications |
| [docs/STOCKOUT_MODEL.md](docs/STOCKOUT_MODEL.md) | Probability-based stockout prediction + threshold fallback |
| [docs/MODULES.md](docs/MODULES.md) | **Module ownership**, file map, first tasks per member |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Supabase + Vercel setup and checklist |
| [CONTRIBUTING.md](CONTRIBUTING.md) | **Branch naming**, running apps, migrations, PRs, avoiding conflicts |

## Team

| Member | Module | Branch |
|---|---|---|
| Member 1 | Authentication, Connections & Products | `feature/auth-products` |
| Member 2 | Inventory & Stock Prediction | `feature/inventory` |
| Member 3 | Orders & Fulfillment | `feature/orders` |
| Member 4 | Notifications & Analytics | `feature/analytics` |
