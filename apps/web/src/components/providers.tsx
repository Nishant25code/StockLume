"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/providers/session-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
