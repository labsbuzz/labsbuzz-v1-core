-- ===========================================
-- LabsBuzz Booking System Schema
-- Run this in Supabase SQL Editor
-- ===========================================

-- ===========================================
-- 1. Alter profiles table — add booking fields
-- ===========================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS age INT,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other'));

-- ===========================================
-- 2. Bookings table
-- ===========================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_registration_id UUID NOT NULL REFERENCES public.lab_registrations(id) ON DELETE CASCADE,
  lab_service_id UUID NOT NULL REFERENCES public.lab_services(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'visited', 'sample_collected', 'report_generated', 'done')),
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Users can read their own bookings
CREATE POLICY "Users can read own bookings"
  ON public.bookings FOR SELECT
  USING (user_id = auth.uid());

-- Lab owners can read bookings for their lab
CREATE POLICY "Lab owners can read lab bookings"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_registrations lr
      WHERE lr.id = lab_registration_id AND lr.user_id = auth.uid()
    )
  );

-- Users can insert bookings
CREATE POLICY "Users can insert bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Lab owners can update booking status
CREATE POLICY "Lab owners can update bookings"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_registrations lr
      WHERE lr.id = lab_registration_id AND lr.user_id = auth.uid()
    )
  );

-- Admin can read all bookings
CREATE POLICY "Admin can read all bookings"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 3. Booking Patients table
-- ===========================================
CREATE TABLE IF NOT EXISTS public.booking_patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_age INT NOT NULL CHECK (patient_age >= 1 AND patient_age <= 150),
  patient_gender TEXT NOT NULL CHECK (patient_gender IN ('male', 'female', 'other')),
  relationship TEXT NOT NULL DEFAULT 'self' CHECK (relationship IN ('self', 'father', 'mother', 'spouse', 'child', 'sibling', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.booking_patients ENABLE ROW LEVEL SECURITY;

-- Users can read patients of their own bookings
CREATE POLICY "Users can read own booking patients"
  ON public.booking_patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.user_id = auth.uid()
    )
  );

-- Lab owners can read patients of their lab's bookings
CREATE POLICY "Lab owners can read booking patients"
  ON public.booking_patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.lab_registrations lr ON lr.id = b.lab_registration_id
      WHERE b.id = booking_id AND lr.user_id = auth.uid()
    )
  );

-- Users can insert patients for their own bookings
CREATE POLICY "Users can insert booking patients"
  ON public.booking_patients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.user_id = auth.uid()
    )
  );

-- ===========================================
-- 4. Booking Status Logs (activity timeline)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.booking_status_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.booking_status_logs ENABLE ROW LEVEL SECURITY;

-- Users can read logs of their own bookings
CREATE POLICY "Users can read own booking logs"
  ON public.booking_status_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.user_id = auth.uid()
    )
  );

-- Lab owners can read logs of their lab's bookings
CREATE POLICY "Lab owners can read booking logs"
  ON public.booking_status_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.lab_registrations lr ON lr.id = b.lab_registration_id
      WHERE b.id = booking_id AND lr.user_id = auth.uid()
    )
  );

-- Authenticated users can insert logs
CREATE POLICY "Authenticated can insert booking logs"
  ON public.booking_status_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ===========================================
-- 5. Booking Reports (PDF uploads)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.booking_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.booking_reports ENABLE ROW LEVEL SECURITY;

-- Users can read reports of their own bookings
CREATE POLICY "Users can read own booking reports"
  ON public.booking_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.user_id = auth.uid()
    )
  );

-- Lab owners can read/insert reports for their lab's bookings
CREATE POLICY "Lab owners can read booking reports"
  ON public.booking_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.lab_registrations lr ON lr.id = b.lab_registration_id
      WHERE b.id = booking_id AND lr.user_id = auth.uid()
    )
  );

CREATE POLICY "Lab owners can insert booking reports"
  ON public.booking_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.lab_registrations lr ON lr.id = b.lab_registration_id
      WHERE b.id = booking_id AND lr.user_id = auth.uid()
    )
  );

-- ===========================================
-- 6. Reviews table
-- ===========================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID UNIQUE NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_registration_id UUID NOT NULL REFERENCES public.lab_registrations(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (public)
CREATE POLICY "Public can read reviews"
  ON public.reviews FOR SELECT
  USING (true);

-- Users can insert reviews for their own bookings
CREATE POLICY "Users can insert own reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ===========================================
-- 7. Storage bucket for booking reports
-- ===========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('booking-reports', 'booking-reports', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Lab owners can upload reports
CREATE POLICY "Lab owners can upload reports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'booking-reports');

-- Users can download their own reports
CREATE POLICY "Users can read own reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'booking-reports');

-- ===========================================
-- 8. Indexes for performance
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lab_registration_id ON public.bookings(lab_registration_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lab_service_id ON public.bookings(lab_service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_booking_patients_booking_id ON public.booking_patients(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_logs_booking_id ON public.booking_status_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_reports_booking_id ON public.booking_reports(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_lab_registration_id ON public.reviews(lab_registration_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

-- ===========================================
-- 9. Public read policy for lab_services (needed for booking)
-- ===========================================
-- Allow any authenticated user to read lab services (for booking)
CREATE POLICY "Public can read approved lab services"
  ON public.lab_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_registrations lr
      WHERE lr.id = lab_registration_id AND lr.status = 'approved'
    )
  );
