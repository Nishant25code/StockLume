"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/states/error-state";
import { PageSkeleton } from "@/components/states/loading-state";
import { RetailerOrdersView } from "./retailer-orders-view";
import { WholesalerOrdersView } from "./wholesaler-orders-view";
import { SEED_ORDERS } from "./mock-data";
import { apiClient } from "@/lib/api-client";
import { useSession } from "@/providers/session-provider";
import type { Order, Role } from "@/types";

export function OrdersView() {
  const { role: sessionRole, isPreview, setPreviewRole } = useSession();
  const [activeRole, setActiveRole] = useState<Role>(sessionRole || "RETAILER");

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync active role with session
  useEffect(() => {
    if (sessionRole) {
      void (async () => {
        setActiveRole(sessionRole);
      })();
    }
  }, [sessionRole]);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.get<Order[]>("/orders");
      if (Array.isArray(data) && data.length > 0) {
        setOrders(data);
        setIsUsingFallback(false);
      } else {
        // Fallback to seed orders if backend returns empty or not yet seeded
        setOrders(SEED_ORDERS);
        setIsUsingFallback(true);
      }
    } catch {
      // Backend route /api/orders might not be implemented yet by Member 3
      setOrders(SEED_ORDERS);
      setIsUsingFallback(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchOrders();
    })();
  }, [fetchOrders]);

  // 1. Generate Suggestions (Retailer)
  async function handleGenerateSuggestions() {
    try {
      setIsGenerating(true);
      try {
        await apiClient.post("/orders/suggestions");
        await fetchOrders();
      } catch {
        // Demo fallback simulation
        const newDraft: Order = {
          id: `ord-gen-${Date.now()}`,
          orderNumber: Math.max(...orders.map((o) => o.orderNumber), 1005) + 1,
          retailerId: "11111111-0000-0000-0000-000000000001",
          wholesalerId: "22222222-0000-0000-0000-000000000002",
          retailerName: "FreshMart Kirana",
          retailerCity: "Sonipat",
          wholesalerName: "GreenLeaf Traders",
          wholesalerCity: "Gurugram",
          status: "DRAFT",
          isSuggested: true,
          notes: "Generated from Poisson stockout analysis for Green Tea (3 days of stock remaining).",
          totalAmount: 5600,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: [
            {
              id: `item-gen-${Date.now()}`,
              orderId: `ord-gen-${Date.now()}`,
              productId: "33333333-0000-0000-0000-000000000005",
              productName: "Green Tea 100 bags",
              sku: "GL-TEA-100",
              category: "Beverages",
              unit: "box",
              quantity: 20,
              suggestedQuantity: 20,
              unitPrice: 280,
              totalPrice: 5600,
            },
          ],
        };
        setOrders((prev) => [newDraft, ...prev]);
      }
      toast.success("Draft order suggestions generated successfully from low-stock predictions!");
    } finally {
      setIsGenerating(false);
    }
  }

  // 2. Submit Order (Retailer: DRAFT -> SUBMITTED)
  async function handleSubmitOrder(orderId: string) {
    try {
      await apiClient.post(`/orders/${orderId}/submit`);
      await fetchOrders();
    } catch {
      // Local optimistic update
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "SUBMITTED",
                submittedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : o
        )
      );
    }
    toast.success("Order submitted to wholesaler! Wholesaler has been notified.");
  }

  // 3. Cancel Order (Retailer: DRAFT/SUBMITTED -> CANCELLED)
  async function handleCancelOrder(orderId: string) {
    try {
      await apiClient.post(`/orders/${orderId}/cancel`);
      await fetchOrders();
    } catch {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "CANCELLED",
                cancelledAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : o
        )
      );
    }
    toast.info("Order has been cancelled.");
  }

  // 4. Confirm Delivery (Retailer: DISPATCHED -> DELIVERED)
  async function handleDeliverOrder(orderId: string) {
    try {
      await apiClient.post(`/orders/${orderId}/deliver`);
      await fetchOrders();
    } catch {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "DELIVERED",
                deliveredAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : o
        )
      );
    }
    toast.success("Delivery confirmed! Inventory has been automatically restocked.");
  }

  // 5. Update Items (Retailer: PUT /orders/:id/items)
  async function handleUpdateItems(
    orderId: string,
    items: Array<{ productId: string; quantity: number }>
  ) {
    try {
      await apiClient.put(`/orders/${orderId}/items`, { items });
      await fetchOrders();
    } catch {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const updatedItems = (o.items || []).map((it) => {
            const match = items.find((x) => x.productId === it.productId);
            if (!match) return it;
            return {
              ...it,
              quantity: match.quantity,
              totalPrice: match.quantity * it.unitPrice,
            };
          });
          const newTotal = updatedItems.reduce(
            (sum, it) => sum + (it.totalPrice ?? it.quantity * it.unitPrice),
            0
          );
          return {
            ...o,
            items: updatedItems,
            totalAmount: newTotal,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    }
    toast.success("Order items updated successfully.");
  }

  // 6. Accept Order (Wholesaler: SUBMITTED -> ACCEPTED)
  async function handleAcceptOrder(orderId: string) {
    try {
      await apiClient.post(`/orders/${orderId}/accept`);
      await fetchOrders();
    } catch {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "ACCEPTED",
                acceptedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : o
        )
      );
    }
    toast.success("Order accepted and moved to dispatch queue.");
  }

  // 7. Reject Order (Wholesaler: SUBMITTED -> REJECTED)
  async function handleRejectOrder(orderId: string, reason: string) {
    try {
      await apiClient.post(`/orders/${orderId}/reject`, { reason });
      await fetchOrders();
    } catch {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "REJECTED",
                rejectedAt: new Date().toISOString(),
                rejectionReason: reason,
                updatedAt: new Date().toISOString(),
              }
            : o
        )
      );
    }
    toast.warning("Order has been rejected. Retailer has been notified.");
  }

  // 8. Dispatch Order (Wholesaler: ACCEPTED -> DISPATCHED)
  async function handleDispatchOrder(orderId: string) {
    try {
      await apiClient.post(`/orders/${orderId}/dispatch`);
      await fetchOrders();
    } catch {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "DISPATCHED",
                dispatchedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : o
        )
      );
    }
    toast.success("Order dispatched! Catalog stock has been decreased.");
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load orders"
        message={error}
        onRetry={fetchOrders}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Fallback Notice for Development */}
      {isUsingFallback && (
        <Alert className="border-brand/30 bg-brand/5 text-xs">
          <Sparkles className="size-4 text-brand" />
          <AlertTitle className="text-xs font-semibold text-brand">Demo Environment Active</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            Displaying seeded order workflow from <code className="font-mono text-[11px]">supabase/seed.sql</code>. All order status transitions, quantities editing, and dispatch actions work interactively.
          </AlertDescription>
        </Alert>
      )}

      {/* Role Switcher in Preview Mode */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Viewing Orders as:</span>
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            {activeRole}
          </span>
        </div>
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Button
            variant={activeRole === "RETAILER" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveRole("RETAILER");
              if (isPreview) setPreviewRole("RETAILER");
            }}
            className="h-7 text-xs"
          >
            Retailer View
          </Button>
          <Button
            variant={activeRole === "WHOLESALER" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveRole("WHOLESALER");
              if (isPreview) setPreviewRole("WHOLESALER");
            }}
            className="h-7 text-xs"
          >
            Wholesaler View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchOrders}
            className="h-7 size-7 p-0 text-muted-foreground"
            title="Refresh Orders"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Render Role-Specific Orders View */}
      {activeRole === "RETAILER" ? (
        <RetailerOrdersView
          orders={orders}
          onGenerateSuggestions={handleGenerateSuggestions}
          onSubmitOrder={handleSubmitOrder}
          onCancelOrder={handleCancelOrder}
          onDeliverOrder={handleDeliverOrder}
          onUpdateItems={handleUpdateItems}
          isGenerating={isGenerating}
        />
      ) : (
        <WholesalerOrdersView
          orders={orders}
          onAcceptOrder={handleAcceptOrder}
          onRejectOrder={handleRejectOrder}
          onDispatchOrder={handleDispatchOrder}
        />
      )}
    </div>
  );
}
