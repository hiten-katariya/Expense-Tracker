-- ============================================================
-- UP MIGRATION - Clean, Non-Recursive RLS Policies & Columns Sync
-- ============================================================

-- 1. Create families table
CREATE TABLE IF NOT EXISTS public.families (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code VARCHAR(12) UNIQUE NOT NULL,
    monthly_budget NUMERIC(12, 2),
    currency_code VARCHAR(3) DEFAULT 'INR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create family_members table
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    member_role VARCHAR(20) DEFAULT 'member' CHECK (member_role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Add unique constraint
ALTER TABLE public.family_members DROP CONSTRAINT IF EXISTS unique_family_member;
ALTER TABLE public.family_members ADD CONSTRAINT unique_family_member UNIQUE (family_id, profile_id);

-- 3. Create family_invites table
CREATE TABLE IF NOT EXISTS public.family_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_email TEXT,
    invite_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invited_by UUID,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Drop legacy constraints
ALTER TABLE public.family_invites DROP CONSTRAINT IF EXISTS unique_pending_invite;
ALTER TABLE public.family_invites DROP CONSTRAINT IF EXISTS unique_invite_status;
DROP INDEX IF EXISTS unique_active_family_invite;
-- Add partial unique index to allow only one active pending invite per user per family
CREATE UNIQUE INDEX unique_active_family_invite ON public.family_invites(family_id, email) WHERE status = 'pending';

-- 4. Create family_activity_logs table
CREATE TABLE IF NOT EXISTS public.family_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Alter existing tables (expenses, budgets, notifications)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS expense_scope TEXT CHECK (expense_scope IN ('personal', 'family')) DEFAULT 'personal';

ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE CASCADE;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS scope TEXT CHECK (scope IN ('personal', 'family')) DEFAULT 'personal';

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS scope TEXT CHECK (scope IN ('personal', 'family')) DEFAULT 'personal';

-- 6. Trigger for synchronizing names to ensure complete backwards and forwards compatibility
CREATE OR REPLACE FUNCTION public.sync_family_members_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS NULL AND NEW.member_role IS NOT NULL THEN
    NEW.role := NEW.member_role;
  ELSIF NEW.role IS NOT NULL AND NEW.member_role IS NULL THEN
    NEW.member_role := NEW.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_family_members ON public.family_members;
CREATE TRIGGER trigger_sync_family_members
  BEFORE INSERT OR UPDATE ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_family_members_columns();

CREATE OR REPLACE FUNCTION public.sync_family_invites_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NULL AND NEW.invited_email IS NOT NULL THEN
    NEW.email := NEW.invited_email;
  ELSIF NEW.email IS NOT NULL AND NEW.invited_email IS NULL THEN
    NEW.invited_email := NEW.email;
  END IF;

  IF NEW.created_by IS NULL AND NEW.invited_by IS NOT NULL THEN
    NEW.created_by := NEW.invited_by;
  ELSIF NEW.created_by IS NOT NULL AND NEW.invited_by IS NULL THEN
    NEW.invited_by := NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_family_invites ON public.family_invites;
CREATE TRIGGER trigger_sync_family_invites
  BEFORE INSERT OR UPDATE ON public.family_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_family_invites_columns();

-- 7. Trigger for automatic insertion of family creator as owner in family_members
CREATE OR REPLACE FUNCTION public.on_family_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.family_members (family_id, profile_id, role, member_role)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'owner');

  INSERT INTO public.family_activity_logs (family_id, actor_id, action, entity_type, entity_id)
  VALUES (NEW.id, NEW.owner_id, 'family_created', 'family', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_family_created ON public.families;
CREATE TRIGGER trigger_family_created
  AFTER INSERT ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.on_family_created();

-- 7.5 Create get_user_family_memberships secure definer helper function (to prevent RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_family_memberships()
RETURNS TABLE(family_id uuid, role varchar)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT fm.family_id, fm.role::varchar
    FROM public.family_members fm
    WHERE fm.profile_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_user_family_memberships() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_family_memberships() TO authenticated;

-- 7.6 Create transfer_family_ownership secure transaction function
CREATE OR REPLACE FUNCTION public.transfer_family_ownership(
    p_family_id UUID,
    p_new_owner_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role VARCHAR(20);
    v_target_exists BOOLEAN;
BEGIN
    -- 1. Verify that the caller is indeed the owner of the family
    SELECT role INTO v_caller_role
    FROM public.family_members
    WHERE family_id = p_family_id AND profile_id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_role != 'owner' THEN
        RAISE EXCEPTION 'Only the family owner can transfer ownership.';
    END IF;

    -- 2. Verify that the target new owner exists in the family
    SELECT EXISTS (
        SELECT 1 FROM public.family_members
        WHERE family_id = p_family_id AND profile_id = p_new_owner_id
    ) INTO v_target_exists;

    IF NOT v_target_exists THEN
        RAISE EXCEPTION 'Target user must be a member of the family.';
    END IF;

    -- 3. If target user is already owner, do nothing
    IF p_new_owner_id = auth.uid() THEN
        RETURN TRUE;
    END IF;

    -- 4. Demote current owner to admin (in family_members)
    UPDATE public.family_members
    SET role = 'admin', member_role = 'admin'
    WHERE family_id = p_family_id AND profile_id = auth.uid();

    -- 5. Promote new owner to owner (in family_members)
    UPDATE public.family_members
    SET role = 'owner', member_role = 'owner'
    WHERE family_id = p_family_id AND profile_id = p_new_owner_id;

    -- 6. Update the owner_id in families table
    UPDATE public.families
    SET owner_id = p_new_owner_id
    WHERE id = p_family_id;

    -- 7. Insert activity log for ownership transfer
    INSERT INTO public.family_activity_logs (family_id, actor_id, action, entity_type, entity_id, metadata)
    VALUES (
        p_family_id,
        auth.uid(),
        'ownership_transferred',
        'family',
        p_family_id,
        jsonb_build_object('new_owner_id', p_new_owner_id)
    );

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_family_ownership(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_family_ownership(UUID, UUID) TO authenticated;

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_activity_logs ENABLE ROW LEVEL SECURITY;

-- 9. Clean, Cycle-Free, Non-Recursive RLS Policies

-- Drop any conflicting policies from previous migrations
DROP POLICY IF EXISTS "families_select_policy" ON public.families;
DROP POLICY IF EXISTS "families_insert_policy" ON public.families;
DROP POLICY IF EXISTS "families_update_policy" ON public.families;
DROP POLICY IF EXISTS "families_delete_policy" ON public.families;
DROP POLICY IF EXISTS "Users can view families they belong to" ON public.families;
DROP POLICY IF EXISTS "Users can create families" ON public.families;
DROP POLICY IF EXISTS "Owner can update families" ON public.families;
DROP POLICY IF EXISTS "Owner can delete families" ON public.families;

DROP POLICY IF EXISTS "family_members_select_policy" ON public.family_members;
DROP POLICY IF EXISTS "family_members_insert_policy" ON public.family_members;
DROP POLICY IF EXISTS "family_members_update_policy" ON public.family_members;
DROP POLICY IF EXISTS "family_members_delete_policy" ON public.family_members;
DROP POLICY IF EXISTS "Users can view members of their families" ON public.family_members;

DROP POLICY IF EXISTS "family_invites_select_policy" ON public.family_invites;
DROP POLICY IF EXISTS "family_invites_insert_policy" ON public.family_invites;
DROP POLICY IF EXISTS "family_invites_update_policy" ON public.family_invites;
DROP POLICY IF EXISTS "family_invites_delete_policy" ON public.family_invites;

DROP POLICY IF EXISTS "Users can view personal or family expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can create expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;

DROP POLICY IF EXISTS "Users can view personal or family budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can create budgets" ON public.budgets;
DROP POLICY IF EXISTS "budgets_select_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_insert_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_update_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_delete_policy" ON public.budgets;

DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;

-- 9a. Families: Owner and members can select. No dependency cycle.
CREATE POLICY "families_select_policy" ON public.families
    FOR SELECT TO authenticated
    USING (
        owner_id = auth.uid()
        OR id IN (
            SELECT family_id
            FROM public.get_user_family_memberships()
        )
    );

CREATE POLICY "families_insert_policy" ON public.families
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "families_update_policy" ON public.families
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "families_delete_policy" ON public.families
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

-- 9b. Family Members: Read your own or profiles in families you belong to (using the helper function).
CREATE POLICY "family_members_select_policy" ON public.family_members
    FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid()
        OR family_id IN (
            SELECT family_id
            FROM public.get_user_family_memberships()
        )
    );

CREATE POLICY "family_members_insert_policy" ON public.family_members
    FOR INSERT TO authenticated
    WITH CHECK (
        profile_id = auth.uid()
        OR family_id IN (
            SELECT family_id
            FROM public.get_user_family_memberships()
            WHERE role IN ('owner', 'admin')
        )
    );

CREATE POLICY "family_members_update_policy" ON public.family_members
    FOR UPDATE TO authenticated
    USING (
        -- The updater must be owner or admin in the family (checked via the function)
        EXISTS (
            SELECT 1 FROM public.get_user_family_memberships() gufm
            WHERE gufm.family_id = family_members.family_id
              AND gufm.role IN ('owner', 'admin')
        )
        -- AND they cannot update an owner row unless they are the owner
        AND (
            family_members.role != 'owner'
            OR EXISTS (
                SELECT 1 FROM public.get_user_family_memberships() gufm
                WHERE gufm.family_id = family_members.family_id
                  AND gufm.role = 'owner'
            )
        )
    )
    WITH CHECK (
        -- The new role cannot be 'owner' unless the updater is the owner
        (
            role != 'owner'
            OR EXISTS (
                SELECT 1 FROM public.get_user_family_memberships() gufm
                WHERE gufm.family_id = family_members.family_id
                  AND gufm.role = 'owner'
            )
        )
    );

CREATE POLICY "family_members_delete_policy" ON public.family_members
    FOR DELETE TO authenticated
    USING (
        -- Standard members can only delete themselves (leave) except owner cannot leave
        (profile_id = auth.uid() AND role != 'owner')
        -- Family owner can delete anyone
        OR EXISTS (
            SELECT 1 FROM public.get_user_family_memberships() gufm
            WHERE gufm.family_id = family_members.family_id
              AND gufm.role = 'owner'
        )
        -- Family admin can delete standard members (cannot delete owners or other admins)
        OR (
            EXISTS (
                SELECT 1 FROM public.get_user_family_memberships() gufm
                WHERE gufm.family_id = family_members.family_id
                  AND gufm.role = 'admin'
            )
            AND role = 'member'
        )
    );

-- 9c. Family Invites
CREATE POLICY "family_invites_select_policy" ON public.family_invites
    FOR SELECT TO authenticated
    USING (
        created_by = auth.uid()
        OR email = (auth.jwt() ->> 'email')
        OR family_id IN (
            SELECT family_id
            FROM public.get_user_family_memberships()
        )
    );

CREATE POLICY "family_invites_insert_policy" ON public.family_invites
    FOR INSERT TO authenticated
    WITH CHECK (
        created_by = auth.uid()
        AND family_id IN (
            SELECT family_id
            FROM public.get_user_family_memberships()
            WHERE role IN ('owner', 'admin')
        )
    );

CREATE POLICY "family_invites_update_policy" ON public.family_invites
    FOR UPDATE TO authenticated
    USING (
        email = (auth.jwt() ->> 'email')
    );

CREATE POLICY "family_invites_delete_policy" ON public.family_invites
    FOR DELETE TO authenticated
    USING (
        created_by = auth.uid()
        OR family_id IN (
            SELECT family_id
            FROM public.get_user_family_memberships()
            WHERE role IN ('owner', 'admin')
        )
    );

-- 9d. Family Activity Logs
CREATE POLICY "family_activity_logs_select_policy" ON public.family_activity_logs
    FOR SELECT TO authenticated
    USING (
        family_id IN (
            SELECT family_id
            FROM public.get_user_family_memberships()
        )
    );

CREATE POLICY "family_activity_logs_insert_policy" ON public.family_activity_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        family_id IN (
            SELECT family_id
            FROM public.get_user_family_memberships()
        )
    );

-- 9e. Expenses: Option B (Standard members view/create, creator OR owner/admin edit/delete)
CREATE POLICY "expenses_select_policy" ON public.expenses
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR (
            family_id IS NOT NULL
            AND family_id IN (
                SELECT family_id
                FROM public.get_user_family_memberships()
            )
        )
    );

CREATE POLICY "expenses_insert_policy" ON public.expenses
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() 
        AND (
            family_id IS NULL OR 
            family_id IN (
                SELECT family_id
                FROM public.get_user_family_memberships()
            )
        )
    );

CREATE POLICY "expenses_update_policy" ON public.expenses
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        OR (
            family_id IS NOT NULL
            AND family_id IN (
                SELECT family_id
                FROM public.get_user_family_memberships()
                WHERE role IN ('owner', 'admin')
            )
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        OR (
            family_id IS NOT NULL
            AND family_id IN (
                SELECT family_id
                FROM public.get_user_family_memberships()
                WHERE role IN ('owner', 'admin')
            )
        )
    );

CREATE POLICY "expenses_delete_policy" ON public.expenses
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()
        OR (
            family_id IS NOT NULL
            AND family_id IN (
                SELECT family_id
                FROM public.get_user_family_memberships()
                WHERE role IN ('owner', 'admin')
            )
        )
    );

