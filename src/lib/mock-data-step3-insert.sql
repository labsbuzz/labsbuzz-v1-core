-- STEP 3: INSERT MOCK DATA
-- Run this AFTER creating user3@labsbuzz.com and user4@labsbuzz.com in Auth dashboard

DO $$
DECLARE
  u1 UUID;
  u2 UUID;
  lab_ids UUID[] := '{}';
  new_id UUID;
  t_cbc UUID; t_sugar UUID; t_lipid UUID; t_thyroid UUID; t_lft UUID;
  t_kft UUID; t_urine UUID; t_hba1c UUID; t_vitd UUID; t_vitb12 UUID;
BEGIN
  SELECT id INTO u1 FROM auth.users WHERE email = 'user3@labsbuzz.com';
  SELECT id INTO u2 FROM auth.users WHERE email = 'user4@labsbuzz.com';

  IF u1 IS NULL OR u2 IS NULL THEN
    RAISE EXCEPTION 'Users not found! Create user3@labsbuzz.com and user4@labsbuzz.com in Auth dashboard first.';
  END IF;

  -- Create profiles
  INSERT INTO public.profiles (id, email, phone, role) VALUES
    (u1, 'user3@labsbuzz.com', '9876543210', 'labs'),
    (u2, 'user4@labsbuzz.com', '9123456789', 'labs')
  ON CONFLICT (id) DO UPDATE SET role = 'labs';

  -- User 1's 6 labs (Bihar/Jharkhand region)
  INSERT INTO public.lab_registrations (user_id, unique_lab_id, email, phone, lab_name, landmark, city, district, state, pincode, latitude, longitude, lab_reg_id_no, description, status)
  VALUES (u1, 'LB-MOCK0001', 'user3@labsbuzz.com', '9876543210', 'HealthFirst Diagnostics', 'Near City Hospital', 'Patna', 'Patna', 'Bihar', '800001', 25.6093, 85.1376, 'REG-BH-001', 'Full-service diagnostic lab in Patna', 'approved')
  RETURNING id INTO new_id;
  lab_ids := lab_ids || new_id;

  INSERT INTO public.lab_registrations (user_id, unique_lab_id, email, phone, lab_name, landmark, city, district, state, pincode, latitude, longitude, lab_reg_id_no, description, status)
  VALUES (u1, 'LB-MOCK0002', 'user3@labsbuzz.com', '9876543210', 'MedScan Labs', 'Gandhi Maidan Area', 'Patna', 'Patna', 'Bihar', '800001', 25.6120, 85.1400, 'REG-BH-002', 'Advanced scanning and blood testing', 'approved')
  RETURNING id INTO new_id;
  lab_ids := lab_ids || new_id;

  INSERT INTO public.lab_registrations (user_id, unique_lab_id, email, phone, lab_name, landmark, city, district, state, pincode, latitude, longitude, lab_reg_id_no, description, status)
  VALUES (u1, 'LB-MOCK0003', 'user3@labsbuzz.com', '9876543210', 'Bihar Path Lab', 'Boring Road', 'Patna', 'Patna', 'Bihar', '800013', 25.6000, 85.1200, 'REG-BH-003', 'Trusted pathology services', 'approved')
  RETURNING id INTO new_id;
  lab_ids := lab_ids || new_id;

  INSERT INTO public.lab_registrations (user_id, unique_lab_id, email, phone, lab_name, landmark, city, district, state, pincode, latitude, longitude, lab_reg_id_no, description, status)
  VALUES (u1, 'LB-MOCK0004', 'user3@labsbuzz.com', '9876543210', 'CarePoint Diagnostics', 'Near Mahavir Temple', 'Patna', 'Patna', 'Bihar', '800001', 25.6150, 85.1450, 'REG-BH-004', 'Affordable diagnostics for all', 'approved')
  RETURNING id INTO new_id;
  lab_ids := lab_ids || new_id;

  INSERT INTO public.lab_registrations (user_id, unique_lab_id, email, phone, lab_name, landmark, city, district, state, pincode, latitude, longitude, lab_reg_id_no, description, status)
  VALUES (u1, 'LB-MOCK0005', 'user3@labsbuzz.com', '9876543210', 'Gaya Medical Lab', 'Station Road', 'Gaya', 'Gaya', 'Bihar', '823001', 24.7955, 84.9994, 'REG-BH-005', 'Quality testing in Gaya', 'approved')
  RETURNING id INTO new_id;
  lab_ids := lab_ids || new_id;

  INSERT INTO public.lab_registrations (user_id, unique_lab_id, email, phone, lab_name, landmark, city, district, state, pincode, latitude, longitude, lab_reg_id_no, description, status)
  VALUES (u1, 'LB-MOCK0006', 'user3@labsbuzz.com', '9876543210', 'Ranchi DiagnoHub', 'Main Road', 'Ranchi', 'Ranchi', 'Jharkhand', '834001', 23.3441, 85.3096, 'REG-JH-001', 'Modern diagnostics in Ranchi', 'approved')
  RETURNING id INTO new_id;
  lab_ids := lab_ids || new_id;

  -- User 2's 6 labs (Delhi/Mumbai/Bangalore)
  INSERT INTO public.lab_registrations (user_id, unique_lab_id, email, phone, lab_name, landmark, city, district, state, pincode, latitude, longitude, lab_reg_id_no, description, status)
  VALUES (u2, 'LB-MOCK0007', 'user4@labsbuzz.com', '9123456789', 'Delhi Prime Labs', 'Connaught Place', 'New Delhi', 'Central Delhi', 'Delhi', '110001', 28.6315, 77.2167, 'REG-DL-001', 'Premium diagnostics in Delhi', 'approved')
  RETURNING id INTO new_id;
  lab_ids := lab_ids || new_id;

  INSERT INTO public.lab_registrations (user_id, unique_lab_id, email, phone, lab_name, landmark, city, district, state, pincode, latitude, longitude, lab_reg_id_no, description, status)
  VALUES (u2, 'LB-MOCK0008', 'user4@labsbuzz.com', '9123456789', 'South Delhi Diagnostics', 'Saket Metro Station', 'New Delhi', 'South Delhi', 'Delhi', '110017', 28.5244, 77.2066, 'REG-DL-002', 'Convenient lab in South Delhi', 'approved')
  RETURNING id INTO new_id;
  lab_ids := lab_ids || new_id;

  INSERT INTO public.lab_registrations (user_id, unique_lab_id, email, phone, lab_name, landmark, city, district, state, pincode, latitude, longitude, lab_reg_id_no, description, status)
  VALUES (u2, 'LB-MOCK0009', 'user4@labsbuzz.com', '9123456789', 'Noida LifeCare Lab', 'Sector 18', 'Noida', 'Gautam Buddha Nagar', 'Uttar Pradesh', '201301', 28.5700, 77.3200, 'REG-UP-001', 'Modern lab in Noida', 'approved')
  RETURNING id INTO new_id;
  lab_ids := lab_ids || new_id;

  INSERT INTO public.lab_registrations (user_id, unique_lab_id, email, phone, lab_name, landmark, city, district, state, pincode, latitude, longitude, lab_reg_id_no, description, status)
  VALUES (u2, 'LB-MOCK0010', 'user4@labsbuzz.com', '9123456789', 'Mumbai Central Lab', 'Dadar Station', 'Mumbai', 'Mumbai City', 'Maharashtra', '400014', 19.0178, 72.8478, 'REG-MH-001', 'Top lab in Mumbai', 'approved')
  RETURNING id INTO new_id;
  lab_ids := lab_ids || new_id;

  INSERT INTO public.lab_registrations (user_id, unique_lab_id, email, phone, lab_name, landmark, city, district, state, pincode, latitude, longitude, lab_reg_id_no, description, status)
  VALUES (u2, 'LB-MOCK0011', 'user4@labsbuzz.com', '9123456789', 'Pune DiagnoCenter', 'Shivaji Nagar', 'Pune', 'Pune', 'Maharashtra', '411005', 18.5314, 73.8446, 'REG-MH-002', 'Trusted testing in Pune', 'approved')
  RETURNING id INTO new_id;
  lab_ids := lab_ids || new_id;

  INSERT INTO public.lab_registrations (user_id, unique_lab_id, email, phone, lab_name, landmark, city, district, state, pincode, latitude, longitude, lab_reg_id_no, description, status)
  VALUES (u2, 'LB-MOCK0012', 'user4@labsbuzz.com', '9123456789', 'Bangalore BioLab', 'MG Road', 'Bangalore', 'Bangalore Urban', 'Karnataka', '560001', 12.9716, 77.5946, 'REG-KA-001', 'High-tech lab in Bangalore', 'approved')
  RETURNING id INTO new_id;
  lab_ids := lab_ids || new_id;

  -- Fetch test IDs
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

  -- Lab 1: HealthFirst Diagnostics (Patna 800001)
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    (lab_ids[1], t_cbc, 250, '12 hours fasting required', 6),
    (lab_ids[1], t_sugar, 120, '12 hours fasting required', 4),
    (lab_ids[1], t_lipid, 500, '12 hours fasting required', 12),
    (lab_ids[1], t_thyroid, 450, 'No special preparation required', 24),
    (lab_ids[1], t_lft, 400, '8 hours fasting required', 12),
    (lab_ids[1], t_kft, 380, '8 hours fasting required', 12),
    (lab_ids[1], t_urine, 100, 'Early morning sample preferred', 4);

  -- Lab 2: MedScan Labs (Patna 800001)
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    (lab_ids[2], t_cbc, 280, '12 hours fasting required', 5),
    (lab_ids[2], t_sugar, 100, '12 hours fasting required', 3),
    (lab_ids[2], t_lipid, 550, '12 hours fasting required', 10),
    (lab_ids[2], t_thyroid, 480, 'No special preparation required', 18),
    (lab_ids[2], t_lft, 420, '8 hours fasting required', 10),
    (lab_ids[2], t_urine, 80, 'Early morning sample preferred', 3),
    (lab_ids[2], t_vitd, 700, 'Avoid biotin supplements for 48 hours', 24);

  -- Lab 3: Bihar Path Lab (Patna 800013)
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    (lab_ids[3], t_cbc, 200, '12 hours fasting required', 8),
    (lab_ids[3], t_sugar, 90, '12 hours fasting required', 4),
    (lab_ids[3], t_lipid, 450, '12 hours fasting required', 14),
    (lab_ids[3], t_thyroid, 400, 'No special preparation required', 24),
    (lab_ids[3], t_lft, 350, '8 hours fasting required', 14),
    (lab_ids[3], t_urine, 70, 'Early morning sample preferred', 5),
    (lab_ids[3], t_hba1c, 300, 'No special preparation required', 10);

  -- Lab 4: CarePoint Diagnostics (Patna 800001)
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    (lab_ids[4], t_cbc, 220, '12 hours fasting required', 6),
    (lab_ids[4], t_sugar, 110, '12 hours fasting required', 3),
    (lab_ids[4], t_lipid, 480, '12 hours fasting required', 12),
    (lab_ids[4], t_thyroid, 430, 'No special preparation required', 20),
    (lab_ids[4], t_kft, 360, '8 hours fasting required', 12),
    (lab_ids[4], t_hba1c, 320, 'No special preparation required', 8),
    (lab_ids[4], t_vitb12, 600, 'No special preparation required', 24);

  -- Lab 5: Gaya Medical Lab (Gaya 823001)
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    (lab_ids[5], t_cbc, 180, '12 hours fasting required', 8),
    (lab_ids[5], t_sugar, 80, '12 hours fasting required', 5),
    (lab_ids[5], t_lipid, 400, '12 hours fasting required', 16),
    (lab_ids[5], t_thyroid, 380, 'No special preparation required', 24),
    (lab_ids[5], t_lft, 320, '8 hours fasting required', 16),
    (lab_ids[5], t_urine, 60, 'Early morning sample preferred', 6),
    (lab_ids[5], t_hba1c, 280, 'No special preparation required', 12);

  -- Lab 6: Ranchi DiagnoHub (Ranchi 834001)
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    (lab_ids[6], t_cbc, 240, '12 hours fasting required', 6),
    (lab_ids[6], t_sugar, 115, '12 hours fasting required', 4),
    (lab_ids[6], t_lipid, 520, '12 hours fasting required', 12),
    (lab_ids[6], t_lft, 410, '8 hours fasting required', 12),
    (lab_ids[6], t_kft, 390, '8 hours fasting required', 10),
    (lab_ids[6], t_vitd, 680, 'Avoid biotin supplements for 48 hours', 24),
    (lab_ids[6], t_vitb12, 630, 'No special preparation required', 24);

  -- Lab 7: Delhi Prime Labs (Delhi 110001)
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    (lab_ids[7], t_cbc, 350, '12 hours fasting required', 4),
    (lab_ids[7], t_sugar, 150, '12 hours fasting required', 2),
    (lab_ids[7], t_lipid, 650, '12 hours fasting required', 8),
    (lab_ids[7], t_thyroid, 550, 'No special preparation required', 12),
    (lab_ids[7], t_lft, 500, '8 hours fasting required', 8),
    (lab_ids[7], t_kft, 480, '8 hours fasting required', 8),
    (lab_ids[7], t_hba1c, 420, 'No special preparation required', 6);

  -- Lab 8: South Delhi Diagnostics (Delhi 110017)
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    (lab_ids[8], t_cbc, 300, '12 hours fasting required', 5),
    (lab_ids[8], t_sugar, 130, '12 hours fasting required', 3),
    (lab_ids[8], t_lipid, 600, '12 hours fasting required', 10),
    (lab_ids[8], t_thyroid, 500, 'No special preparation required', 16),
    (lab_ids[8], t_lft, 470, '8 hours fasting required', 10),
    (lab_ids[8], t_urine, 100, 'Early morning sample preferred', 4),
    (lab_ids[8], t_vitd, 780, 'Avoid biotin supplements for 48 hours', 20);

  -- Lab 9: Noida LifeCare Lab (Noida 201301)
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    (lab_ids[9], t_cbc, 270, '12 hours fasting required', 6),
    (lab_ids[9], t_sugar, 110, '12 hours fasting required', 3),
    (lab_ids[9], t_lipid, 520, '12 hours fasting required', 10),
    (lab_ids[9], t_thyroid, 470, 'No special preparation required', 18),
    (lab_ids[9], t_kft, 410, '8 hours fasting required', 12),
    (lab_ids[9], t_hba1c, 360, 'No special preparation required', 8),
    (lab_ids[9], t_vitb12, 690, 'No special preparation required', 22);

  -- Lab 10: Mumbai Central Lab (Mumbai 400014)
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    (lab_ids[10], t_cbc, 380, '12 hours fasting required', 3),
    (lab_ids[10], t_sugar, 160, '12 hours fasting required', 2),
    (lab_ids[10], t_lipid, 700, '12 hours fasting required', 6),
    (lab_ids[10], t_thyroid, 600, 'No special preparation required', 10),
    (lab_ids[10], t_lft, 520, '8 hours fasting required', 8),
    (lab_ids[10], t_urine, 130, 'Early morning sample preferred', 2),
    (lab_ids[10], t_vitd, 900, 'Avoid biotin supplements for 48 hours', 16);

  -- Lab 11: Pune DiagnoCenter (Pune 411005)
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    (lab_ids[11], t_cbc, 260, '12 hours fasting required', 6),
    (lab_ids[11], t_sugar, 105, '12 hours fasting required', 4),
    (lab_ids[11], t_lipid, 490, '12 hours fasting required', 12),
    (lab_ids[11], t_thyroid, 440, 'No special preparation required', 20),
    (lab_ids[11], t_lft, 390, '8 hours fasting required', 12),
    (lab_ids[11], t_kft, 370, '8 hours fasting required', 12),
    (lab_ids[11], t_urine, 85, 'Early morning sample preferred', 4);

  -- Lab 12: Bangalore BioLab (Bangalore 560001)
  INSERT INTO public.lab_services (lab_registration_id, test_id, price_inr, prerequisite, report_time_hours) VALUES
    (lab_ids[12], t_cbc, 310, '12 hours fasting required', 4),
    (lab_ids[12], t_sugar, 135, '12 hours fasting required', 3),
    (lab_ids[12], t_lipid, 590, '12 hours fasting required', 8),
    (lab_ids[12], t_thyroid, 510, 'No special preparation required', 14),
    (lab_ids[12], t_lft, 450, '8 hours fasting required', 10),
    (lab_ids[12], t_hba1c, 390, 'No special preparation required', 6),
    (lab_ids[12], t_vitb12, 720, 'No special preparation required', 20);

END $$;
