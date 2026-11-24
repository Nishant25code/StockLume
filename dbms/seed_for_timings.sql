-- =====================================================================
-- StockLume · dbms/seed_for_timings.sql
-- Demo data used to time the queries in dbms/04_queries.sql (CP4).
--
--   createdb stocklume
--   psql -d stocklume -f dbms/03_schema.sql
--   psql -d stocklume -f dbms/seed_for_timings.sql
--
-- Deterministic (setseed), so every member gets the same rows.
-- Size (about 6 months of a small network of shops):
--   20 wholesalers · 300 retailers · 1,200 connections · 2,000 products
--   12,000 inventory rows · 5,959 reorder rules · 215,721 sales
--   12,000 orders · 60,000 order items · 24,613 notifications
--   262,056 stock movements
-- Every row respects the constraints and business rules of 03_schema.sql
-- (e.g. a DRAFT order has no submitted_at, stock never negative).
-- =====================================================================
SELECT setseed(0.42);

-- ---------- businesses + their login (auth.users -> profiles) ----------
CREATE TEMP TABLE b_map (n int, id uuid, type business_type);
INSERT INTO b_map
SELECT n, gen_random_uuid(), CASE WHEN n <= 20 THEN 'WHOLESALER' ELSE 'RETAILER' END::business_type
FROM generate_series(1, 320) n;

INSERT INTO businesses (id, name, type, email, phone, city, created_at)
SELECT m.id,
       CASE WHEN m.type = 'WHOLESALER' THEN 'Wholesaler ' || m.n ELSE 'Retail Store ' || (m.n - 20) END,
       m.type,
       'biz' || m.n || '@stocklume.test',
       '90000' || lpad(m.n::text, 5, '0'),
       (ARRAY['Delhi','Mumbai','Bengaluru','Jaipur','Pune','Sonipat','Lucknow','Chandigarh'])[1 + m.n % 8],
       now() - interval '200 days'
FROM b_map m;

INSERT INTO auth.users (id) SELECT id FROM b_map;      -- one login per business
INSERT INTO profiles (id, business_id, full_name, email)
SELECT id, id, 'Owner ' || n, 'owner' || n || '@stocklume.test' FROM b_map;

-- retailer r (1..300) -> wholesalers w = ((r + 5k) mod 20) + 1, k = 0..3 (4 distinct)
CREATE TEMP TABLE r_map AS SELECT n - 20 AS r, id FROM b_map WHERE type = 'RETAILER';
CREATE TEMP TABLE w_map AS SELECT n AS w, id FROM b_map WHERE type = 'WHOLESALER';

INSERT INTO business_connections (retailer_id, wholesaler_id, status, created_at)
SELECT r.id, w.id,
       CASE WHEN random() < 0.95 THEN 'ACTIVE' ELSE 'INACTIVE' END::connection_status,
       now() - interval '190 days'
FROM r_map r
CROSS JOIN generate_series(0, 3) k
JOIN w_map w ON w.w = ((r.r + 5 * k) % 20) + 1;

-- ---------- products: 100 per wholesaler ----------
CREATE TEMP TABLE p_map (w int, k int, id uuid);
INSERT INTO p_map SELECT w, k, gen_random_uuid() FROM generate_series(1, 20) w, generate_series(1, 100) k;

INSERT INTO products (id, wholesaler_id, name, sku, category, unit, price, available_quantity, is_active)
SELECT p.id, w.id,
       (ARRAY['Basmati Rice','Toor Dal','Sugar','Atta','Mustard Oil','Tea','Salt','Biscuits','Soap','Detergent'])[1 + p.k % 10]
         || ' ' || p.k || ' (W' || p.w || ')',
       'SKU-' || p.w || '-' || p.k,
       (ARRAY['Grocery','Grocery','Grocery','Grocery','Oil','Beverages','Grocery','Snacks','Personal care','Home care'])[1 + p.k % 10],
       CASE WHEN p.k % 10 IN (0, 3, 4) THEN 'kg' ELSE 'pcs' END,
       round((20 + random() * 980)::numeric, 2),
       (200 + random() * 2000)::int,
       random() < 0.97
FROM p_map p JOIN w_map w ON w.w = p.w;

-- ---------- inventory: 40 products per retailer (10 from each wholesaler) ----------
CREATE TEMP TABLE inv_map AS
SELECT r.r, r.id AS retailer_id, p.id AS product_id, p.w
FROM r_map r
CROSS JOIN generate_series(0, 3) g(slot)
JOIN p_map p ON p.w = ((r.r + 5 * g.slot) % 20) + 1
            AND p.k BETWEEN 1 + ((r.r * 7) % 90) AND 10 + ((r.r * 7) % 90);

INSERT INTO inventory (business_id, product_id, quantity)
SELECT retailer_id, product_id, (random() * 120)::int FROM inv_map;

INSERT INTO reorder_rules (retailer_id, product_id, min_stock, reorder_quantity, lead_time_days)
SELECT retailer_id, product_id, 5 + (random() * 20)::int, 20 + (random() * 40)::int, 1 + (random() * 6)::int
FROM inv_map WHERE random() < 0.5;

-- ---------- sales: last 180 days, ~10% chance per stocked product per day ----------
INSERT INTO sales (retailer_id, product_id, quantity, unit_price, sold_at, created_by, created_at)
SELECT i.retailer_id, i.product_id, 1 + (random() * 4)::int, p.price,
       ts, i.retailer_id, ts
