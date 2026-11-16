/**
 * Sidebar navigation + which roles can open each page.
 * Add new pages here so the sidebar and role guards stay in one place.
 */
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  PackageSearch,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  /** Short helper text shown in tooltips / placeholders. */
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/retailer/dashboard",
    icon: LayoutDashboard,
    roles: ["RETAILER"],
    description: "Stock health, alerts and open orders at a glance",
  },
  {
    title: "Dashboard",
    href: "/wholesaler/dashboard",
    icon: LayoutDashboard,
    roles: ["WHOLESALER"],
    description: "Incoming orders, revenue and connected retailers",
  },
  {
    title: "Products",
    href: "/products",
    icon: PackageSearch,
    roles: ["RETAILER", "WHOLESALER"],
    description: "Wholesaler catalogues, prices and availability",
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Boxes,
    roles: ["RETAILER"],
    description: "Current stock, sales and stockout risk",
  },
  {
    title: "Orders",
    href: "/orders",
    icon: ShoppingCart,
    roles: ["RETAILER", "WHOLESALER"],
    description: "Suggested, submitted and fulfilled purchase orders",
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["RETAILER", "WHOLESALER"],
    description: "Sales trends, top products and order statistics",
  },
];

export function navItemsForRole(role: Role | null) {
  return role ? NAV_ITEMS.filter((item) => item.roles.includes(role)) : [];
}

export function dashboardPathForRole(role: Role) {
  return role === "RETAILER" ? "/retailer/dashboard" : "/wholesaler/dashboard";
}
