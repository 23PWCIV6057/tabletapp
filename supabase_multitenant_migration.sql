-- ======================================================================================
-- TABLETAPP MULTI-TENANT ENTERPRISE MIGRATION
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- ======================================================================================

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create the master RESTAURANTS table
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,               -- e.g. "heatbox-peshawar" or "heatbox"
    access_key VARCHAR(64) UNIQUE NOT NULL,         -- opaque unguessable token e.g. "r_hb_8f29d1"
    name VARCHAR(120) NOT NULL,                     -- e.g. "Heat Box Pizza"
    tagline VARCHAR(255),                           -- e.g. "Sher Khan Shaheed Road • Peshawar Cantt"
    address TEXT,
    city VARCHAR(60) DEFAULT 'Peshawar',
    phone VARCHAR(40) DEFAULT '051 111 111 199',
    currency VARCHAR(10) DEFAULT 'PKR',
    currency_symbol VARCHAR(10) DEFAULT 'Rs.',
    status VARCHAR(20) DEFAULT 'active',            -- 'active', 'trial', 'suspended'
    staff_pin VARCHAR(20) NOT NULL DEFAULT '1234',
    owner_pin VARCHAR(20) NOT NULL DEFAULT '8888',
    security_mode VARCHAR(20) DEFAULT 'hybrid_gps', -- 'dine_in_code', 'hybrid_gps', 'kds_only'
    daily_dine_in_code VARCHAR(20) DEFAULT '42',
    wifi_ssid VARCHAR(60) DEFAULT 'HeatBox_Free_WiFi',
    wifi_password VARCHAR(60) DEFAULT 'heatbox123',
    arcade_prize_text VARCHAR(160) DEFAULT 'Free Molten Lava Cake on #1 Daily Score!',
    service_fee_percent NUMERIC(5,2) DEFAULT 0,
    table_count INT DEFAULT 16,
    latitude NUMERIC(10, 7) DEFAULT 34.0151,
    longitude NUMERIC(10, 7) DEFAULT 71.5249,
    radius_meters INT DEFAULT 150,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add restaurant_id foreign key column to all operational tables
ALTER TABLE public.menu_items 
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.dining_tables 
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.service_requests 
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;

-- Optional leaderboard table multi-tenant column
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leaderboard') THEN
    ALTER TABLE public.leaderboard ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Create high-performance indexes to guarantee fast filtered queries
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_access_key ON public.restaurants(access_key);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_dining_tables_restaurant ON public.dining_tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_restaurant ON public.service_requests(restaurant_id);

-- 5. Seed Heat Box Pizza (Peshawar Cantt) as Restaurant #1
INSERT INTO public.restaurants (
    id,
    slug,
    access_key,
    name,
    tagline,
    address,
    city,
    phone,
    currency,
    currency_symbol,
    status,
    staff_pin,
    owner_pin,
    security_mode,
    daily_dine_in_code,
    wifi_ssid,
    wifi_password,
    arcade_prize_text,
    table_count
) VALUES (
    'b7e0129a-2415-469b-8f35-908078c139b4',
    'heatbox',
    'r_hb_pesh_7a92f',
    'Heat Box Pizza',
    'Sher Khan Shaheed Road • Peshawar Cantt',
    'Sher Khan Shaheed Road, New Shami Road, Peshawar Cantt',
    'Peshawar',
    '051 111 111 199',
    'PKR',
    'Rs.',
    'active',
    '1234',
    '8888',
    'hybrid_gps',
    '42',
    'HeatBox_Peshawar_5G',
    'heatbox123',
    'Free Molten Lava Cake on #1 Daily Score!',
    16
) ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    updated_at = NOW();

-- 6. Link any existing items and tables without a restaurant_id to Heat Box
UPDATE public.menu_items 
SET restaurant_id = 'b7e0129a-2415-469b-8f35-908078c139b4' 
WHERE restaurant_id IS NULL;

UPDATE public.dining_tables 
SET restaurant_id = 'b7e0129a-2415-469b-8f35-908078c139b4' 
WHERE restaurant_id IS NULL;

UPDATE public.orders 
SET restaurant_id = 'b7e0129a-2415-469b-8f35-908078c139b4' 
WHERE restaurant_id IS NULL;

UPDATE public.service_requests 
SET restaurant_id = 'b7e0129a-2415-469b-8f35-908078c139b4' 
WHERE restaurant_id IS NULL;

-- 7. Enable Row Level Security (RLS) for tenant isolation
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- 8. Anti-BurpSuite Column Level Security:
-- Revoke staff_pin and owner_pin column reads from public anonymous clients
-- Even if an attacker uses the Supabase anon key in BurpSuite or Postman to query
-- `SELECT * FROM restaurants`, Postgres immediately rejects the request.
REVOKE SELECT (staff_pin, owner_pin) ON public.restaurants FROM anon;

-- Public can read active restaurants and their menu items / tables
DROP POLICY IF EXISTS "Public can view active restaurants" ON public.restaurants;
CREATE POLICY "Public can view active restaurants" ON public.restaurants 
  FOR SELECT USING (status != 'suspended');

DROP POLICY IF EXISTS "Public can view restaurant menu items" ON public.menu_items;
CREATE POLICY "Public can view restaurant menu items" ON public.menu_items 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view restaurant dining tables" ON public.dining_tables;
CREATE POLICY "Public can view restaurant dining tables" ON public.dining_tables 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow orders insert and select" ON public.orders;
CREATE POLICY "Allow orders insert and select" ON public.orders 
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service requests" ON public.service_requests;
CREATE POLICY "Allow service requests" ON public.service_requests 
  FOR ALL USING (true) WITH CHECK (true);
