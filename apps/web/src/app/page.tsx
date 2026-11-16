import Link from "next/link";
import { ArrowRight, BellRing, Boxes, ClipboardCheck, LineChart, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const FLOW = [
  { icon: Boxes, title: "Track stock", text: "Every sale updates retailer inventory automatically." },
  { icon: LineChart, title: "Predict stockouts", text: "Sales history estimates the chance each product runs out." },
  { icon: BellRing, title: "Get alerted", text: "Low-stock alerts arrive before shelves go empty." },
  { icon: ClipboardCheck, title: "Approve orders", text: "Suggested orders stay drafts until you submit them." },
  { icon: Truck, title: "Fulfil & receive", text: "Wholesalers accept and dispatch; delivery restocks you." },
];

export default function HomePage() {
  return (
    <div className="relative min-h-svh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-lume" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        aria-hidden
      />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <BrandLogo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pt-16 pb-24 sm:px-6 sm:pt-24">
        <p className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="size-1.5 rounded-full bg-brand" /> Retail ↔ wholesale replenishment
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Never run out of what <span className="text-brand">sells</span>.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground text-pretty sm:text-lg">
          StockLume connects retailers with their wholesalers, predicts stockouts from real sales, and prepares
          replenishment orders you review before anything is sent.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/login">
              Get started <ArrowRight />
            </Link>
          </Button>
        </div>

        <ol className="mt-20 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {FLOW.map((step, index) => (
            <li key={step.title} className="rounded-xl border bg-card/70 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <step.icon className="size-5 text-brand" aria-hidden />
                <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
              </div>
              <p className="mt-4 font-medium">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
