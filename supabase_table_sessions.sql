-- Server-backed table occupancy state.
-- Run this once in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.table_sessions (
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL CHECK (table_number > 0),
  status TEXT NOT NULL CHECK (status IN ('VACANT', 'SEATED', 'ACTIVE_ORDER', 'SERVED', 'BILL_REQUESTED')),
  seated_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_table_sessions_restaurant
  ON public.table_sessions (restaurant_id, table_number);

ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.table_sessions FROM anon, authenticated, public;
GRANT ALL ON public.table_sessions TO service_role;

INSERT INTO public.table_sessions (restaurant_id, table_number, status)
SELECT r.id, numbers.table_number, 'VACANT'
FROM public.restaurants r
CROSS JOIN generate_series(1, COALESCE(r.table_count, 16)) AS numbers(table_number)
ON CONFLICT (restaurant_id, table_number) DO NOTHING;
