-- =====================================================================
-- StockLume · dbms/04_queries.sql
-- Every SQL query the StockLume API runs, one per endpoint step.
--
-- Team T0069 · AP repo · PostgreSQL (Supabase) · schema: dbms/03_schema.sql
--
-- How to read this file
--   * Each query has an id (R1, R2 ... for reads, W1, W2 ... for writes),
--     is marked -- READ or -- WRITE, and names the endpoint that runs it.
--   * $1, $2 ... are bind parameters, exactly as the Express services send
--     them through node-postgres (src/db/pool.js). Values never go into the
--     SQL text, which protects against SQL injection.
--   * Every query is scoped to the caller's business ($1 = req.user.businessId
--     unless stated otherwise); a business never reads another's rows.
--   * Multi-step actions (record a sale, submit / dispatch / deliver an order)
--     run their statements inside ONE transaction (withTransaction), so stock,
--     movements and notifications can never disagree.
--   * Business rules are in docs/BUSINESS_RULES.md. The key one: a wholesaler
--     never sees a DRAFT order (every wholesaler query has status <> 'DRAFT').
--
-- All queries were checked against 03_schema.sql with PREPARE (syntax, column
-- names and parameter types).
-- =====================================================================


-- =====================================================================
-- Health and authentication (Member 1)
-- =====================================================================

-- R1 -- READ
-- GET /api/health · database check
SELECT 1 AS ok, now() AS server_time;

-- R2 -- READ
-- GET /api/auth/me, and the requireAuth middleware on EVERY request:
-- the signed-in Supabase user's profile, business and role.
-- $1 = auth user id (uuid from the verified JWT)
SELECT p.id          AS profile_id,
       p.full_name,
       p.email,
       b.id          AS business_id,
       b.name        AS business_name,
       b.type        AS role,
       b.city
FROM profiles p
JOIN businesses b ON b.id = p.business_id
WHERE p.id = $1;

-- W1 -- WRITE
-- POST /api/auth/register · step 1 of 2 (one transaction): create the business
-- $1 = name, $2 = 'RETAILER' | 'WHOLESALER', $3 = email, $4 = phone, $5 = city
INSERT INTO businesses (name, type, email, phone, city)
VALUES ($1, $2::business_type, $3, $4, $5)
RETURNING id;

-- W2 -- WRITE
-- POST /api/auth/register · step 2 of 2: link the Supabase user to the business
-- $1 = auth user id, $2 = business id from W1, $3 = full name, $4 = email
INSERT INTO profiles (id, business_id, full_name, email)
VALUES ($1, $2, $3, $4)
RETURNING id, business_id, full_name, email;


-- =====================================================================
-- Connections (Member 1)
-- =====================================================================

-- R3 -- READ
-- GET /api/connections (retailer) · my wholesalers
-- $1 = retailer business id
SELECT c.id      AS connection_id,
       c.status,
       c.created_at,
       w.id      AS wholesaler_id,
       w.name    AS wholesaler_name,
       w.city,
       w.phone
FROM business_connections c
JOIN businesses w ON w.id = c.wholesaler_id
WHERE c.retailer_id = $1
ORDER BY w.name;

-- R4 -- READ
-- GET /api/connections (wholesaler) · my retailers
-- $1 = wholesaler business id
SELECT c.id      AS connection_id,
       c.status,
       c.created_at,
       r.id      AS retailer_id,
       r.name    AS retailer_name,
       r.city,
       r.phone
FROM business_connections c
JOIN businesses r ON r.id = c.retailer_id
WHERE c.wholesaler_id = $1
ORDER BY r.name;

-- R5 -- READ
-- GET /api/connections/discover · wholesalers I am not connected to yet
-- NOT EXISTS (not NOT IN) so a NULL can never empty the list.
-- $1 = retailer business id
SELECT b.id, b.name, b.city, b.phone
FROM businesses b
WHERE b.type = 'WHOLESALER'
  AND NOT EXISTS (
        SELECT 1
        FROM business_connections c
        WHERE c.retailer_id = $1
          AND c.wholesaler_id = b.id)
ORDER BY b.name;

-- W3 -- WRITE
-- POST /api/connections · retailer connects to a wholesaler
-- INSERT ... SELECT so the row is only created if $2 really is a wholesaler;
-- 0 rows returned → 404. Duplicate pair → unique violation → 409 CONFLICT.
-- $1 = retailer business id, $2 = wholesaler id
INSERT INTO business_connections (retailer_id, wholesaler_id, status)
SELECT $1, b.id, 'ACTIVE'
FROM businesses b
WHERE b.id = $2
  AND b.type = 'WHOLESALER'
RETURNING id, retailer_id, wholesaler_id, status;

