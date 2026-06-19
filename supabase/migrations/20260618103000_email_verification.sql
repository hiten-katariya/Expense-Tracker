-- Create verification_tokens table
CREATE TABLE IF NOT EXISTS verification_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on verification_tokens
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

-- RPC to verify email using a secure token (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION verify_user_email(token_value text)
RETURNS boolean AS $$
DECLARE
  token_rec record;
BEGIN
  -- Look up the token
  SELECT * INTO token_rec FROM verification_tokens WHERE token = token_value LIMIT 1;
  
  -- If token not found or expired
  IF token_rec IS NULL OR token_rec.expires_at < now() THEN
    RETURN false;
  END IF;
  
  -- Update profile verified status
  UPDATE profiles SET email_verified_at = now() WHERE id = token_rec.user_id;
  
  -- Delete the token after use
  DELETE FROM verification_tokens WHERE id = token_rec.id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to generate/regenerate verification token (SECURITY DEFINER)
-- Checks that the authenticated caller matches the target user_uuid
CREATE OR REPLACE FUNCTION resend_verification_token_authenticated(user_uuid uuid)
RETURNS text AS $$
DECLARE
  new_token text;
BEGIN
  -- Validate caller matches user_uuid
  IF auth.uid() IS NULL OR auth.uid() <> user_uuid THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Generate secure token using gen_random_bytes
  new_token := encode(gen_random_bytes(32), 'hex');
  
  -- Delete any existing token for this user
  DELETE FROM verification_tokens WHERE user_id = user_uuid;
  
  -- Insert the new token valid for 24 hours
  INSERT INTO verification_tokens (user_id, token, expires_at)
  VALUES (user_uuid, new_token, now() + interval '24 hours');
  
  RETURN new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
