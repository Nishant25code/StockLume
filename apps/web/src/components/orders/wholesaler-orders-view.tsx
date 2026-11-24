"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Inbox,
  Loader2,
  Store,
  Truck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/states/empty-state";
import { OrderStatusBadge } from "./order-status-badge";
import { RejectOrderModal } from "./reject-order-modal";
import type { Order } from "@/types";

interface WholesalerOrdersViewProps {
  orders: Order[];
  onAcceptOrder: (orderId: string) => Promise<void>;
  onRejectOrder: (orderId: string, reason: string) => Promise<void>;
  onDispatchOrder: (orderId: string) => Promise<void>;
}

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(isoString?: string | null) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WholesalerOrdersView({
  orders,
  onAcceptOrder,
  onRejectOrder,
  onDispatchOrder,
}: WholesalerOrdersViewProps) {
  const [activeTab, setActiveTab] = useState("incoming");
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Strict business rule: wholesalers NEVER see DRAFT orders
  const visibleOrders = orders.filter((o) => o.status !== "DRAFT");

  const incomingOrders = visibleOrders.filter((o) => o.status === "SUBMITTED");
  const acceptedOrders = visibleOrders.filter((o) => o.status === "ACCEPTED");
  const allOtherOrders = visibleOrders.filter(
    (o) => ["DISPATCHED", "DELIVERED", "REJECTED", "CANCELLED"].includes(o.status)
  );

  async function handleAccept(orderId: string) {
    try {
      setActionLoadingId(`accept-${orderId}`);
      await onAcceptOrder(orderId);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDispatch(orderId: string) {
    try {
      setActionLoadingId(`dispatch-${orderId}`);
      await onDispatchOrder(orderId);
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/50 backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Wholesaler Fulfillment Queue</h2>
            <Badge variant="outline" className="bg-info/10 text-info border-info/20 text-xs">
              Wholesaler Portal
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Review incoming purchase requests from connected retailers, confirm stock, and dispatch shipments.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="px-3 py-1 text-xs gap-1.5">
            <Inbox className="size-3.5 text-brand" />
            <span>{incomingOrders.length} pending review</span>
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="incoming" className="gap-2">
            <span>Incoming</span>
            {incomingOrders.length > 0 && (
              <Badge variant="destructive" className="size-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                {incomingOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accepted" className="gap-2">
            <span>To Dispatch</span>
            {acceptedOrders.length > 0 && (
              <Badge variant="secondary" className="size-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                {acceptedOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">
            <span>All Fulfillments</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. INCOMING ORDERS QUEUE */}
        <TabsContent value="incoming" className="space-y-4">
          {incomingOrders.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No incoming orders"
              description="New orders submitted by your connected retailers will appear here for acceptance or rejection."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {incomingOrders.map((order) => {
                const isAccepting = actionLoadingId === `accept-${order.id}`;

                return (
                  <Card key={order.id} className="flex flex-col justify-between border-brand/30 shadow-sm">
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
                            <Store className="size-3.5 text-brand" />
                            <span className="font-medium text-foreground">{order.retailerName || "Retailer Store"}</span>
                            {order.retailerCity && (
                              <span className="text-muted-foreground">• {order.retailerCity}</span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-bold font-mono text-brand">
                            {formatCurrency(order.totalAmount)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatDate(order.submittedAt)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-3 text-xs space-y-2">
                      {order.notes && (
                        <p className="text-muted-foreground line-clamp-2 bg-muted/40 p-2 rounded border text-[11px]">
                          Note: {order.notes}
                        </p>
                      )}

                      {/* Items summary */}
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

                    <CardFooter className="pt-3 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-2">
                      <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                        <Link href={`/orders/${order.id}`}>
                          <span>Details</span>
                          <ArrowRight className="size-3" />
                        </Link>
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRejectingOrder(order)}
                          className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
                        >
                          <XCircle className="size-3" />
                          <span>Reject</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(order.id)}
                          disabled={isAccepting}
                          className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
                        >
                          {isAccepting ? (
                            <>
                              <Loader2 className="size-3 animate-spin" />
                              <span>Accepting...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="size-3" />
                              <span>Accept Order</span>
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

        {/* 2. READY TO DISPATCH TAB */}
        <TabsContent value="accepted" className="space-y-4">
          {acceptedOrders.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No orders awaiting dispatch"
              description="Orders you have accepted will appear here until you mark them as dispatched."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {acceptedOrders.map((order) => {
                const isDispatching = actionLoadingId === `dispatch-${order.id}`;

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
                            <span className="font-medium text-foreground">{order.retailerName}</span>
                            {order.retailerCity && (
                              <span className="text-muted-foreground">• {order.retailerCity}</span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-bold font-mono text-brand">
                            {formatCurrency(order.totalAmount)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Accepted {formatDate(order.acceptedAt)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-3 text-xs space-y-2">
                      <div className="p-2.5 rounded-lg bg-info/10 border border-info/20 text-info flex items-center gap-2">
                        <Clock className="size-4 shrink-0" />
                        <span>Order accepted. Ready for warehouse fulfillment and dispatch.</span>
                      </div>

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
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-3 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-2">
                      <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                        <Link href={`/orders/${order.id}`}>
                          <span>View Details</span>
                          <ArrowRight className="size-3" />
                        </Link>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleDispatch(order.id)}
                        disabled={isDispatching}
                        className="h-8 text-xs bg-brand text-brand-foreground hover:bg-brand/90 gap-1.5"
                      >
                        {isDispatching ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            <span>Dispatching...</span>
                          </>
                        ) : (
                          <>
                            <Truck className="size-3.5" />
                            <span>Dispatch Order</span>
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 3. ALL FULFILLMENTS TAB */}
        <TabsContent value="all" className="space-y-4">
          {allOtherOrders.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No historical fulfillments"
              description="Dispatched, delivered, and rejected orders will be listed here."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">Order</th>
                    <th className="py-3 px-4 text-left font-medium">Retailer</th>
                    <th className="py-3 px-4 text-left font-medium">Status</th>
                    <th className="py-3 px-4 text-right font-medium">Items</th>
                    <th className="py-3 px-4 text-right font-medium">Total Amount</th>
                    <th className="py-3 px-4 text-right font-medium">Last Update</th>
                    <th className="py-3 px-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {allOtherOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        <div className="font-medium text-foreground">{order.retailerName}</div>
                        {order.retailerCity && <div className="text-xs text-muted-foreground">{order.retailerCity}</div>}
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
                        {formatDate(order.deliveredAt || order.dispatchedAt || order.rejectedAt || order.updatedAt)}
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

      {/* Reject Order Modal */}
      {rejectingOrder && (
        <RejectOrderModal
          orderNumber={rejectingOrder.orderNumber}
          isOpen={!!rejectingOrder}
          onClose={() => setRejectingOrder(null)}
          onConfirm={async (reason) => {
            await onRejectOrder(rejectingOrder.id, reason);
            setRejectingOrder(null);
          }}
        />
      )}
    </div>
  );
}
