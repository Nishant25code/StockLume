# Contributing to StockLume

We're a team of four working in parallel. These rules keep `main` working and merge conflicts rare.

## Branches

| Branch | Who | Purpose |
|---|---|---|
| `main` | Lead merges only | Always builds and runs. Never commit directly. |
| `feature/auth-products` | Member 1 | Authentication, connections, products |
| `feature/inventory` | Member 2 | Inventory, sales, prediction |
| `feature/orders` | Member 3 | Orders & fulfillment |
| `feature/analytics` | Member 4 | Notifications, dashboards, analytics |

For a smaller piece of work, branch **off your module branch** or off `main`:

```
<type>/<module>-<short-description>
feat/orders-submit-endpoint
fix/inventory-negative-stock
docs/api-error-codes
```

Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`.

### Creating your branch

```bash
git clone https://github.com/Nishant25code/StockLume.git
cd StockLume
git checkout feature/orders          # your module branch (already exists on GitHub)
git pull
```

Starting a smaller branch:

```bash
git checkout main && git pull
git checkout -b feat/orders-submit-endpoint
```

## Running the apps

```bash
npm install                                   # once, from the repo root
cp apps/api/.env.example apps/api/.env        # fill in values from the team
cp apps/web/.env.example apps/web/.env.local
npm run dev                                   # API on :4000 and web on :3000
```

Or separately: `npm run dev:api` and `npm run dev:web`. Check the API with `curl http://localhost:4000/api/health`.

Install packages **into a workspace**, never at the root:

```bash
npm install zod --workspace @stocklume/api
npm install recharts --workspace @stocklume/web
```

## Commits

[Conventional commits](https://www.conventionalcommits.org/), present tense, small and focused:

```
feat(orders): add submit endpoint
fix(inventory): block sales larger than stock
docs(api): document INSUFFICIENT_STOCK error
```

## Adding a SQL migration

**Never edit a migration that's already on `main`.** Supabase records which files have run; editing one means teammates' databases silently differ.

1. Create a new file in `supabase/migrations/` named `YYYYMMDDHHMMSS_short_description.sql` using the current UTC time, e.g.
   `20261120143000_add_discount_to_order_items.sql`
   (or run `npx supabase migration new add_discount_to_order_items`).
2. Only change tables your module owns ([MODULES.md](docs/MODULES.md)). Need a change to someone else's table? Ask them first.
3. Keep it small and additive (`alter table … add column …`). Avoid dropping or renaming columns others use.
4. Test it on your own Supabase project or local database before opening the PR.
5. Update [docs/DATABASE.md](docs/DATABASE.md) in the same PR.
6. Mention **"contains migration"** in the PR title. The lead applies migrations to the shared database after merging.

## Avoiding merge conflicts

- **Stay in your own files.** Every module already has its own route, controller and service file, and its own page folder. Put new components in `components/<your-module>/`.
- **Don't reformat** files you didn't change, and don't run a project-wide formatter in a feature PR.
- **Shared files** (listed in [MODULES.md](docs/MODULES.md#lead--shared-files)) — announce in the team chat before editing, keep the change tiny, and merge it quickly.
- **`package-lock.json`** conflicts: don't hand-merge. Take `main`'s version, then rerun `npm install`:
  ```bash
  git checkout origin/main -- package-lock.json && npm install
  ```
- **Sync with `main` at least daily:**
  ```bash
  git fetch origin
  git merge origin/main          # in your feature branch
  ```
- **Merge small PRs often** (one endpoint + its UI is a good size) rather than one giant PR at the end.

## Before opening a pull request

Run from the repo root:

```bash
npm run lint          # ESLint for web, import check for API
npm run build:web     # Next.js production build
npm run typecheck --workspace @stocklume/web
```

Then test by hand:

- [ ] `npm run dev` starts both apps with no errors
- [ ] `GET /api/health` returns `success: true`
- [ ] Your endpoints return the [standard response format](docs/API.md#standard-response-format), including error cases (bad input, wrong role, another business's data)
- [ ] Your pages work for the right role, in light **and** dark mode, and on a phone-width screen
- [ ] No `.env` files, keys or passwords in the diff (`git diff --cached`)

## Pull requests

1. Push your branch: `git push -u origin <branch>`.
2. Open a PR **into `main`** (or into your module branch for sub-branches).
3. Fill in the PR template. Link the flow step(s) you implemented.
4. Request a review from the lead (and from any member whose module you touch).
5. At least **one approval** before merging. Use **Squash and merge**.
6. Update the endpoint status (🔜 → ✅) in [docs/API.md](docs/API.md) in the same PR.

## Code style

**API (JavaScript, ES modules)**
- Routes → controllers → services. No SQL in controllers; no `req`/`res` in services.
- Always parameterized SQL: `query('… where id = $1', [id])`. Never string-concatenate values into SQL.
- Always scope by `req.user.businessId`.
- Throw `ApiError`; respond with `sendSuccess`.
- Multi-step writes go in `withTransaction`.

**Web (TypeScript)**
- Fetch data with `apiClient` from `@/lib/api-client`.
- Use shadcn/ui components (`npx shadcn@latest add <name>` from `apps/web`) and design tokens (`bg-card`, `text-brand`, …), not hard-coded colours.
- Use `LoadingState`, `ErrorState`, `EmptyState` for every data view.
- Don't edit files in `components/ui/` unless needed; they're generated.
