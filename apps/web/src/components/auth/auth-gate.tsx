"use client";

/**
 * Protects every page inside app/(app): signed-out users go to /login,
 * users without a business go to /onboarding. Role checks per page are done
 * by <RoleGuard>. The API still enforces everything — this is UX only.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/states/error-state";
import { PageSkeleton } from "@/components/states/loading-state";
import { useSession } from "@/providers/session-provider";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, error, refresh } = useSession();

  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
    if (status === "onboarding") router.replace("/onboarding");
  }, [status, router]);

  if (status === "authenticated" || status === "preview") return <>{children}</>;

  if (status === "error") {
    return (
      <ErrorState
        title="Could not load your account"
        message={error ?? "The StockLume API could not be reached. Check that it is running."}
        onRetry={() => void refresh()}
      />
    );
  }

  return <PageSkeleton />;
}
