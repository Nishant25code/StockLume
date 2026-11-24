import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Cpu, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How it works",
  description: "The 14 steps from a retailer's sale to a wholesaler's delivery in StockLume.",
};

type Actor = "Retailer" | "Wholesaler" | "StockLume" | "Both";

const ACTOR_STYLE: Record<Actor, { icon: typeof Store; className: string }> = {
  Retailer: { icon: Store, className: "bg-accent text-accent-foreground" },
  Wholesaler: { icon: Building2, className: "bg-info/10 text-info" },
  StockLume: { icon: Cpu, className: "bg-success/10 text-success" },
  Both: { icon: Store, className: "bg-muted text-foreground" },
};

const PHASES: {
  title: string;
  steps: { n: number; title: string; text: string; actor: Actor; screen?: string }[];
}[] = [
  {
    title: "Set up",
    steps: [
      { n: 1, title: "Sign up as a retailer or wholesaler", text: "Supabase Auth creates the login; StockLume creates your business and profile together.", actor: "Both", screen: "/login" },
      { n: 2, title: "Connect retailers and wholesalers", text: "Retailers see the wholesalers they buy from; wholesalers see the retailers they supply.", actor: "Both", screen: "/connections" },
      { n: 3, title: "Publish a product catalogue", text: "Wholesalers add products with a price and the quantity they have available.", actor: "Wholesaler", screen: "/products" },
    ],
  },
  {
    title: "Track and predict",
    steps: [
      { n: 4, title: "Track inventory", text: "Retailers add products from connected wholesalers and keep stock counts up to date.", actor: "Retailer", screen: "/inventory" },
      { n: 5, title: "Record sales", text: "Each sale lowers stock instantly and is logged. For a demo, 'Simulate sales' generates a week of sales.", actor: "Retailer", screen: "/inventory" },
      { n: 6, title: "Predict stockouts", text: "A Poisson model uses 28 days of sales to estimate the chance each product runs out before a delivery.", actor: "StockLume", screen: "/inventory" },
      { n: 7, title: "Raise low-stock alerts", text: "High-risk products appear as alerts on the retailer dashboard and in notifications.", actor: "StockLume", screen: "/retailer/dashboard" },
    ],
  },
  {
    title: "Order",
    steps: [
      { n: 8, title: "Suggest a replenishment order", text: "StockLume drafts one order per wholesaler, with a suggested quantity for each at-risk product.", actor: "StockLume", screen: "/orders" },
      { n: 9, title: "Customise the order", text: "Add or remove products and change quantities. The total updates as you edit.", actor: "Retailer", screen: "/orders" },
      { n: 10, title: "Submit", text: "The retailer reviews and submits. Until now the order was invisible to the wholesaler.", actor: "Retailer", screen: "/orders" },
      { n: 11, title: "Notify the wholesaler", text: "Only on submit does the wholesaler get the purchase request and a notification.", actor: "StockLume", screen: "/wholesaler/dashboard" },
    ],
  },
  {
    title: "Fulfil and learn",
    steps: [
      { n: 12, title: "Accept, reject or dispatch", text: "The wholesaler accepts (or rejects with a reason), then dispatches — which lowers their available stock.", actor: "Wholesaler", screen: "/orders" },
      { n: 13, title: "Confirm delivery", text: "The retailer confirms receipt and the delivered quantities are added to inventory automatically.", actor: "Retailer", screen: "/orders" },
      { n: 14, title: "Dashboards and analytics", text: "Both sides see stock value, open orders, sales trends, top products and order statistics.", actor: "Both", screen: "/analytics" },
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-20">
      <p className="text-sm font-semibold text-warning">How it works</p>
      <h1 className="mt-2 font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        14 steps from a sale to a full shelf
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Retailers and wholesalers work in the same system. Each step below says who does it and which screen it
        happens on.
      </p>

      <div className="mt-8 flex flex-wrap gap-2 text-xs">
        {(["Retailer", "Wholesaler", "StockLume"] as Actor[]).map((a) => {
          const { icon: Icon, className } = ACTOR_STYLE[a];
          return (
            <span key={a} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${className}`}>
              <Icon className="size-3.5" aria-hidden /> {a === "StockLume" ? "StockLume (automatic)" : a}
            </span>
          );
        })}
      </div>

      <div className="mt-12 space-y-14">
        {PHASES.map((phase, p) => (
          <section key={phase.title} aria-labelledby={`phase-${p}`}>
            <h2 id={`phase-${p}`} className="flex items-baseline gap-3 font-heading text-2xl font-semibold">
              <span className="font-mono text-sm text-muted-foreground">Phase {p + 1}</span> {phase.title}
            </h2>
            <ol className="mt-6 space-y-3">
              {phase.steps.map((step) => {
                const { icon: Icon, className } = ACTOR_STYLE[step.actor];
                return (
                  <li key={step.n} className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-[3rem_1fr_auto] sm:items-start">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary font-mono text-sm font-semibold text-primary-foreground">
                      {step.n}
                    </span>
                    <div>
                      <p className="font-semibold">{step.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
                        <Icon className="size-3.5" aria-hidden /> {step.actor}
                      </span>
                      {step.screen ? (
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{step.screen}</code>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      <div className="mt-16 flex flex-col items-start gap-4 rounded-2xl border bg-card p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-xl font-semibold">See it with real data</p>
          <p className="text-sm text-muted-foreground">Sign in as a retailer or wholesaler and follow the steps above.</p>
        </div>
        <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Link href="/login">
            Sign in <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
