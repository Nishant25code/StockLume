/**
 * Public (browser-safe) environment variables. Only NEXT_PUBLIC_* values can be
 * read in the browser, and they must be referenced literally so Next.js can
 * inline them at build time.
 */
export const publicEnv = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export const isSupabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);

/**
 * The "developer preview" (pick a role without logging in) is for building UI
 * before Supabase is set up. It is hidden in production once Supabase is configured.
 */
export const isPreviewAllowed = process.env.NODE_ENV !== "production" || !isSupabaseConfigured;
