-- 1. Create family_deleted_expenses table
CREATE TABLE IF NOT EXISTS public.family_deleted_expenses (
    id UUID PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    notes TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    currency_code VARCHAR(3) DEFAULT 'INR',
    expense_date DATE NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    deleted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on family_deleted_expenses
ALTER TABLE public.family_deleted_expenses ENABLE ROW LEVEL SECURITY;

-- Select Policy: members of the family can view deleted family expenses
DROP POLICY IF EXISTS "family_deleted_expenses_select_policy" ON public.family_deleted_expenses;
CREATE POLICY "family_deleted_expenses_select_policy" ON public.family_deleted_expenses
    FOR SELECT TO authenticated
    USING (
        family_id IN (
            SELECT family_id
            FROM public.get_user_family_memberships()
        )
    );

-- Delete Policy: family owners or admins can delete permanently, members can only delete their own
DROP POLICY IF EXISTS "family_deleted_expenses_delete_policy" ON public.family_deleted_expenses;
CREATE POLICY "family_deleted_expenses_delete_policy" ON public.family_deleted_expenses
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.get_user_family_memberships() gufm
            WHERE gufm.family_id = family_deleted_expenses.family_id
              AND gufm.role IN ('owner', 'admin')
        )
        OR user_id = auth.uid()
    );

-- Insert/Update Policy: only database triggers/functions can insert/update (run as security definer)
DROP POLICY IF EXISTS "family_deleted_expenses_insert_policy" ON public.family_deleted_expenses;
CREATE POLICY "family_deleted_expenses_insert_policy" ON public.family_deleted_expenses
    FOR INSERT TO authenticated
    WITH CHECK (false);

DROP POLICY IF EXISTS "family_deleted_expenses_update_policy" ON public.family_deleted_expenses;
CREATE POLICY "family_deleted_expenses_update_policy" ON public.family_deleted_expenses
    FOR UPDATE TO authenticated
    USING (false)
    WITH CHECK (false);

-- 2. Trigger function to archive deleted family expenses automatically when they are soft deleted from expenses table
CREATE OR REPLACE FUNCTION public.archive_family_expense()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted = true AND OLD.is_deleted = false AND NEW.expense_scope = 'family' THEN
    -- Archive record into family_deleted_expenses
    INSERT INTO public.family_deleted_expenses (
      id,
      family_id,
      user_id,
      category_id,
      title,
      notes,
      amount,
      currency_code,
      expense_date,
      payment_method,
      deleted_by,
      deleted_at,
      created_at
    ) VALUES (
      NEW.id,
      NEW.family_id,
      NEW.user_id,
      NEW.category_id,
      NEW.title,
      NEW.notes,
      NEW.amount,
      NEW.currency_code,
      NEW.expense_date,
      NEW.payment_method,
      auth.uid(),
      COALESCE(NEW.deleted_at, now()),
      NEW.created_at
    );

    -- Log activity
    INSERT INTO public.family_activity_logs (family_id, actor_id, action, entity_type, entity_id, metadata)
    VALUES (
      NEW.family_id,
      auth.uid(),
      'expense_deleted',
      'expense',
      NEW.id,
      jsonb_build_object('title', NEW.title, 'amount', NEW.amount)
    );

    -- Hard-delete the original expense row from expenses
    DELETE FROM public.expenses WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trigger_archive_family_expense ON public.expenses;
CREATE TRIGGER trigger_archive_family_expense
  AFTER UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_family_expense();

-- 3. Database function to join family securely by invite code
CREATE OR REPLACE FUNCTION public.join_family_by_code(p_invite_code VARCHAR)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_family_id UUID;
    v_member_exists BOOLEAN;
BEGIN
    -- Find matching family
    SELECT id INTO v_family_id
    FROM public.families
    WHERE UPPER(invite_code) = UPPER(p_invite_code);

    IF v_family_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code.';
    END IF;

    -- Check duplicate join
    SELECT EXISTS (
        SELECT 1 FROM public.family_members
        WHERE family_id = v_family_id AND profile_id = auth.uid()
    ) INTO v_member_exists;

    IF v_member_exists THEN
        RAISE EXCEPTION 'You are already a member of this family.';
    END IF;

    -- Insert new member
    INSERT INTO public.family_members (family_id, profile_id, role, member_role)
    VALUES (v_family_id, auth.uid(), 'member', 'member');

    -- Log join activity
    INSERT INTO public.family_activity_logs (family_id, actor_id, action, entity_type, entity_id)
    VALUES (v_family_id, auth.uid(), 'member_joined', 'profile', auth.uid());

    RETURN v_family_id;
