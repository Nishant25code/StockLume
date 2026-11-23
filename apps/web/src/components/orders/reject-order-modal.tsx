"use client";

import { useState } from "react";
import { AlertCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface RejectOrderModalProps {
  orderNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function RejectOrderModal({
  orderNumber,
  isOpen,
  onClose,
  onConfirm,
}: RejectOrderModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for rejecting this order.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(reason.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to reject order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in-0">
      <Card className="w-full max-w-md shadow-xl border-border">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="size-5" />
              <CardTitle className="text-lg">Reject Order #{orderNumber}</CardTitle>
            </div>
            <CardDescription>
              Please state why this order cannot be fulfilled. The retailer will receive a notification with this explanation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 text-xs bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="rejection-reason" className="text-sm font-medium">
                Rejection Reason <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="rejection-reason"
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Insufficient stock available at our warehouse, or delivery route unavailable."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t pt-4 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={isSubmitting || !reason.trim()}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Rejecting...</span>
                </>
              ) : (
                <>
                  <XCircle className="size-3.5" />
                  <span>Reject Order</span>
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
