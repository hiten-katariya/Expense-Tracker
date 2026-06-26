-- 1. Drop existing audit_logs table to ensure it is created with the new schema
DROP TABLE IF EXISTS public.audit_logs CASCADE;

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    event_type VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add GDPR & Storage columns if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scheduled_delete_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS delete_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS delete_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gdpr_exported_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_storage_path TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_bucket TEXT DEFAULT 'receipts';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_object_path TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_signed_url_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_checksum TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_size BIGINT;

-- 3. Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS SELECT & INSERT Policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow service role inserts" ON public.audit_logs;
CREATE POLICY "Allow service role inserts" ON public.audit_logs
    FOR INSERT TO service_role WITH CHECK (true);

-- 5. Audit Log Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_profiles_scheduled_delete ON public.profiles(scheduled_delete_at) WHERE scheduled_delete_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_family ON public.audit_logs(family_id) WHERE family_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON public.audit_logs(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 6. Trigger function for expenses table
CREATE OR REPLACE FUNCTION public.log_expense_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event text;
    v_user_id uuid;
    v_actor_id uuid;
    v_headers json;
    v_ip text;
    v_user_agent text;
    v_old jsonb;
    v_new jsonb;
BEGIN
    -- Determine GUC header context (PostgREST connection info)
    BEGIN
        v_headers := current_setting('request.headers', true)::json;
        IF v_headers IS NOT NULL THEN
            v_ip := v_headers->>'x-forwarded-for';
            v_user_agent := v_headers->>'user-agent';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
        v_user_agent := NULL;
    END;

    -- Determine actor context
    v_actor_id := auth.uid();
    
    IF (TG_OP = 'INSERT') THEN
        v_new := jsonb_build_object(
            'title', NEW.title,
            'amount', NEW.amount,
            'category_id', NEW.category_id,
            'expense_date', NEW.expense_date,
            'payment_method', NEW.payment_method,
            'notes', NEW.notes,
            'is_deleted', NEW.is_deleted
        );

        INSERT INTO public.audit_logs (
            user_id, actor_id, family_id, workspace_id, entity_type, entity_id, event_type, old_value, new_value, ip_address, user_agent, created_at
        ) VALUES (
            NEW.user_id, COALESCE(v_actor_id, NEW.user_id), NEW.family_id, NEW.workspace_id, 'expense', NEW.id, 'expense_created', NULL, v_new, v_ip, v_user_agent, now()
        );
        RETURN NEW;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Skip trigger if no business values have actually changed (no-op check)
        IF OLD.title = NEW.title AND 
           OLD.amount = NEW.amount AND 
           (OLD.category_id IS NOT DISTINCT FROM NEW.category_id) AND 
           OLD.expense_date = NEW.expense_date AND 
           OLD.payment_method = NEW.payment_method AND 
           (OLD.notes IS NOT DISTINCT FROM NEW.notes) AND 
           OLD.is_deleted = NEW.is_deleted AND
           (OLD.receipt_object_path IS NOT DISTINCT FROM NEW.receipt_object_path) THEN
            RETURN NEW;
        END IF;

        v_event := 'expense_updated';
        IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
            v_event := 'expense_deleted';
        ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
            v_event := 'expense_restored';
        END IF;

        v_old := jsonb_build_object(
            'title', OLD.title,
            'amount', OLD.amount,
            'category_id', OLD.category_id,
            'expense_date', OLD.expense_date,
            'payment_method', OLD.payment_method,
            'notes', OLD.notes,
            'is_deleted', OLD.is_deleted
        );
        v_new := jsonb_build_object(
            'title', NEW.title,
            'amount', NEW.amount,
            'category_id', NEW.category_id,
            'expense_date', NEW.expense_date,
            'payment_method', NEW.payment_method,
            'notes', NEW.notes,
            'is_deleted', NEW.is_deleted
        );

        INSERT INTO public.audit_logs (
            user_id, actor_id, family_id, workspace_id, entity_type, entity_id, event_type, old_value, new_value, ip_address, user_agent, created_at
        ) VALUES (
            NEW.user_id, COALESCE(v_actor_id, NEW.user_id), NEW.family_id, NEW.workspace_id, 'expense', NEW.id, v_event, v_old, v_new, v_ip, v_user_agent, now()
        );
        RETURN NEW;
        
    ELSIF (TG_OP = 'DELETE') THEN
        v_old := jsonb_build_object(
            'title', OLD.title,
            'amount', OLD.amount,
            'category_id', OLD.category_id,
            'expense_date', OLD.expense_date,
            'payment_method', OLD.payment_method,
            'notes', OLD.notes,
            'is_deleted', OLD.is_deleted
        );

        INSERT INTO public.audit_logs (
            user_id, actor_id, family_id, workspace_id, entity_type, entity_id, event_type, old_value, new_value, ip_address, user_agent, created_at
        ) VALUES (
            OLD.user_id, COALESCE(v_actor_id, OLD.user_id), OLD.family_id, OLD.workspace_id, 'expense', OLD.id, 'expense_permanently_deleted', v_old, NULL, v_ip, v_user_agent, now()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Attach trigger to public.expenses
DROP TRIGGER IF EXISTS trigger_expense_audit ON public.expenses;
CREATE TRIGGER trigger_expense_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.log_expense_audit();

-- 7. Trigger function for budgets table
CREATE OR REPLACE FUNCTION public.log_budget_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_actor_id uuid;
    v_headers json;
    v_ip text;
    v_user_agent text;
    v_old jsonb;
    v_new jsonb;
BEGIN
    -- Determine GUC header context (PostgREST connection info)
    BEGIN
        v_headers := current_setting('request.headers', true)::json;
        IF v_headers IS NOT NULL THEN
            v_ip := v_headers->>'x-forwarded-for';
            v_user_agent := v_headers->>'user-agent';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
        v_user_agent := NULL;
    END;

    -- Determine actor context
    v_actor_id := auth.uid();
    
    IF (TG_OP = 'INSERT') THEN
        v_new := jsonb_build_object(
            'amount', NEW.amount,
            'category_id', NEW.category_id,
            'family_id', NEW.family_id,
            'workspace_id', NEW.workspace_id
        );

        INSERT INTO public.audit_logs (
            user_id, actor_id, family_id, workspace_id, entity_type, entity_id, event_type, old_value, new_value, ip_address, user_agent, created_at
        ) VALUES (
            NEW.created_by, COALESCE(v_actor_id, NEW.created_by), NEW.family_id, NEW.workspace_id, 'budget', NEW.id, 'budget_created', NULL, v_new, v_ip, v_user_agent, now()
        );
        RETURN NEW;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Skip trigger if no business values have actually changed (no-op check)
        IF OLD.amount = NEW.amount AND 
           (OLD.category_id IS NOT DISTINCT FROM NEW.category_id) AND 
           (OLD.family_id IS NOT DISTINCT FROM NEW.family_id) AND 
           (OLD.workspace_id IS NOT DISTINCT FROM NEW.workspace_id) THEN
            RETURN NEW;
        END IF;

        v_old := jsonb_build_object(
            'amount', OLD.amount,
            'category_id', OLD.category_id,
            'family_id', OLD.family_id,
            'workspace_id', OLD.workspace_id
        );
        v_new := jsonb_build_object(
            'amount', NEW.amount,
            'category_id', NEW.category_id,
            'family_id', NEW.family_id,
            'workspace_id', NEW.workspace_id
        );

        INSERT INTO public.audit_logs (
            user_id, actor_id, family_id, workspace_id, entity_type, entity_id, event_type, old_value, new_value, ip_address, user_agent, created_at
        ) VALUES (
            NEW.created_by, COALESCE(v_actor_id, NEW.created_by), NEW.family_id, NEW.workspace_id, 'budget', NEW.id, 'budget_updated', v_old, v_new, v_ip, v_user_agent, now()
        );
        RETURN NEW;
        
    ELSIF (TG_OP = 'DELETE') THEN
        v_old := jsonb_build_object(
            'amount', OLD.amount,
            'category_id', OLD.category_id,
            'family_id', OLD.family_id,
            'workspace_id', OLD.workspace_id
        );

        INSERT INTO public.audit_logs (
            user_id, actor_id, family_id, workspace_id, entity_type, entity_id, event_type, old_value, new_value, ip_address, user_agent, created_at
        ) VALUES (
            OLD.created_by, COALESCE(v_actor_id, OLD.created_by), OLD.family_id, OLD.workspace_id, 'budget', OLD.id, 'budget_deleted', v_old, NULL, v_ip, v_user_agent, now()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Attach trigger to public.budgets
DROP TRIGGER IF EXISTS trigger_budget_audit ON public.budgets;
CREATE TRIGGER trigger_budget_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.budgets
    FOR EACH ROW EXECUTE FUNCTION public.log_budget_audit();
