-- ══════════════════════════════════════════
-- MIGRACIÓN: Agregar biografía al staff
-- Ejecutar en Supabase > SQL Editor
-- ══════════════════════════════════════════

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS biography text;
