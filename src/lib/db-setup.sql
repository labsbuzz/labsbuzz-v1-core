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
  pincode TEXT,
  latitude NUMERIC(10, 7) DEFAULT 0,
  longitude NUMERIC(10, 7) DEFAULT 0,
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
CREATE INDEX IF NOT EXISTS idx_lab_registrations_lat_lng ON public.lab_registrations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_lab_registrations_pincode ON public.lab_registrations(pincode);

-- ===========================================
-- 7. Available Tests (master list)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.available_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.available_tests ENABLE ROW LEVEL SECURITY;

-- Anyone can read available tests
CREATE POLICY "Public read available tests"
  ON public.available_tests FOR SELECT
  USING (true);

-- Seed 10 tests
INSERT INTO public.available_tests (name, category) VALUES
  ('Complete Blood Count (CBC)', 'Hematology'),
  ('Blood Sugar (Fasting)', 'Diabetes'),
  ('Lipid Profile', 'Cardiology'),
  ('Thyroid Profile (T3/T4/TSH)', 'Endocrinology'),
  ('Liver Function Test (LFT)', 'Hepatology'),
  ('Kidney Function Test (KFT)', 'Nephrology'),
  ('Urine Routine', 'General'),
  ('HbA1c', 'Diabetes'),
  ('Vitamin D', 'Nutrition'),
  ('Vitamin B12', 'Nutrition')
ON CONFLICT (name) DO NOTHING;

-- ===========================================
-- 8. Lab Services (tests offered by each lab)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.lab_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_registration_id UUID NOT NULL REFERENCES public.lab_registrations(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.available_tests(id) ON DELETE CASCADE,
  price_inr NUMERIC(10, 2) NOT NULL CHECK (price_inr > 0),
  prerequisite TEXT DEFAULT '',
  report_time_hours INT NOT NULL CHECK (report_time_hours > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lab_registration_id, test_id)
);

ALTER TABLE public.lab_services ENABLE ROW LEVEL SECURITY;

-- Lab owners can read their own services
CREATE POLICY "Lab owners can read own services"
  ON public.lab_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_registrations lr
      WHERE lr.id = lab_registration_id AND lr.user_id = auth.uid()
    )
  );

-- Lab owners can insert services for their own lab
CREATE POLICY "Lab owners can insert own services"
  ON public.lab_services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lab_registrations lr
      WHERE lr.id = lab_registration_id
        AND lr.user_id = auth.uid()
        AND lr.status = 'approved'
    )
  );

-- Lab owners can delete their own services
CREATE POLICY "Lab owners can delete own services"
  ON public.lab_services FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_registrations lr
      WHERE lr.id = lab_registration_id AND lr.user_id = auth.uid()
    )
  );

-- Admin can read all services
CREATE POLICY "Admin can read all lab services"
  ON public.lab_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_lab_services_updated_at
  BEFORE UPDATE ON public.lab_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lab_services_lab_reg_id ON public.lab_services(lab_registration_id);
CREATE INDEX IF NOT EXISTS idx_lab_services_test_id ON public.lab_services(test_id);

-- ===========================================
-- 9. Function to generate unique lab ID
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
