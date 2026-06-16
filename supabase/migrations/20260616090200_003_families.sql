-- Families table
CREATE TABLE families (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  monthly_budget numeric(12,2),
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  invite_code text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Family members
CREATE TABLE family_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_role text NOT NULL CHECK (member_role IN ('admin', 'member')),
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, profile_id)
);

-- Family invites
CREATE TABLE family_invites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES profiles(id),
  invite_token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at timestamptz NOT NULL,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

-- Families RLS policies
CREATE POLICY "Family members can view family" ON families FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM family_members fm WHERE fm.family_id = families.id AND fm.profile_id = auth.uid()
  ) OR owner_id = auth.uid());
CREATE POLICY "Users can create family" ON families FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Family admins can update" ON families FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM family_members fm WHERE fm.family_id = families.id AND fm.profile_id = auth.uid() AND fm.member_role = 'admin'
  ) OR owner_id = auth.uid());
CREATE POLICY "Family owner can delete" ON families FOR DELETE
  USING (auth.uid() = owner_id);

-- Family members RLS policies
CREATE POLICY "Family members can view members" ON family_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM family_members fm WHERE fm.family_id = family_members.family_id AND fm.profile_id = auth.uid()
  ));
CREATE POLICY "Family admins can insert members" ON family_members FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM family_members fm WHERE fm.family_id = family_members.family_id AND fm.profile_id = auth.uid() AND fm.member_role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM families f WHERE f.id = family_members.family_id AND f.owner_id = auth.uid()
  ));
CREATE POLICY "Family admins can delete members" ON family_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM family_members fm WHERE fm.family_id = family_members.family_id AND fm.profile_id = auth.uid() AND fm.member_role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM families f WHERE f.id = family_members.family_id AND f.owner_id = auth.uid()
  ));

-- Family invites RLS policies
CREATE POLICY "Users can view their invites" ON family_invites FOR SELECT
  USING (invited_by = auth.uid() OR invited_email = (SELECT email FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Family admins can create invites" ON family_invites FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM family_members fm WHERE fm.family_id = family_invites.family_id AND fm.profile_id = auth.uid() AND fm.member_role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM families f WHERE f.id = family_invites.family_id AND f.owner_id = auth.uid()
  ));
CREATE POLICY "Invited users can update invite status" ON family_invites FOR UPDATE
  USING (invited_email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Add family_id foreign key to expenses
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_families_owner ON families(owner_id);
CREATE INDEX idx_family_members_profile ON family_members(profile_id);
CREATE INDEX idx_family_members_family ON family_members(family_id);
CREATE INDEX idx_expenses_family ON expenses(family_id) WHERE family_id IS NOT NULL;
CREATE INDEX idx_family_invites_token ON family_invites(invite_token);

-- Triggers
CREATE TRIGGER families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to generate invite code on family creation
CREATE OR REPLACE FUNCTION generate_family_invite_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code = upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER families_invite_code
  BEFORE INSERT ON families
  FOR EACH ROW EXECUTE FUNCTION generate_family_invite_code();

-- Function to add owner as admin member on family creation
CREATE OR REPLACE FUNCTION handle_new_family()
RETURNS trigger AS $$
BEGIN
  INSERT INTO family_members (family_id, profile_id, member_role, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'admin', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_family_created
  AFTER INSERT ON families
  FOR EACH ROW EXECUTE FUNCTION handle_new_family();