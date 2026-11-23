import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsView } from "@/components/analytics/analytics-view";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return (
    <RoleGuard allow={["RETAILER", "WHOLESALER"]}>
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          description="Sales trends, top products and order statistics."
        />
        <AnalyticsView />
      </div>
    </RoleGuard>
  );
}