-- W4 -- WRITE
-- PATCH /api/connections/:id · wholesaler accepts / deactivates a connection
-- $1 = connection id, $2 = wholesaler business id, $3 = new status
UPDATE business_connections
SET status = $3::connection_status
WHERE id = $1
  AND wholesaler_id = $2
RETURNING id, retailer_id, status;


-- =====================================================================
-- Products (Member 1)
-- =====================================================================

-- R6 -- READ
-- GET /api/products (wholesaler) · own catalogue, paginated
-- count(*) OVER () gives meta.total in the same query.
-- $1 = wholesaler business id, $2 = limit, $3 = offset
SELECT p.id, p.name, p.sku, p.category, p.unit, p.price,
       p.available_quantity, p.is_active, p.updated_at,
       count(*) OVER () AS total
FROM products p
WHERE p.wholesaler_id = $1
ORDER BY p.name
LIMIT $2 OFFSET $3;

-- R7 -- READ
-- GET /api/products (retailer) · active products of ACTIVE-connected
-- wholesalers, optional ?wholesalerId= and ?search=
-- $1 = retailer business id, $2 = wholesaler filter (uuid or NULL),
-- $3 = search text (or NULL), $4 = limit, $5 = offset
SELECT p.id, p.name, p.sku, p.category, p.unit, p.price,
       p.available_quantity,
       w.id   AS wholesaler_id,
       w.name AS wholesaler_name,
       count(*) OVER () AS total
FROM products p
JOIN business_connections c ON c.wholesaler_id = p.wholesaler_id
                           AND c.retailer_id   = $1
                           AND c.status        = 'ACTIVE'
JOIN businesses w           ON w.id = p.wholesaler_id
WHERE p.is_active
  AND ($2::uuid IS NULL OR p.wholesaler_id = $2::uuid)
  AND ($3::text IS NULL OR p.name ILIKE '%' || $3::text || '%')
ORDER BY p.name
LIMIT $4 OFFSET $5;

-- R8 -- READ
-- GET /api/products/:id · one product, only if the caller may see it
-- (its own product, or a product of a wholesaler it is ACTIVE-connected to)
-- $1 = product id, $2 = caller business id
SELECT p.id, p.wholesaler_id, p.name, p.sku, p.category, p.unit,
       p.price, p.available_quantity, p.is_active, p.created_at, p.updated_at
FROM products p
WHERE p.id = $1
  AND (p.wholesaler_id = $2
       OR EXISTS (SELECT 1
                  FROM business_connections c
                  WHERE c.retailer_id   = $2
                    AND c.wholesaler_id = p.wholesaler_id
                    AND c.status        = 'ACTIVE'));

-- W5 -- WRITE
-- POST /api/products · wholesaler adds a product
-- $1 = wholesaler id, $2 = name, $3 = sku, $4 = category, $5 = unit,
-- $6 = price, $7 = available quantity
INSERT INTO products (wholesaler_id, name, sku, category, unit, price, available_quantity)
VALUES ($1, $2, $3, $4, coalesce($5, 'pcs'), $6, $7)
RETURNING *;

-- W6 -- WRITE
-- PATCH /api/products/:id · update only the fields that were sent (NULL = keep)
-- $1 = product id, $2 = wholesaler id, $3 = name, $4 = category, $5 = unit,
-- $6 = price, $7 = available quantity, $8 = is_active
UPDATE products
SET name               = coalesce($3, name),
    category           = coalesce($4, category),
    unit               = coalesce($5, unit),
    price              = coalesce($6, price),
    available_quantity = coalesce($7, available_quantity),
    is_active          = coalesce($8, is_active)
WHERE id = $1
  AND wholesaler_id = $2
RETURNING *;

-- W7 -- WRITE
-- DELETE /api/products/:id · soft delete (old orders keep their items)
-- $1 = product id, $2 = wholesaler id
UPDATE products
SET is_active = false
WHERE id = $1
  AND wholesaler_id = $2
RETURNING id, is_active;


-- =====================================================================
-- Inventory and reorder rules (Member 2)
-- =====================================================================

-- R9 -- READ
-- GET /api/inventory · retailer's stock list with product, wholesaler and
-- the reorder rule (defaults 10 / 20 / 3 when no rule exists)
-- $1 = retailer business id
SELECT i.id            AS inventory_id,
       i.quantity,
       i.updated_at,
       p.id            AS product_id,
       p.name          AS product_name,
       p.sku,
       p.unit,
       p.price,
       w.id            AS wholesaler_id,
       w.name          AS wholesaler_name,
       coalesce(r.min_stock, 10)        AS min_stock,
       coalesce(r.reorder_quantity, 20) AS reorder_quantity,
       coalesce(r.lead_time_days, 3)    AS lead_time_days
FROM inventory i
JOIN products p        ON p.id = i.product_id
JOIN businesses w      ON w.id = p.wholesaler_id
LEFT JOIN reorder_rules r ON r.retailer_id = i.business_id
                         AND r.product_id  = i.product_id
                         AND r.is_active
