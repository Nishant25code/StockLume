/**
 * predictions routes — mounted at /api/predictions
 * OWNER: Member 2 — Inventory & Stock Prediction
 *
 * Planned endpoints (see docs/API.md — keep both in sync):
 *   GET    /api/predictions/stockout        stockout probability per product (see docs/STOCKOUT_MODEL.md)
 *   GET    /api/predictions/low-stock       products at MEDIUM/HIGH risk (creates LOW_STOCK notifications)
 *
 * Pattern:
 *   import { requireAuth, requireRole } from '../middleware/auth.js';
 *   import * as controller from '../controllers/predictions.controller.js';
 *   router.get('/', requireAuth(), controller.list);
 */
import { Router } from 'express';

const router = Router();

// TODO(Member 2): add predictions endpoints here.

export default router;
