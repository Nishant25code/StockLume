"use client";

/**
 * Session + role context for the whole app (Supabase Auth).
 *
 *   const { status, user, role, signIn, signUp, signOut, register } = useSession();
 *
 * status:
 *   loading      → checking for a saved session
 *   authenticated→ signed in and registered (user.role is RETAILER/WHOLESALER)
 *   onboarding   → signed in to Supabase but no business yet → /onboarding
 *   preview      → developer preview role (no login; API calls return 401)
 *   signed-out   → no session
 *   error        → signed in, but the API could not be reached (retry with refresh())
 *
 * Passwords never touch our API: Supabase Auth handles them and gives the
 * browser an access token, which apiClient sends as "Authorization: Bearer …".
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { apiClient } from "@/lib/api-client";
import { isPreviewAllowed } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CurrentUser, RegisterPayload, Role } from "@/types";

export type SessionStatus = "loading" | "authenticated" | "onboarding" | "preview" | "signed-out" | "error";

export interface SignUpInput extends RegisterPayload {
  email: string;
  password: string;
}

export interface SignUpResult {
  /** false when Supabase requires email confirmation before the first sign-in */
  signedIn: boolean;
}

interface SessionContextValue {
  status: SessionStatus;
  user: CurrentUser | null;
  /** The Supabase account (email, metadata saved at sign-up). */
  authUser: User | null;
  role: Role | null;
  isPreview: boolean;
  error: string | null;
  isAuthConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  register: (payload: RegisterPayload) => Promise<CurrentUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setPreviewRole: (role: Role | null) => void;
}

const PREVIEW_ROLE_KEY = "stocklume.previewRole";
const SessionContext = createContext<SessionContextValue | null>(null);

function readPreviewRole(): Role | null {
  if (!isPreviewAllowed) return null;
  try {
    const value = window.localStorage.getItem(PREVIEW_ROLE_KEY);
    return value === "RETAILER" || value === "WHOLESALER" ? value : null;
  } catch {
    return null;
  }
}

function writePreviewRole(role: Role | null) {
  try {
    if (role) window.localStorage.setItem(PREVIEW_ROLE_KEY, role);
    else window.localStorage.removeItem(PREVIEW_ROLE_KEY);
  } catch {
    // Storage can be unavailable (private mode) — in-memory state still works.
  }
}

function messageOf(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [previewRole, setPreviewRoleState] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasSession = useRef(false);
  // Only the newest /auth/me or /auth/register result may update state (avoids races on sign-up).
  const latestRequest = useRef(0);

  const showSignedOut = useCallback(() => {
    hasSession.current = false;
    setUser(null);
    setAuthUser(null);
    const role = readPreviewRole();
    setPreviewRoleState(role);
    setStatus(role ? "preview" : "signed-out");
  }, []);

  /** Loads GET /auth/me for the current Supabase session. */
  const loadUser = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      setError(null);
      const me = await apiClient.get<CurrentUser>("/auth/me");
      if (requestId !== latestRequest.current) return;
      setUser(me);
      setStatus(me.needsOnboarding ? "onboarding" : "authenticated");
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setUser(null);
      setError(messageOf(err, "Could not load your account"));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      // Supabase not configured yet → only the developer preview is possible.
      const role = readPreviewRole();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
      setPreviewRoleState(role);
      setStatus(role ? "preview" : "signed-out");
      return;
    }

    // Fires once immediately (INITIAL_SESSION) and again on sign-in / sign-out / refresh.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        showSignedOut();
        return;
      }
      setAuthUser(session.user);
      const isNewSession = !hasSession.current;
      hasSession.current = true;
      if (isNewSession || event === "USER_UPDATED") {
        writePreviewRole(null);
        setPreviewRoleState(null);
        setStatus("loading");
        // Supabase recommends not calling its client inside this callback → defer.
        setTimeout(() => void loadUser(), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [supabase, loadUser, showSignedOut]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(signInError.message);
    },
    [supabase],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    ++latestRequest.current; // any /auth/me still in flight is now stale
    const me = await apiClient.post<CurrentUser>("/auth/register", payload);
    setUser(me);
    setStatus("authenticated");
    return me;
  }, []);

  const signUp = useCallback(
    async ({ email, password, ...business }: SignUpInput): Promise<SignUpResult> => {
      if (!supabase) throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Saved on the Supabase user so /onboarding can prefill if email confirmation is on.
          data: {
            full_name: business.fullName,
            business_name: business.businessName,
            business_type: business.businessType,
            city: business.city ?? null,
            phone: business.phone ?? null,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (signUpError) throw new Error(signUpError.message);
      if (!data.session) return { signedIn: false }; // confirmation email sent
      await register(business);
      return { signedIn: true };
    },
    [supabase, register],
  );

  const signOut = useCallback(async () => {
    writePreviewRole(null);
    if (supabase) await supabase.auth.signOut();
    hasSession.current = false;
    setUser(null);
    setAuthUser(null);
    setPreviewRoleState(null);
    setStatus("signed-out");
  }, [supabase]);

  const setPreviewRole = useCallback((role: Role | null) => {
    if (!isPreviewAllowed) return;
    writePreviewRole(role);
    setPreviewRoleState(role);
    setStatus(role ? "preview" : "signed-out");
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      authUser,
      role: user?.role ?? (status === "preview" ? previewRole : null),
      isPreview: status === "preview",
      error,
      isAuthConfigured: Boolean(supabase),
      signIn,
      signUp,
      register,
      signOut,
      refresh: loadUser,
      setPreviewRole,
    }),
    [status, user, authUser, previewRole, error, supabase, signIn, signUp, register, signOut, loadUser, setPreviewRole],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside <SessionProvider>");
  return context;
}