FROM inv_map i
JOIN products p ON p.id = i.product_id
CROSS JOIN LATERAL (SELECT date_trunc('day', now()) - (d || ' days')::interval
                           + interval '9 hours' + random() * interval '12 hours' AS ts
                    FROM generate_series(1, 180) d) t
WHERE random() < 0.10;

-- ---------- orders: ~40 per retailer over 180 days, 5 items each ----------
CREATE TEMP TABLE o_tmp AS
SELECT gen_random_uuid() AS id, r.id AS retailer_id, w.id AS wholesaler_id, r.r, w.w,
       now() - (random() * 180 || ' days')::interval AS created_at,
       random() AS u
FROM r_map r
CROSS JOIN generate_series(1, 40) j
JOIN w_map w ON w.w = ((r.r + 5 * (j % 4)) % 20) + 1;

INSERT INTO orders (id, retailer_id, wholesaler_id, status, is_suggested, total_amount, created_by,
                    submitted_at, accepted_at, rejected_at, dispatched_at, delivered_at, cancelled_at, created_at)
SELECT id, retailer_id, wholesaler_id, st, u < 0.5, 0, retailer_id,
       CASE WHEN st NOT IN ('DRAFT') AND NOT (st = 'CANCELLED' AND u < 0.06) THEN created_at + interval '1 hour' END,
       CASE WHEN st IN ('ACCEPTED','DISPATCHED','DELIVERED') THEN created_at + interval '5 hours' END,
       CASE WHEN st = 'REJECTED' THEN created_at + interval '5 hours' END,
       CASE WHEN st IN ('DISPATCHED','DELIVERED') THEN created_at + interval '1 day' END,
       CASE WHEN st = 'DELIVERED' THEN created_at + interval '3 days' END,
       CASE WHEN st = 'CANCELLED' THEN created_at + interval '2 hours' END,
       created_at
FROM (SELECT o.*,
             (CASE WHEN u < 0.04 THEN 'DRAFT' WHEN u < 0.08 THEN 'CANCELLED' WHEN u < 0.12 THEN 'SUBMITTED'
                   WHEN u < 0.15 THEN 'REJECTED' WHEN u < 0.19 THEN 'ACCEPTED' WHEN u < 0.23 THEN 'DISPATCHED'
                   ELSE 'DELIVERED' END)::order_status AS st
      FROM o_tmp o) x;

INSERT INTO order_items (order_id, product_id, quantity, suggested_quantity, unit_price)
SELECT o.id, p.id, 10 + (random() * 40)::int, CASE WHEN random() < 0.5 THEN 30 END, pr.price
FROM o_tmp o
CROSS JOIN generate_series(0, 4) s
JOIN p_map p ON p.w = o.w AND p.k = 1 + ((o.r * 7) % 90) + s
JOIN products pr ON pr.id = p.id;

UPDATE orders o SET total_amount = t.total
FROM (SELECT order_id, sum(quantity * unit_price) AS total FROM order_items GROUP BY order_id) t
WHERE t.order_id = o.id;

-- ---------- stock movements: one per sale + one per delivered item ----------
INSERT INTO stock_movements (business_id, product_id, quantity_change, quantity_after, reason, sale_id, created_by, created_at)
SELECT s.retailer_id, s.product_id, -s.quantity, (random() * 100)::int, 'SALE', s.id, s.created_by, s.sold_at
FROM sales s;

INSERT INTO stock_movements (business_id, product_id, quantity_change, quantity_after, reason, order_id, created_by, created_at)
SELECT o.retailer_id, oi.product_id, oi.quantity, oi.quantity + (random() * 100)::int, 'ORDER_DELIVERED', o.id, o.retailer_id, o.delivered_at
FROM orders o JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'DELIVERED';

-- ---------- notifications: order events + low-stock alerts ----------
INSERT INTO notifications (business_id, type, title, message, related_order_id, is_read, created_at)
SELECT o.wholesaler_id, 'ORDER_SUBMITTED', 'New order #' || o.order_number, 'A retailer submitted an order',
       o.id, o.submitted_at < now() - interval '7 days', o.submitted_at
FROM orders o WHERE o.submitted_at IS NOT NULL;

INSERT INTO notifications (business_id, type, title, message, related_order_id, is_read, created_at)
SELECT o.retailer_id, 'ORDER_DISPATCHED', 'Order #' || o.order_number || ' dispatched', 'Your order is on the way',
       o.id, o.dispatched_at < now() - interval '7 days', o.dispatched_at
FROM orders o WHERE o.dispatched_at IS NOT NULL;

INSERT INTO notifications (business_id, type, title, message, related_product_id, is_read, created_at)
SELECT i.retailer_id, 'LOW_STOCK', 'Low stock', 'A product is at HIGH stockout risk',
       i.product_id, random() < 0.7, now() - (random() * 60 || ' days')::interval
FROM inv_map i WHERE random() < 0.3;

VACUUM ANALYZE;

SELECT 'businesses' AS t, count(*) FROM businesses UNION ALL
SELECT 'business_connections', count(*) FROM business_connections UNION ALL
SELECT 'products', count(*) FROM products UNION ALL
SELECT 'inventory', count(*) FROM inventory UNION ALL
SELECT 'reorder_rules', count(*) FROM reorder_rules UNION ALL
SELECT 'sales', count(*) FROM sales UNION ALL
SELECT 'orders', count(*) FROM orders UNION ALL
SELECT 'order_items', count(*) FROM order_items UNION ALL
SELECT 'notifications', count(*) FROM notifications UNION ALL
SELECT 'stock_movements', count(*) FROM stock_movements;
