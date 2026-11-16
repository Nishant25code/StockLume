import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return (
    <RoleGuard allow={["RETAILER", "WHOLESALER"]}>
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Sales trends, top products and order statistics." />
        <ModulePlaceholder
          module="analytics"
          features={["Sales trend chart", "Top products", "Orders by status", "Date range filter"]}
          endpoints={["GET /api/analytics/sales-trend", "GET /api/analytics/top-products", "GET /api/analytics/orders-summary"]}
        />
      </div>
    </RoleGuard>
  );
}
