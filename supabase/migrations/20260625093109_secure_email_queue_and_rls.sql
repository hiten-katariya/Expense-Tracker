-- UP MIGRATION - Secure Email Queue RPC and Harden RLS Policies

-- 1. Harden RLS policies on public.email_logs by querying public.profiles instead of auth.users
DROP POLICY IF EXISTS "Users can view their own email logs" ON public.email_logs;

CREATE POLICY "Users can view their own email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id 
    OR recipient = (
        SELECT p.email
        FROM public.profiles p
        WHERE p.id = auth.uid()
    )
);

-- 2. Drop old queue helper functions that use the p_secret parameter
DROP FUNCTION IF EXISTS public.fetch_and_lock_queued_emails(int, text);
DROP FUNCTION IF EXISTS public.update_email_log_status(uuid, text, int, text, text, text);

-- 3. Re-create queue helper functions without the p_secret parameter
CREATE OR REPLACE FUNCTION public.fetch_and_lock_queued_emails(p_limit int)
RETURNS SETOF public.email_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.email_logs
    SET status = 'processing',
        updated_at = now()
    WHERE id IN (
        SELECT id 
        FROM public.email_logs
        WHERE status = 'queued' AND retry_count < 3
        ORDER BY created_at ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_email_log_status(
    p_id uuid,
    p_status text,
    p_retry_count int,
    p_error_message text,
    p_resend_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.email_logs
    SET status = p_status,
        retry_count = p_retry_count,
        error_message = p_error_message,
        resend_id = p_resend_id,
        updated_at = now()
    WHERE id = p_id;
END;
$$;

-- 4. Restrict execute access on the functions to public.service_role only
REVOKE ALL ON FUNCTION public.fetch_and_lock_queued_emails(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_email_log_status(uuid, text, int, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.fetch_and_lock_queued_emails(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_email_log_status(uuid, text, int, text, text) TO service_role;
