"use client";

import { useId, useState } from "react";
import { TrendingUp } from "lucide-react";
import { formatShortDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SalesTrendPoint } from "@/types";

interface SalesTrendChartProps {
  data: SalesTrendPoint[];
  title?: string;
  description?: string;
  days?: number;
  onDaysChange?: (days: number) => void;
  className?: string;
}

export function SalesTrendChart({
  data,
  title = "Sales trend",
  description = "Daily sales revenue over time",
  days = 30,
  onDaysChange,
  className,
}: SalesTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId();

  const totalRevenue = data.reduce((acc, p) => acc + p.totalAmount, 0);
  const avgDailyRevenue = data.length > 0 ? totalRevenue / data.length : 0;
  const maxAmount = Math.max(...data.map((p) => p.totalAmount), 100);

  // SVG chart dimensions
  const width = 640;
  const height = 180;
  const paddingX = 24;
  const paddingY = 24;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = data.map((point, index) => {
    const x =
      data.length > 1
        ? paddingX + (index / (data.length - 1)) * chartWidth
        : width / 2;
    const y = height - paddingY - (point.totalAmount / maxAmount) * chartHeight;
    return { x, y, point };
  });

  // Build SVG path
  const pathD = points.reduce((acc, curr, index) => {
    return index === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  // Closed path for gradient area
  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
      : "";

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="size-4 text-brand" aria-hidden />
            {title}
          </CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>

        {onDaysChange ? (
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
            {[7, 14, 30].map((d) => (
              <Button
                key={d}
                variant={days === d ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onDaysChange(d)}
                className={`h-6 px-2 text-xs font-medium ${
                  days === d ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                }`}
              >
                {d}d
              </Button>
            ))}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="pt-2">
        {/* KPI summary bar */}
        <div className="mb-4 grid grid-cols-2 gap-4 border-b pb-3 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Total ({days}d)
            </p>
            <p className="text-lg font-bold text-foreground">
              ₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Daily average
            </p>
            <p className="text-lg font-bold text-foreground">
              ₹{avgDailyRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-muted-foreground">
              Peak day
            </p>
            <p className="text-lg font-bold text-foreground">
              ₹{maxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* SVG Area Chart */}
        {data.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
            No sales recorded in this period
          </div>
        ) : (
          <div className="relative">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full overflow-visible"
              style={{ maxHeight: "200px" }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid horizontal lines */}
              <line
                x1={paddingX}
                y1={paddingY}
                x2={width - paddingX}
                y2={paddingY}
                stroke="currentColor"
                className="text-border/60"
                strokeDasharray="3 3"
              />
              <line
                x1={paddingX}
                y1={paddingY + chartHeight / 2}
                x2={width - paddingX}
                y2={paddingY + chartHeight / 2}
                stroke="currentColor"
                className="text-border/60"
                strokeDasharray="3 3"
              />
              <line
                x1={paddingX}
                y1={height - paddingY}
                x2={width - paddingX}
                y2={height - paddingY}
                stroke="currentColor"
                className="text-border"
              />

              {/* Gradient Area */}
              <path d={areaD} fill={`url(#${gradientId})`} />

              {/* Line */}
              <path
                d={pathD}
                fill="none"
                stroke="var(--color-brand)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points and hover zones */}
              {points.map((pt, i) => (
                <g key={i}>
                  {/* Invisible wide hover target */}
                  <rect
                    x={pt.x - chartWidth / (data.length * 2)}
                    y={0}
                    width={chartWidth / data.length}
                    height={height}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                  />

                  {/* Circle dot on hover or sampled */}
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

              {/* Active hover vertical cursor line */}
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

            {/* Floating Tooltip */}
            {hoveredPoint ? (
              <div
                className="pointer-events-none absolute -top-2 rounded-lg border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md transition-all -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${(hoveredPoint.x / width) * 100}%`,
                }}
              >
                <p className="font-semibold">{formatShortDate(hoveredPoint.point.date, true)}</p>
                <p className="text-brand font-medium">
                  ₹{hoveredPoint.point.totalAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                {hoveredPoint.point.totalQuantity !== undefined && hoveredPoint.point.totalQuantity > 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    {hoveredPoint.point.totalQuantity} items sold
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* X-axis start and end date labels */}
            {data.length > 0 ? (
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground px-2">
                <span>{formatShortDate(data[0].date)}</span>
                {data.length > 2 ? <span>{formatShortDate(data[Math.floor(data.length / 2)].date)}</span> : null}
                <span>{formatShortDate(data[data.length - 1].date)}</span>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

