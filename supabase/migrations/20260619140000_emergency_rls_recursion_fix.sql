-- ============================================================
-- EMERGENCY RLS RECURSION FIX
-- Paste this entire script into Supabase SQL Editor and run it.
-- ============================================================
-- 
-- ROOT CAUSE: Migration 001 created a self-referencing policy on
-- workspace_members that causes infinite recursion (Postgres 54001):
--
--   CREATE POLICY "Members can view workspace members" ON workspace_members FOR SELECT
--     USING (EXISTS (
--       SELECT 1 FROM workspace_members wm   <-- reads workspace_members
--       WHERE wm.workspace_id = workspace_members.workspace_id  -- while evaluating workspace_members RLS
--       AND wm.profile_id = auth.uid()       -- INFINITE RECURSION
--     ));
--
-- This fires whenever ANY query touches workspace_members (including
-- the workspaces SELECT policy which also joins workspace_members).
-- The result: even a simple SELECT on workspaces returns 54001.
-- ============================================================

-- STEP 1: Drop ALL existing policies on workspace_members
-- (catches every policy name used across all migrations)
DROP POLICY IF EXISTS "Members can view workspace members"   ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can manage members"            ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_own"         ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_own"         ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_own"         ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_own"         ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select"             ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert"             ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update"             ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete"             ON public.workspace_members;

-- STEP 2: Ensure RLS is enabled
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create non-recursive policies for workspace_members
-- SELECT: ONLY profile_id = auth.uid() — NO subqueries to other tables.
-- This is the critical rule: workspace_members SELECT must never reference
-- workspaces (or any table whose RLS references workspace_members back),
-- otherwise workspaces→workspace_members→workspaces = infinite recursion.
CREATE POLICY "workspace_members_select" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- INSERT: user inserts their own row, OR workspace owner inserts for others
CREATE POLICY "workspace_members_insert" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- UPDATE: workspace owner can update membership rows
CREATE POLICY "workspace_members_update" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- DELETE: user can remove themselves, OR workspace owner can remove anyone
CREATE POLICY "workspace_members_delete" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 4: Drop ALL existing policies on workspaces and recreate
-- ============================================================
DROP POLICY IF EXISTS "Workspace members can view"           ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can insert"          ON public.workspaces;
DROP POLICY IF EXISTS "Workspace admins can update"          ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete"          ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_select_own"                ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert_own"                ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_update_own"                ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete_own"                ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_select"                    ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert"                    ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_update"                    ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete"                    ON public.workspaces;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- SELECT: owner OR member (workspace_members SELECT is now safe — no recursion)
CREATE POLICY "workspaces_select" ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = id AND wm.profile_id = auth.uid()
    )
  );

-- INSERT: only the owner
CREATE POLICY "workspaces_insert" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: owner or admin member
CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = id AND wm.profile_id = auth.uid() AND wm.member_role = 'admin'
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = id AND wm.profile_id = auth.uid() AND wm.member_role = 'admin'
    )
  );

-- DELETE: only the owner
CREATE POLICY "workspaces_delete" ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- STEP 5: unique_personal_workspace index
-- Already exists in the database — skipped.
-- ============================================================

-- ============================================================
-- VERIFICATION QUERIES — run these after to confirm it worked
-- ============================================================

-- 1. Should show all workspace_members policies (4 rows, no old ones)
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'workspace_members'
ORDER BY policyname;

-- 2. Should return your workspace without 500 error
SELECT id, name, owner_id, is_personal
FROM workspaces
WHERE owner_id = auth.uid() AND is_personal = true;

-- 3. Confirm unique constraint exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'workspaces' AND indexname = 'unique_personal_workspace';
