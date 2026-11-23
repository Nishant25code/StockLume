import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  const iconVariants = {
    default: "bg-muted text-muted-foreground",
    brand: "bg-brand/10 text-brand",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
  };

  return (
    <Card className={cn("relative overflow-hidden transition-all hover:shadow-sm", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              iconVariants[variant],
            )}
          >
            <Icon className="size-4" aria-hidden />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {badge ? (
            <Badge variant={badgeVariant} className="text-[10px] font-medium px-1.5 py-0">
              {badge}
            </Badge>
          ) : null}
        </div>

        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

