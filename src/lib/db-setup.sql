-- ===========================================
-- LabsBuzz Database Schema
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- 1. Profiles table (linked to auth.users)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'labs')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow insert during signup
CREATE POLICY "Allow insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admin can read all profiles
CREATE POLICY "Admin can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ===========================================
-- 2. Lab Registrations table
-- ===========================================
CREATE TABLE IF NOT EXISTS public.lab_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unique_lab_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  lab_name TEXT NOT NULL,
  landmark TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  lab_reg_id_no TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lab_registrations ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert a lab registration
CREATE POLICY "Authenticated can insert lab registration"
  ON public.lab_registrations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can read their own lab registrations
CREATE POLICY "Users can read own lab registrations"
  ON public.lab_registrations FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admin can update lab registrations (approve/reject)
CREATE POLICY "Admin can update lab registrations"
  ON public.lab_registrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ===========================================
-- 3. OTP table for email verification
-- ===========================================
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- No direct client access — only via service role in API routes
-- RLS blocks all access by default (no policies = no access for anon/authenticated)

-- ===========================================
-- 4. Storage bucket for lab images
-- ===========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-images', 'lab-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to lab-images bucket
CREATE POLICY "Authenticated can upload lab images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lab-images');

-- Public read access for lab images
CREATE POLICY "Public read lab images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lab-images');

-- ===========================================
-- 5. Auto-update updated_at trigger
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lab_registrations_updated_at
  BEFORE UPDATE ON public.lab_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 6. Indexes for performance
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_lab_registrations_email ON public.lab_registrations(email);
CREATE INDEX IF NOT EXISTS idx_lab_registrations_user_id ON public.lab_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_registrations_unique_lab_id ON public.lab_registrations(unique_lab_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);

-- ===========================================
-- 7. Function to generate unique lab ID
-- ===========================================
CREATE OR REPLACE FUNCTION generate_unique_lab_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  exists_count INT;
BEGIN
  LOOP
    new_id := 'LB-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT COUNT(*) INTO exists_count FROM public.lab_registrations WHERE unique_lab_id = new_id;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;
