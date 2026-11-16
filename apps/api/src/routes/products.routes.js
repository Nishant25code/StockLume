/**
 * products routes — mounted at /api/products
 * OWNER: Member 1 — Authentication, Connections & Products
 *
 * Planned endpoints (see docs/API.md — keep both in sync):
 *   GET    /api/products                    wholesaler: own catalogue | retailer: products of connected wholesalers
 *   GET    /api/products/:id
 *   POST   /api/products                    wholesaler only
 *   PATCH  /api/products/:id                wholesaler only (price, available_quantity, is_active)
 *   DELETE /api/products/:id                wholesaler only (soft delete: is_active = false)
 *
 * Pattern:
 *   import { requireAuth, requireRole } from '../middleware/auth.js';
 *   import * as controller from '../controllers/products.controller.js';
 *   router.get('/', requireAuth(), controller.list);
 */
import { Router } from 'express';

const router = Router();

// TODO(Member 1): add products endpoints here.

export default router;
