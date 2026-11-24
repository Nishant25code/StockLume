import { ApiClientError } from "@/lib/api-client";

/** Human-readable message for a failed API call (shown in error toasts). */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}
