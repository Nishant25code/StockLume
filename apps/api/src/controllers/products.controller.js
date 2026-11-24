/**
 * products controller — OWNER: Member 1 — Authentication, Connections & Products
 *
 * Reads req (params, query, body, req.user), validates input, calls productsService,
 * and responds with sendSuccess().
 */
import { sendSuccess } from '../utils/response.js';
import { ApiError } from '../utils/ApiError.js';
import * as productsService from '../services/products.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * GET /api/products
 * Wholesaler: returns own catalogue (paginated)
 * Retailer: returns active products of connected wholesalers (optional filter & search)
 */
export async function list(req, res) {
  const { limit: rawLimit, offset: rawOffset, wholesalerId, search } = req.query;

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

  if (wholesalerId && !isValidUuid(wholesalerId)) {
    throw ApiError.badRequest('Invalid wholesalerId format (must be a valid UUID)', { field: 'wholesalerId' });
  }

  const { items, total } = await productsService.listProducts(req.user, {
    limit,
    offset,
    wholesalerId: wholesalerId || null,
    search: search || null,
  });

  return sendSuccess(res, items, 200, { total, limit, offset });
}

/**
 * GET /api/products/:id
 * Product details (accessible by owning wholesaler or actively connected retailer).
 */
export async function getById(req, res) {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    throw ApiError.badRequest('Invalid product ID format (must be a valid UUID)', { field: 'id' });
  }

  const product = await productsService.getProductById(req.user, id);
  return sendSuccess(res, product);
}

/**
 * POST /api/products
 * Wholesaler creates a product.
 */
export async function create(req, res) {
  const { name, sku, category, unit, price, availableQuantity } = req.body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw ApiError.badRequest('Product name is required and cannot be empty', { field: 'name' });
  }

  if (!sku || typeof sku !== 'string' || !sku.trim()) {
    throw ApiError.badRequest('SKU is required and cannot be empty', { field: 'sku' });
  }

  if (price === undefined || price === null || typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    throw ApiError.badRequest('Price must be a valid non-negative number', { field: 'price' });
  }

  if (availableQuantity !== undefined && availableQuantity !== null) {
    if (!Number.isInteger(availableQuantity) || availableQuantity < 0) {
      throw ApiError.badRequest('Available quantity must be a non-negative integer', { field: 'availableQuantity' });
    }
  }

  if (unit !== undefined && unit !== null && (typeof unit !== 'string' || !unit.trim())) {
    throw ApiError.badRequest('Unit must be a valid non-empty string', { field: 'unit' });
  }

  if (category !== undefined && category !== null && typeof category !== 'string') {
    throw ApiError.badRequest('Category must be a string', { field: 'category' });
  }

  const product = await productsService.createProduct(req.user.businessId, {
    name,
    sku,
    category,
    unit,
    price,
    availableQuantity: availableQuantity ?? 0,
  });

  return sendSuccess(res, product, 201);
}

/**
 * PATCH /api/products/:id
 * Wholesaler updates an existing product.
 */
export async function update(req, res) {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    throw ApiError.badRequest('Invalid product ID format (must be a valid UUID)', { field: 'id' });
  }

  const body = req.body ?? {};
  const { name, category, unit, price, availableQuantity, isActive } = body;

  const hasUpdate = [name, category, unit, price, availableQuantity, isActive].some((v) => v !== undefined);
  if (!hasUpdate) {
    throw ApiError.badRequest('At least one field to update must be provided');
  }

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    throw ApiError.badRequest('Product name cannot be empty', { field: 'name' });
  }

  if (price !== undefined && (typeof price !== 'number' || Number.isNaN(price) || price < 0)) {
    throw ApiError.badRequest('Price must be a non-negative number', { field: 'price' });
  }

  if (availableQuantity !== undefined && (!Number.isInteger(availableQuantity) || availableQuantity < 0)) {
    throw ApiError.badRequest('Available quantity must be a non-negative integer', { field: 'availableQuantity' });
  }

  if (unit !== undefined && (typeof unit !== 'string' || !unit.trim())) {
    throw ApiError.badRequest('Unit must be a non-empty string', { field: 'unit' });
  }

  if (category !== undefined && category !== null && typeof category !== 'string') {
    throw ApiError.badRequest('Category must be a string', { field: 'category' });
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    throw ApiError.badRequest('isActive must be a boolean', { field: 'isActive' });
  }

  const updated = await productsService.updateProduct(req.user.businessId, id, {
    name,
    category,
    unit,
    price,
    availableQuantity,
    isActive,
  });

  return sendSuccess(res, updated);
}

/**
 * DELETE /api/products/:id
 * Wholesaler soft deletes (deactivates) a product.
 */
export async function remove(req, res) {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    throw ApiError.badRequest('Invalid product ID format (must be a valid UUID)', { field: 'id' });
  }

  const result = await productsService.deactivateProduct(req.user.businessId, id);
  return sendSuccess(res, result);
}
