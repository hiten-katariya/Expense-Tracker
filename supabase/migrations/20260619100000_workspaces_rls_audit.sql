-- 1. Enable RLS on workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 2. Drop any potentially conflicting/old policies
DROP POLICY IF EXISTS "Workspace owners can insert" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert_own" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_select_own" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_update_own" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete_own" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_select" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON public.workspaces;

-- 3. Create explicit RLS policies for workspaces with "TO authenticated" target role

-- INSERT: Authenticated users can insert workspaces they own
CREATE POLICY "workspaces_insert" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- SELECT: Workspace owners or workspace members can select
CREATE POLICY "workspaces_select" ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = id AND wm.profile_id = auth.uid()
    )
  );

-- UPDATE: Workspace owners or workspace admins can update
CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = id AND wm.profile_id = auth.uid() AND wm.member_role = 'admin'
    )
  )
  WITH CHECK (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = id AND wm.profile_id = auth.uid() AND wm.member_role = 'admin'
    )
  );

-- DELETE: Workspace owners can delete
CREATE POLICY "workspaces_delete" ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
