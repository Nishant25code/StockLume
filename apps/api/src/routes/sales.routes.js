// sales routes — mounted at /api/sales (retailers only)
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as controller from '../controllers/sales.controller.js';

const router = Router();

// Only a logged-in retailer can use these routes.
router.use(requireAuth(), requireRole('RETAILER'));

router.get('/', controller.list);
router.post('/', controller.create);
router.post('/simulate', controller.simulate);

export default router;
