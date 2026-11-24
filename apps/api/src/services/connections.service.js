/**
 * connections service — OWNER: Member 1 — Authentication, Connections & Products
 *
 * Business logic + SQL queries for Connections (R3, R4, R5, W3, W4).
 * Always parameterized and scoped to the caller's authenticated business.
 */
import { query, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';

export function formatConnection(row) {
  if (!row) return null;
  return {
    id: row.connection_id || row.id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    retailerId: row.retailer_id,
    wholesalerId: row.wholesaler_id,
    partner: {
      id: row.partner_id,
      name: row.partner_name,
      type: row.partner_type,
      city: row.city ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      address: row.address ?? null,
    },
  };
}

/**
 * R3 / R4: List existing connections for caller's business.
 */
export async function listConnections(user, { status = null, limit = 50, offset = 0 } = {}) {
  if (!user?.businessId) {
    throw ApiError.forbidden('User does not belong to a registered business');
  }

  let sql;
  let params;

  if (user.role === 'RETAILER') {
    // R3: Retailer listing connected wholesalers
    sql = `
      SELECT c.id AS connection_id,
             c.retailer_id,
             c.wholesaler_id,
             c.status,
             c.created_at,
             c.updated_at,
             w.id   AS partner_id,
             w.name AS partner_name,
             w.type AS partner_type,
             w.city,
             w.phone,
             w.email,
             w.address,
             count(*) OVER () AS total
      FROM business_connections c
      JOIN businesses w ON w.id = c.wholesaler_id
      WHERE c.retailer_id = $1
        AND ($2::connection_status IS NULL OR c.status = $2::connection_status)
      ORDER BY w.name
      LIMIT $3 OFFSET $4;
    `;
    params = [user.businessId, status, limit, offset];
  } else if (user.role === 'WHOLESALER') {
    // R4: Wholesaler listing connected retailers
    sql = `
      SELECT c.id AS connection_id,
             c.retailer_id,
             c.wholesaler_id,
             c.status,
             c.created_at,
             c.updated_at,
             r.id   AS partner_id,
             r.name AS partner_name,
             r.type AS partner_type,
             r.city,
             r.phone,
             r.email,
             r.address,
             count(*) OVER () AS total
      FROM business_connections c
      JOIN businesses r ON r.id = c.retailer_id
      WHERE c.wholesaler_id = $1
        AND ($2::connection_status IS NULL OR c.status = $2::connection_status)
      ORDER BY r.name
      LIMIT $3 OFFSET $4;
    `;
    params = [user.businessId, status, limit, offset];
  } else {
    throw ApiError.forbidden('Only retailers and wholesalers have connections');
  }

  const { rows } = await query(sql, params);
  const total = rows.length > 0 ? Number(rows[0].total) : 0;
  return {
    items: rows.map(formatConnection),
    total,
  };
}

/**
 * R5: Discover businesses of opposite role not yet connected to caller.
 */
export async function discoverPartners(user, { search = null, limit = 50, offset = 0 } = {}) {
  if (!user?.businessId) {
    throw ApiError.forbidden('User does not belong to a registered business');
  }

  const oppositeType = user.role === 'RETAILER' ? 'WHOLESALER' : 'RETAILER';
  const sanitizedSearch = search && search.trim() ? search.trim() : null;

  let sql;
  let params;

  if (user.role === 'RETAILER') {
    sql = `
      SELECT b.id, b.name, b.type, b.city, b.phone, b.email, b.address,
             count(*) OVER () AS total
      FROM businesses b
      WHERE b.type = $2::business_type
        AND b.id <> $1
        AND NOT EXISTS (
          SELECT 1
          FROM business_connections c
          WHERE c.retailer_id = $1
            AND c.wholesaler_id = b.id
        )
        AND ($3::text IS NULL OR b.name ILIKE '%' || $3::text || '%' OR b.city ILIKE '%' || $3::text || '%')
      ORDER BY b.name
      LIMIT $4 OFFSET $5;
    `;
    params = [user.businessId, oppositeType, sanitizedSearch, limit, offset];
  } else {
    sql = `
      SELECT b.id, b.name, b.type, b.city, b.phone, b.email, b.address,
             count(*) OVER () AS total
      FROM businesses b
      WHERE b.type = $2::business_type
        AND b.id <> $1
        AND NOT EXISTS (
          SELECT 1
          FROM business_connections c
          WHERE c.wholesaler_id = $1
            AND c.retailer_id = b.id
        )
        AND ($3::text IS NULL OR b.name ILIKE '%' || $3::text || '%' OR b.city ILIKE '%' || $3::text || '%')
      ORDER BY b.name
      LIMIT $4 OFFSET $5;
    `;
    params = [user.businessId, oppositeType, sanitizedSearch, limit, offset];
  }

  const { rows } = await query(sql, params);
  const total = rows.length > 0 ? Number(rows[0].total) : 0;
  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      city: r.city ?? null,
      phone: r.phone ?? null,
      email: r.email ?? null,
      address: r.address ?? null,
    })),
    total,
  };
}

