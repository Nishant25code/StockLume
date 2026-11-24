"use client";

/**
 * Finish registration: the user is signed in to Supabase but has no business
 * yet (e.g. they confirmed their email first). Creates the business + profile
 * via POST /api/auth/register, prefilled from what they typed at sign-up.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/states/loading-state";
import { dashboardPathForRole } from "@/lib/navigation";
import { useSession } from "@/providers/session-provider";
import type { Role } from "@/types";
import { RoleChoice } from "../login/login-panel";

function metaString(meta: Record<string, unknown> | undefined, key: string) {
  const value = meta?.[key];
  return typeof value === "string" ? value : "";
}

export function OnboardingPanel() {
  const router = useRouter();
  const { status, role } = useSession();

  useEffect(() => {
    if (status === "signed-out" || status === "preview") router.replace("/login");
    if (status === "authenticated" && role) router.replace(dashboardPathForRole(role));
  }, [status, role, router]);

  // Mount the form only once the Supabase user is known, so the prefill is available.
  return status === "onboarding" ? <OnboardingForm /> : <PageSkeleton />;
}

function OnboardingForm() {
  const router = useRouter();
  const { authUser, register, signOut } = useSession();
  const meta = authUser?.user_metadata as Record<string, unknown> | undefined;

  const [accountType, setAccountType] = useState<Role>(
    metaString(meta, "business_type") === "WHOLESALER" ? "WHOLESALER" : "RETAILER",
  );
  const [fullName, setFullName] = useState(metaString(meta, "full_name"));
  const [businessName, setBusinessName] = useState(metaString(meta, "business_name"));
  const [city, setCity] = useState(metaString(meta, "city"));
  const [phone, setPhone] = useState(metaString(meta, "phone"));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const me = await register({
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        businessType: accountType,
        city: city.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      if (me.role) router.replace(dashboardPathForRole(me.role));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save your business");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up your business</CardTitle>
        <CardDescription>
          Signed in as <span className="font-medium text-foreground">{authUser?.email}</span>. One last step.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <fieldset disabled={submitting} className="space-y-4">
            <RoleChoice value={accountType} onChange={setAccountType} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ob-name">Your name</Label>
                <Input id="ob-name" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-business">Business name</Label>
                <Input id="ob-business" required autoComplete="organization" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-city">City</Label>
                <Input id="ob-city" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-phone">Phone</Label>
                <Input id="ob-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
          </fieldset>
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-2">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin" /> : null} Continue
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => void signOut()}>
            Use a different account
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
