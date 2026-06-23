-- ============================================================
-- FIX: Budgets RLS Policies & Workspace Access Integration
-- Paste this entire script into Supabase SQL Editor and run it.
-- ============================================================

-- STEP 1: Drop legacy family-based budgets policies
DROP POLICY IF EXISTS "budgets_select_member" ON public.budgets;
DROP POLICY IF EXISTS "budgets_insert_member" ON public.budgets;
DROP POLICY IF EXISTS "budgets_update_member" ON public.budgets;
DROP POLICY IF EXISTS "budgets_delete_member" ON public.budgets;

-- Drop alternative legacy name variations to avoid naming conflicts
DROP POLICY IF EXISTS "Budgets view access" ON public.budgets;
DROP POLICY IF EXISTS "Budgets insert access" ON public.budgets;
DROP POLICY IF EXISTS "Budgets update access" ON public.budgets;
DROP POLICY IF EXISTS "Budgets delete access" ON public.budgets;

-- STEP 2: Ensure Row Level Security is enabled
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create recursion-safe, workspace-based RLS policies
-- Note: Uses the existing recursion-safe `public.is_workspace_member(workspace_id)` helper
-- which runs under SECURITY DEFINER context to bypass cyclic lookups on workspace_members.

-- SELECT POLICY: Workspace members can view workspace budgets
CREATE POLICY "budgets_select_member" ON public.budgets
  FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL 
    AND public.is_workspace_member(workspace_id)
  );

-- INSERT POLICY: Authenticated workspace members can set budgets under their own profile ID
CREATE POLICY "budgets_insert_member" ON public.budgets
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND workspace_id IS NOT NULL 
    AND public.is_workspace_member(workspace_id)
  );

-- UPDATE POLICY: Workspace members can modify budgets
CREATE POLICY "budgets_update_member" ON public.budgets
  FOR UPDATE TO authenticated
  USING (
    workspace_id IS NOT NULL 
    AND public.is_workspace_member(workspace_id)
  )
  WITH CHECK (
    workspace_id IS NOT NULL 
    AND public.is_workspace_member(workspace_id)
  );

-- DELETE POLICY: Workspace members can remove budgets
CREATE POLICY "budgets_delete_member" ON public.budgets
  FOR DELETE TO authenticated
  USING (
    workspace_id IS NOT NULL 
    AND public.is_workspace_member(workspace_id)
  );

-- STEP 4: Verify and create indexes on lookup fields for performance
CREATE INDEX IF NOT EXISTS budgets_workspace_id_idx ON public.budgets (workspace_id);
CREATE INDEX IF NOT EXISTS budgets_created_by_idx ON public.budgets (created_by);
CREATE INDEX IF NOT EXISTS budgets_category_id_idx ON public.budgets (category_id);