-- 9f. Budgets: Owner/admin can manage all budgets, members read-only
CREATE POLICY "budgets_select_policy" ON public.budgets
    FOR SELECT TO authenticated
    USING (
        created_by = auth.uid()
        OR (
            family_id IS NOT NULL
            AND family_id IN (
                SELECT family_id
                FROM public.get_user_family_memberships()
            )
        )
    );

CREATE POLICY "budgets_insert_policy" ON public.budgets
    FOR INSERT TO authenticated
    WITH CHECK (
        created_by = auth.uid() 
        AND (
            family_id IS NULL OR 
            family_id IN (
                SELECT family_id
                FROM public.get_user_family_memberships()
                WHERE role IN ('owner', 'admin')
            )
        )
    );

CREATE POLICY "budgets_update_policy" ON public.budgets
    FOR UPDATE TO authenticated
    USING (
        (family_id IS NULL AND created_by = auth.uid())
        OR (
            family_id IS NOT NULL
            AND family_id IN (
                SELECT family_id
                FROM public.get_user_family_memberships()
                WHERE role IN ('owner', 'admin')
            )
        )
    )
    WITH CHECK (
        (family_id IS NULL AND created_by = auth.uid())
        OR (
            family_id IS NOT NULL
            AND family_id IN (
                SELECT family_id
                FROM public.get_user_family_memberships()
                WHERE role IN ('owner', 'admin')
            )
        )
    );

