-- STEP 1: CLEANUP — Remove all non-admin data
-- Run this FIRST, then create users in Auth dashboard

DELETE FROM public.lab_services;
DELETE FROM public.lab_registrations;
DELETE FROM public.profiles WHERE role != 'admin';
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email != 'amanksah123@gmail.com'
);
DELETE FROM auth.users WHERE email != 'amanksah123@gmail.com';
