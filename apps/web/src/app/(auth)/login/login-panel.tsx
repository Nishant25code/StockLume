"use client";

/**
 * Sign in / create account (Supabase Auth) — OWNER: Member 1.
 *
 * Sign in   → supabase.auth.signInWithPassword → GET /api/auth/me → role dashboard
 * Sign up   → supabase.auth.signUp → POST /api/auth/register (business + profile)
 *             If email confirmation is ON, the user confirms first, signs in,
 *             and finishes on /onboarding (details are prefilled).
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, MailCheck, Store } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isPreviewAllowed } from "@/lib/env";
import { dashboardPathForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";
import type { Role } from "@/types";

const MIN_PASSWORD = 8;

export function RoleChoice({ value, onChange }: { value: Role; onChange: (role: Role) => void }) {
  const options: { role: Role; title: string; text: string; icon: typeof Store }[] = [
    { role: "RETAILER", title: "Retailer", text: "I sell to customers and restock from wholesalers", icon: Store },
    { role: "WHOLESALER", title: "Wholesaler", text: "I supply products to retailers", icon: Building2 },
  ];
  return (
    <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.role}
          type="button"
          role="radio"
          aria-checked={value === o.role}
          aria-label={`${o.title}: ${o.text}`}
          onClick={() => onChange(o.role)}
          className={cn(
            "rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            value === o.role ? "border-brand bg-brand/10" : "hover:bg-muted/60",
          )}
        >
          <o.icon className={cn("size-4", value === o.role ? "text-brand" : "text-muted-foreground")} />
          <p className="mt-2 text-sm font-medium">{o.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{o.text}</p>
        </button>
      ))}
    </div>
  );
}

export function LoginPanel() {
  const router = useRouter();
  const { status, role, isAuthConfigured, signIn, signUp, setPreviewRole } = useSession();

  const [tab, setTab] = useState("sign-in");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmEmailSentTo, setConfirmEmailSentTo] = useState<string | null>(null);

  // Sign-in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign-up fields
  const [accountType, setAccountType] = useState<Role>("RETAILER");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Once signed in, leave the login page.
  useEffect(() => {
    if (submitting) return;
    if (status === "authenticated" && role) router.replace(dashboardPathForRole(role));
    if (status === "onboarding") router.replace("/onboarding");
  }, [status, role, submitting, router]);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (newPassword.length < MIN_PASSWORD) {
      setFormError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setSubmitting(true);
    try {
      const result = await signUp({
        email: newEmail.trim(),
        password: newPassword,
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        businessType: accountType,
        city: city.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      if (!result.signedIn) setConfirmEmailSentTo(newEmail.trim());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create your account");
    } finally {
      setSubmitting(false);
    }
  }

  function preview(previewRole: Role) {
    setPreviewRole(previewRole);
    router.push(dashboardPathForRole(previewRole));
  }

  if (confirmEmailSentTo) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-brand/15 text-brand">
            <MailCheck className="size-5" />
          </div>
          <CardTitle className="pt-2">Check your email</CardTitle>
          <CardDescription>
            We sent a confirmation link to <span className="font-medium text-foreground">{confirmEmailSentTo}</span>.
            Open it, then sign in to finish setting up your business.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              setConfirmEmailSentTo(null);
              setEmail(confirmEmailSentTo);
              setTab("sign-in");
            }}
          >
            Back to sign in
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tab === "sign-in" ? "Welcome back" : "Create your account"}</CardTitle>
        <CardDescription>
          {tab === "sign-in" ? "Sign in to your retailer or wholesaler workspace." : "Set up your business on StockLume."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isAuthConfigured ? (
          <Alert>
            <AlertTitle>Supabase is not configured</AlertTitle>
            <AlertDescription>
              Add <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
              <code className="font-mono text-xs">apps/web/.env.local</code>, then restart the dev server.
            </AlertDescription>
          </Alert>
        ) : null}

        {status === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>Signed in, but the API could not be reached</AlertTitle>
            <AlertDescription>Check that the StockLume API is running, then reload the page.</AlertDescription>
          </Alert>
        ) : null}

        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value);
            setFormError(null);
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sign-in">Sign in</TabsTrigger>
            <TabsTrigger value="sign-up">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="sign-in" className="pt-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <fieldset disabled={!isAuthConfigured || submitting} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
                <Button type="submit" className="w-full">
                  {submitting ? <Loader2 className="animate-spin" /> : null} Sign in
                </Button>
              </fieldset>
            </form>
          </TabsContent>

          <TabsContent value="sign-up" className="pt-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <fieldset disabled={!isAuthConfigured || submitting} className="space-y-4">
                <RoleChoice value={accountType} onChange={setAccountType} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Your name</Label>
                    <Input id="full-name" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-name">Business name</Label>
                    <Input
                      id="business-name"
                      required
                      autoComplete="organization"
                      placeholder={accountType === "RETAILER" ? "FreshMart Kirana" : "Metro Wholesale Co"}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input id="new-email" type="email" required autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    required
                    minLength={MIN_PASSWORD}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD} characters.</p>
                </div>
                {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
                <Button type="submit" className="w-full">
                  {submitting ? <Loader2 className="animate-spin" /> : null} Create account
                </Button>
              </fieldset>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>

      {isPreviewAllowed ? (
        <CardFooter className="flex-col gap-3">
          <div className="flex w-full items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" /> Developer preview (no login) <Separator className="flex-1" />
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => preview("RETAILER")}>
              <Store /> Retailer UI
            </Button>
            <Button variant="outline" onClick={() => preview("WHOLESALER")}>
              <Building2 /> Wholesaler UI
            </Button>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}
