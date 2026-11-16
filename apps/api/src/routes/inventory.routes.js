/**
 * inventory routes — mounted at /api/inventory
 * OWNER: Member 2 — Inventory & Stock Prediction
 *
 * Planned endpoints (see docs/API.md — keep both in sync):
 *   GET    /api/inventory                   retailer stock list (joined with products)
 *   POST   /api/inventory                   add a product to retailer inventory (INITIAL_STOCK movement)
 *   PATCH  /api/inventory/:id/adjust        manual adjustment (MANUAL_ADJUSTMENT movement)
 *   GET    /api/inventory/movements         stock movement history
 *   GET    /api/inventory/reorder-rules
 *   PUT    /api/inventory/reorder-rules/:productId   create/update a rule
 *
 * Pattern:
 *   import { requireAuth, requireRole } from '../middleware/auth.js';
 *   import * as controller from '../controllers/inventory.controller.js';
 *   router.get('/', requireAuth(), controller.list);
 */
import { Router } from 'express';

const router = Router();

// TODO(Member 2): add inventory endpoints here.

export default router;
