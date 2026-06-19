-- 1. Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 2. Clear old policies
DROP POLICY IF EXISTS "Workspace members can view categories" ON public.categories;
DROP POLICY IF EXISTS "Workspace admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Workspace admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Workspace admins can delete categories" ON public.categories;
DROP POLICY IF EXISTS "categories_select" ON public.categories;
DROP POLICY IF EXISTS "categories_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_update" ON public.categories;
DROP POLICY IF EXISTS "categories_delete" ON public.categories;

-- 3. Create explicit and robust policies

-- SELECT: Workspace members, workspace owners, or the category creator can view
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = categories.workspace_id AND wm.profile_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = categories.workspace_id AND w.owner_id = auth.uid()
    )
  );

-- INSERT: The current user is the creator (or it's system generated) and the user has membership/ownership of the target workspace
CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT WITH CHECK (
    (created_by = auth.uid() OR created_by IS NULL) AND
    (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = categories.workspace_id AND wm.profile_id = auth.uid()
      ) OR EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = categories.workspace_id AND w.owner_id = auth.uid()
      )
    )
  );

-- UPDATE: The category creator, workspace admin, or workspace owner can update
CREATE POLICY "categories_update" ON public.categories
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = categories.workspace_id AND wm.profile_id = auth.uid() AND wm.member_role = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = categories.workspace_id AND w.owner_id = auth.uid()
    )
  );

-- DELETE: The category creator, workspace admin, or workspace owner can delete
CREATE POLICY "categories_delete" ON public.categories
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = categories.workspace_id AND wm.profile_id = auth.uid() AND wm.member_role = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = categories.workspace_id AND w.owner_id = auth.uid()
    )
  );
