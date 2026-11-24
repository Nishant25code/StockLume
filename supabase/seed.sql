-- ═══════════════════════════════════════════════════════════════════════════
-- StockLume — demo seed data (development / college demo only)
--
-- Gives every team member consistent starting data:
--   3 wholesalers, 3 retailers, connections across all statuses (ACTIVE, PENDING),
--   12 products, retailer inventory + reorder rules, 30 days of simulated sales,
--   sample orders across all lifecycle states, order items, and notifications.
--
-- Profiles are NOT seeded because they must point at real Supabase Auth users.
-- After signing up a user in Supabase Auth, link it to a demo business:
--
--   insert into profiles (id, business_id, full_name, email)
--   values ('<auth-user-uuid>', '11111111-0000-0000-0000-000000000001', 'Demo Retailer', 'you@example.com');
--
-- Fixed UUIDs make it easy to reference rows in docs, tests and Postman.
-- Safe to run on an empty database (or with ON CONFLICT DO NOTHING).
-- ═══════════════════════════════════════════════════════════════════════════

-- Businesses ------------------------------------------------------------------
--   1111… = retailers, 2222… = wholesalers
insert into businesses (id, name, type, email, phone, address, city) values
  ('11111111-0000-0000-0000-000000000001', 'FreshMart Kirana',   'RETAILER',   'freshmart@example.com',  '+91 90000 00001', 'Shop 4, Market Road', 'Sonipat'),
  ('11111111-0000-0000-0000-000000000002', 'Daily Needs Store',  'RETAILER',   'dailyneeds@example.com', '+91 90000 00002', '12 Ring Road',        'Delhi'),
  ('11111111-0000-0000-0000-000000000003', 'QuickStop Grocery',  'RETAILER',   'quickstop@example.com',  '+91 90000 00003', 'Sector 14, Main St',  'Gurugram'),
  ('22222222-0000-0000-0000-000000000001', 'Metro Wholesale Co', 'WHOLESALER', 'metro@example.com',      '+91 90000 00011', 'Industrial Area A',   'Delhi'),
  ('22222222-0000-0000-0000-000000000002', 'GreenLeaf Traders',  'WHOLESALER', 'greenleaf@example.com',  '+91 90000 00012', 'Warehouse Complex 2', 'Gurugram'),
  ('22222222-0000-0000-0000-000000000003', 'Apex Agro Supplies', 'WHOLESALER', 'apex@example.com',       '+91 90000 00013', 'Grain Mandi Gate 1',  'Sonipat')
on conflict (id) do nothing;

