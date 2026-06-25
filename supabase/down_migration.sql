-- ============================================================
-- DOWN MIGRATION (ROLLBACK) - Family Management System
-- ============================================================

-- 1. Drop RLS policies on altered tables
DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;

DROP POLICY IF EXISTS "budgets_select_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_insert_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_update_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_delete_policy" ON public.budgets;

DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;

-- Recreate original policies if necessary (they will fall back to their prior state)
CREATE POLICY "Users can view personal or family expenses" ON public.expenses
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create expenses" ON public.expenses
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view personal or family budgets" ON public.budgets
    FOR SELECT TO authenticated
    USING (created_by = auth.uid());

CREATE POLICY "Users can create budgets" ON public.budgets
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- 2. Drop triggers and sync functions
DROP TRIGGER IF EXISTS trigger_family_created ON public.families;
DROP FUNCTION IF EXISTS public.on_family_created() CASCADE;

DROP TRIGGER IF EXISTS trigger_sync_family_members ON public.family_members;
DROP FUNCTION IF EXISTS public.sync_family_members_columns() CASCADE;

DROP TRIGGER IF EXISTS trigger_sync_family_invites ON public.family_invites;
DROP FUNCTION IF EXISTS public.sync_family_invites_columns() CASCADE;

-- 2.5 Drop secure helper functions
DROP FUNCTION IF EXISTS public.get_user_family_memberships() CASCADE;
DROP FUNCTION IF EXISTS public.transfer_family_ownership(UUID, UUID) CASCADE;

-- 3. Drop family tables
DROP TABLE IF EXISTS public.family_activity_logs CASCADE;
DROP TABLE IF EXISTS public.family_invites CASCADE;
DROP TABLE IF EXISTS public.family_members CASCADE;
DROP TABLE IF EXISTS public.families CASCADE;

-- 4. Remove added columns on altered tables
ALTER TABLE public.expenses DROP COLUMN IF EXISTS family_id CASCADE;
ALTER TABLE public.expenses DROP COLUMN IF EXISTS expense_scope CASCADE;

ALTER TABLE public.budgets DROP COLUMN IF EXISTS family_id CASCADE;
ALTER TABLE public.budgets DROP COLUMN IF EXISTS scope CASCADE;

ALTER TABLE public.notifications DROP COLUMN IF EXISTS family_id CASCADE;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS scope CASCADE;

-- 5. Drop performance & unique indexes
DROP INDEX IF EXISTS idx_family_members_profile;
DROP INDEX IF EXISTS idx_family_members_family;
DROP INDEX IF EXISTS idx_expenses_family;
DROP INDEX IF EXISTS idx_budgets_family;
DROP INDEX IF EXISTS idx_notifications_family;
DROP INDEX IF EXISTS idx_family_activity_logs_family;
DROP INDEX IF EXISTS unique_active_family_invite;
DROP INDEX IF EXISTS idx_family_invites_email;
DROP INDEX IF EXISTS idx_family_invites_token;
DROP INDEX IF EXISTS idx_family_activity_actor;
DROP INDEX IF EXISTS idx_expenses_scope;
DROP INDEX IF EXISTS idx_budgets_scope;
