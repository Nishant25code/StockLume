"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NAV_ITEMS } from "@/lib/navigation";
import { useSession } from "@/providers/session-provider";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isPreview, setPreviewRole } = useSession();
  const current = NAV_ITEMS.find((item) => pathname.startsWith(item.href));

  function signOut() {
    // TODO(Member 1): also call supabase.auth.signOut() once auth is wired.
    setPreviewRole(null);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
      <p className="truncate text-sm font-medium">{current?.title ?? "StockLume"}</p>

      <div className="ml-auto flex items-center gap-1.5">
        {role ? (
          <Badge variant="outline" className="hidden gap-1.5 sm:inline-flex">
            <span className="size-1.5 rounded-full bg-brand" />
            {role === "RETAILER" ? "Retailer" : "Wholesaler"}
            {isPreview ? " · preview" : ""}
          </Badge>
        ) : null}
        {/* TODO(Member 4): unread count from GET /api/notifications/unread-count */}
        <Button variant="ghost" size="icon" aria-label="Notifications" asChild>
          <Link href={role === "WHOLESALER" ? "/wholesaler/dashboard" : "/retailer/dashboard"}>
            <Bell />
          </Link>
        </Button>
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
