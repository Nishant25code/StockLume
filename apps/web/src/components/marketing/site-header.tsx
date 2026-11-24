"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Menu } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useHydrated } from "@/hooks/use-hydrated";
import { dashboardPathForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";

export const SITE_NAV = [
  { href: "/#features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/#for-who", label: "Retailers & wholesalers" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { status, role } = useSession();
  const [open, setOpen] = useState(false);
  const signedIn = hydrated && status === "authenticated" && role;

  const primaryCta = signedIn ? (
    <Button asChild size="sm">
      <Link href={dashboardPathForRole(role)}>
        Open dashboard <ArrowRight />
      </Link>
    </Button>
  ) : (
    <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
      <Link href="/login">Get started</Link>
    </Button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="StockLume home">
          <BrandLogo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {SITE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                pathname === item.href && "text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {!signedIn ? (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
          ) : null}
          <span className="hidden sm:inline-flex">{primaryCta}</span>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
                {SITE_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                  {!signedIn ? (
                    <Button asChild variant="outline" onClick={() => setOpen(false)}>
                      <Link href="/login">Sign in</Link>
                    </Button>
                  ) : null}
                  <span onClick={() => setOpen(false)} className="[&>a]:w-full">
                    {primaryCta}
                  </span>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
