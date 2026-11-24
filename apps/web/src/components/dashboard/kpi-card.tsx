import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  variant?: "default" | "brand" | "warning" | "success" | "info";
  className?: string;
}

/** Shelf-tag style stat: a coloured edge carries the status, the number does the talking. */
export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  badge,
  badgeVariant = "secondary",
  variant = "default",
  className,
}: KpiCardProps) {
  const edge = {
    default: "before:bg-border",
    brand: "before:bg-brand",
    warning: "before:bg-warning",
    success: "before:bg-success",
    info: "before:bg-info",
  };

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 overflow-hidden rounded-lg border bg-card py-4 pr-4 pl-5",
        "before:absolute before:inset-y-0 before:left-0 before:w-1.5",
        edge[variant],
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
      </div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <p className="font-heading text-[1.9rem] leading-tight font-semibold tracking-tight text-foreground">
          {value}
        </p>
        {badge ? (
          <Badge variant={badgeVariant} className="px-1.5 py-0 text-[11px] font-medium">
            {badge}
          </Badge>
        ) : null}
      </div>

      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}
