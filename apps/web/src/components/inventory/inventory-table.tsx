"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Package,
  Search,
  ShoppingCart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/states/empty-state";
import type { InventoryRow, StockoutRisk } from "@/types";

interface InventoryTableProps {
  items: InventoryRow[];
  onSelectProductForSale?: (productId: string) => void;
  className?: string;
}

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getRiskBadge(risk?: StockoutRisk, daysLeft?: number, belowMin = false) {
  // Stock at/below the reorder threshold is never "Healthy", even if sales-based prediction says LOW.
  if (belowMin && risk !== "HIGH" && risk !== "MEDIUM") {
    return (
      <Badge
        variant="outline"
        className="gap-1 bg-warning/15 text-warning border-warning/30 text-[10px] font-semibold"
      >
        <AlertTriangle className="size-3" />
        <span>Below minimum</span>
      </Badge>
    );
  }
  switch (risk) {
    case "HIGH":
      return (
        <Badge
          variant="destructive"
          className="gap-1 bg-destructive/15 text-destructive border-destructive/30 text-[10px] font-semibold"
        >
          <AlertTriangle className="size-3" />
          <span>High Risk</span>
          {daysLeft !== undefined && daysLeft !== null ? (
            <span className="opacity-80">({daysLeft}d left)</span>
          ) : null}
        </Badge>
      );
    case "MEDIUM":
      return (
        <Badge
          variant="outline"
          className="gap-1 bg-warning/15 text-warning border-warning/30 text-[10px] font-semibold"
        >
          <Clock className="size-3" />
          <span>Medium Risk</span>
          {daysLeft !== undefined && daysLeft !== null ? (
            <span className="opacity-80">({daysLeft}d left)</span>
          ) : null}
        </Badge>
      );
    case "LOW":
      return (
        <Badge
          variant="outline"
          className="gap-1 bg-success/15 text-success border-success/30 text-[10px] font-medium"
        >
          <CheckCircle className="size-3" />
          <span>Healthy</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-[10px]">
          Normal
        </Badge>
      );
  }
}

/** Stock level against the reorder minimum: the tick marks the minimum, the fill turns amber/red below it. */
function StockLevel({ quantity, min }: { quantity: number; min: number }) {
  const scale = Math.max(min * 2, quantity, 1);
  const fill = Math.min(100, (quantity / scale) * 100);
  const tick = Math.min(100, (min / scale) * 100);
  const tone = quantity === 0 ? "bg-destructive" : quantity <= min ? "bg-warning" : "bg-success";
  return (
    <div
      className="relative mt-1.5 ml-auto h-1.5 w-24 rounded-full bg-muted"
      role="img"
      aria-label={`${quantity} in stock, minimum ${min}`}
    >
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${fill}%` }} />
      <span className="absolute -top-0.5 h-2.5 w-0.5 rounded-full bg-foreground/60" style={{ left: `${tick}%` }} />
    </div>
  );
}

export function InventoryTable({
  items,
  onSelectProductForSale,
  className,
}: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRisk, setSelectedRisk] = useState<"ALL" | StockoutRisk>("ALL");

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRisk =
      selectedRisk === "ALL" ||
      item.risk === selectedRisk ||
      (selectedRisk === "HIGH" && item.quantity <= (item.minStock ?? 10));

    return matchesSearch && matchesRisk;
  });

  const highRiskCount = items.filter(
    (i) => i.risk === "HIGH" || i.quantity <= (i.minStock ?? 10),
  ).length;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Package className="size-4 text-brand" aria-hidden />
            Current Stock & Risk Telemetry
          </CardTitle>
          <CardDescription className="text-xs">
            Real-time inventory levels, replenishment rules, and stockout probability
          </CardDescription>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-44 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search product / SKU…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs">
            {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((r) => (
              <Button
                key={r}
                variant={selectedRisk === r ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedRisk(r)}
                className={`h-6 px-2 text-[11px] ${
                  selectedRisk === r
                    ? "bg-background shadow-xs text-foreground font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {r === "ALL" ? "All" : r}
                {r === "HIGH" && highRiskCount > 0 ? (
                  <span className="ml-1 rounded-full bg-destructive px-1 text-[9px] text-destructive-foreground">
                    {highRiskCount}
                  </span>
                ) : null}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-1">
        {filteredItems.length === 0 ? (
          <EmptyState
            title="No matching inventory found"
            description={
              searchTerm || selectedRisk !== "ALL"
                ? "Try adjusting your search query or risk filter."
                : "Add products from connected wholesalers to stock your store."
            }
            icon={Package}
            className="min-h-56 border-none bg-muted/20"
          />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b text-muted-foreground text-xs font-medium">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3 text-right">In stock vs minimum</th>
                  <th className="py-2.5 px-3 text-right">Minimum</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3">Stockout risk</th>
                  <th className="py-2.5 px-3 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-normal">
                {filteredItems.map((item) => {
                  const min = item.minStock ?? 10;
                  const isBelowMin = item.quantity <= min;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isBelowMin ? "bg-warning/5" : ""
                      }`}
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">{item.productName}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">SKU: {item.sku}</span>
                          {item.category ? (
                            <>
                              <span>•</span>
                              <span>{item.category}</span>
                            </>
                          ) : null}
                        </div>
                      </td>

                      {/* Wholesaler Supplier */}
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                        {item.wholesalerName || "—"}
                      </td>

                      {/* Available Stock */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            item.quantity === 0
                              ? "text-destructive"
                              : isBelowMin
                              ? "text-warning"
                              : "text-foreground"
                          }`}
                        >
                          {item.quantity}
                        </span>{" "}
                        <span className="text-[11px] text-muted-foreground">{item.unit}</span>
                        <StockLevel quantity={item.quantity} min={min} />
                      </td>

                      {/* Min Threshold */}
                      <td className="py-3 px-3 text-right text-muted-foreground whitespace-nowrap">
                        {min} {item.unit}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 text-right font-medium text-foreground whitespace-nowrap">
                        {formatCurrency(item.price)}
                      </td>

                      {/* Risk Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getRiskBadge(item.risk, item.daysOfStockLeft, isBelowMin)}
                      </td>

                      {/* Quick Action */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="w-[4.75rem]">
                            {isBelowMin ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="h-7 px-2 text-[11px] gap-1 text-warning hover:text-warning"
                              >
                                <Link href="/orders">
                                  <span>Reorder</span>
                                  <ArrowRight className="size-3" />
                                </Link>
                              </Button>
                            ) : null}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectProductForSale && onSelectProductForSale(item.productId)}
                            className="h-7 px-2 text-[11px] gap-1 hover:border-brand/40"
                          >
                            <ShoppingCart className="size-3 text-brand" />
                            <span>Sell</span>
                          </Button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

