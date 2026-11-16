import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Inventory" };

export default function Page() {
  return (
    <RoleGuard allow={["RETAILER"]}>
      <div className="space-y-6">
        <PageHeader title="Inventory" description="Current stock, sales recording and stockout risk." />
        <ModulePlaceholder
          module="inventory"
          features={["Inventory table with risk badges", "Record a sale (reduces stock)", "Simulate sales for the demo", "Reorder rules per product", "Stock movement history"]}
          endpoints={["GET /api/inventory", "POST /api/sales", "POST /api/sales/simulate", "GET /api/predictions/stockout"]}
        />
      </div>
    </RoleGuard>
  );
}
