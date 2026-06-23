-- ============================================================
-- MIGRATION: Centralized Notifications Schema & Budget Metadata Update
-- Paste this entire script into Supabase SQL Editor and run it.
-- ============================================================

-- STEP 1: Drop legacy notifications table if it exists
DROP TABLE IF EXISTS public.notifications CASCADE;

-- STEP 2: Create notifications table matching the requirements
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STEP 3: Enable Row Level Security (RLS) on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create recursion-safe RLS policies for notifications
-- SELECT: Users can only view their own notifications
CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INSERT: Authenticated users can insert notifications for themselves, OR
-- for members in the same workspace (used for system transaction notifications)
CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
  );

-- UPDATE: Users can modify their own notifications (e.g. marking read)
CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own notifications
CREATE POLICY "notifications_delete_policy" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- STEP 5: Create performance indexes for notifications lookup and sorting
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON public.notifications (workspace_id);

-- STEP 6: Add editing and configuration columns to the budgets table
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS alerts BOOLEAN DEFAULT true;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS scope TEXT CHECK (scope IN ('personal', 'family')) DEFAULT 'personal';

-- STEP 7: Triggers for automated notifications

-- 7a. Trigger for family_members INSERT (family_member_joined)
CREATE OR REPLACE FUNCTION public.on_family_member_joined()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for all members in the family
  INSERT INTO public.notifications (user_id, family_id, type, title, message, is_read)
  SELECT 
    fm.profile_id,
    NEW.family_id,
    'family_invite',
    'Member Joined',
    'A new family member joined.',
    false
  FROM public.family_members fm
  WHERE fm.family_id = NEW.family_id
  UNION
  SELECT
    NEW.profile_id,
    NEW.family_id,
    'family_invite',
    'Member Joined',
    'A new family member joined.',
    false;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_family_member_joined ON public.family_members;
CREATE TRIGGER trigger_family_member_joined
  AFTER INSERT ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION public.on_family_member_joined();

-- 7b. Trigger for family_invites INSERT (family_member_invited)
CREATE OR REPLACE FUNCTION public.on_family_invite_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, family_id, type, title, message, is_read)
  VALUES (
    NEW.invited_by,
    NEW.family_id,
    'family_invite',
    'Invitation Sent',
    'Family invitation sent.',
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_family_invite_created ON public.family_invites;
CREATE TRIGGER trigger_family_invite_created
  AFTER INSERT ON public.family_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.on_family_invite_created();
