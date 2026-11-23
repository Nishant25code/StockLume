"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Coins,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/states/error-state";
import { PageSkeleton } from "@/components/states/loading-state";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SalesAnalyticsChart } from "@/components/analytics/sales-analytics-chart";
import { OrdersStatusCard } from "@/components/analytics/orders-status-card";
import { TopProductsCard } from "@/components/analytics/top-products-card";
import { apiClient } from "@/lib/api-client";
import { useSession } from "@/providers/session-provider";
import type { OrdersSummary, SalesTrendPoint, TopProduct } from "@/types";

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function AnalyticsView() {
  const { role } = useSession();
  const [days, setDays] = useState<number>(30);
  const [topProductsLimit, setTopProductsLimit] = useState<number>(10);

  const [salesTrend, setSalesTrend] = useState<SalesTrendPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [ordersSummary, setOrdersSummary] = useState<OrdersSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [trendData, productsData, summaryData] = await Promise.all([
        apiClient.get<SalesTrendPoint[]>("/analytics/sales-trend", {
          query: { days },
        }),
        apiClient.get<TopProduct[]>("/analytics/top-products", {
          query: { limit: topProductsLimit },
        }),
        apiClient.get<OrdersSummary>("/analytics/orders-summary", {
          query: { days },
        }),
      ]);

      setSalesTrend(Array.isArray(trendData) ? trendData : []);
      setTopProducts(Array.isArray(productsData) ? productsData : []);
      setOrdersSummary(summaryData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load analytics data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [days, topProductsLimit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading && salesTrend.length === 0 && !ordersSummary) {
    return <PageSkeleton />;
  }

  if (error && salesTrend.length === 0 && !ordersSummary) {
    return (
      <ErrorState
        title="Could not load analytics"
        message={error}
        onRetry={loadData}
      />
    );
  }

  // Summary figures
  const totalRevenue =
    ordersSummary?.totalAmount ??
    salesTrend.reduce((acc, p) => acc + p.totalAmount, 0);

  const totalOrders = ordersSummary?.totalOrders ?? 0;
  const bestSeller = topProducts[0];
  const avgDailyRevenue = days > 0 ? totalRevenue / days : 0;

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="size-4" aria-hidden />
          <span>Showing performance for the last <strong>{days} days</strong></span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Date Range Filter */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
            {[7, 14, 30, 90].map((d) => (
              <Button
                key={d}
                variant={days === d ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDays(d)}
                className={`h-7 px-2.5 text-xs font-medium ${
                  days === d
                    ? "bg-background shadow-xs text-foreground font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {d}d
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            title="Refresh analytics data"
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Period Revenue"
          value={formatCurrency(totalRevenue)}
          description={`${days}-day recorded monetary volume`}
          icon={Coins}
          variant="brand"
        />
        <KpiCard
          title="Total Orders Processed"
          value={totalOrders}
          description={`${days}-day purchase order pipeline`}
          icon={ShoppingBag}
          variant="info"
        />
        <KpiCard
          title="Top Performer"
          value={bestSeller ? bestSeller.name : "N/A"}
          description={
            bestSeller
              ? `${bestSeller.totalQuantity ?? bestSeller.totalSold ?? bestSeller.totalOrdered ?? 0} units (${formatCurrency(bestSeller.totalRevenue)})`
              : "No transactions recorded"
          }
          icon={PackageCheck}
          variant="success"
        />
        <KpiCard
          title="Daily Average Revenue"
          value={formatCurrency(avgDailyRevenue)}
          description={`Average daily intake over ${days}d`}
          icon={TrendingUp}
          variant="default"
        />
      </div>

      {/* Primary Analytics Chart */}
      <SalesAnalyticsChart
        data={salesTrend}
        role={role}
        days={days}
        onDaysChange={setDays}
      />

      {/* Two Column Analysis Grid: Orders by Status + Top Products */}
      <div className="grid gap-6 lg:grid-cols-2">
        <OrdersStatusCard
          summary={ordersSummary}
          role={role}
        />

        <TopProductsCard
          products={topProducts}
          role={role}
          limit={topProductsLimit}
          onLimitChange={setTopProductsLimit}
        />
      </div>
    </div>
  );
}

