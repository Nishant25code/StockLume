"use client";

import { Edit3, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrderItem } from "@/types";

interface OrderItemsTableProps {
  items: OrderItem[];
  totalAmount?: number;
  isEditable?: boolean;
  onEditItems?: () => void;
  className?: string;
}

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function OrderItemsTable({
  items,
  totalAmount,
  isEditable,
  onEditItems,
  className,
}: OrderItemsTableProps) {
  const calculatedTotal = items.reduce(
    (sum, item) => sum + (item.totalPrice ?? item.unitPrice * item.quantity),
    0
  );
  const displayTotal = totalAmount ?? calculatedTotal;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="size-4 text-brand" />
            <span>Order Items</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {items.length} {items.length === 1 ? "item" : "items"}
            </Badge>
          </CardTitle>
        </div>
        {isEditable && onEditItems && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEditItems}
            className="gap-1.5 text-xs h-8"
          >
            <Edit3 className="size-3.5" />
            <span>Edit Quantities</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4 text-left font-medium">Product / SKU</th>
                <th className="py-2.5 px-4 text-left font-medium">Category</th>
                <th className="py-2.5 px-4 text-right font-medium">Unit Price</th>
                <th className="py-2.5 px-4 text-right font-medium">Quantity</th>
                <th className="py-2.5 px-4 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((item) => {
                const itemTotal = item.totalPrice ?? item.unitPrice * item.quantity;
                return (
                  <tr key={item.id || item.productId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{item.productName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
                    </td>
                    <td className="py-3 px-4">
                      {item.category ? (
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {item.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs">
                      {formatCurrency(item.unitPrice)}
                      {item.unit ? <span className="text-muted-foreground">/{item.unit}</span> : null}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-semibold">{item.quantity} {item.unit || "units"}</div>
                      {item.suggestedQuantity !== null &&
                        item.suggestedQuantity !== undefined &&
                        item.suggestedQuantity !== item.quantity && (
                          <div className="text-[11px] text-muted-foreground">
                            suggested: {item.suggestedQuantity}
                          </div>
                        )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium font-mono">
                      {formatCurrency(itemTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t bg-muted/20 font-medium">
              <tr>
                <td colSpan={4} className="py-3 px-4 text-right text-xs uppercase tracking-wider text-muted-foreground">
                  Order Total
                </td>
                <td className="py-3 px-4 text-right text-base font-bold font-mono text-brand">
                  {formatCurrency(displayTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
