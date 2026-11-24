# StockLume — demo script for the presentation

A click-by-click script for showing StockLume to your teacher (about 15–20 minutes).
**Bold** = what to click. *Italics* = what to say.

---

## 0. Before the presentation (10 minutes, do it the day before)

1. **Demo logins** (in Supabase → Authentication → Users → **Add user → Create new user**, tick **Auto Confirm User**):

   | Login | Email | Linked to (demo data) |
   |---|---|---|
   | Retailer | `retailer@stocklume.demo` | **FreshMart Kirana** (shop with stock, 30 days of sales) |
   | Wholesaler | `wholesaler@stocklume.demo` | **Metro Wholesale Co** (supplies FreshMart) |

   Passwords are the ones you chose when creating them — write them down. After creating them, the accounts must be linked to the demo businesses once (ask Claude, or run the SQL at the bottom of this file).
2. Open **two browser windows** side by side:
   - Normal window → retailer
   - Incognito / private window → wholesaler (a second window keeps a separate login)
3. Open these tabs in advance:
   - https://stocklume-web.gamingnishant2507.workers.dev (the site)
   - https://github.com/Nishant25code/StockLume (the code)
   - Supabase dashboard → **Table Editor** (the database)
4. Do a full dry run once. The flow changes data (stock, orders) — that's fine, it's meant to.

---

## 1. Introduce the problem (1 minute) — on the website

Open **https://stocklume-web.gamingnishant2507.workers.dev**

*"Small shops like kirana stores run out of best-sellers or over-order the rest, and orders to wholesalers get lost in phone calls. StockLume connects retailers and wholesalers: it predicts which products will run out and drafts the reorder — but nothing is sent until the retailer approves it."*

- Scroll the home page: the 3 problems → **Features**.
- Stop at the dark **Stockout prediction** section:
  *"This isn't a guess. For Basmati Rice: 6 bags left, it sells 3 a day, delivery takes 3 days, so we expect 9 to sell. A Poisson probability model says there's an 88% chance of running out before the delivery arrives, so it suggests ordering 34."*
- Show the **Order lifecycle**: *"Draft → Submitted → Accepted → Dispatched → Delivered. The wholesaler only finds out at Submitted."*
- Click **How it works** in the header: *"These are the 14 steps of our project flow — I'll demo them now."*

---

## 2. Retailer: dashboard and inventory (4 minutes) — normal window

1. Click **Sign in** → log in as `retailer@stocklume.demo`.
   *"Login is handled by Supabase Auth — our server never sees the password, only a secure token."*
2. **Retailer dashboard** — point at: stock value, low-stock count, open orders, sales this week, low-stock alerts.
3. Sidebar → **Inventory** (tab **Stock & sales**):
   - The table: each product's stock bar, the minimum line, and **High Risk / Medium Risk / Healthy** badges.
   *"The risk comes from the prediction model using 30 days of real sales history."*
4. **Record a sale**: open the **Record a Sale** tab → pick *Sunflower Oil 1L* → quantity 2 → **Record Sale**.
   *"Stock goes down immediately, inside one database transaction, and it's logged."* Show **Stock History** — the new SALE line.
5. *(Optional)* Try selling more than is in stock → it's refused. *"The database itself makes negative stock impossible."*
6. Tab **Manage stock** → **Movement History**: *"Every stock change is recorded — append-only history."*

---

## 3. Retailer: suggested order → submit (3 minutes) — normal window

1. Sidebar → **Orders** → **Generate Suggestions**.
   *"StockLume takes every High/Medium-risk product and drafts one order per wholesaler, with suggested quantities."*
2. Open the **Metro Wholesale Co** draft → **Edit Items** → change a quantity → save. The total updates.
   *"The retailer is in control — add, remove, change quantities."*
3. **Key point before submitting** — switch to the **incognito window**, log in as `wholesaler@stocklume.demo` → **Orders**:
   *"The wholesaler cannot see the draft at all. This rule is enforced in our API and by a database constraint."*
4. Back in the retailer window → **Submit Order**.

