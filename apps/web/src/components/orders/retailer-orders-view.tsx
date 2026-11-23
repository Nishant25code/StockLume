"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Edit3,
  ExternalLink,
  FileText,
  Loader2,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Store,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/states/empty-state";
import { OrderStatusBadge } from "./order-status-badge";
import { EditOrderItemsDialog } from "./edit-order-items-dialog";
import type { Order } from "@/types";

interface RetailerOrdersViewProps {
  orders: Order[];
  onGenerateSuggestions: () => Promise<void>;
  onSubmitOrder: (orderId: string) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
  onDeliverOrder: (orderId: string) => Promise<void>;
  onUpdateItems: (orderId: string, items: Array<{ productId: string; quantity: number }>) => Promise<void>;
  isGenerating?: boolean;
}

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RetailerOrdersView({
  orders,
  onGenerateSuggestions,
  onSubmitOrder,
  onCancelOrder,
  onDeliverOrder,
  onUpdateItems,
  isGenerating,
}: RetailerOrdersViewProps) {
  const [activeTab, setActiveTab] = useState("drafts");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Partition orders
  const draftOrders = orders.filter((o) => o.status === "DRAFT");
  const activeOrders = orders.filter((o) => ["SUBMITTED", "ACCEPTED", "DISPATCHED"].includes(o.status));
  const pastOrders = orders.filter((o) => ["DELIVERED", "CANCELLED", "REJECTED"].includes(o.status));

  async function handleSubmit(orderId: string) {
    try {
      setActionLoadingId(`submit-${orderId}`);
      await onSubmitOrder(orderId);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancel(orderId: string) {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      setActionLoadingId(`cancel-${orderId}`);
      await onCancelOrder(orderId);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDeliver(orderId: string) {
    try {
      setActionLoadingId(`deliver-${orderId}`);
      await onDeliverOrder(orderId);
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & AI Suggestion Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/50 backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Retailer Procurement & Orders</h2>
            <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20 text-xs">
              FreshMart
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Review predictive drafts, submit orders to connected wholesalers, and confirm received deliveries.
          </p>
        </div>
        <Button
          onClick={onGenerateSuggestions}
          disabled={isGenerating}
          size="sm"
          className="bg-brand text-brand-foreground hover:bg-brand/90 gap-1.5 shrink-0"
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Analyzing Risk...</span>
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              <span>Generate Suggestions</span>
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="drafts" className="gap-2">
            <span>Drafts</span>
            {draftOrders.length > 0 && (
              <Badge variant="secondary" className="size-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                {draftOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <span>Active</span>
            {activeOrders.length > 0 && (
              <Badge variant="secondary" className="size-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                {activeOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            <span>History</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. DRAFTS TAB */}
        <TabsContent value="drafts" className="space-y-4">
          {draftOrders.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No draft orders yet"
              description="Click 'Generate Suggestions' to automatically build draft orders from low-stock products."
              action={
                <Button
                  size="sm"
                  onClick={onGenerateSuggestions}
                  disabled={isGenerating}
                  className="bg-brand text-brand-foreground hover:bg-brand/90 gap-1.5"
                >
                  <Sparkles className="size-3.5" />
                  <span>Generate Suggestions Now</span>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {draftOrders.map((order) => {
                const isSubmitting = actionLoadingId === `submit-${order.id}`;
                const isCancelling = actionLoadingId === `cancel-${order.id}`;

                return (
                  <Card key={order.id} className="flex flex-col justify-between border-border hover:border-brand/40 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-semibold">
                              Order #{order.orderNumber}
                            </CardTitle>
                            <OrderStatusBadge status={order.status} isSuggested={order.isSuggested} size="sm" />
                          </div>
                          <CardDescription className="text-xs mt-1 flex items-center gap-1.5">
                            <Store className="size-3.5 text-muted-foreground" />
                            <span>{order.wholesalerName || "Wholesaler"}</span>
                            {order.wholesalerCity && (
                              <span className="text-muted-foreground">• {order.wholesalerCity}</span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-bold font-mono text-brand">
                            {formatCurrency(order.totalAmount)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {order.items?.length || 0} {(order.items?.length || 0) === 1 ? "item" : "items"}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-3 text-xs space-y-2">
                      {order.notes && (
                        <p className="text-muted-foreground line-clamp-2 bg-muted/40 p-2 rounded border text-[11px]">
                          {order.notes}
                        </p>
                      )}

                      {/* Line items preview */}
                      {order.items && order.items.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-border/50">
                          {order.items.slice(0, 3).map((item) => (
                            <div key={item.id || item.productId} className="flex justify-between text-muted-foreground">
                              <span className="truncate max-w-[200px]">
                                {item.quantity}× {item.productName}
                              </span>
                              <span className="font-mono">
                                {formatCurrency(item.totalPrice ?? item.unitPrice * item.quantity)}
                              </span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-[10px] text-muted-foreground italic">
                              + {order.items.length - 3} more items...
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-3 border-t bg-muted/20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingOrder(order)}
                          className="h-8 text-xs gap-1"
                        >
                          <Edit3 className="size-3" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(order.id)}
                          disabled={isCancelling || isSubmitting}
                          className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
                        >
                          {isCancelling ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                          <span>Discard</span>
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1">
                          <Link href={`/orders/${order.id}`}>
                            <span>Details</span>
                            <ArrowRight className="size-3" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSubmit(order.id)}
                          disabled={isSubmitting || isCancelling}
                          className="h-8 text-xs bg-brand text-brand-foreground hover:bg-brand/90 gap-1"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="size-3 animate-spin" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <Send className="size-3" />
                              <span>Submit Order</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 2. ACTIVE ORDERS TAB */}
        <TabsContent value="active" className="space-y-4">
          {activeOrders.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No active orders"
              description="Submitted purchase orders will appear here while being reviewed, accepted, and dispatched by wholesalers."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeOrders.map((order) => {
                const isDelivering = actionLoadingId === `deliver-${order.id}`;
                const isDispatched = order.status === "DISPATCHED";

                return (
                  <Card key={order.id} className="flex flex-col justify-between border-border hover:border-brand/40 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-semibold">
                              Order #{order.orderNumber}
                            </CardTitle>
                            <OrderStatusBadge status={order.status} size="sm" />
                          </div>
                          <CardDescription className="text-xs mt-1 flex items-center gap-1.5">
                            <Store className="size-3.5 text-muted-foreground" />
                            <span>{order.wholesalerName || "Wholesaler"}</span>
                            {order.wholesalerCity && (
                              <span className="text-muted-foreground">• {order.wholesalerCity}</span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-bold font-mono text-brand">
                            {formatCurrency(order.totalAmount)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatDate(order.submittedAt || order.createdAt)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-3 text-xs space-y-2">
                      {isDispatched && (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-2">
                          <Truck className="size-4 shrink-0" />
                          <span>Order has been dispatched! Confirm delivery once received to restock inventory.</span>
                        </div>
                      )}

                      {order.items && (
                        <div className="space-y-1 pt-1 border-t border-border/50">
                          {order.items.slice(0, 3).map((item) => (
                            <div key={item.id || item.productId} className="flex justify-between text-muted-foreground">
                              <span className="truncate max-w-[200px]">
                                {item.quantity}× {item.productName}
                              </span>
                              <span className="font-mono">
                                {formatCurrency(item.totalPrice ?? item.unitPrice * item.quantity)}
                              </span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-[10px] text-muted-foreground italic">
                              + {order.items.length - 3} more items...
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-3 border-t bg-muted/20 flex items-center justify-between gap-2">
                      <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                        <Link href={`/orders/${order.id}`}>
                          <span>View Details & Timeline</span>
                          <ArrowRight className="size-3" />
                        </Link>
                      </Button>

                      {isDispatched ? (
                        <Button
                          size="sm"
                          onClick={() => handleDeliver(order.id)}
                          disabled={isDelivering}
                          className="h-8 text-xs bg-success text-success-foreground hover:bg-success/90 gap-1.5"
                        >
                          {isDelivering ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              <span>Restocking...</span>
                            </>
                          ) : (
                            <>
                              <PackageCheck className="size-3.5" />
                              <span>Confirm Delivery</span>
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(order.id)}
                          disabled={actionLoadingId === `cancel-${order.id}`}
                          className="h-8 text-xs text-muted-foreground hover:text-destructive"
                        >
                          Cancel Order
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 3. HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          {pastOrders.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No order history"
              description="Delivered and completed orders will appear here."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">Order</th>
                    <th className="py-3 px-4 text-left font-medium">Wholesaler</th>
                    <th className="py-3 px-4 text-left font-medium">Status</th>
                    <th className="py-3 px-4 text-right font-medium">Items</th>
                    <th className="py-3 px-4 text-right font-medium">Total Amount</th>
                    <th className="py-3 px-4 text-right font-medium">Date</th>
                    <th className="py-3 px-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {pastOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {order.wholesalerName}
                      </td>
                      <td className="py-3 px-4">
                        <OrderStatusBadge status={order.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground font-mono">
                        {order.items?.length || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-bold font-mono text-brand">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-muted-foreground font-mono">
                        {formatDate(order.deliveredAt || order.updatedAt || order.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
                          <Link href={`/orders/${order.id}`}>
                            <span>View</span>
                            <ArrowRight className="size-3" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Order Items Modal */}
      {editingOrder && (
        <EditOrderItemsDialog
          order={editingOrder}
          isOpen={!!editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={async (items) => {
            await onUpdateItems(editingOrder.id, items);
            setEditingOrder(null);
          }}
        />
      )}
    </div>
  );
}
