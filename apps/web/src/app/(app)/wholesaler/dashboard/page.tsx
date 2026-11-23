import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
import { WholesalerDashboard } from "@/components/dashboard/wholesaler-dashboard";

export const metadata: Metadata = { title: "Wholesaler dashboard" };

export default function Page() {
  return (
    <RoleGuard allow={["WHOLESALER"]}>
      <div className="space-y-6">
        <PageHeader
          title="Wholesaler dashboard"
          description="Incoming purchase requests, revenue and connected retailers."
        />
        <WholesalerDashboard />
      </div>
    </RoleGuard>
  );
}
