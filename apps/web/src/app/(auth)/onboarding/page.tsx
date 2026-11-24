import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";
import { OnboardingPanel } from "./onboarding-panel";

export const metadata: Metadata = { title: "Set up your business" };

export default function OnboardingPage() {
  return (
    <div className="relative grid min-h-svh place-items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-lume" aria-hidden />
      <div className="relative w-full max-w-lg space-y-8">
        <Link href="/" className="flex justify-center">
          <BrandLogo />
        </Link>
        <OnboardingPanel />
      </div>
    </div>
  );
}
