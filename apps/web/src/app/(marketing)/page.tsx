import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Boxes,
  Building2,
  ClipboardCheck,
  Database,
  KeyRound,
  LineChart,
  Lock,
  PackageX,
  PhoneOff,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import { AppPreview } from "@/components/marketing/app-preview";
import { Button } from "@/components/ui/button";

const PROBLEMS = [
  {
    icon: PackageX,
    title: "Empty shelves lose sales",
    text: "A best-seller runs out on a Saturday and the customer buys it next door.",
  },
  {
    icon: Wallet,
    title: "Over-ordering locks up cash",
    text: "Ordering \"a bit extra of everything\" fills the back room and empties the till.",
  },
  {
    icon: PhoneOff,
    title: "Orders get lost in calls",
    text: "Phone and chat orders have no status: was it accepted, shipped, delivered?",
  },
];

const FEATURES = [
  {
    icon: Boxes,
    title: "Live inventory",
    text: "Every product you stock, with quantity, minimum level and a stock bar you can read at a glance.",
  },
  {
    icon: Store,
    title: "Sales that update stock",
    text: "Record a sale and the stock goes down instantly. Every change is logged in a full movement history.",
  },
  {
    icon: LineChart,
    title: "Stockout prediction",
    text: "Your own sales history estimates the chance each product runs out before a delivery could arrive.",
  },
  {
    icon: BellRing,
    title: "Low-stock alerts",
    text: "High-risk products raise an alert on your dashboard before the shelf is empty.",
  },
  {
    icon: ClipboardCheck,
    title: "Suggested orders you approve",
    text: "StockLume drafts one order per wholesaler with suggested quantities. Edit freely, then submit.",
  },
  {
    icon: Truck,
    title: "Tracked fulfilment",
    text: "Wholesalers accept, reject and dispatch. Confirming delivery restocks your shelves automatically.",
  },
];

const LIFECYCLE = [
  { status: "Draft", who: "StockLume suggests, you edit" },
  { status: "Submitted", who: "You approve and send" },
  { status: "Accepted", who: "Wholesaler confirms" },
  { status: "Dispatched", who: "Wholesaler ships, their stock drops" },
  { status: "Delivered", who: "You confirm, your stock rises" },
];

const RETAILER_POINTS = [
  "See every product's stock and risk on one screen",
  "Record sales in seconds; stock updates itself",
  "Get a ready-made reorder list from your own sales data",
  "Track each order from draft to delivery",
];

const WHOLESALER_POINTS = [
  "Manage your catalogue, prices and available stock",
  "Receive clean purchase requests only after retailers submit them",
  "Accept, reject with a reason, and dispatch in one click",
  "See pending orders, revenue and top products on your dashboard",
];

const TRUST = [
  {
    icon: KeyRound,
    title: "Passwords never touch our servers",
    text: "Sign-in is handled by Supabase Auth. Our API only ever sees a short-lived access token.",
  },
  {
    icon: ShieldCheck,
    title: "Your data stays yours",
    text: "Every database query is scoped to your business. Other businesses can never read your stock or orders.",
  },
  {
    icon: Lock,
    title: "Drafts stay private",
    text: "A suggested order is invisible to the wholesaler until you submit it — enforced in code and in the database.",
  },
  {
    icon: Database,
    title: "Real database, real history",
    text: "PostgreSQL with constraints that make negative stock impossible, and an append-only log of every stock change.",
  },
];

