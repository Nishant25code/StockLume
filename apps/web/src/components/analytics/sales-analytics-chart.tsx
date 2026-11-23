"use client";

import { useId, useState } from "react";
import { BarChart3, LineChart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-state";
import type { Role, SalesTrendPoint } from "@/types";

interface SalesAnalyticsChartProps {
  data: SalesTrendPoint[];
  role: Role | null;
  days: number;
  onDaysChange?: (days: number) => void;
  className?: string;
}

type MetricMode = "revenue" | "volume";

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SalesAnalyticsChart({
  data,
  role,
  days,
  onDaysChange,
  className,
}: SalesAnalyticsChartProps) {
  const [metricMode, setMetricMode] = useState<MetricMode>("revenue");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId();

  const totalRevenue = data.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalUnits = data.reduce((acc, p) => acc + (p.totalQuantity ?? 0), 0);
  const totalOrders = data.reduce((acc, p) => acc + (p.orderCount ?? 0), 0);
  const avgDailyRevenue = data.length > 0 ? totalRevenue / data.length : 0;

  const getValue = (point: SalesTrendPoint) => {
    return metricMode === "revenue"
      ? point.totalAmount
      : (point.totalQuantity ?? point.orderCount ?? 0);
  };

  const maxValue = Math.max(...data.map(getValue), metricMode === "revenue" ? 100 : 10);

  // SVG chart dimensions
  const width = 720;
  const height = 220;
  const paddingX = 28;
  const paddingY = 28;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = data.map((point, index) => {
    const val = getValue(point);
    const x =
      data.length > 1
        ? paddingX + (index / (data.length - 1)) * chartWidth
        : width / 2;
    const y = height - paddingY - (val / maxValue) * chartHeight;
    return { x, y, point, val };
  });

  const pathD = points.reduce((acc, curr, index) => {
    return index === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
      : "";

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="size-4 text-brand" aria-hidden />
            {role === "WHOLESALER" ? "Incoming Orders Trend" : "Sales Revenue Trend"}
          </CardTitle>
          <CardDescription className="text-xs">
            {metricMode === "revenue" ? "Daily financial transaction volume" : "Daily unit quantities"}
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric toggle */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
            <Button
              variant={metricMode === "revenue" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMetricMode("revenue")}
              className={`h-6 px-2 text-xs ${
                metricMode === "revenue"
                  ? "bg-background shadow-xs text-foreground font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              Revenue (₹)
            </Button>
            <Button
              variant={metricMode === "volume" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMetricMode("volume")}
              className={`h-6 px-2 text-xs ${
                metricMode === "volume"
                  ? "bg-background shadow-xs text-foreground font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              Volume (Units)
            </Button>
          </div>

          {/* Date range filter */}
          {onDaysChange ? (
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
              {[7, 14, 30, 90].map((d) => (
                <Button
                  key={d}
                  variant={days === d ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onDaysChange(d)}
                  className={`h-6 px-2 text-xs ${
                    days === d
                      ? "bg-background shadow-xs text-foreground font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  {d}d
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* KPI Strip */}
        <div className="mb-4 grid grid-cols-2 gap-4 border-b pb-3 sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Period Total
            </p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Daily Average
            </p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(avgDailyRevenue)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Units Handled
            </p>
            <p className="text-lg font-bold text-foreground">
              {totalUnits > 0 ? totalUnits : totalOrders}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Transactions
            </p>
            <p className="text-lg font-bold text-foreground">
              {totalOrders}
            </p>
          </div>
        </div>

        {/* SVG Curve Chart */}
        {data.length === 0 ? (
          <EmptyState
            title="No sales activity in this period"
            description="Transaction telemetry will render when sales or orders are booked."
            icon={BarChart3}
            className="min-h-56 border-none bg-muted/20"
          />
        ) : (
          <div className="relative">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full overflow-visible"
              style={{ maxHeight: "240px" }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Reference Lines */}
              <line
                x1={paddingX}
                y1={paddingY}
                x2={width - paddingX}
                y2={paddingY}
                stroke="currentColor"
                className="text-border/50"
                strokeDasharray="4 4"
              />
              <line
                x1={paddingX}
                y1={paddingY + chartHeight / 2}
                x2={width - paddingX}
                y2={paddingY + chartHeight / 2}
                stroke="currentColor"
                className="text-border/50"
                strokeDasharray="4 4"
              />
              <line
                x1={paddingX}
                y1={height - paddingY}
                x2={width - paddingX}
                y2={height - paddingY}
                stroke="currentColor"
                className="text-border"
              />

              {/* Shaded Area */}
              <path d={areaD} fill={`url(#${gradientId})`} />

              {/* Primary Curve */}
              <path
                d={pathD}
                fill="none"
                stroke="var(--color-brand)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Hover Hit Targets and Dots */}
              {points.map((pt, i) => (
                <g key={i}>
                  <rect
                    x={pt.x - chartWidth / (data.length * 2)}
                    y={0}
                    width={chartWidth / data.length}
                    height={height}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                  />

                  {(hoveredIndex === i || data.length <= 14) && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredIndex === i ? 5 : 3}
                      fill="var(--color-background)"
                      stroke="var(--color-brand)"
                      strokeWidth={hoveredIndex === i ? 2.5 : 1.5}
                      className="transition-all"
                    />
                  )}
                </g>
              ))}

              {/* Vertical Guide line on hover */}
              {hoveredPoint ? (
                <line
                  x1={hoveredPoint.x}
                  y1={paddingY}
                  x2={hoveredPoint.x}
                  y2={height - paddingY}
                  stroke="var(--color-brand)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  className="pointer-events-none opacity-80"
                />
              ) : null}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint ? (
              <div
                className="pointer-events-none absolute -top-3 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg transition-all -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${(hoveredPoint.x / width) * 100}%`,
                }}
              >
                <p className="font-semibold">{hoveredPoint.point.date}</p>
                <p className="text-brand font-bold text-sm">
                  {formatCurrency(hoveredPoint.point.totalAmount)}
                </p>
                {hoveredPoint.point.totalQuantity !== undefined && hoveredPoint.point.totalQuantity > 0 ? (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {hoveredPoint.point.totalQuantity} units sold
                  </p>
                ) : null}
                {hoveredPoint.point.orderCount !== undefined ? (
                  <p className="text-[11px] text-muted-foreground">
                    {hoveredPoint.point.orderCount} transaction{hoveredPoint.point.orderCount === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Dates along the bottom */}
            {data.length > 0 ? (
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground px-2">
                <span>{data[0].date}</span>
                {data.length > 2 ? <span>{data[Math.floor(data.length / 2)].date}</span> : null}
                <span>{data[data.length - 1].date}</span>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

