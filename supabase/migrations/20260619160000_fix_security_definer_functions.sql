-- ================================================================
-- MINIMAL FIX: Add SECURITY DEFINER to is_workspace_member + is_workspace_admin
-- ================================================================
-- Root cause: is_workspace_member() queries workspace_members WITHOUT
-- SECURITY DEFINER, so workspace_members RLS fires when is_workspace_member()
-- runs internally, calling is_workspace_member() again → infinite recursion.
--
-- Fix: SECURITY DEFINER makes these functions run as the postgres superuser,
-- bypassing RLS on inner queries. All dependent policies remain untouched.
-- Parameter names are unchanged (target_workspace_id) so CREATE OR REPLACE
-- works without dropping the functions or cascading to dependents.
-- ================================================================

CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = target_workspace_id
      AND wm.profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(target_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = target_workspace_id
      AND wm.profile_id = auth.uid()
      AND wm.member_role = 'admin'
  );
$$;

-- Drop original self-referencing policies from migration 001
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can manage members"          ON public.workspace_members;

-- Drop conflicting non-_member policies added by emergency fix scripts
DROP POLICY IF EXISTS "workspace_members_select" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON public.workspace_members;
DROP POLICY IF EXISTS "workspaces_select"        ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert"        ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_update"        ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete"        ON public.workspaces;

-- Verification queries
SELECT proname, prosecdef FROM pg_proc WHERE proname IN ('is_workspace_member', 'is_workspace_admin');
SELECT id, name, is_personal FROM workspaces WHERE owner_id = auth.uid() AND is_personal = true;
SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('workspaces','workspace_members') ORDER BY tablename, policyname;
