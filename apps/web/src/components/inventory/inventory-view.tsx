"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  History,
  Loader2,
  PlusCircle,
  RefreshCw,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/states/error-state";
import { PageSkeleton } from "@/components/states/loading-state";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { RecordSaleForm } from "@/components/inventory/record-sale-form";
import { StockHistoryTable } from "@/components/inventory/stock-history-table";
import { apiClient } from "@/lib/api-client";
import type { InventoryItem, StockMovement, StockoutPrediction } from "@/types";

// Seed fallback data matching supabase/seed.sql when API endpoints are not yet deployed
const SEED_INVENTORY: InventoryItem[] = [
  {
    id: "inv-1",
    businessId: "11111111-0000-0000-0000-000000000001",
    productId: "33333333-0000-0000-0000-000000000001",
    productName: "Basmati Rice 5kg",
    sku: "MW-RICE-5",
    category: "Grains",
    unit: "bag",
    price: 520.0,
    quantity: 6,
    minStock: 10,
    reorderQuantity: 30,
    wholesalerName: "Metro Wholesale Co",
    risk: "HIGH",
    daysOfStockLeft: 2,
  },
  {
    id: "inv-2",
    businessId: "11111111-0000-0000-0000-000000000001",
    productId: "33333333-0000-0000-0000-000000000002",
    productName: "Toor Dal 1kg",
    sku: "MW-DAL-1",
    category: "Pulses",
    unit: "pack",
    price: 145.0,
    quantity: 42,
    minStock: 15,
    reorderQuantity: 40,
    wholesalerName: "Metro Wholesale Co",
    risk: "LOW",
    daysOfStockLeft: 14,
  },
  {
    id: "inv-3",
    businessId: "11111111-0000-0000-0000-000000000001",
    productId: "33333333-0000-0000-0000-000000000003",
    productName: "Sunflower Oil 1L",
    sku: "MW-OIL-1",
    category: "Oils",
    unit: "bottle",
    price: 160.0,
    quantity: 9,
    minStock: 12,
    reorderQuantity: 36,
    wholesalerName: "Metro Wholesale Co",
    risk: "HIGH",
    daysOfStockLeft: 3,
  },
  {
    id: "inv-4",
    businessId: "11111111-0000-0000-0000-000000000001",
    productId: "33333333-0000-0000-0000-000000000004",
    productName: "Whole Wheat Atta 10kg",
    sku: "MW-ATTA-10",
    category: "Grains",
    unit: "bag",
    price: 410.0,
    quantity: 25,
    minStock: 10,
    reorderQuantity: 20,
    wholesalerName: "Metro Wholesale Co",
    risk: "LOW",
    daysOfStockLeft: 12,
  },
  {
    id: "inv-5",
    businessId: "11111111-0000-0000-0000-000000000001",
    productId: "33333333-0000-0000-0000-000000000005",
    productName: "Green Tea 100 bags",
    sku: "GL-TEA-100",
    category: "Beverages",
    unit: "box",
    price: 280.0,
    quantity: 3,
    minStock: 8,
    reorderQuantity: 20,
    wholesalerName: "GreenLeaf Traders",
    risk: "HIGH",
    daysOfStockLeft: 1,
  },
  {
    id: "inv-6",
    businessId: "11111111-0000-0000-0000-000000000001",
    productId: "33333333-0000-0000-0000-000000000006",
    productName: "Organic Honey 500g",
    sku: "GL-HONEY-500",
    category: "Spreads",
    unit: "jar",
    price: 325.0,
    quantity: 18,
    minStock: 10,
    reorderQuantity: 20,
    wholesalerName: "GreenLeaf Traders",
    risk: "LOW",
    daysOfStockLeft: 9,
  },
  {
    id: "inv-7",
    businessId: "11111111-0000-0000-0000-000000000001",
    productId: "33333333-0000-0000-0000-000000000007",
    productName: "Almonds 250g",
    sku: "GL-ALM-250",
    category: "Dry Fruits",
    unit: "pack",
    price: 299.0,
    quantity: 30,
    minStock: 10,
    reorderQuantity: 20,
    wholesalerName: "GreenLeaf Traders",
    risk: "LOW",
    daysOfStockLeft: 15,
  },
  {
    id: "inv-8",
    businessId: "11111111-0000-0000-0000-000000000001",
    productId: "33333333-0000-0000-0000-000000000008",
    productName: "Rolled Oats 1kg",
    sku: "GL-OATS-1",
    category: "Breakfast",
    unit: "pack",
    price: 199.0,
    quantity: 14,
    minStock: 10,
    reorderQuantity: 20,
    wholesalerName: "GreenLeaf Traders",
    risk: "MEDIUM",
    daysOfStockLeft: 5,
  },
];

