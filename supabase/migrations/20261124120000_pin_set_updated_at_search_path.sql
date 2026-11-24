-- ═══════════════════════════════════════════════════════════════════════════
-- Pin the search_path of set_updated_at() (Supabase security advisor:
-- "Function Search Path Mutable"). An empty search_path means the function
-- can never pick up a same-named object from another schema. The function
-- only uses NEW and now() (pg_catalog is always searched), so behaviour is
-- unchanged.
-- ═══════════════════════════════════════════════════════════════════════════

alter function public.set_updated_at() set search_path = '';
