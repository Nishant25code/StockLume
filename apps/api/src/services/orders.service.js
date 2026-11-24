/**
 * orders service — OWNER: Member 3 — Orders & Fulfillment
 * Rules for every action are in docs/BUSINESS_RULES.md.
 *
 * Every status action follows the same steps inside one transaction:
 *   1. find and lock the order   2. check the businesses are connected
 *   3. change the status          4. do the action's own work (stock, notification)
 * If any step throws, the transaction rolls back and nothing is saved.
 */
import { query, getPool, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { toCamel } from '../utils/camelCase.js';
import { changeStatus } from './order-status.js';
import { createNotification } from './notifications.service.js';
import { logStockMovement } from './stock-movement.js';
import { getLowStockItems } from './predictions.service.js';

// SQL condition for "orders this user may see" ($1 = the user's business id).
// A retailer owns orders through retailer_id, a wholesaler through wholesaler_id,
// and a wholesaler never sees a draft.
function visibleTo(user) {
  if (user.role === 'RETAILER') return 'o.retailer_id = $1';
  return "o.wholesaler_id = $1 and o.status <> 'DRAFT'";
}

// Wholesalers the retailer has an ACTIVE connection with.
async function getConnectedWholesalerIds(db, retailerId) {
  const { rows } = await db.query(
    `select wholesaler_id from business_connections where retailer_id = $1 and status = 'ACTIVE'`,
    [retailerId],
  );
  return rows.map((row) => row.wholesaler_id);
}

// Throws unless the retailer and wholesaler have an ACTIVE connection.
async function assertConnected(db, retailerId, wholesalerId) {
  const connected = await getConnectedWholesalerIds(db, retailerId);
  if (!connected.includes(wholesalerId)) throw ApiError.notConnected();
}

// Finds an order the caller is allowed to see; anything else is a 404.
// With lock = true the row stays locked until the transaction ends, so two
// actions on the same order cannot run at the same time.
async function findOrder(db, orderId, user, lock = false) {
  const { rows } = await db.query(
    `select * from orders o where ${visibleTo(user)} and o.id = $2 ${lock ? 'for update' : ''}`,
    [user.businessId, orderId],
  );
  if (!rows[0]) throw ApiError.notFound('Order not found');
  return rows[0];
}

// Finds and locks an order, then checks the two businesses are still connected.
// Every action that changes an order starts with this.
async function findOrderToChange(client, orderId, user) {
  const order = await findOrder(client, orderId, user, true);
  await assertConnected(client, order.retailer_id, order.wholesaler_id);
  return order;
}

// The products inside an order, with their names, for responses and stock updates.
async function getItems(db, orderId) {
  const { rows } = await db.query(
    `select oi.id, oi.order_id, oi.product_id, p.name as product_name, p.sku, p.category, p.unit,
            oi.quantity, oi.suggested_quantity, oi.unit_price
       from order_items oi
       join products p on p.id = oi.product_id
      where oi.order_id = $1
      order by p.name`,
    [orderId],
  );
  return rows.map(toCamel);
}

// Names and cities of the order's retailer and wholesaler (shown on the order page).
async function getParties(db, order) {
  const { rows } = await db.query(
    `select r.name as retailer_name, r.city as retailer_city, w.name as wholesaler_name, w.city as wholesaler_city
       from businesses r, businesses w
      where r.id = $1 and w.id = $2`,
    [order.retailer_id, order.wholesaler_id],
  );
  return rows[0] ? toCamel(rows[0]) : {};
}

// Converts an order row to camelCase and attaches its items and business names.
async function getOrderWithItems(db, order) {
  const [items, parties] = await Promise.all([getItems(db, order.id), getParties(db, order)]);
  return { ...toCamel(order), ...parties, items };
}

// Re-adds quantity x price of all items and saves it as the order total.
async function recalculateTotal(client, orderId) {
  const { rows } = await client.query(
    `update orders
        set total_amount = (select coalesce(sum(quantity * unit_price), 0) from order_items where order_id = $1)
      where id = $1
      returning *`,
    [orderId],
  );
  return rows[0];
}

// Sends a notification about an order, e.g. "Order #3 was accepted."
function notifyOrder(client, order, { to, type, title, message }) {
  return createNotification(client, {
    businessId: to,
    type,
    title,
    message: `Order #${order.order_number} ${message}`,
    relatedOrderId: order.id,
  });
}

// Orders of the logged-in business, optionally filtered by status.
export async function list(user, status) {
  const { rows } = await query(
    `select o.*, r.name as retailer_name, w.name as wholesaler_name
       from orders o
       join businesses r on r.id = o.retailer_id
       join businesses w on w.id = o.wholesaler_id
      where ${visibleTo(user)}
        and ($2::order_status is null or o.status = $2)
      order by o.created_at desc`,
    [user.businessId, status ?? null],
  );
  return rows.map(toCamel);
}

// One order with its items.
export async function getById(user, orderId) {
  const order = await findOrder(getPool(), orderId, user);
  return getOrderWithItems(getPool(), order);
}

// Retailer starts an empty draft order for a connected wholesaler.
export async function create(user, { wholesalerId, notes }) {
  await assertConnected(getPool(), user.businessId, wholesalerId);
  const { rows } = await query(
    `insert into orders (retailer_id, wholesaler_id, notes, created_by)
     values ($1, $2, $3, $4)
     returning *`,
    [user.businessId, wholesalerId, notes ?? null, user.id],
  );
  return { ...toCamel(rows[0]), items: [] }; // a new draft has no items yet
}

// Replaces the items of a draft: adds new products, updates quantities, removes the rest.
export function replaceItems(user, orderId, items) {
  return withTransaction(async (client) => {
    const order = await findOrderToChange(client, orderId, user);
    if (order.status !== 'DRAFT') throw ApiError.conflict('Items can only be changed while the order is a draft');

    // Split the items into two lists so the database can handle them in one go.
    const productIds = items.map((item) => item.productId);
    const quantities = items.map((item) => item.quantity);

    // Remove items that are no longer in the list.
    await client.query('delete from order_items where order_id = $1 and product_id <> all($2::uuid[])', [
      orderId,
      productIds,
    ]);

    // The price is copied from the product now, so later price changes do not touch this order.
    const { rowCount } = await client.query(
      `insert into order_items (order_id, product_id, quantity, unit_price)
       select $1, p.id, i.quantity, p.price
         from unnest($2::uuid[], $3::int[]) as i(product_id, quantity)
         join products p on p.id = i.product_id and p.wholesaler_id = $4 and p.is_active
       on conflict (order_id, product_id) do update set quantity = excluded.quantity`,
      [orderId, productIds, quantities, order.wholesaler_id],
    );
    // Fewer rows saved than sent means some product was not valid for this wholesaler.
    if (rowCount !== items.length) {
      throw ApiError.badRequest("Every product must be an active product of this order's wholesaler");
    }

    return getOrderWithItems(client, await recalculateTotal(client, orderId));
  });
}

// The retailer's open suggested draft for this wholesaler, or a new one.
async function findOrCreateSuggestedDraft(client, user, wholesalerId) {
  const { rows: existing } = await client.query(
    `select * from orders
      where retailer_id = $1 and wholesaler_id = $2 and status = 'DRAFT' and is_suggested
      limit 1`,
    [user.businessId, wholesalerId],
  );
  if (existing[0]) return existing[0];

  const { rows } = await client.query(
    `insert into orders (retailer_id, wholesaler_id, is_suggested, created_by)
     values ($1, $2, true, $3)
     returning *`,
    [user.businessId, wholesalerId, user.id],
  );
  return rows[0];
}

// Creates (or refreshes) one draft per wholesaler from the products that are running low.
// It all runs in one transaction, so we never end up with half-built drafts.
// Drafts are private to the retailer, so nobody is notified here.
export async function suggest(user) {
  const lowStock = await getLowStockItems(user.businessId);

  return withTransaction(async (client) => {
    const connected = await getConnectedWholesalerIds(client, user.businessId);

    // Group the low-stock products by the wholesaler that sells them.
    const itemsByWholesaler = new Map();
    for (const item of lowStock) {
      if (!connected.includes(item.wholesalerId) || item.suggestedQuantity <= 0) continue;
      if (!itemsByWholesaler.has(item.wholesalerId)) itemsByWholesaler.set(item.wholesalerId, []);
      itemsByWholesaler.get(item.wholesalerId).push(item);
    }

    const orders = [];
    for (const [wholesalerId, items] of itemsByWholesaler) {
      const order = await findOrCreateSuggestedDraft(client, user, wholesalerId);

      // Same one-query insert as replaceItems. On a refresh we only update the
      // suggestion, so the retailer's own quantity edits stay.
      await client.query(
        `insert into order_items (order_id, product_id, quantity, suggested_quantity, unit_price)
         select $1, p.id, i.quantity, i.quantity, p.price
           from unnest($2::uuid[], $3::int[]) as i(product_id, quantity)
           join products p on p.id = i.product_id
         on conflict (order_id, product_id) do update set suggested_quantity = excluded.suggested_quantity`,
        [order.id, items.map((item) => item.productId), items.map((item) => item.suggestedQuantity)],
      );
      orders.push(await getOrderWithItems(client, await recalculateTotal(client, order.id)));
    }
    return orders;
  });
}

// Retailer sends a draft to the wholesaler. This is the first moment the wholesaler hears about it.
export function submit(user, orderId) {
  return withTransaction(async (client) => {
    const order = await findOrderToChange(client, orderId, user);
    const updated = await changeStatus(client, order, 'SUBMITTED');

    // An empty order cannot be submitted. Throwing here also undoes the status change above.
    const { rowCount } = await client.query('select 1 from order_items where order_id = $1 limit 1', [order.id]);
    if (rowCount === 0) throw ApiError.badRequest('Add at least one item before submitting the order');

    await notifyOrder(client, order, {
      to: order.wholesaler_id,
      type: 'ORDER_SUBMITTED',
      title: 'New order received',
      message: 'is waiting for your review.',
    });
    return getOrderWithItems(client, updated);
  });
}

// Retailer cancels a draft or a submitted order.
export function cancel(user, orderId) {
  return withTransaction(async (client) => {
    const order = await findOrderToChange(client, orderId, user);
    const wasSubmitted = order.status === 'SUBMITTED';
    const updated = await changeStatus(client, order, 'CANCELLED');

    // A draft was never visible to the wholesaler, so only tell them about submitted orders.
    if (wasSubmitted) {
      await notifyOrder(client, order, {
        to: order.wholesaler_id,
        type: 'ORDER_CANCELLED',
        title: 'Order cancelled',
        message: 'was cancelled by the retailer.',
      });
    }
    return getOrderWithItems(client, updated);
  });
}

// Wholesaler agrees to fulfil the order.
export function accept(user, orderId) {
  return withTransaction(async (client) => {
    const order = await findOrderToChange(client, orderId, user);
    const updated = await changeStatus(client, order, 'ACCEPTED');

    await notifyOrder(client, order, {
      to: order.retailer_id,
      type: 'ORDER_ACCEPTED',
      title: 'Order accepted',
      message: 'was accepted.',
    });
    return getOrderWithItems(client, updated);
  });
}

// Wholesaler refuses the order and says why.
export function reject(user, orderId, reason) {
  return withTransaction(async (client) => {
    const order = await findOrderToChange(client, orderId, user);
    const updated = await changeStatus(client, order, 'REJECTED', reason);

    await notifyOrder(client, order, {
      to: order.retailer_id,
      type: 'ORDER_REJECTED',
      title: 'Order rejected',
      message: `was rejected: ${reason}`,
    });
    return getOrderWithItems(client, updated);
  });
}

// The wholesaler ships: its own stock goes down.
export function dispatch(user, orderId) {
  return withTransaction(async (client) => {
    const order = await findOrderToChange(client, orderId, user);
    const updated = await changeStatus(client, order, 'DISPATCHED');
    const items = await getItems(client, order.id);

    for (const item of items) {
      // Lower the stock only if enough is left; the condition protects against going negative.
      const { rows } = await client.query(
        `update products
            set available_quantity = available_quantity - $2
          where id = $1 and available_quantity >= $2
          returning available_quantity`,
        [item.productId, item.quantity],
      );
      if (!rows[0]) throw ApiError.insufficientStock(`Not enough stock of ${item.productName} to dispatch`);

      // Keep a history row for every stock change.
      await logStockMovement(client, {
        businessId: order.wholesaler_id,
        productId: item.productId,
        change: -item.quantity,
        quantityAfter: rows[0].available_quantity,
        reason: 'ORDER_DISPATCHED',
        orderId: order.id,
        userId: user.id,
      });
    }

    await notifyOrder(client, order, {
      to: order.retailer_id,
      type: 'ORDER_DISPATCHED',
      title: 'Order dispatched',
      message: 'is on its way.',
    });
    return { ...toCamel(updated), items };
  });
}

// The retailer receives: its own stock goes up (a new inventory row if it never stocked the product).
export function deliver(user, orderId) {
  return withTransaction(async (client) => {
    const order = await findOrderToChange(client, orderId, user);
    const updated = await changeStatus(client, order, 'DELIVERED');
    const items = await getItems(client, order.id);

    for (const item of items) {
      const { rows } = await client.query(
        `insert into inventory (business_id, product_id, quantity) values ($1, $2, $3)
         on conflict (business_id, product_id) do update set quantity = inventory.quantity + excluded.quantity
         returning quantity`,
        [order.retailer_id, item.productId, item.quantity],
      );

      await logStockMovement(client, {
        businessId: order.retailer_id,
        productId: item.productId,
        change: item.quantity,
        quantityAfter: rows[0].quantity,
        reason: 'ORDER_DELIVERED',
        orderId: order.id,
        userId: user.id,
      });
    }

    await notifyOrder(client, order, {
      to: order.wholesaler_id,
      type: 'ORDER_DELIVERED',
      title: 'Order delivered',
      message: 'was delivered.',
    });
    return { ...toCamel(updated), items };
  });
}
