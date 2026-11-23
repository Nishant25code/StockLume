import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
import { InventoryView } from "@/components/inventory/inventory-view";

export const metadata: Metadata = { title: "Inventory" };

export default function Page() {
  return (
    <RoleGuard allow={["RETAILER"]}>
      <div className="space-y-6">
        <PageHeader
          title="Inventory"
          description="Current stock, sales recording and stockout risk."
        />
        <InventoryView />
      </div>
    </RoleGuard>
  );
}
