/**
 * notifications routes — mounted at /api/notifications
 * OWNER: Member 4 — Notifications & Analytics
 *
 * Planned endpoints (see docs/API.md — keep both in sync):
 *   GET    /api/notifications               current business notifications (unread first)
 *   GET    /api/notifications/unread-count
 *   PATCH  /api/notifications/:id/read
 *   PATCH  /api/notifications/read-all
 *
 * Pattern:
 *   import { requireAuth, requireRole } from '../middleware/auth.js';
 *   import * as controller from '../controllers/notifications.controller.js';
 *   router.get('/', requireAuth(), controller.list);
 */
import { Router } from 'express';

const router = Router();

// TODO(Member 4): add notifications endpoints here.

export default router;
