-- ================================================================
-- DEFINITIVE FIX: Break RLS recursion using SECURITY DEFINER helpers
-- ================================================================
-- Strategy: Replace all cross-table EXISTS() subqueries in RLS policies
-- with SECURITY DEFINER functions that bypass RLS on the inner lookup.
-- This is the only recursion-proof pattern for mutual table references.
-- ================================================================

-- ----------------------------------------------------------------
-- STEP 1: Create SECURITY DEFINER helper functions
-- These functions run as the function owner (postgres/service role),
-- bypassing RLS on the inner query — breaking every possible cycle.
-- ----------------------------------------------------------------

-- Helper: Is the current user a member of a given workspace?
DROP FUNCTION IF EXISTS public.is_workspace_member(uuid);
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND profile_id = auth.uid()
  );
$$;

-- Helper: Is the current user the owner of a given workspace?
DROP FUNCTION IF EXISTS public.is_workspace_owner(uuid);
CREATE OR REPLACE FUNCTION public.is_workspace_owner(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = p_workspace_id
      AND owner_id = auth.uid()
  );
$$;

-- Helper: Is the current user an admin member of a given workspace?
DROP FUNCTION IF EXISTS public.is_workspace_admin(uuid);
CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND profile_id = auth.uid()
      AND member_role = 'admin'
  );
$$;

-- ----------------------------------------------------------------
-- STEP 2: Recreate workspace_members policies using SECURITY DEFINER
-- ----------------------------------------------------------------

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

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- SELECT: own membership row OR rows for workspaces the user owns.
-- is_workspace_owner() is SECURITY DEFINER — queries workspaces WITHOUT
-- triggering workspaces RLS, so no cycle back to workspace_members.
CREATE POLICY "workspace_members_select" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_workspace_owner(workspace_id)
  );

-- INSERT: user inserts their own row, OR workspace owner inserts for others.
CREATE POLICY "workspace_members_insert" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    OR public.is_workspace_owner(workspace_id)
  );

-- UPDATE: only workspace owner can change membership rows.
CREATE POLICY "workspace_members_update" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (public.is_workspace_owner(workspace_id));

-- DELETE: member can remove themselves, owner can remove anyone.
CREATE POLICY "workspace_members_delete" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_workspace_owner(workspace_id)
  );

-- ----------------------------------------------------------------
-- STEP 3: Recreate workspaces policies using SECURITY DEFINER
-- ----------------------------------------------------------------

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

-- SELECT: owner OR member.
-- is_workspace_member() is SECURITY DEFINER — queries workspace_members WITHOUT
-- triggering workspace_members RLS, so no cycle back to workspaces.
CREATE POLICY "workspaces_select" ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_workspace_member(id)
  );

-- INSERT: only the owner can create workspaces they own.
CREATE POLICY "workspaces_insert" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: owner or admin member.
CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_workspace_admin(id)
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.is_workspace_admin(id)
  );

-- DELETE: only the owner.
CREATE POLICY "workspaces_delete" ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ----------------------------------------------------------------
-- STEP 4: Verify — all 3 queries must return results without error
-- ----------------------------------------------------------------

-- 4a. List all policies on both tables (should show 8 total)
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('workspaces', 'workspace_members')
ORDER BY tablename, policyname;

-- 4b. Fetch your personal workspace (must return a row, not 500)
SELECT id, name, owner_id, is_personal
FROM public.workspaces
WHERE owner_id = auth.uid() AND is_personal = true;

-- 4c. Fetch your membership row (must return a row, not 500)
SELECT id, workspace_id, profile_id, member_role
FROM public.workspace_members
WHERE profile_id = auth.uid();