END;
$$;

-- Grant execution to authenticated users
REVOKE ALL ON FUNCTION public.join_family_by_code(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_family_by_code(VARCHAR) TO authenticated;

-- 4. Secure function to restore a deleted family expense
CREATE OR REPLACE FUNCTION public.restore_family_expense(p_expense_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expense RECORD;
    v_user_role VARCHAR(20);
BEGIN
    SELECT * INTO v_expense
    FROM public.family_deleted_expenses
    WHERE id = p_expense_id;

    IF v_expense.id IS NULL THEN
        RAISE EXCEPTION 'Deleted expense not found.';
    END IF;

    -- Get user role
    SELECT role INTO v_user_role
    FROM public.family_members
    WHERE family_id = v_expense.family_id AND profile_id = auth.uid();

    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: You are not a member of this family.';
    END IF;

    -- Standard member can only restore their own
    IF v_user_role = 'member' AND v_expense.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You can only restore expenses logged by you.';
    END IF;

    -- Insert back into expenses
    INSERT INTO public.expenses (
      id,
      family_id,
      user_id,
      category_id,
      expense_scope,
      title,
      notes,
      amount,
      currency_code,
      expense_date,
      payment_method,
      is_deleted,
      deleted_at,
      workspace_id,
      created_at
    ) VALUES (
      v_expense.id,
      v_expense.family_id,
      v_expense.user_id,
      v_expense.category_id,
      'family',
      v_expense.title,
      v_expense.notes,
      v_expense.amount,
      v_expense.currency_code,
      v_expense.expense_date,
      v_expense.payment_method,
      false,
      null,
      (SELECT id FROM public.workspaces WHERE owner_id = v_expense.user_id AND is_personal = true LIMIT 1),
      v_expense.created_at
    );

    -- Delete from family_deleted_expenses
    DELETE FROM public.family_deleted_expenses WHERE id = p_expense_id;

    -- Log activity
    INSERT INTO public.family_activity_logs (family_id, actor_id, action, entity_type, entity_id, metadata)
    VALUES (
      v_expense.family_id,
      auth.uid(),
      'expense_restored',
      'expense',
      p_expense_id,
      jsonb_build_object('title', v_expense.title, 'amount', v_expense.amount)
    );

    RETURN TRUE;
END;
$$;

-- Grant execution to authenticated users
REVOKE ALL ON FUNCTION public.restore_family_expense(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_family_expense(UUID) TO authenticated;

-- 5. Secure function to permanently delete a family expense
CREATE OR REPLACE FUNCTION public.permanent_delete_family_expense(p_expense_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expense RECORD;
    v_user_role VARCHAR(20);
BEGIN
    SELECT * INTO v_expense
    FROM public.family_deleted_expenses
    WHERE id = p_expense_id;

    IF v_expense.id IS NULL THEN
        RAISE EXCEPTION 'Deleted expense not found.';
    END IF;

    -- Get user role
    SELECT role INTO v_user_role
    FROM public.family_members
    WHERE family_id = v_expense.family_id AND profile_id = auth.uid();

    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: You are not a member of this family.';
    END IF;

    -- Standard member can only permanently delete their own
    IF v_user_role = 'member' AND v_expense.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You can only delete expenses logged by you.';
    END IF;

    -- Delete from family_deleted_expenses
    DELETE FROM public.family_deleted_expenses WHERE id = p_expense_id;

    -- Log activity
    INSERT INTO public.family_activity_logs (family_id, actor_id, action, entity_type, entity_id, metadata)
    VALUES (
      v_expense.family_id,
      auth.uid(),
      'expense_permanently_deleted',
      'expense',
      p_expense_id,
      jsonb_build_object('title', v_expense.title, 'amount', v_expense.amount)
    );

    RETURN TRUE;
END;
$$;

-- Grant execution to authenticated users
REVOKE ALL ON FUNCTION public.permanent_delete_family_expense(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.permanent_delete_family_expense(UUID) TO authenticated;
