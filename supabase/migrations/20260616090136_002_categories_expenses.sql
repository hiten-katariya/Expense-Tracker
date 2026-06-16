-- Categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  icon text,
  color varchar(7),
  monthly_limit numeric(12,2),
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, parent_id, name)
);

-- Expenses table
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  family_id uuid, -- References families table (created later)
  user_id uuid NOT NULL REFERENCES profiles(id),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  expense_scope text NOT NULL DEFAULT 'personal' CHECK (expense_scope IN ('personal', 'family')),
  title text NOT NULL,
  notes text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  amount_in_base_currency numeric(12,2),
  expense_date date NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'netbanking', 'other')),
  tags text[] NOT NULL DEFAULT '{}',
  receipt_url text,
  ai_category_suggestion text,
  ai_confidence numeric(4,3) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_interval text CHECK (recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
  is_flagged boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Categories RLS policies
CREATE POLICY "Workspace members can view categories" ON categories FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = categories.workspace_id AND wm.profile_id = auth.uid()
  ));
CREATE POLICY "Workspace admins can insert categories" ON categories FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = categories.workspace_id AND wm.profile_id = auth.uid() AND wm.member_role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM workspaces w WHERE w.id = categories.workspace_id AND w.owner_id = auth.uid()
  ));
CREATE POLICY "Workspace admins can update categories" ON categories FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = categories.workspace_id AND wm.profile_id = auth.uid() AND wm.member_role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM workspaces w WHERE w.id = categories.workspace_id AND w.owner_id = auth.uid()
  ));
CREATE POLICY "Workspace admins can delete categories" ON categories FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = categories.workspace_id AND wm.profile_id = auth.uid() AND wm.member_role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM workspaces w WHERE w.id = categories.workspace_id AND w.owner_id = auth.uid()
  ));

-- Expenses RLS policies
CREATE POLICY "Users can view their expenses" ON expenses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = expenses.workspace_id AND wm.profile_id = auth.uid()
  ));
CREATE POLICY "Users can insert expenses" ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = expenses.workspace_id AND wm.profile_id = auth.uid()
  ));
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE
  USING (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = expenses.workspace_id AND wm.profile_id = auth.uid()
  ));
CREATE POLICY "Users can soft delete own expenses" ON expenses FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_categories_workspace ON categories(workspace_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_expenses_workspace ON expenses(workspace_id);
CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX idx_expenses_workspace_date ON expenses(workspace_id, expense_date DESC);
CREATE INDEX idx_expenses_tags ON expenses USING gin(tags);

-- Full-text search index
CREATE INDEX idx_expenses_search ON expenses USING gin(to_tsvector('simple', title || ' ' || coalesce(notes, '')));

-- Triggers for updated_at
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();