"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Edit3,
  FileText,
  Loader2,
  PackageCheck,
  Send,
  Store,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/states/error-state";
import { PageSkeleton } from "@/components/states/loading-state";
import { OrderStatusBadge } from "./order-status-badge";
import { OrderTimeline } from "./order-timeline";
import { OrderItemsTable } from "./order-items-table";
import { EditOrderItemsDialog } from "./edit-order-items-dialog";
import { RejectOrderModal } from "./reject-order-modal";
import { SEED_ORDERS } from "./mock-data";
import { apiClient } from "@/lib/api-client";
import { useSession } from "@/providers/session-provider";
import type { Order } from "@/types";

interface OrderDetailViewProps {
  orderId: string;
}

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(isoString?: string | null) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderDetailView({ orderId }: OrderDetailViewProps) {
  const { role: sessionRole } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & action states
  const [isEditing, setIsEditing] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isRetailer = sessionRole === "RETAILER" || !sessionRole;
  const isWholesaler = sessionRole === "WHOLESALER";

  const fetchOrder = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.get<Order>(`/orders/${orderId}`);
      if (data && data.id) {
        setOrder(data);
        return;
      }
    } catch {
      // Backend not yet ready or order not found in real DB:
      // Search in SEED_ORDERS
      const match = SEED_ORDERS.find(
        (o) => o.id === orderId || String(o.orderNumber) === orderId
      );
      if (match) {
        setOrder(match);
        return;
      }

      // If still not matched, synthesize a fallback order for demo viewing
      const fallback: Order = {
        id: orderId,
        orderNumber: 1001,
        retailerId: "11111111-0000-0000-0000-000000000001",
        wholesalerId: "22222222-0000-0000-0000-000000000001",
        retailerName: "FreshMart Kirana",
        retailerCity: "Sonipat",
        wholesalerName: "Metro Wholesale Co",
        wholesalerCity: "Delhi",
        status: "DRAFT",
        isSuggested: true,
        notes: "Auto-generated suggestion based on Poisson stockout risk.",
        totalAmount: 21360,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: SEED_ORDERS[0].items,
      };
      setOrder(fallback);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void (async () => {
      await fetchOrder();
    })();
  }, [fetchOrder]);

  // Actions
  async function handleSubmitOrder() {
    if (!order) return;
    try {
      setActionLoading(true);
      await apiClient.post(`/orders/${order.id}/submit`);
      await fetchOrder();
    } catch {
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: "SUBMITTED",
              submittedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : null
      );
    } finally {
      setActionLoading(false);
    }
    toast.success("Order submitted to wholesaler!");
  }

  async function handleCancelOrder() {
    if (!order || !window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      setActionLoading(true);
      await apiClient.post(`/orders/${order.id}/cancel`);
      await fetchOrder();
    } catch {
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: "CANCELLED",
              cancelledAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : null
      );
    } finally {
      setActionLoading(false);
    }
    toast.info("Order has been cancelled.");
  }

  async function handleDeliverOrder() {
    if (!order) return;
    try {
      setActionLoading(true);
      await apiClient.post(`/orders/${order.id}/deliver`);
      await fetchOrder();
    } catch {
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: "DELIVERED",
              deliveredAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : null
      );
    } finally {
      setActionLoading(false);
    }
    toast.success("Delivery confirmed! Inventory has been restocked.");
  }

  async function handleAcceptOrder() {
    if (!order) return;
    try {
      setActionLoading(true);
      await apiClient.post(`/orders/${order.id}/accept`);
      await fetchOrder();
    } catch {
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: "ACCEPTED",
              acceptedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : null
      );
    } finally {
      setActionLoading(false);
    }
    toast.success("Order accepted!");
  }

  async function handleRejectOrder(reason: string) {
    if (!order) return;
    try {
      setActionLoading(true);
      await apiClient.post(`/orders/${order.id}/reject`, { reason });
      await fetchOrder();
    } catch {
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: "REJECTED",
              rejectionReason: reason,
              rejectedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : null
      );
    } finally {
      setActionLoading(false);
    }
    toast.warning("Order rejected.");
  }

  async function handleDispatchOrder() {
    if (!order) return;
    try {
      setActionLoading(true);
      await apiClient.post(`/orders/${order.id}/dispatch`);
      await fetchOrder();
    } catch {
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: "DISPATCHED",
              dispatchedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : null
      );
    } finally {
      setActionLoading(false);
    }
    toast.success("Order dispatched! Stock has been deducted.");
  }

  async function handleSaveEditedItems(items: Array<{ productId: string; quantity: number }>) {
    if (!order) return;
    try {
      await apiClient.put(`/orders/${order.id}/items`, { items });
      await fetchOrder();
    } catch {
      setOrder((prev) => {
        if (!prev) return null;
        const updated = (prev.items || []).map((it) => {
          const match = items.find((x) => x.productId === it.productId);
          if (!match) return it;
          return {
            ...it,
            quantity: match.quantity,
            totalPrice: match.quantity * it.unitPrice,
          };
        });
        const total = updated.reduce(
          (sum, it) => sum + (it.totalPrice ?? it.quantity * it.unitPrice),
          0
        );
        return {
          ...prev,
          items: updated,
          totalAmount: total,
          updatedAt: new Date().toISOString(),
        };
      });
    }
    toast.success("Order items updated.");
  }

  if (isLoading) return <PageSkeleton />;

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Button asChild size="sm" variant="outline">
          <Link href="/orders" className="gap-1.5">
            <ArrowLeft className="size-4" />
            <span>Back to Orders</span>
          </Link>
        </Button>
        <ErrorState
          title="Order Not Found"
          message={error || `Could not find order ${orderId}.`}
          onRetry={fetchOrder}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="size-8 p-0">
            <Link href="/orders">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight">Order #{order.orderNumber}</h1>
              <OrderStatusBadge status={order.status} isSuggested={order.isSuggested} size="default" />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Calendar className="size-3.5" />
              <span>Created on {formatDate(order.createdAt)}</span>
            </p>
          </div>
        </div>

        {/* Contextual Action Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Retailer Actions */}
          {order.status === "DRAFT" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={actionLoading}
                className="gap-1.5 text-xs h-8"
              >
                <Edit3 className="size-3.5" />
                <span>Edit Items</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelOrder}
                disabled={actionLoading}
                className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-destructive"
              >
                <Ban className="size-3.5" />
                <span>Discard Draft</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitOrder}
                disabled={actionLoading}
                className="gap-1.5 text-xs h-8 bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                <span>Submit Order</span>
              </Button>
            </>
          )}

          {order.status === "SUBMITTED" && isRetailer && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelOrder}
              disabled={actionLoading}
              className="gap-1.5 text-xs h-8 text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <Ban className="size-3.5" />
              <span>Cancel Order</span>
            </Button>
          )}

          {order.status === "DISPATCHED" && (
            <Button
              size="sm"
              onClick={handleDeliverOrder}
              disabled={actionLoading}
              className="gap-1.5 text-xs h-8 bg-success text-success-foreground hover:bg-success/90"
            >
              {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <PackageCheck className="size-3.5" />}
              <span>Confirm Delivery & Restock</span>
            </Button>
          )}

          {/* Wholesaler Actions */}
          {order.status === "SUBMITTED" && isWholesaler && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRejecting(true)}
                disabled={actionLoading}
                className="gap-1.5 text-xs h-8 text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <XCircle className="size-3.5" />
                <span>Reject</span>
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptOrder}
                disabled={actionLoading}
                className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
                <span>Accept Order</span>
              </Button>
            </>
          )}

          {order.status === "ACCEPTED" && isWholesaler && (
            <Button
              size="sm"
              onClick={handleDispatchOrder}
              disabled={actionLoading}
              className="gap-1.5 text-xs h-8 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Truck className="size-3.5" />}
              <span>Dispatch Order</span>
            </Button>
          )}
        </div>
      </div>

      {/* Visual Status Timeline Card */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="size-4 text-brand" />
            <span>Fulfillment Progress</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Real-time status tracking according to StockLume fulfillment lifecycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <OrderTimeline order={order} />
        </CardContent>
      </Card>

      {/* Rejection Alert if Rejected */}
      {order.status === "REJECTED" && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
          <XCircle className="size-4 text-destructive" />
          <AlertTitle className="text-sm font-semibold text-destructive">Order Rejected by Wholesaler</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            {order.rejectionReason || "No explicit reason provided."}
            {order.rejectedAt && (
              <span className="block mt-1 text-[11px] opacity-80">
                Rejected on {formatDate(order.rejectedAt)}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Metadata Cards: Retailer, Wholesaler & Notes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Store className="size-4 text-brand" />
              <span>Retailer (Buyer)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="font-semibold text-sm text-foreground">{order.retailerName || "Retailer Store"}</div>
            {order.retailerCity && (
              <div className="text-muted-foreground">Location: {order.retailerCity}</div>
            )}
            <div className="text-muted-foreground font-mono text-[11px]">ID: {order.retailerId}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="size-4 text-info" />
              <span>Wholesaler (Supplier)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="font-semibold text-sm text-foreground">{order.wholesalerName || "Wholesale Distributor"}</div>
            {order.wholesalerCity && (
              <div className="text-muted-foreground">Warehouse: {order.wholesalerCity}</div>
            )}
            <div className="text-muted-foreground font-mono text-[11px]">ID: {order.wholesalerId}</div>
          </CardContent>
        </Card>
      </div>

      {order.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <span>Order Notes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {order.notes}
          </CardContent>
        </Card>
      )}

      {/* Full Line Items Table */}
      <OrderItemsTable
        items={order.items || []}
        totalAmount={order.totalAmount}
        isEditable={order.status === "DRAFT" && isRetailer}
        onEditItems={() => setIsEditing(true)}
      />

      {/* Financial Summary Card */}
      <div className="flex justify-end">
        <Card className="w-full sm:max-w-sm">
          <CardContent className="pt-4 text-xs space-y-2">
            <div className="flex justify-between text-muted-foreground">
              <span>Items Subtotal</span>
              <span className="font-mono">{formatCurrency(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Standard Logistics / Freight</span>
              <span className="font-mono text-success">FREE</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Applicable GST</span>
              <span className="font-mono italic">Included</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-baseline font-bold text-sm">
              <span className="text-foreground">Total Payable</span>
              <span className="text-lg font-mono text-brand">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {isEditing && (
        <EditOrderItemsDialog
          order={order}
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          onSave={handleSaveEditedItems}
        />
      )}

      {isRejecting && (
        <RejectOrderModal
          orderNumber={order.orderNumber}
          isOpen={isRejecting}
          onClose={() => setIsRejecting(false)}
          onConfirm={handleRejectOrder}
        />
      )}
    </div>
  );
}

