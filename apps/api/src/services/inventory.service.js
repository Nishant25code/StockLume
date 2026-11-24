
/**
 * inventory service — OWNER: Member 2 — Inventory & Stock Prediction
 *
 * Business logic + SQL queries for Inventory and Reorder rules (R9, W8, W9, W10, R10, R11, W11).
 * Always parameterized and strictly scoped to the authenticated caller's business.
 */
import { query, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';

export function formatInventoryItem(row) {
  if (!row) return null;
  const quantity = Number(row.quantity);
  const minStock = Number(row.min_stock ?? 10);
  const reorderQuantity = Number(row.reorder_quantity ?? 20);
  const leadTimeDays = Number(row.lead_time_days ?? 3);

  let stockoutRisk = 'LOW';
  if (quantity === 0 || quantity <= Math.floor(minStock / 2)) {
    stockoutRisk = 'HIGH';
  } else if (quantity <= minStock) {
    stockoutRisk = 'MEDIUM';
  }

  return {
    id: row.inventory_id || row.id,
    businessId: row.business_id,
    productId: row.product_id,
    quantity,
    minStock,
    reorderQuantity,
    leadTimeDays,
    stockoutRisk,
    updatedAt: row.updated_at,
    product: {
      id: row.product_id,
      name: row.product_name,
      sku: row.sku,
      unit: row.unit,
      price: Number(row.price),
      wholesalerId: row.wholesaler_id,
      wholesalerName: row.wholesaler_name,
    },
  };
}

/**
 * R9: Retailer stock list joined with product, wholesaler, and reorder rule.
 */
export async function listInventory(user, { search = null, lowStockOnly = false, limit = 50, offset = 0 } = {}) {
  if (!user?.businessId) {
    throw ApiError.forbidden('User does not belong to a registered business');
  }

  const sanitizedSearch = search && search.trim() ? search.trim() : null;

  const sql = `
    SELECT i.id            AS inventory_id,
           i.business_id,
           i.product_id,
           i.quantity,
           i.updated_at,
           p.name          AS product_name,
           p.sku,
           p.unit,
           p.price,
           w.id            AS wholesaler_id,
           w.name          AS wholesaler_name,
           coalesce(r.min_stock, 10)        AS min_stock,
           coalesce(r.reorder_quantity, 20) AS reorder_quantity,
           coalesce(r.lead_time_days, 3)    AS lead_time_days,
           count(*) OVER () AS total
    FROM inventory i
    JOIN products p        ON p.id = i.product_id
    JOIN businesses w      ON w.id = p.wholesaler_id
    LEFT JOIN reorder_rules r ON r.retailer_id = i.business_id
                             AND r.product_id  = i.product_id
                             AND r.is_active
    WHERE i.business_id = $1
      AND ($2::text IS NULL OR p.name ILIKE '%' || $2::text || '%' OR p.sku ILIKE '%' || $2::text || '%')
      AND (NOT $3::boolean OR i.quantity <= coalesce(r.min_stock, 10))
    ORDER BY p.name
    LIMIT $4 OFFSET $5;
  `;

  const { rows } = await query(sql, [user.businessId, sanitizedSearch, lowStockOnly, limit, offset]);
  const total = rows.length > 0 ? Number(rows[0].total) : 0;
  return {
    items: rows.map(formatInventoryItem),
    total,
  };
}

/**
 * W8 + W10: Add a product from an active connected wholesaler to retailer's inventory.
 * Atomically inserts inventory record and INITIAL_STOCK movement log.
 */
export async function addInventoryItem(user, { productId, quantity = 0 }) {
  if (!user?.businessId) {
    throw ApiError.forbidden('User does not belong to a registered business');
  }

  // Verify product exists, is active, and belongs to an ACTIVE connection.
  const { rows: prodRows } = await query(
    `SELECT
       p.id,
       p.name,
       p.sku,
       p.is_active,
       EXISTS (
         SELECT 1
         FROM business_connections bc
         WHERE bc.retailer_id = $2
           AND bc.wholesaler_id = p.wholesaler_id
           AND bc.status = 'ACTIVE'
       ) AS has_active_connection
     FROM products p
     WHERE p.id = $1`,
    [productId, user.businessId]
  );

  if (prodRows.length === 0) {
    throw ApiError.notFound('Product not found');
  }

  const prod = prodRows[0];

  if (!prod.is_active) {
    throw ApiError.badRequest('Cannot stock an inactive product');
  }

  if (!prod.has_active_connection) {
    throw ApiError.forbidden(
      'An active connection with this product’s wholesaler is required'
    );
  }

  // Check if product already exists in inventory.
  const { rows: existingRows } = await query(
    'SELECT id, quantity FROM inventory WHERE business_id = $1 AND product_id = $2',
    [user.businessId, productId],
  );

  if (existingRows.length > 0) {
    throw ApiError.conflict('This product is already in your inventory');
  }

  return withTransaction(async (client) => {
    // Insert inventory row.
    const { rows: invRows } = await client.query(
      `INSERT INTO inventory (business_id, product_id, quantity)
       VALUES ($1, $2, $3)
       RETURNING id, business_id, product_id, quantity, created_at, updated_at`,
      [user.businessId, productId, quantity],
    );

    const inv = invRows[0];

    // Insert stock movement record (W10).
    await client.query(
      `INSERT INTO stock_movements
             (business_id, product_id, quantity_change, quantity_after, reason, note, created_by)
       VALUES ($1, $2, $3, $4, 'INITIAL_STOCK', 'Added product to inventory', $5)`,
      [user.businessId, productId, quantity, quantity, user.id || null],
    );

    return {
      id: inv.id,
      businessId: inv.business_id,
      productId: inv.product_id,
      quantity: Number(inv.quantity),
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
    };
  });
}

/**
 * W9 + W10: Manual stock adjustment.
 * Checks ownership, guarantees non-negative quantity atomically, and logs MANUAL_ADJUSTMENT movement.
 */
export async function adjustInventoryQuantity(user, { inventoryId, change, note = null }) {
  if (!user?.businessId) {
    throw ApiError.forbidden('User does not belong to a registered business');
  }

  return withTransaction(async (client) => {
    // Atomic update with quantity + change >= 0 guard.
    const { rows: updateRows } = await client.query(
      `UPDATE inventory
          SET quantity = quantity + $3, updated_at = now()
        WHERE id = $1
          AND business_id = $2
          AND quantity + $3 >= 0
        RETURNING id, business_id, product_id, quantity`,
      [inventoryId, user.businessId, change],
    );

    if (updateRows.length === 0) {
      // Differentiate not found vs insufficient stock.
      const { rows: checkRows } = await client.query(
        'SELECT id, quantity FROM inventory WHERE id = $1 AND business_id = $2',
        [inventoryId, user.businessId],
      );

      if (checkRows.length === 0) {
        throw ApiError.notFound('Inventory record not found');
      }

      throw new ApiError(
        409,
        'INSUFFICIENT_STOCK',
        `Adjustment would cause negative inventory stock (current: ${checkRows[0].quantity}, change: ${change})`,
      );
    }

    const updated = updateRows[0];
    const newQuantity = Number(updated.quantity);

    // Insert stock movement record (W10).
    await client.query(
      `INSERT INTO stock_movements
             (business_id, product_id, quantity_change, quantity_after, reason, note, created_by)
       VALUES ($1, $2, $3, $4, 'MANUAL_ADJUSTMENT', $5, $6)`,
      [user.businessId, updated.product_id, change, newQuantity, note || 'Manual stock adjustment', user.id || null],
    );

    return {
      id: updated.id,
      businessId: updated.business_id,
      productId: updated.product_id,
      quantity: newQuantity,
      adjustment: change,
      note: note || 'Manual stock adjustment',
    };
  });
}

/**
 * R10: List stock movement history.
 */
export async function listStockMovements(user, { productId = null, reason = null, limit = 50, offset = 0 } = {}) {
  if (!user?.businessId) {
    throw ApiError.forbidden('User does not belong to a registered business');
  }

  const sql = `
    SELECT m.id,
           m.created_at,
           m.reason,
           m.quantity_change,
           m.quantity_after,
           m.note,
           m.product_id,
           p.name          AS product_name,
           p.sku           AS product_sku,
           o.order_number,
           pr.full_name    AS done_by,
           count(*) OVER () AS total
    FROM stock_movements m
    JOIN products p       ON p.id  = m.product_id
    LEFT JOIN orders o    ON o.id  = m.order_id
    LEFT JOIN profiles pr ON pr.id = m.created_by
    WHERE m.business_id = $1
      AND ($2::uuid IS NULL OR m.product_id = $2::uuid)
      AND ($3::stock_movement_reason IS NULL OR m.reason = $3::stock_movement_reason)
    ORDER BY m.created_at DESC
    LIMIT $4 OFFSET $5;
  `;

  const { rows } = await query(sql, [user.businessId, productId, reason, limit, offset]);
  const total = rows.length > 0 ? Number(rows[0].total) : 0;
  return {
    items: rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      reason: r.reason,
      quantityChange: Number(r.quantity_change),
      quantityAfter: Number(r.quantity_after),
      note: r.note,
      productId: r.product_id,
      productName: r.product_name,
      productSku: r.product_sku,
      orderNumber: r.order_number ? Number(r.order_number) : null,
      doneBy: r.done_by ?? null,
    })),
    total,
  };
}

