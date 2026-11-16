/**
 * notifications controller — OWNER: Member 4 — Notifications & Analytics
 *
 * Controllers are thin: read req (params, query, body, req.user), validate
 * input, call the service, and respond with sendSuccess(). No SQL here.
 *
 *   import { sendSuccess } from '../utils/response.js';
 *   import * as notificationsService from '../services/notifications.service.js';
 *
 *   export async function list(req, res) {
 *     const items = await notificationsService.list(req.user.businessId);
 *     return sendSuccess(res, items);
 *   }
 */

export {};
