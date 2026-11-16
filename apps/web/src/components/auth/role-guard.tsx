"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/empty-state";
import { PageSkeleton } from "@/components/states/loading-state";
import { dashboardPathForRole } from "@/lib/navigation";
import { useSession } from "@/providers/session-provider";
import type { Role } from "@/types";

/**
 * Shows children only to the allowed roles. This is a UX guard only —
 * the Express API is what actually enforces permissions (requireRole).
 */
export function RoleGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { status, role } = useSession();

  if (status === "loading") return <PageSkeleton />;

  if (!role) {
    return (
      <EmptyState
        icon={Lock}
        title="Sign in to continue"
        description="Choose a role on the login page to explore this workspace."
        action={
          <Button asChild size="sm">
            <Link href="/login">Go to login</Link>
          </Button>
        }
      />
    );
  }

  if (!allow.includes(role)) {
    return (
      <EmptyState
        icon={Lock}
        title="Not available for your role"
        description={`This page is for ${allow.map((r) => r.toLowerCase() + "s").join(" and ")}.`}
        action={
          <Button asChild size="sm" variant="outline">
            <Link href={dashboardPathForRole(role)}>Back to dashboard</Link>
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
