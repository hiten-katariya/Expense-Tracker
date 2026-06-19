-- Alter profiles table to add contact details columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pincode text;

-- Update trigger function to copy contact details from auth metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url, phone_number, city, state, country, pincode)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'pincode'
  );
  
  INSERT INTO workspaces (owner_id, name, is_personal)
  VALUES (NEW.id, 'Personal', true);
  
  INSERT INTO workspace_members (workspace_id, profile_id, member_role, joined_at)
  SELECT id, NEW.id, 'admin', now() FROM workspaces WHERE owner_id = NEW.id AND is_personal = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
