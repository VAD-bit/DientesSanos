-- Migration: Add show_on_landing and video_url columns to staff table
-- Controls whether a staff member appears on the public landing page

-- 1. Add visibility toggle (default true so existing barbers appear automatically)
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS show_on_landing boolean DEFAULT true;

-- 2. Add video URL column (admin-uploaded presentation video)
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS video_url text;

-- 3. Set existing barbers/tattoo artists to show on landing by default
UPDATE public.staff
SET show_on_landing = true
WHERE active = true
  AND (role LIKE '%barbero%' OR role LIKE '%tatuador%' OR role LIKE '%estilista%' OR role LIKE '%barber%' OR role LIKE '%tatu%');

-- 4. Set non-public roles to hidden by default
UPDATE public.staff
SET show_on_landing = false
WHERE active = true
  AND NOT (role LIKE '%barbero%' OR role LIKE '%tatuador%' OR role LIKE '%estilista%' OR role LIKE '%barber%' OR role LIKE '%tatu%');
