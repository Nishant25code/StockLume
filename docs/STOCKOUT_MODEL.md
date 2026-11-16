# Stockout prediction model

**Owner:** Member 2 · **Status:** designed, not implemented yet · **Endpoint:** `GET /api/predictions/stockout`

The goal is a model that is simple enough to explain in a viva, but still uses real probability rather than a fixed threshold.

## Question we answer

> "What is the probability that this product runs out **before a new order can arrive**?"

## Inputs (per retailer + product)

| Input | Source |
|---|---|
| `stock` — current quantity | `inventory.quantity` |
| daily sales for the last **N = 28 days** | `sales` grouped by day |
| `lead_time_days` (default 3) | `reorder_rules.lead_time_days` |
| `min_stock` (default 10) | `reorder_rules.min_stock` |
| `reorder_quantity` (default 20) | `reorder_rules.reorder_quantity` |

```sql
-- average units sold per day over the last 28 days
select coalesce(sum(quantity), 0)::numeric / 28              as avg_daily_demand,
       count(distinct date_trunc('day', sold_at))           as days_with_sales
from sales
where retailer_id = $1 and product_id = $2
  and sold_at >= now() - interval '28 days';
```

## Model: Poisson demand over the lead time

1. **Average daily demand** `d = total units sold in 28 days / 28`.
2. **Expected demand during the lead time** `λ = d × lead_time_days`.
3. Assume demand during the lead time follows a **Poisson distribution** with mean `λ` (a standard model for "number of events in a time window").
4. **Stockout probability** = probability that demand is at least the current stock:

   ```
   P(stockout) = P(D ≥ stock) = 1 − Σ_{k=0}^{stock−1} e^(−λ) · λ^k / k!
   ```

   If `stock = 0`, `P = 1`.

5. **Risk level:**

   | Probability | Risk |
   |---|---|
   | `P ≥ 0.50` | `HIGH` → create a `LOW_STOCK` notification and include in suggestions |
   | `0.20 ≤ P < 0.50` | `MEDIUM` → include in suggestions |
   | `P < 0.20` | `LOW` |

6. **Days of stock left** (for display): `stock / d` (or "∞" when `d = 0`).

### Worked example

Basmati Rice: stock = 6, sold 84 units in 28 days → `d = 3`, lead time = 3 days → `λ = 9`.
`P(D ≥ 6) = 1 − P(D ≤ 5) ≈ 1 − 0.116 = 0.88` → **HIGH**.

### JavaScript sketch (do the maths in JS, not SQL)

```js
export function stockoutProbability(stock, lambda) {
  if (stock <= 0) return 1;
  if (lambda <= 0) return 0;
  let term = Math.exp(-lambda); // P(D = 0)
  let cumulative = term;
  for (let k = 1; k < stock; k += 1) {
    term *= lambda / k;          // P(D = k) from P(D = k − 1)
    cumulative += term;
  }
  return Math.min(1, Math.max(0, 1 - cumulative));
}
```

## Fallback: not enough history

If a product has **fewer than 7 days with sales** in the window (new product, or no data), the average is unreliable. Use a simple threshold rule instead and mark the result `method: "THRESHOLD"`:

| Condition | Risk |
|---|---|
| `stock = 0` | `HIGH` |
| `stock ≤ min_stock` | `HIGH` |
| `stock ≤ 1.5 × min_stock` | `MEDIUM` |
| otherwise | `LOW` |

## Suggested order quantity (used by Member 3)

For each `MEDIUM`/`HIGH` product:

```
cover_days   = lead_time_days + 7        // cover the lead time plus one week
target_stock = ceil(d × cover_days) + min_stock
suggested    = max(reorder_quantity, target_stock − stock)
```

With the threshold fallback (no reliable `d`), `suggested = reorder_quantity`.
Cap the suggestion at the wholesaler's `products.available_quantity`.

## Response shape

```json
{
  "success": true,
  "data": [
    {
      "productId": "33333333-0000-0000-0000-000000000001",
      "productName": "Basmati Rice 5kg",
      "wholesalerId": "22222222-0000-0000-0000-000000000001",
      "stock": 6,
      "avgDailyDemand": 3,
      "leadTimeDays": 3,
      "stockoutProbability": 0.88,
      "risk": "HIGH",
      "method": "POISSON",
      "daysOfStockLeft": 2,
      "suggestedQuantity": 30
    }
  ]
}
```

## Limitations (good to mention in the presentation)

- Assumes demand is steady — no seasonality, festivals or promotions.
- Poisson assumes sales are independent events; bulk purchases break this a little.
- Lead time is a fixed number per product, not learned from real deliveries (could use `orders.submitted_at → delivered_at` later).
