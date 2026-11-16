import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return (
    <RoleGuard allow={["RETAILER", "WHOLESALER"]}>
      <div className="space-y-6">
        <PageHeader title="Orders" description="Suggested drafts, submitted purchase requests and fulfilment." />
        <ModulePlaceholder
          module="orders"
          features={["Retailer: generate suggested orders, edit items, submit", "Wholesaler: accept, reject, dispatch submitted orders", "Retailer: confirm delivery (restocks inventory)", "Status timeline: DRAFT → SUBMITTED → ACCEPTED → DISPATCHED → DELIVERED"]}
          endpoints={["POST /api/orders/suggestions", "PUT /api/orders/:id/items", "POST /api/orders/:id/submit", "POST /api/orders/:id/accept", "POST /api/orders/:id/dispatch", "POST /api/orders/:id/deliver"]}
        />
      </div>
    </RoleGuard>
  );
}
