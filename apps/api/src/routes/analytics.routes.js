/**
 * analytics routes — mounted at /api/analytics
 * OWNER: Member 4 — Notifications & Analytics
 *
 * Planned endpoints (see docs/API.md — keep both in sync):
 *   GET    /api/analytics/sales-trend       daily sales totals (chart data)
 *   GET    /api/analytics/top-products
 *   GET    /api/analytics/orders-summary    order counts by status
 *
 * Pattern:
 *   import { requireAuth, requireRole } from '../middleware/auth.js';
 *   import * as controller from '../controllers/analytics.controller.js';
 *   router.get('/', requireAuth(), controller.list);
 */
import { Router } from 'express';

const router = Router();

// TODO(Member 4): add analytics endpoints here.

export default router;
