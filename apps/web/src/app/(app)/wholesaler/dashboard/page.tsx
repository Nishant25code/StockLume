import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Wholesaler dashboard" };

export default function Page() {
  return (
    <RoleGuard allow={["WHOLESALER"]}>
      <div className="space-y-6">
        <PageHeader title="Wholesaler dashboard" description="Incoming purchase requests, revenue and connected retailers." />
        <ModulePlaceholder
          module="analytics"
          features={["KPI cards: pending orders, revenue, connected retailers", "Orders awaiting acceptance", "Top products", "Recent notifications"]}
          endpoints={["GET /api/dashboard/wholesaler", "GET /api/notifications"]}
        />
      </div>
    </RoleGuard>
  );
}
