-- ======================================================================================
-- TABLETAPP: SUPABASE DATABASE FULL FUNCTIONALITY RESTORATION (IDEMPOTENT & SAFE)
-- Restores complete table grants and clean RLS policies for 100% reliable real-time sync
-- ======================================================================================

-- 1. Ensure Schema Usage for all application roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Grant Table & Sequence Permissions to Anon, Authenticated, and Service Role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 3. Clean and Functional RLS Policies for orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_all_access" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous update" ON public.orders;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_policy" ON public.orders;

CREATE POLICY "orders_select_policy" ON public.orders FOR SELECT USING (true);
CREATE POLICY "orders_insert_policy" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_update_policy" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "orders_delete_policy" ON public.orders FOR DELETE USING (true);

-- 4. Clean and Functional RLS Policies for order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items_all_access" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_delete_policy" ON public.order_items;

CREATE POLICY "order_items_select_policy" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "order_items_insert_policy" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_update_policy" ON public.order_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "order_items_delete_policy" ON public.order_items FOR DELETE USING (true);

-- 5. Clean and Functional RLS Policies for service_requests
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_requests_all_access" ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_select_policy" ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_insert_policy" ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_update_policy" ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_delete_policy" ON public.service_requests;

CREATE POLICY "service_requests_select_policy" ON public.service_requests FOR SELECT USING (true);
CREATE POLICY "service_requests_insert_policy" ON public.service_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "service_requests_update_policy" ON public.service_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "service_requests_delete_policy" ON public.service_requests FOR DELETE USING (true);

-- 6. Clean and Functional RLS Policies for arcade_leaderboard
ALTER TABLE public.arcade_leaderboard ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "arcade_leaderboard_all_access" ON public.arcade_leaderboard;
DROP POLICY IF EXISTS "arcade_leaderboard_select_policy" ON public.arcade_leaderboard;
DROP POLICY IF EXISTS "arcade_leaderboard_insert_policy" ON public.arcade_leaderboard;
DROP POLICY IF EXISTS "arcade_leaderboard_update_policy" ON public.arcade_leaderboard;
DROP POLICY IF EXISTS "arcade_leaderboard_delete_policy" ON public.arcade_leaderboard;

CREATE POLICY "arcade_leaderboard_select_policy" ON public.arcade_leaderboard FOR SELECT USING (true);
CREATE POLICY "arcade_leaderboard_insert_policy" ON public.arcade_leaderboard FOR INSERT WITH CHECK (true);
CREATE POLICY "arcade_leaderboard_update_policy" ON public.arcade_leaderboard FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "arcade_leaderboard_delete_policy" ON public.arcade_leaderboard FOR DELETE USING (true);

-- 7. Clean and Functional RLS Policies for menu_items, categories, modifiers, tables & sessions
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menu_items_select_policy" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_insert_policy" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_update_policy" ON public.menu_items;

CREATE POLICY "menu_items_select_policy" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "menu_items_insert_policy" ON public.menu_items FOR INSERT WITH CHECK (true);
CREATE POLICY "menu_items_update_policy" ON public.menu_items FOR UPDATE USING (true) WITH CHECK (true);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;
CREATE POLICY "categories_select_policy" ON public.categories FOR SELECT USING (true);

ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "table_sessions_select_policy" ON public.table_sessions;
DROP POLICY IF EXISTS "table_sessions_insert_policy" ON public.table_sessions;
DROP POLICY IF EXISTS "table_sessions_update_policy" ON public.table_sessions;

CREATE POLICY "table_sessions_select_policy" ON public.table_sessions FOR SELECT USING (true);
CREATE POLICY "table_sessions_insert_policy" ON public.table_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "table_sessions_update_policy" ON public.table_sessions FOR UPDATE USING (true) WITH CHECK (true);

ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dining_tables_select_policy" ON public.dining_tables;
DROP POLICY IF EXISTS "dining_tables_update_policy" ON public.dining_tables;

CREATE POLICY "dining_tables_select_policy" ON public.dining_tables FOR SELECT USING (true);
CREATE POLICY "dining_tables_update_policy" ON public.dining_tables FOR UPDATE USING (true) WITH CHECK (true);

-- 8. Safe Idempotent Publication Check for Supabase Realtime CDC
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['orders', 'order_items', 'service_requests', 'arcade_leaderboard', 'menu_items'])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    END IF;
  END LOOP;
END $$;
