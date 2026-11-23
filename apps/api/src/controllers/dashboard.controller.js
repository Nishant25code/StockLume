/**
 * dashboard controller — OWNER: Member 4 — Notifications & Analytics
 *
 * Controllers are thin: read req (params, query, body, req.user), validate
 * input, call the service, and respond with sendSuccess(). No SQL here.
 */
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import * as dashboardService from '../services/dashboard.service.js';

function getBusinessId(req) {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw ApiError.unauthorized('No business associated with current user session');
  }
  return businessId;
}

/**
 * GET /api/dashboard/retailer
 * Returns retailer KPIs: stock value, low-stock count, open orders, sales (7d).
 */
export async function getRetailerDashboard(req, res) {
  const businessId = getBusinessId(req);
  const data = await dashboardService.getRetailerDashboard(businessId);
  return sendSuccess(res, data);
}

/**
 * GET /api/dashboard/wholesaler
 * Returns wholesaler KPIs: pending orders, revenue, connected retailers, top products.
 */
export async function getWholesalerDashboard(req, res) {
  const businessId = getBusinessId(req);
  const data = await dashboardService.getWholesalerDashboard(businessId);
  return sendSuccess(res, data);
}

// Aliases
export const retailer = getRetailerDashboard;
export const wholesaler = getWholesalerDashboard;