---

## 4. Wholesaler: accept and dispatch (3 minutes) — incognito window

1. Refresh → the **notification bell** shows a new order; the **Wholesaler dashboard** shows a pending order.
   *"The notification is created only at the moment the retailer submitted."*
2. **Orders** → tab **Incoming** → the new order → **Accept Order**.
3. Tab **To Dispatch** → **Dispatch Order**.
   *"Dispatching lowers the wholesaler's available stock for those products."* Optionally show **Products** — the available quantity went down.
4. *(Optional)* Reject flow: a wholesaler must give a reason, and the retailer is notified.

---

## 5. Retailer: delivery → stock goes up (2 minutes) — normal window

1. Bell → the "dispatched" notification. **Orders** → tab **Active** → **Confirm Delivery**.
2. **Inventory** → the delivered products' stock went **up**; their risk badge drops.
   *"The loop is closed: sales lowered stock, the model predicted a stockout, the order refilled it."*
3. **Analytics**: sales trend chart, top products, orders by status.

---

## 6. Behind the scenes (3–4 minutes)

- **Architecture** (About page → *How it's built*):
  *"Next.js frontend and an Express REST API, both running on Cloudflare Workers. PostgreSQL on Supabase, connected through Cloudflare Hyperdrive. Supabase Auth for login."*
- **Database** (Supabase → Table Editor): show `orders`, `order_items`, `inventory`, `stock_movements`.
  *"11 tables, normalized to BCNF — the walkthrough is in `dbms/01_normalization.md`. Foreign keys, CHECK constraints, and Row Level Security that blocks direct browser access."*
- **Code** (GitHub): `apps/web`, `apps/api` (routes → controllers → services → SQL), `supabase/migrations`.
  *"Parameterized SQL everywhere, every query scoped to the logged-in business."*
- **Team** (About page): who built which module.

---

## Likely questions — short answers

| Question | Answer |
|---|---|
| Why Poisson? | It models "how many sales happen in a time window" when sales are independent events — a standard model for demand. With under 7 days of sales history we fall back to the minimum-stock rule. |
| What if two sales happen at once? | The stock update is one atomic SQL statement (`… where quantity >= $n`), so stock can never go below zero. |
| How do you stop a wholesaler seeing drafts? | Every wholesaler query filters out `DRAFT`, and a database CHECK constraint requires `submitted_at` for any non-draft status. |
| Can a business see another's data? | No — every query is filtered by the logged-in user's business ID, and the tables have RLS enabled so the public API key can't read them. |
| Where are passwords stored? | Only in Supabase Auth (hashed). Our API verifies a token; it never sees passwords. |
| Is it normalized? | Yes, all 11 tables are in BCNF; a few derived values (order total, current stock) are kept on purpose and updated in the same transaction. |
| How is it deployed? | Two Cloudflare Workers (frontend via OpenNext, Express API) + Hyperdrive to Supabase Postgres. |

---

## If something goes wrong during the demo

| Problem | Fix |
|---|---|
| "Could not load your account" after login | The API is waking up — click **Try again** after 2 seconds. |
| Logged in but pages are empty | The account isn't linked to a demo business — run the SQL below. |
| No suggestions generated | No product is at risk any more — record a few sales or **Simulate Sales (7d)** on Inventory, then try again. |
| Wholesaler sees no new order | The retailer hasn't pressed **Submit Order** yet (that's the point!) — or refresh the page. |

---

## Linking the demo logins to the demo businesses (run once)

Supabase → **SQL Editor** → run:

```sql
insert into profiles (id, business_id, full_name, email)
select id, '11111111-0000-0000-0000-000000000001', 'FreshMart Owner', email
from auth.users where email = 'retailer@stocklume.demo'
on conflict (id) do update set business_id = excluded.business_id;

insert into profiles (id, business_id, full_name, email)
select id, '22222222-0000-0000-0000-000000000001', 'Metro Manager', email
from auth.users where email = 'wholesaler@stocklume.demo'
on conflict (id) do update set business_id = excluded.business_id;
```
