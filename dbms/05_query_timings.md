# 05 · Query timings

**StockLume · Team T0069** · every query from [`04_queries.sql`](04_queries.sql), timed on PostgreSQL

## How we measured

- **Machine:** MacBook Air (Mac16,1), Apple M4, 16 GB RAM, macOS. This is the same laptop we use for the DE project.
- **Database:** PostgreSQL 17.12 (Homebrew), database `stocklume`, created with `03_schema.sql`. That schema includes the 11 indexes from our Supabase migration.
- **Data:** [`seed_for_timings.sql`](seed_for_timings.sql) generates a realistic network of shops covering about 6 months. It is deterministic, so anyone gets the same rows.

| Table | Rows |
|-------|-----:|
| businesses (20 wholesalers, 300 retailers) | 320 |
| business_connections | 1,200 |
| products | 2,000 |
| inventory | 12,000 |
| reorder_rules | 5,959 |
| sales | 215,721 |
| orders | 12,000 |
| order_items | 60,000 |
| notifications | 24,613 |
| stock_movements | 262,056 |
| **Database size** | **155 MB** |

**Method:** we ran [`time_queries.py`](time_queries.py) against this database. For each query it does the following.
1. `PREPARE` the query exactly as written in `04_queries.sql`, with `$1, $2, …` parameters, just like the API sends it.
2. Run `EXPLAIN (ANALYZE, BUFFERS) EXECUTE …` with real ids from the data. For example, the retailer is "Retail Store 1", which has 40 products, 701 sales and 40 orders; the wholesaler is "Wholesaler 2".
3. Repeat **3 times**, each run in a new connection, and report the **average** of the `Execution Time` lines.
4. Run WRITE queries inside `BEGIN; … ROLLBACK;`, so every run starts from the same data. We checked in each plan that every write really changes rows. For example, W24 updates 5 products, and W14 inserts 234 sales.

The raw plans of all 3 runs are in [`plans/`](plans/), one file per query. All numbers are also in `plans/summary.csv`.

## Timing table

