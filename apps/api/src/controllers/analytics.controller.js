/**
 * analytics controller — OWNER: Member 4 — Notifications & Analytics
 *
 * Controllers are thin: read req (params, query, body, req.user), validate
 * input, call the service, and respond with sendSuccess(). No SQL here.
 */
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import * as analyticsService from '../services/analytics.service.js';

function getBusinessInfo(req) {
  const businessId = req.user?.businessId;
  const role = req.user?.role;

  if (!businessId) {
    throw ApiError.unauthorized('No business associated with current user session');
  }
  if (!role) {
    throw ApiError.unauthorized('User role is required');
  }

  return { businessId, role };
}

/**
 * GET /api/analytics/sales-trend
 * Query params: ?days=30
 */
export async function getSalesTrend(req, res) {
  const { businessId, role } = getBusinessInfo(req);
  const { days } = req.query;

  const data = await analyticsService.getSalesTrend(businessId, role, { days });
  return sendSuccess(res, data);
}

/**
 * GET /api/analytics/top-products
 * Query params: ?limit=10
 */
export async function getTopProducts(req, res) {
  const { businessId, role } = getBusinessInfo(req);
  const { limit } = req.query;

  const data = await analyticsService.getTopProducts(businessId, role, { limit });
  return sendSuccess(res, data);
}

/**
 * GET /api/analytics/orders-summary
 * Query params: ?days=
 */
export async function getOrdersSummary(req, res) {
  const { businessId, role } = getBusinessInfo(req);
  const { days } = req.query;

  const data = await analyticsService.getOrdersSummary(businessId, role, { days });
  return sendSuccess(res, data);
}

// Aliases
export const salesTrend = getSalesTrend;
export const topProducts = getTopProducts;
export const ordersSummary = getOrdersSummary;
