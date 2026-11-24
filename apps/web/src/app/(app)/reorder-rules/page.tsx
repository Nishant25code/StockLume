"use client";

import { useEffect, useState, useCallback } from "react";
import {
  SlidersHorizontal,
  Edit,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Clock,
  Boxes,
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
import type { ReorderRule } from "@/types";

export default function ReorderRulesPage() {
  const { isPreview } = useSession();

  const [rules, setRules] = useState<ReorderRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);

  // Edit Sheet State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ReorderRule | null>(null);
  const [formMinStock, setFormMinStock] = useState("10");
  const [formReorderQty, setFormReorderQty] = useState("20");
  const [formLeadTime, setFormLeadTime] = useState("3");
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ReorderRule[]>("/inventory/reorder-rules");
      setRules(data || []);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err);
      } else {
        setError(new ApiClientError("Failed to load reorder rules", "UNKNOWN_ERROR", 500));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRules();
  }, [fetchRules]);

  function openEditSheet(rule: ReorderRule) {
    setSelectedRule(rule);
    setFormMinStock(String(rule.minStock));
    setFormReorderQty(String(rule.reorderQuantity));
    setFormLeadTime(String(rule.leadTimeDays));
    setIsEditOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRule) return;

    const minStock = parseInt(formMinStock, 10);
    const reorderQuantity = parseInt(formReorderQty, 10);
    const leadTimeDays = parseInt(formLeadTime, 10);

    if (isNaN(minStock) || minStock < 0) {
      toast.error("Minimum alert stock must be a non-negative integer (>= 0)");
      return;
    }
    if (isNaN(reorderQuantity) || reorderQuantity <= 0) {
      toast.error("Default reorder quantity must be greater than 0");
      return;
    }
    if (isNaN(leadTimeDays) || leadTimeDays < 1 || leadTimeDays > 60) {
      toast.error("Lead time days must be between 1 and 60 days");
      return;
    }

    setSaving(true);
    try {
      await apiClient.put(`/inventory/reorder-rules/${selectedRule.productId}`, {
        minStock,
        reorderQuantity,
        leadTimeDays,
      });
      toast.success(`Updated reorder rule for ${selectedRule.productName}`);
      setIsEditOpen(false);
      fetchRules();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Failed to update reorder rule";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGuard allow={["RETAILER"]}>
      <div className="space-y-6">
        <PageHeader
          title="Automated Reorder Rules"
          description="Configure minimum stock thresholds, replenishment batch quantities, and supplier delivery lead times."
          actions={
            <Button variant="outline" size="sm" onClick={fetchRules}>
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
          }
        />

        {isPreview && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Developer Preview Mode</AlertTitle>
            <AlertDescription>
              Preview mode lets you test the layout and form validation. Live API calls verify an authenticated retailer token.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <LoadingState label="Loading reorder rules..." />
        ) : error ? (
          <ErrorState
            title="Failed to load reorder rules"
            message={error.message}
            code={error.code}
            onRetry={fetchRules}
          />
        ) : rules.length === 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            title="No reorder rules configured"
            description="Add products to your inventory from connected wholesalers to set custom replenishment thresholds and quantities."
          />
        ) : (
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Min Alert Threshold</th>
                    <th className="px-4 py-3">Default Reorder Qty</th>
                    <th className="px-4 py-3">Lead Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <Boxes className="size-4 text-muted-foreground shrink-0" />
                          <span>{rule.productName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{rule.productSku}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                          <ShieldCheck className="size-3.5" />
                          <span>{rule.minStock} units</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <span>{rule.reorderQuantity} units</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="size-3.5" />
                          <span>{rule.leadTimeDays} days</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={rule.isActive ? "default" : "secondary"}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSheet(rule)}
                          title="Configure Rule"
                        >
                          <Edit className="size-3.5" /> Edit Rule
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Reorder Rule Sheet */}
        <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
          <SheetContent side="right" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Configure Reorder Rule</SheetTitle>
              <SheetDescription>
                Define safety stock and standard batch sizes for {selectedRule?.productName}.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSave} className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label>Product Name</Label>
                <Input value={selectedRule?.productName || ""} disabled className="opacity-70" />
              </div>

              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input value={selectedRule?.productSku || ""} disabled className="opacity-70 font-mono text-xs" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rule-min">Min Alert Threshold (Safety Stock) *</Label>
                <Input
                  id="rule-min"
                  type="number"
                  min="0"
                  value={formMinStock}
                  onChange={(e) => setFormMinStock(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Triggers low stock alerts when inventory reaches or falls below this level.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rule-qty">Standard Reorder Quantity *</Label>
                <Input
                  id="rule-qty"
                  type="number"
                  min="1"
                  value={formReorderQty}
                  onChange={(e) => setFormReorderQty(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Default replenishment batch quantity populated in suggested orders.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rule-lead">Supplier Lead Time (Days) *</Label>
                <Input
                  id="rule-lead"
                  type="number"
                  min="1"
                  max="60"
                  value={formLeadTime}
                  onChange={(e) => setFormLeadTime(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Expected days required for the wholesaler to deliver upon order dispatch.
                </p>
              </div>

              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Rule"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </RoleGuard>
  );
}
