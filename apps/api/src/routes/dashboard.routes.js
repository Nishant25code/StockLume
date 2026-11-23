/**
 * dashboard routes — mounted at /api/dashboard
 * OWNER: Member 4 — Notifications & Analytics
 *
 * Endpoints:
 *   GET    /api/dashboard/retailer    KPI summary: stock value, low-stock count, open orders, recent sales
 *   GET    /api/dashboard/wholesaler  KPI summary: pending orders, revenue, connected retailers, top products
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as controller from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/retailer', requireAuth(), requireRole('RETAILER'), controller.getRetailerDashboard);
router.get('/wholesaler', requireAuth(), requireRole('WHOLESALER'), controller.getWholesalerDashboard);

export default router;
