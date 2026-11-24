-- ═══════════════════════════════════════════════════════════════════════════
-- StockLume — Migration: 20261124000000_add_performance_indexes.sql
-- Adds query performance indexes for Section 3 workflows:
--   - Active business connection lookups (R7, R8, Connections discover/list)
--   - Product catalogue active searches & ordering (R6, R7)
--   - Business-wide stock movement timeline (R10)
--   - Reorder rules lookup for inventory (R9, R11)
--   - Order lookup & history timeline (R13, R14)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Accelerates active retailer-wholesaler relationship checks in product browsing
create index if not exists business_connections_retailer_status_idx
  on business_connections (retailer_id, status);

-- 2. Accelerates wholesaler catalogue filtering by active state
create index if not exists products_wholesaler_active_idx
  on products (wholesaler_id, is_active);

-- 3. Accelerates search and alphabetic sorting of active products across connected suppliers
create index if not exists products_active_name_idx
  on products (is_active, name);

-- 4. Enables index scan for recent stock movement history across all products for a business
create index if not exists stock_movements_business_created_at_idx
  on stock_movements (business_id, created_at desc);

-- 5. Speeds up inventory replenishment join for active reorder rules
create index if not exists reorder_rules_retailer_active_idx
  on reorder_rules (retailer_id, is_active);

-- 6. Accelerates order timeline listing by created_at desc for both retailer and wholesaler
create index if not exists orders_retailer_created_at_idx
  on orders (retailer_id, created_at desc);

create index if not exists orders_wholesaler_created_at_idx
  on orders (wholesaler_id, created_at desc);
