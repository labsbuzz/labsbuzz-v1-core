# Run this in Supabase SQL Editor

Copy everything below and paste it in **Supabase Dashboard → SQL Editor → New Query → Run**

```sql
-- ===========================================
-- Available Tests (master list)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.available_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.available_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read available tests"
  ON public.available_tests FOR SELECT
  USING (true);

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
-- Lab Services (tests offered by each lab)
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

CREATE POLICY "Lab owners can read own services"
  ON public.lab_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_registrations lr
      WHERE lr.id = lab_registration_id AND lr.user_id = auth.uid()
    )
  );

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

CREATE POLICY "Lab owners can delete own services"
  ON public.lab_services FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_registrations lr
      WHERE lr.id = lab_registration_id AND lr.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can read all lab services"
  ON public.lab_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE TRIGGER update_lab_services_updated_at
  BEFORE UPDATE ON public.lab_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_lab_services_lab_reg_id ON public.lab_services(lab_registration_id);
CREATE INDEX IF NOT EXISTS idx_lab_services_test_id ON public.lab_services(test_id);
```
