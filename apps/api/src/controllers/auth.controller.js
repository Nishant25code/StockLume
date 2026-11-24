/**
 * auth controller — OWNER: Member 1 — Authentication, Connections & Products
 */
import { sendSuccess } from '../utils/response.js';
import * as authService from '../services/auth.service.js';

// requireAuth({ allowMissingProfile: true }) puts the Supabase user on req.user.
const authUserOf = (req) => ({ id: req.user.id, email: req.user.email });

export async function me(req, res) {
  return sendSuccess(res, await authService.getMe(authUserOf(req)));
}

export async function register(req, res) {
  return sendSuccess(res, await authService.register(authUserOf(req), req.body ?? {}), 201);
}
