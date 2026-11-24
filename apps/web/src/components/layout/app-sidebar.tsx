"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/layout/brand-logo";
import { navItemsForRole } from "@/lib/navigation";
import { useSession } from "@/providers/session-provider";

export function AppSidebar() {
  const pathname = usePathname();
  const { role } = useSession();
  const items = navItemsForRole(role);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <BrandLogo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{role === "WHOLESALER" ? "Wholesaler" : "Retailer"} workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-md border border-sidebar-border bg-sidebar-accent/50 p-3 text-xs group-data-[collapsible=icon]:hidden">
          <p className="flex items-center gap-1.5 font-medium text-sidebar-accent-foreground">
            <Sparkles className="size-3.5 text-brand" /> Smart replenishment
          </p>
          <p className="mt-1 text-sidebar-foreground/80">
            Predicted stockouts become suggested orders. Nothing is sent until you approve it.
          </p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
