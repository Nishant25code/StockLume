"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, ShoppingCart } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import type { InventoryItem } from "@/types";

interface RecordSaleFormProps {
  items: InventoryItem[];
  preselectedProductId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function RecordSaleForm({
  items,
  preselectedProductId,
  onSuccess,
  onCancel,
  className,
}: RecordSaleFormProps) {
  const [productId, setProductId] = useState<string>(
    preselectedProductId ?? (items.length > 0 ? items[0].productId : ""),
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedItem = items.find((i) => i.productId === productId);
  const effectiveUnitPrice = unitPrice !== "" ? Number(unitPrice) : (selectedItem?.price ?? 0);
  const totalAmount = quantity * effectiveUnitPrice;
  const currentStock = selectedItem?.quantity ?? 0;
  const isOutOfStock = currentStock <= 0;
  const isExceedingStock = quantity > currentStock;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) {
      setError("Please select a product");
      return;
    }
    if (quantity <= 0) {
      setError("Quantity must be a positive integer");
      return;
    }
    if (quantity > currentStock) {
      setError(`Cannot sell ${quantity} units. Only ${currentStock} units currently in stock.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await apiClient.post("/sales", {
        productId: selectedItem.productId,
        quantity,
        unitPrice: effectiveUnitPrice > 0 ? effectiveUnitPrice : undefined,
      });

      setSuccessMessage(
        `Recorded sale of ${quantity} ${selectedItem.unit} of ${selectedItem.productName} for ${formatCurrency(
          totalAmount,
        )}.`,
      );
      setQuantity(1);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record sale";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ShoppingCart className="size-4 text-brand" aria-hidden />
          Record a Retail Sale
        </CardTitle>
        <CardDescription className="text-xs">
          Deducts items from local inventory and logs a SALE stock movement atomically
        </CardDescription>
      </CardHeader>

      <CardContent>
        {successMessage ? (
          <Alert className="mb-4 border-success/30 bg-success/10 text-success">
            <CheckCircle2 className="size-4 text-success" />
            <AlertTitle className="text-xs font-semibold">Sale Confirmed</AlertTitle>
            <AlertDescription className="text-xs">{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive" className="mb-4 text-xs">
            <AlertCircle className="size-4" />
            <AlertTitle className="text-xs font-semibold">Sale Blocked</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Product Picker */}
          <div className="space-y-1.5">
            <Label htmlFor="sale-product" className="text-xs font-medium">
              Product
            </Label>
            <select
              id="sale-product"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setQuantity(1);
                setUnitPrice("");
                setError(null);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              {items.map((item) => (
                <option key={item.productId} value={item.productId}>
                  {item.productName} ({item.quantity} in stock · {formatCurrency(item.price)})
                </option>
              ))}
            </select>
          </div>

          {/* Stock Info Callout */}
          {selectedItem ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs flex items-center justify-between">
              <div>
                <span className="text-muted-foreground">Current Stock: </span>
                <strong className={currentStock > 0 ? "text-foreground" : "text-destructive font-bold"}>
                  {currentStock} {selectedItem.unit}
                </strong>
                {selectedItem.minStock ? (
                  <span className="text-muted-foreground ml-2">(Min: {selectedItem.minStock})</span>
                ) : null}
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">Retail Price: </span>
                <strong className="text-foreground">{formatCurrency(selectedItem.price)}</strong>
              </div>
            </div>
          ) : null}

          {/* Quantity & Unit Price Row */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sale-quantity" className="text-xs font-medium">
                Quantity to Sell
              </Label>
              <Input
                id="sale-quantity"
                type="number"
                min={1}
                max={currentStock > 0 ? currentStock : 1}
                value={quantity}
                onChange={(e) => {
                  setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1));
                  setError(null);
                }}
                disabled={isOutOfStock}
                className="text-xs h-9"
              />
              {isExceedingStock ? (
                <p className="text-[11px] text-destructive">
                  Quantity exceeds available stock ({currentStock})
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sale-price" className="text-xs font-medium">
                Unit Price (₹ optional)
              </Label>
              <Input
                id="sale-price"
                type="number"
                step="0.01"
                min="0"
                placeholder={selectedItem ? String(selectedItem.price) : "0.00"}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                disabled={isOutOfStock}
                className="text-xs h-9"
              />
              <p className="text-[10px] text-muted-foreground">
                Default: {selectedItem ? formatCurrency(selectedItem.price) : "₹0.00"}
              </p>
            </div>
          </div>

          {/* Total Preview */}
          <div className="flex items-center justify-between rounded-lg border bg-card p-3">
            <span className="text-xs font-medium text-muted-foreground">Total Sale Amount</span>
            <span className="text-lg font-bold text-foreground">{formatCurrency(totalAmount)}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {onCancel ? (
              <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || isOutOfStock || isExceedingStock}
              className="bg-brand text-brand-foreground hover:bg-brand/90 gap-1.5"
            >
              {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <ShoppingCart className="size-3.5" />}
              <span>Record Sale</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
