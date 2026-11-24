import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/#prediction", label: "Stockout prediction" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "For",
    links: [
      { href: "/#for-who", label: "Retailers" },
      { href: "/#for-who", label: "Wholesalers" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "/about", label: "About & team" },
      { href: "https://github.com/Nishant25code/StockLume", label: "Source on GitHub" },
      { href: "/login", label: "Sign in" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <BrandLogo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Stock prediction and replenishment for retailers and the wholesalers who supply them.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-sm font-semibold">{col.title}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} StockLume — a college project by Nishant, Noor, Celina and Kalpana.
        </p>
      </div>
    </footer>
  );
}
