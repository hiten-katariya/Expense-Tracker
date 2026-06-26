-- ================================================================
-- Admin Panel: Add is_admin column to profiles
-- ================================================================
-- This migration is non-destructive:
--   - No existing columns modified
--   - No existing RLS policies modified
--   - No new RLS policies created
--   - No new SECURITY DEFINER functions
--   - Zero recursion risk
-- ================================================================

-- 1. Add is_admin boolean column (default false for all existing users)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Seed the application owner
UPDATE public.profiles SET is_admin = true WHERE email = 'hiten8411jdrravi@gmail.com';

-- 3. Partial index for fast admin lookup (only indexes the rare is_admin=true rows)
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;
