"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Boxes,
  CircleAlert,
  Package,
  PlusCircle,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { PageSkeleton } from "@/components/states/loading-state";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { apiClient } from "@/lib/api-client";
import type { RetailerDashboardData, SalesTrendPoint } from "@/types";

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function RetailerDashboard() {
  const [dashboard, setDashboard] = useState<RetailerDashboardData | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendPoint[]>([]);
  const [trendDays, setTrendDays] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashData, trendData] = await Promise.all([
        apiClient.get<RetailerDashboardData>("/dashboard/retailer"),
        apiClient.get<SalesTrendPoint[]>("/analytics/sales-trend", {
          query: { days: trendDays },
        }),
      ]);
      setDashboard(dashData);
      setSalesTrend(Array.isArray(trendData) ? trendData : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load retailer dashboard data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [trendDays]);

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
    stockValue = 0,
    lowStockCount = 0,
    openOrders = 0,
    sales7d = 0,
    lowStockAlerts = [],
    recentNotifications = [],
  } = dashboard || {};

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Inventory Valuation"
          value={formatCurrency(stockValue)}
          description="Total value of current stocked goods"
          icon={Boxes}
          variant="brand"
        />
        <KpiCard
          title="Low Stock Alerts"
          value={lowStockCount}
          badge={lowStockCount > 0 ? "Action needed" : "All stocked"}
          badgeVariant={lowStockCount > 0 ? "destructive" : "secondary"}
          description={
            lowStockCount > 0
              ? `${lowStockCount} item${lowStockCount > 1 ? "s" : ""} at or below minimum threshold`
              : "No stockout risks detected"
          }
          icon={AlertTriangle}
          variant={lowStockCount > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="Open Purchase Orders"
          value={openOrders}
          description="Orders submitted or in transit"
          icon={Truck}
          variant="info"
        />
        <KpiCard
          title="Sales (Last 7 Days)"
          value={formatCurrency(sales7d)}
          description="Revenue from recorded retail sales"
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Main Content Grid: Sales Trend + Low Stock Alerts */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Sales Trend Chart (4 cols) */}
        <div className="lg:col-span-4">
          <SalesTrendChart
            data={salesTrend}
            days={trendDays}
            onDaysChange={setTrendDays}
            className="h-full"
          />
        </div>

        {/* Low-Stock Alerts Card (3 cols) */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <CircleAlert className="size-4 text-warning" aria-hidden />
                Low Stock Alerts
              </CardTitle>
              <CardDescription className="text-xs">
                Items requiring replenishment from wholesalers
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link href="/inventory">View all</Link>
            </Button>
          </CardHeader>

          <CardContent className="flex-1 px-4 pb-4">
            {lowStockAlerts.length === 0 ? (
              <EmptyState
                title="All products well stocked"
                description="No items currently at or below minimum reorder levels."
                icon={Package}
                className="min-h-48 border-none bg-muted/20"
              />
            ) : (
              <div className="divide-y divide-border/60">
                {lowStockAlerts.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between py-3 text-sm first:pt-1 last:pb-1"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium truncate text-foreground">
                        {item.productName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.wholesalerName} · SKU: {item.sku}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-right">
                        <span className="font-semibold text-warning">
                          {item.quantity} in stock
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          min: {item.minStock}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild className="h-7 px-2 text-xs">
                        <Link href="/orders">
                          Order <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Grid: Quick Actions & Recent Notifications */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Operations Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            <CardDescription className="text-xs">
              Frequently used retailer operations
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
              <Link href="/sales">
                <PlusCircle className="size-4 text-brand" />
                <div className="text-left">
                  <div className="font-medium text-xs">Record Sale</div>
                  <div className="text-[10px] text-muted-foreground">Deduct retail stock</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
              <Link href="/orders">
                <ShoppingBag className="size-4 text-brand" />
                <div className="text-left">
                  <div className="font-medium text-xs">Suggested Orders</div>
                  <div className="text-[10px] text-muted-foreground">Restock from suppliers</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
              <Link href="/inventory">
                <Boxes className="size-4 text-brand" />
                <div className="text-left">
                  <div className="font-medium text-xs">Manage Stock</div>
                  <div className="text-[10px] text-muted-foreground">Adjust inventory counts</div>
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
                <div className="font-medium text-xs">Refresh Dashboard</div>
                <div className="text-[10px] text-muted-foreground">Sync live telemetry</div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Notifications Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recent Alerts</CardTitle>
              <CardDescription className="text-xs">
                Latest updates and order notifications
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {recentNotifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No recent notifications"
                description="You are all caught up with alerts and order events."
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

