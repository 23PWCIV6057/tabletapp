-- ==============================================================================
-- TableTapp Production Zero-Trust RLS Policies & Column-Level Hardening
-- ==============================================================================
-- Resolves all findings and directives in SECURITY-AUDIT.md:
-- 1. Guest order history: Operational orders access revoked from anon
-- 2. Order integrity: Server-only insertion, verification, and calculation
-- 3. Credential removal: Column-level protection for sensitive fields
-- 4. QR and table-token protection: qr_code_token revoked from anon
-- 5. Leaderboard integrity: Verified submissions via server routes only
-- 6. Zero anonymous mutation or cross-tenant exposure
-- ==============================================================================

-- 1. DROP ALL INSECURE / PERMISSIVE POLICIES
DROP POLICY IF EXISTS "Public Read Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Insert Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Select Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Update Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Delete Orders" ON public.orders;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.orders;

DROP POLICY IF EXISTS "Public Read Service Requests" ON public.service_requests;
DROP POLICY IF EXISTS "Public Insert Service Requests" ON public.service_requests;
DROP POLICY IF EXISTS "Public Select Service Requests" ON public.service_requests;
DROP POLICY IF EXISTS "Public Update Service Requests" ON public.service_requests;
DROP POLICY IF EXISTS "Public Delete Service Requests" ON public.service_requests;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.service_requests;

DROP POLICY IF EXISTS "Public Read Dining Tables" ON public.dining_tables;
DROP POLICY IF EXISTS "Public Update Dining Tables" ON public.dining_tables;
DROP POLICY IF EXISTS "Public Insert Dining Tables" ON public.dining_tables;
DROP POLICY IF EXISTS "Public Delete Dining Tables" ON public.dining_tables;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.dining_tables;
DROP POLICY IF EXISTS "Public Read Active Tables Only" ON public.dining_tables;

DROP POLICY IF EXISTS "Public Read Menu Items" ON public.menu_items;
DROP POLICY IF EXISTS "Public Update Menu Items" ON public.menu_items;
DROP POLICY IF EXISTS "Public Insert Menu Items" ON public.menu_items;
DROP POLICY IF EXISTS "Public Delete Menu Items" ON public.menu_items;
DROP POLICY IF EXISTS "Public Read Active Menu" ON public.menu_items;

DROP POLICY IF EXISTS "Public Read Restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Public Manage Restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Public Update Restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Public Read Active Tenants" ON public.restaurants;

DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
DROP POLICY IF EXISTS "Public Manage Categories" ON public.categories;
DROP POLICY IF EXISTS "Public Read Active Categories" ON public.categories;

DROP POLICY IF EXISTS "Public Read Leaderboard" ON public.arcade_leaderboard;
DROP POLICY IF EXISTS "Public Insert Leaderboard" ON public.arcade_leaderboard;
DROP POLICY IF EXISTS "Public Reset Leaderboard" ON public.arcade_leaderboard;
DROP POLICY IF EXISTS "Public Delete Leaderboard" ON public.arcade_leaderboard;
DROP POLICY IF EXISTS "Public Read Arcade High Scores" ON public.arcade_leaderboard;
DROP POLICY IF EXISTS "Public Insert High Scores" ON public.arcade_leaderboard;

-- 2. ORDERS & ORDER ITEMS: ZERO-TRUST DENY-BY-DEFAULT FOR ANONYMOUS
-- Operational orders are strictly mediated server-side via Next.js route handlers.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.orders FROM anon, public;
REVOKE ALL ON public.order_items FROM anon, public;

GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;

-- 3. SERVICE REQUESTS: ZERO-TRUST DENY-BY-DEFAULT FOR ANONYMOUS
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.service_requests FROM anon, public;

GRANT ALL ON public.service_requests TO service_role;

-- 4. DINING TABLES: PROTECT QR TOKEN REGISTRY (Directive 4)
-- qr_code_token is NEVER exposed to anon; tokens are resolved strictly server-side.
ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.dining_tables FROM anon, public;

-- Allow anon to see only table_number and active status (no tokens, no secrets)
GRANT SELECT (id, restaurant_id, table_number, is_active) ON public.dining_tables TO anon, authenticated;
GRANT ALL ON public.dining_tables TO service_role;

DROP POLICY IF EXISTS "Public Read Active Tables Minimal" ON public.dining_tables;

-- 5. RESTAURANTS: COLUMN-LEVEL SENSITIVE FIELD REDACTION (Directive 3)
-- staff_pin, owner_pin, access_key, and wifi_password are NOT granted to anon.
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.restaurants FROM anon, public;

GRANT SELECT (
  id, name, slug, tagline, address, city, phone, currency, currency_symbol,
  status, is_active, security_mode, table_count, latitude, longitude, radius_meters
) ON public.restaurants TO anon, authenticated;

GRANT ALL ON public.restaurants TO service_role;

DROP POLICY IF EXISTS "Public Read Active Tenants Safe Columns" ON public.restaurants;

-- 6. MENU ITEMS & CATEGORIES: PUBLIC READ-ONLY
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.menu_items FROM anon, public;
REVOKE ALL ON public.categories FROM anon, public;

GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;

GRANT ALL ON public.menu_items TO service_role;
GRANT ALL ON public.categories TO service_role;

DROP POLICY IF EXISTS "Public Read Active Menu Items" ON public.menu_items;
DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;

-- 7. ARCADE LEADERBOARD: INDEPENDENT TABLE & SECURE ACCESS (Directive 5)
CREATE TABLE IF NOT EXISTS public.arcade_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  table_number INTEGER,
  game TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_arcade_leaderboard_restaurant_score
  ON public.arcade_leaderboard(restaurant_id, score DESC);

ALTER TABLE public.arcade_leaderboard ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.arcade_leaderboard FROM anon, public;

-- Allow public read of top high scores
GRANT SELECT ON public.arcade_leaderboard TO anon, authenticated;
GRANT ALL ON public.arcade_leaderboard TO service_role;

CREATE POLICY "Public Read Arcade High Scores"
  ON public.arcade_leaderboard
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Score submissions and resets are performed via server route /api/restaurants/[slug]/leaderboard.

-- 8. REALTIME REPLICATION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'arcade_leaderboard'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arcade_leaderboard;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
