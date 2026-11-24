"use client";

import { PieChart, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-state";
import type { OrderStatus, OrdersSummary, Role } from "@/types";

interface OrdersStatusCardProps {
  summary: OrdersSummary | null;
  role: Role | null;
  className?: string;
}

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; badgeVariant: "default" | "secondary" | "destructive" | "outline"; barColor: string }
> = {
  DRAFT: { label: "Draft", badgeVariant: "secondary", barColor: "bg-muted-foreground/40" },
  SUBMITTED: { label: "Submitted", badgeVariant: "outline", barColor: "bg-brand" },
  ACCEPTED: { label: "Accepted", badgeVariant: "outline", barColor: "bg-info" },
  DISPATCHED: { label: "Dispatched", badgeVariant: "outline", barColor: "bg-primary" },
  DELIVERED: { label: "Delivered", badgeVariant: "default", barColor: "bg-success" },
  REJECTED: { label: "Rejected", badgeVariant: "destructive", barColor: "bg-destructive" },
  CANCELLED: { label: "Cancelled", badgeVariant: "destructive", barColor: "bg-muted-foreground/20" },
};

export function OrdersStatusCard({ summary, role, className }: OrdersStatusCardProps) {
  const { totalOrders = 0, totalAmount = 0, byStatus = [] } = summary || {};

  // Sort byStatus by workflow lifecycle
  const orderOrder: OrderStatus[] = [
    "DRAFT",
    "SUBMITTED",
    "ACCEPTED",
    "DISPATCHED",
    "DELIVERED",
    "REJECTED",
    "CANCELLED",
  ];

  const sortedStatuses = [...byStatus].sort(
    (a, b) => orderOrder.indexOf(a.status) - orderOrder.indexOf(b.status),
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <PieChart className="size-4 text-brand" aria-hidden />
            Orders by Status
          </CardTitle>
          <Badge variant="outline" className="text-xs font-normal">
            {totalOrders} {totalOrders === 1 ? "order" : "orders"}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {role === "WHOLESALER"
            ? "Fulfillment distribution for incoming purchase requests"
            : "Pipeline breakdown of placed purchase orders"}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-1">
        {totalOrders === 0 ? (
          <EmptyState
            title="No orders recorded"
            description="Status metrics will calculate once orders are initiated."
            icon={ShoppingBag}
            className="min-h-56 border-none bg-muted/20"
          />
        ) : (
          <div className="space-y-5">
            {/* Value Highlights */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Order Value
                </p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">
                  Statuses Active
                </p>
                <p className="text-xl font-bold text-foreground">
                  {byStatus.length} of {role === "WHOLESALER" ? "6" : "7"}
                </p>
              </div>
            </div>

            {/* Segmented Horizontal Distribution Bar */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Distribution</span>
                <span>100%</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {sortedStatuses.map((item) => {
                  const percent = totalOrders > 0 ? (item.count / totalOrders) * 100 : 0;
                  const config = STATUS_CONFIG[item.status] || { barColor: "bg-muted" };
                  return (
                    <div
                      key={item.status}
                      className={`h-full ${config.barColor} transition-all duration-300 first:rounded-l-full last:rounded-r-full`}
                      style={{ width: `${percent}%` }}
                      title={`${item.status}: ${item.count} (${Math.round(percent)}%)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Status Breakdown Grid */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              {sortedStatuses.map((item) => {
                const percent = totalOrders > 0 ? Math.round((item.count / totalOrders) * 100) : 0;
                const config = STATUS_CONFIG[item.status] || {
                  label: item.status,
                  badgeVariant: "secondary",
                  barColor: "bg-muted",
                };

                return (
                  <div
                    key={item.status}
                    className="flex items-center justify-between rounded-lg border bg-card/60 p-2.5 text-xs transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${config.barColor}`} />
                      <div>
                        <p className="font-semibold text-foreground">{config.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatCurrency(item.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-foreground">{item.count}</p>
                      <p className="text-[10px] text-muted-foreground">{percent}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

