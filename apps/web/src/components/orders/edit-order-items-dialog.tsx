"use client";

import { useState } from "react";
import { Edit3, Loader2, Minus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Order, OrderItem } from "@/types";

interface EditOrderItemsDialogProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSave: (items: Array<{ productId: string; quantity: number }>) => Promise<void>;
}

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function EditOrderItemsDialog({
  order,
  isOpen,
  onClose,
  onSave,
}: EditOrderItemsDialogProps) {
  const [items, setItems] = useState<OrderItem[]>(order.items || []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleQuantityChange(productId: string, newQty: number) {
    if (newQty < 1) return;
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: newQty,
              totalPrice: newQty * item.unitPrice,
            }
          : item
      )
    );
  }

  function handleRemoveItem(productId: string) {
    if (items.length <= 1) {
      setError("An order must contain at least one item.");
      return;
    }
    setError(null);
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  const updatedTotal = items.reduce(
    (sum, item) => sum + (item.totalPrice ?? item.quantity * item.unitPrice),
    0
  );

  async function handleSave() {
    if (items.length === 0) {
      setError("An order must contain at least one item.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave(
        items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
      );
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update order items.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in-0">
      <Card className="w-full max-w-xl shadow-xl border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Edit3 className="size-4 text-brand" />
              <span>Edit Items for Order #{order.orderNumber}</span>
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Adjust purchase quantities or remove items from this draft before submitting.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="size-8 p-0 text-muted-foreground"
          >
            <X className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {items.map((item) => {
              const itemTotal = item.totalPrice ?? item.quantity * item.unitPrice;
              return (
                <div
                  key={item.productId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/60 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatCurrency(item.unitPrice)} / {item.unit || "unit"} • SKU: {item.sku}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1 || isSaving}
                      className="size-8 p-0"
                    >
                      <Minus className="size-3" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) {
                          handleQuantityChange(item.productId, val);
                        }
                      }}
                      className="w-16 h-8 text-center text-sm font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                      disabled={isSaving}
                      className="size-8 p-0"
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>

                  <div className="text-right w-24 shrink-0 font-mono text-sm font-medium">
                    {formatCurrency(itemTotal)}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item.productId)}
                    disabled={items.length <= 1 || isSaving}
                    className="size-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t pt-4 bg-muted/20">
          <div>
            <span className="text-xs text-muted-foreground">New Total: </span>
            <span className="text-base font-bold font-mono text-brand">
              {formatCurrency(updatedTotal)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || items.length === 0}
              className="bg-brand text-brand-foreground hover:bg-brand/90 gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
