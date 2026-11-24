/**
 * products service — OWNER: Member 1 — Authentication, Connections & Products
 *
 * Business logic + SQL queries for Products (R6, R7, R8, W5, W6, W7).
 * Always uses parameterized queries and scopes queries to caller business ID.
 */
import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Maps a database product row (snake_case) to standard API format (camelCase).
 */
export function formatProduct(row) {
  if (!row) return null;
  const product = {
    id: row.id,
    wholesalerId: row.wholesaler_id,
    name: row.name,
    sku: row.sku,
    category: row.category ?? null,
    unit: row.unit,
    price: Number(row.price),
    availableQuantity: Number(row.available_quantity),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.wholesaler_name !== undefined) {
    product.wholesalerName = row.wholesaler_name;
  }
  return product;
}

/**
 * List products based on user role:
 * - WHOLESALER (R6): Lists own catalogue.
 * - RETAILER (R7): Lists active products of ACTIVE-connected wholesalers.
 */
export async function listProducts(user, { limit = 50, offset = 0, wholesalerId = null, search = null } = {}) {
  if (!user?.businessId) {
    throw ApiError.forbidden('User does not belong to a registered business');
  }

  const sanitizedSearch = search && search.trim() ? search.trim() : null;

  if (user.role === 'WHOLESALER') {
    // R6: GET /api/products (wholesaler) · own catalogue, paginated
    const sql = `
      SELECT p.id, p.wholesaler_id, p.name, p.sku, p.category, p.unit, p.price,
             p.available_quantity, p.is_active, p.created_at, p.updated_at,
             count(*) OVER () AS total
      FROM products p
      WHERE p.wholesaler_id = $1
        AND ($4::text IS NULL OR p.name ILIKE '%' || $4::text || '%' OR p.sku ILIKE '%' || $4::text || '%')
      ORDER BY p.name
      LIMIT $2 OFFSET $3;
    `;
    const { rows } = await query(sql, [user.businessId, limit, offset, sanitizedSearch]);
    const total = rows.length > 0 ? Number(rows[0].total) : 0;
    return {
      items: rows.map(formatProduct),
      total,
    };
  }

  if (user.role === 'RETAILER') {
    // R7: GET /api/products (retailer) · active products of ACTIVE-connected wholesalers
    const sql = `
      SELECT p.id, p.wholesaler_id, p.name, p.sku, p.category, p.unit, p.price,
             p.available_quantity, p.is_active, p.created_at, p.updated_at,
             w.id   AS wholesaler_id,
             w.name AS wholesaler_name,
             count(*) OVER () AS total
      FROM products p
      JOIN business_connections c ON c.wholesaler_id = p.wholesaler_id
                                 AND c.retailer_id   = $1
                                 AND c.status        = 'ACTIVE'
      JOIN businesses w           ON w.id = p.wholesaler_id
      WHERE p.is_active
        AND ($2::uuid IS NULL OR p.wholesaler_id = $2::uuid)
        AND ($3::text IS NULL OR p.name ILIKE '%' || $3::text || '%')
      ORDER BY p.name
      LIMIT $4 OFFSET $5;
    `;
    const { rows } = await query(sql, [user.businessId, wholesalerId || null, sanitizedSearch, limit, offset]);
    const total = rows.length > 0 ? Number(rows[0].total) : 0;
    return {
      items: rows.map(formatProduct),
      total,
    };
  }

  throw ApiError.forbidden('Only retailers and wholesalers can list products');
}

/**
 * R8: GET /api/products/:id · one product, only if caller may see it
 * (its own product, or a product of an ACTIVE-connected wholesaler).
 */
export async function getProductById(user, productId) {
  if (!user?.businessId) {
    throw ApiError.forbidden('User does not belong to a registered business');
  }

  const sql = `
    SELECT p.id, p.wholesaler_id, p.name, p.sku, p.category, p.unit,
           p.price, p.available_quantity, p.is_active, p.created_at, p.updated_at,
           w.name AS wholesaler_name
    FROM products p
    JOIN businesses w ON w.id = p.wholesaler_id
    WHERE p.id = $1
      AND (p.wholesaler_id = $2
           OR EXISTS (SELECT 1
                      FROM business_connections c
                      WHERE c.retailer_id   = $2
                        AND c.wholesaler_id = p.wholesaler_id
                        AND c.status        = 'ACTIVE'));
  `;
  const { rows } = await query(sql, [productId, user.businessId]);
  if (rows.length === 0) {
    throw ApiError.notFound('Product not found');
  }

  return formatProduct(rows[0]);
}

