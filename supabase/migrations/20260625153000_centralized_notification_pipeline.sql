-- UP MIGRATION - Centralized Notification & Email Pipeline Schema and Triggers

-- 1. Create notification_events table
CREATE TABLE IF NOT EXISTS public.notification_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on notification_events
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- Create indices for performance optimization
CREATE INDEX IF NOT EXISTS idx_notification_events_status ON public.notification_events(status);
CREATE INDEX IF NOT EXISTS idx_notification_events_created_at ON public.notification_events(created_at ASC);

-- RPC helper to fetch and lock pending notification events
CREATE OR REPLACE FUNCTION public.fetch_and_lock_notification_events(p_limit int)
RETURNS SETOF public.notification_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.notification_events
    SET status = 'processing',
        updated_at = now()
    WHERE id IN (
        SELECT id 
        FROM public.notification_events
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$;

-- RPC helper to update notification event status
CREATE OR REPLACE FUNCTION public.update_notification_event_status(
    p_id uuid,
    p_status text,
    p_error_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.notification_events
    SET status = p_status,
        error_message = p_error_message,
        updated_at = now()
    WHERE id = p_id;
END;
$$;

-- Restrict execute access on the functions to service_role only
REVOKE ALL ON FUNCTION public.fetch_and_lock_notification_events(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_notification_event_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fetch_and_lock_notification_events(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_notification_event_status(uuid, text, text) TO service_role;

-- 2. Drop old direct email triggers and functions if they exist
DROP TRIGGER IF EXISTS trigger_budget_changed_email ON public.budgets;
DROP FUNCTION IF EXISTS public.on_budget_changed_enqueue_email();
DROP TRIGGER IF EXISTS trigger_expense_changed_email ON public.expenses;
DROP FUNCTION IF EXISTS public.on_expense_changed_enqueue_email();

-- 3. Create Trigger function for public.budgets to queue lightweight events
CREATE OR REPLACE FUNCTION public.on_budget_changed_enqueue_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_payload jsonb;
BEGIN
    -- Determine user_id who made the change
    v_user_id := COALESCE(NEW.created_by, OLD.created_by);
    
    IF v_user_id IS NULL THEN
        v_user_id := auth.uid();
    END IF;

    -- Build payload with old and new values to let Express calculate differences
    v_payload := jsonb_build_object(
        'old_record', row_to_json(OLD),
        'new_record', row_to_json(NEW),
        'tg_op', TG_OP
    );

    INSERT INTO public.notification_events (
        event_type,
        actor_id,
        payload,
        status
    ) VALUES (
        CASE
            WHEN TG_OP = 'INSERT' THEN 'budget_created'
            WHEN TG_OP = 'UPDATE' THEN 'budget_updated'
            ELSE 'budget_deleted'
        END,
        v_user_id,
        v_payload,
        'pending'
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger to public.budgets
DROP TRIGGER IF EXISTS trigger_budget_changed_event ON public.budgets;
CREATE TRIGGER trigger_budget_changed_event
    AFTER INSERT OR UPDATE OR DELETE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.on_budget_changed_enqueue_event();

-- 4. Create Trigger function for public.expenses to queue lightweight events
CREATE OR REPLACE FUNCTION public.on_expense_changed_enqueue_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_payload jsonb;
    v_event_type text;
BEGIN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    IF v_user_id IS NULL THEN
        v_user_id := auth.uid();
    END IF;

    -- Build payload with old and new values
    v_payload := jsonb_build_object(
        'old_record', row_to_json(OLD),
        'new_record', row_to_json(NEW),
        'tg_op', TG_OP
    );

    IF TG_OP = 'INSERT' THEN
        v_event_type := 'expense_created';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            v_event_type := 'expense_deleted';
        ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
            v_event_type := 'expense_restored';
        ELSE
            v_event_type := 'expense_updated';
        END IF;
    ELSE
        v_event_type := 'expense_deleted';
    END IF;

    INSERT INTO public.notification_events (
        event_type,
        actor_id,
        payload,
        status
    ) VALUES (
        v_event_type,
        v_user_id,
        v_payload,
        'pending'
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger to public.expenses
DROP TRIGGER IF EXISTS trigger_expense_changed_event ON public.expenses;
CREATE TRIGGER trigger_expense_changed_event
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.on_expense_changed_enqueue_event();
