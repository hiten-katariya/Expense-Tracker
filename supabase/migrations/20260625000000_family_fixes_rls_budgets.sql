-- ============================================================
-- UP MIGRATION - Profiles RLS, Budgets Constraints, & Workspace Isolation
-- ============================================================

-- 1. Enable RLS on profiles and add select policy
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_family_and_workspace" ON public.profiles;
CREATE POLICY "profiles_select_family_and_workspace" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR id IN (
            -- Members of the same family
            SELECT fm.profile_id 
            FROM public.family_members fm
            WHERE fm.family_id IN (
                SELECT family_id 
                FROM public.get_user_family_memberships()
            )
        )
        OR id IN (
            -- Members of the same workspace
            SELECT wm.profile_id 
            FROM public.workspace_members wm
            WHERE public.is_workspace_member(wm.workspace_id)
        )
    );

-- 1.5. Drop the NOT NULL constraint on workspace_id in the budgets table to support domain isolation
ALTER TABLE public.budgets ALTER COLUMN workspace_id DROP NOT NULL;

-- 2. Add partial unique constraints to budgets to prevent duplicate family budgets
DROP INDEX IF EXISTS public.unique_family_overall_budget;
CREATE UNIQUE INDEX unique_family_overall_budget ON public.budgets(family_id) 
    WHERE (scope = 'family' AND category_id IS NULL);

DROP INDEX IF EXISTS public.unique_family_category_budget;
CREATE UNIQUE INDEX unique_family_category_budget ON public.budgets(family_id, category_id) 
    WHERE (scope = 'family' AND category_id IS NOT NULL);

-- 3. Cleanup existing bidirectional synchronization triggers and functions to prevent loops
DROP TRIGGER IF EXISTS trigger_sync_family_budget_to_budgets ON public.families;
DROP TRIGGER IF EXISTS trigger_sync_budgets_table_to_family ON public.budgets;
DROP FUNCTION IF EXISTS public.sync_family_budget_to_budgets_table();
DROP FUNCTION IF EXISTS public.sync_budgets_table_to_family_budget();

-- 4. Clean up any personal workspace dependencies on existing family budgets
UPDATE public.budgets
SET workspace_id = NULL
WHERE scope = 'family';