/**
 * W5: POST /api/products · wholesaler adds a product to catalogue.
 */
export async function createProduct(wholesalerId, { name, sku, category = null, unit = 'pcs', price, availableQuantity = 0 }) {
  if (!wholesalerId) {
    throw ApiError.forbidden('User does not belong to a registered wholesaler');
  }

  const sql = `
    INSERT INTO products (wholesaler_id, name, sku, category, unit, price, available_quantity)
    VALUES ($1, $2, $3, $4, coalesce($5, 'pcs'), $6, $7)
    RETURNING *;
  `;

  try {
    const { rows } = await query(sql, [
      wholesalerId,
      name.trim(),
      sku.trim(),
      category && category.trim() ? category.trim() : null,
      unit && unit.trim() ? unit.trim() : 'pcs',
      price,
      availableQuantity,
    ]);
    return formatProduct(rows[0]);
  } catch (err) {
    // Unique violation on (wholesaler_id, sku)
    if (err.code === '23505') {
      throw ApiError.conflict(`Product with SKU "${sku.trim()}" already exists in your catalogue`, { field: 'sku' });
    }
    throw err;
  }
}

/**
 * W6: PATCH /api/products/:id · update product fields (wholesaler only).
 */
export async function updateProduct(wholesalerId, productId, fields) {
  if (!wholesalerId) {
    throw ApiError.forbidden('User does not belong to a registered wholesaler');
  }

  const { name, category, unit, price, availableQuantity, isActive } = fields;

  const sql = `
    UPDATE products
    SET name               = coalesce($3, name),
        category           = coalesce($4, category),
        unit               = coalesce($5, unit),
        price              = coalesce($6, price),
        available_quantity = coalesce($7, available_quantity),
        is_active          = coalesce($8, is_active)
    WHERE id = $1
      AND wholesaler_id = $2
    RETURNING *;
  `;

  const params = [
    productId,
    wholesalerId,
    name !== undefined ? name.trim() : null,
    category !== undefined ? (category && category.trim() ? category.trim() : null) : null,
    unit !== undefined ? (unit && unit.trim() ? unit.trim() : null) : null,
    price !== undefined ? price : null,
    availableQuantity !== undefined ? availableQuantity : null,
    isActive !== undefined ? isActive : null,
  ];

  try {
    const { rows } = await query(sql, params);
    if (rows.length === 0) {
      const check = await query('SELECT wholesaler_id FROM products WHERE id = $1', [productId]);
      if (check.rows.length === 0) {
        throw ApiError.notFound('Product not found');
      }
      throw ApiError.forbidden('You do not have permission to modify this product');
    }
    return formatProduct(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      throw ApiError.conflict('Unique constraint violation when updating product', { error: err.message });
    }
    throw err;
  }
}

/**
 * W7: DELETE /api/products/:id · safe soft-delete (is_active = false).
 * Products are kept in the database so past orders, inventory, and sales maintain integrity.
 */
export async function deactivateProduct(wholesalerId, productId) {
  if (!wholesalerId) {
    throw ApiError.forbidden('User does not belong to a registered wholesaler');
  }

  const sql = `
    UPDATE products
    SET is_active = false
    WHERE id = $1
      AND wholesaler_id = $2
    RETURNING id, name, sku, is_active, updated_at;
  `;

  const { rows } = await query(sql, [productId, wholesalerId]);
  if (rows.length === 0) {
    const check = await query('SELECT wholesaler_id FROM products WHERE id = $1', [productId]);
    if (check.rows.length === 0) {
      throw ApiError.notFound('Product not found');
    }
    throw ApiError.forbidden('You do not have permission to delete this product');
  }

  return {
    id: rows[0].id,
    name: rows[0].name,
    sku: rows[0].sku,
    isActive: rows[0].is_active,
    updatedAt: rows[0].updated_at,
    message: 'Product successfully deactivated',
  };
}
