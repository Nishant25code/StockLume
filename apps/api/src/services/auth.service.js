/**
 * auth service — OWNER: Member 1 — Authentication, Connections & Products
 *
 * Supabase Auth handles passwords and sessions. This service links a Supabase
 * user to StockLume data: one row in `businesses` and one in `profiles`.
 * The user's role is NOT stored on the profile — it is businesses.type.
 */
import { query, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';

const BUSINESS_TYPES = ['RETAILER', 'WHOLESALER'];

// The shape returned by GET /auth/me and POST /auth/register.
async function loadCurrentUser(db, authUser) {
  const { rows } = await db.query(
    `select p.full_name, b.id as business_id, b.name as business_name, b.type as role,
            b.city, b.phone, b.address
       from profiles p
       join businesses b on b.id = p.business_id
      where p.id = $1`,
    [authUser.id],
  );
  const row = rows[0];
  return {
    id: authUser.id,
    email: authUser.email,
    fullName: row?.full_name ?? null,
    businessId: row?.business_id ?? null,
    businessName: row?.business_name ?? null,
    role: row?.role ?? null,
    business: row ? { id: row.business_id, name: row.business_name, type: row.role, city: row.city, phone: row.phone, address: row.address } : null,
    // true → the frontend sends the user to /onboarding to create their business
    needsOnboarding: !row,
  };
}

/** GET /auth/me — works before onboarding too (needsOnboarding: true). */
export function getMe(authUser) {
  return loadCurrentUser({ query }, authUser);
}

function cleanText(value, field, { required = false, max = 120 } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw ApiError.badRequest(`${field} is required`, { field });
    return null;
  }
  const text = String(value).trim();
  if (text.length > max) throw ApiError.badRequest(`${field} must be at most ${max} characters`, { field });
  return text;
}

/**
 * POST /auth/register — create the business + profile for the signed-in user,
 * in ONE transaction (both rows or neither).
 */
export async function register(authUser, body = {}) {
  const fullName = cleanText(body.fullName, 'fullName', { required: true, max: 80 });
  const businessName = cleanText(body.businessName, 'businessName', { required: true, max: 120 });
  const businessType = String(body.businessType ?? '').toUpperCase();
  if (!BUSINESS_TYPES.includes(businessType)) {
    throw ApiError.badRequest('businessType must be RETAILER or WHOLESALER', { field: 'businessType' });
  }
  const city = cleanText(body.city, 'city', { max: 80 });
  const phone = cleanText(body.phone, 'phone', { max: 30 });
  const address = cleanText(body.address, 'address', { max: 200 });

  if (!authUser.email) throw ApiError.badRequest('Your account has no email address');

  return withTransaction(async (client) => {
    // Lock-free duplicate check; the profiles primary key is the final guard.
    const existing = await client.query('select 1 from profiles where id = $1', [authUser.id]);
    if (existing.rowCount > 0) {
      throw ApiError.conflict('This account is already registered with a business');
    }

    const { rows } = await client.query(
      `insert into businesses (name, type, email, phone, address, city)
       values ($1, $2, $3, $4, $5, $6)
       returning id`,
      [businessName, businessType, authUser.email, phone, address, city],
    );

    await client.query(
      `insert into profiles (id, business_id, full_name, email)
       values ($1, $2, $3, $4)`,
      [authUser.id, rows[0].id, fullName, authUser.email],
    );

    return loadCurrentUser(client, authUser);
  });
}
