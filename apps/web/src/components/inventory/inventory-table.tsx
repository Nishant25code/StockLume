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
import type { InventoryItem, StockoutRisk } from "@/types";

interface InventoryTableProps {
  items: InventoryItem[];
  onSelectProductForSale?: (productId: string) => void;
  className?: string;
}

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getRiskBadge(risk?: StockoutRisk, daysLeft?: number) {
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3 text-right">Available Stock</th>
                  <th className="py-2.5 px-3 text-right">Min Threshold</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3">Stockout Risk</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
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
                        {item.wholesalerName || "Metro Wholesale Co"}
                      </td>

                      {/* Available Stock */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono">
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
                      </td>

                      {/* Min Threshold */}
                      <td className="py-3 px-3 text-right text-muted-foreground whitespace-nowrap font-mono">
                        {min} {item.unit}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 text-right font-medium text-foreground whitespace-nowrap font-mono">
                        {formatCurrency(item.price)}
                      </td>

                      {/* Risk Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getRiskBadge(item.risk, item.daysOfStockLeft)}
                      </td>

                      {/* Quick Action */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectProductForSale && onSelectProductForSale(item.productId)}
                            className="h-7 px-2 text-[11px] gap-1 hover:border-brand/40"
                          >
                            <ShoppingCart className="size-3 text-brand" />
                            <span>Sell</span>
                          </Button>

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

