-- 1. Add preferred_currency, email_verified, and profile_completed columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'INR';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- 2. Create helper trigger function to dynamically calculate profile completeness & sync currencies
CREATE OR REPLACE FUNCTION public.compute_profile_completed()
RETURNS trigger AS $$
BEGIN
  -- Compute profile_completed boolean value based on non-empty values
  NEW.profile_completed := (
    NEW.full_name IS NOT NULL AND NEW.full_name <> '' AND
    NEW.phone_number IS NOT NULL AND NEW.phone_number <> '' AND
    NEW.city IS NOT NULL AND NEW.city <> '' AND
    NEW.state IS NOT NULL AND NEW.state <> '' AND
    NEW.country IS NOT NULL AND NEW.country <> '' AND
    NEW.pincode IS NOT NULL AND NEW.pincode <> '' AND
    COALESCE(NEW.preferred_currency, NEW.currency_code) IS NOT NULL AND
    COALESCE(NEW.preferred_currency, NEW.currency_code) <> ''
  );

  -- Sync preferred_currency and currency_code columns
  IF NEW.preferred_currency IS NOT NULL AND NEW.preferred_currency <> '' THEN
    NEW.currency_code := NEW.preferred_currency;
  ELSIF NEW.currency_code IS NOT NULL AND NEW.currency_code <> '' THEN
    NEW.preferred_currency := NEW.currency_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind the compute trigger BEFORE insert or update on public.profiles
DROP TRIGGER IF EXISTS on_profile_completed_check ON public.profiles;
CREATE TRIGGER on_profile_completed_check
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.compute_profile_completed();

-- 4. Re-define handle_new_user() to create profiles automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_verified boolean;
  full_name text;
  avatar_url text;
  phone text;
  city text;
  state text;
  country text;
  pincode text;
  currency text;
  completed boolean;
BEGIN
  -- Derive email verification status
  is_verified := (NEW.email_confirmed_at IS NOT NULL OR NEW.confirmed_at IS NOT NULL);
  
  -- Gather metadata from raw_user_meta_data
  full_name := NEW.raw_user_meta_data->>'full_name';
  avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  phone := NEW.raw_user_meta_data->>'phone_number';
  city := NEW.raw_user_meta_data->>'city';
  state := NEW.raw_user_meta_data->>'state';
  country := NEW.raw_user_meta_data->>'country';
  pincode := NEW.raw_user_meta_data->>'pincode';
  currency := COALESCE(NEW.raw_user_meta_data->>'preferred_currency', NEW.raw_user_meta_data->>'currency_code', 'INR');
  
  -- Calculate initial profile completeness
  completed := (
    full_name IS NOT NULL AND full_name <> '' AND
    phone IS NOT NULL AND phone <> '' AND
    city IS NOT NULL AND city <> '' AND
    state IS NOT NULL AND state <> '' AND
    country IS NOT NULL AND country <> '' AND
    pincode IS NOT NULL AND pincode <> ''
  );

  -- Insert profile
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    phone_number,
    city,
    state,
    country,
    pincode,
    currency_code,
    preferred_currency,
    email_verified,
    profile_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    full_name,
    avatar_url,
    phone,
    city,
    state,
    country,
    pincode,
    currency,
    currency,
    is_verified,
    completed
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    phone_number = COALESCE(profiles.phone_number, EXCLUDED.phone_number),
    city = COALESCE(profiles.city, EXCLUDED.city),
    state = COALESCE(profiles.state, EXCLUDED.state),
    country = COALESCE(profiles.country, EXCLUDED.country),
    pincode = COALESCE(profiles.pincode, EXCLUDED.pincode),
    email_verified = public.profiles.email_verified OR EXCLUDED.email_verified;

  -- Create default workspace
  INSERT INTO public.workspaces (owner_id, name, is_personal, default_currency_code)
  VALUES (NEW.id, 'Personal', true, currency)
  ON CONFLICT DO NOTHING;

  -- Enroll user as administrator of their workspace
  INSERT INTO public.workspace_members (workspace_id, profile_id, member_role, joined_at)
  SELECT id, NEW.id, 'admin', now() FROM public.workspaces 
  WHERE owner_id = NEW.id AND is_personal = true
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-define the email verification RPC to update profile verified state
CREATE OR REPLACE FUNCTION public.verify_user_email(token_value text)
RETURNS boolean AS $$
DECLARE
  token_rec record;
BEGIN
  -- Look up token details
  SELECT * INTO token_rec FROM public.verification_tokens WHERE token = token_value LIMIT 1;

  -- If token invalid or expired
  IF token_rec IS NULL OR token_rec.expires_at < now() THEN
    RETURN false;
  END IF;

  -- Update email verified flags in profiles
  UPDATE public.profiles 
  SET email_verified_at = now(),
      email_verified = true 
  WHERE id = token_rec.user_id;

  -- Clean up verification token
  DELETE FROM public.verification_tokens WHERE id = token_rec.id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
