-- Ensure soft delete columns exist (may already be present from initial migration)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Import tracking columns
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS import_source text CHECK (import_source IN ('manual','csv','ai'));
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS import_batch_id uuid;

-- Performance indexes for trash page and import history
CREATE INDEX IF NOT EXISTS idx_expenses_trash
  ON public.expenses(workspace_id, deleted_at DESC)
  WHERE is_deleted = true;

CREATE INDEX IF NOT EXISTS idx_expenses_import
  ON public.expenses(workspace_id, import_batch_id)
  WHERE import_batch_id IS NOT NULL;
