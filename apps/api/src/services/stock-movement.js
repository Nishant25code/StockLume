// Every change to a stock quantity writes one row here, in the same transaction.
export function logStockMovement(client, { businessId, productId, change, quantityAfter, reason, saleId, orderId, userId }) {
  return client.query(
    `insert into stock_movements
       (business_id, product_id, quantity_change, quantity_after, reason, sale_id, order_id, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [businessId, productId, change, quantityAfter, reason, saleId ?? null, orderId ?? null, userId],
  );
}
