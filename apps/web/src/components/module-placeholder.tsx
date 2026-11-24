import { GitBranch, PlugZap, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TEAM_MODULES, type ModuleKey } from "@/lib/modules";

interface ModulePlaceholderProps {
  module: ModuleKey;
  /** What this page will let users do. */
  features: string[];
  /** API endpoints this page will call (see docs/API.md). */
  endpoints: string[];
}

/**
 * Foundation placeholder: tells the team who builds this page and what it will
 * contain. Replace it with the real UI in your feature branch.
 */
export function ModulePlaceholder({ module, features, endpoints }: ModulePlaceholderProps) {
  const owner = TEAM_MODULES[module];

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-lume opacity-70" aria-hidden />
      <CardHeader className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <UserRound className="size-3" /> {owner.member}
          </Badge>
          <Badge variant="outline" className="gap-1 font-mono">
            <GitBranch className="size-3" /> {owner.branch}
          </Badge>
        </div>
        <CardTitle className="pt-2">{owner.name}</CardTitle>
        <CardDescription>Placeholder — this page is built in the module&apos;s feature branch.</CardDescription>
      </CardHeader>
      <CardContent className="relative grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Planned features</p>
          <ul className="space-y-1.5 text-sm">
            {features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <PlugZap className="size-3.5" /> API endpoints
          </p>
          <ul className="space-y-1 font-mono text-xs">
            {endpoints.map((endpoint) => (
              <li key={endpoint} className="truncate rounded-md bg-muted/70 px-2 py-1" title={endpoint}>
                {endpoint}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
