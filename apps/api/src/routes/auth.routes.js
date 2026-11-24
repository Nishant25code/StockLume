/**
 * auth routes — mounted at /api/auth
 * OWNER: Member 1 — Authentication, Connections & Products
 *
 *   GET  /api/auth/me        current user, business and role (needsOnboarding if no business yet)
 *   POST /api/auth/register  create business + profile for the signed-in Supabase user
 *
 * Both accept a signed-in Supabase user who has not registered a business yet.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as controller from '../controllers/auth.controller.js';

const router = Router();

router.use(requireAuth({ allowMissingProfile: true }));

router.get('/me', controller.me);
router.post('/register', controller.register);

export default router;
