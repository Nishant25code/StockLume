// predictions routes — mounted at /api/predictions (retailers only)
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as controller from '../controllers/predictions.controller.js';

const router = Router();

// Only a logged-in retailer can use these routes.
router.use(requireAuth(), requireRole('RETAILER'));

router.get('/stockout', controller.stockout);
router.get('/low-stock', controller.lowStock);

export default router;
