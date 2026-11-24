import { cn } from "@/lib/utils";

/** StockLume mark: three stock bars on a price-tag yellow tile. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 items-center justify-center rounded-md bg-brand text-brand-foreground",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[1.15rem]" fill="none">
        <rect x="3.5" y="13" width="4.5" height="7" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="9.75" y="8.5" width="4.5" height="11.5" rx="1" fill="currentColor" opacity="0.78" />
        <rect x="16" y="4" width="4.5" height="16" rx="1" fill="currentColor" />
      </svg>
    </span>
  );
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="font-heading text-lg font-semibold tracking-tight">StockLume</span>
    </span>
  );
}
