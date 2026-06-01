-- Epic 36.1: User Roles & Permissions Foundation

-- Create user_role enum type
CREATE TYPE user_role AS ENUM ('csm', 'csm_senior', 'head_cs', 'admin', 'super_admin');

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role user_role NOT NULL DEFAULT 'csm',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on role for RLS checks
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profile policies: users can view profiles (public data), only super_admin can update roles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Super admin can update any profile"
  ON public.profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.fn_create_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'csm')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_profile_on_signup ON auth.users;
CREATE TRIGGER trigger_create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_create_profile_on_signup();

-- Sync role to JWT claims whenever profile.role changes
CREATE OR REPLACE FUNCTION public.fn_sync_role_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role::text)
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_role_to_jwt_insert ON public.profiles;
CREATE TRIGGER trigger_sync_role_to_jwt_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_role_to_jwt();

DROP TRIGGER IF EXISTS trigger_sync_role_to_jwt_update ON public.profiles;
CREATE TRIGGER trigger_sync_role_to_jwt_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.fn_sync_role_to_jwt();

-- Update critical RLS policies to respect role hierarchy
-- For accounts table: CSM sees own, head_cs+ sees all
DROP POLICY IF EXISTS "CSM can see their accounts" ON public.accounts;
CREATE POLICY "CSM can see their accounts"
  ON public.accounts FOR SELECT
  USING (
    csm_owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('head_cs', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "CSM can update their accounts" ON public.accounts;
CREATE POLICY "CSM can update their accounts"
  ON public.accounts FOR UPDATE
  USING (
    csm_owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('head_cs', 'admin', 'super_admin'))
  )
  WITH CHECK (
    csm_owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('head_cs', 'admin', 'super_admin'))
  );

-- For contacts table via account ownership
DROP POLICY IF EXISTS "Users can see contacts from their accounts" ON public.contacts;
CREATE POLICY "Users can see contacts from their accounts"
  ON public.contacts FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM public.accounts
      WHERE csm_owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('head_cs', 'admin', 'super_admin'))
    )
  );

-- Audit log: record all role changes
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  target_user_id uuid REFERENCES auth.users(id),
  changed_by uuid REFERENCES auth.users(id),
  old_value text,
  new_value text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_log_event_type ON public.audit_log(event_type);
CREATE INDEX idx_audit_log_user_id ON public.audit_log(target_user_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit log for their own actions"
  ON public.audit_log FOR SELECT
  USING (changed_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Log role changes to audit log
CREATE OR REPLACE FUNCTION public.fn_audit_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.audit_log (event_type, user_id, target_user_id, changed_by, old_value, new_value)
    VALUES ('role_changed', NEW.id, NEW.id, auth.uid(), OLD.role::text, NEW.role::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_audit_role_change ON public.profiles;
CREATE TRIGGER trigger_audit_role_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_role_change();

-- Update profiles.updated_at timestamp
CREATE OR REPLACE FUNCTION public.fn_update_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_profiles_updated_at();
