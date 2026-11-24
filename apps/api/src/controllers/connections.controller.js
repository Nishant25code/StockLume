/**
 * connections controller — OWNER: Member 1 — Authentication, Connections & Products
 *
 * Thin controller layer: reads params/query/body/user, validates, delegates to service.
 */
import { sendSuccess } from '../utils/response.js';
import { ApiError } from '../utils/ApiError.js';
import * as connectionsService from '../services/connections.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * GET /api/connections
 * Lists connected business partners for the caller's business.
 * Query: status (optional: ACTIVE, PENDING, INACTIVE), limit, offset
 */
export async function list(req, res) {
  const { status, limit: rawLimit, offset: rawOffset } = req.query;

  const parsedLimit = rawLimit !== undefined ? parseInt(rawLimit, 10) : 50;
  if (rawLimit !== undefined && (Number.isNaN(parsedLimit) || parsedLimit <= 0)) {
    throw ApiError.badRequest('Limit must be a positive integer', { field: 'limit' });
  }
  const limit = Math.min(parsedLimit || 50, 100);

  const parsedOffset = rawOffset !== undefined ? parseInt(rawOffset, 10) : 0;
  if (rawOffset !== undefined && (Number.isNaN(parsedOffset) || parsedOffset < 0)) {
    throw ApiError.badRequest('Offset must be a non-negative integer', { field: 'offset' });
  }
  const offset = parsedOffset || 0;

  if (status && !['ACTIVE', 'PENDING', 'INACTIVE'].includes(status.toUpperCase())) {
    throw ApiError.badRequest('Invalid status filter. Allowed: ACTIVE, PENDING, INACTIVE', { field: 'status' });
  }

  const { items, total } = await connectionsService.listConnections(req.user, {
    status: status ? status.toUpperCase() : null,
    limit,
    offset,
  });

  return sendSuccess(res, items, 200, { total, limit, offset });
}

/**
 * GET /api/connections/discover
 * Discover prospective opposite-role business partners not yet connected.
 * Query: search, limit, offset
 */
export async function discover(req, res) {
  const { search, limit: rawLimit, offset: rawOffset } = req.query;

  const parsedLimit = rawLimit !== undefined ? parseInt(rawLimit, 10) : 50;
  if (rawLimit !== undefined && (Number.isNaN(parsedLimit) || parsedLimit <= 0)) {
    throw ApiError.badRequest('Limit must be a positive integer', { field: 'limit' });
  }
  const limit = Math.min(parsedLimit || 50, 100);

  const parsedOffset = rawOffset !== undefined ? parseInt(rawOffset, 10) : 0;
  if (rawOffset !== undefined && (Number.isNaN(parsedOffset) || parsedOffset < 0)) {
    throw ApiError.badRequest('Offset must be a non-negative integer', { field: 'offset' });
  }
  const offset = parsedOffset || 0;

  const { items, total } = await connectionsService.discoverPartners(req.user, {
    search: search || null,
    limit,
    offset,
  });

  return sendSuccess(res, items, 200, { total, limit, offset });
}

/**
 * POST /api/connections
 * Request/create a connection with an opposite-role business.
 * Initiated strictly by retailers; sets status to PENDING.
 * Body: { partnerId, status? }
 */
export async function create(req, res) {
  // Never trust client-supplied role or business context
  if (req.user?.role !== 'RETAILER') {
    throw ApiError.forbidden('Only retailers can initiate connection requests');
  }

  const { partnerId, wholesalerId, retailerId, status } = req.body ?? {};

  // Accept partnerId, or role-specific alias wholesalerId/retailerId
  const targetId = partnerId || wholesalerId || retailerId;

  if (!targetId || !isValidUuid(targetId)) {
    throw ApiError.badRequest('Valid partnerId (UUID) is required', { field: 'partnerId' });
  }

  // Reject attempts by a retailer to create an immediately ACTIVE connection
  if (status !== undefined && status !== null) {
    if (typeof status !== 'string') {
      throw ApiError.badRequest('Status must be a string', { field: 'status' });
    }
    const normalizedStatus = status.trim().toUpperCase();
    if (normalizedStatus === 'ACTIVE') {
      throw ApiError.badRequest('Retailers cannot create an immediately ACTIVE connection. Connection requests must be PENDING', { field: 'status' });
    }
    if (normalizedStatus !== 'PENDING') {
      throw ApiError.badRequest('Invalid status. New connection requests must have status PENDING', { field: 'status' });
    }
  }

  const connection = await connectionsService.createConnection(req.user, {
    partnerId: targetId,
    status: 'PENDING',
  });

  return sendSuccess(res, connection, 201);
}

/**
 * PATCH /api/connections/:id
 * Update connection status (accept, reject, or deactivate).
 * Body: { status }
 */
export async function updateStatus(req, res) {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    throw ApiError.badRequest('Invalid connection ID format (must be a valid UUID)', { field: 'id' });
  }

  const { status } = req.body ?? {};
  if (!status || typeof status !== 'string') {
    throw ApiError.badRequest('Status is required and must be a string', { field: 'status' });
  }

  const normalizedStatus = status.trim().toUpperCase();
  // Valid enum values per schema: PENDING, ACTIVE, INACTIVE
  if (!['ACTIVE', 'PENDING', 'INACTIVE'].includes(normalizedStatus)) {
    throw ApiError.badRequest('Invalid status. Allowed: ACTIVE, PENDING, INACTIVE', { field: 'status' });
  }

  // PATCH endpoint cannot transition connections into PENDING directly
  if (normalizedStatus === 'PENDING') {
    throw ApiError.badRequest('Connections cannot be transitioned to PENDING via PATCH. Require a fresh request workflow via POST /api/connections', { field: 'status' });
  }

  const updated = await connectionsService.updateConnectionStatus(req.user, id, normalizedStatus);
  return sendSuccess(res, updated);
}
