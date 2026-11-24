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

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Products, Connections, Inventory & Reorder Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  wholesalerId: string;
  name: string;
  sku: string;
  category: string | null;
  unit: string;
  price: number;
  availableQuantity: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  wholesalerName?: string;
}

export type ConnectionStatus = "PENDING" | "ACTIVE" | "INACTIVE";

export interface BusinessPartner {
  id: string;
  name: string;
  type: Role;
  city: string | null;
  phone: string | null;
  email: string | null;
  address?: string | null;
}

export interface Connection {
  id: string;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
  retailerId: string;
  wholesalerId: string;
  partner: BusinessPartner;
}

export interface InventoryItem {
  id: string;
  businessId: string;
  productId: string;
  quantity: number;
  minStock: number;
  reorderQuantity: number;
  leadTimeDays: number;
  stockoutRisk: StockoutRisk;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    price: number;
    wholesalerId: string;
    wholesalerName: string;
  };
}

export interface ReorderRule {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  minStock: number;
  reorderQuantity: number;
  leadTimeDays: number;
  isActive: boolean;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  createdAt: string;
  reason: "INITIAL_STOCK" | "SALE" | "ORDER_DISPATCHED" | "ORDER_DELIVERED" | "MANUAL_ADJUSTMENT";
  quantityChange: number;
  quantityAfter: number;
  note: string | null;
  productId: string;
  productName: string;
  productSku: string;
  orderNumber: number | null;
  doneBy: string | null;
}
