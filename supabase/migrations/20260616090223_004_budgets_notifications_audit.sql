-- Budgets table
CREATE TABLE budgets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  budget_type text NOT NULL CHECK (budget_type IN ('monthly', 'yearly')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  starts_on date NOT NULL,
  ends_on date,
  alert_50_sent_at timestamptz,
  alert_80_sent_at timestamptz,
  alert_100_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('budget', 'anomaly', 'summary', 'reminder', 'verification', 'family_invite')),
  title text NOT NULL,
  body text NOT NULL,
  entity_type text,
  entity_id uuid,
  channel text NOT NULL CHECK (channel IN ('in_app', 'email', 'push')),
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore', 'import', 'export')),
  before_data jsonb,
  after_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Budgets RLS policies
CREATE POLICY "Workspace members can view budgets" ON budgets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = budgets.workspace_id AND wm.profile_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM family_members fm WHERE fm.family_id = budgets.family_id AND fm.profile_id = auth.uid()
  ));
CREATE POLICY "Workspace admins can insert budgets" ON budgets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = budgets.workspace_id AND wm.profile_id = auth.uid() AND wm.member_role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM workspaces w WHERE w.id = budgets.workspace_id AND w.owner_id = auth.uid()
  ));
CREATE POLICY "Workspace admins can update budgets" ON budgets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = budgets.workspace_id AND wm.profile_id = auth.uid() AND wm.member_role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM workspaces w WHERE w.id = budgets.workspace_id AND w.owner_id = auth.uid()
  ));
CREATE POLICY "Workspace admins can delete budgets" ON budgets FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = budgets.workspace_id AND wm.profile_id = auth.uid() AND wm.member_role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM workspaces w WHERE w.id = budgets.workspace_id AND w.owner_id = auth.uid()
  ));

-- Notifications RLS policies
CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT
  WITH CHECK (true);

-- Audit logs RLS policies
CREATE POLICY "Workspace members can view audit logs" ON audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = audit_logs.workspace_id AND wm.profile_id = auth.uid()
  ));
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_budgets_workspace ON budgets(workspace_id);
CREATE INDEX idx_budgets_category ON budgets(category_id);
CREATE INDEX idx_budgets_family ON budgets(family_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id, created_at DESC);

-- Trigger for budgets updated_at
CREATE TRIGGER budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();