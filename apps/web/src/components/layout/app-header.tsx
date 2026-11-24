"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NAV_ITEMS } from "@/lib/navigation";
import { useHydrated } from "@/hooks/use-hydrated";
import { useSession } from "@/providers/session-provider";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  // Session lives only in the browser: render it after hydration so the first
  // client render matches the server HTML.
  const hydrated = useHydrated();
  const role = hydrated ? session.role : null;
  const user = hydrated ? session.user : null;
  const { isPreview, signOut } = session;
  const current = NAV_ITEMS.find((item) => pathname.startsWith(item.href));

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
      <p className="truncate text-sm font-medium">{current?.title ?? "StockLume"}</p>

      <div className="ml-auto flex items-center gap-1.5">
        {user?.businessName ? (
          <div className="hidden min-w-0 text-right leading-tight md:block">
            <p className="truncate text-xs font-medium">{user.businessName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
          </div>
        ) : null}
        {role ? (
          <Badge variant="outline" className="hidden gap-1.5 sm:inline-flex">
            <span className="size-1.5 rounded-full bg-brand" />
            {role === "RETAILER" ? "Retailer" : "Wholesaler"}
            {isPreview ? " · preview" : ""}
          </Badge>
        ) : null}
        <NotificationBell />
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void handleSignOut()}>
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
