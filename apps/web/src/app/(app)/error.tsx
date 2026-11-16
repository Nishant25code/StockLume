"use client";

import { ErrorState } from "@/components/states/error-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState message={error.message} code={error.digest} onRetry={reset} />;
}
