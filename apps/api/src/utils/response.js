/**
 * Standard success response helper. Always use this instead of res.json()
 * so every endpoint returns the same shape:
 *
 *   { "success": true, "data": <anything>, "meta": { ...optional } }
 *
 * Example:  return sendSuccess(res, product, 201);
 *           return sendSuccess(res, products, 200, { total: 42 });
 */
export function sendSuccess(res, data, statusCode = 200, meta) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
}
