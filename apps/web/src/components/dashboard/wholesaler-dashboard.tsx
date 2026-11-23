"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Boxes,
  CheckCircle2,
  Clock,
  Coins,
  Inbox,
  Package,
  PlusCircle,
  RefreshCw,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { PageSkeleton } from "@/components/states/loading-state";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { apiClient } from "@/lib/api-client";
import type { WholesalerDashboardData } from "@/types";

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function WholesalerDashboard() {
  const [dashboard, setDashboard] = useState<WholesalerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<WholesalerDashboardData>("/dashboard/wholesaler");
      setDashboard(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load wholesaler dashboard data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading && !dashboard) {
    return <PageSkeleton />;
  }

  if (error && !dashboard) {
    return (
      <ErrorState
        title="Could not load dashboard"
        message={error}
        onRetry={loadData}
      />
    );
  }

  const {
    pendingOrders = 0,
    revenue = 0,
    connectedRetailers = 0,
    topProducts = [],
    pendingOrdersList = [],
    recentNotifications = [],
  } = dashboard || {};

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Orders Awaiting Acceptance"
          value={pendingOrders}
          badge={pendingOrders > 0 ? "Review needed" : "All clear"}
          badgeVariant={pendingOrders > 0 ? "destructive" : "secondary"}
          description={
            pendingOrders > 0
              ? `${pendingOrders} order${pendingOrders > 1 ? "s" : ""} submitted by retailers`
              : "No pending purchase orders"
          }
          icon={Clock}
          variant={pendingOrders > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="Total Confirmed Revenue"
          value={formatCurrency(revenue)}
          description="From accepted, dispatched & delivered orders"
          icon={Coins}
          variant="brand"
        />
        <KpiCard
          title="Connected Retailers"
          value={connectedRetailers}
          description="Active verified buyer partnerships"
          icon={Store}
          variant="info"
        />
        <KpiCard
          title="Top Product Performance"
          value={topProducts.length > 0 ? `${topProducts[0].totalOrdered} units` : "0 units"}
          description={topProducts.length > 0 ? `Best seller: ${topProducts[0].name}` : "No sales data yet"}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* Main Content: Orders Awaiting Acceptance + Top Products */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Orders Awaiting Acceptance (4 cols) */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Inbox className="size-4 text-brand" aria-hidden />
                Incoming Purchase Orders
              </CardTitle>
              <CardDescription className="text-xs">
                Retailer orders waiting for your acceptance or rejection
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link href="/orders">View all</Link>
            </Button>
          </CardHeader>

          <CardContent className="flex-1 px-4 pb-4">
            {pendingOrdersList.length === 0 ? (
              <EmptyState
                title="No orders awaiting acceptance"
                description="When connected retailers submit purchase orders, they will appear here."
                icon={Inbox}
                className="min-h-48 border-none bg-muted/20"
              />
            ) : (
              <div className="divide-y divide-border/60">
                {pendingOrdersList.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-3 text-sm first:pt-1 last:pb-1"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          Order #{order.orderNumber}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                          SUBMITTED
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Retailer: <span className="font-medium text-foreground/80">{order.retailerName}</span>
                        {order.submittedAt ? (
                          <span> · {new Date(order.submittedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}</span>
                        ) : null}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-right font-bold text-foreground">
                        {formatCurrency(order.totalAmount)}
                      </span>
                      <Button variant="outline" size="sm" asChild className="h-7 px-2.5 text-xs">
                        <Link href="/orders">
                          Review <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products Summary (3 cols) */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Package className="size-4 text-brand" aria-hidden />
                Top Selling Products
              </CardTitle>
              <CardDescription className="text-xs">
                Catalogue items ordered most by retailers
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link href="/products">Catalogue</Link>
            </Button>
          </CardHeader>

          <CardContent className="flex-1 px-4 pb-4">
            {topProducts.length === 0 ? (
              <EmptyState
                title="No product sales yet"
                description="Products ordered by retailers will rank here."
                icon={Package}
                className="min-h-48 border-none bg-muted/20"
              />
            ) : (
              <div className="divide-y divide-border/60">
                {topProducts.map((p, index) => (
                  <div
                    key={p.productId}
                    className="flex items-center justify-between py-2.5 text-sm first:pt-1 last:pb-1"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate text-foreground text-xs sm:text-sm">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          SKU: {p.sku} · {formatCurrency(p.price)}/unit
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-semibold text-xs text-foreground">
                        {p.totalOrdered} ordered
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatCurrency(p.totalRevenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Grid: Quick Operations & Wholesaler Alerts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Operations Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Wholesaler Actions</CardTitle>
            <CardDescription className="text-xs">
              Catalogue management and dispatch operations
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
              <Link href="/products">
                <PlusCircle className="size-4 text-brand" />
                <div className="text-left">
                  <div className="font-medium text-xs">Add Product</div>
                  <div className="text-[10px] text-muted-foreground">Expand your catalogue</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
              <Link href="/orders">
                <ShoppingBag className="size-4 text-brand" />
                <div className="text-left">
                  <div className="font-medium text-xs">Order Management</div>
                  <div className="text-[10px] text-muted-foreground">Accept, dispatch & track</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
              <Link href="/connections">
                <Users className="size-4 text-brand" />
                <div className="text-left">
                  <div className="font-medium text-xs">Retailer Connections</div>
                  <div className="text-[10px] text-muted-foreground">Manage your buyers</div>
                </div>
              </Link>
            </Button>

            <Button
              variant="outline"
              className="justify-start gap-2 h-auto py-3"
              onClick={() => loadData()}
            >
              <RefreshCw className="size-4 text-brand" />
              <div className="text-left">
                <div className="font-medium text-xs">Sync Telemetry</div>
                <div className="text-[10px] text-muted-foreground">Refresh dashboard stats</div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Notifications Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recent Alerts</CardTitle>
              <CardDescription className="text-xs">
                Order activity and retailer connection events
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {recentNotifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No recent notifications"
                description="Order events and buyer alerts will appear here."
                className="border-none py-6 min-h-36"
              />
            ) : (
              <div className="divide-y divide-border/60">
                {recentNotifications.slice(0, 4).map((n) => (
                  <div key={n.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground truncate">
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