WHERE i.business_id = $1
ORDER BY p.name;

-- W8 -- WRITE
-- POST /api/inventory · step 1 (one transaction with W10): add a product to
-- the retailer's inventory. Only products of an ACTIVE-connected wholesaler.
-- $1 = retailer id, $2 = product id, $3 = starting quantity
INSERT INTO inventory (business_id, product_id, quantity)
SELECT $1, p.id, $3
FROM products p
JOIN business_connections c ON c.wholesaler_id = p.wholesaler_id
                           AND c.retailer_id   = $1
                           AND c.status        = 'ACTIVE'
WHERE p.id = $2
  AND p.is_active
RETURNING id, product_id, quantity;

-- W9 -- WRITE
-- PATCH /api/inventory/:id/adjust · step 1: manual correction (±change).
-- The "quantity + $3 >= 0" guard makes it atomic: 0 rows → 409 INSUFFICIENT_STOCK.
-- $1 = inventory id, $2 = retailer id, $3 = change (+/- integer)
UPDATE inventory
SET quantity = quantity + $3
WHERE id = $1
  AND business_id = $2
  AND quantity + $3 >= 0
RETURNING product_id, quantity;

-- W10 -- WRITE
-- Stock movement log, step 2 of every stock change (append-only).
-- Used by: add to inventory (INITIAL_STOCK), adjust (MANUAL_ADJUSTMENT),
-- record a sale (SALE, with sale_id). Same transaction as the stock change.
-- $1 = business id, $2 = product id, $3 = quantity change, $4 = quantity after,
-- $5 = reason, $6 = sale id (or NULL), $7 = order id (or NULL), $8 = note,
-- $9 = profile id of the user
INSERT INTO stock_movements
       (business_id, product_id, quantity_change, quantity_after, reason,
        sale_id, order_id, note, created_by)
VALUES ($1, $2, $3, $4, $5::stock_movement_reason, $6, $7, $8, $9)
RETURNING id, created_at;

-- R10 -- READ
-- GET /api/inventory/movements · stock history, newest first (?productId=)
-- $1 = business id, $2 = product filter (uuid or NULL), $3 = limit, $4 = offset
SELECT m.id,
       m.created_at,
       m.reason,
       m.quantity_change,
       m.quantity_after,
       m.note,
       p.name          AS product_name,
       o.order_number,
       pr.full_name    AS done_by
FROM stock_movements m
JOIN products p       ON p.id  = m.product_id
LEFT JOIN orders o    ON o.id  = m.order_id
LEFT JOIN profiles pr ON pr.id = m.created_by
WHERE m.business_id = $1
  AND ($2::uuid IS NULL OR m.product_id = $2::uuid)
ORDER BY m.created_at DESC
LIMIT $3 OFFSET $4;

-- R11 -- READ
-- GET /api/inventory/reorder-rules · all of the retailer's rules
-- $1 = retailer business id
SELECT r.id, r.product_id, p.name AS product_name,
       r.min_stock, r.reorder_quantity, r.lead_time_days, r.is_active, r.updated_at
FROM reorder_rules r
JOIN products p ON p.id = r.product_id
WHERE r.retailer_id = $1
ORDER BY p.name;

-- W11 -- WRITE
-- PUT /api/inventory/reorder-rules/:productId · create or update (upsert)
-- $1 = retailer id, $2 = product id, $3 = min stock, $4 = reorder quantity,
-- $5 = lead time days
INSERT INTO reorder_rules (retailer_id, product_id, min_stock, reorder_quantity, lead_time_days)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (retailer_id, product_id) DO UPDATE
SET min_stock        = excluded.min_stock,
    reorder_quantity = excluded.reorder_quantity,
    lead_time_days   = excluded.lead_time_days,
    is_active        = true
RETURNING *;


-- =====================================================================
-- Sales (Member 2)
-- =====================================================================

-- R12 -- READ
-- GET /api/sales · sales history (?productId=&from=&to=), newest first
-- $1 = retailer id, $2 = product filter, $3 = from, $4 = to (each may be NULL),
-- $5 = limit, $6 = offset
SELECT s.id,
       s.sold_at,
       s.quantity,
       s.unit_price,
       s.quantity * s.unit_price AS amount,
       p.id   AS product_id,
       p.name AS product_name,
       count(*) OVER () AS total
FROM sales s
JOIN products p ON p.id = s.product_id
WHERE s.retailer_id = $1
  AND ($2::uuid        IS NULL OR s.product_id = $2::uuid)
  AND ($3::timestamptz IS NULL OR s.sold_at >= $3::timestamptz)
  AND ($4::timestamptz IS NULL OR s.sold_at <  $4::timestamptz)
