import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center px-4 text-center">
      <div className="space-y-4">
        <p className="font-mono text-sm text-brand">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm text-muted-foreground">This page doesn&apos;t exist yet — or it moved.</p>
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}