/**
 * W3: Request or establish a connection between retailer and wholesaler.
 * Strictly initiated by a retailer, creating a PENDING connection.
 * Cannot directly create an ACTIVE connection (Rule 1 & Rule 8).
 * Reactivating an INACTIVE connection initiates a fresh PENDING request (Rule 4).
 */
export async function createConnection(user, { partnerId, status = 'PENDING' }) {
  if (!user?.businessId) {
    throw ApiError.forbidden('User does not belong to a registered business');
  }

  // Never trust client-supplied business ID or role (Rule 6)
  // Only retailers can initiate connection requests (Rule 1)
  if (user.role !== 'RETAILER') {
    throw ApiError.forbidden('Only retailers can initiate connection requests');
  }

  // Do not allow a retailer to create an immediately ACTIVE connection by submitting status: "ACTIVE" (Rule 8)
  if (status && typeof status === 'string' && status.trim().toUpperCase() === 'ACTIVE') {
    throw ApiError.badRequest('Retailers cannot create an immediately ACTIVE connection. Connection requests must be PENDING');
  }

  // Valid enum values per schema: PENDING, ACTIVE, INACTIVE (Rule 9)
  const normalizedStatus = status ? status.trim().toUpperCase() : 'PENDING';
  if (normalizedStatus !== 'PENDING') {
    throw ApiError.badRequest('Invalid status. Connection requests must have status PENDING');
  }

  if (user.businessId === partnerId) {
    throw ApiError.badRequest('Cannot create a connection with your own business');
  }

  // Verify partner exists and check that partner is a WHOLESALER
  const { rows: partnerRows } = await query(
    'SELECT id, name, type FROM businesses WHERE id = $1',
    [partnerId],
  );
  if (partnerRows.length === 0) {
    throw ApiError.notFound('Partner business not found');
  }

  const partner = partnerRows[0];
  if (partner.type !== 'WHOLESALER') {
    throw ApiError.badRequest('Connections can only be formed with a Wholesaler');
  }

  const retailerId = user.businessId;
  const wholesalerId = partnerId;

  // Use transaction with row-level lock and concurrency handling
  return withTransaction(async (client) => {
    // Check if connection already exists with FOR UPDATE to prevent race conditions
    const { rows: existingRows } = await client.query(
      `SELECT id, status
       FROM business_connections
       WHERE retailer_id = $1 AND wholesaler_id = $2
       FOR UPDATE`,
      [retailerId, wholesalerId],
    );

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      if (existing.status === 'ACTIVE') {
        throw ApiError.conflict('An active connection with this business already exists');
      }
      if (existing.status === 'PENDING') {
        throw ApiError.conflict('A connection request is already pending with this business');
      }

      // Rule 4: An INACTIVE connection cannot be directly reactivated. Require a fresh request workflow.
      // Under the fresh request workflow, the connection is reset to PENDING and wholesaler is notified.
      const { rows: updatedRows } = await client.query(
        `UPDATE business_connections
            SET status = 'PENDING', updated_at = now()
          WHERE id = $1 AND status = 'INACTIVE'
          RETURNING id, retailer_id, wholesaler_id, status, created_at, updated_at`,
        [existing.id],
      );

      if (updatedRows.length === 0) {
        throw ApiError.conflict('Connection status was concurrently modified. Please try again.');
      }

      // Notification for wholesaler (Rule 10)
      await client.query(
        `INSERT INTO notifications (business_id, type, title, message)
         VALUES ($1, 'CONNECTION_REQUEST', 'New Connection Request', $2)`,
        [wholesalerId, `${user.businessName || 'A retailer'} requested a connection`],
      );

      return {
        id: updatedRows[0].id,
        retailerId: updatedRows[0].retailer_id,
        wholesalerId: updatedRows[0].wholesaler_id,
        status: updatedRows[0].status,
        createdAt: updatedRows[0].created_at,
        updatedAt: updatedRows[0].updated_at,
        partner: {
          id: partner.id,
          name: partner.name,
          type: partner.type,
        },
      };
    }

    // Insert new connection with status PENDING
    let newConn;
    try {
      const { rows } = await client.query(
        `INSERT INTO business_connections (retailer_id, wholesaler_id, status)
         VALUES ($1, $2, 'PENDING')
         RETURNING id, retailer_id, wholesaler_id, status, created_at, updated_at`,
        [retailerId, wholesalerId],
      );
      newConn = rows[0];
    } catch (err) {
      // Catch unique pair constraint violation in case of simultaneous concurrent request
      if (err.code === '23505') {
        throw ApiError.conflict('A connection with this business already exists or was created concurrently');
      }
      throw err;
    }

    // Send CONNECTION_REQUEST notification to the wholesaler (Rule 10)
    await client.query(
      `INSERT INTO notifications (business_id, type, title, message)
       VALUES ($1, 'CONNECTION_REQUEST', 'New Connection Request', $2)`,
      [wholesalerId, `${user.businessName || 'A retailer'} requested a connection`],
    );

    return {
      id: newConn.id,
      retailerId: newConn.retailer_id,
      wholesalerId: newConn.wholesaler_id,
      status: newConn.status,
      createdAt: newConn.created_at,
      updatedAt: newConn.updated_at,
      partner: {
        id: partner.id,
        name: partner.name,
        type: partner.type,
      },
    };
  });
}

