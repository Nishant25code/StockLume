"use client";

/**
 * Login placeholder.
 * TODO(Member 1): replace the disabled form with Supabase Auth sign-in/sign-up:
 *   const supabase = getSupabaseBrowserClient();
 *   await supabase.auth.signInWithPassword({ email, password });
 * then load the role from GET /api/auth/me and redirect to the role dashboard.
 * New users also choose Retailer/Wholesaler and call POST /api/auth/register.
 */
import { useRouter } from "next/navigation";
import { Building2, Store } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { dashboardPathForRole } from "@/lib/navigation";
import { useSession } from "@/providers/session-provider";
import type { Role } from "@/types";

export function LoginPanel() {
  const router = useRouter();
  const { setPreviewRole } = useSession();

  function preview(role: Role) {
    setPreviewRole(role);
    router.push(dashboardPathForRole(role));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in as a retailer or wholesaler.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert>
          <AlertTitle>Authentication not wired yet</AlertTitle>
          <AlertDescription>Supabase sign-in is built by Member 1 on feature/auth-products.</AlertDescription>
        </Alert>

        <fieldset disabled className="space-y-4 opacity-60">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@business.com" autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" />
          </div>
          <Button className="w-full">Sign in</Button>
        </fieldset>
      </CardContent>
      <CardFooter className="flex-col gap-3">
        <div className="flex w-full items-center gap-3 text-xs text-muted-foreground">
          <Separator className="flex-1" /> Developer preview <Separator className="flex-1" />
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
    </Card>
  );
}