const FAQ = [
  {
    q: "Does StockLume place orders automatically?",
    a: "No. StockLume prepares a suggested order as a draft. Nothing reaches your wholesaler until you review it and press Submit.",
  },
  {
    q: "How does the stockout prediction work?",
    a: "It averages your daily sales over the last 28 days, works out how many units you'd expect to sell before a new delivery could arrive, and uses a Poisson probability to estimate the chance that demand exceeds your current stock. With too little sales history it falls back to your minimum-stock rule.",
  },
  {
    q: "Who is it for?",
    a: "Small and medium retailers — kirana stores, groceries, pharmacies — and the wholesalers who supply them. Each signs up with their own role.",
  },
  {
    q: "What does it cost?",
    a: "StockLume is a college project in a free pilot. There is no payment and no card required.",
  },
  {
    q: "Can a wholesaler see my stock?",
    a: "No. Wholesalers only see the products in their own catalogue and the orders you have submitted to them.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-brand" /> Inventory + replenishment for retail
            </p>
            <h1 className="mt-6 font-heading text-4xl leading-[1.04] font-semibold tracking-tight text-balance sm:text-6xl">
              Never run out of what <span className="rounded-md bg-brand px-2 text-brand-foreground">sells</span>.
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground text-pretty sm:text-lg">
              StockLume watches your stock, predicts which products will run out, and drafts the reorder from your
              wholesalers. You approve it — they ship it — your shelves refill.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
                <Link href="/login">
                  Get started free <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/how-it-works">See how it works</Link>
              </Button>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" /> Nothing is ordered until you approve it.
            </p>
          </div>
          <AppPreview />
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────────── */}
      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
                <p.icon className="size-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-warning">Features</p>
            <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              From the sale at the counter to the truck at the door
            </h2>
            <p className="mt-4 text-muted-foreground">
              One connected flow for retailers and wholesalers — every step updates the next automatically.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="rounded-xl border bg-card p-6">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <f.icon className="size-5" aria-hidden />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <p className="mt-5 font-semibold">{f.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Prediction ───────────────────────────────────────── */}
      <section id="prediction" className="scroll-mt-20 bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold text-brand">Stockout prediction</p>
            <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Not a guess. A probability from your own sales.
            </h2>
            <ol className="mt-8 space-y-5">
              {[
                ["Average daily sales", "Units sold in the last 28 days ÷ 28."],
                ["Expected demand before delivery", "Average daily sales × lead time in days."],
                [
                  "Chance of running out",
                  "A Poisson model gives the probability that demand exceeds the stock you have.",
                ],
                ["Risk + suggestion", "High or medium risk adds the product to a suggested order with a quantity."],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand font-mono text-xs font-semibold text-brand-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-primary-foreground/70">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-primary-foreground/60">Worked example</p>
            <p className="mt-1 font-heading text-xl font-semibold">Basmati Rice 5kg</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              {[
                ["In stock", "6 bags"],
                ["Sold in 28 days", "84 bags (3/day)"],
                ["Delivery takes", "3 days"],
                ["Expected demand", "9 bags"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-white/5 p-3">
                  <dt className="text-primary-foreground/60">{k}</dt>
                  <dd className="mt-1 font-semibold tabular">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 rounded-lg bg-brand p-4 text-brand-foreground">
              <p className="text-sm">Chance of running out before the next delivery</p>
              <p className="font-heading text-4xl font-semibold tabular">88%</p>
              <p className="mt-1 text-sm">High risk → suggest ordering 34 bags</p>
            </div>
            <p className="mt-4 font-mono text-xs text-primary-foreground/50">
              P(stockout) = 1 − Σ e^(−λ)·λᵏ / k! for k = 0 … stock−1, λ = 9
            </p>
          </div>
        </div>
      </section>

      {/* ── Order lifecycle ──────────────────────────────────── */}
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-warning">Order lifecycle</p>
            <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Every order has a status. Everyone sees the same one.
            </h2>
          </div>
          <ol className="mt-12 grid gap-3 md:grid-cols-5">
            {LIFECYCLE.map((step, i) => (
              <li key={step.status} className="relative rounded-xl border bg-card p-5">
                <span className="font-mono text-xs text-muted-foreground">Step {i + 1}</span>
                <p className="mt-2 font-heading text-lg font-semibold">{step.status}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.who}</p>
                {i === 1 ? (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-brand-foreground">
                    Wholesaler notified here
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm text-muted-foreground">
            Side exits: a wholesaler can <strong className="text-foreground">reject</strong> a submitted order with a
            reason, and a retailer can <strong className="text-foreground">cancel</strong> a draft or a submitted order.
          </p>
        </div>
      </section>

      {/* ── For who ──────────────────────────────────────────── */}
      <section id="for-who" className="scroll-mt-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-20 sm:px-6 md:grid-cols-2">
          {[
            { icon: Store, title: "For retailers", points: RETAILER_POINTS },
            { icon: Building2, title: "For wholesalers", points: WHOLESALER_POINTS },
          ].map((side) => (
            <div key={side.title} className="rounded-2xl border bg-card p-8">
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <side.icon className="size-5" aria-hidden />
              </div>
              <h2 className="mt-6 font-heading text-2xl font-semibold">{side.title}</h2>
              <ul className="mt-5 space-y-3">
                {side.points.map((point) => (
                  <li key={point} className="flex gap-3 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust ────────────────────────────────────────────── */}
      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-warning">Built properly</p>
              <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Secure and reliable by design
              </h2>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="size-4" /> Next.js · Express · PostgreSQL (Supabase) · Cloudflare Workers
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map((t) => (
              <div key={t.title} className="rounded-xl border bg-background p-6">
                <t.icon className="size-5 text-success" aria-hidden />
                <p className="mt-4 font-semibold">{t.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="text-sm font-semibold text-warning">FAQ</p>
            <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Questions, answered</h2>
          </div>
          <div className="divide-y rounded-xl border bg-card">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-6 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {item.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-2xl bg-primary p-10 text-primary-foreground md:flex-row md:items-center">
          <div>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance">
              Ready to stop running out?
            </h2>
            <p className="mt-2 text-primary-foreground/70">
              Create a retailer or wholesaler account in under a minute.
            </p>
          </div>
          <Button asChild size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/login">
              Get started free <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
