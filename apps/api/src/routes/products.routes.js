/**
 * products routes — mounted at /api/products
 * OWNER: Member 1 — Authentication, Connections & Products
 *
 * Endpoints:
 *   GET    /api/products                    wholesaler: own catalogue | retailer: products of connected wholesalers
 *   GET    /api/products/:id                product details (if owner or actively connected retailer)
 *   POST   /api/products                    wholesaler only: create a product
 *   PATCH  /api/products/:id                wholesaler only: update product fields
 *   DELETE /api/products/:id                wholesaler only: soft delete (is_active = false)
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as controller from '../controllers/products.controller.js';

const router = Router();

router.get('/', requireAuth(), controller.list);
router.get('/:id', requireAuth(), controller.getById);
router.post('/', requireAuth(), requireRole('WHOLESALER'), controller.create);
router.patch('/:id', requireAuth(), requireRole('WHOLESALER'), controller.update);
router.delete('/:id', requireAuth(), requireRole('WHOLESALER'), controller.remove);

export default router;
