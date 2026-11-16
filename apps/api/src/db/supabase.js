/**
 * Supabase client used ONLY to verify user access tokens (Supabase Auth).
 * All table reads/writes go through PostgreSQL via ./pool.js — not through
 * the Supabase client — so the SQL stays visible and easy to explain.
 */
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

let supabase;

export function getSupabase() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw ApiError.serviceNotConfigured('Supabase Auth');
  }
  if (!supabase) {
    supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabase;
}

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
