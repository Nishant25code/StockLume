/**
 * connections routes — mounted at /api/connections
 * OWNER: Member 1 — Authentication, Connections & Products
 *
 * Endpoints:
 *   GET    /api/connections                 retailer: my wholesalers | wholesaler: my retailers
 *   GET    /api/connections/discover        businesses of opposite role not connected yet
 *   POST   /api/connections                 create a connection / request
 *   PATCH  /api/connections/:id             update status (accept, deactivate, etc.)
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as controller from '../controllers/connections.controller.js';

const router = Router();

router.get('/', requireAuth(), controller.list);
router.get('/discover', requireAuth(), controller.discover);
router.post('/', requireAuth(), requireRole('RETAILER'), controller.create);
router.patch('/:id', requireAuth(), controller.updateStatus);

export default router;
