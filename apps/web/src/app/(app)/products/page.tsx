"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PackageSearch,
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  Tag,
  Store,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
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
import type { Product } from "@/types";

export default function ProductsPage() {
  const { role, isPreview } = useSession();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [search, setSearch] = useState("");

  // Wholesaler product creation & edit sheets
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formUnit, setFormUnit] = useState("pcs");
  const [formPrice, setFormPrice] = useState("");
  const [formQuantity, setFormQuantity] = useState("0");
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Product[]>("/products", {
        query: { search: search.trim() || undefined, limit: 100 },
      });
      setProducts(data || []);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err);
      } else {
        setError(new ApiClientError("Failed to load products", "UNKNOWN_ERROR", 500));
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
  }, [fetchProducts]);

  function resetForm() {
    setFormName("");
    setFormSku("");
    setFormCategory("");
    setFormUnit("pcs");
    setFormPrice("");
    setFormQuantity("0");
    setFormIsActive(true);
  }

  function openEditSheet(product: Product) {
    setSelectedProduct(product);
    setFormName(product.name);
    setFormSku(product.sku);
    setFormCategory(product.category || "");
    setFormUnit(product.unit || "pcs");
    setFormPrice(String(product.price));
    setFormQuantity(String(product.availableQuantity));
    setFormIsActive(product.isActive);
    setIsEditOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formSku.trim() || !formPrice) {
      toast.error("Please fill in required fields: Name, SKU, and Price");
      return;
    }

    const price = parseFloat(formPrice);
    const availableQuantity = parseInt(formQuantity, 10);

    if (isNaN(price) || price < 0) {
      toast.error("Price must be a non-negative number");
      return;
    }

    if (isNaN(availableQuantity) || availableQuantity < 0) {
      toast.error("Available quantity must be a non-negative integer");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post<Product>("/products", {
        name: formName.trim(),
        sku: formSku.trim(),
        category: formCategory.trim() || null,
        unit: formUnit.trim() || "pcs",
        price,
        availableQuantity,
      });
      toast.success("Product created successfully");
      setIsCreateOpen(false);
      resetForm();
      fetchProducts();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Failed to create product";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;

    const price = parseFloat(formPrice);
    const availableQuantity = parseInt(formQuantity, 10);

    if (isNaN(price) || price < 0) {
      toast.error("Price must be a non-negative number");
      return;
    }

    if (isNaN(availableQuantity) || availableQuantity < 0) {
      toast.error("Available quantity must be a non-negative integer");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.patch<Product>(`/products/${selectedProduct.id}`, {
        name: formName.trim(),
        category: formCategory.trim() || null,
        unit: formUnit.trim() || "pcs",
        price,
        availableQuantity,
        isActive: formIsActive,
      });
      toast.success("Product updated successfully");
      setIsEditOpen(false);
      fetchProducts();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Failed to update product";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(product: Product) {
    if (!confirm(`Are you sure you want to deactivate "${product.name}"?`)) return;

    try {
      await apiClient.delete(`/products/${product.id}`);
      toast.success("Product deactivated");
      fetchProducts();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Failed to deactivate product";
      toast.error(message);
    }
  }

  return (
    <RoleGuard allow={["RETAILER", "WHOLESALER"]}>
      <div className="space-y-6">
        <PageHeader
          title="Products Catalogue"
          description={
            role === "WHOLESALER"
              ? "Manage your product catalogue, wholesale prices, and available stock levels."
              : "Browse available products and prices from your connected wholesale suppliers."
          }
          actions={
            role === "WHOLESALER" ? (
              <Button
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(true);
                }}
              >
                <Plus className="size-4" /> Add Product
              </Button>
            ) : null
          }
        />

        {isPreview && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Developer Preview Mode</AlertTitle>
            <AlertDescription>
              You are browsing in preview mode. Live backend requests verify an active Supabase token.
            </AlertDescription>
          </Alert>
        )}

        {/* Filter bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchProducts()}>
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        </div>

        {/* Product List Content */}
        {loading ? (
          <LoadingState label="Loading catalogue products..." />
        ) : error ? (
          <ErrorState
            title="Failed to load catalogue"
            message={error.message}
            code={error.code}
            onRetry={fetchProducts}
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No products found"
            description={
              role === "WHOLESALER"
                ? "Your catalogue is currently empty. Click 'Add Product' to list your inventory items."
                : "No products available from your connected suppliers matching your search."
            }
            action={
              role === "WHOLESALER" ? (
                <Button onClick={() => setIsCreateOpen(true)}>
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
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Wholesale Price</th>
                    <th className="px-4 py-3">
                      {role === "WHOLESALER" ? "Available Stock" : "Supplier"}
                    </th>
                    <th className="px-4 py-3">Status</th>
                    {role === "WHOLESALER" && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <Layers className="size-4 text-muted-foreground shrink-0" />
                          <span>{prod.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{prod.sku}</td>
                      <td className="px-4 py-3">
                        {prod.category ? (
                          <Badge variant="secondary" className="gap-1 font-normal">
                            <Tag className="size-3" /> {prod.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        ₹{Number(prod.price).toFixed(2)}
                        <span className="text-xs text-muted-foreground font-normal"> / {prod.unit}</span>
                      </td>
                      <td className="px-4 py-3">
                        {role === "WHOLESALER" ? (
                          <span className="font-mono">{prod.availableQuantity} {prod.unit}</span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Store className="size-3.5" />
                            {prod.wholesalerName || "Connected Wholesaler"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={prod.isActive ? "default" : "secondary"}>
                          {prod.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      {role === "WHOLESALER" && (
                        <td className="px-4 py-3 text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditSheet(prod)}
                            title="Edit Product"
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          {prod.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger hover:text-danger hover:bg-danger/10"
                              onClick={() => handleDeactivate(prod)}
                              title="Deactivate Product"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Wholesaler Add Product Sheet */}
        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SheetContent side="right" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Add New Catalogue Product</SheetTitle>
              <SheetDescription>
                List a new item with price and available stock for connected retailers.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-name">Product Name *</Label>
                <Input
                  id="create-name"
                  placeholder="e.g. Basmati Rice 5kg"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-sku">SKU Code *</Label>
                <Input
                  id="create-sku"
                  placeholder="e.g. MW-RICE-05"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-category">Category</Label>
                  <Input
                    id="create-category"
                    placeholder="e.g. Grains, Oils"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-unit">Unit</Label>
                  <Input
                    id="create-unit"
                    placeholder="pcs, bag, kg"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-price">Price (₹) *</Label>
                  <Input
                    id="create-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-qty">Initial Stock</Label>
                  <Input
                    id="create-qty"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                  />
                </div>
              </div>

              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Adding..." : "Add Product"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* Wholesaler Edit Product Sheet */}
        <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
          <SheetContent side="right" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Edit Product</SheetTitle>
              <SheetDescription>Update price, availability, or status.</SheetDescription>
            </SheetHeader>
            <form onSubmit={handleUpdate} className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Product Name *</Label>
                <Input
                  id="edit-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-sku">SKU (Read Only)</Label>
                <Input id="edit-sku" value={formSku} disabled className="opacity-70 font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-category">Category</Label>
                  <Input
                    id="edit-category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-unit">Unit</Label>
                  <Input
                    id="edit-unit"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-price">Price (₹) *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-qty">Available Stock</Label>
                  <Input
                    id="edit-qty"
                    type="number"
                    min="0"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-input text-brand focus:ring-brand"
                />
                <Label htmlFor="edit-active" className="cursor-pointer">
                  Product is Active (Visible to retailers)
                </Label>
              </div>

              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </RoleGuard>
  );
}
