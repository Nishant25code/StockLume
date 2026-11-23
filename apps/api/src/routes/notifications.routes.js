/**
 * notifications routes — mounted at /api/notifications
 * OWNER: Member 4 — Notifications & Analytics
 *
 * Endpoints:
 *   GET    /api/notifications               current business notifications (unread first)
 *   GET    /api/notifications/unread-count  unread count for header bell
 *   PATCH  /api/notifications/read-all      mark all notifications as read
 *   PATCH  /api/notifications/:id/read      mark one notification as read
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as controller from '../controllers/notifications.controller.js';

const router = Router();

router.get('/', requireAuth(), controller.list);
router.get('/unread-count', requireAuth(), controller.getUnreadCount);
router.patch('/read-all', requireAuth(), controller.markAllAsRead);
router.patch('/:id/read', requireAuth(), controller.markAsRead);

export default router;
