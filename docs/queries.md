# StockLume — SQL Viva Reference & Query Guide

This guide is a comprehensive, viva-ready reference for the PostgreSQL relational database powering **StockLume**. Every query uses the project's real production schema, table names, and column definitions.

---

## Table of Contents

1. [Schema Overview & Foreign Key Hierarchy](#1-schema-overview--foreign-key-hierarchy)
2. [Basic & Intermediate Joins](#2-basic--intermediate-joins)
   - 2.1 INNER JOIN: Products with Wholesaler Details
   - 2.2 LEFT JOIN: Retailer Inventory with Reorder Rules
   - 2.3 Multi-Table Joins: Inventory with Product and Wholesaler Info
   - 2.4 Active Retailer-Wholesaler Connections
3. [Aggregations & Analytics](#3-aggregations--analytics)
   - 3.1 GROUP BY & Aggregate Functions: Sales Summaries per Product
   - 3.2 GROUP BY & HAVING: High-Volume Sales Outlets
   - 3.3 Daily & Monthly Time-Series Aggregation
   - 3.4 Orders and Order-Item Line Summaries
4. [Replenishment & Alert Logic](#4-replenishment--alert-logic)
   - 4.1 Low-Stock Products Detection
   - 4.2 Reorder Rules Overview
   - 4.3 Notifications by Unread Status
5. [Audit & Chronological Ledgers](#5-audit--chronological-ledgers)
   - 5.1 Stock Movement History with User & Order Provenance
6. [Subqueries & Complex Conditions](#6-subqueries--complex-conditions)
   - 6.1 Subquery with NOT EXISTS: Discovering Unconnected Partners
   - 6.2 Correlated Subquery: Authorization Verification for Product Access
7. [DML: INSERT, UPDATE, and UPSERT](#7-dml-insert-update-and-upsert)
   - 7.1 INSERT with SELECT: Safe Connection Request
   - 7.2 Atomic Conditional UPDATE: Safe Stock Adjustment
   - 7.3 UPSERT with ON CONFLICT: Reorder Rule Creation & Update
8. [Filtering, Sorting, and Window Pagination](#8-filtering-sorting-and-window-pagination)
   - 8.1 Paginated Catalogue Query with `count(*) OVER ()`

---

## 1. Schema Overview & Foreign Key Hierarchy

StockLume models a B2B replenishment platform with 11 relational tables:

- `businesses`: Either a `RETAILER` or `WHOLESALER`.
- `profiles`: 1:1 link to Supabase Auth users, mapped to a `businesses(id)`.
- `business_connections`: Validated pairing between a retailer and wholesaler (`PENDING`, `ACTIVE`, `INACTIVE`).
- `products`: Wholesaler catalogue with prices, units, and available warehouse stock.
- `inventory`: On-hand stock held in a retailer's retail store.
- `reorder_rules`: Automated replenishment parameters (`min_stock`, `reorder_quantity`, `lead_time_days`).
- `sales`: Retail store customer sales history.
- `orders` & `order_items`: Purchase orders between a retailer and wholesaler.
- `stock_movements`: Append-only audit log tracking every inventory increase or reduction.
- `notifications`: Alerts for low stock, orders, and partnership requests.

---

## 2. Basic & Intermediate Joins

### 2.1 INNER JOIN: Products with Wholesaler Details
**Purpose:** Fetch all active products alongside their supplier's business name and contact information.

```sql
SELECT p.id AS product_id,
       p.name AS product_name,
       p.sku,
       p.category,
       p.price,
       p.available_quantity,
       w.id AS wholesaler_id,
       w.name AS wholesaler_name,
       w.city AS wholesaler_city
FROM products p
INNER JOIN businesses w ON w.id = p.wholesaler_id
WHERE p.is_active = true
ORDER BY p.name ASC;
```

- **Why INNER JOIN?** Every product in `products` is strictly required by foreign key constraint (`wholesaler_id references businesses (id)`) to belong to an existing wholesaler. An `INNER JOIN` ensures rows without valid business records are omitted.
- **Viva Concept:** Foreign key reference integrity. Shows how normalized entities maintain clean boundaries without duplicating business names in the product catalogue.

---

### 2.2 LEFT JOIN: Retailer Inventory with Reorder Rules
**Purpose:** Fetch all stocked items for a retailer, including their custom reorder rules if configured, or default threshold values if no custom rule exists.

```sql
SELECT i.id AS inventory_id,
       i.product_id,
       i.quantity AS current_stock,
       coalesce(r.min_stock, 10) AS alert_threshold,
       coalesce(r.reorder_quantity, 20) AS suggested_order_qty,
       coalesce(r.lead_time_days, 3) AS lead_time_days
FROM inventory i
LEFT JOIN reorder_rules r ON r.retailer_id = i.business_id
                         AND r.product_id  = i.product_id
                         AND r.is_active   = true
WHERE i.business_id = '11111111-0000-0000-0000-000000000001'
ORDER BY i.quantity ASC;
```

- **Why LEFT JOIN?** A retailer may hold stock of a product without having explicitly customized a reorder rule. An `INNER JOIN` would exclude products lacking configured rules. A `LEFT JOIN` retains all inventory rows, allowing `COALESCE` to inject system defaults (10 units min stock, 20 units reorder).
- **Viva Concept:** Preserving left-table cardinality when right-table child records are optional.

---

### 2.3 Multi-Table Joins: Inventory with Product and Wholesaler Info
**Purpose:** Retrieve a retailer's inventory enriched with product names, category, SKU, wholesale pricing, and supplier identity.

```sql
SELECT i.id AS inventory_id,
       i.quantity AS store_stock,
       p.name AS product_name,
       p.sku,
       p.unit,
       p.price AS wholesale_unit_price,
       w.name AS wholesaler_name,
       coalesce(r.min_stock, 10) AS min_stock
FROM inventory i
JOIN products p ON p.id = i.product_id
JOIN businesses w ON w.id = p.wholesaler_id
LEFT JOIN reorder_rules r ON r.retailer_id = i.business_id
                         AND r.product_id  = i.product_id
                         AND r.is_active   = true
WHERE i.business_id = '11111111-0000-0000-0000-000000000001'
ORDER BY p.name;
```

- **Why Multi-Table Join?** Retailer inventory points to `products`, which in turn points to `businesses` (the supplier). Navigating this two-hop foreign key chain (`inventory -> products -> businesses`) brings supplier context to retailer stock records.
- **Viva Concept:** Normalized schema traversal across three levels of entity relationships.

---

### 2.4 Active Retailer-Wholesaler Connections
**Purpose:** List all active suppliers connected to a retailer, including partner details and connection date.

```sql
SELECT c.id AS connection_id,
       c.status,
       c.created_at AS connected_since,
       w.id AS wholesaler_id,
       w.name AS wholesaler_name,
       w.city,
       w.phone,
       w.email
FROM business_connections c
JOIN businesses w ON w.id = c.wholesaler_id
WHERE c.retailer_id = '11111111-0000-0000-0000-000000000001'
  AND c.status = 'ACTIVE'
ORDER BY w.name;
```

- **Why Join?** `business_connections` acts as an associative junction table resolving the many-to-many relationship between retailers and wholesalers.

---

## 3. Aggregations & Analytics

### 3.1 GROUP BY & Aggregate Functions: Sales Summaries per Product
**Purpose:** Calculate total units sold, gross sales revenue, and average transaction quantity per product.

```sql
SELECT p.id AS product_id,
       p.name AS product_name,
       p.sku,
       count(s.id) AS transaction_count,
       sum(s.quantity) AS total_units_sold,
       round(sum(s.quantity * s.unit_price), 2) AS total_revenue,
       round(avg(s.quantity), 1) AS avg_units_per_sale
FROM sales s
JOIN products p ON p.id = s.product_id
WHERE s.retailer_id = '11111111-0000-0000-0000-000000000001'
GROUP BY p.id, p.name, p.sku
ORDER BY total_revenue DESC;
```

- **Viva Concept:** The `GROUP BY` clause groups non-aggregated projection columns (`p.id, p.name, p.sku`), allowing aggregate mathematical functions (`COUNT`, `SUM`, `AVG`, `ROUND`) to compute values per group.

---

### 3.2 GROUP BY & HAVING: High-Volume Sales Outlets
**Purpose:** Identify products where total sales volume exceeds 50 units.

```sql
SELECT p.name AS product_name,
       sum(s.quantity) AS units_sold,
       round(sum(s.quantity * s.unit_price), 2) AS gross_revenue
FROM sales s
JOIN products p ON p.id = s.product_id
WHERE s.sold_at >= now() - interval '30 days'
GROUP BY p.id, p.name
HAVING sum(s.quantity) >= 50
ORDER BY units_sold DESC;
```

- **Difference between WHERE and HAVING:** `WHERE` filters rows *before* aggregation occurs (e.g. `s.sold_at >= now() - interval '30 days'`). `HAVING` filters groups *after* aggregation has completed (e.g. `sum(s.quantity) >= 50`).

---

### 3.3 Daily & Monthly Time-Series Aggregation
**Purpose:** Group store sales revenue and volume by calendar day.

```sql
SELECT date_trunc('day', s.sold_at)::date AS sales_date,
       count(s.id) AS daily_transactions,
       sum(s.quantity) AS total_units,
       round(sum(s.quantity * s.unit_price), 2) AS daily_revenue
FROM sales s
WHERE s.retailer_id = '11111111-0000-0000-0000-000000000001'
  AND s.sold_at >= now() - interval '14 days'
GROUP BY date_trunc('day', s.sold_at)::date
ORDER BY sales_date DESC;
```

- **Viva Concept:** `date_trunc('day', timestamp)` truncates timestamps to midnight boundaries for clean daily grouping.

---

### 3.4 Orders and Order-Item Line Summaries
**Purpose:** Summarize purchase order lines, item counts, and calculated totals.

```sql
SELECT o.id AS order_id,
       o.order_number,
       o.status,
       o.created_at,
       w.name AS wholesaler_name,
       count(oi.id) AS line_items_count,
       sum(oi.quantity) AS total_units_ordered,
       round(sum(oi.quantity * oi.unit_price), 2) AS computed_total,
       o.total_amount AS recorded_total
FROM orders o
JOIN businesses w ON w.id = o.wholesaler_id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.retailer_id = '11111111-0000-0000-0000-000000000001'
GROUP BY o.id, o.order_number, o.status, o.created_at, w.name, o.total_amount
ORDER BY o.created_at DESC;
```

- **Viva Concept:** Price snapshot verification: verifies that `order_items.unit_price * quantity` aggregates correctly to `orders.total_amount`.

---

## 4. Replenishment & Alert Logic

### 4.1 Low-Stock Products Detection
**Purpose:** Identify retailer inventory items where current stock has reached or fallen below the safety threshold.

```sql
SELECT i.id AS inventory_id,
       p.name AS product_name,
       p.sku,
       i.quantity AS current_stock,
       coalesce(r.min_stock, 10) AS safety_threshold,
       coalesce(r.reorder_quantity, 20) AS suggested_order_qty,
       w.name AS supplier_name,
       CASE
         WHEN i.quantity = 0 THEN 'OUT_OF_STOCK'
         WHEN i.quantity <= coalesce(r.min_stock, 10) / 2 THEN 'CRITICAL'
         ELSE 'LOW'
       END AS risk_severity
FROM inventory i
JOIN products p ON p.id = i.product_id
JOIN businesses w ON w.id = p.wholesaler_id
LEFT JOIN reorder_rules r ON r.retailer_id = i.business_id
                         AND r.product_id  = i.product_id
                         AND r.is_active   = true
WHERE i.business_id = '11111111-0000-0000-0000-000000000001'
  AND i.quantity <= coalesce(r.min_stock, 10)
ORDER BY i.quantity ASC;
```

- **Viva Concept:** SQL conditional logic (`CASE WHEN ... THEN ... ELSE ... END`) to classify items into operational risk tiers.

---

### 4.2 Reorder Rules Overview
**Purpose:** Fetch all active reorder rules with product details.

```sql
SELECT r.id AS rule_id,
       p.id AS product_id,
       p.name AS product_name,
       p.sku,
       r.min_stock,
       r.reorder_quantity,
       r.lead_time_days,
       r.updated_at
FROM reorder_rules r
JOIN products p ON p.id = r.product_id
WHERE r.retailer_id = '11111111-0000-0000-0000-000000000001'
  AND r.is_active = true
ORDER BY p.name ASC;
```

---

### 4.3 Notifications by Unread Status
**Purpose:** Retrieve unread notifications for a business, newest first.

```sql
SELECT n.id,
       n.type,
       n.title,
       n.message,
       n.related_order_id,
       n.related_product_id,
       n.created_at
FROM notifications n
WHERE n.business_id = '11111111-0000-0000-0000-000000000001'
  AND n.is_read = false
ORDER BY n.created_at DESC
LIMIT 10;
```

---

## 5. Audit & Chronological Ledgers

### 5.1 Stock Movement History with User & Order Provenance
**Purpose:** Query the append-only stock movement log for auditability.

```sql
SELECT m.id AS movement_id,
       m.created_at,
       m.reason,
       m.quantity_change,
       m.quantity_after,
       m.note,
       p.name AS product_name,
       p.sku,
       o.order_number,
       pr.full_name AS operator_name
FROM stock_movements m
JOIN products p ON p.id = m.product_id
LEFT JOIN orders o ON o.id = m.order_id
LEFT JOIN profiles pr ON pr.id = m.created_by
WHERE m.business_id = '11111111-0000-0000-0000-000000000001'
ORDER BY m.created_at DESC
LIMIT 20;
```

- **Why LEFT JOIN on orders and profiles?** An inventory movement may be triggered by a manual recount (`MANUAL_ADJUSTMENT`) without an associated order, or automated script without a specific user profile ID. `LEFT JOIN` guarantees that movements are never omitted if order or profile links are null.

---

## 6. Subqueries & Complex Conditions

### 6.1 Subquery with NOT EXISTS: Discovering Unconnected Partners
**Purpose:** Find all wholesale suppliers in the system that a retailer has not yet connected with.

```sql
SELECT b.id AS wholesaler_id,
       b.name AS wholesaler_name,
       b.city,
       b.phone,
       b.email
FROM businesses b
WHERE b.type = 'WHOLESALER'
  AND b.id <> '11111111-0000-0000-0000-000000000001'
  AND NOT EXISTS (
    SELECT 1
    FROM business_connections c
    WHERE c.retailer_id = '11111111-0000-0000-0000-000000000001'
      AND c.wholesaler_id = b.id
  )
ORDER BY b.name ASC;
```

- **Why NOT EXISTS instead of NOT IN?** In standard SQL, if the inner query of `NOT IN (...)` yields a single `NULL` value, the entire predicate evaluates to `UNKNOWN` (falsy), incorrectly returning zero rows. `NOT EXISTS` uses boolean existential quantification and handles nulls safely and performantly.

---

### 6.2 Correlated Subquery: Authorization Verification for Product Access
**Purpose:** Verify if a requesting retailer has an active partnership before allowing access to product details.

```sql
SELECT p.id,
       p.name,
       p.price,
       p.available_quantity,
       p.wholesaler_id
FROM products p
WHERE p.id = '33333333-0000-0000-0000-000000000001'
  AND (
    p.wholesaler_id = '11111111-0000-0000-0000-000000000001'
    OR EXISTS (
      SELECT 1
      FROM business_connections c
      WHERE c.retailer_id = '11111111-0000-0000-0000-000000000001'
        AND c.wholesaler_id = p.wholesaler_id
        AND c.status = 'ACTIVE'
    )
  );
```

- **Viva Concept:** Row-level security enforcement at the SQL query layer to prevent multi-tenant data leaks.

---

## 7. DML: INSERT, UPDATE, and UPSERT

### 7.1 INSERT with SELECT: Safe Connection Request
**Purpose:** Create a connection record only if the target business is confirmed to be a wholesaler.

```sql
INSERT INTO business_connections (retailer_id, wholesaler_id, status)
SELECT '11111111-0000-0000-0000-000000000001',
       b.id,
       'ACTIVE'
FROM businesses b
WHERE b.id = '22222222-0000-0000-0000-000000000001'
  AND b.type = 'WHOLESALER'
RETURNING id, retailer_id, wholesaler_id, status;
```

---

### 7.2 Atomic Conditional UPDATE: Safe Stock Adjustment
**Purpose:** Adjust inventory quantity while preventing negative stock in a single atomic database statement.

```sql
UPDATE inventory
SET quantity = quantity + (-2),
    updated_at = now()
WHERE id = 'inventory-uuid-here'
  AND business_id = '11111111-0000-0000-0000-000000000001'
  AND quantity + (-2) >= 0
RETURNING id, product_id, quantity;
```

- **Viva Concept:** Atomic concurrency protection. By including `AND quantity + $change >= 0` in the `WHERE` clause, the database row is locked and updated atomically without race conditions or dirty reads. If stock is insufficient, 0 rows are updated.

---

### 7.3 UPSERT with ON CONFLICT: Reorder Rule Creation & Update
**Purpose:** Insert a new reorder rule, or update the existing rule if one is already present for that retailer and product.

```sql
INSERT INTO reorder_rules (retailer_id, product_id, min_stock, reorder_quantity, lead_time_days, is_active)
VALUES ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 15, 30, 2, true)
ON CONFLICT (retailer_id, product_id) DO UPDATE
SET min_stock        = excluded.min_stock,
    reorder_quantity = excluded.reorder_quantity,
    lead_time_days   = excluded.lead_time_days,
    is_active        = true,
    updated_at       = now()
RETURNING id, min_stock, reorder_quantity, lead_time_days, is_active;
```

- **Viva Concept:** `UPSERT` using PostgreSQL's `ON CONFLICT (constraint_target) DO UPDATE`. The special pseudo-table `EXCLUDED` represents the row proposed for insertion.

---

## 8. Filtering, Sorting, and Window Pagination

### 8.1 Paginated Catalogue Query with `count(*) OVER ()`
**Purpose:** Fetch a paginated slice of catalogue records along with the total count across all pages in a single query execution.

```sql
SELECT p.id,
       p.name,
       p.sku,
       p.category,
       p.unit,
       p.price,
       p.available_quantity,
       w.id AS wholesaler_id,
       w.name AS wholesaler_name,
       count(*) OVER () AS total
FROM products p
JOIN business_connections c ON c.wholesaler_id = p.wholesaler_id
                           AND c.retailer_id   = '11111111-0000-0000-0000-000000000001'
                           AND c.status        = 'ACTIVE'
JOIN businesses w           ON w.id = p.wholesaler_id
WHERE p.is_active = true
  AND ('Wholesale Co' IS NULL OR w.name ILIKE '%Wholesale Co%')
ORDER BY p.name ASC
LIMIT 10 OFFSET 0;
```

- **Why Window Function `count(*) OVER ()`?** Traditional pagination requires two separate round trips to the database: one `SELECT count(*)` query to determine total items, and a second `SELECT ... LIMIT ... OFFSET ...` query to fetch records. The window function `count(*) OVER ()` computes the total matching partition size in the same single database scan, reducing latency by half.
