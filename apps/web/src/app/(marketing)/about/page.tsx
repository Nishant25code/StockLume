import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "StockLume is a college project by a team of four.",
};

const TEAM = [
  { name: "Nishant Jain", github: "Nishant25code", role: "Project lead", work: "Planning and management, Supabase and Cloudflare setup, authentication, integration and testing." },
  { name: "Noor Hora", github: "noor0021", role: "Backend developer", work: "Orders and fulfilment, sales recording, the stockout prediction model, and the UI redesign." },
  { name: "Celina", github: "cellinaachari505", role: "Database & catalogue", work: "Database design support, connections, products, inventory and reorder rules." },
  { name: "Kalpana Beniwal", github: "KalpnaBeniwal868", role: "Frontend & analytics", work: "Notifications, dashboards, analytics charts, and the inventory and orders screens." },
];

const STACK = [
  ["Frontend", "Next.js 16, TypeScript, Tailwind CSS, shadcn/ui"],
  ["Backend", "Node.js, Express 5, plain SQL with node-postgres"],
  ["Database", "PostgreSQL on Supabase — 11 normalized tables (BCNF)"],
  ["Auth", "Supabase Auth (email + password, JWT access tokens)"],
  ["Hosting", "Cloudflare Workers (frontend via OpenNext, API) + Hyperdrive"],
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-20">
      <p className="text-sm font-semibold text-warning">About</p>
      <h1 className="mt-2 font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        A college project built like a real product
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        StockLume connects small retailers with their wholesalers. It predicts stockouts from real sales, drafts the
        replenishment order, and tracks it through to delivery — with the retailer in control at every step.
      </p>

      <h2 className="mt-14 font-heading text-2xl font-semibold">The team</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {TEAM.map((m) => (
          <div key={m.github} className="rounded-xl border bg-card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-heading text-lg font-semibold">{m.name}</p>
                <p className="text-sm text-warning">{m.role}</p>
              </div>
              <Link
                href={`https://github.com/${m.github}`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                @{m.github} <ExternalLink className="size-3" aria-hidden />
              </Link>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{m.work}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-14 font-heading text-2xl font-semibold">How it&apos;s built</h2>
      <dl className="mt-6 divide-y rounded-xl border bg-card">
        {STACK.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-6 py-4 sm:grid-cols-[10rem_1fr]">
            <dt className="text-sm font-semibold">{k}</dt>
            <dd className="text-sm text-muted-foreground">{v}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-8 text-sm text-muted-foreground">
        Source code:{" "}
        <Link href="https://github.com/Nishant25code/StockLume" className="font-medium text-foreground underline underline-offset-4">
          github.com/Nishant25code/StockLume
        </Link>
      </p>
    </div>
  );
}
