// orders routes — mounted at /api/orders (R = retailer, W = wholesaler)
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as controller from '../controllers/orders.controller.js';

const router = Router();
const retailer = requireRole('RETAILER');
const wholesaler = requireRole('WHOLESALER');

// Every order route needs a logged-in user.
router.use(requireAuth());

// "/suggestions" must be declared before "/:id" routes.
router.post('/suggestions', retailer, controller.suggest);

// Both roles can read orders; the service limits what each one sees.
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', retailer, controller.create);
router.put('/:id/items', retailer, controller.replaceItems);

// Status changes: the retailer's actions first, then the wholesaler's.
router.post('/:id/submit', retailer, controller.submit);
router.post('/:id/cancel', retailer, controller.cancel);
router.post('/:id/accept', wholesaler, controller.accept);
router.post('/:id/reject', wholesaler, controller.reject);
router.post('/:id/dispatch', wholesaler, controller.dispatch);
router.post('/:id/deliver', retailer, controller.deliver);

export default router;
