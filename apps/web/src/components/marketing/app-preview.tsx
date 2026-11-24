/**
 * Decorative, static mock-up of the StockLume app for the marketing pages.
 * Uses the same products as the demo data. Hidden from screen readers.
 */
import { ClipboardCheck, Lock, Sparkles } from "lucide-react";

const STOCK = [
  { name: "Basmati Rice 5kg", qty: 6, min: 10, risk: "High", pct: 88 },
  { name: "Sunflower Oil 1L", qty: 9, min: 12, risk: "High", pct: 71 },
  { name: "Green Tea 100 bags", qty: 3, min: 8, risk: "High", pct: 94 },
  { name: "Toor Dal 1kg", qty: 42, min: 15, risk: "Low", pct: 4 },
];

const ORDER = [
  { name: "Basmati Rice 5kg", qty: 34, price: 520 },
  { name: "Sunflower Oil 1L", qty: 36, price: 160 },
];

function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export function AppPreview() {
  const total = ORDER.reduce((sum, i) => sum + i.qty * i.price, 0);
  return (
    <div aria-hidden className="relative">
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-brand/25 blur-3xl" />
      <div className="relative overflow-hidden rounded-xl border bg-card shadow-2xl shadow-primary/10">
        {/* window bar */}
        <div className="flex items-center gap-2 border-b bg-muted/60 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-danger/70" />
          <span className="size-2.5 rounded-full bg-brand" />
          <span className="size-2.5 rounded-full bg-success/70" />
          <span className="ml-3 truncate rounded bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            stocklume / FreshMart Kirana / inventory
          </span>
        </div>

        <div className="grid gap-0 sm:grid-cols-[1.25fr_1fr]">
          {/* stock list */}
          <div className="space-y-3 p-4 sm:border-r">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Stock &amp; stockout risk</p>
              <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">3 at risk</span>
            </div>
            {STOCK.map((p) => {
              const scale = p.min * 2.5;
              const low = p.qty <= p.min;
              return (
                <div key={p.name} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className={low ? "font-semibold text-danger" : "text-muted-foreground"}>
                      {p.pct}% risk
                    </span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${low ? "bg-brand" : "bg-success/80"}`}
                      style={{ width: `${Math.min(100, (p.qty / scale) * 100)}%` }}
                    />
                    <span
                      className="absolute -top-0.5 h-2.5 w-0.5 rounded-full bg-foreground/50"
                      style={{ left: `${(p.min / scale) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {p.qty} left · minimum {p.min}
                  </p>
                </div>
              );
            })}
          </div>

          {/* suggested order */}
          <div className="space-y-3 bg-muted/30 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <Sparkles className="size-3.5 text-warning" /> Suggested order
            </p>
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold">#1005 · Metro Wholesale</p>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">Draft</span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                {ORDER.map((i) => (
                  <li key={i.name} className="flex justify-between gap-2">
                    <span className="truncate">
                      {i.qty}× {i.name}
                    </span>
                    <span className="tabular">{inr(i.qty * i.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t pt-2 text-[11px] font-semibold">
                <span>Total</span>
                <span className="tabular">{inr(total)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-[10px] text-muted-foreground">
              <Lock className="size-3" /> Not visible to the wholesaler until you submit
            </div>
            <div className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[11px] font-medium text-primary-foreground">
              <ClipboardCheck className="size-3.5" /> Review &amp; submit
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
