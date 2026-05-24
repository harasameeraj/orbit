-- ============================================================
-- SchoolConnect — Storage Buckets Setup
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('school-logos',  'school-logos',  true, 5242880,   ARRAY['image/png','image/jpeg','image/webp']),
  ('event-photos',  'event-photos',  true, 10485760,  ARRAY['image/png','image/jpeg','image/webp']),
  ('student-photos','student-photos',true, 5242880,   ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS Policies ──────────────────────────────────────

-- SCHOOL LOGOS: admin of that school can upload; anyone can read (public)
CREATE POLICY "logos_admin_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'school-logos'
    AND get_my_role() = 'admin'
    AND (storage.foldername(name))[1] = get_my_school_id()::text
  );

CREATE POLICY "logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'school-logos');

CREATE POLICY "logos_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'school-logos'
    AND get_my_role() = 'admin'
    AND (storage.foldername(name))[1] = get_my_school_id()::text
  );

-- EVENT PHOTOS: admin can upload; anyone in the school can read
CREATE POLICY "event_photos_admin_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-photos'
    AND get_my_role() = 'admin'
    AND (storage.foldername(name))[1] = get_my_school_id()::text
  );

CREATE POLICY "event_photos_school_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'event-photos'
    AND (storage.foldername(name))[1] = get_my_school_id()::text
  );

CREATE POLICY "event_photos_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'event-photos'
    AND get_my_role() = 'admin'
    AND (storage.foldername(name))[1] = get_my_school_id()::text
  );

-- STUDENT PHOTOS: admin/teacher can upload; parents can read their child's
CREATE POLICY "student_photos_staff_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'student-photos'
    AND get_my_role() IN ('admin','teacher')
    AND (storage.foldername(name))[1] = get_my_school_id()::text
  );

CREATE POLICY "student_photos_school_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'student-photos'
    AND (storage.foldername(name))[1] = get_my_school_id()::text
  );