ORDER BY s.sold_at DESC
LIMIT $5 OFFSET $6;

-- W12 -- WRITE
-- POST /api/sales · step 1 of 3 (one transaction): take the units out of stock.
-- Atomic: two sales at the same moment cannot both pass the "quantity >= $3"
-- check. 0 rows → 409 INSUFFICIENT_STOCK and the transaction is rolled back.
-- $1 = retailer id, $2 = product id, $3 = quantity sold
UPDATE inventory
SET quantity = quantity - $3
WHERE business_id = $1
  AND product_id  = $2
  AND quantity   >= $3
RETURNING quantity;

-- W13 -- WRITE
-- POST /api/sales · step 2 of 3: record the sale. If no price is sent, the
-- product's price is used. (Step 3 is W10 with reason 'SALE' and this sale id.)
-- $1 = retailer id, $2 = product id, $3 = quantity, $4 = unit price (or NULL),
-- $5 = profile id
INSERT INTO sales (retailer_id, product_id, quantity, unit_price, created_by)
SELECT $1, p.id, $3, coalesce($4, p.price), $5
FROM products p
WHERE p.id = $2
RETURNING id, sold_at, unit_price;

-- W14 -- WRITE
-- POST /api/sales/simulate · demo data: 0-4 random sales per stocked product
-- per day for the last $2 days (history only, inventory is not reduced).
-- Sale times fall between 09:00 and 21:00 but never in the future.
-- Days are clamped to 1..90 in SQL so one request cannot insert unbounded rows.
-- $1 = retailer id, $2 = number of days
INSERT INTO sales (retailer_id, product_id, quantity, unit_price, sold_at)
SELECT i.business_id,
       i.product_id,
       1 + floor(random() * 4)::int,
       p.price,
       least(d.day + interval '9 hours' + random() * interval '12 hours', now())
FROM inventory i
JOIN products p ON p.id = i.product_id
CROSS JOIN generate_series(current_date - (least(greatest($2::int, 1), 90) - 1), current_date, interval '1 day') AS d(day)
WHERE i.business_id = $1
  AND random() < 0.8
RETURNING id;


-- =====================================================================
-- Stockout prediction (Member 2) · see docs/STOCKOUT_MODEL.md
-- =====================================================================

-- R13 -- READ
-- GET /api/predictions/stockout and /low-stock, and POST /api/orders/suggestions:
-- the model's inputs for every product the retailer stocks, in one query.
-- The Poisson probability is then computed in JavaScript.
-- $1 = retailer business id
SELECT i.product_id,
       p.name                                      AS product_name,
       p.wholesaler_id,
       p.available_quantity                        AS wholesaler_stock,
       i.quantity                                  AS stock,
       coalesce(sum(s.quantity), 0)::numeric / 28  AS avg_daily_demand,
       count(DISTINCT date_trunc('day', s.sold_at)) AS days_with_sales,
       coalesce(r.lead_time_days, 3)               AS lead_time_days,
       coalesce(r.min_stock, 10)                   AS min_stock,
       coalesce(r.reorder_quantity, 20)            AS reorder_quantity
FROM inventory i
JOIN products p           ON p.id = i.product_id
LEFT JOIN reorder_rules r ON r.retailer_id = i.business_id
                         AND r.product_id  = i.product_id
                         AND r.is_active
LEFT JOIN sales s         ON s.retailer_id = i.business_id
                         AND s.product_id  = i.product_id
                         AND s.sold_at    >= now() - interval '28 days'
WHERE i.business_id = $1
GROUP BY i.product_id, p.name, p.wholesaler_id, p.available_quantity, i.quantity,
         r.lead_time_days, r.min_stock, r.reorder_quantity
ORDER BY p.name;

-- R14 -- READ
-- After every sale (POST /api/sales): demand for that ONE product, to decide
-- whether it just became HIGH risk.
-- $1 = retailer id, $2 = product id
SELECT coalesce(sum(s.quantity), 0)::numeric / 28    AS avg_daily_demand,
       count(DISTINCT date_trunc('day', s.sold_at))  AS days_with_sales
FROM sales s
WHERE s.retailer_id = $1
  AND s.product_id  = $2
  AND s.sold_at    >= now() - interval '28 days';

-- R15 -- READ
-- Before creating a LOW_STOCK notification: is there already an unread one
-- for this product? (avoids duplicate alerts)
-- $1 = retailer id, $2 = product id
SELECT EXISTS (
    SELECT 1
    FROM notifications n
    WHERE n.business_id        = $1
      AND n.type               = 'LOW_STOCK'
      AND n.related_product_id = $2
      AND NOT n.is_read
) AS already_alerted;


-- =====================================================================
-- Orders (Member 3) · lifecycle in docs/BUSINESS_RULES.md
-- =====================================================================

