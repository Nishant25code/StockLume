"use client";

import {
  Ban,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  Truck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";

interface OrderTimelineProps {
  order: Order;
  className?: string;
}

interface StepItem {
  key: string;
  title: string;
  description: string;
  timestamp?: string | null;
  status: "completed" | "current" | "upcoming" | "error";
  icon: React.ReactNode;
}

function formatDate(isoString?: string | null) {
  if (!isoString) return null;
  const date = new Date(isoString);
  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderTimeline({ order, className }: OrderTimelineProps) {
  const isCancelled = order.status === "CANCELLED";
  const isRejected = order.status === "REJECTED";

  let steps: StepItem[] = [];

  if (isRejected) {
    steps = [
      {
        key: "DRAFT",
        title: "Draft Created",
        description: order.isSuggested ? "Suggested by AI" : "Created by retailer",
        timestamp: formatDate(order.createdAt),
        status: "completed",
        icon: <FileText className="size-4" />,
      },
      {
        key: "SUBMITTED",
        title: "Order Submitted",
        description: "Sent to wholesaler",
        timestamp: formatDate(order.submittedAt),
        status: "completed",
        icon: <Send className="size-4" />,
      },
      {
        key: "REJECTED",
        title: "Order Rejected",
        description: order.rejectionReason || "Declined by wholesaler",
        timestamp: formatDate(order.rejectedAt),
        status: "error",
        icon: <XCircle className="size-4" />,
      },
    ];
  } else if (isCancelled) {
    steps = [
      {
        key: "DRAFT",
        title: "Draft Created",
        description: order.isSuggested ? "Suggested by AI" : "Created by retailer",
        timestamp: formatDate(order.createdAt),
        status: "completed",
        icon: <FileText className="size-4" />,
      },
      ...(order.submittedAt
        ? [
            {
              key: "SUBMITTED",
              title: "Order Submitted",
              description: "Sent to wholesaler",
              timestamp: formatDate(order.submittedAt),
              status: "completed" as const,
              icon: <Send className="size-4" />,
            },
          ]
        : []),
      {
        key: "CANCELLED",
        title: "Order Cancelled",
        description: "Discarded by retailer",
        timestamp: formatDate(order.cancelledAt),
        status: "error",
        icon: <Ban className="size-4" />,
      },
    ];
  } else {
    // Normal linear flow: DRAFT -> SUBMITTED -> ACCEPTED -> DISPATCHED -> DELIVERED
    const statusOrder: OrderStatus[] = [
      "DRAFT",
      "SUBMITTED",
      "ACCEPTED",
      "DISPATCHED",
      "DELIVERED",
    ];

    const currentIndex = statusOrder.indexOf(order.status);

    steps = [
      {
        key: "DRAFT",
        title: "Draft Created",
        description: order.isSuggested ? "AI Suggested" : "Drafted",
        timestamp: formatDate(order.createdAt),
        status: currentIndex > 0 ? "completed" : currentIndex === 0 ? "current" : "upcoming",
        icon: currentIndex > 0 ? <Check className="size-4" /> : <FileText className="size-4" />,
      },
      {
        key: "SUBMITTED",
        title: "Submitted",
        description: "Sent to wholesaler",
        timestamp: formatDate(order.submittedAt),
        status: currentIndex > 1 ? "completed" : currentIndex === 1 ? "current" : "upcoming",
        icon: currentIndex > 1 ? <Check className="size-4" /> : <Send className="size-4" />,
      },
      {
        key: "ACCEPTED",
        title: "Accepted",
        description: "Confirmed by wholesaler",
        timestamp: formatDate(order.acceptedAt),
        status: currentIndex > 2 ? "completed" : currentIndex === 2 ? "current" : "upcoming",
        icon: currentIndex > 2 ? <Check className="size-4" /> : <Clock className="size-4" />,
      },
      {
        key: "DISPATCHED",
        title: "Dispatched",
        description: "In transit",
        timestamp: formatDate(order.dispatchedAt),
        status: currentIndex > 3 ? "completed" : currentIndex === 3 ? "current" : "upcoming",
        icon: currentIndex > 3 ? <Check className="size-4" /> : <Truck className="size-4" />,
      },
      {
        key: "DELIVERED",
        title: "Delivered",
        description: "Restocked & completed",
        timestamp: formatDate(order.deliveredAt),
        status: currentIndex === 4 ? "completed" : "upcoming",
        icon: currentIndex === 4 ? <CheckCircle2 className="size-4" /> : <CheckCircle2 className="size-4" />,
      },
    ];
  }

  return (
    <div className={cn("w-full py-2", className)}>
      {/* Mobile vertical layout */}
      <div className="flex flex-col space-y-4 md:hidden">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all",
                    step.status === "completed" && "bg-brand text-brand-foreground border-brand",
                    step.status === "current" &&
                      "bg-brand/10 text-brand border-brand ring-4 ring-brand/20",
                    step.status === "upcoming" && "bg-muted text-muted-foreground border-border",
                    step.status === "error" &&
                      "bg-destructive/10 text-destructive border-destructive"
                  )}
                >
                  {step.icon}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 h-8 mt-1",
                      step.status === "completed" ? "bg-brand" : "bg-border"
                    )}
                  />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center justify-between">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      step.status === "current" && "text-brand font-semibold",
                      step.status === "error" && "text-destructive font-semibold"
                    )}
                  >
                    {step.title}
                  </p>
                  {step.timestamp && (
                    <span className="text-[11px] text-muted-foreground">{step.timestamp}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop horizontal layout */}
      <div className="hidden md:flex items-start justify-between relative">
        {/* Connecting line */}
        <div
          className="absolute top-4 left-6 right-6 h-0.5 bg-border -z-0"
          aria-hidden="true"
        />

        {steps.map((step) => {
          return (
            <div
              key={step.key}
              className="relative z-10 flex flex-col items-center text-center max-w-[130px] flex-1"
            >
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border bg-card transition-all",
                  step.status === "completed" && "bg-brand text-brand-foreground border-brand",
                  step.status === "current" &&
                    "bg-brand/10 text-brand border-brand ring-4 ring-brand/20 font-bold",
                  step.status === "upcoming" && "bg-card text-muted-foreground border-border",
                  step.status === "error" &&
                    "bg-destructive/15 text-destructive border-destructive ring-4 ring-destructive/20 font-bold"
                )}
              >
                {step.icon}
              </div>
              <div className="mt-2.5 space-y-0.5">
                <p
                  className={cn(
                    "text-xs font-medium leading-tight",
                    step.status === "current" && "text-brand font-semibold",
                    step.status === "completed" && "text-foreground",
                    step.status === "error" && "text-destructive font-semibold",
                    step.status === "upcoming" && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {step.description}
                </p>
                {step.timestamp && (
                  <p className="text-[10px] text-muted-foreground/80 font-mono">
                    {step.timestamp}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
