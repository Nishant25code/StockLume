"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Boxes,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  History,
  Store,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useSession } from "@/providers/session-provider";
import type { InventoryItem, Product, StockMovement } from "@/types";

/**
 * Stock management (Celina): add products to inventory, manual adjustments,
 * low-stock filter and full movement history. Rendered as a tab on /inventory.
 */
export function StockManagement() {
  const { isPreview } = useSession();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);

  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Add Item Sheet
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [addQuantity, setAddQuantity] = useState("10");
  const [adding, setAdding] = useState(false);

  // Adjust Stock Sheet
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustChange, setAdjustChange] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Movements History Sheet
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<InventoryItem[]>("/inventory", {
        query: {
          search: search.trim() || undefined,
          lowStockOnly: lowStockOnly || undefined,
          limit: 100,
        },
      });
      setInventory(data || []);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err);
      } else {
        setError(new ApiClientError("Failed to load inventory", "UNKNOWN_ERROR", 500));
      }
    } finally {
      setLoading(false);
    }
  }, [search, lowStockOnly]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInventory();
  }, [fetchInventory]);

  async function openAddSheet() {
    setIsAddOpen(true);
    try {
      // Load connected products that can be added
      const prods = await apiClient.get<Product[]>("/products", { query: { limit: 100 } });
      setAvailableProducts(prods || []);
      if (prods && prods.length > 0) {
        setSelectedProductId(prods[0].id);
      }
    } catch {
      toast.error("Could not load products from connected suppliers");
    }
  }

  async function handleAddInventory(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }

    const qty = parseInt(addQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      toast.error("Quantity must be a non-negative integer");
      return;
    }

    setAdding(true);
    try {
      await apiClient.post("/inventory", {
        productId: selectedProductId,
        quantity: qty,
      });
      toast.success("Product added to inventory");
      setIsAddOpen(false);
      fetchInventory();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Failed to add to inventory";
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  function openAdjustSheet(item: InventoryItem) {
    setAdjustingItem(item);
    setAdjustChange("");
    setAdjustNote("");
    setIsAdjustOpen(true);
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustingItem) return;

    const change = parseInt(adjustChange, 10);
    if (isNaN(change) || change === 0) {
      toast.error("Adjustment change must be a non-zero integer (+ or -)");
      return;
    }

    if (adjustingItem.quantity + change < 0) {
      toast.error(`Adjustment would reduce stock below 0 (current: ${adjustingItem.quantity})`);
      return;
    }

    setAdjusting(true);
    try {
      await apiClient.patch(`/inventory/${adjustingItem.id}/adjust`, {
        change,
        note: adjustNote.trim() || "Manual adjustment",
      });
      toast.success("Stock count adjusted");
      setIsAdjustOpen(false);
      fetchInventory();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Failed to adjust stock";
      toast.error(message);
    } finally {
      setAdjusting(false);
    }
  }

  async function openHistorySheet() {
    setIsHistoryOpen(true);
    setLoadingMovements(true);
    try {
      const data = await apiClient.get<StockMovement[]>("/inventory/movements", {
        query: { limit: 50 },
      });
      setMovements(data || []);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Failed to load movement history";
      toast.error(message);
    } finally {
      setLoadingMovements(false);
    }
  }

  return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Manage stock</h2>
            <p className="text-xs text-muted-foreground">
              Add products, correct stock counts and review every stock movement.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={openHistorySheet}>
              <History className="size-4" /> Movement History
            </Button>
            <Button size="sm" onClick={openAddSheet}>
              <Plus className="size-4" /> Add to Inventory
            </Button>
          </div>
        </div>

        {isPreview && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Developer Preview Mode</AlertTitle>
            <AlertDescription>
              Preview mode displays the UI components. Connecting to live API requires active Supabase authentication.
            </AlertDescription>
          </Alert>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search inventory items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={lowStockOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className="gap-1.5"
            >
              <AlertTriangle className="size-3.5" />
              {lowStockOnly ? "Showing Low Stock" : "Filter Low Stock"}
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={fetchInventory}>
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        </div>

        {/* Inventory Content */}
        {loading ? (
          <LoadingState label="Loading inventory stock..." />
        ) : error ? (
          <ErrorState
            title="Failed to load inventory"
            message={error.message}
            code={error.code}
            onRetry={fetchInventory}
          />
        ) : inventory.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={lowStockOnly ? "No low-stock items" : "No inventory stocked yet"}
            description={
              lowStockOnly
                ? "All inventory stock is currently above safety threshold levels."
                : "Add products from your connected wholesalers to track stock levels and automate replenishment."
            }
            action={
              !lowStockOnly ? (
                <Button onClick={openAddSheet}>
                  <Plus className="size-4" /> Add First Product
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">In Stock</th>
                    <th className="px-4 py-3">Safety Stock</th>
                    <th className="px-4 py-3">Reorder Size</th>
                    <th className="px-4 py-3">Risk Level</th>
                    <th className="px-4 py-3">Wholesaler</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {inventory.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <Boxes className="size-4 text-muted-foreground shrink-0" />
                          <span>{item.product.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.product.sku}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-base">
                          {item.quantity}{" "}
                          <span className="text-xs text-muted-foreground font-normal">{item.product.unit}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.minStock} {item.product.unit}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.reorderQuantity} {item.product.unit}
                      </td>
                      <td className="px-4 py-3">
                        {item.stockoutRisk === "HIGH" ? (
                          <Badge variant="destructive" className="gap-1 font-semibold">
                            <AlertTriangle className="size-3" /> Critical ({item.stockoutRisk})
                          </Badge>
                        ) : item.stockoutRisk === "MEDIUM" ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 gap-1">
                            <AlertCircle className="size-3" /> Low ({item.stockoutRisk})
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" /> Healthy
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Store className="size-3.5" />
                          {item.product.wholesalerName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAdjustSheet(item)}
                          title="Manual Stock Adjustment"
                          className="gap-1"
                        >
                          <ArrowUpDown className="size-3.5" /> Adjust
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Product to Inventory Sheet */}
        <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
          <SheetContent side="right" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Stock Connected Product</SheetTitle>
              <SheetDescription>
                Add a product from your connected wholesale suppliers into your store inventory.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleAddInventory} className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-product-select">Select Supplier Product *</Label>
                {availableProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No products found from connected suppliers. Verify your business connections first.
                  </p>
                ) : (
                  <select
                    id="add-product-select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                    required
                  >
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — ₹{p.price} / {p.unit} [{p.wholesalerName || "Supplier"}]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-qty">Initial On-Hand Stock *</Label>
                <Input
                  id="add-qty"
                  type="number"
                  min="0"
                  placeholder="10"
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Initial quantity on hand. Automatically logged as INITIAL_STOCK movement.
                </p>
              </div>

              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={adding || availableProducts.length === 0}>
                  {adding ? "Adding..." : "Add to Stock"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* Adjust Stock Sheet */}
        <Sheet open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
          <SheetContent side="right" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Correct Stock Count</SheetTitle>
              <SheetDescription>
                Manual stock adjustment for {adjustingItem?.product.name}.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleAdjust} className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label>Current Quantity</Label>
                <Input
                  value={`${adjustingItem?.quantity || 0} ${adjustingItem?.product.unit || "units"}`}
                  disabled
                  className="opacity-70 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjust-change">Adjustment Amount (+ or -) *</Label>
                <Input
                  id="adjust-change"
                  type="number"
                  placeholder="e.g. +5 or -2"
                  value={adjustChange}
                  onChange={(e) => setAdjustChange(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Positive integer to add incoming stock; negative integer to remove damaged/lost stock.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjust-note">Reason / Audit Note</Label>
                <Input
                  id="adjust-note"
                  placeholder="e.g. Physical inventory recount / Damaged batch"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                />
              </div>

              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAdjustOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={adjusting}>
                  {adjusting ? "Adjusting..." : "Apply Adjustment"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* Movement History Sheet */}
        <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <SheetContent side="right" className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Stock Movement Audit Log</SheetTitle>
              <SheetDescription>
                Chronological ledger of stock changes (sales, deliveries, manual corrections).
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-3 max-h-[75vh] overflow-y-auto">
              {loadingMovements ? (
                <LoadingState label="Loading movements history..." />
              ) : movements.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No stock movements recorded"
                  description="Movements are logged automatically when stock is initialized, sold, or corrected."
                />
              ) : (
                movements.map((m) => (
                  <div key={m.id} className="rounded-lg border p-3 text-xs space-y-1.5 bg-card">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{m.productName}</span>
                      <Badge
                        variant={m.quantityChange >= 0 ? "secondary" : "outline"}
                        className={
                          m.quantityChange >= 0
                            ? "text-emerald-600 dark:text-emerald-400 font-mono"
                            : "text-rose-600 dark:text-rose-400 font-mono"
                        }
                      >
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Reason: <span className="font-mono">{m.reason}</span></span>
                      <span>Stock After: <span className="font-mono">{m.quantityAfter}</span></span>
                    </div>
                    {m.note && <p className="italic text-muted-foreground">&ldquo;{m.note}&rdquo;</p>}
                    <p className="text-[11px] text-muted-foreground pt-1 border-t">
                      {new Date(m.createdAt).toLocaleString()} {m.doneBy ? `by ${m.doneBy}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
  );
}
