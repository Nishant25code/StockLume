-- ═══════════════════════════════════════════════════════════════════════════
-- StockLume · dbms/03_schema.sql
-- Final tables (11) with keys and constraints, for the DBMS submission.
--
-- Source of truth: supabase/migrations/20261116000000_initial_schema.sql
-- This file is that migration plus a tiny stub for Supabase's auth.users table,
-- so it also runs on a plain PostgreSQL 15+ database:
--     createdb stocklume && psql -d stocklume -f dbms/03_schema.sql
-- On Supabase the stub is skipped (auth.users already exists).
-- ═══════════════════════════════════════════════════════════════════════════

-- Supabase Auth owns auth.users; profiles.id references it (1:1).
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid()
);

-- Note: gen_random_uuid() is built into PostgreSQL 13+ (Supabase uses 15+),
-- so no extension is needed for UUID primary keys.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Enum types (fixed lists of allowed values)
-- ───────────────────────────────────────────────────────────────────────────

create type business_type as enum ('RETAILER', 'WHOLESALER');

create type connection_status as enum ('PENDING', 'ACTIVE', 'INACTIVE');

-- Order lifecycle: DRAFT → SUBMITTED → ACCEPTED → DISPATCHED → DELIVERED
-- Side exits: REJECTED (by wholesaler, from SUBMITTED)
--             CANCELLED (by retailer, from DRAFT or SUBMITTED)
create type order_status as enum (
  'DRAFT',
  'SUBMITTED',
  'ACCEPTED',
  'REJECTED',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED'
);

create type stock_movement_reason as enum (
  'INITIAL_STOCK',      -- first stock entry for a product
  'SALE',               -- retailer sold items (negative change)
  'ORDER_DISPATCHED',   -- wholesaler shipped an order (negative change)
  'ORDER_DELIVERED',    -- retailer received an order (positive change)
  'MANUAL_ADJUSTMENT'   -- stock count correction, damage, etc.
);

