-- 1. Enable pgvector extension for semantic search embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add AI columns to the expenses table if they don't exist
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS ai_category text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS ai_confidence numeric;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS ai_reviewed boolean DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS ai_reasoning text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_hash text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS ai_processed boolean DEFAULT false;

-- Add check constraint for ai_confidence in expenses table
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS chk_expenses_ai_confidence;
ALTER TABLE public.expenses ADD CONSTRAINT chk_expenses_ai_confidence CHECK (ai_confidence >= 0 AND ai_confidence <= 1);


-- 3. Create AI Categorizations table
CREATE TABLE IF NOT EXISTS public.ai_categorizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
    expense_id uuid REFERENCES public.expenses(id) ON DELETE CASCADE,
    suggested_category text NOT NULL,
    confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    reasoning text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    reviewed_at timestamp with time zone,
    reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    model text,
    prompt_version text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS and create policies for AI Categorizations
ALTER TABLE public.ai_categorizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own AI categorizations" ON public.ai_categorizations;
CREATE POLICY "Users can manage their own AI categorizations"
ON public.ai_categorizations
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 4. Create Receipt OCR Cache table
CREATE TABLE IF NOT EXISTS public.receipt_ocr_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receipt_hash text NOT NULL,
    ocr_text text NOT NULL,
    parsed_data jsonb NOT NULL,
    processing_time numeric,
    engine_version text,
    gemini_model text,
    ocr_language text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unique_user_receipt_hash UNIQUE (user_id, receipt_hash)
);

-- Enable RLS and create policies for Receipt OCR Cache
ALTER TABLE public.receipt_ocr_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own OCR cache" ON public.receipt_ocr_cache;
CREATE POLICY "Users can manage their own OCR cache"
ON public.receipt_ocr_cache
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 5. Create AI Chat Conversations table
CREATE TABLE IF NOT EXISTS public.ai_chat_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL DEFAULT 'New Conversation',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS and create policies for AI Chat Conversations
ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own chat conversations" ON public.ai_chat_conversations;
CREATE POLICY "Users can select their own chat conversations" ON public.ai_chat_conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own chat conversations" ON public.ai_chat_conversations;
CREATE POLICY "Users can insert their own chat conversations" ON public.ai_chat_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own chat conversations" ON public.ai_chat_conversations;
CREATE POLICY "Users can update their own chat conversations" ON public.ai_chat_conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chat conversations" ON public.ai_chat_conversations;
CREATE POLICY "Users can delete their own chat conversations" ON public.ai_chat_conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- 6. Create AI Chat History table
CREATE TABLE IF NOT EXISTS public.ai_chat_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    conversation_id uuid REFERENCES public.ai_chat_conversations(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS and create policies for AI Chat History
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own chat history" ON public.ai_chat_history;
DROP POLICY IF EXISTS "Users can select their own chat history" ON public.ai_chat_history;
CREATE POLICY "Users can select their own chat history" ON public.ai_chat_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own chat history" ON public.ai_chat_history;
CREATE POLICY "Users can insert their own chat history" ON public.ai_chat_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chat history" ON public.ai_chat_history;
CREATE POLICY "Users can delete their own chat history" ON public.ai_chat_history FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- 7. Create AI Monthly Insights table
CREATE TABLE IF NOT EXISTS public.ai_monthly_insights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
    month integer NOT NULL CHECK (month >= 1 AND month <= 12),
    year integer NOT NULL,
    summary text NOT NULL,
    savings_opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
    category_trends jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Ensure uniqueness per user, workspace, family, month, and year (handles NULLs properly using COALESCE)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_monthly_insights_idx
ON public.ai_monthly_insights (
    user_id,
    (COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    (COALESCE(family_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    month,
    year
);

-- Enable RLS and create policies for AI Monthly Insights
ALTER TABLE public.ai_monthly_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own monthly insights" ON public.ai_monthly_insights;
CREATE POLICY "Users can manage their own monthly insights"
ON public.ai_monthly_insights
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 8. Create Expense Embeddings table
CREATE TABLE IF NOT EXISTS public.expense_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id uuid REFERENCES public.expenses(id) ON DELETE CASCADE NOT NULL UNIQUE,
    embedding vector(768) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS and create policies for Expense Embeddings
ALTER TABLE public.expense_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own/family expense embeddings" ON public.expense_embeddings;
CREATE POLICY "Users can select their own/family expense embeddings"
ON public.expense_embeddings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_embeddings.expense_id
          AND (
              e.user_id = auth.uid() 
              OR (e.family_id IS NOT NULL AND e.family_id IN (SELECT family_id FROM public.get_user_family_memberships()))
          )
    )
);

DROP POLICY IF EXISTS "Users can insert/update/delete their own expense embeddings" ON public.expense_embeddings;
CREATE POLICY "Users can insert/update/delete their own expense embeddings"
ON public.expense_embeddings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_embeddings.expense_id
          AND e.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_embeddings.expense_id
          AND e.user_id = auth.uid()
    )
);


