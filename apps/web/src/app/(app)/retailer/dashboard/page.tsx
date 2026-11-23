import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
import { RetailerDashboard } from "@/components/dashboard/retailer-dashboard";

export const metadata: Metadata = { title: "Retailer dashboard" };

export default function Page() {
  return (
    <RoleGuard allow={["RETAILER"]}>
      <div className="space-y-6">
        <PageHeader
          title="Retailer dashboard"
          description="Stock health, low-stock alerts, open orders and recent sales."
        />
        <RetailerDashboard />
      </div>
    </RoleGuard>
  );
}
