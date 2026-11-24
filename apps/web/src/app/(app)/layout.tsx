import { Suspense } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/** Shared shell for every signed-in page: sidebar + header + content. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <AppSidebar />
      </Suspense>
      {/* min-w-0 lets wide tables scroll inside their cards instead of widening the whole page */}
      <SidebarInset className="min-w-0">
        <Suspense fallback={<div className="h-14 border-b bg-background/80" />}>
          <AppHeader />
        </Suspense>
        <div className="mx-auto w-full min-w-0 max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