-- Connections (who buys from whom) -------------------------------------------
--   Includes ACTIVE, PENDING, and lets Apex Wholesale serve as a discoverable partner.
insert into business_connections (id, retailer_id, wholesaler_id, status) values
  ('77777777-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'ACTIVE'),
  ('77777777-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'ACTIVE'),
  ('77777777-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'ACTIVE'),
  ('77777777-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'PENDING'),
  ('77777777-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'PENDING')
on conflict (retailer_id, wholesaler_id) do nothing;

-- Products (wholesaler catalogues) -------------------------------------------
--   3333… = products
insert into products (id, wholesaler_id, name, sku, category, unit, price, available_quantity, is_active) values
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Basmati Rice 5kg',        'MW-RICE-5',    'Grains',    'bag',    520.00, 400, true),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'Toor Dal 1kg',            'MW-DAL-1',     'Pulses',    'pack',   145.00, 600, true),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'Sunflower Oil 1L',        'MW-OIL-1',     'Oils',      'bottle', 160.00, 500, true),
  ('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 'Whole Wheat Atta 10kg',   'MW-ATTA-10',   'Grains',    'bag',    410.00, 300, true),
  ('33333333-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000002', 'Green Tea 100 bags',      'GL-TEA-100',   'Beverages', 'box',    280.00, 250, true),
  ('33333333-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000002', 'Organic Honey 500g',      'GL-HONEY-500', 'Spreads',   'jar',    325.00, 180, true),
  ('33333333-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000002', 'Almonds 250g',            'GL-ALM-250',   'Dry Fruits','pack',   299.00, 220, true),
  ('33333333-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000002', 'Rolled Oats 1kg',         'GL-OATS-1',    'Breakfast', 'pack',   199.00, 350, true),
  ('33333333-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000003', 'Kashmiri Saffron 1g',     'AP-SAF-1',     'Spices',    'box',    450.00,  80, true),
  ('33333333-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000003', 'Black Pepper 200g',       'AP-PEP-200',   'Spices',    'pack',   175.00, 300, true),
  ('33333333-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000003', 'Cardamom 100g',           'AP-CRD-100',   'Spices',    'pack',   310.00, 150, true),
  ('33333333-0000-0000-0000-000000000012', '22222222-0000-0000-0000-000000000001', 'Chana Dal 1kg',           'MW-CDAL-1',    'Pulses',    'pack',   110.00, 450, true)
on conflict (wholesaler_id, sku) do nothing;

-- Retailer inventory (FreshMart & Daily Needs) -------------------------------
insert into inventory (business_id, product_id, quantity) values
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 6),   -- low (threshold 10)
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', 42),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', 9),   -- low (threshold 12)
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000004', 25),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000005', 3),   -- critical low (threshold 8)
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000006', 18),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000007', 30),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000008', 14),
  ('11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 20),
  ('11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003', 4)   -- low
on conflict (business_id, product_id) do nothing;

-- Initial stock movements ----------------------------------------------------
insert into stock_movements (business_id, product_id, quantity_change, quantity_after, reason, note)
select business_id, product_id, quantity, quantity, 'INITIAL_STOCK', 'Seed stock initialization'
from inventory
where quantity > 0
on conflict do nothing;

-- Reorder rules --------------------------------------------------------------
insert into reorder_rules (retailer_id, product_id, min_stock, reorder_quantity, lead_time_days, is_active) values
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 10, 30, 3, true),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', 15, 40, 3, true),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', 12, 36, 2, true),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000004', 10, 25, 3, true),
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000005',  8, 20, 4, true),
  ('11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 15, 30, 2, true),
  ('11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003', 10, 25, 2, true)
on conflict (retailer_id, product_id) do nothing;

-- Simulated sales history: last 30 days for FreshMart --------------------------
insert into sales (retailer_id, product_id, quantity, unit_price, sold_at)
select
  i.business_id,
  i.product_id,
  q.qty,
  round(p.price * 1.15, 2) as unit_price,
  date_trunc('day', now()) - (d || ' days')::interval + interval '11 hours' as sold_at
from inventory i
join products p on p.id = i.product_id
cross join generate_series(1, 30) as d
cross join lateral (
  select ((d * 7 + ascii(right(p.sku, 1)) * 3) % 5) as qty
) q
where i.business_id = '11111111-0000-0000-0000-000000000001'
  and q.qty > 0
on conflict do nothing;

-- Sample Orders --------------------------------------------------------------
--   Order 1: DELIVERED from Metro to FreshMart
--   Order 2: DISPATCHED from GreenLeaf to FreshMart
--   Order 3: SUBMITTED from Metro to Daily Needs
--   Order 4: DRAFT for FreshMart
insert into orders (id, order_number, retailer_id, wholesaler_id, status, is_suggested, total_amount, notes, submitted_at, created_at, updated_at) values
  ('44444444-0000-0000-0000-000000000001', 1001, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'DELIVERED', false, 21400.00, 'Urgent stock refill', now() - interval '5 days', now() - interval '6 days', now() - interval '1 day'),
  ('44444444-0000-0000-0000-000000000002', 1002, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'DISPATCHED', true,  12100.00, 'Automated low stock suggestion', now() - interval '2 days', now() - interval '3 days', now() - interval '12 hours'),
  ('44444444-0000-0000-0000-000000000003', 1003, '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'SUBMITTED', false, 15600.00, 'Standard weekly restock', now() - interval '4 hours', now() - interval '6 hours', now() - interval '4 hours'),
  ('44444444-0000-0000-0000-000000000004', 1004, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'DRAFT',     true,   7800.00, 'System proposed replenishment draft', null, now() - interval '1 hour', now() - interval '1 hour')
on conflict (id) do nothing;

-- Order Items ----------------------------------------------------------------
insert into order_items (id, order_id, product_id, quantity, suggested_quantity, unit_price) values
  ('55555555-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 30, 30, 520.00),
  ('55555555-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', 40, 40, 145.00),
  ('55555555-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000005', 20, 20, 280.00),
  ('55555555-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000006', 20, 20, 325.00),
  ('55555555-0000-0000-0000-000000000005', '44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', 30, 20, 520.00),
  ('55555555-0000-0000-0000-000000000006', '44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000003', 25, 25, 160.00),
  ('55555555-0000-0000-0000-000000000007', '44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000004',  9, 10, 410.00)
on conflict (order_id, product_id) do nothing;

-- Notifications --------------------------------------------------------------
insert into notifications (id, business_id, type, title, message, related_order_id, related_product_id, is_read, created_at) values
  ('66666666-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'LOW_STOCK', 'Low Stock Alert: Green Tea 100 bags', 'Remaining stock (3 units) has breached minimum threshold (8 units). Reorder recommended.', null, '33333333-0000-0000-0000-000000000005', false, now() - interval '6 hours'),
  ('66666666-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'ORDER_DISPATCHED', 'Order #1002 Dispatched', 'GreenLeaf Traders has dispatched Order #1002. Estimated arrival in 2 days.', '44444444-0000-0000-0000-000000000002', null, true, now() - interval '12 hours'),
  ('66666666-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'ORDER_SUBMITTED', 'New Order #1003 Received', 'Daily Needs Store submitted Order #1003 for 30 units of Basmati Rice.', '44444444-0000-0000-0000-000000000003', null, false, now() - interval '4 hours'),
  ('66666666-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000002', 'CONNECTION_REQUEST', 'New Connection Request', 'Daily Needs Store requested a partnership connection.', null, null, false, now() - interval '1 day')
on conflict (id) do nothing;
