/**
 * Shared frontend types. Keep these in sync with docs/API.md and the SQL enums
 * in supabase/migrations. Each member may add their own module types below.
 */

export type Role = "RETAILER" | "WHOLESALER";

/** Mirrors the `order_status` SQL enum. */
export const ORDER_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "ACCEPTED",
  "REJECTED",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type StockoutRisk = "LOW" | "MEDIUM" | "HIGH";

/** Standard API success body: { success: true, data, meta? } */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/** Standard API error body: { success: false, error: { code, message, details? } } */
export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Returned by GET /api/auth/me (Member 1). */
export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  businessId: string | null;
  businessName: string | null;
  role: Role | null;
}
