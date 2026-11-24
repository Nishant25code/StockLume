/**
 * inventory controller — OWNER: Member 2 — Inventory & Stock Prediction
 *
 * Thin controller layer: reads params/query/body/user, validates, delegates to service.
 */
import { sendSuccess } from '../utils/response.js';
import { ApiError } from '../utils/ApiError.js';
import * as inventoryService from '../services/inventory.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * GET /api/inventory
 * Retailer's stock list joined with products, wholesaler info, reorder rules & risk.
 * Query: search, lowStockOnly, limit, offset
 */
export async function list(req, res) {
  const { search, lowStockOnly, limit: rawLimit, offset: rawOffset } = req.query;

  const parsedLimit = rawLimit !== undefined ? parseInt(rawLimit, 10) : 50;
  if (rawLimit !== undefined && (Number.isNaN(parsedLimit) || parsedLimit <= 0)) {
    throw ApiError.badRequest('Limit must be a positive integer', { field: 'limit' });
  }
  const limit = Math.min(parsedLimit || 50, 100);

  const parsedOffset = rawOffset !== undefined ? parseInt(rawOffset, 10) : 0;
  if (rawOffset !== undefined && (Number.isNaN(parsedOffset) || parsedOffset < 0)) {
    throw ApiError.badRequest('Offset must be a non-negative integer', { field: 'offset' });
  }
  const offset = parsedOffset || 0;

  const { items, total } = await inventoryService.listInventory(req.user, {
    search: search || null,
    lowStockOnly: lowStockOnly === 'true' || lowStockOnly === '1',
    limit,
    offset,
  });

  return sendSuccess(res, items, 200, { total, limit, offset });
}

/**
 * POST /api/inventory
 * Add a connected wholesaler's product to the retailer's inventory with initial stock.
 * Body: { productId, quantity }
 */
export async function create(req, res) {
  const { productId, quantity } = req.body ?? {};

  if (!productId || !isValidUuid(productId)) {
    throw ApiError.badRequest('Valid productId (UUID) is required', { field: 'productId' });
  }

  const parsedQty = quantity !== undefined ? Number(quantity) : 0;
  if (!Number.isInteger(parsedQty) || parsedQty < 0) {
    throw ApiError.badRequest('Quantity must be a non-negative integer', { field: 'quantity' });
  }

  const record = await inventoryService.addInventoryItem(req.user, {
    productId,
    quantity: parsedQty,
  });

  return sendSuccess(res, record, 201);
}

/**
 * PATCH /api/inventory/:id/adjust
 * Manual stock adjustment (+/- integer).
 * Body: { change, note? }
 */
export async function adjust(req, res) {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    throw ApiError.badRequest('Invalid inventory ID format (must be a valid UUID)', { field: 'id' });
  }

  const { change, note } = req.body ?? {};

  if (change === undefined || change === null || !Number.isInteger(Number(change)) || Number(change) === 0) {
    throw ApiError.badRequest('change must be a non-zero integer (+ for increase, - for decrease)', { field: 'change' });
  }

  const updated = await inventoryService.adjustInventoryQuantity(req.user, {
    inventoryId: id,
    change: Number(change),
    note: typeof note === 'string' ? note.trim() : null,
  });

  return sendSuccess(res, updated);
}

/**
 * GET /api/inventory/movements
 * Movement history for the authenticated business.
 * Query: productId, reason, limit, offset
 */
export async function listMovements(req, res) {
  const { productId, reason, limit: rawLimit, offset: rawOffset } = req.query;

  if (productId && !isValidUuid(productId)) {
    throw ApiError.badRequest('Invalid productId format (must be a valid UUID)', { field: 'productId' });
  }

  const parsedLimit = rawLimit !== undefined ? parseInt(rawLimit, 10) : 50;
  if (rawLimit !== undefined && (Number.isNaN(parsedLimit) || parsedLimit <= 0)) {
    throw ApiError.badRequest('Limit must be a positive integer', { field: 'limit' });
  }
  const limit = Math.min(parsedLimit || 50, 100);

  const parsedOffset = rawOffset !== undefined ? parseInt(rawOffset, 10) : 0;
  if (rawOffset !== undefined && (Number.isNaN(parsedOffset) || parsedOffset < 0)) {
    throw ApiError.badRequest('Offset must be a non-negative integer', { field: 'offset' });
  }
  const offset = parsedOffset || 0;

  const validReasons = ['INITIAL_STOCK', 'SALE', 'ORDER_DISPATCHED', 'ORDER_DELIVERED', 'MANUAL_ADJUSTMENT'];
  if (reason && !validReasons.includes(reason.toUpperCase())) {
    throw ApiError.badRequest(`Invalid reason. Allowed: ${validReasons.join(', ')}`, { field: 'reason' });
  }

  const { items, total } = await inventoryService.listStockMovements(req.user, {
    productId: productId || null,
    reason: reason ? reason.toUpperCase() : null,
    limit,
    offset,
  });

  return sendSuccess(res, items, 200, { total, limit, offset });
}

/**
 * GET /api/inventory/reorder-rules
 * Retailer's reorder rules for all stocked products.
 */
export async function listReorderRules(req, res) {
  const rules = await inventoryService.listReorderRules(req.user);
  return sendSuccess(res, rules);
}

/**
 * PUT /api/inventory/reorder-rules (and PUT /api/inventory/reorder-rules/:productId)
 * Upsert reorder rule for a product.
 * Body: { productId?, minStock, reorderQuantity, leadTimeDays? }
 */
export async function upsertReorderRule(req, res) {
  const targetProductId = req.params?.productId || req.body?.productId;

  if (!targetProductId || !isValidUuid(targetProductId)) {
    throw ApiError.badRequest('Valid productId (UUID) is required', { field: 'productId' });
  }

  const { minStock, reorderQuantity, leadTimeDays } = req.body ?? {};

  const parsedMinStock = minStock !== undefined ? Number(minStock) : 10;
  if (!Number.isInteger(parsedMinStock) || parsedMinStock < 0) {
    throw ApiError.badRequest('minStock must be a non-negative integer', { field: 'minStock' });
  }

  const parsedReorderQty = reorderQuantity !== undefined ? Number(reorderQuantity) : 20;
  if (!Number.isInteger(parsedReorderQty) || parsedReorderQty <= 0) {
    throw ApiError.badRequest('reorderQuantity must be a positive integer (> 0)', { field: 'reorderQuantity' });
  }

  const parsedLeadTime = leadTimeDays !== undefined ? Number(leadTimeDays) : 3;
  if (!Number.isInteger(parsedLeadTime) || parsedLeadTime < 1 || parsedLeadTime > 60) {
    throw ApiError.badRequest('leadTimeDays must be an integer between 1 and 60', { field: 'leadTimeDays' });
  }

  const rule = await inventoryService.saveReorderRule(req.user, {
    productId: targetProductId,
    minStock: parsedMinStock,
    reorderQuantity: parsedReorderQty,
    leadTimeDays: parsedLeadTime,
  });

  return sendSuccess(res, rule);
}
