/**
 * sales service — OWNER: Member 2 — Inventory & Stock Prediction
 * A sale lowers the retailer's stock, so it always runs in one transaction.
 */
import { query, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { toCamel } from '../utils/camelCase.js';
import { logStockMovement } from './stock-movement.js';
import { checkLowStockAlert } from './predictions.service.js';

// Sales history of the retailer. Each filter is optional (null means "ignore this filter").
export async function list(retailerId, { productId, from, to }) {
  const { rows } = await query(
    `select s.id, s.product_id, p.name as product_name, s.quantity, s.unit_price,
            s.quantity * s.unit_price as total, s.sold_at
       from sales s
       join products p on p.id = s.product_id
      where s.retailer_id = $1
        and ($2::uuid is null or s.product_id = $2)
        and ($3::timestamptz is null or s.sold_at >= $3)
        and ($4::timestamptz is null or s.sold_at <= $4)
      order by s.sold_at desc`,
    [retailerId, productId ?? null, from ?? null, to ?? null],
  );
  return rows.map(toCamel);
}

// Saves one sale, lowers stock and logs the movement. Must run inside a transaction.
async function saveSale(client, user, { productId, quantity, unitPrice, soldAt }) {
  // The "quantity >= $3" condition stops two sales at the same moment from taking the same stock.
  const { rows: stock } = await client.query(
    `update inventory set quantity = quantity - $3
      where business_id = $1 and product_id = $2 and quantity >= $3
      returning quantity`,
    [user.businessId, productId, quantity],
  );
  if (!stock[0]) throw ApiError.insufficientStock('Not enough stock for this sale');

  // The price defaults to the product's current price and the date defaults to now.
  const { rows } = await client.query(
    `insert into sales (retailer_id, product_id, quantity, unit_price, sold_at, created_by)
     values ($1, $2, $3, coalesce($4, (select price from products where id = $2)), coalesce($5, now()), $6)
     returning *`,
    [user.businessId, productId, quantity, unitPrice ?? null, soldAt ?? null, user.id],
  );
  const sale = rows[0];

  await logStockMovement(client, {
    businessId: user.businessId,
    productId,
    change: -quantity,
    quantityAfter: stock[0].quantity,
    reason: 'SALE',
    saleId: sale.id,
    userId: user.id,
  });
  return sale;
}

// Records a sale, then checks whether the product is now at risk of running out.
export function create(user, sale) {
  return withTransaction(async (client) => {
    const saved = await saveSale(client, user, sale);
    await checkLowStockAlert(client, user.businessId, sale.productId);
    return toCamel(saved);
  });
}

// Demo helper: random sales for every stocked product over the last `days` days.
export function simulate(user, days) {
  return withTransaction(async (client) => {
    const { rows: stocked } = await client.query(
      'select product_id, quantity from inventory where business_id = $1 and quantity > 0',
      [user.businessId],
    );

    // For each product, spread random daily sales over the past days without selling more than we have.
    let salesCreated = 0;
    for (const { product_id: productId, quantity } of stocked) {
      let remaining = quantity;
      for (let daysAgo = days - 1; daysAgo >= 0; daysAgo -= 1) {
        const units = Math.min(Math.floor(Math.random() * 5), remaining); // 0 to 4 units a day
        if (units === 0) continue;

        const soldAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        await saveSale(client, user, { productId, quantity: units, soldAt });
        remaining -= units;
        salesCreated += 1;
      }
      await checkLowStockAlert(client, user.businessId, productId);
    }
    return { days, salesCreated };
  });
}
