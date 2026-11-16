import { cn } from "@/lib/utils";

/** StockLume mark: stacked stock bars with a "lume" glow dot. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none">
        <rect x="4" y="12" width="4" height="8" rx="1" fill="currentColor" opacity="0.55" />
        <rect x="10" y="8" width="4" height="12" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="16" y="4" width="4" height="16" rx="1" fill="currentColor" />
      </svg>
      <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-brand ring-2 ring-background" />
    </span>
  );
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="text-[0.95rem] font-semibold tracking-tight">
        Stock<span className="text-brand">Lume</span>
      </span>
    </span>
  );
}
