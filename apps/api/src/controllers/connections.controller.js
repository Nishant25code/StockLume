/**
 * connections controller — OWNER: Member 1 — Authentication, Connections & Products
 *
 * Controllers are thin: read req (params, query, body, req.user), validate
 * input, call the service, and respond with sendSuccess(). No SQL here.
 *
 *   import { sendSuccess } from '../utils/response.js';
 *   import * as connectionsService from '../services/connections.service.js';
 *
 *   export async function list(req, res) {
 *     const items = await connectionsService.list(req.user.businessId);
 *     return sendSuccess(res, items);
 *   }
 */

export {};
