/**
 * inventory routes — mounted at /api/inventory
 * OWNER: Member 2 — Inventory & Stock Prediction
 *
 * Endpoints:
 *   GET    /api/inventory                          retailer stock list joined with products & reorder rules
 *   POST   /api/inventory                          add product to retailer inventory (INITIAL_STOCK)
 *   PATCH  /api/inventory/:id/adjust               manual stock adjustment (MANUAL_ADJUSTMENT)
 *   GET    /api/inventory/movements                stock movement history
 *   GET    /api/inventory/reorder-rules            all configured reorder rules
 *   PUT    /api/inventory/reorder-rules            upsert reorder rule (body: { productId, ... })
 *   PUT    /api/inventory/reorder-rules/:productId upsert reorder rule (param: productId)
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as controller from '../controllers/inventory.controller.js';

const router = Router();

// Defined in order so static subpaths (/movements, /reorder-rules) take precedence
router.get('/', requireAuth(), requireRole('RETAILER'), controller.list);
router.post('/', requireAuth(), requireRole('RETAILER'), controller.create);

router.get('/movements', requireAuth(), controller.listMovements);

router.get('/reorder-rules', requireAuth(), requireRole('RETAILER'), controller.listReorderRules);
router.put('/reorder-rules', requireAuth(), requireRole('RETAILER'), controller.upsertReorderRule);
router.put('/reorder-rules/:productId', requireAuth(), requireRole('RETAILER'), controller.upsertReorderRule);

router.patch('/:id/adjust', requireAuth(), requireRole('RETAILER'), controller.adjust);

export default router;
