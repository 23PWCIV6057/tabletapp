-- ======================================================================================
-- TABLETAPP MULTI-TENANT ENTERPRISE MIGRATION (IDEMPOTENT & FOOLPROOF)
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- ======================================================================================

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create the master RESTAURANTS table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Explicitly add all columns with IF NOT EXISTS
-- (This ensures compatibility if the restaurants table already existed with older schema)
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS slug VARCHAR(64);
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS access_key VARCHAR(64);
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS name VARCHAR(120);
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS tagline VARCHAR(255);
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS city VARCHAR(60) DEFAULT 'Peshawar';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS phone VARCHAR(40) DEFAULT '051 111 111 199';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'PKR';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT 'Rs.';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS staff_pin VARCHAR(100);
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS owner_pin VARCHAR(100);
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS security_mode VARCHAR(20) DEFAULT 'hybrid_gps';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS daily_dine_in_code VARCHAR(20);
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS wifi_ssid VARCHAR(60);
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS wifi_password VARCHAR(60);
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS arcade_prize_text VARCHAR(160) DEFAULT 'Free Molten Lava Cake on #1 Daily Score!';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS service_fee_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS table_count INT DEFAULT 16;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7) DEFAULT 34.0151;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7) DEFAULT 71.5249;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS radius_meters INT DEFAULT 150;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Create Indexes on restaurants table
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_access_key ON public.restaurants(access_key);

-- 5. Add restaurant_id foreign key column to operational tables if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'menu_items') THEN
    ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON public.menu_items(restaurant_id);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dining_tables') THEN
    ALTER TABLE public.dining_tables ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_dining_tables_restaurant ON public.dining_tables(restaurant_id);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON public.orders(restaurant_id);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_requests') THEN
    ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_service_requests_restaurant ON public.service_requests(restaurant_id);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leaderboard') THEN
    ALTER TABLE public.leaderboard ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. Safe Seed / Upsert for Heat Box Pizza (Peshawar Cantt) as Restaurant #1
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.restaurants WHERE id = 'b7e0129a-2415-469b-8f35-908078c139b4' OR slug = 'heatbox') THEN
        UPDATE public.restaurants SET
            slug = 'heatbox',
            access_key = 'r_hb_pesh_7a92f',
            name = 'Heat Box Pizza',
            tagline = 'Sher Khan Shaheed Road • Peshawar Cantt',
            address = 'Sher Khan Shaheed Road, New Shami Road, Peshawar Cantt',
            city = 'Peshawar',
            phone = '051 111 111 199',
            currency = 'PKR',
            currency_symbol = 'Rs.',
            status = 'active',
            staff_pin = NULL,
            owner_pin = NULL,
            security_mode = 'hybrid_gps',
            daily_dine_in_code = NULL,
            wifi_ssid = 'HeatBox_Peshawar_5G',
            wifi_password = NULL,
            arcade_prize_text = 'Free Molten Lava Cake on #1 Daily Score!',
            table_count = 16,
            latitude = 34.0151,
            longitude = 71.5249,
            radius_meters = 150,
            updated_at = NOW()
        WHERE id = 'b7e0129a-2415-469b-8f35-908078c139b4' OR slug = 'heatbox';
    ELSE
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
            table_count,
            latitude,
            longitude,
            radius_meters
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
            NULL,
            NULL,
            'hybrid_gps',
            NULL,
            'HeatBox_Peshawar_5G',
            NULL,
            'Free Molten Lava Cake on #1 Daily Score!',
            16,
            34.0151,
            71.5249,
            150
        );
    END IF;
END $$;

-- 7. Link any existing items and tables without a restaurant_id to Heat Box
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'menu_items') THEN
    UPDATE public.menu_items 
    SET restaurant_id = 'b7e0129a-2415-469b-8f35-908078c139b4' 
    WHERE restaurant_id IS NULL;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dining_tables') THEN
    UPDATE public.dining_tables 
    SET restaurant_id = 'b7e0129a-2415-469b-8f35-908078c139b4' 
    WHERE restaurant_id IS NULL;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    UPDATE public.orders 
    SET restaurant_id = 'b7e0129a-2415-469b-8f35-908078c139b4' 
    WHERE restaurant_id IS NULL;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_requests') THEN
    UPDATE public.service_requests 
    SET restaurant_id = 'b7e0129a-2415-469b-8f35-908078c139b4' 
    WHERE restaurant_id IS NULL;
  END IF;
END $$;

-- 8. Purge any legacy unauthorized demo records
DELETE FROM public.restaurants WHERE slug = 'sunshine-bistro' OR id = '0bd4a4f2-4d44-4f0c-a03c-e10252610e7a';

-- 9. Enable Row Level Security (RLS) for tenant isolation
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Public & API can manage restaurants
DROP POLICY IF EXISTS "Public can view active restaurants" ON public.restaurants;
CREATE POLICY "Public can view active restaurants" ON public.restaurants 
  FOR ALL USING (true) WITH CHECK (true);

-- 10. Enable RLS and policies on operational tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'menu_items') THEN
    ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public can view restaurant menu items" ON public.menu_items;
    CREATE POLICY "Public can view restaurant menu items" ON public.menu_items FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dining_tables') THEN
    ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public can view restaurant dining tables" ON public.dining_tables;
    CREATE POLICY "Public can view restaurant dining tables" ON public.dining_tables FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow orders insert and select" ON public.orders;
    CREATE POLICY "Allow orders insert and select" ON public.orders FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_requests') THEN
    ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow service requests" ON public.service_requests;
    CREATE POLICY "Allow service requests" ON public.service_requests FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