/**
 * R11: List retailer's reorder rules.
 */
export async function listReorderRules(user) {
  if (!user?.businessId) {
    throw ApiError.forbidden('User does not belong to a registered business');
  }

  const sql = `
    SELECT r.id,
           r.product_id,
           p.name AS product_name,
           p.sku  AS product_sku,
           r.min_stock,
           r.reorder_quantity,
           r.lead_time_days,
           r.is_active,
           r.updated_at
    FROM reorder_rules r
    JOIN products p ON p.id = r.product_id
    WHERE r.retailer_id = $1
    ORDER BY p.name;
  `;

  const { rows } = await query(sql, [user.businessId]);
  return rows.map((r) => ({
    id: r.id,
    productId: r.product_id,
    productName: r.product_name,
    productSku: r.product_sku,
    minStock: Number(r.min_stock),
    reorderQuantity: Number(r.reorder_quantity),
    leadTimeDays: Number(r.lead_time_days),
    isActive: r.is_active,
    updatedAt: r.updated_at,
  }));
}

/**
 * W11: Upsert reorder rule for a retailer + product.
 */
export async function saveReorderRule(user, { productId, minStock, reorderQuantity, leadTimeDays }) {
  if (!user?.businessId) {
    throw ApiError.forbidden('User does not belong to a registered business');
  }

  // Verify product exists, is active, and belongs to an ACTIVE connection.
  const { rows: prodRows } = await query(
    `SELECT
       p.id,
       p.name,
       p.sku,
       p.is_active,
       EXISTS (
         SELECT 1
         FROM business_connections bc
         WHERE bc.retailer_id = $2
           AND bc.wholesaler_id = p.wholesaler_id
           AND bc.status = 'ACTIVE'
       ) AS has_active_connection
     FROM products p
     WHERE p.id = $1`,
    [productId, user.businessId]
  );

  if (prodRows.length === 0) {
    throw ApiError.notFound('Product not found');
  }

  const prod = prodRows[0];

  if (!prod.is_active) {
    throw ApiError.notFound('Active product not found');
  }

  if (!prod.has_active_connection) {
    throw ApiError.forbidden(
      'An active connection with this product’s wholesaler is required'
    );
  }

  const sql = `
    INSERT INTO reorder_rules (retailer_id, product_id, min_stock, reorder_quantity, lead_time_days, is_active)
    VALUES ($1, $2, $3, $4, $5, true)
    ON CONFLICT (retailer_id, product_id) DO UPDATE
    SET min_stock        = excluded.min_stock,
        reorder_quantity = excluded.reorder_quantity,
        lead_time_days   = excluded.lead_time_days,
        is_active        = true,
        updated_at       = now()
    RETURNING id, retailer_id, product_id, min_stock, reorder_quantity, lead_time_days, is_active, updated_at;
  `;

  const { rows } = await query(sql, [user.businessId, productId, minStock, reorderQuantity, leadTimeDays]);
  const saved = rows[0];

  return {
    id: saved.id,
    productId: saved.product_id,
    productName: prod.name,
    productSku: prod.sku,
    minStock: Number(saved.min_stock),
    reorderQuantity: Number(saved.reorder_quantity),
    leadTimeDays: Number(saved.lead_time_days),
    isActive: saved.is_active,
    updatedAt: saved.updated_at,
  };
}
