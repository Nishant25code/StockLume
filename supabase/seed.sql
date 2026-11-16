-- ═══════════════════════════════════════════════════════════════════════════
-- StockLume — demo seed data (development / college demo only)
--
-- Gives every team member the same starting data:
--   2 wholesalers, 2 retailers, connections, 8 products,
--   retailer inventory + reorder rules, ~30 days of simulated sales history.
--
-- Profiles are NOT seeded because they must point at real Supabase Auth users.
-- After signing up a user in Supabase Auth, link it to a demo business:
--
--   insert into profiles (id, business_id, full_name, email)
--   values ('<auth-user-uuid>', '11111111-0000-0000-0000-000000000001', 'Demo Retailer', 'you@example.com');
--
-- Fixed UUIDs make it easy to reference rows in docs, tests and Postman.
-- Safe to run once on an empty database (after the initial migration).
-- ═══════════════════════════════════════════════════════════════════════════

-- Businesses ------------------------------------------------------------------
--   1111… = retailers, 2222… = wholesalers
insert into businesses (id, name, type, email, phone, city) values
  ('11111111-0000-0000-0000-000000000001', 'FreshMart Kirana',   'RETAILER',   'freshmart@example.com',  '+91 90000 00001', 'Sonipat'),
  ('11111111-0000-0000-0000-000000000002', 'Daily Needs Store',  'RETAILER',   'dailyneeds@example.com', '+91 90000 00002', 'Delhi'),
  ('22222222-0000-0000-0000-000000000001', 'Metro Wholesale Co', 'WHOLESALER', 'metro@example.com',      '+91 90000 00011', 'Delhi'),
  ('22222222-0000-0000-0000-000000000002', 'GreenLeaf Traders',  'WHOLESALER', 'greenleaf@example.com',  '+91 90000 00012', 'Gurugram');

-- Connections (who buys from whom) -------------------------------------------
insert into business_connections (retailer_id, wholesaler_id, status) values
  ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'ACTIVE'),
  ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'ACTIVE'),
  ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'ACTIVE');

-- Products (wholesaler catalogues) -------------------------------------------
--   3333… = products
insert into products (id, wholesaler_id, name, sku, category, unit, price, available_quantity) values
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Basmati Rice 5kg',        'MW-RICE-5',   'Grains',    'bag',    520.00, 400),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'Toor Dal 1kg',            'MW-DAL-1',    'Pulses',    'pack',   145.00, 600),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'Sunflower Oil 1L',        'MW-OIL-1',    'Oils',      'bottle', 160.00, 500),
  ('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 'Whole Wheat Atta 10kg',   'MW-ATTA-10',  'Grains',    'bag',    410.00, 300),
  ('33333333-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000002', 'Green Tea 100 bags',      'GL-TEA-100',  'Beverages', 'box',    280.00, 250),
  ('33333333-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000002', 'Organic Honey 500g',      'GL-HONEY-500','Spreads',   'jar',    325.00, 180),
  ('33333333-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000002', 'Almonds 250g',            'GL-ALM-250',  'Dry Fruits','pack',   299.00, 220),
  ('33333333-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000002', 'Rolled Oats 1kg',         'GL-OATS-1',   'Breakfast', 'pack',   199.00, 350);

-- Retailer inventory (FreshMart) — some items deliberately low ---------------
insert into inventory (business_id, product_id, quantity) values
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 6),   -- low
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', 42),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', 9),   -- low
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000004', 25),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000005', 3),   -- very low
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000006', 18),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000007', 30),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000008', 14),
  ('11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 20),
  ('11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003', 4);   -- low

-- Initial stock movements mirror the inventory above -------------------------
insert into stock_movements (business_id, product_id, quantity_change, quantity_after, reason, note)
select business_id, product_id, quantity, quantity, 'INITIAL_STOCK', 'Seed data'
from inventory
where quantity > 0;

-- Reorder rules (FreshMart) ---------------------------------------------------
insert into reorder_rules (retailer_id, product_id, min_stock, reorder_quantity, lead_time_days) values
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 10, 30, 3),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', 15, 40, 3),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', 12, 36, 2),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000005', 8,  20, 4);

-- Simulated sales history: last 30 days for FreshMart --------------------------
-- Deterministic "random-looking" quantities so everyone gets identical data.
-- Some days have no sale for a product (when the formula gives 0).
insert into sales (retailer_id, product_id, quantity, unit_price, sold_at)
select
  i.business_id,
  i.product_id,
  q.qty,
  round(p.price * 1.15, 2)                       as unit_price, -- retail markup
  date_trunc('day', now()) - (d || ' days')::interval + interval '11 hours' as sold_at
from inventory i
join products p on p.id = i.product_id
cross join generate_series(1, 30) as d
cross join lateral (
  select ((d * 7 + ascii(right(p.sku, 1)) * 3) % 5) as qty
) q
where i.business_id = '11111111-0000-0000-0000-000000000001'
  and q.qty > 0;