-- 9. Create Merchant Aliases table
CREATE TABLE IF NOT EXISTS public.merchant_aliases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    raw_name text NOT NULL,
    canonical_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unique_user_raw_merchant UNIQUE (user_id, raw_name)
);

-- Enable RLS and create policies for Merchant Aliases
ALTER TABLE public.merchant_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own merchant aliases" ON public.merchant_aliases;
CREATE POLICY "Users can manage their own merchant aliases"
ON public.merchant_aliases
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 10. Create Expense Predictions table
CREATE TABLE IF NOT EXISTS public.expense_predictions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    merchant text NOT NULL,
    merchant_hash text,
    amount numeric NOT NULL,
    predicted_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    times_seen integer DEFAULT 1 NOT NULL,
    accepted_count integer DEFAULT 0 NOT NULL,
    rejected_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS and create policies for Expense Predictions
ALTER TABLE public.expense_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own expense predictions" ON public.expense_predictions;
CREATE POLICY "Users can manage their own expense predictions"
ON public.expense_predictions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 11. Create AI Feedback table
CREATE TABLE IF NOT EXISTS public.ai_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    feature text NOT NULL,
    entity_id uuid,
    accepted boolean NOT NULL,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    user_comment text,
    meta_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS and create policies for AI Feedback
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own feedback" ON public.ai_feedback;
CREATE POLICY "Users can select their own feedback" ON public.ai_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.ai_feedback;
CREATE POLICY "Users can insert their own feedback" ON public.ai_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);


-- 12. Create AI Usage Logs table
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    endpoint text NOT NULL,
    prompt_tokens integer,
    completion_tokens integer,
    total_tokens integer,
    latency_ms integer,
    estimated_cost numeric,
    model text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS and create policies for AI Usage Logs
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own usage logs" ON public.ai_usage_logs;
CREATE POLICY "Users can view their own usage logs" ON public.ai_usage_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert usage logs" ON public.ai_usage_logs;
CREATE POLICY "System can insert usage logs" ON public.ai_usage_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);


-- 13. Create AI Rate Limits table
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    daily_request_count integer DEFAULT 0 NOT NULL,
    monthly_request_count integer DEFAULT 0 NOT NULL,
    last_request_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS and create policies for AI Rate Limits
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own rate limits" ON public.ai_rate_limits;
CREATE POLICY "Users can view their own rate limits" ON public.ai_rate_limits FOR SELECT TO authenticated USING (auth.uid() = user_id);


-- 14. Create vector match RPC function for semantic search
CREATE OR REPLACE FUNCTION public.match_expenses (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  expense_id uuid,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ee.expense_id,
    (1 - (ee.embedding <=> query_embedding))::float AS similarity
  FROM public.expense_embeddings ee
  JOIN public.expenses e ON ee.expense_id = e.id
  WHERE e.user_id = p_user_id
    AND 1 - (ee.embedding <=> query_embedding) > match_threshold
  ORDER BY ee.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


-- 15. Create indexes to optimize query performance
CREATE INDEX IF NOT EXISTS idx_ai_cat_user ON public.ai_categorizations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cat_expense ON public.ai_categorizations(expense_id);
CREATE INDEX IF NOT EXISTS idx_receipt_hash ON public.receipt_ocr_cache(receipt_hash);
CREATE INDEX IF NOT EXISTS idx_chat_user ON public.ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_user ON public.ai_monthly_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_user ON public.expense_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_user ON public.merchant_aliases(user_id);

-- RLS Performance Index for expenses table referenced in EXISTS clauses
CREATE INDEX IF NOT EXISTS idx_expenses_rls_perf ON public.expenses(id, user_id, family_id);

-- HNSW Index for expense embeddings vector search optimization
CREATE INDEX IF NOT EXISTS expense_embeddings_vector_idx
ON public.expense_embeddings
USING hnsw (embedding vector_cosine_ops);
