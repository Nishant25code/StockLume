# 01 — Normalization of StockLume's data

This document shows how StockLume's data goes from one messy spreadsheet to the normalized PostgreSQL schema in
[`supabase/migrations/20261116000000_initial_schema.sql`](../supabase/migrations/20261116000000_initial_schema.sql),
step by step through **1NF → 2NF → 3NF → BCNF**.

Businesses, products, SKUs and prices come from [`supabase/seed.sql`](../supabase/seed.sql). The orders (#1001–1003) are
example orders made up for this walkthrough. Short IDs like `R1`, `W1` and `P1` stand in for UUIDs to keep the tables readable.

---

## 0. Starting point: unnormalized data (UNF)

Before StockLume, a retailer like *FreshMart Kirana* might track purchase orders in a single spreadsheet:

| order_no | order_date | retailer | retailer_city | wholesaler | wholesaler_city | items | status |
|---|---|---|---|---|---|---|---|
| 1001 | 2026-11-16 | FreshMart Kirana | Sonipat | Metro Wholesale Co | Delhi | Basmati Rice 5kg × 30 @ 520, Sunflower Oil 1L × 36 @ 160 | SUBMITTED |
| 1002 | 2026-11-17 | FreshMart Kirana | Sonipat | GreenLeaf Traders | Gurugram | Green Tea 100 bags × 20 @ 280 | DRAFT |
| 1003 | 2026-11-17 | Daily Needs Store | Delhi | Metro Wholesale Co | Delhi | Sunflower Oil 1L × 12 @ 160 | ACCEPTED |

**Problems**

- `items` is a **repeating group**: several products, quantities and prices packed into one cell. You cannot query "how much Sunflower Oil was ordered?" without parsing text.
- The same facts (FreshMart is in Sonipat, Metro is in Delhi) are typed again on every row.

---

## 1. First Normal Form (1NF)

> **Rule:** every column holds a single atomic value, there are no repeating groups, and each row is identified by a key.

We split each order item into its own row and give products an ID:

**OrderSheet_1NF**

| order_no | product_id | order_date | retailer_id | retailer_name | retailer_city | wholesaler_id | wholesaler_name | wholesaler_city | product_name | category | list_price | quantity | unit_price | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1001 | P1 | 2026-11-16 | R1 | FreshMart Kirana | Sonipat | W1 | Metro Wholesale Co | Delhi | Basmati Rice 5kg | Grains | 520 | 30 | 520 | SUBMITTED |
| 1001 | P3 | 2026-11-16 | R1 | FreshMart Kirana | Sonipat | W1 | Metro Wholesale Co | Delhi | Sunflower Oil 1L | Oils | 160 | 36 | 160 | SUBMITTED |
| 1002 | P5 | 2026-11-17 | R1 | FreshMart Kirana | Sonipat | W2 | GreenLeaf Traders | Gurugram | Green Tea 100 bags | Beverages | 280 | 20 | 280 | DRAFT |
| 1003 | P3 | 2026-11-17 | R2 | Daily Needs Store | Delhi | W1 | Metro Wholesale Co | Delhi | Sunflower Oil 1L | Oils | 160 | 12 | 160 | ACCEPTED |

**Primary key:** `(order_no, product_id)`. One order cannot list the same product twice; in the real schema this is
`unique (order_id, product_id)` on `order_items`.

The table is now in 1NF, but it still has **anomalies**:

| Anomaly | Example |
|---|---|
| **Update** | Metro raises the price of Sunflower Oil, and `list_price` must be changed on every row that mentions it. Miss one and the data is inconsistent. |
| **Insert** | A wholesaler cannot add a new product to its catalogue until somebody orders it, because `order_no` is part of the key. |
| **Delete** | Deleting order 1002 also deletes the only record that GreenLeaf Traders sells Green Tea. |
| **Redundancy** | "FreshMart Kirana, Sonipat" is stored on every item of every FreshMart order. |

### Functional dependencies (FDs)

| # | Functional dependency | Meaning |
|---|---|---|
| FD1 | `order_no → order_date, status, retailer_id, wholesaler_id` | An order has one date, one status, one buyer and one seller |
| FD2 | `product_id → product_name, category, list_price, wholesaler_id` | A product belongs to exactly one wholesaler's catalogue |
| FD3 | `retailer_id → retailer_name, retailer_city` | Facts about the retailer |
| FD4 | `wholesaler_id → wholesaler_name, wholesaler_city` | Facts about the wholesaler |
| FD5 | `(order_no, product_id) → quantity, unit_price` | How much of this product is in this order, and at what price |

`unit_price` depends on the **whole key** and not on `product_id` alone. It is the price agreed **when the order was placed**.
`list_price` is today's catalogue price and can change later, so the two are different facts.

---

## 2. Second Normal Form (2NF)

> **Rule:** the table is in 1NF, and no non-key column depends on only **part** of a composite key (no partial dependencies).

The key is `(order_no, product_id)`, but:

- FD1: order details depend on `order_no` alone, which is a **partial dependency**.
- FD2: product details depend on `product_id` alone, which is also a **partial dependency**.

We decompose by moving each partial dependency into its own table:

**Orders_2NF** (key `order_no`)

| order_no | order_date | status | retailer_id | retailer_name | retailer_city | wholesaler_id | wholesaler_name | wholesaler_city |
|---|---|---|---|---|---|---|---|---|
| 1001 | 2026-11-16 | SUBMITTED | R1 | FreshMart Kirana | Sonipat | W1 | Metro Wholesale Co | Delhi |
| 1002 | 2026-11-17 | DRAFT | R1 | FreshMart Kirana | Sonipat | W2 | GreenLeaf Traders | Gurugram |
| 1003 | 2026-11-17 | ACCEPTED | R2 | Daily Needs Store | Delhi | W1 | Metro Wholesale Co | Delhi |

**Products_2NF** (key `product_id`)

| product_id | product_name | category | list_price | wholesaler_id | wholesaler_name | wholesaler_city |
|---|---|---|---|---|---|---|
| P1 | Basmati Rice 5kg | Grains | 520 | W1 | Metro Wholesale Co | Delhi |
| P3 | Sunflower Oil 1L | Oils | 160 | W1 | Metro Wholesale Co | Delhi |
| P5 | Green Tea 100 bags | Beverages | 280 | W2 | GreenLeaf Traders | Gurugram |

**OrderItems_2NF** (key `(order_no, product_id)`)

| order_no | product_id | quantity | unit_price |
|---|---|---|---|
| 1001 | P1 | 30 | 520 |
| 1001 | P3 | 36 | 160 |
| 1002 | P5 | 20 | 280 |
| 1003 | P3 | 12 | 160 |

Fixed: a product's price is stored once (update anomaly), products can exist without orders (insert anomaly), and deleting an
order keeps the catalogue (delete anomaly).

Still wrong: "Metro Wholesale Co, Delhi" appears in both `Orders_2NF` and `Products_2NF`, many times over.

---

## 3. Third Normal Form (3NF)

> **Rule:** the table is in 2NF, and no non-key column depends on another non-key column (no **transitive** dependencies).

In `Orders_2NF`:

- `order_no → retailer_id → retailer_name, retailer_city` (transitive through FD3)
- `order_no → wholesaler_id → wholesaler_name, wholesaler_city` (transitive through FD4)

In `Products_2NF`:

- `product_id → wholesaler_id → wholesaler_name, wholesaler_city` (transitive through FD4)

Retailers and wholesalers have the **same attributes** (name, city, email, phone, …), so instead of two tables we use one
`businesses` table with a `type` column. This is also how each user's role is worked out: it comes from their business.

**businesses** (key `id`)

| id | name | type | city |
|---|---|---|---|
| R1 | FreshMart Kirana | RETAILER | Sonipat |
| R2 | Daily Needs Store | RETAILER | Delhi |
| W1 | Metro Wholesale Co | WHOLESALER | Delhi |
| W2 | GreenLeaf Traders | WHOLESALER | Gurugram |

**orders** (key `id`; `order_number` is also unique)

| order_number | retailer_id → businesses | wholesaler_id → businesses | status | created_at |
|---|---|---|---|---|
| 1001 | R1 | W1 | SUBMITTED | 2026-11-16 |
| 1002 | R1 | W2 | DRAFT | 2026-11-17 |
| 1003 | R2 | W1 | ACCEPTED | 2026-11-17 |

**products** (key `id`)

| id | wholesaler_id → businesses | name | sku | category | price | available_quantity |
|---|---|---|---|---|---|---|
| P1 | W1 | Basmati Rice 5kg | MW-RICE-5 | Grains | 520 | 400 |
| P3 | W1 | Sunflower Oil 1L | MW-OIL-1 | Oils | 160 | 500 |
| P5 | W2 | Green Tea 100 bags | GL-TEA-100 | Beverages | 280 | 250 |

**order_items** (key `id`; `(order_id, product_id)` is also unique): unchanged from 2NF.

Now every fact is stored **exactly once**, and the original spreadsheet can be rebuilt with joins (a lossless decomposition):

```sql
select o.order_number, o.created_at::date as order_date,
       r.name as retailer, r.city as retailer_city,
       w.name as wholesaler, w.city as wholesaler_city,
       p.name as product, oi.quantity, oi.unit_price, o.status
from orders o
join businesses r  on r.id = o.retailer_id
join businesses w  on w.id = o.wholesaler_id
join order_items oi on oi.order_id = o.id
join products p    on p.id = oi.product_id
order by o.order_number;
```

---

## 4. The same process for the rest of the data

The inventory and sales side starts as a "stock register" spreadsheet and is normalized in the same way:

| UNF column group | Dependency found | Became table |
|---|---|---|
| user name, email, business name, business city | `user_id → full_name, email, business_id`; `business_id → name, city` | `profiles` + `businesses` |
| "connected wholesalers: Metro, GreenLeaf" (a list in one cell) | many-to-many between retailers and wholesalers | `business_connections` (one row per pair) |
| retailer, product, current stock | `(retailer_id, product_id) → quantity` | `inventory` |
| retailer, product, min stock, reorder qty, lead time | `(retailer_id, product_id) → min_stock, reorder_quantity, lead_time_days` | `reorder_rules` |
| daily sales log | `sale_id → retailer_id, product_id, quantity, unit_price, sold_at` | `sales` |
| stock change log | `movement_id → business_id, product_id, quantity_change, reason, …` | `stock_movements` |
| alerts list | `notification_id → business_id, type, title, message, is_read` | `notifications` |

`inventory` and `reorder_rules` have the **same key** `(retailer, product)` but are kept separate on purpose:

- `inventory.quantity` changes on every sale.
- Reorder settings change rarely and are optional (the defaults are used when no rule exists).
- Merging them would be allowed by 3NF, but it would mix two different concerns and force null settings for every product
  that has no rule.

---

## 5. Boyce–Codd Normal Form (BCNF)

> **Rule:** for **every** non-trivial functional dependency `X → Y`, `X` must be a superkey.

BCNF is stricter than 3NF. 3NF allows `X → Y` when `X` is not a key, as long as `Y` is part of a key; BCNF does not.

### Checking every table

| Table | Candidate keys | Non-trivial FDs | Every determinant is a key? |
|---|---|---|---|
| `businesses` | `id` | `id → name, type, email, phone, address, city` | ✅ BCNF |
| `profiles` | `id` | `id → business_id, full_name, email` | ✅ BCNF |
| `business_connections` | `id`, `(retailer_id, wholesaler_id)` | `id → …`, `(retailer_id, wholesaler_id) → id, status` | ✅ BCNF (both determinants are keys) |
| `products` | `id`, `(wholesaler_id, sku)` | `id → …`, `(wholesaler_id, sku) → id, name, price, …` | ✅ BCNF |
| `inventory` | `id`, `(business_id, product_id)` | `(business_id, product_id) → quantity` | ✅ BCNF |
| `reorder_rules` | `id`, `(retailer_id, product_id)` | `(retailer_id, product_id) → min_stock, reorder_quantity, lead_time_days, is_active` | ✅ BCNF |
| `sales` | `id` | `id → retailer_id, product_id, quantity, unit_price, sold_at` | ✅ BCNF |
| `orders` | `id`, `order_number` | `id → retailer_id, wholesaler_id, status, …`; `order_number → id` | ✅ BCNF |
| `order_items` | `id`, `(order_id, product_id)` | `(order_id, product_id) → quantity, unit_price, suggested_quantity` | ✅ BCNF |
| `notifications` | `id` | `id → business_id, type, title, message, …` | ✅ BCNF |
| `stock_movements` | `id` | `id → business_id, product_id, quantity_change, quantity_after, reason, …` | ✅ BCNF |

**Result: every table is in BCNF.** Every determinant is either the UUID primary key or a column set declared `UNIQUE`,
and therefore a candidate key.

### A design that would break BCNF, and why we avoided it

Suppose `inventory` also stored the supplier, to make reorder queries shorter:

`inventory(retailer_id, product_id, wholesaler_id, quantity)` with key `(retailer_id, product_id)`

- `product_id → wholesaler_id` holds, because each product belongs to one wholesaler.
- `product_id` alone is **not** a key of `inventory`, so this table violates BCNF. It also violates 2NF, since
  `wholesaler_id` depends on only part of the key.
- If a product's wholesaler were ever corrected, every retailer's inventory row would need updating.

StockLume does **not** store `wholesaler_id` in `inventory`. The supplier is found with a join instead:
`inventory → products.wholesaler_id`. The same reasoning is why `order_items` has no `wholesaler_id`: it comes from `orders`.

---

## 6. Deliberate, controlled redundancy

Each column below looks redundant at first, but there is a reason to keep it:

| Column | Why it looks redundant | Why we keep it | How consistency is kept |
|---|---|---|---|
| `order_items.unit_price` | Copies `products.price` | It is a **different fact**: the price when ordered. Later price changes must not alter old orders (FD5). | Set once when the item is added |
| `sales.unit_price` | Copies `products.price` | Price at the time of sale, used for revenue | Set once when the sale is recorded |
| `orders.total_amount` | Derivable as `SUM(quantity × unit_price)` from `order_items` | Fast order lists and dashboards without aggregating | Recomputed in the same transaction whenever items change |
| `inventory.quantity` | Derivable as the `SUM(quantity_change)` of `stock_movements` | Current stock is read constantly; summing history every time is slow | The stock change and its movement row are written in one transaction |
| `stock_movements.quantity_after` | Derivable by summing earlier movements | Shows the stock level at each point in history | Written together with the stock update |
| `profiles.email` | Also in Supabase's `auth.users.email` | The API reads profiles without querying Supabase's internal `auth` schema | Copied at registration |

None of these breaks 3NF or BCNF *within its own table*. `total_amount`, for example, still depends only on the
order's key. They are **derived values duplicated across tables**, a conscious trade-off for read performance and history,
and every one is updated inside a transaction.

---

## 7. Summary

| Step | What we removed | Result |
|---|---|---|
| UNF → **1NF** | Repeating group (`items` list in one cell) | One row per order item, atomic values, key `(order_no, product_id)` |
| 1NF → **2NF** | Partial dependencies on part of the key | `Orders`, `Products`, `OrderItems` |
| 2NF → **3NF** | Transitive dependencies through retailer and wholesaler | `businesses` table referenced by foreign keys |
| 3NF → **BCNF** | (nothing left to remove) | Every determinant is a candidate key in all 11 tables |

The final schema has 11 tables, all in **BCNF**. The few derived columns are documented above as intentional and kept in
sync with transactions.
