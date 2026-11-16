import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Retailer dashboard" };

export default function Page() {
  return (
    <RoleGuard allow={["RETAILER"]}>
      <div className="space-y-6">
        <PageHeader title="Retailer dashboard" description="Stock health, low-stock alerts, open orders and recent sales." />
        <ModulePlaceholder
          module="analytics"
          features={["KPI cards: stock value, low-stock items, open orders, sales this week", "Low-stock alert list with stockout risk", "Recent notifications", "Sales trend chart"]}
          endpoints={["GET /api/dashboard/retailer", "GET /api/notifications", "GET /api/predictions/low-stock"]}
        />
      </div>
    </RoleGuard>
  );
}
