/**
 * predictions service — loads the data the stockout model needs and uses its results.
 * The maths itself is in stockout-model.js (explained in docs/STOCKOUT_MODEL.md).
 */
import { getPool } from '../db/pool.js';
import { createNotification } from './notifications.service.js';
import { HISTORY_DAYS, predict } from './stockout-model.js';

/**
 * Predictions for every product the retailer stocks (or just one product).
 * `db` is a transaction client when we must see stock changed earlier in the
 * same transaction.
 */
export async function getPredictions(retailerId, productId = null, db = getPool()) {
  // One query gets stock, reorder settings (with defaults) and the last 28 days of sales per product.
  const { rows } = await db.query(
    `select i.product_id, p.name as product_name, p.wholesaler_id, p.available_quantity,
            i.quantity as stock,
            coalesce(r.min_stock, 10) as min_stock,
            coalesce(r.reorder_quantity, 20) as reorder_quantity,
            coalesce(r.lead_time_days, 3) as lead_time_days,
            coalesce(s.units_sold, 0) as units_sold,
            coalesce(s.days_with_sales, 0) as days_with_sales
       from inventory i
       join products p on p.id = i.product_id and p.is_active
       left join reorder_rules r
              on r.retailer_id = i.business_id and r.product_id = i.product_id and r.is_active
       left join (
              select product_id,
                     sum(quantity) as units_sold,
                     count(distinct date_trunc('day', sold_at)) as days_with_sales
                from sales
               where retailer_id = $1 and sold_at >= now() - make_interval(days => $3)
               group by product_id
            ) s on s.product_id = i.product_id
      where i.business_id = $1
        and ($2::uuid is null or i.product_id = $2)
      order by p.name`,
    [retailerId, productId, HISTORY_DAYS],
  );
  return rows.map(predict);
}

// Products that are at MEDIUM or HIGH risk — used for order suggestions.
export async function getLowStockItems(retailerId) {
  const predictions = await getPredictions(retailerId);
  return predictions.filter((item) => item.risk !== 'LOW');
}

// Called after a sale: warn the retailer when a product reaches HIGH risk.
export async function checkLowStockAlert(client, retailerId, productId) {
  // Pass the transaction client so the prediction already includes the sale just saved.
  const [item] = await getPredictions(retailerId, productId, client);
  if (item?.risk !== 'HIGH') return;

  // One unread alert per product is enough.
  const { rowCount } = await client.query(
    `select 1 from notifications
      where business_id = $1 and type = 'LOW_STOCK' and related_product_id = $2 and not is_read`,
    [retailerId, productId],
  );
  if (rowCount > 0) return;

  await createNotification(client, {
    businessId: retailerId,
    type: 'LOW_STOCK',
    title: 'Low stock',
    message: `${item.productName} is running low (${item.stock} left).`,
    relatedProductId: productId,
  });
}
