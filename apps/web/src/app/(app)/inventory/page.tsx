import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
import { InventoryView } from "@/components/inventory/inventory-view";
import { StockManagement } from "@/components/inventory/stock-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Inventory" };

export default function Page() {
  return (
    <RoleGuard allow={["RETAILER"]}>
      <div className="space-y-6">
        <PageHeader
          title="Inventory"
          description="Current stock, sales recording, stockout risk and stock management."
        />
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Stock &amp; sales</TabsTrigger>
            <TabsTrigger value="manage">Manage stock</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            {/* Kalpana: risk table, record sale, simulate sales, history */}
            <InventoryView />
          </TabsContent>
          <TabsContent value="manage">
            {/* Celina: add to inventory, manual adjustments, movement history */}
            <StockManagement />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}
