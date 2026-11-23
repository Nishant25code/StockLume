/**
 * notifications service — OWNER: Member 4 — Notifications & Analytics
 *
 * Business logic + SQL lives here. Always use parameterized queries and
 * always scope queries to the caller's business (req.user.businessId).
 */
import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';

export const NOTIFICATION_TYPES = [
  'LOW_STOCK',
  'CONNECTION_REQUEST',
  'CONNECTION_ACCEPTED',
  'ORDER_SUBMITTED',
  'ORDER_ACCEPTED',
  'ORDER_REJECTED',
  'ORDER_DISPATCHED',
  'ORDER_DELIVERED',
  'ORDER_CANCELLED',
];

/**
 * Format a raw database row into camelCase JSON structure.
 */
export function formatNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    businessId: row.business_id,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedOrderId: row.related_order_id ?? null,
    relatedProductId: row.related_product_id ?? null,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

/**
 * Create a notification for a business.
 * Accepts an optional transaction client as the first parameter (or falls back to `query` from db/pool.js).
 * Can be called as:
 *   createNotification(client, { businessId, type, title, message, relatedOrderId, relatedProductId })
 *   createNotification(null, { businessId, type, ... })
 *   createNotification({ businessId, type, ... })
 *
 * @param {import('pg').PoolClient|object} [clientOrData]
 * @param {object} [maybeData]
 */
export async function createNotification(clientOrData, maybeData) {
  let dbClient = null;
  let payload = null;

  if (clientOrData && typeof clientOrData.query === 'function') {
    dbClient = clientOrData;
    payload = maybeData || {};
  } else if (clientOrData && !maybeData && typeof clientOrData === 'object') {
    payload = clientOrData;
  } else {
    payload = maybeData || {};
  }

  const {
    businessId,
    type,
    title,
    message,
    relatedOrderId = null,
    relatedProductId = null,
  } = payload;

  if (!businessId) {
    throw ApiError.badRequest('businessId is required');
  }
  if (!type) {
    throw ApiError.badRequest('type is required');
  }
  if (!NOTIFICATION_TYPES.includes(type)) {
    throw ApiError.badRequest(`Invalid notification type: ${type}`);
  }
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw ApiError.badRequest('title is required');
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw ApiError.badRequest('message is required');
  }

  const queryFn = dbClient ? (text, params) => dbClient.query(text, params) : query;

  const { rows } = await queryFn(
    `insert into notifications (business_id, type, title, message, related_order_id, related_product_id)
     values ($1, $2, $3, $4, $5, $6)
     returning id, business_id, type, title, message, related_order_id, related_product_id, is_read, created_at`,
    [
      businessId,
      type,
      title.trim(),
      message.trim(),
      relatedOrderId || null,
      relatedProductId || null,
    ],
  );

  return formatNotification(rows[0]);
}

/**
 * List notifications for a business, ordered unread first (is_read ASC, created_at DESC).
 *
 * @param {string} businessId
 * @param {object} [options]
 * @param {boolean|string} [options.unread] - filter to only unread notifications if true
 * @param {number|string} [options.limit] - max results (default 50, max 200)
 * @param {number|string} [options.offset] - pagination offset (default 0)
 */
export async function listNotifications(businessId, options = {}) {
  if (!businessId) {
    throw ApiError.badRequest('businessId is required');
  }

  const isUnreadFilter = options.unread === true || options.unread === 'true';

  const limitNum = parseInt(options.limit, 10);
  const offsetNum = parseInt(options.offset, 10);

  const limit = Number.isInteger(limitNum) && limitNum > 0 ? Math.min(limitNum, 200) : 50;
  const offset = Number.isInteger(offsetNum) && offsetNum >= 0 ? offsetNum : 0;

  const whereClause = isUnreadFilter
    ? 'where business_id = $1 and is_read = false'
    : 'where business_id = $1';

  const listSql = `
    select id, business_id, type, title, message, related_order_id, related_product_id, is_read, created_at
      from notifications
     ${whereClause}
     order by is_read asc, created_at desc
     limit $2 offset $3
  `;

  const countSql = `
    select count(*) as total
      from notifications
     ${whereClause}
  `;

  const [listResult, countResult] = await Promise.all([
    query(listSql, [businessId, limit, offset]),
    query(countSql, [businessId]),
  ]);

  const total = Number(countResult.rows[0]?.total ?? 0);
  const items = listResult.rows.map(formatNotification);

  // Attach metadata to the array so callers can use either:
  // Array format: items (Array.isArray(items) === true)
  // Object destructuring: const { notifications, total, limit, offset } = items
  items.total = total;
  items.limit = limit;
  items.offset = offset;
  items.notifications = items;

  return items;
}

/**
 * Count unread notifications for a business.
 *
 * @param {string} businessId
 * @returns {Promise<{ count: number }>}
 */
export async function getUnreadCount(businessId) {
  if (!businessId) {
    throw ApiError.badRequest('businessId is required');
  }

  const { rows } = await query(
    `select count(*) as count
       from notifications
      where business_id = $1
        and is_read = false`,
    [businessId],
  );

  return { count: Number(rows[0]?.count ?? 0) };
}

/**
 * Mark a single notification as read, scoped strictly to the businessId.
 * If the notification does not exist or belongs to another business, throws 404.
 *
 * @param {string|object} arg1 - businessId or { businessId, id }
 * @param {string} [arg2] - notificationId
 */
export async function markAsRead(arg1, arg2) {
  let businessId;
  let notificationId;

  if (arg1 && typeof arg1 === 'object') {
    businessId = arg1.businessId;
    notificationId = arg1.id ?? arg1.notificationId;
  } else {
    businessId = arg1;
    notificationId = arg2;
  }

  if (!businessId || !notificationId) {
    throw ApiError.badRequest('Both businessId and notificationId are required');
  }

  const { rows } = await query(
    `update notifications
        set is_read = true
      where (id = $1 and business_id = $2)
         or (id = $2 and business_id = $1)
      returning id, business_id, type, title, message, related_order_id, related_product_id, is_read, created_at`,
    [notificationId, businessId],
  );

  if (rows.length === 0) {
    throw ApiError.notFound('Notification not found');
  }

  return formatNotification(rows[0]);
}

/**
 * Mark all notifications for a business as read.
 *
 * @param {string|object} businessId
 * @returns {Promise<{ count: number, updatedCount: number }>}
 */
export async function markAllAsRead(businessId) {
  const bId = businessId && typeof businessId === 'object' ? businessId.businessId : businessId;
  if (!bId) {
    throw ApiError.badRequest('businessId is required');
  }

  const result = await query(
    `update notifications
        set is_read = true
      where business_id = $1
        and is_read = false`,
    [bId],
  );

  const count = Number(result.rowCount ?? 0);
  return { count, updatedCount: count };
}

// Aliases for convenience
export const list = listNotifications;
export const unreadCount = getUnreadCount;
export const markOneAsRead = markAsRead;
export const markNotificationAsRead = markAsRead;
export const markAllNotificationsAsRead = markAllAsRead;
