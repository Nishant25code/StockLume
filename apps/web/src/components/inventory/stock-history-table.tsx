"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-state";
import type { StockMovement, StockMovementReason } from "@/types";

interface StockHistoryTableProps {
  movements: StockMovement[];
  className?: string;
}

function getReasonBadge(reason: StockMovementReason) {
  switch (reason) {
    case "SALE":
      return (
        <Badge variant="outline" className="border-danger/30 bg-danger/10 text-danger text-[10px]">
          Sale
        </Badge>
      );
    case "INITIAL_STOCK":
      return (
        <Badge variant="secondary" className="text-[10px]">
          Initial Stock
        </Badge>
      );
    case "ORDER_DELIVERED":
      return (
        <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-[10px]">
          Delivery Received
        </Badge>
      );
    case "ORDER_DISPATCHED":
      return (
        <Badge variant="outline" className="border-info/30 bg-info/10 text-info text-[10px]">
          Dispatched
        </Badge>
      );
    case "MANUAL_ADJUSTMENT":
      return (
        <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning text-[10px]">
          Adjustment
        </Badge>
      );
    default:
      return <Badge variant="outline">{reason}</Badge>;
  }
}

export function StockHistoryTable({ movements, className }: StockHistoryTableProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>("ALL");

  // Distinct products for filter
  const productOptions = Array.from(
    new Map(movements.map((m) => [m.productId, m.productName ?? m.productId])).entries(),
  );

  const filteredMovements =
    selectedProduct === "ALL"
      ? movements
      : movements.filter((m) => m.productId === selectedProduct);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <History className="size-4 text-brand" aria-hidden />
            Stock Movement History
          </CardTitle>
          <CardDescription className="text-xs">
            Append-only audit trail of every stock increase and decrease
          </CardDescription>
        </div>

        {productOptions.length > 1 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filter:</span>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs focus-visible:border-ring focus-visible:outline-none"
            >
              <option value="ALL">All Products ({movements.length})</option>
              {productOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="pt-1">
        {filteredMovements.length === 0 ? (
          <EmptyState
            title="No stock movements recorded"
            description="Movements will log automatically when sales occur or orders are delivered."
            icon={History}
            className="min-h-56 border-none bg-muted/20"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/30 text-muted-foreground text-xs font-medium">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3 text-right">Change</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-normal">
                {filteredMovements.map((movement) => {
                  const isPositive = movement.quantityChange > 0;

                  return (
                    <tr key={movement.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                        {new Date(movement.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-2.5 px-3 font-medium text-foreground">
                        {movement.productName ?? movement.productId}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-0.5 font-bold ${
                            isPositive ? "text-success" : "text-destructive"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="size-3.5 inline" />
                          ) : (
                            <ArrowDownRight className="size-3.5 inline" />
                          )}
                          {isPositive ? `+${movement.quantityChange}` : movement.quantityChange}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                        {movement.quantityAfter}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getReasonBadge(movement.reason)}
                      </td>

                      <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[200px]">
                        {movement.note || "—"}
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

