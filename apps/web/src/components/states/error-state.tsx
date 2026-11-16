"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  /** e.g. the `code` from an ApiClientError */
  code?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "Please try again. If the problem continues, check that the API is running.",
  code,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-danger/40 bg-danger/5 p-8 text-center",
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
        {code ? <p className="font-mono text-xs text-muted-foreground">{code}</p> : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw /> Try again
        </Button>
      ) : null}
    </div>
  );
}
