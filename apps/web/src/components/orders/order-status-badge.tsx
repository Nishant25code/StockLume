"use client";

import {
  Ban,
  CheckCircle,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  Sparkles,
  Truck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  isSuggested?: boolean;
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function OrderStatusBadge({
  status,
  isSuggested,
  className,
  size = "default",
}: OrderStatusBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    default: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  }[size];

  const iconSizes = {
    sm: "size-3",
    default: "size-3.5",
    lg: "size-4",
  }[size];

  const config: Record<
    OrderStatus,
    { label: string; icon: React.ReactNode; variantClasses: string }
  > = {
    DRAFT: {
      label: "Draft",
      icon: <FileText className={iconSizes} />,
      variantClasses: "bg-muted text-muted-foreground border-border",
    },
    SUBMITTED: {
      label: "Submitted",
      icon: <Send className={iconSizes} />,
      variantClasses: "bg-brand/10 text-brand border-brand/20",
    },
    ACCEPTED: {
      label: "Accepted",
      icon: <CheckCircle className={iconSizes} />,
      variantClasses: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    },
    DISPATCHED: {
      label: "Dispatched",
      icon: <Truck className={iconSizes} />,
      variantClasses: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    DELIVERED: {
      label: "Delivered",
      icon: <CheckCircle2 className={iconSizes} />,
      variantClasses: "bg-success/10 text-success border-success/20",
    },
    REJECTED: {
      label: "Rejected",
      icon: <XCircle className={iconSizes} />,
      variantClasses: "bg-destructive/10 text-destructive border-destructive/20",
    },
    CANCELLED: {
      label: "Cancelled",
      icon: <Ban className={iconSizes} />,
      variantClasses: "bg-muted text-muted-foreground/80 border-border line-through opacity-80",
    },
  };

  const item = config[status] || {
    label: status,
    icon: <Clock className={iconSizes} />,
    variantClasses: "bg-muted text-muted-foreground",
  };

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <Badge
        variant="outline"
        className={cn("font-medium transition-colors", item.variantClasses, sizeClasses)}
      >
        {item.icon}
        <span>{item.label}</span>
      </Badge>
      {isSuggested && status === "DRAFT" ? (
        <Badge
          variant="outline"
          className={cn(
            "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 font-medium",
            sizeClasses
          )}
        >
          <Sparkles className={iconSizes} />
          <span>AI Suggested</span>
        </Badge>
      ) : null}
    </div>
  );
}
