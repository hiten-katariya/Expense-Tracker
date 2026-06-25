-- Migration: Family Management Fixes and Constraints

-- 1. Drop NOT NULL constraint from workspace_id in public.expenses
ALTER TABLE public.expenses ALTER COLUMN workspace_id DROP NOT NULL;

-- 2. Modify archive_family_expense trigger function to NOT delete the original row
CREATE OR REPLACE FUNCTION public.archive_family_expense()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted = true AND OLD.is_deleted = false AND NEW.expense_scope = 'family' THEN
    -- Delete existing archived entry if any to prevent duplicate key violations
    DELETE FROM public.family_deleted_expenses WHERE id = NEW.id;

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

    -- Do NOT delete the original row here anymore to avoid delete-in-trigger bugs.
    -- The row remains in public.expenses with is_deleted = true.
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update join_family_by_code secure RPC function to check if the user is already in a family
CREATE OR REPLACE FUNCTION public.join_family_by_code(p_invite_code VARCHAR)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_family_id UUID;
    v_member_exists BOOLEAN;
    v_already_in_family BOOLEAN;
BEGIN
    -- Business rule: 1 user = 1 family
    SELECT EXISTS (
        SELECT 1
        FROM public.family_members
        WHERE profile_id = auth.uid()
    ) INTO v_already_in_family;

    IF v_already_in_family THEN
        RAISE EXCEPTION 'Leave current family before joining another.';
    END IF;

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

-- 4. Update restore_family_expense to update public.expenses instead of INSERT
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

    -- Update active record in public.expenses
    UPDATE public.expenses
    SET is_deleted = false,
        deleted_at = NULL,
        workspace_id = NULL -- Enforce strict isolation
    WHERE id = p_expense_id;

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

-- 5. Update permanent_delete_family_expense to remove from public.expenses too
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

    -- Hard-delete from public.expenses
    DELETE FROM public.expenses WHERE id = p_expense_id;

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
