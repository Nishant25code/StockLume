/**
 * GET /api/health — shared, owned by the team lead.
 * Used to check the API is running and whether the database is reachable.
 */
import { Router } from 'express';
import { checkDatabase } from '../db/pool.js';
import { isSupabaseConfigured } from '../db/supabase.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

router.get('/', async (_req, res) => {
  const database = await checkDatabase();
  return sendSuccess(res, {
    status: 'ok',
    service: 'stocklume-api',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    checks: {
      database, // connected | not_configured | error
      supabaseAuth: isSupabaseConfigured() ? 'configured' : 'not_configured',
    },
  });
});

export default router;
