/**
 * The order lifecycle in one place (see docs/BUSINESS_RULES.md):
 * DRAFT → SUBMITTED → ACCEPTED → DISPATCHED → DELIVERED, with REJECTED and CANCELLED as exits.
 */
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_NEXT = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['DISPATCHED'],
  DISPATCHED: ['DELIVERED'],
};

// Each new status stamps its own timestamp column on the order.
const TIME_COLUMN = {
  SUBMITTED: 'submitted_at',
  ACCEPTED: 'accepted_at',
  REJECTED: 'rejected_at',
  DISPATCHED: 'dispatched_at',
  DELIVERED: 'delivered_at',
  CANCELLED: 'cancelled_at',
};

// Moves an order to `newStatus` or throws 409. Returns the updated order row.
export async function changeStatus(client, order, newStatus, rejectionReason = null) {
  if (!ALLOWED_NEXT[order.status]?.includes(newStatus)) {
    throw ApiError.invalidStatusTransition(order.status, newStatus);
  }

  const { rows } = await client.query(
    `update orders
        set status = $2, ${TIME_COLUMN[newStatus]} = now(), rejection_reason = coalesce($3, rejection_reason)
      where id = $1
      returning *`,
    [order.id, newStatus, rejectionReason],
  );
  return rows[0];
}
