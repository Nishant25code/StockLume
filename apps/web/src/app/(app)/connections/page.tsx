"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Handshake,
  Search,
  Check,
  X,
  UserPlus,
  RefreshCw,
  Building2,
  Store,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useSession } from "@/providers/session-provider";
import type { Connection, BusinessPartner } from "@/types";

export default function ConnectionsPage() {
  const { role, isPreview } = useSession();

  const [activeTab, setActiveTab] = useState("my-connections");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [discoverList, setDiscoverList] = useState<BusinessPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);

  const [discoverSearch, setDiscoverSearch] = useState("");
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Connection[]>("/connections");
      setConnections(data || []);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err);
      } else {
        setError(new ApiClientError("Failed to load connections", "UNKNOWN_ERROR", 500));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDiscover = useCallback(async () => {
    setDiscoverLoading(true);
    try {
      const data = await apiClient.get<BusinessPartner[]>("/connections/discover", {
        query: { search: discoverSearch.trim() || undefined },
      });
      setDiscoverList(data || []);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Failed to search partners";
      toast.error(message);
    } finally {
      setDiscoverLoading(false);
    }
  }, [discoverSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    if (activeTab === "discover") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDiscover();
    }
  }, [activeTab, fetchDiscover]);

  async function handleConnect(partnerId: string) {
    setConnectingId(partnerId);
    try {
      await apiClient.post("/connections", { partnerId, status: "ACTIVE" });
      toast.success("Connection established successfully");
      fetchConnections();
      fetchDiscover();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Failed to establish connection";
      toast.error(message);
    } finally {
      setConnectingId(null);
    }
  }

  async function handleStatusChange(connectionId: string, newStatus: "ACTIVE" | "INACTIVE") {
    setUpdatingId(connectionId);
    try {
      await apiClient.patch(`/connections/${connectionId}`, { status: newStatus });
      toast.success(`Connection status updated to ${newStatus}`);
      fetchConnections();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Failed to update connection";
      toast.error(message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <RoleGuard allow={["RETAILER", "WHOLESALER"]}>
      <div className="space-y-6">
        <PageHeader
          title="Business Connections"
          description={
            role === "WHOLESALER"
              ? "Manage your connected retailers, incoming requests, and discover stores in your region."
              : "Manage your wholesale suppliers, browse available partners, and expand your catalog reach."
          }
        />

        {isPreview && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Developer Preview Mode</AlertTitle>
            <AlertDescription>
              Preview mode displays the UI layouts. Live API calls verify an authenticated Supabase user profile.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="my-connections" className="gap-1.5">
              <Handshake className="size-4" /> My Connections ({connections.length})
            </TabsTrigger>
            <TabsTrigger value="discover" className="gap-1.5">
              <UserPlus className="size-4" /> Discover Partners
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Existing Connections */}
          <TabsContent value="my-connections" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={fetchConnections}>
                <RefreshCw className="size-3.5" /> Refresh List
              </Button>
            </div>

            {loading ? (
              <LoadingState label="Loading your business network..." />
            ) : error ? (
              <ErrorState
                title="Could not load connections"
                message={error.message}
                code={error.code}
                onRetry={fetchConnections}
              />
            ) : connections.length === 0 ? (
              <EmptyState
                icon={Handshake}
                title="No active connections yet"
                description={
                  role === "WHOLESALER"
                    ? "You do not have any connected retailers yet. Check 'Discover Partners' to find retailers."
                    : "Connect with wholesale suppliers to access their products and place restock orders."
                }
                action={
                  <Button onClick={() => setActiveTab("discover")}>
                    <UserPlus className="size-4" /> Discover Partners
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            {conn.partner.type === "WHOLESALER" ? (
                              <Building2 className="size-5 text-brand" />
                            ) : (
                              <Store className="size-5 text-brand" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm leading-tight">{conn.partner.name}</h3>
                            <p className="text-xs text-muted-foreground">{conn.partner.type}</p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            conn.status === "ACTIVE"
                              ? "default"
                              : conn.status === "PENDING"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {conn.status}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground pt-1">
                        {conn.partner.city && (
                          <p className="flex items-center gap-1.5">
                            <MapPin className="size-3.5 shrink-0" /> {conn.partner.city}
                          </p>
                        )}
                        {conn.partner.phone && (
                          <p className="flex items-center gap-1.5">
                            <Phone className="size-3.5 shrink-0" /> {conn.partner.phone}
                          </p>
                        )}
                        {conn.partner.email && (
                          <p className="flex items-center gap-1.5">
                            <Mail className="size-3.5 shrink-0 truncate" /> {conn.partner.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t flex justify-end gap-2">
                      {conn.status === "PENDING" && role === "WHOLESALER" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(conn.id, "ACTIVE")}
                          disabled={updatingId === conn.id}
                        >
                          <Check className="size-3.5" /> Accept Request
                        </Button>
                      )}
                      {conn.status === "ACTIVE" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-danger"
                          onClick={() => handleStatusChange(conn.id, "INACTIVE")}
                          disabled={updatingId === conn.id}
                        >
                          <X className="size-3.5" /> Disconnect
                        </Button>
                      )}
                      {conn.status === "INACTIVE" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(conn.id, "ACTIVE")}
                          disabled={updatingId === conn.id}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Discover Partners */}
          <TabsContent value="discover" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={`Search ${role === "RETAILER" ? "wholesalers" : "retailers"} by name or city...`}
                  value={discoverSearch}
                  onChange={(e) => setDiscoverSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchDiscover}>
                <RefreshCw className="size-3.5" /> Refresh
              </Button>
            </div>

            {discoverLoading ? (
              <LoadingState label="Searching for prospective partners..." />
            ) : discoverList.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No new partners found"
                description={`All available ${role === "RETAILER" ? "wholesalers" : "retailers"} are already in your connections network or match no search results.`}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {discoverList.map((partner) => (
                  <div
                    key={partner.id}
                    className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          {partner.type === "WHOLESALER" ? (
                            <Building2 className="size-5 text-brand" />
                          ) : (
                            <Store className="size-5 text-brand" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm leading-tight">{partner.name}</h3>
                          <Badge variant="outline" className="text-xs font-normal mt-0.5">
                            {partner.type}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground pt-1">
                        {partner.city && (
                          <p className="flex items-center gap-1.5">
                            <MapPin className="size-3.5 shrink-0" /> {partner.city}
                          </p>
                        )}
                        {partner.phone && (
                          <p className="flex items-center gap-1.5">
                            <Phone className="size-3.5 shrink-0" /> {partner.phone}
                          </p>
                        )}
                        {partner.email && (
                          <p className="flex items-center gap-1.5">
                            <Mail className="size-3.5 shrink-0 truncate" /> {partner.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleConnect(partner.id)}
                        disabled={connectingId === partner.id}
                      >
                        <UserPlus className="size-3.5" />
                        {connectingId === partner.id ? "Connecting..." : "Connect"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}
