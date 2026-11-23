"use client";

import { Package, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-state";
import type { Role, TopProduct } from "@/types";

interface TopProductsCardProps {
  products: TopProduct[];
  role: Role | null;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  className?: string;
}

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function TopProductsCard({
  products,
  role,
  limit = 10,
  onLimitChange,
  className,
}: TopProductsCardProps) {
  const maxRevenue = Math.max(...products.map((p) => p.totalRevenue), 1);
  const totalVolume = products.reduce((acc, p) => acc + (p.totalQuantity ?? p.totalSold ?? p.totalOrdered ?? 0), 0);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Package className="size-4 text-brand" aria-hidden />
            {role === "WHOLESALER" ? "Top Ordered Products" : "Best Selling Products"}
          </CardTitle>
          <CardDescription className="text-xs">
            {role === "WHOLESALER"
              ? "Wholesale items ranked by purchase demand"
              : "Retail inventory ranked by sales performance"}
          </CardDescription>
        </div>

        {onLimitChange ? (
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
            {[5, 10, 20].map((l) => (
              <Button
                key={l}
                variant={limit === l ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onLimitChange(l)}
                className={`h-6 px-2 text-xs font-medium ${
                  limit === l ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                }`}
              >
                Top {l}
              </Button>
            ))}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="pt-1">
        {products.length === 0 ? (
          <EmptyState
            title="No product performance data"
            description="Products will rank here once transactions are recorded."
            icon={Package}
            className="min-h-56 border-none bg-muted/20"
          />
        ) : (
          <div className="space-y-4">
            {/* Summary metrics */}
            <div className="flex items-center justify-between border-b pb-3 text-xs text-muted-foreground">
              <span>{products.length} products listed</span>
              <span>
                Total volume: <strong className="text-foreground">{totalVolume} units</strong>
              </span>
            </div>

            {/* Product list */}
            <div className="divide-y divide-border/50">
              {products.map((product, index) => {
                const quantity = product.totalQuantity ?? product.totalSold ?? product.totalOrdered ?? 0;
                const revenuePercent = Math.round((product.totalRevenue / maxRevenue) * 100);

                return (
                  <div key={product.productId} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            index === 0
                              ? "bg-brand text-brand-foreground shadow-xs"
                              : index === 1
                              ? "bg-muted-foreground/30 text-foreground"
                              : index === 2
                              ? "bg-muted-foreground/20 text-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs sm:text-sm text-foreground truncate">
                            {product.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                            <span className="font-mono">SKU: {product.sku}</span>
                            {product.category ? (
                              <>
                                <span>•</span>
                                <span>{product.category}</span>
                              </>
                            ) : null}
                            {product.wholesalerName ? (
                              <>
                                <span>•</span>
                                <span className="truncate">{product.wholesalerName}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-semibold text-xs sm:text-sm text-foreground">
                          {formatCurrency(product.totalRevenue)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {quantity} {product.unit ?? "units"}{" "}
                          {role === "WHOLESALER" ? "ordered" : "sold"}
                        </p>
                      </div>
                    </div>

                    {/* Relative share bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand transition-all duration-500"
                          style={{ width: `${Math.max(revenuePercent, 4)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-8 text-right font-mono">
                        {revenuePercent}%
                      </span>
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

