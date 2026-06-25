-- UP MIGRATION - Add Automated Email Queue Triggers for Budgets

-- 1. Trigger function for public.budgets to enqueue email logs on changes
CREATE OR REPLACE FUNCTION public.on_budget_changed_enqueue_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_recipient text;
    v_category_name text;
    v_pref_enabled boolean;
    v_template_name text;
    v_subject text;
    v_payload jsonb;
BEGIN
    -- Determine user_id who made the change. If insert, NEW.created_by. If update/delete, COALESCE(NEW.created_by, OLD.created_by)
    v_user_id := COALESCE(NEW.created_by, OLD.created_by);
    
    -- If no user_id is resolved, use the currently logged-in auth.uid()
    IF v_user_id IS NULL THEN
        v_user_id := auth.uid();
    END IF;

    IF v_user_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Get email recipient
    SELECT email INTO v_recipient FROM public.profiles WHERE id = v_user_id;
    IF v_recipient IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Get category name
    SELECT name INTO v_category_name FROM public.categories WHERE id = COALESCE(NEW.category_id, OLD.category_id);
    IF v_category_name IS NULL THEN
        v_category_name := 'Overall';
    END IF;

    -- Check if preference is enabled
    SELECT COALESCE(budget_emails, true) INTO v_pref_enabled
    FROM public.email_preferences
    WHERE user_id = v_user_id;

    IF v_pref_enabled IS NULL THEN
        v_pref_enabled := true;
    END IF;

    IF v_pref_enabled THEN
        IF TG_OP = 'INSERT' THEN
            v_template_name := 'Budget Created';
            v_subject := 'Budget Alert: limit set for ' || v_category_name;
            v_payload := jsonb_build_object(
                'categoryName', v_category_name,
                'limit', NEW.amount,
                'startsOn', COALESCE(NEW.starts_on, '')
            );
        ELSIF TG_OP = 'UPDATE' THEN
            -- Only trigger if amount changed
            IF OLD.amount = NEW.amount THEN
                RETURN NEW;
            END IF;
            v_template_name := 'Budget Updated';
            v_subject := 'Budget Alert: limit modified for ' || v_category_name;
            v_payload := jsonb_build_object(
                'categoryName', v_category_name,
                'oldLimit', OLD.amount,
                'newLimit', NEW.amount
            );
        ELSIF TG_OP = 'DELETE' THEN
            v_template_name := 'Budget Deleted';
            v_subject := 'Budget Alert: limit removed for ' || v_category_name;
            v_payload := jsonb_build_object(
                'categoryName', v_category_name,
                'limit', OLD.amount
            );
        END IF;

        INSERT INTO public.email_logs (
            user_id,
            recipient,
            template_name,
            subject,
            status,
            payload
        ) VALUES (
            v_user_id,
            v_recipient,
            v_template_name,
            v_subject,
            'queued',
            v_payload
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_budget_changed_email ON public.budgets;
CREATE TRIGGER trigger_budget_changed_email
    AFTER INSERT OR UPDATE OR DELETE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.on_budget_changed_enqueue_email();

