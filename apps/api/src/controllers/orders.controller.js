/**
 * orders controller — OWNER: Member 3 — Orders & Fulfillment
 *
 * Controllers are thin: read req (params, query, body, req.user), validate
 * input, call the service, and respond with sendSuccess(). No SQL here.
 *
 *   import { sendSuccess } from '../utils/response.js';
 *   import * as ordersService from '../services/orders.service.js';
 *
 *   export async function list(req, res) {
 *     const items = await ordersService.list(req.user.businessId);
 *     return sendSuccess(res, items);
 *   }
 */

export {};
