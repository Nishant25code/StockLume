import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageSkeleton } from "@/components/states/loading-state";
import { OrderDetailView } from "@/components/orders/order-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order ${id}` };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return (
    <RoleGuard allow={["RETAILER", "WHOLESALER"]}>
      <Suspense fallback={<PageSkeleton />}>
        <OrderDetailView orderId={id} />
      </Suspense>
    </RoleGuard>
  );
}
