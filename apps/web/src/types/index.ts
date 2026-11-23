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

/* ─────────────────────────────────────────────────────────────
   Member 2 & 4 — Inventory, Sales & Prediction Types
   ───────────────────────────────────────────────────────────── */

export type StockMovementReason =
  | "INITIAL_STOCK"
  | "SALE"
  | "ORDER_DISPATCHED"
  | "ORDER_DELIVERED"
  | "MANUAL_ADJUSTMENT";

export interface InventoryItem {
  id: string;
  businessId: string;
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  unit: string;
  price: number;
  quantity: number;
  minStock?: number;
  reorderQuantity?: number;
  wholesalerId?: string;
  wholesalerName?: string;
  risk?: StockoutRisk;
  daysOfStockLeft?: number;
  stockoutProbability?: number;
  suggestedQuantity?: number;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  businessId: string;
  productId: string;
  productName?: string;
  quantityChange: number;
  quantityAfter: number;
  reason: StockMovementReason;
  saleId?: string | null;
  orderId?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface StockoutPrediction {
  productId: string;
  productName: string;
  wholesalerId: string;
  stock: number;
  avgDailyDemand: number;
  leadTimeDays: number;
  stockoutProbability: number;
  risk: StockoutRisk;
  method: "POISSON" | "THRESHOLD";
  daysOfStockLeft: number;
  suggestedQuantity: number;
}

export interface RecordSalePayload {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface SimulateSalesPayload {
  days?: number;
}

/* ─────────────────────────────────────────────────────────────
   Member 4 — Notifications & Analytics Types
   ───────────────────────────────────────────────────────────── */

export type NotificationType =
  | "LOW_STOCK"
  | "CONNECTION_REQUEST"
  | "CONNECTION_ACCEPTED"
  | "ORDER_SUBMITTED"
  | "ORDER_ACCEPTED"
  | "ORDER_REJECTED"
  | "ORDER_DISPATCHED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED";

export interface Notification {
  id: string;
  businessId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedOrderId: string | null;
  relatedProductId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  minStock: number;
  wholesalerName: string;
}

export interface RetailerDashboardData {
  stockValue: number;
  lowStockCount: number;
  lowStockItems?: number;
  openOrders: number;
  sales7d: number;
  salesThisWeek?: number;
  recentSales?: number;
  kpis?: {
    stockValue: number;
    lowStockCount: number;
    openOrders: number;
    sales7d: number;
  };
  lowStockAlerts: LowStockAlert[];
  recentNotifications: Notification[];
}

export interface WholesalerTopProduct {
  productId: string;
  name: string;
  sku: string;
  price: number;
  availableQuantity: number;
  totalOrdered: number;
  totalRevenue: number;
}

export interface WholesalerPendingOrder {
  id: string;
  orderNumber: number;
  totalAmount: number;
  submittedAt: string | null;
  retailerName: string;
}

export interface WholesalerDashboardData {
  pendingOrders: number;
  revenue: number;
  totalRevenue?: number;
  connectedRetailers: number;
  kpis?: {
    pendingOrders: number;
    revenue: number;
    connectedRetailers: number;
  };
  topProducts: WholesalerTopProduct[];
  pendingOrdersList: WholesalerPendingOrder[];
  recentNotifications: Notification[];
}

export interface SalesTrendPoint {
  date: string;
  totalAmount: number;
  totalQuantity?: number;
  orderCount?: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  sku: string;
  category?: string;
  unit?: string;
  price: number;
  availableQuantity?: number;
  wholesalerName?: string;
  totalSold?: number;
  totalOrdered?: number;
  totalQuantity?: number;
  totalRevenue: number;
  orderCount?: number;
}

export interface OrdersSummary {
  totalOrders: number;
  totalAmount: number;
  counts: Record<OrderStatus, number>;
  byStatus: Array<{
    status: OrderStatus;
    count: number;
    totalAmount: number;
  }>;
}

/* ─────────────────────────────────────────────────────────────
   Member 3 & 4 — Orders & Fulfillment Types
   ───────────────────────────────────────────────────────────── */

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  sku: string;
  unit?: string;
  category?: string;
  quantity: number;
  suggestedQuantity?: number | null;
  unitPrice: number;
  totalPrice?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  retailerId: string;
  wholesalerId: string;
  retailerName?: string;
  retailerCity?: string;
  wholesalerName?: string;
  wholesalerCity?: string;
  status: OrderStatus;
  isSuggested: boolean;
  notes?: string | null;
  rejectionReason?: string | null;
  totalAmount: number;
  submittedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface CreateOrderPayload {
  wholesalerId: string;
  notes?: string;
  items?: Array<{ productId: string; quantity: number }>;
}

export interface UpdateOrderItemsPayload {
  items: Array<{ productId: string; quantity: number }>;
}

export interface RejectOrderPayload {
  reason: string;
}