| Query | Type | What it does | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Average (ms) | Scan type |
|-------|------|--------------|-----------:|-----------:|-----------:|-------------:|-----------|
| R1 | READ | GET /api/health — database check | 0.025 | 0.022 | 0.049 | **0.032** | — (no table read) |
| R2 | READ | GET /api/auth/me (also every request, in requireAuth) | 0.089 | 0.080 | 0.057 | **0.075** | Index Scan using `profiles_pkey` on profiles<br>Index Scan using `businesses_pkey` on businesses |
| R3 | READ | GET /api/connections (retailer) — my wholesalers | 0.264 | 0.257 | 0.320 | **0.280** | Seq Scan on businesses<br>Bitmap Heap Scan on business_connections<br>Bitmap Index Scan on `business_connections_unique_pair` |
| R4 | READ | GET /api/connections (wholesaler) — my retailers | 0.532 | 0.605 | 0.444 | **0.527** | Seq Scan on businesses<br>Bitmap Heap Scan on business_connections<br>Bitmap Index Scan on `business_connections_wholesaler_idx` |
| R5 | READ | GET /api/connections/discover — wholesalers I am not connected to yet | 0.347 | 0.243 | 0.280 | **0.290** | Seq Scan on businesses<br>Index Only Scan using `business_connections_unique_pair` on business_connections |
| R6 | READ | GET /api/products (wholesaler) — own catalogue, paginated | 0.528 | 0.468 | 0.525 | **0.507** | Bitmap Heap Scan on products<br>Bitmap Index Scan on `products_wholesaler_id_idx` |
| R7 | READ | GET /api/products (retailer) — active products of ACTIVE-connected | 1.293 | 1.260 | 1.618 | **1.390** | Seq Scan on businesses<br>Bitmap Heap Scan on business_connections<br>Bitmap Index Scan on `business_connections_unique_pair`<br>Index Scan using `products_wholesaler_id_idx` on products |
| R8 | READ | GET /api/products/:id — one product, only if the caller may see it | 0.047 | 0.271 | 0.112 | **0.143** | Index Scan using `products_pkey` on products<br>Bitmap Heap Scan on business_connections<br>Bitmap Index Scan on `business_connections_unique_pair` |
| R9 | READ | GET /api/inventory — retailer's stock list with product, wholesaler and | 0.890 | 0.794 | 0.595 | **0.760** | Seq Scan on products<br>Bitmap Heap Scan on inventory<br>Bitmap Index Scan on `inventory_unique_product_per_business`<br>Index Scan using `businesses_pkey` on businesses<br>Bitmap Heap Scan on reorder_rules<br>Bitmap Index Scan on `reorder_rules_unique_product_per_retailer` |
| R10 | READ | GET /api/inventory/movements — stock history, newest first (?productId=) | 5.366 | 4.690 | 5.948 | **5.335** | Bitmap Heap Scan on stock_movements<br>Bitmap Index Scan on `stock_movements_business_product_idx`<br>Seq Scan on products<br>Seq Scan on orders<br>Seq Scan on profiles |
| R11 | READ | GET /api/inventory/reorder-rules — all of the retailer's rules | 0.527 | 0.575 | 0.756 | **0.619** | Seq Scan on products<br>Bitmap Heap Scan on reorder_rules<br>Bitmap Index Scan on `reorder_rules_unique_product_per_retailer` |
| R12 | READ | GET /api/sales — sales history (?productId=&from=&to=), newest first | 0.629 | 1.524 | 1.497 | **1.217** | Bitmap Heap Scan on sales<br>Bitmap Index Scan on `sales_retailer_product_sold_at_idx`<br>Seq Scan on products |
| R13 | READ | GET /api/predictions/stockout and /low-stock, and POST /api/orders/suggestions | 0.947 | 0.745 | 0.541 | **0.744** | Seq Scan on products<br>Bitmap Heap Scan on inventory<br>Bitmap Index Scan on `inventory_unique_product_per_business`<br>Bitmap Heap Scan on reorder_rules<br>Bitmap Index Scan on `reorder_rules_unique_product_per_retailer`<br>Index Scan using `sales_retailer_product_sold_at_idx` on sales |
| R14 | READ | After every sale (POST /api/sales): demand for that ONE product, to decide | 0.138 | 0.084 | 0.098 | **0.107** | Index Scan using `sales_retailer_product_sold_at_idx` on sales |
| R15 | READ | Before creating a LOW_STOCK notification: is there already an unread one | 0.055 | 0.058 | 0.106 | **0.073** | Bitmap Heap Scan on notifications<br>Bitmap Index Scan on `notifications_business_unread_idx` |
| R16 | READ | POST /api/orders/suggestions — is there already a suggested DRAFT for this | 0.060 | 0.068 | 0.072 | **0.067** | Bitmap Heap Scan on orders<br>Bitmap Index Scan on `orders_retailer_status_idx` |
| R17 | READ | GET /api/orders (retailer) — own orders incl. drafts (?status=), newest first | 0.900 | 0.746 | 0.753 | **0.800** | Bitmap Heap Scan on orders<br>Bitmap Index Scan on `orders_retailer_status_idx`<br>Seq Scan on businesses<br>Index Scan using `order_items_unique_product_per_order` on order_items |
| R18 | READ | GET /api/orders (wholesaler) — incoming orders. NEVER drafts (key rule). | 8.650 | 6.291 | 8.158 | **7.700** | Seq Scan on order_items<br>Bitmap Heap Scan on orders<br>Bitmap Index Scan on `orders_wholesaler_status_idx`<br>Seq Scan on businesses |
| R19 | READ | GET /api/orders/:id — order header. The retailer sees its own orders; the | 0.033 | 0.029 | 0.105 | **0.056** | Index Scan using `orders_pkey` on orders<br>Index Scan using `businesses_pkey` on businesses |
| R20 | READ | GET /api/orders/:id — order lines (after R19 confirmed access) | 0.125 | 0.202 | 0.270 | **0.199** | Bitmap Heap Scan on order_items<br>Bitmap Index Scan on `order_items_unique_product_per_order`<br>Index Scan using `products_pkey` on products |
| R21 | READ | GET /api/notifications — unread first, then newest (?unread=true) | 0.281 | 0.301 | 0.322 | **0.301** | Index Scan using `notifications_business_unread_idx` on notifications<br>Index Scan using `orders_pkey` on orders<br>Index Scan using `products_pkey` on products |
| R22 | READ | GET /api/notifications/unread-count — the number on the header bell | 0.128 | 0.135 | 0.110 | **0.124** | Index Only Scan using `notifications_business_unread_idx` on notifications |
| R23 | READ | GET /api/dashboard/retailer — four KPIs in one round trip | 1.225 | 0.919 | 0.757 | **0.967** | Seq Scan on products<br>Bitmap Heap Scan on inventory<br>Bitmap Index Scan on `inventory_unique_product_per_business`<br>Bitmap Heap Scan on reorder_rules<br>Bitmap Index Scan on `reorder_rules_unique_product_per_retailer`<br>Index Only Scan using `orders_retailer_status_idx` on orders<br>Bitmap Heap Scan on sales<br>Bitmap Index Scan on `sales_retailer_product_sold_at_idx` |
| R24 | READ | GET /api/dashboard/retailer — recent sales panel (last 5) | 0.498 | 1.000 | 0.953 | **0.817** | Bitmap Heap Scan on sales<br>Bitmap Index Scan on `sales_retailer_product_sold_at_idx`<br>Seq Scan on products |
| R25 | READ | GET /api/dashboard/wholesaler — KPIs in one round trip | 0.510 | 0.471 | 0.455 | **0.479** | Index Only Scan using `orders_wholesaler_status_idx` on orders<br>Bitmap Heap Scan on orders<br>Bitmap Index Scan on `orders_wholesaler_status_idx`<br>Bitmap Heap Scan on business_connections<br>Bitmap Index Scan on `business_connections_wholesaler_idx`<br>Bitmap Heap Scan on products<br>Bitmap Index Scan on `products_wholesaler_id_idx` |
| R26 | READ | GET /api/analytics/sales-trend (retailer) — daily sales for the last $2 days. | 3.142 | 2.665 | 3.254 | **3.020** | Bitmap Heap Scan on sales<br>Bitmap Index Scan on `sales_retailer_product_sold_at_idx` |
| R27 | READ | GET /api/analytics/sales-trend (wholesaler) — value of orders delivered per day | 0.872 | 0.947 | 2.192 | **1.337** | Bitmap Heap Scan on orders<br>Bitmap Index Scan on `orders_wholesaler_status_idx` |
| R28 | READ | GET /api/analytics/top-products (retailer) — best sellers, last 30 days | 0.964 | 0.971 | 0.871 | **0.935** | Bitmap Heap Scan on sales<br>Bitmap Index Scan on `sales_retailer_product_sold_at_idx`<br>Seq Scan on products |
| R29 | READ | GET /api/analytics/top-products (wholesaler) and the wholesaler dashboard · | 8.789 | 8.456 | 9.077 | **8.774** | Seq Scan on order_items<br>Bitmap Heap Scan on orders<br>Bitmap Index Scan on `orders_wholesaler_status_idx`<br>Seq Scan on products |
| R30 | READ | GET /api/analytics/orders-summary — number of orders per status. | 0.108 | 0.095 | 0.075 | **0.093** | Bitmap Heap Scan on orders<br>Bitmap Index Scan on `orders_retailer_status_idx`<br>Bitmap Index Scan on `orders_wholesaler_status_idx` |
| W1 | WRITE | POST /api/auth/register — step 1 of 2 (one transaction): create the business | 0.444 | 0.538 | 0.349 | **0.444** | — (no table read) |
| W2 | WRITE | POST /api/auth/register — step 2 of 2: link the Supabase user to the business | 0.510 | 0.285 | 0.229 | **0.341** | — (no table read) |
| W3 | WRITE | POST /api/connections — retailer connects to a wholesaler | 0.829 | 0.211 | 0.243 | **0.428** | Index Scan using `businesses_pkey` on businesses |
| W4 | WRITE | PATCH /api/connections/:id — wholesaler accepts / deactivates a connection | 0.866 | 0.750 | 0.836 | **0.817** | Index Scan using `business_connections_pkey` on business_connections |
| W5 | WRITE | POST /api/products — wholesaler adds a product | 0.624 | 0.362 | 0.327 | **0.438** | — (no table read) |
| W6 | WRITE | PATCH /api/products/:id — update only the fields that were sent (NULL = keep) | 0.972 | 0.859 | 0.707 | **0.846** | Index Scan using `products_pkey` on products |
| W7 | WRITE | DELETE /api/products/:id — soft delete (old orders keep their items) | 1.074 | 1.146 | 1.167 | **1.129** | Index Scan using `products_pkey` on products |
| W8 | WRITE | POST /api/inventory — step 1 (one transaction with W10): add a product to | 0.970 | 0.672 | 1.036 | **0.893** | Index Scan using `products_pkey` on products<br>Index Scan using `business_connections_unique_pair` on business_connections |
| W9 | WRITE | PATCH /api/inventory/:id/adjust — step 1: manual correction (±change). | 2.402 | 1.716 | 2.577 | **2.232** | Index Scan using `inventory_pkey` on inventory |
| W10 | WRITE | Stock movement log, step 2 of every stock change (append-only). | 1.419 | 1.331 | 1.766 | **1.505** | — (no table read) |
| W11 | WRITE | PUT /api/inventory/reorder-rules/:productId — create or update (upsert) | 2.849 | 1.898 | 1.574 | **2.107** | — (no table read) |
| W12 | WRITE | POST /api/sales — step 1 of 3 (one transaction): take the units out of stock. | 1.987 | 1.845 | 1.115 | **1.649** | Index Scan using `inventory_unique_product_per_business` on inventory |
| W13 | WRITE | POST /api/sales — step 2 of 3: record the sale. If no price is sent, the | 1.191 | 1.437 | 1.745 | **1.458** | Index Scan using `products_pkey` on products |
| W14 | WRITE | POST /api/sales/simulate — demo data: 0-4 random sales per stocked product | 3.369 | 4.488 | 4.813 | **4.223** | Index Only Scan using `inventory_unique_product_per_business` on inventory<br>Seq Scan on products |
| W15 | WRITE | POST /api/orders (empty draft) and POST /api/orders/suggestions (one per | 0.728 | 1.296 | 0.391 | **0.805** | Index Scan using `business_connections_unique_pair` on business_connections |
| W16 | WRITE | PUT /api/orders/:id/items — step 1 of 3: clear the draft's items | 0.214 | 0.192 | 0.281 | **0.229** | Index Scan using `orders_pkey` on orders<br>Bitmap Heap Scan on order_items<br>Bitmap Index Scan on `order_items_unique_product_per_order` |
| W17 | WRITE | PUT /api/orders/:id/items (and suggestions) — step 2 of 3: add one item. | 1.293 | 1.189 | 1.512 | **1.331** | Index Scan using `orders_pkey` on orders<br>Index Scan using `products_pkey` on products |
| W18 | WRITE | PUT /api/orders/:id/items — step 3 of 3: recalculate the order total | 2.116 | 1.973 | 1.919 | **2.003** | Index Scan using `orders_pkey` on orders<br>Bitmap Heap Scan on order_items<br>Bitmap Index Scan on `order_items_unique_product_per_order` |
| W19 | WRITE | POST /api/orders/:id/submit — DRAFT → SUBMITTED ⭐ (then W29 notifies the | 1.230 | 1.474 | 2.252 | **1.652** | Index Scan using `orders_pkey` on orders<br>Bitmap Heap Scan on order_items<br>Bitmap Index Scan on `order_items_unique_product_per_order`<br>Index Scan using `business_connections_unique_pair` on business_connections |
| W20 | WRITE | POST /api/orders/:id/cancel — retailer: DRAFT or SUBMITTED → CANCELLED. | 1.747 | 2.319 | 1.237 | **1.768** | Index Scan using `orders_pkey` on orders |
| W21 | WRITE | POST /api/orders/:id/accept — wholesaler: SUBMITTED → ACCEPTED (then notify retailer) | 2.433 | 2.341 | 2.736 | **2.503** | Index Scan using `orders_pkey` on orders |
| W22 | WRITE | POST /api/orders/:id/reject — wholesaler: SUBMITTED → REJECTED with a reason | 1.817 | 1.802 | 2.381 | **2.000** | Index Scan using `orders_pkey` on orders |
| W23 | WRITE | POST /api/orders/:id/dispatch — step 1 of 3 (one transaction) | 1.155 | 2.390 | 0.783 | **1.443** | Index Scan using `orders_pkey` on orders |
| W24 | WRITE | POST /api/orders/:id/dispatch — step 2 of 3: take every item out of the | 2.303 | 2.883 | 2.811 | **2.666** | Bitmap Heap Scan on products<br>Bitmap Index Scan on `products_wholesaler_id_idx`<br>Bitmap Heap Scan on order_items<br>Bitmap Index Scan on `order_items_unique_product_per_order` |
| W25 | WRITE | POST /api/orders/:id/dispatch — step 3 of 3: one ORDER_DISPATCHED movement | 2.442 | 2.814 | 1.960 | **2.405** | Bitmap Heap Scan on order_items<br>Bitmap Index Scan on `order_items_unique_product_per_order`<br>Index Scan using `products_pkey` on products |
| W26 | WRITE | POST /api/orders/:id/deliver — step 1 of 3 (one transaction) | 1.601 | 2.034 | 2.473 | **2.036** | Index Scan using `orders_pkey` on orders |
| W27 | WRITE | POST /api/orders/:id/deliver — step 2 of 3: add every item to the retailer's | 2.734 | 1.394 | 1.973 | **2.034** | Bitmap Heap Scan on order_items<br>Bitmap Index Scan on `order_items_unique_product_per_order` |
| W28 | WRITE | POST /api/orders/:id/deliver — step 3 of 3: one ORDER_DELIVERED movement per item | 1.880 | 1.637 | 2.264 | **1.927** | Bitmap Heap Scan on order_items<br>Bitmap Index Scan on `order_items_unique_product_per_order`<br>Index Scan using `inventory_unique_product_per_business` on inventory |
| W29 | WRITE | createNotification(): shared helper used by orders (submit, cancel, accept, | 1.589 | 1.532 | 1.823 | **1.648** | — (no table read) |
| W30 | WRITE | PATCH /api/notifications/:id/read — mark one as read | 0.563 | 0.325 | 0.427 | **0.438** | Index Scan using `notifications_pkey` on notifications |
| W31 | WRITE | PATCH /api/notifications/read-all — mark all as read | 0.811 | 0.505 | 0.474 | **0.597** | Bitmap Heap Scan on notifications<br>Bitmap Index Scan on `notifications_business_unread_idx` |

**Totals:**
- **30 READ queries:** 37.768 ms together. The slowest is R29 at 8.774 ms.
- **31 WRITE queries:** 45.995 ms together. The slowest is W14 at 4.223 ms; it inserts 234 demo sales in one statement.

## Query analysis

### 1. Every query is index-driven and scoped to one business

- Almost every query starts with `WHERE business_id = $1`, or the matching `retailer_id` / `wholesaler_id` column.
- Our schema has an index that starts with exactly that column:
  - `orders_retailer_status_idx` and `orders_wholesaler_status_idx`
  - `sales_retailer_product_sold_at_idx`
  - `notifications_business_unread_idx`
  - `stock_movements_business_product_idx`
  - the UNIQUE `(business_id, product_id)` on inventory
- So a query reads **only the caller's rows**, not the whole table. For example, R12 (sales history) reads 701 of 215,721 sales.
- Single-row lookups by id (R2, R8, R19, W3–W9, W17–W23, W26, W30) are primary-key Index Scans and run in under 0.1 ms. The writes in that list take 0.4–2.5 ms because they also update indexes, check foreign keys and run the `updated_at` triggers.

### 2. Why some plans still show a Seq Scan, and why that is fine

| Seq Scan on | Rows | Where | Why the planner chose it |
|-------------|-----:|-------|--------------------------|
| businesses | 320 | R3, R4, R5, R7, R9 … | The whole table is a few pages; hashing it once is cheaper than one index lookup per row. Takes about 0.05 ms. |
| products | 2,000 | R9, R11, R13, R23 | Same reason: reading 2,000 rows into a hash costs about 0.2 ms. |
| order_items | 60,000 | **R18, R29** | Explained below. |

### 3. The three slowest queries

**R29: wholesaler top products (8.774 ms)**
- Wholesaler 2 has 600 orders (575 not drafts), with 2,875 order items.
- The planner reads all 60,000 order_items once (Seq Scan, about 3 ms) and hash-joins them with that wholesaler's orders. It judges this cheaper than 600 separate index probes into `order_items_unique_product_per_order`.
- This choice is correct at this size. But the cost grows with the **whole** order_items table, not with this wholesaler's orders.
- **Fix when the data grows:** a covering index `order_items (order_id) INCLUDE (product_id, quantity, unit_price)` would turn this into a nested loop of Index Only Scans.

**R18: wholesaler order list (7.700 ms)**
- Same plan shape as R29, for the same reason (`count(oi.id)` per order).
- The same covering index would fix it.
- Another option is to store `item_count` on `orders` and keep it updated in W16–W17.

**R10: stock movement history (5.335 ms)**
- The movements themselves are found fast: Bitmap Heap Scan on `stock_movements_business_product_idx`, 851 rows in 0.3 ms.
- Most of the time goes to the two LEFT JOINs. The planner builds a hash of **all** orders (12,000 rows) and all profiles, only to show `order_number` and the user's name on the 50 rows the page displays.
- **Fix:** take the 50 newest movements first (`ORDER BY … LIMIT` in a subquery), and only then join orders and profiles for those 50 rows.

### 4. Real-time paths are well under 10 ms

These run on every screen or every click:

| Query | Time |
|-------|-----:|
| R2 (auth check, every request) | 0.075 ms |
| R22 (notification bell) | 0.124 ms |
| R7 (product browse) | 1.390 ms |
| W12 + W13 + W10 (recording a sale) | 1.649 + 1.458 + 1.505 ms |

- R22 is an **Index Only Scan**: the count is answered from the index alone.
- A sale is three statements in one transaction, about 4.6 ms in total.

The order lifecycle writes (W19–W28) each take 1.4–2.7 ms, including the foreign-key checks and `updated_at` triggers.

### 5. Correctness checks we did while timing

- **Drafts stay hidden.** The wholesaler order queries (R18, R19, R30) always filter `status <> 'DRAFT'`. In our earlier test, the wholesaler got 0 rows for a draft order.
- **Stock cannot go negative.** The stock-decrement writes (W9, W12) contain the guard in their `WHERE` clause, so a sale larger than stock returns 0 rows instead of making stock negative.
- **NULLs cannot empty the discovery list.** R5 uses `NOT EXISTS`, not `NOT IN`.
