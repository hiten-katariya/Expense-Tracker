-- Filter presets table
CREATE TABLE filter_presets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL,
  sort_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Receipts OCR cache table
CREATE TABLE receipts_ocr_cache (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  expense_id uuid REFERENCES expenses(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES profiles(id),
  storage_path text NOT NULL,
  raw_ocr_text text,
  extracted_json jsonb NOT NULL DEFAULT '{}',
  confidence_score numeric(4,3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status text NOT NULL CHECK (status IN ('pending', 'processed', 'failed')) DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS
ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts_ocr_cache ENABLE ROW LEVEL SECURITY;

-- Filter presets RLS policies
CREATE POLICY "Users can view their presets" ON filter_presets FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert presets" ON filter_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update presets" ON filter_presets FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete presets" ON filter_presets FOR DELETE
  USING (auth.uid() = user_id);

-- Receipts OCR cache RLS policies
CREATE POLICY "Workspace members can view receipts" ON receipts_ocr_cache FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = receipts_ocr_cache.workspace_id AND wm.profile_id = auth.uid()
  ));
CREATE POLICY "Users can upload receipts" ON receipts_ocr_cache FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by AND EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = receipts_ocr_cache.workspace_id AND wm.profile_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_filter_presets_user ON filter_presets(user_id);
CREATE INDEX idx_receipts_workspace ON receipts_ocr_cache(workspace_id);
CREATE INDEX idx_receipts_expense ON receipts_ocr_cache(expense_id);

-- Trigger for filter_presets updated_at
CREATE TRIGGER filter_presets_updated_at
  BEFORE UPDATE ON filter_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to seed default categories for new workspaces
CREATE OR REPLACE FUNCTION seed_default_categories(workspace_uuid uuid, creator_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO categories (workspace_id, created_by, name, icon, color, is_default, sort_order) VALUES
    (workspace_uuid, creator_id, 'Food', '🍔', '#E74C3C', true, 1),
    (workspace_uuid, creator_id, 'Transport', '🚗', '#3498DB', true, 2),
    (workspace_uuid, creator_id, 'Housing', '🏠', '#9B59B6', true, 3),
    (workspace_uuid, creator_id, 'Health', '💊', '#27AE60', true, 4),
    (workspace_uuid, creator_id, 'Entertainment', '🎬', '#E67E22', true, 5),
    (workspace_uuid, creator_id, 'Shopping', '🛒', '#1ABC9C', true, 6),
    (workspace_uuid, creator_id, 'Education', '📚', '#34495E', true, 7),
    (workspace_uuid, creator_id, 'Utilities', '💡', '#F39C12', true, 8),
    (workspace_uuid, creator_id, 'Others', '📦', '#95A5A6', true, 9);
END;
$$ LANGUAGE plpgsql;

-- Update handle_new_user to seed categories
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  workspace_uuid uuid;
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  
  INSERT INTO workspaces (owner_id, name, is_personal)
  VALUES (NEW.id, 'Personal', true) RETURNING id INTO workspace_uuid;
  
  INSERT INTO workspace_members (workspace_id, profile_id, member_role, joined_at)
  VALUES (workspace_uuid, NEW.id, 'admin', now());
  
  PERFORM seed_default_categories(workspace_uuid, NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;