create type notification_type as enum (
  'LOW_STOCK',
  'CONNECTION_REQUEST',
  'CONNECTION_ACCEPTED',
  'ORDER_SUBMITTED',
  'ORDER_ACCEPTED',
  'ORDER_REJECTED',
  'ORDER_DISPATCHED',
  'ORDER_DELIVERED',
  'ORDER_CANCELLED'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Helper: keep updated_at current on every UPDATE
-- ───────────────────────────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. businesses — retailer and wholesaler organisations
-- ───────────────────────────────────────────────────────────────────────────

create table businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  type        business_type not null,
  email       text,
  phone       text,
  address     text,
  city        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. profiles — app users, 1:1 with Supabase Auth users (auth.users)
--    The user's role comes from their business: businesses.type
-- ───────────────────────────────────────────────────────────────────────────

create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  business_id  uuid not null references businesses (id) on delete cascade,
  full_name    text not null,
  email        text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. business_connections — which retailer buys from which wholesaler
--    The API must check that retailer_id is a RETAILER and wholesaler_id is a
--    WHOLESALER before inserting (Member 1).
-- ───────────────────────────────────────────────────────────────────────────

create table business_connections (
  id            uuid primary key default gen_random_uuid(),
  retailer_id   uuid not null references businesses (id) on delete cascade,
  wholesaler_id uuid not null references businesses (id) on delete cascade,
  status        connection_status not null default 'ACTIVE',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint business_connections_unique_pair unique (retailer_id, wholesaler_id),
  constraint business_connections_not_self check (retailer_id <> wholesaler_id)
);

-- ───────────────────────────────────────────────────────────────────────────
-- 6. products — a wholesaler's catalogue, price and available stock
--    available_quantity is the WHOLESALER's own stock.
-- ───────────────────────────────────────────────────────────────────────────

create table products (
  id                  uuid primary key default gen_random_uuid(),
  wholesaler_id       uuid not null references businesses (id) on delete cascade,
  name                text not null check (length(trim(name)) > 0),
  sku                 text not null,
  category            text,
  unit                text not null default 'pcs',
  price               numeric(12, 2) not null check (price >= 0),
  available_quantity  integer not null default 0 check (available_quantity >= 0),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint products_unique_sku_per_wholesaler unique (wholesaler_id, sku)
);

-- ───────────────────────────────────────────────────────────────────────────
-- 7. inventory — current stock a RETAILER holds of a product
--    One row per (retailer, product). Never negative.
-- ───────────────────────────────────────────────────────────────────────────

create table inventory (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses (id) on delete cascade,
  product_id   uuid not null references products (id) on delete cascade,
  quantity     integer not null default 0 check (quantity >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint inventory_unique_product_per_business unique (business_id, product_id)
);

-- ───────────────────────────────────────────────────────────────────────────
-- 8. sales — retailer sales history (input for stockout prediction)
-- ───────────────────────────────────────────────────────────────────────────

create table sales (
  id           uuid primary key default gen_random_uuid(),
  retailer_id  uuid not null references businesses (id) on delete cascade,
  product_id   uuid not null references products (id) on delete cascade,
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(12, 2) not null check (unit_price >= 0),
  sold_at      timestamptz not null default now(),
  created_by   uuid references profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 9. reorder_rules — per-product stock threshold & replenishment settings
-- ───────────────────────────────────────────────────────────────────────────

create table reorder_rules (
  id                uuid primary key default gen_random_uuid(),
  retailer_id       uuid not null references businesses (id) on delete cascade,
  product_id        uuid not null references products (id) on delete cascade,
  min_stock         integer not null default 10 check (min_stock >= 0),   -- alert threshold
  reorder_quantity  integer not null default 20 check (reorder_quantity > 0), -- default order size
  lead_time_days    integer not null default 3 check (lead_time_days between 1 and 60),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint reorder_rules_unique_product_per_retailer unique (retailer_id, product_id)
);

-- ───────────────────────────────────────────────────────────────────────────
-- 10. orders — purchase orders from ONE retailer to ONE wholesaler
--
--  KEY BUSINESS RULE: a DRAFT order (including a system suggestion) is private
--  to the retailer. Wholesalers must never see or be notified about an order
--  until the retailer explicitly submits it (status = SUBMITTED, submitted_at set).
-- ───────────────────────────────────────────────────────────────────────────

create table orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      bigint generated always as identity unique, -- human-friendly #1001-style id
  retailer_id       uuid not null references businesses (id) on delete cascade,
  wholesaler_id     uuid not null references businesses (id) on delete cascade,
  status            order_status not null default 'DRAFT',
  is_suggested      boolean not null default false, -- true when StockLume generated the draft
  notes             text,
  rejection_reason  text,
  total_amount      numeric(12, 2) not null default 0 check (total_amount >= 0),
  created_by        uuid references profiles (id) on delete set null,
  submitted_at      timestamptz,
  accepted_at       timestamptz,
  rejected_at       timestamptz,
  dispatched_at     timestamptz,
  delivered_at      timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint orders_not_self check (retailer_id <> wholesaler_id),
  -- Any status that the wholesaler can see must have been submitted first.
  constraint orders_submitted_before_wholesaler_sees check (
    status in ('DRAFT', 'CANCELLED') or submitted_at is not null
  )
);

-- ───────────────────────────────────────────────────────────────────────────
-- 11. order_items — products and quantities inside an order
--     unit_price is copied from products.price when the item is added, so
--     later price changes do not alter old orders.
-- ───────────────────────────────────────────────────────────────────────────

create table order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references orders (id) on delete cascade,
  product_id          uuid not null references products (id) on delete restrict,
  quantity            integer not null check (quantity > 0),
  suggested_quantity  integer check (suggested_quantity is null or suggested_quantity >= 0),
  unit_price          numeric(12, 2) not null check (unit_price >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint order_items_unique_product_per_order unique (order_id, product_id)
);

-- ───────────────────────────────────────────────────────────────────────────
-- 12. notifications — alerts for a business (low stock, order updates)
-- ───────────────────────────────────────────────────────────────────────────

create table notifications (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses (id) on delete cascade, -- recipient
  type                notification_type not null,
  title               text not null,
  message             text not null,
  related_order_id    uuid references orders (id) on delete cascade,
  related_product_id  uuid references products (id) on delete cascade,
  is_read             boolean not null default false,
  created_at          timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 13. stock_movements — append-only history of every stock change
--     Retailer rows track inventory.quantity; wholesaler rows track
--     products.available_quantity. Never UPDATE or DELETE rows here.
-- ───────────────────────────────────────────────────────────────────────────

create table stock_movements (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses (id) on delete cascade,
  product_id       uuid not null references products (id) on delete cascade,
  quantity_change  integer not null check (quantity_change <> 0), -- + in, - out
  quantity_after   integer not null check (quantity_after >= 0),
  reason           stock_movement_reason not null,
  sale_id          uuid references sales (id) on delete set null,
  order_id         uuid references orders (id) on delete set null,
  note             text,
  created_by       uuid references profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 14. Indexes for the most common lookups (foreign keys + filters)
-- ───────────────────────────────────────────────────────────────────────────

create index profiles_business_id_idx            on profiles (business_id);
create index business_connections_wholesaler_idx on business_connections (wholesaler_id);
create index products_wholesaler_id_idx          on products (wholesaler_id);
create index inventory_product_id_idx            on inventory (product_id);
create index sales_retailer_product_sold_at_idx  on sales (retailer_id, product_id, sold_at desc);
create index reorder_rules_product_id_idx        on reorder_rules (product_id);
create index orders_retailer_status_idx          on orders (retailer_id, status);
create index orders_wholesaler_status_idx        on orders (wholesaler_id, status);
create index order_items_product_id_idx          on order_items (product_id);
create index notifications_business_unread_idx   on notifications (business_id, is_read, created_at desc);
create index stock_movements_business_product_idx on stock_movements (business_id, product_id, created_at desc);

-- ───────────────────────────────────────────────────────────────────────────
-- 15. updated_at triggers
-- ───────────────────────────────────────────────────────────────────────────

create trigger businesses_set_updated_at           before update on businesses           for each row execute function set_updated_at();
create trigger profiles_set_updated_at             before update on profiles             for each row execute function set_updated_at();
create trigger business_connections_set_updated_at before update on business_connections for each row execute function set_updated_at();
create trigger products_set_updated_at             before update on products             for each row execute function set_updated_at();
create trigger inventory_set_updated_at            before update on inventory            for each row execute function set_updated_at();
create trigger reorder_rules_set_updated_at        before update on reorder_rules        for each row execute function set_updated_at();
create trigger orders_set_updated_at               before update on orders               for each row execute function set_updated_at();
create trigger order_items_set_updated_at          before update on order_items          for each row execute function set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- 16. Row Level Security
--  All data access goes through the Express API, which connects with the
--  database owner role (bypasses RLS) and enforces permissions in code.
--  Enabling RLS with NO policies blocks direct access through Supabase's
--  public REST API using the anon key — so the browser can never read tables
--  directly. Do not add permissive policies without discussing with the team.
-- ───────────────────────────────────────────────────────────────────────────

alter table businesses           enable row level security;
alter table profiles             enable row level security;
alter table business_connections enable row level security;
alter table products             enable row level security;
alter table inventory            enable row level security;
alter table sales                enable row level security;
alter table reorder_rules        enable row level security;
alter table orders               enable row level security;
alter table order_items          enable row level security;
alter table notifications        enable row level security;
alter table stock_movements      enable row level security;
