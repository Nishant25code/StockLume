/**
 * orders routes — mounted at /api/orders
 * OWNER: Member 3 — Orders & Fulfillment
 *
 * Planned endpoints (see docs/API.md — keep both in sync):
 *   POST   /api/orders/suggestions          build DRAFT orders (one per wholesaler) from low-stock items
 *   GET    /api/orders                      retailer: own orders | wholesaler: own orders EXCEPT DRAFT
 *   GET    /api/orders/:id                  order + items
 *   POST   /api/orders                      retailer creates an empty DRAFT
 *   PUT    /api/orders/:id/items            retailer edits items of a DRAFT (add/remove/change qty)
 *   POST   /api/orders/:id/submit           DRAFT → SUBMITTED (only now the wholesaler is notified)
 *   POST   /api/orders/:id/cancel           retailer: DRAFT/SUBMITTED → CANCELLED
 *   POST   /api/orders/:id/accept           wholesaler: SUBMITTED → ACCEPTED
 *   POST   /api/orders/:id/reject           wholesaler: SUBMITTED → REJECTED
 *   POST   /api/orders/:id/dispatch         wholesaler: ACCEPTED → DISPATCHED (reduces products.available_quantity)
 *   POST   /api/orders/:id/deliver          retailer: DISPATCHED → DELIVERED (increases inventory)
 *
 * Pattern:
 *   import { requireAuth, requireRole } from '../middleware/auth.js';
 *   import * as controller from '../controllers/orders.controller.js';
 *   router.get('/', requireAuth(), controller.list);
 */
import { Router } from 'express';

const router = Router();

// TODO(Member 3): add orders endpoints here.

export default router;
