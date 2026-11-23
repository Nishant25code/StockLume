/**
 * analytics routes — mounted at /api/analytics
 * OWNER: Member 4 — Notifications & Analytics
 *
 * Endpoints:
 *   GET    /api/analytics/sales-trend       daily sales totals (chart data)
 *   GET    /api/analytics/top-products      best sellers (R: by sales, W: by ordered quantity)
 *   GET    /api/analytics/orders-summary    order counts by status
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as controller from '../controllers/analytics.controller.js';

const router = Router();

router.get('/sales-trend', requireAuth(), controller.getSalesTrend);
router.get('/top-products', requireAuth(), controller.getTopProducts);
router.get('/orders-summary', requireAuth(), controller.getOrdersSummary);

export default router;
