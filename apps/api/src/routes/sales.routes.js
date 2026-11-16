/**
 * sales routes — mounted at /api/sales
 * OWNER: Member 2 — Inventory & Stock Prediction
 *
 * Planned endpoints (see docs/API.md — keep both in sync):
 *   GET    /api/sales                       sales history (filters: productId, from, to)
 *   POST   /api/sales                       record a sale → reduce inventory → SALE movement (one transaction)
 *   POST   /api/sales/simulate              generate demo sales for the college demo
 *
 * Pattern:
 *   import { requireAuth, requireRole } from '../middleware/auth.js';
 *   import * as controller from '../controllers/sales.controller.js';
 *   router.get('/', requireAuth(), controller.list);
 */
import { Router } from 'express';

const router = Router();

// TODO(Member 2): add sales endpoints here.

export default router;
