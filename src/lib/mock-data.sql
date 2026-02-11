-- ===========================================
-- LabsBuzz Mock Data
-- 2 users, 12 labs (5 + 7), all approved
-- Each lab has 7-10 services
-- ===========================================

-- Step 1: Create two mock users in auth.users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user1@labsbuzz.com', crypt('User1Pass!', gen_salt('bf')), NOW(), NOW(), NOW(), '', ''),
  ('b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user2@labsbuzz.com', crypt('User2Pass!', gen_salt('bf')), NOW(), NOW(), NOW(), '', '')
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create identities for the users (required by Supabase Auth)
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', jsonb_build_object('sub', 'a1111111-1111-1111-1111-111111111111', 'email', 'user1@labsbuzz.com'), 'email', NOW(), NOW(), NOW()),
  ('b2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', jsonb_build_object('sub', 'b2222222-2222-2222-2222-222222222222', 'email', 'user2@labsbuzz.com'), 'email', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Step 3: Create profiles
INSERT INTO public.profiles (id, email, phone, role)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'user1@labsbuzz.com', '9876543210', 'labs'),
  ('b2222222-2222-2222-2222-222222222222', 'user2@labsbuzz.com', '9123456789', 'labs')
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create 12 lab registrations (5 for user1, 7 for user2) — ALL APPROVED
INSERT INTO public.lab_registrations (id, user_id, unique_lab_id, email, phone, lab_name, landmark, city, district, state, pincode, latitude, longitude, lab_reg_id_no, description, status)
VALUES
  -- User 1's 5 labs
  ('11000001-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'LB-MOCK0001', 'user1@labsbuzz.com', '9876543210', 'HealthFirst Diagnostics', 'Near City Hospital', 'Patna', 'Patna', 'Bihar', '800001', 25.6093, 85.1376, 'REG-BH-001', 'Full-service diagnostic lab in Patna', 'approved'),
  ('11000001-0000-0000-0000-000000000002', 'a1111111-1111-1111-1111-111111111111', 'LB-MOCK0002', 'user1@labsbuzz.com', '9876543210', 'MedScan Labs', 'Gandhi Maidan Area', 'Patna', 'Patna', 'Bihar', '800001', 25.6120, 85.1400, 'REG-BH-002', 'Advanced scanning and blood testing', 'approved'),
  ('11000001-0000-0000-0000-000000000003', 'a1111111-1111-1111-1111-111111111111', 'LB-MOCK0003', 'user1@labsbuzz.com', '9876543210', 'Bihar Path Lab', 'Boring Road', 'Patna', 'Patna', 'Bihar', '800013', 25.6000, 85.1200, 'REG-BH-003', 'Trusted pathology services', 'approved'),
  ('11000001-0000-0000-0000-000000000004', 'a1111111-1111-1111-1111-111111111111', 'LB-MOCK0004', 'user1@labsbuzz.com', '9876543210', 'CarePoint Diagnostics', 'Near Mahavir Temple', 'Patna', 'Patna', 'Bihar', '800001', 25.6150, 85.1450, 'REG-BH-004', 'Affordable diagnostics for all', 'approved'),
  ('11000001-0000-0000-0000-000000000005', 'a1111111-1111-1111-1111-111111111111', 'LB-MOCK0005', 'user1@labsbuzz.com', '9876543210', 'Gaya Medical Lab', 'Station Road', 'Gaya', 'Gaya', 'Bihar', '823001', 24.7955, 84.9994, 'REG-BH-005', 'Quality testing in Gaya', 'approved'),

  -- User 2's 7 labs
  ('22000002-0000-0000-0000-000000000001', 'b2222222-2222-2222-2222-222222222222', 'LB-MOCK0006', 'user2@labsbuzz.com', '9123456789', 'Delhi Prime Labs', 'Connaught Place', 'New Delhi', 'Central Delhi', 'Delhi', '110001', 28.6315, 77.2167, 'REG-DL-001', 'Premium diagnostics in Delhi', 'approved'),
  ('22000002-0000-0000-0000-000000000002', 'b2222222-2222-2222-2222-222222222222', 'LB-MOCK0007', 'user2@labsbuzz.com', '9123456789', 'South Delhi Diagnostics', 'Saket Metro Station', 'New Delhi', 'South Delhi', 'Delhi', '110017', 28.5244, 77.2066, 'REG-DL-002', 'Convenient lab in South Delhi', 'approved'),
  ('22000002-0000-0000-0000-000000000003', 'b2222222-2222-2222-2222-222222222222', 'LB-MOCK0008', 'user2@labsbuzz.com', '9123456789', 'Noida LifeCare Lab', 'Sector 18', 'Noida', 'Gautam Buddha Nagar', 'Uttar Pradesh', '201301', 28.5700, 77.3200, 'REG-UP-001', 'Modern lab in Noida', 'approved'),
  ('22000002-0000-0000-0000-000000000004', 'b2222222-2222-2222-2222-222222222222', 'LB-MOCK0009', 'user2@labsbuzz.com', '9123456789', 'Gurgaon Health Hub', 'MG Road', 'Gurgaon', 'Gurgaon', 'Haryana', '122001', 28.4595, 77.0266, 'REG-HR-001', 'Fast diagnostics in Gurgaon', 'approved'),
  ('22000002-0000-0000-0000-000000000005', 'b2222222-2222-2222-2222-222222222222', 'LB-MOCK0010', 'user2@labsbuzz.com', '9123456789', 'Mumbai Central Lab', 'Dadar Station', 'Mumbai', 'Mumbai City', 'Maharashtra', '400014', 19.0178, 72.8478, 'REG-MH-001', 'Top lab in Mumbai', 'approved'),
  ('22000002-0000-0000-0000-000000000006', 'b2222222-2222-2222-2222-222222222222', 'LB-MOCK0011', 'user2@labsbuzz.com', '9123456789', 'Pune DiagnoCenter', 'Shivaji Nagar', 'Pune', 'Pune', 'Maharashtra', '411005', 18.5314, 73.8446, 'REG-MH-002', 'Trusted testing in Pune', 'approved'),
  ('22000002-0000-0000-0000-000000000007', 'b2222222-2222-2222-2222-222222222222', 'LB-MOCK0012', 'user2@labsbuzz.com', '9123456789', 'Bangalore BioLab', 'MG Road', 'Bangalore', 'Bangalore Urban', 'Karnataka', '560001', 12.9716, 77.5946, 'REG-KA-001', 'High-tech lab in Bangalore', 'approved')
ON CONFLICT (id) DO NOTHING;

-- Step 5: Insert services (7-10 per lab) with varying prices
-- We reference test IDs by name using subqueries

DO $$
DECLARE
  t_cbc UUID;
  t_sugar UUID;
  t_lipid UUID;
  t_thyroid UUID;
  t_lft UUID;
  t_kft UUID;
  t_urine UUID;
  t_hba1c UUID;
  t_vitd UUID;
  t_vitb12 UUID;
BEGIN
  SELECT id INTO t_cbc FROM public.available_tests WHERE name = 'Complete Blood Count (CBC)';
  SELECT id INTO t_sugar FROM public.available_tests WHERE name = 'Blood Sugar (Fasting)';
  SELECT id INTO t_lipid FROM public.available_tests WHERE name = 'Lipid Profile';
  SELECT id INTO t_thyroid FROM public.available_tests WHERE name = 'Thyroid Profile (T3/T4/TSH)';
  SELECT id INTO t_lft FROM public.available_tests WHERE name = 'Liver Function Test (LFT)';
  SELECT id INTO t_kft FROM public.available_tests WHERE name = 'Kidney Function Test (KFT)';
  SELECT id INTO t_urine FROM public.available_tests WHERE name = 'Urine Routine';
  SELECT id INTO t_hba1c FROM public.available_tests WHERE name = 'HbA1c';
  SELECT id INTO t_vitd FROM public.available_tests WHERE name = 'Vitamin D';
  SELECT id INTO t_vitb12 FROM public.available_tests WHERE name = 'Vitamin B12';

  -- =============================================
  -- Lab 1: HealthFirst Diagnostics (Patna 800001) — 8 services
  -- =============================================
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    ('11000001-0000-0000-0000-000000000001', t_cbc, 250, '12 hours fasting required', 6),
    ('11000001-0000-0000-0000-000000000001', t_sugar, 120, '12 hours fasting required', 4),
    ('11000001-0000-0000-0000-000000000001', t_lipid, 500, '12 hours fasting required', 12),
    ('11000001-0000-0000-0000-000000000001', t_thyroid, 450, 'No special preparation required', 24),
    ('11000001-0000-0000-0000-000000000001', t_lft, 400, '8 hours fasting required', 12),
    ('11000001-0000-0000-0000-000000000001', t_kft, 380, '8 hours fasting required', 12),
    ('11000001-0000-0000-0000-000000000001', t_urine, 100, 'Early morning sample preferred', 4),
    ('11000001-0000-0000-0000-000000000001', t_hba1c, 350, 'No special preparation required', 8)
  ON CONFLICT (lab_registration_id, test_id) DO NOTHING;

  -- =============================================
  -- Lab 2: MedScan Labs (Patna 800001) — 9 services
  -- =============================================
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    ('11000001-0000-0000-0000-000000000002', t_cbc, 280, '12 hours fasting required', 5),
    ('11000001-0000-0000-0000-000000000002', t_sugar, 100, '12 hours fasting required', 3),
    ('11000001-0000-0000-0000-000000000002', t_lipid, 550, '12 hours fasting required', 10),
    ('11000001-0000-0000-0000-000000000002', t_thyroid, 480, 'No special preparation required', 18),
    ('11000001-0000-0000-0000-000000000002', t_lft, 420, '8 hours fasting required', 10),
    ('11000001-0000-0000-0000-000000000002', t_kft, 400, '8 hours fasting required', 10),
    ('11000001-0000-0000-0000-000000000002', t_urine, 80, 'Early morning sample preferred', 3),
    ('11000001-0000-0000-0000-000000000002', t_vitd, 700, 'Avoid biotin supplements for 48 hours', 24),
    ('11000001-0000-0000-0000-000000000002', t_vitb12, 650, 'No special preparation required', 24)
  ON CONFLICT (lab_registration_id, test_id) DO NOTHING;

  -- =============================================
  -- Lab 3: Bihar Path Lab (Patna 800013) — 7 services
  -- =============================================
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    ('11000001-0000-0000-0000-000000000003', t_cbc, 200, '12 hours fasting required', 8),
    ('11000001-0000-0000-0000-000000000003', t_sugar, 90, '12 hours fasting required', 4),
    ('11000001-0000-0000-0000-000000000003', t_lipid, 450, '12 hours fasting required', 14),
    ('11000001-0000-0000-0000-000000000003', t_thyroid, 400, 'No special preparation required', 24),
    ('11000001-0000-0000-0000-000000000003', t_lft, 350, '8 hours fasting required', 14),
    ('11000001-0000-0000-0000-000000000003', t_urine, 70, 'Early morning sample preferred', 5),
    ('11000001-0000-0000-0000-000000000003', t_hba1c, 300, 'No special preparation required', 10)
  ON CONFLICT (lab_registration_id, test_id) DO NOTHING;

  -- =============================================
  -- Lab 4: CarePoint Diagnostics (Patna 800001) — 10 services
  -- =============================================
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    ('11000001-0000-0000-0000-000000000004', t_cbc, 220, '12 hours fasting required', 6),
    ('11000001-0000-0000-0000-000000000004', t_sugar, 110, '12 hours fasting required', 3),
    ('11000001-0000-0000-0000-000000000004', t_lipid, 480, '12 hours fasting required', 12),
    ('11000001-0000-0000-0000-000000000004', t_thyroid, 430, 'No special preparation required', 20),
    ('11000001-0000-0000-0000-000000000004', t_lft, 380, '8 hours fasting required', 12),
    ('11000001-0000-0000-0000-000000000004', t_kft, 360, '8 hours fasting required', 12),
    ('11000001-0000-0000-0000-000000000004', t_urine, 90, 'Early morning sample preferred', 4),
    ('11000001-0000-0000-0000-000000000004', t_hba1c, 320, 'No special preparation required', 8),
    ('11000001-0000-0000-0000-000000000004', t_vitd, 650, 'Avoid biotin supplements for 48 hours', 24),
    ('11000001-0000-0000-0000-000000000004', t_vitb12, 600, 'No special preparation required', 24)
  ON CONFLICT (lab_registration_id, test_id) DO NOTHING;

  -- =============================================
  -- Lab 5: Gaya Medical Lab (Gaya 823001) — 7 services
  -- =============================================
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    ('11000001-0000-0000-0000-000000000005', t_cbc, 180, '12 hours fasting required', 8),
    ('11000001-0000-0000-0000-000000000005', t_sugar, 80, '12 hours fasting required', 5),
    ('11000001-0000-0000-0000-000000000005', t_lipid, 400, '12 hours fasting required', 16),
    ('11000001-0000-0000-0000-000000000005', t_thyroid, 380, 'No special preparation required', 24),
    ('11000001-0000-0000-0000-000000000005', t_lft, 320, '8 hours fasting required', 16),
    ('11000001-0000-0000-0000-000000000005', t_urine, 60, 'Early morning sample preferred', 6),
    ('11000001-0000-0000-0000-000000000005', t_hba1c, 280, 'No special preparation required', 12)
  ON CONFLICT (lab_registration_id, test_id) DO NOTHING;

  -- =============================================
  -- Lab 6: Delhi Prime Labs (Delhi 110001) — 10 services
  -- =============================================
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    ('22000002-0000-0000-0000-000000000001', t_cbc, 350, '12 hours fasting required', 4),
    ('22000002-0000-0000-0000-000000000001', t_sugar, 150, '12 hours fasting required', 2),
    ('22000002-0000-0000-0000-000000000001', t_lipid, 650, '12 hours fasting required', 8),
    ('22000002-0000-0000-0000-000000000001', t_thyroid, 550, 'No special preparation required', 12),
    ('22000002-0000-0000-0000-000000000001', t_lft, 500, '8 hours fasting required', 8),
    ('22000002-0000-0000-0000-000000000001', t_kft, 480, '8 hours fasting required', 8),
    ('22000002-0000-0000-0000-000000000001', t_urine, 120, 'Early morning sample preferred', 3),
    ('22000002-0000-0000-0000-000000000001', t_hba1c, 420, 'No special preparation required', 6),
    ('22000002-0000-0000-0000-000000000001', t_vitd, 850, 'Avoid biotin supplements for 48 hours', 18),
    ('22000002-0000-0000-0000-000000000001', t_vitb12, 800, 'No special preparation required', 18)
  ON CONFLICT (lab_registration_id, test_id) DO NOTHING;

  -- =============================================
  -- Lab 7: South Delhi Diagnostics (Delhi 110017) — 8 services
  -- =============================================
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    ('22000002-0000-0000-0000-000000000002', t_cbc, 300, '12 hours fasting required', 5),
    ('22000002-0000-0000-0000-000000000002', t_sugar, 130, '12 hours fasting required', 3),
    ('22000002-0000-0000-0000-000000000002', t_lipid, 600, '12 hours fasting required', 10),
    ('22000002-0000-0000-0000-000000000002', t_thyroid, 500, 'No special preparation required', 16),
    ('22000002-0000-0000-0000-000000000002', t_lft, 470, '8 hours fasting required', 10),
    ('22000002-0000-0000-0000-000000000002', t_kft, 440, '8 hours fasting required', 10),
    ('22000002-0000-0000-0000-000000000002', t_urine, 100, 'Early morning sample preferred', 4),
    ('22000002-0000-0000-0000-000000000002', t_hba1c, 380, 'No special preparation required', 8)
  ON CONFLICT (lab_registration_id, test_id) DO NOTHING;

  -- =============================================
  -- Lab 8: Noida LifeCare Lab (Noida 201301) — 9 services
  -- =============================================
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    ('22000002-0000-0000-0000-000000000003', t_cbc, 270, '12 hours fasting required', 6),
    ('22000002-0000-0000-0000-000000000003', t_sugar, 110, '12 hours fasting required', 3),
    ('22000002-0000-0000-0000-000000000003', t_lipid, 520, '12 hours fasting required', 10),
    ('22000002-0000-0000-0000-000000000003', t_thyroid, 470, 'No special preparation required', 18),
    ('22000002-0000-0000-0000-000000000003', t_lft, 430, '8 hours fasting required', 12),
    ('22000002-0000-0000-0000-000000000003', t_kft, 410, '8 hours fasting required', 12),
    ('22000002-0000-0000-0000-000000000003', t_urine, 90, 'Early morning sample preferred', 4),
    ('22000002-0000-0000-0000-000000000003', t_hba1c, 360, 'No special preparation required', 8),
    ('22000002-0000-0000-0000-000000000003', t_vitd, 720, 'Avoid biotin supplements for 48 hours', 24)
  ON CONFLICT (lab_registration_id, test_id) DO NOTHING;

  -- =============================================
  -- Lab 9: Gurgaon Health Hub (Gurgaon 122001) — 7 services
  -- =============================================
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    ('22000002-0000-0000-0000-000000000004', t_cbc, 320, '12 hours fasting required', 4),
    ('22000002-0000-0000-0000-000000000004', t_sugar, 140, '12 hours fasting required', 2),
    ('22000002-0000-0000-0000-000000000004', t_lipid, 580, '12 hours fasting required', 8),
    ('22000002-0000-0000-0000-000000000004', t_thyroid, 520, 'No special preparation required', 14),
    ('22000002-0000-0000-0000-000000000004', t_lft, 460, '8 hours fasting required', 10),
    ('22000002-0000-0000-0000-000000000004', t_urine, 110, 'Early morning sample preferred', 3),
    ('22000002-0000-0000-0000-000000000004', t_vitb12, 750, 'No special preparation required', 20)
  ON CONFLICT (lab_registration_id, test_id) DO NOTHING;

  -- =============================================
  -- Lab 10: Mumbai Central Lab (Mumbai 400014) — 10 services
  -- =============================================
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    ('22000002-0000-0000-0000-000000000005', t_cbc, 380, '12 hours fasting required', 3),
    ('22000002-0000-0000-0000-000000000005', t_sugar, 160, '12 hours fasting required', 2),
    ('22000002-0000-0000-0000-000000000005', t_lipid, 700, '12 hours fasting required', 6),
    ('22000002-0000-0000-0000-000000000005', t_thyroid, 600, 'No special preparation required', 10),
    ('22000002-0000-0000-0000-000000000005', t_lft, 520, '8 hours fasting required', 8),
    ('22000002-0000-0000-0000-000000000005', t_kft, 500, '8 hours fasting required', 8),
    ('22000002-0000-0000-0000-000000000005', t_urine, 130, 'Early morning sample preferred', 2),
    ('22000002-0000-0000-0000-000000000005', t_hba1c, 450, 'No special preparation required', 6),
    ('22000002-0000-0000-0000-000000000005', t_vitd, 900, 'Avoid biotin supplements for 48 hours', 16),
    ('22000002-0000-0000-0000-000000000005', t_vitb12, 850, 'No special preparation required', 16)
  ON CONFLICT (lab_registration_id, test_id) DO NOTHING;

  -- =============================================
  -- Lab 11: Pune DiagnoCenter (Pune 411005) — 8 services
  -- =============================================
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    ('22000002-0000-0000-0000-000000000006', t_cbc, 260, '12 hours fasting required', 6),
    ('22000002-0000-0000-0000-000000000006', t_sugar, 105, '12 hours fasting required', 4),
    ('22000002-0000-0000-0000-000000000006', t_lipid, 490, '12 hours fasting required', 12),
    ('22000002-0000-0000-0000-000000000006', t_thyroid, 440, 'No special preparation required', 20),
    ('22000002-0000-0000-0000-000000000006', t_lft, 390, '8 hours fasting required', 12),
    ('22000002-0000-0000-0000-000000000006', t_kft, 370, '8 hours fasting required', 12),
    ('22000002-0000-0000-0000-000000000006', t_urine, 85, 'Early morning sample preferred', 4),
    ('22000002-0000-0000-0000-000000000006', t_vitd, 680, 'Avoid biotin supplements for 48 hours', 22)
  ON CONFLICT (lab_registration_id, test_id) DO NOTHING;

  -- =============================================
  -- Lab 12: Bangalore BioLab (Bangalore 560001) — 9 services
  -- =============================================
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    ('22000002-0000-0000-0000-000000000007', t_cbc, 310, '12 hours fasting required', 4),
    ('22000002-0000-0000-0000-000000000007', t_sugar, 135, '12 hours fasting required', 3),
    ('22000002-0000-0000-0000-000000000007', t_lipid, 590, '12 hours fasting required', 8),
    ('22000002-0000-0000-0000-000000000007', t_thyroid, 510, 'No special preparation required', 14),
    ('22000002-0000-0000-0000-000000000007', t_lft, 450, '8 hours fasting required', 10),
    ('22000002-0000-0000-0000-000000000007', t_kft, 430, '8 hours fasting required', 10),
    ('22000002-0000-0000-0000-000000000007', t_urine, 95, 'Early morning sample preferred', 3),
    ('22000002-0000-0000-0000-000000000007', t_hba1c, 390, 'No special preparation required', 6),
    ('22000002-0000-0000-0000-000000000007', t_vitb12, 720, 'No special preparation required', 20)
  ON CONFLICT (lab_registration_id, test_id) DO NOTHING;

END $$;
