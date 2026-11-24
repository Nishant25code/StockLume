import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LoginPanel } from "./login-panel";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="relative grid min-h-svh place-items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-lume" aria-hidden />
      <div className="relative w-full max-w-lg space-y-8">
        <Link href="/" className="flex justify-center">
          <BrandLogo />
        </Link>
        <LoginPanel />
      </div>
    </div>
  );
}