-- R16 -- READ
-- POST /api/orders/suggestions · is there already a suggested DRAFT for this
-- wholesaler? (refresh it instead of creating a second one)
-- $1 = retailer id, $2 = wholesaler id
SELECT o.id
FROM orders o
WHERE o.retailer_id   = $1
  AND o.wholesaler_id = $2
  AND o.status        = 'DRAFT'
  AND o.is_suggested;

-- W15 -- WRITE
-- POST /api/orders (empty draft) and POST /api/orders/suggestions (one per
-- wholesaler). Requires an ACTIVE connection; 0 rows → 409 NOT_CONNECTED.
-- No notification: a DRAFT is invisible to the wholesaler.
-- $1 = retailer id, $2 = wholesaler id, $3 = notes, $4 = is_suggested,
-- $5 = profile id
INSERT INTO orders (retailer_id, wholesaler_id, status, is_suggested, notes, created_by)
SELECT c.retailer_id, c.wholesaler_id, 'DRAFT', $4, $3, $5
FROM business_connections c
WHERE c.retailer_id   = $1
  AND c.wholesaler_id = $2
  AND c.status        = 'ACTIVE'
RETURNING id, order_number, status;

-- W16 -- WRITE
-- PUT /api/orders/:id/items · step 1 of 3: clear the draft's items
-- (only the retailer's own order, only while DRAFT)
-- $1 = order id, $2 = retailer id
DELETE FROM order_items oi
USING orders o
WHERE oi.order_id   = o.id
  AND o.id          = $1
  AND o.retailer_id = $2
  AND o.status      = 'DRAFT';

-- W17 -- WRITE
-- PUT /api/orders/:id/items (and suggestions) · step 2 of 3: add one item.
-- unit_price is copied from products.price (price snapshot). The join makes
-- sure the product belongs to the order's wholesaler and is active, and the
-- order must be the caller's own DRAFT (0 rows → 404).
-- $1 = order id, $2 = product id, $3 = quantity, $4 = suggested quantity (or NULL),
-- $5 = retailer id (caller)
INSERT INTO order_items (order_id, product_id, quantity, suggested_quantity, unit_price)
SELECT o.id, p.id, $3, $4, p.price
FROM orders o
JOIN products p ON p.wholesaler_id = o.wholesaler_id
WHERE o.id          = $1
  AND o.retailer_id = $5
  AND o.status      = 'DRAFT'
  AND p.id     = $2
  AND p.is_active
RETURNING id, product_id, quantity, unit_price;

-- W18 -- WRITE
-- PUT /api/orders/:id/items · step 3 of 3: recalculate the order total
-- (only the caller's own DRAFT)
-- $1 = order id, $2 = retailer id (caller)
UPDATE orders o
SET total_amount = coalesce((SELECT sum(oi.quantity * oi.unit_price)
                             FROM order_items oi
                             WHERE oi.order_id = o.id), 0)
WHERE o.id = $1
  AND o.retailer_id = $2
  AND o.status = 'DRAFT'
RETURNING total_amount;

-- R17 -- READ
-- GET /api/orders (retailer) · own orders incl. drafts (?status=), newest first
-- $1 = retailer id, $2 = status filter (or NULL), $3 = limit, $4 = offset
SELECT o.id, o.order_number, o.status, o.is_suggested, o.total_amount,
       o.created_at, o.submitted_at,
       w.name           AS wholesaler_name,
       count(oi.id)     AS item_count
FROM orders o
JOIN businesses w          ON w.id = o.wholesaler_id
LEFT JOIN order_items oi   ON oi.order_id = o.id
WHERE o.retailer_id = $1
  AND ($2::order_status IS NULL OR o.status = $2::order_status)
GROUP BY o.id, w.name
ORDER BY o.created_at DESC
LIMIT $3 OFFSET $4;

-- R18 -- READ
-- GET /api/orders (wholesaler) · incoming orders. NEVER drafts (key rule).
-- $1 = wholesaler id, $2 = status filter (or NULL), $3 = limit, $4 = offset
SELECT o.id, o.order_number, o.status, o.total_amount,
       o.submitted_at, o.accepted_at, o.dispatched_at, o.delivered_at,
       r.name           AS retailer_name,
       count(oi.id)     AS item_count
FROM orders o
JOIN businesses r          ON r.id = o.retailer_id
LEFT JOIN order_items oi   ON oi.order_id = o.id
WHERE o.wholesaler_id = $1
  AND o.status <> 'DRAFT'
  AND ($2::order_status IS NULL OR o.status = $2::order_status)
GROUP BY o.id, r.name
ORDER BY o.submitted_at DESC
LIMIT $3 OFFSET $4;

-- R19 -- READ
-- GET /api/orders/:id · order header. The retailer sees its own orders; the
-- wholesaler sees them only once submitted. Anything else → 404.
-- $1 = order id, $2 = caller business id
SELECT o.*,
       r.name AS retailer_name,
       w.name AS wholesaler_name
FROM orders o
JOIN businesses r ON r.id = o.retailer_id
JOIN businesses w ON w.id = o.wholesaler_id
WHERE o.id = $1
  AND (o.retailer_id = $2
       OR (o.wholesaler_id = $2 AND o.status <> 'DRAFT'));

-- R20 -- READ
-- GET /api/orders/:id · order lines (after R19 confirmed access)
-- $1 = order id
SELECT oi.id, oi.product_id, p.name AS product_name, p.sku, p.unit,
       oi.quantity, oi.suggested_quantity, oi.unit_price,
       oi.quantity * oi.unit_price AS line_total
FROM order_items oi
JOIN products p ON p.id = oi.product_id
WHERE oi.order_id = $1
ORDER BY p.name;

-- W19 -- WRITE
-- POST /api/orders/:id/submit · DRAFT → SUBMITTED ⭐ (then W29 notifies the
-- wholesaler, same transaction). Only with ≥ 1 item and an ACTIVE connection.
-- $1 = order id, $2 = retailer id
UPDATE orders o
SET status = 'SUBMITTED',
    submitted_at = now()
WHERE o.id = $1
  AND o.retailer_id = $2
  AND o.status = 'DRAFT'
  AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
  AND EXISTS (SELECT 1 FROM business_connections c
              WHERE c.retailer_id   = o.retailer_id
                AND c.wholesaler_id = o.wholesaler_id
                AND c.status        = 'ACTIVE')
RETURNING o.id, o.order_number, o.wholesaler_id, o.total_amount;

-- W20 -- WRITE
-- POST /api/orders/:id/cancel · retailer: DRAFT or SUBMITTED → CANCELLED.
-- notify_wholesaler tells the service whether to run W29 (only if it had
-- already been submitted).
-- $1 = order id, $2 = retailer id
UPDATE orders
SET status = 'CANCELLED',
    cancelled_at = now()
WHERE id = $1
  AND retailer_id = $2
  AND status IN ('DRAFT', 'SUBMITTED')
RETURNING id, order_number, wholesaler_id, (submitted_at IS NOT NULL) AS notify_wholesaler;

-- W21 -- WRITE
-- POST /api/orders/:id/accept · wholesaler: SUBMITTED → ACCEPTED (then notify retailer)
-- $1 = order id, $2 = wholesaler id
UPDATE orders
SET status = 'ACCEPTED',
    accepted_at = now()
WHERE id = $1
  AND wholesaler_id = $2
  AND status = 'SUBMITTED'
RETURNING id, order_number, retailer_id;

-- W22 -- WRITE
-- POST /api/orders/:id/reject · wholesaler: SUBMITTED → REJECTED with a reason
-- $1 = order id, $2 = wholesaler id, $3 = reason
UPDATE orders
SET status = 'REJECTED',
    rejected_at = now(),
    rejection_reason = $3
WHERE id = $1
  AND wholesaler_id = $2
  AND status = 'SUBMITTED'
RETURNING id, order_number, retailer_id;

-- W23 -- WRITE
-- POST /api/orders/:id/dispatch · step 1 of 3 (one transaction):
-- wholesaler: ACCEPTED → DISPATCHED
-- $1 = order id, $2 = wholesaler id
UPDATE orders
SET status = 'DISPATCHED',
    dispatched_at = now()
WHERE id = $1
  AND wholesaler_id = $2
  AND status = 'ACCEPTED'
RETURNING id, order_number, retailer_id;

-- W24 -- WRITE
-- POST /api/orders/:id/dispatch · step 2 of 3: take every item out of the
-- wholesaler's stock in one statement (UPDATE ... FROM order_items).
-- If any product would go below 0, CHECK (available_quantity >= 0) fails,
-- the whole transaction rolls back → 409 INSUFFICIENT_STOCK.
-- $1 = order id, $2 = wholesaler id
UPDATE products p
SET available_quantity = p.available_quantity - oi.quantity
FROM order_items oi
WHERE oi.order_id      = $1
  AND p.id             = oi.product_id
  AND p.wholesaler_id  = $2
RETURNING p.id, p.available_quantity;

-- W25 -- WRITE
-- POST /api/orders/:id/dispatch · step 3 of 3: one ORDER_DISPATCHED movement
-- per item (runs after W24, so available_quantity is already the new value)
-- $1 = order id, $2 = wholesaler id, $3 = profile id
INSERT INTO stock_movements
       (business_id, product_id, quantity_change, quantity_after, reason, order_id, created_by)
SELECT $2, p.id, -oi.quantity, p.available_quantity, 'ORDER_DISPATCHED', oi.order_id, $3
FROM order_items oi
JOIN products p ON p.id = oi.product_id
WHERE oi.order_id = $1;

-- W26 -- WRITE
-- POST /api/orders/:id/deliver · step 1 of 3 (one transaction):
-- retailer confirms receipt: DISPATCHED → DELIVERED
-- $1 = order id, $2 = retailer id
UPDATE orders
SET status = 'DELIVERED',
    delivered_at = now()
WHERE id = $1
  AND retailer_id = $2
  AND status = 'DISPATCHED'
RETURNING id, order_number, wholesaler_id;

-- W27 -- WRITE
-- POST /api/orders/:id/deliver · step 2 of 3: add every item to the retailer's
-- inventory. Upsert: creates the row the first time the retailer stocks a product.
-- $1 = order id, $2 = retailer id
INSERT INTO inventory (business_id, product_id, quantity)
SELECT $2, oi.product_id, oi.quantity
FROM order_items oi
WHERE oi.order_id = $1
ON CONFLICT (business_id, product_id) DO UPDATE
SET quantity = inventory.quantity + excluded.quantity
RETURNING product_id, quantity;

-- W28 -- WRITE
-- POST /api/orders/:id/deliver · step 3 of 3: one ORDER_DELIVERED movement per item
-- $1 = order id, $2 = retailer id, $3 = profile id
INSERT INTO stock_movements
       (business_id, product_id, quantity_change, quantity_after, reason, order_id, created_by)
SELECT $2, oi.product_id, oi.quantity, i.quantity, 'ORDER_DELIVERED', oi.order_id, $3
FROM order_items oi
JOIN inventory i ON i.business_id = $2
                AND i.product_id  = oi.product_id
WHERE oi.order_id = $1;


-- =====================================================================
-- Notifications (Member 4)
-- =====================================================================

-- W29 -- WRITE
-- createNotification(): shared helper used by orders (submit, cancel, accept,
-- reject, dispatch, deliver) and sales (LOW_STOCK), inside the caller's transaction.
-- $1 = recipient business id, $2 = type, $3 = title, $4 = message,
-- $5 = related order id (or NULL), $6 = related product id (or NULL)
INSERT INTO notifications (business_id, type, title, message, related_order_id, related_product_id)
VALUES ($1, $2::notification_type, $3, $4, $5, $6)
RETURNING id, created_at;

-- R21 -- READ
-- GET /api/notifications · unread first, then newest (?unread=true)
-- $1 = business id, $2 = only unread (boolean), $3 = limit, $4 = offset
SELECT n.id, n.type, n.title, n.message, n.is_read, n.created_at,
       o.id           AS order_id,
       o.order_number,
       p.id           AS product_id,
       p.name         AS product_name
FROM notifications n
LEFT JOIN orders o   ON o.id = n.related_order_id
LEFT JOIN products p ON p.id = n.related_product_id
WHERE n.business_id = $1
  AND (NOT $2::boolean OR NOT n.is_read)
ORDER BY n.is_read, n.created_at DESC
LIMIT $3 OFFSET $4;

-- R22 -- READ
-- GET /api/notifications/unread-count · the number on the header bell
-- (polled often, so it is a single index-friendly count)
-- $1 = business id
SELECT count(*) AS count
FROM notifications
WHERE business_id = $1
  AND NOT is_read;

-- W30 -- WRITE
-- PATCH /api/notifications/:id/read · mark one as read
-- $1 = notification id, $2 = business id
UPDATE notifications
SET is_read = true
WHERE id = $1
  AND business_id = $2
RETURNING id, is_read;

-- W31 -- WRITE
-- PATCH /api/notifications/read-all · mark all as read
-- $1 = business id
UPDATE notifications
SET is_read = true
WHERE business_id = $1
  AND NOT is_read;


-- =====================================================================
-- Dashboard and analytics (Member 4)
-- =====================================================================

-- R23 -- READ
-- GET /api/dashboard/retailer · four KPIs in one round trip
-- stock value is at wholesale price (what the stock cost the retailer)
-- $1 = retailer id
SELECT
    (SELECT coalesce(sum(i.quantity * p.price), 0)
       FROM inventory i
       JOIN products p ON p.id = i.product_id
      WHERE i.business_id = $1)                                   AS stock_value,
    (SELECT count(*)
       FROM inventory i
       LEFT JOIN reorder_rules r ON r.retailer_id = i.business_id
                                AND r.product_id  = i.product_id
                                AND r.is_active
      WHERE i.business_id = $1
        AND i.quantity <= coalesce(r.min_stock, 10))              AS low_stock_items,
    (SELECT count(*)
       FROM orders o
      WHERE o.retailer_id = $1
        AND o.status IN ('SUBMITTED', 'ACCEPTED', 'DISPATCHED'))  AS open_orders,
    (SELECT coalesce(sum(s.quantity * s.unit_price), 0)
       FROM sales s
      WHERE s.retailer_id = $1
        AND s.sold_at >= now() - interval '7 days')               AS sales_last_7_days;

-- R24 -- READ
-- GET /api/dashboard/retailer · recent sales panel (last 5)
-- $1 = retailer id
SELECT s.sold_at, p.name AS product_name, s.quantity, s.quantity * s.unit_price AS amount
FROM sales s
JOIN products p ON p.id = s.product_id
WHERE s.retailer_id = $1
ORDER BY s.sold_at DESC
LIMIT 5;

-- R25 -- READ
-- GET /api/dashboard/wholesaler · KPIs in one round trip
-- revenue = value of orders delivered in the last 30 days
-- $1 = wholesaler id
SELECT
    (SELECT count(*)
       FROM orders o
      WHERE o.wholesaler_id = $1
        AND o.status = 'SUBMITTED')                               AS pending_orders,
    (SELECT coalesce(sum(o.total_amount), 0)
       FROM orders o
      WHERE o.wholesaler_id = $1
        AND o.status = 'DELIVERED'
        AND o.delivered_at >= now() - interval '30 days')         AS revenue_30_days,
    (SELECT count(*)
       FROM business_connections c
      WHERE c.wholesaler_id = $1
        AND c.status = 'ACTIVE')                                  AS connected_retailers,
    (SELECT count(*)
       FROM products p
      WHERE p.wholesaler_id = $1
        AND p.is_active
        AND p.available_quantity = 0)                             AS out_of_stock_products;

-- R26 -- READ
-- GET /api/analytics/sales-trend (retailer) · daily sales for the last $2 days.
-- generate_series + LEFT JOIN so days without sales show 0 (the chart has no gaps).
-- $1 = retailer id, $2 = days (e.g. 30; clamped to 1..90)
SELECT d.day::date                                AS day,
       coalesce(sum(s.quantity * s.unit_price), 0) AS sales_amount,
       coalesce(sum(s.quantity), 0)                AS units_sold
FROM generate_series(current_date - (least(greatest($2::int, 1), 90) - 1), current_date, interval '1 day') AS d(day)
LEFT JOIN sales s ON s.retailer_id = $1
                 AND s.sold_at >= d.day
                 AND s.sold_at <  d.day + interval '1 day'
GROUP BY d.day
ORDER BY d.day;

-- R27 -- READ
-- GET /api/analytics/sales-trend (wholesaler) · value of orders delivered per day
-- $1 = wholesaler id, $2 = days (clamped to 1..90)
SELECT d.day::date                       AS day,
       coalesce(sum(o.total_amount), 0)  AS delivered_amount,
       count(o.id)                       AS orders_delivered
FROM generate_series(current_date - (least(greatest($2::int, 1), 90) - 1), current_date, interval '1 day') AS d(day)
LEFT JOIN orders o ON o.wholesaler_id = $1
                  AND o.status = 'DELIVERED'
                  AND o.delivered_at >= d.day
                  AND o.delivered_at <  d.day + interval '1 day'
GROUP BY d.day
ORDER BY d.day;

-- R28 -- READ
-- GET /api/analytics/top-products (retailer) · best sellers, last 30 days
-- $1 = retailer id, $2 = how many (e.g. 5)
SELECT p.id, p.name,
       sum(s.quantity)                AS units_sold,
       sum(s.quantity * s.unit_price) AS sales_amount
FROM sales s
JOIN products p ON p.id = s.product_id
WHERE s.retailer_id = $1
  AND s.sold_at >= now() - interval '30 days'
GROUP BY p.id, p.name
ORDER BY units_sold DESC
LIMIT least($2::int, 50);

-- R29 -- READ
-- GET /api/analytics/top-products (wholesaler) and the wholesaler dashboard ·
-- most ordered products in accepted / dispatched / delivered orders
-- $1 = wholesaler id, $2 = how many
SELECT p.id, p.name,
       sum(oi.quantity)                 AS units_ordered,
       sum(oi.quantity * oi.unit_price) AS order_value,
       count(DISTINCT o.retailer_id)    AS retailers
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p     ON p.id = oi.product_id
WHERE o.wholesaler_id = $1
  AND o.status IN ('ACCEPTED', 'DISPATCHED', 'DELIVERED')
GROUP BY p.id, p.name
ORDER BY units_ordered DESC
LIMIT least($2::int, 50);

-- R30 -- READ
-- GET /api/analytics/orders-summary · number of orders per status.
-- One query for both roles: a business is either a retailer or a wholesaler,
-- and the wholesaler branch hides drafts.
-- $1 = business id
SELECT o.status, count(*) AS orders
FROM orders o
WHERE o.retailer_id = $1
   OR (o.wholesaler_id = $1 AND o.status <> 'DRAFT')
GROUP BY o.status
ORDER BY o.status;
