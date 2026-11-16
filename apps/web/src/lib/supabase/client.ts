"use client";

/**
 * Browser Supabase client — used ONLY for authentication (sign up, sign in,
 * sign out, reading the session). All business data goes through the Express
 * API via `apiClient` (see lib/api-client.ts).
 *
 * OWNER: Member 1 (Auth).
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

let client: SupabaseClient | null = null;

/** Returns null until NEXT_PUBLIC_SUPABASE_URL / ANON_KEY are set. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  }
  return client;
}

/** Current access token (JWT) to send to the Express API, or null. */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
