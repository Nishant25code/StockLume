import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
import { OrdersView } from "@/components/orders/orders-view";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return (
    <RoleGuard allow={["RETAILER", "WHOLESALER"]}>
      <div className="space-y-6">
        <PageHeader
          title="Orders"
          description="Suggested drafts, submitted purchase requests and fulfilment."
        />
        <OrdersView />
      </div>
    </RoleGuard>
  );
}
