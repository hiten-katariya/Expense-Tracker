-- 1. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 2. Clear old policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

DROP POLICY IF EXISTS "Workspace members can view" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can insert" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace admins can update" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete" ON public.workspaces;

DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.workspace_members;

-- 3. Profiles Policies (Explicit)
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 4. Workspaces Policies (Explicit)
CREATE POLICY "workspaces_select_own" ON public.workspaces
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = id AND wm.profile_id = auth.uid()
    )
  );

CREATE POLICY "workspaces_insert_own" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update_own" ON public.workspaces
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = id AND wm.profile_id = auth.uid() AND wm.member_role = 'admin'
    )
  );

CREATE POLICY "workspaces_delete_own" ON public.workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- 5. Workspace Members Policies (Explicit)
CREATE POLICY "workspace_members_select_own" ON public.workspace_members
  FOR SELECT USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_insert_own" ON public.workspace_members
  FOR INSERT WITH CHECK (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_update_own" ON public.workspace_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_delete_own" ON public.workspace_members
  FOR DELETE USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );
