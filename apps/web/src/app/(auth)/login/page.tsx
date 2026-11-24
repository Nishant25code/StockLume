import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LoginPanel } from "./login-panel";

export const metadata: Metadata = { title: "Sign in" };

/** Decorative sample of the stock-level bars used across the app. */
const SAMPLE = [
  { name: "Basmati Rice 5kg", qty: 6, min: 10 },
  { name: "Toor Dal 1kg", qty: 42, min: 15 },
  { name: "Sunflower Oil 1L", qty: 9, min: 12 },
  { name: "Whole Wheat Atta 10kg", qty: 25, min: 10 },
];

function SampleShelf() {
  return (
    <div className="w-full max-w-md rounded-lg border border-white/10 bg-white/5 p-5" aria-hidden>
      <p className="mb-4 text-sm text-white/60">Example stock levels</p>
      <ul className="space-y-4">
        {SAMPLE.map((p) => {
          const scale = p.min * 2.5;
          const low = p.qty <= p.min;
          return (
            <li key={p.name}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-white/90">{p.name}</span>
                <span className={low ? "font-semibold text-brand" : "text-white/60"}>
                  {p.qty} left{low ? ", reorder" : ""}
                </span>
              </div>
              <div className="relative mt-2 h-2 rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${low ? "bg-brand" : "bg-emerald-400/80"}`}
                  style={{ width: `${Math.min(100, (p.qty / scale) * 100)}%` }}
                />
                <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-white/70" style={{ left: `${(p.min / scale) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <aside className="hidden flex-col justify-between gap-12 bg-[#0E2A2B] p-12 text-white lg:flex">
        <Link href="/" className="w-fit text-white">
          <BrandLogo />
        </Link>
        <div className="space-y-8">
          <h1 className="max-w-md font-heading text-5xl leading-[1.05] font-semibold text-balance">
            Know what&rsquo;s running low before it runs out.
          </h1>
          <p className="max-w-md text-base text-white/70">
            StockLume predicts stockouts from your sales and drafts the reorder. You approve it, and your wholesaler ships.
          </p>
          <SampleShelf />
        </div>
        <p className="text-sm text-white/50">For retailers and the wholesalers who supply them.</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-8">
          <Link href="/" className="flex justify-center lg:hidden">
            <BrandLogo />
          </Link>
          <LoginPanel />
        </div>
      </main>
    </div>
  );
}
