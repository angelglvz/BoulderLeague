-- Migrar start_date y end_date de DATE NOT NULL a TIMESTAMPTZ nullable
-- para soportar fecha + hora en las liguillas

-- 1. Quitar restricción NOT NULL
ALTER TABLE public.leagues
  ALTER COLUMN start_date DROP NOT NULL;

ALTER TABLE public.leagues
  ALTER COLUMN end_date DROP NOT NULL;

-- 2. Cambiar tipo a TIMESTAMPTZ (la conversión de DATE a TIMESTAMPTZ es directa)
ALTER TABLE public.leagues
  ALTER COLUMN start_date TYPE timestamptz
  USING start_date::timestamptz;

ALTER TABLE public.leagues
  ALTER COLUMN end_date TYPE timestamptz
  USING end_date::timestamptz;

