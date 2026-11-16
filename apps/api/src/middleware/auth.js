/**
 * Authentication & role middleware (Supabase Auth).
 *
 * Flow:
 *   1. Frontend signs the user in with Supabase Auth and gets an access token (JWT).
 *   2. Frontend calls the API with header:  Authorization: Bearer <access_token>
 *   3. requireAuth verifies the token with Supabase, then loads the user's
 *      profile + business from PostgreSQL and attaches it to req.user:
 *
 *        req.user = { id, email, fullName, businessId, businessName, role }
 *        // role is 'RETAILER' or 'WHOLESALER' (from businesses.type)
 *
 *   4. requireRole('RETAILER') blocks users of the other role.
 *
 * OWNER: Member 1 (Auth). Feature-specific rules such as "a retailer may only
 * read its own orders" belong in each module's service layer, not here.
 */
import { query } from '../db/pool.js';
import { getSupabase } from '../db/supabase.js';
import { ApiError } from '../utils/ApiError.js';

function readBearerToken(req) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/**
 * @param {object}  [options]
 * @param {boolean} [options.allowMissingProfile=false]
 *   true only for onboarding endpoints (e.g. POST /api/auth/register) where the
 *   Supabase user exists but has not created a business/profile yet.
 */
export function requireAuth({ allowMissingProfile = false } = {}) {
  return async (req, _res, next) => {
    const token = readBearerToken(req);
    if (!token) throw ApiError.unauthorized('Missing Authorization: Bearer <token> header');

    const { data, error } = await getSupabase().auth.getUser(token);
    if (error || !data?.user) throw ApiError.unauthorized('Invalid or expired session');

    const authUser = data.user;
    const { rows } = await query(
      `select p.id, p.full_name, p.email, b.id as business_id, b.name as business_name, b.type as role
         from profiles p
         join businesses b on b.id = p.business_id
        where p.id = $1`,
      [authUser.id],
    );

    const profile = rows[0];
    if (!profile && !allowMissingProfile) {
      throw ApiError.forbidden('Profile not found. Complete registration first.');
    }

    req.user = {
      id: authUser.id,
      email: authUser.email,
      fullName: profile?.full_name ?? null,
      businessId: profile?.business_id ?? null,
      businessName: profile?.business_name ?? null,
      role: profile?.role ?? null,
    };
    next();
  };
}

/** Usage: router.post('/', requireAuth(), requireRole('WHOLESALER'), controller.create) */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(`This action is only available to: ${roles.join(', ')}`);
    }
    next();
  };
}
