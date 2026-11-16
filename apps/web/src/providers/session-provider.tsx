"use client";

/**
 * Session + role context for the whole app.
 *
 * TODAY (foundation): Supabase Auth is not wired yet, so developers can pick a
 * "preview role" on the login page to explore the retailer/wholesaler UI.
 * The preview role lives in localStorage and is clearly labelled in the header.
 *
 * TODO(Member 1): when auth is implemented —
 *   1. On load, read the Supabase session (getSupabaseBrowserClient().auth.getSession()).
 *   2. If signed in, call apiClient.get<CurrentUser>("/auth/me") and store the user.
 *   3. Subscribe to supabase.auth.onAuthStateChange to keep this in sync.
 *   4. Remove preview mode (or keep it only when NODE_ENV === "development").
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CurrentUser, Role } from "@/types";

type SessionStatus = "loading" | "authenticated" | "preview" | "signed-out";

interface SessionContextValue {
  status: SessionStatus;
  user: CurrentUser | null;
  role: Role | null;
  isPreview: boolean;
  setPreviewRole: (role: Role | null) => void;
}

const PREVIEW_ROLE_KEY = "stocklume.previewRole";
const SessionContext = createContext<SessionContextValue | null>(null);

function readPreviewRole(): Role | null {
  try {
    const value = window.localStorage.getItem(PREVIEW_ROLE_KEY);
    return value === "RETAILER" || value === "WHOLESALER" ? value : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [previewRole, setPreviewRoleState] = useState<Role | null>(null);
  const [user] = useState<CurrentUser | null>(null); // TODO(Member 1): real user from /auth/me

  useEffect(() => {
    // Runs once in the browser (localStorage is not available on the server).
    const role = readPreviewRole();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setPreviewRoleState(role);
    setStatus(role ? "preview" : "signed-out");
  }, []);

  const setPreviewRole = useCallback((role: Role | null) => {
    try {
      if (role) window.localStorage.setItem(PREVIEW_ROLE_KEY, role);
      else window.localStorage.removeItem(PREVIEW_ROLE_KEY);
    } catch {
      // Storage can be unavailable (private mode) — the in-memory state still works.
    }
    setPreviewRoleState(role);
    setStatus(role ? "preview" : "signed-out");
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      role: user?.role ?? previewRole,
      isPreview: status === "preview",
      setPreviewRole,
    }),
    [status, user, previewRole, setPreviewRole],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside <SessionProvider>");
  return context;
}
