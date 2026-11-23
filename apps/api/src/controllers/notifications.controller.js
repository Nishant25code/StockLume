/**
 * notifications controller — OWNER: Member 4 — Notifications & Analytics
 *
 * Controllers are thin: read req (params, query, body, req.user), validate
 * input, call the service, and respond with sendSuccess(). No SQL here.
 */
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import * as notificationsService from '../services/notifications.service.js';

function getBusinessId(req) {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw ApiError.unauthorized('No business associated with current user session');
  }
  return businessId;
}

/**
 * GET /api/notifications
 * Lists current business notifications (unread first).
 * Query params: ?unread=true, ?limit=50, ?offset=0
 */
export async function list(req, res) {
  const businessId = getBusinessId(req);
  const { unread, limit, offset } = req.query;

  const result = await notificationsService.listNotifications(businessId, {
    unread,
    limit,
    offset,
  });

  return sendSuccess(res, result, 200, {
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  });
}

/**
 * GET /api/notifications/unread-count
 * Returns `{ count }` for the header bell.
 */
export async function getUnreadCount(req, res) {
  const businessId = getBusinessId(req);
  const data = await notificationsService.getUnreadCount(businessId);
  return sendSuccess(res, data);
}

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 */
export async function markAsRead(req, res) {
  const businessId = getBusinessId(req);
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Notification ID is required');
  }

  const updated = await notificationsService.markAsRead(businessId, id);
  return sendSuccess(res, updated);
}

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications for the current business as read.
 */
export async function markAllAsRead(req, res) {
  const businessId = getBusinessId(req);
  const result = await notificationsService.markAllAsRead(businessId);
  return sendSuccess(res, result);
}

// Aliases for compatibility
export const listNotifications = list;
export const unreadCount = getUnreadCount;
export const markOneAsRead = markAsRead;
