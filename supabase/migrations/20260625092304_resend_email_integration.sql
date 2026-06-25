-- 1. Create email_preferences table
CREATE TABLE IF NOT EXISTS public.email_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    marketing_emails boolean NOT NULL DEFAULT true,
    budget_emails boolean NOT NULL DEFAULT true,
    family_emails boolean NOT NULL DEFAULT true,
    workspace_emails boolean NOT NULL DEFAULT true,
    ai_emails boolean NOT NULL DEFAULT true,
    monthly_reports boolean NOT NULL DEFAULT true,
    weekly_reports boolean NOT NULL DEFAULT true,
    security_emails boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unique_user_email_preferences UNIQUE (user_id)
);

-- Enable RLS for email_preferences
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Set up idempotent RLS policies for email_preferences
DROP POLICY IF EXISTS "Users can manage their own email preferences" ON public.email_preferences;
CREATE POLICY "Users can manage their own email preferences"
ON public.email_preferences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    recipient text NOT NULL,
    template_name text NOT NULL,
    subject text NOT NULL,
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped', 'opened', 'clicked')),
    retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    error_message text,
    payload jsonb,
    resend_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS for email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Set up idempotent RLS policies for email_logs
DROP POLICY IF EXISTS "Users can view their own email logs" ON public.email_logs;
CREATE POLICY "Users can view their own email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id 
    OR recipient = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
);

-- 3. Create indices for performance optimization
CREATE INDEX IF NOT EXISTS idx_email_logs_status_retry ON public.email_logs(status, retry_count);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