CREATE POLICY "budgets_delete_policy" ON public.budgets
    FOR DELETE TO authenticated
    USING (
        (family_id IS NULL AND created_by = auth.uid())
        OR (
            family_id IS NOT NULL
            AND family_id IN (
                SELECT family_id
                FROM public.get_user_family_memberships()
                WHERE role IN ('owner', 'admin')
            )
        )
    );

-- 9g. Notifications: Users can view and create notifications scoped to them or their family
CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR (
            family_id IS NOT NULL
            AND family_id IN (
                SELECT family_id
                FROM public.get_user_family_memberships()
            )
        )
    );

CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
        OR (
            family_id IS NOT NULL
            AND family_id IN (
                SELECT family_id
                FROM public.get_user_family_memberships()
            )
        )
    );

CREATE POLICY "notifications_update_policy" ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_policy" ON public.notifications
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_family_members_profile ON public.family_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_expenses_family ON public.expenses(family_id);
CREATE INDEX IF NOT EXISTS idx_budgets_family ON public.budgets(family_id);
CREATE INDEX IF NOT EXISTS idx_notifications_family ON public.notifications(family_id);
CREATE INDEX IF NOT EXISTS idx_family_activity_logs_family ON public.family_activity_logs(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invites_email ON public.family_invites(email);
CREATE INDEX IF NOT EXISTS idx_family_invites_token ON public.family_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_family_activity_actor ON public.family_activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_expenses_scope ON public.expenses(expense_scope);
CREATE INDEX IF NOT EXISTS idx_budgets_scope ON public.budgets(scope);
