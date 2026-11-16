/**
 * connections routes — mounted at /api/connections
 * OWNER: Member 1 — Authentication, Connections & Products
 *
 * Planned endpoints (see docs/API.md — keep both in sync):
 *   GET    /api/connections                 retailer: my wholesalers | wholesaler: my retailers
 *   GET    /api/connections/discover        businesses of the opposite role to connect with
 *   POST   /api/connections                 retailer requests a connection to a wholesaler
 *   PATCH  /api/connections/:id             wholesaler accepts / deactivates a connection
 *
 * Pattern:
 *   import { requireAuth, requireRole } from '../middleware/auth.js';
 *   import * as controller from '../controllers/connections.controller.js';
 *   router.get('/', requireAuth(), controller.list);
 */
import { Router } from 'express';

const router = Router();

// TODO(Member 1): add connections endpoints here.

export default router;
