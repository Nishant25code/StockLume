import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Products" };

export default function Page() {
  return (
    <RoleGuard allow={["RETAILER", "WHOLESALER"]}>
      <div className="space-y-6">
        <PageHeader title="Products" description="Wholesaler catalogues with prices and available quantities." />
        <ModulePlaceholder
          module="auth"
          features={["Wholesaler: add, edit and deactivate products", "Retailer: browse catalogues of connected wholesalers", "Manage retailer–wholesaler connections"]}
          endpoints={["GET /api/products", "POST /api/products", "PATCH /api/products/:id", "GET /api/connections"]}
        />
      </div>
    </RoleGuard>
  );
}
