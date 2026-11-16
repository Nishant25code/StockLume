/**
 * inventory controller — OWNER: Member 2 — Inventory & Stock Prediction
 *
 * Controllers are thin: read req (params, query, body, req.user), validate
 * input, call the service, and respond with sendSuccess(). No SQL here.
 *
 *   import { sendSuccess } from '../utils/response.js';
 *   import * as inventoryService from '../services/inventory.service.js';
 *
 *   export async function list(req, res) {
 *     const items = await inventoryService.list(req.user.businessId);
 *     return sendSuccess(res, items);
 *   }
 */

export {};
