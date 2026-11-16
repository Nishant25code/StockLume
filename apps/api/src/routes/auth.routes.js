/**
 * auth routes — mounted at /api/auth
 * OWNER: Member 1 — Authentication, Connections & Products
 *
 * Planned endpoints (see docs/API.md — keep both in sync):
 *   POST   /api/auth/register   create business + profile for the signed-in Supabase user
 *   GET    /api/auth/me         current user, business and role
 *
 * Pattern:
 *   import { requireAuth, requireRole } from '../middleware/auth.js';
 *   import * as controller from '../controllers/auth.controller.js';
 *   router.get('/', requireAuth(), controller.list);
 */
import { Router } from 'express';

const router = Router();

// TODO(Member 1): add auth endpoints here.

export default router;