/**
 * W4: Update connection status (accept / reject / deactivate).
 * - PENDING -> ACTIVE: Only wholesaler receiving request (Rule 2).
 * - PENDING -> INACTIVE: Only wholesaler receiving request (Rule 2).
 * - ACTIVE -> INACTIVE: Either participant (Rule 3).
 * - INACTIVE -> Any: Rejected; requires fresh request workflow (Rule 4).
 * - Unsupported transitions rejected (Rule 5).
 * - Row-level locking and conditional update prevent lost updates (Concurrency).
 */
export async function updateConnectionStatus(user, connectionId, newStatus) {
  if (!user?.businessId) {
    throw ApiError.forbidden('User does not belong to a registered business');
  }

  if (!newStatus || typeof newStatus !== 'string') {
    throw ApiError.badRequest('Status is required and must be a string');
  }

  const targetStatus = newStatus.trim().toUpperCase();

  // Rule 9: Preserve valid enum values: PENDING, ACTIVE, INACTIVE
  if (!['ACTIVE', 'PENDING', 'INACTIVE'].includes(targetStatus)) {
    throw ApiError.badRequest('Invalid status. Allowed: ACTIVE, PENDING, INACTIVE');
  }

  // Rule 4 & 5: Connections cannot be transitioned to PENDING via PATCH
  if (targetStatus === 'PENDING') {
    throw ApiError.badRequest('Connections cannot be transitioned to PENDING via PATCH. Require a fresh request workflow via POST /api/connections');
  }

  return withTransaction(async (client) => {
    // Acquire row-level lock FOR UPDATE OF c to prevent concurrent overwrites
    const { rows: existingRows } = await client.query(
      `SELECT c.id, c.retailer_id, c.wholesaler_id, c.status,
              r.name AS retailer_name, w.name AS wholesaler_name
       FROM business_connections c
       JOIN businesses r ON r.id = c.retailer_id
       JOIN businesses w ON w.id = c.wholesaler_id
       WHERE c.id = $1
       FOR UPDATE OF c`,
      [connectionId],
    );

    if (existingRows.length === 0) {
      throw ApiError.notFound('Connection not found');
    }

    const conn = existingRows[0];
    const isRetailer = conn.retailer_id === user.businessId;
    const isWholesaler = conn.wholesaler_id === user.businessId;

    // Rule 6: Never trust client-supplied business ID or role; authenticate via user context
    if (!isRetailer && !isWholesaler) {
      throw ApiError.forbidden('You are not a participant in this connection');
    }

    // Enforce transition rules and authorization (Rule 2, 3, 4, 5, 7)
    if (conn.status === targetStatus) {
      throw ApiError.badRequest(`Connection is already ${targetStatus}`);
    }

    if (conn.status === 'PENDING') {
      // Rule 2: Only the wholesaler receiving a PENDING request can accept it (PENDING → ACTIVE) or reject it (PENDING → INACTIVE)
      if (!isWholesaler) {
        throw ApiError.forbidden('Only the wholesaler receiving a pending request can accept or reject it');
      }
      if (targetStatus !== 'ACTIVE' && targetStatus !== 'INACTIVE') {
        throw ApiError.badRequest('Invalid status transition from PENDING. Allowed: ACTIVE, INACTIVE');
      }
    } else if (conn.status === 'ACTIVE') {
      // Rule 3: Either participant can deactivate an ACTIVE connection (ACTIVE → INACTIVE)
      if (targetStatus !== 'INACTIVE') {
        throw ApiError.badRequest('Active connections can only be deactivated to INACTIVE');
      }
    } else if (conn.status === 'INACTIVE') {
      // Rule 4: An INACTIVE connection cannot be directly reactivated. Require a fresh request workflow.
      throw ApiError.badRequest('An INACTIVE connection cannot be directly reactivated. Require a fresh request workflow via POST /api/connections');
    } else {
      // Rule 5: Reject every unsupported transition
      throw ApiError.badRequest(`Unsupported connection status transition from ${conn.status}`);
    }

    // Conditional UPDATE checking affected row count to prevent lost updates / concurrent overwrites
    const { rows: updatedRows } = await client.query(
      `UPDATE business_connections
          SET status = $2::connection_status, updated_at = now()
        WHERE id = $1 AND status = $3::connection_status
        RETURNING id, retailer_id, wholesaler_id, status, created_at, updated_at`,
      [connectionId, targetStatus, conn.status],
    );

    if (updatedRows.length === 0) {
      throw ApiError.conflict('Connection status was modified concurrently. Please refresh and try again.');
    }

    const updated = updatedRows[0];

    // Rule 10: Preserve existing notification behavior and ensure rejection/acceptance notifications are sent
    // Wholesaler accepts: send CONNECTION_ACCEPTED to retailer
    // Note: No notification enum exists for rejection or deactivation in PostgreSQL notification_type enum
    if (conn.status === 'PENDING' && targetStatus === 'ACTIVE') {
      await client.query(
        `INSERT INTO notifications (business_id, type, title, message)
         VALUES ($1, 'CONNECTION_ACCEPTED', 'Connection Accepted', $2)`,
        [conn.retailer_id, `${conn.wholesaler_name} accepted your connection request`],
      );
    }

    const partnerId = isRetailer ? conn.wholesaler_id : conn.retailer_id;
    const partnerName = isRetailer ? conn.wholesaler_name : conn.retailer_name;
    const partnerType = isRetailer ? 'WHOLESALER' : 'RETAILER';

    return {
      id: updated.id,
      retailerId: updated.retailer_id,
      wholesalerId: updated.wholesaler_id,
      status: updated.status,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      partner: {
        id: partnerId,
        name: partnerName,
        type: partnerType,
      },
    };
  });
}