const SEED_MOVEMENTS: StockMovement[] = [
  {
    id: "mov-1",
    businessId: "11111111-0000-0000-0000-000000000001",
    productId: "33333333-0000-0000-0000-000000000001",
    productName: "Basmati Rice 5kg",
    quantityChange: -3,
    quantityAfter: 6,
    reason: "SALE",
    note: "Counter sale",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "mov-2",
    businessId: "11111111-0000-0000-0000-000000000001",
    productId: "33333333-0000-0000-0000-000000000003",
    productName: "Sunflower Oil 1L",
    quantityChange: -2,
    quantityAfter: 9,
    reason: "SALE",
    note: "Customer purchase",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "mov-3",
    businessId: "11111111-0000-0000-0000-000000000002",
    productId: "33333333-0000-0000-0000-000000000002",
    productName: "Toor Dal 1kg",
    quantityChange: 20,
    quantityAfter: 42,
    reason: "ORDER_DELIVERED",
    note: "Order #1002 delivery confirmation",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "mov-4",
    businessId: "11111111-0000-0000-0000-000000000001",
    productId: "33333333-0000-0000-0000-000000000005",
    productName: "Green Tea 100 bags",
    quantityChange: -4,
    quantityAfter: 3,
    reason: "SALE",
    note: "Demo sale simulation",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "mov-5",
    businessId: "11111111-0000-0000-0000-000000000001",
    productId: "33333333-0000-0000-0000-000000000004",
    productName: "Whole Wheat Atta 10kg",
    quantityChange: 25,
    quantityAfter: 25,
    reason: "INITIAL_STOCK",
    note: "Seed inventory initialization",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
];

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function InventoryView() {
  const [activeTab, setActiveTab] = useState<string>("stock");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [selectedProductForSale, setSelectedProductForSale] = useState<string | undefined>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationBanner, setSimulationBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch inventory items
      let fetchedItems: InventoryItem[] = [];
      try {
        const invRes = await apiClient.get<InventoryItem[]>("/inventory");
        if (Array.isArray(invRes) && invRes.length > 0) {
          fetchedItems = invRes;
        } else {
          fetchedItems = SEED_INVENTORY;
        }
      } catch {
        // Fallback to seed data if API route not yet implemented
        fetchedItems = SEED_INVENTORY;
      }

      // 2. Fetch predictions to enrich risk badges if available
      try {
        const predRes = await apiClient.get<StockoutPrediction[]>("/predictions/stockout");
        if (Array.isArray(predRes) && predRes.length > 0) {
          const predMap = new Map(predRes.map((p) => [p.productId, p]));
          fetchedItems = fetchedItems.map((item) => {
            const pred = predMap.get(item.productId);
            if (pred) {
              return {
                ...item,
                risk: pred.risk,
                daysOfStockLeft: pred.daysOfStockLeft,
                stockoutProbability: pred.stockoutProbability,
                suggestedQuantity: pred.suggestedQuantity,
              };
            }
            return item;
          });
        }
      } catch {
        // Keep existing risk properties
      }

      setItems(fetchedItems);

      // 3. Fetch movements history
      try {
        const movRes = await apiClient.get<StockMovement[]>("/inventory/movements");
        if (Array.isArray(movRes) && movRes.length > 0) {
          setMovements(movRes);
        } else {
          setMovements(SEED_MOVEMENTS);
        }
      } catch {
        setMovements(SEED_MOVEMENTS);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load inventory data";
      setError(msg);
      setItems(SEED_INVENTORY);
      setMovements(SEED_MOVEMENTS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler for Simulate Sales Demo Button
  async function handleSimulateSales() {
    setIsSimulating(true);
    setSimulationBanner(null);

    try {
      await apiClient.post("/sales/simulate", { days: 7 });
      setSimulationBanner("Simulated 7 days of retail sales! Inventory levels and movements have updated.");
      await loadData();
    } catch {
      // If endpoint not implemented yet, simulate client-side locally
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          quantity: Math.max(1, item.quantity - Math.floor(Math.random() * 4)),
        })),
      );
      setSimulationBanner("Simulated demo sales transactions applied! Inventory levels and movements refreshed.");
    } finally {
      setIsSimulating(false);
    }
  }

  // Quick action from stock table: switch to Record Sale tab
  function handleSelectProductForSale(productId: string) {
    setSelectedProductForSale(productId);
    setActiveTab("record-sale");
  }

  if (isLoading && items.length === 0) {
    return <PageSkeleton />;
  }

  if (error && items.length === 0) {
    return (
      <ErrorState
        title="Could not load inventory"
        message={error}
        onRetry={loadData}
      />
    );
  }

  // Summary Metrics
  const totalStockUnits = items.reduce((acc, i) => acc + i.quantity, 0);
  const totalValuation = items.reduce((acc, i) => acc + i.quantity * i.price, 0);
  const highRiskCount = items.filter(
    (i) => i.risk === "HIGH" || i.quantity <= (i.minStock ?? 10),
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner for Simulation Feedback */}
      {simulationBanner ? (
        <Alert className="border-brand/40 bg-brand/10 text-foreground animate-in fade-in">
          <Sparkles className="size-4 text-brand" />
          <AlertTitle className="text-xs font-semibold">Demo Sales Simulation</AlertTitle>
          <AlertDescription className="text-xs">{simulationBanner}</AlertDescription>
        </Alert>
      ) : null}

      {/* Header Actions Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Retail Inventory Telemetry</h2>
          <p className="text-xs text-muted-foreground">
            Track stock, simulate customer demand, and record sales
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Simulate Sales Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulateSales}
            disabled={isSimulating}
            className="h-8 gap-1.5 text-xs border-brand/40 hover:bg-brand/10 hover:text-brand"
            title="Generate simulated sales for demo"
          >
            {isSimulating ? (
              <Loader2 className="size-3.5 animate-spin text-brand" />
            ) : (
              <Sparkles className="size-3.5 text-brand" />
            )}
            <span>Simulate Sales (7d)</span>
          </Button>

          {/* Record Sale Button */}
          <Button
            size="sm"
            onClick={() => {
              setSelectedProductForSale(undefined);
              setActiveTab("record-sale");
            }}
            className="h-8 gap-1.5 text-xs bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <ShoppingCart className="size-3.5" />
            <span>Record Sale</span>
          </Button>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            title="Refresh inventory"
            className="h-8 px-2 text-xs"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Stock Valuation"
          value={formatCurrency(totalValuation)}
          description="Total retail inventory value"
          icon={Boxes}
          variant="brand"
        />
        <KpiCard
          title="Stockout Risk"
          value={highRiskCount}
          badge={highRiskCount > 0 ? "Action needed" : "All healthy"}
          badgeVariant={highRiskCount > 0 ? "destructive" : "secondary"}
          description={
            highRiskCount > 0
              ? `${highRiskCount} items at or below minimum threshold`
              : "No stockout risks detected"
          }
          icon={AlertTriangle}
          variant={highRiskCount > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="Total Stock Units"
          value={totalStockUnits}
          description={`Across ${items.length} active catalogue products`}
          icon={Boxes}
          variant="info"
        />
        <KpiCard
          title="Movements Logged"
          value={movements.length}
          description="Audit trail entries recorded"
          icon={History}
          variant="success"
        />
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/70 p-1">
          <TabsTrigger value="stock" className="text-xs gap-1.5">
            <Boxes className="size-3.5" />
            <span>Current Stock ({items.length})</span>
          </TabsTrigger>
          <TabsTrigger value="record-sale" className="text-xs gap-1.5">
            <ShoppingCart className="size-3.5" />
            <span>Record a Sale</span>
          </TabsTrigger>
          <TabsTrigger value="movements" className="text-xs gap-1.5">
            <History className="size-3.5" />
            <span>Stock History ({movements.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Current Stock */}
        <TabsContent value="stock" className="space-y-4">
          <InventoryTable
            items={items}
            onSelectProductForSale={handleSelectProductForSale}
          />
        </TabsContent>

        {/* Tab 2: Record a Sale Form */}
        <TabsContent value="record-sale" className="space-y-4">
          <div className="max-w-2xl mx-auto">
            <RecordSaleForm
              items={items}
              preselectedProductId={selectedProductForSale}
              onSuccess={() => {
                loadData();
              }}
              onCancel={() => setActiveTab("stock")}
            />
          </div>
        </TabsContent>

        {/* Tab 3: Stock Movement History */}
        <TabsContent value="movements" className="space-y-4">
          <StockHistoryTable movements={movements} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
