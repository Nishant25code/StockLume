/**
 * dashboard routes — mounted at /api/dashboard
 * OWNER: Member 4 — Notifications & Analytics
 *
 * Planned endpoints (see docs/API.md — keep both in sync):
 *   GET    /api/dashboard/retailer          KPI summary: stock value, low-stock count, open orders, recent sales
 *   GET    /api/dashboard/wholesaler        KPI summary: pending orders, revenue, connected retailers, top products
 *
 * Pattern:
 *   import { requireAuth, requireRole } from '../middleware/auth.js';
 *   import * as controller from '../controllers/dashboard.controller.js';
 *   router.get('/', requireAuth(), controller.list);
 */
import { Router } from 'express';

const router = Router();

// TODO(Member 4): add dashboard endpoints here.

export default router;
