-- ============================================================
-- SchoolConnect — FULL DATABASE SETUP
-- Paste this entire file into Supabase SQL Editor and click RUN.
-- Works on a fresh project OR re-runs cleanly on an existing one.
-- ============================================================

-- ============================================================
-- STEP 0: Clean slate — drop public schema tables if they exist
-- ============================================================
DROP TABLE IF EXISTS notification_log   CASCADE;
DROP TABLE IF EXISTS messages           CASCADE;
DROP TABLE IF EXISTS message_threads    CASCADE;
DROP TABLE IF EXISTS behaviour_logs     CASCADE;
DROP TABLE IF EXISTS homework           CASCADE;
DROP TABLE IF EXISTS marks              CASCADE;
DROP TABLE IF EXISTS attendance         CASCADE;
DROP TABLE IF EXISTS timetable          CASCADE;
DROP TABLE IF EXISTS calendar_events    CASCADE;
DROP TABLE IF EXISTS notices            CASCADE;
DROP TABLE IF EXISTS event_photos       CASCADE;
DROP TABLE IF EXISTS event_albums       CASCADE;
DROP TABLE IF EXISTS student_fees       CASCADE;
DROP TABLE IF EXISTS fee_reminders      CASCADE;
DROP TABLE IF EXISTS fee_structures     CASCADE;
DROP TABLE IF EXISTS parent_students    CASCADE;
DROP TABLE IF EXISTS teacher_classes    CASCADE;
DROP TABLE IF EXISTS students           CASCADE;
DROP TABLE IF EXISTS classes            CASCADE;
DROP TABLE IF EXISTS profiles           CASCADE;
DROP TABLE IF EXISTS schools            CASCADE;

DROP FUNCTION IF EXISTS get_my_school_id()           CASCADE;
DROP FUNCTION IF EXISTS get_my_role()                CASCADE;
DROP FUNCTION IF EXISTS handle_new_user()            CASCADE;
DROP FUNCTION IF EXISTS handle_marks_publish()       CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column()   CASCADE;


-- ============================================================
-- STEP 1: MIGRATION 001 — Core schema + RLS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE schools (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  address       TEXT,
  logo_url      TEXT,
  brand_color   TEXT DEFAULT '#1a3a6b',
  academic_year TEXT DEFAULT '2024-2025',
  session_start DATE,
  absence_alerts_enabled BOOLEAN DEFAULT true,
  report_time   TIME DEFAULT '16:00:00',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin','teacher','parent')),
  name        TEXT NOT NULL,
  phone       TEXT,
  avatar_url  TEXT,
  fcm_token   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE classes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  grade      TEXT NOT NULL,
  section    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE students (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id     UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  roll_no      TEXT NOT NULL,
  dob          DATE,
  father_name  TEXT,
  mother_name  TEXT,
  photo_url    TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, class_id, roll_no)
);

CREATE TABLE parent_students (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  UNIQUE(parent_id, student_id)
);

CREATE TABLE teacher_classes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  is_class_teacher BOOLEAN DEFAULT false,
  UNIQUE(teacher_id, class_id, subject)
);

CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES profiles(id),
  date        DATE NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('present','absent','late','holiday')),
  marked_at   TIMESTAMPTZ DEFAULT now(),
  note        TEXT,
  UNIQUE(school_id, student_id, date)
);

CREATE TABLE marks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES profiles(id),
  subject     TEXT NOT NULL,
  exam_type   TEXT NOT NULL,
  score       INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  max_score   INTEGER NOT NULL DEFAULT 100,
  published   BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, student_id, subject, exam_type)
);

CREATE TABLE homework (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES profiles(id),
  subject     TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE,
  is_draft    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE behaviour_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES profiles(id),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  note        TEXT NOT NULL,
  type        TEXT DEFAULT 'neutral' CHECK (type IN ('positive','neutral','concern','disciplinary','academic')),
  teacher_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE announcements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id    UUID REFERENCES classes(id),
  teacher_id  UUID NOT NULL REFERENCES profiles(id),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_urgent   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE message_threads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  parent_id   UUID NOT NULL REFERENCES profiles(id),
  teacher_id  UUID NOT NULL REFERENCES profiles(id),
  student_id  UUID NOT NULL REFERENCES students(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, teacher_id, student_id)
);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id   UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES profiles(id),
  text        TEXT NOT NULL,
  sent_at     TIMESTAMPTZ DEFAULT now(),
  read_at     TIMESTAMPTZ
);

CREATE TABLE notices (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  admin_id     UUID NOT NULL REFERENCES profiles(id),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  category     TEXT DEFAULT 'GENERAL',
  is_visible   BOOLEAN DEFAULT true,
  attachment_url TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE event_albums (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  admin_id    UUID NOT NULL REFERENCES profiles(id),
  title       TEXT NOT NULL,
  cover_url   TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE event_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id    UUID NOT NULL REFERENCES event_albums(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  caption     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE timetable (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES profiles(id),
  subject     TEXT NOT NULL,
  topic       TEXT,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  CONSTRAINT timetable_class_day_time_unique UNIQUE (class_id, day_of_week, start_time)
);

CREATE TABLE calendar_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  name        TEXT,
  event_date  DATE NOT NULL,
  end_date    DATE,
  type        TEXT DEFAULT 'event' CHECK (type IN ('exam','holiday','event','meeting','sports')),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notification_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  type         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  sent_at      TIMESTAMPTZ DEFAULT now(),
  fcm_success  BOOLEAN
);

-- Indexes
CREATE INDEX idx_attendance_school_date   ON attendance(school_id, date);
CREATE INDEX idx_attendance_student_date  ON attendance(student_id, date);
CREATE INDEX idx_marks_student            ON marks(student_id, school_id);
CREATE INDEX idx_homework_class           ON homework(class_id, school_id);
CREATE INDEX idx_messages_thread          ON messages(thread_id, sent_at);
CREATE INDEX idx_behaviour_student_date   ON behaviour_logs(student_id, date);
CREATE INDEX idx_profiles_school          ON profiles(school_id);
CREATE INDEX idx_parent_students_parent   ON parent_students(parent_id);

-- Helper functions
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS
ALTER TABLE schools         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE students        ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance      ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework        ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviour_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_albums    ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable       ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "school_isolation"          ON schools         FOR ALL    USING (id = get_my_school_id());
CREATE POLICY "profiles_school_isolation" ON profiles        FOR SELECT USING (school_id = get_my_school_id());
CREATE POLICY "profiles_update_own"       ON profiles        FOR UPDATE USING (id = auth.uid());
CREATE POLICY "classes_read"              ON classes         FOR SELECT USING (school_id = get_my_school_id());
CREATE POLICY "classes_admin_write"       ON classes         FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'admin');

CREATE POLICY "students_admin" ON students
  FOR ALL USING (school_id = get_my_school_id() AND get_my_role() = 'admin');
CREATE POLICY "students_teacher_read" ON students
  FOR SELECT USING (school_id = get_my_school_id() AND get_my_role() = 'teacher'
    AND class_id IN (SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()));
CREATE POLICY "students_parent_read" ON students
  FOR SELECT USING (school_id = get_my_school_id() AND get_my_role() = 'parent'
    AND id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid()));

CREATE POLICY "parent_students_own"   ON parent_students FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "parent_students_admin" ON parent_students FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'admin');

CREATE POLICY "teacher_classes_read"        ON teacher_classes FOR SELECT USING (school_id = get_my_school_id());
CREATE POLICY "teacher_classes_admin_write" ON teacher_classes FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'admin');

CREATE POLICY "attendance_admin"         ON attendance FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'admin');
CREATE POLICY "attendance_teacher_write" ON attendance FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'teacher'
    AND class_id IN (SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()));
CREATE POLICY "attendance_parent_read"   ON attendance FOR SELECT USING (school_id = get_my_school_id() AND get_my_role() = 'parent'
    AND student_id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid()));

CREATE POLICY "marks_admin"         ON marks FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'admin');
CREATE POLICY "marks_teacher_write" ON marks FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'teacher'
    AND class_id IN (SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()));
CREATE POLICY "marks_parent_read"   ON marks FOR SELECT USING (school_id = get_my_school_id() AND get_my_role() = 'parent'
    AND published = true AND student_id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid()));

CREATE POLICY "homework_admin"         ON homework FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'admin');
CREATE POLICY "homework_teacher_write" ON homework FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'teacher'
    AND class_id IN (SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()));
CREATE POLICY "homework_parent_read"   ON homework FOR SELECT USING (school_id = get_my_school_id() AND get_my_role() = 'parent'
    AND is_draft = false AND class_id IN (
      SELECT s.class_id FROM students s JOIN parent_students ps ON ps.student_id = s.id WHERE ps.parent_id = auth.uid()));

CREATE POLICY "behaviour_admin"         ON behaviour_logs FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'admin');
CREATE POLICY "behaviour_teacher_write" ON behaviour_logs FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'teacher'
    AND student_id IN (SELECT s.id FROM students s JOIN teacher_classes tc ON tc.class_id = s.class_id WHERE tc.teacher_id = auth.uid()));
CREATE POLICY "behaviour_parent_read"   ON behaviour_logs FOR SELECT USING (school_id = get_my_school_id() AND get_my_role() = 'parent'
    AND student_id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid()));

CREATE POLICY "announcements_read"          ON announcements FOR SELECT USING (school_id = get_my_school_id());
CREATE POLICY "announcements_teacher_write" ON announcements FOR INSERT WITH CHECK (school_id = get_my_school_id() AND get_my_role() IN ('teacher','admin'));

CREATE POLICY "threads_participant"  ON message_threads FOR ALL USING (school_id = get_my_school_id() AND (parent_id = auth.uid() OR teacher_id = auth.uid()));
CREATE POLICY "messages_participant" ON messages        FOR ALL USING (school_id = get_my_school_id()
    AND thread_id IN (SELECT id FROM message_threads WHERE parent_id = auth.uid() OR teacher_id = auth.uid()));

CREATE POLICY "notices_read"      ON notices FOR SELECT USING (school_id = get_my_school_id() AND is_visible = true);
CREATE POLICY "notices_admin_all" ON notices FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'admin');

CREATE POLICY "albums_read"        ON event_albums FOR SELECT USING (school_id = get_my_school_id());
CREATE POLICY "albums_admin_write" ON event_albums FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'admin');
CREATE POLICY "photos_read"        ON event_photos FOR SELECT USING (school_id = get_my_school_id());
CREATE POLICY "photos_admin_write" ON event_photos FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'admin');

CREATE POLICY "timetable_read"        ON timetable FOR SELECT USING (school_id = get_my_school_id());
CREATE POLICY "timetable_admin_write" ON timetable FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'admin');
CREATE POLICY "timetable_teacher_read" ON timetable FOR SELECT USING (school_id = get_my_school_id() AND get_my_role() IN ('admin','teacher','parent'));

CREATE POLICY "calendar_read"        ON calendar_events FOR SELECT USING (school_id = get_my_school_id());
CREATE POLICY "calendar_admin_write" ON calendar_events FOR ALL    USING (school_id = get_my_school_id() AND get_my_role() = 'admin');

CREATE POLICY "notif_log_own" ON notification_log FOR SELECT USING (recipient_id = auth.uid());

-- Trigger: auto-create profile on new auth user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, school_id, role, name)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'school_id')::UUID,
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: auto-set marks.published_at
CREATE OR REPLACE FUNCTION handle_marks_publish()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.published = true AND OLD.published = false THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_marks_published
  BEFORE UPDATE ON marks
  FOR EACH ROW EXECUTE FUNCTION handle_marks_publish();


-- ============================================================
-- STEP 2: MIGRATION 002 — Storage buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('school-logos',   'school-logos',   true, 5242880,  ARRAY['image/png','image/jpeg','image/webp']),
  ('event-photos',   'event-photos',   true, 10485760, ARRAY['image/png','image/jpeg','image/webp']),
  ('student-photos', 'student-photos', true, 5242880,  ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS (wrapped in DO blocks to avoid errors on re-run)
DO $$ BEGIN
  CREATE POLICY "logos_admin_upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'school-logos' AND get_my_role() = 'admin'
      AND (storage.foldername(name))[1] = get_my_school_id()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "logos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'school-logos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "event_photos_admin_upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'event-photos' AND get_my_role() = 'admin'
      AND (storage.foldername(name))[1] = get_my_school_id()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "event_photos_school_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'event-photos'
      AND (storage.foldername(name))[1] = get_my_school_id()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "student_photos_staff_upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'student-photos' AND get_my_role() IN ('admin','teacher')
      AND (storage.foldername(name))[1] = get_my_school_id()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "student_photos_school_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'student-photos'
      AND (storage.foldername(name))[1] = get_my_school_id()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- STEP 3: MIGRATION 004 — Fee management tables
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_structures (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  amount        NUMERIC(10,2) NOT NULL,
  frequency     TEXT NOT NULL DEFAULT 'monthly',
  class_ids     UUID[],
  academic_year TEXT NOT NULL DEFAULT '2024-25',
  is_active     BOOLEAN DEFAULT true,
  description   TEXT,
  due_day       INT DEFAULT 10,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_fees (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_structure_id  UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  amount_due        NUMERIC(10,2) NOT NULL,
  amount_paid       NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_date          DATE NOT NULL,
  paid_date         DATE,
  status            TEXT NOT NULL DEFAULT 'pending',
  payment_mode      TEXT,
  receipt_no        TEXT,
  remarks           TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fee_reminders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sent_by     UUID REFERENCES profiles(id),
  message     TEXT NOT NULL,
  recipient_count INT DEFAULT 0,
  sent_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_fees_student   ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_school    ON student_fees(school_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status    ON student_fees(status);
CREATE INDEX IF NOT EXISTS idx_fee_structures_school  ON fee_structures(school_id);

ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_reminders  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_fee_structures" ON fee_structures
  FOR ALL USING (school_id = (SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_student_fees" ON student_fees
  FOR ALL USING (school_id = (SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_fee_reminders" ON fee_reminders
  FOR ALL USING (school_id = (SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "parent_view_student_fees" ON student_fees
  FOR SELECT USING (student_id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid()));

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_fees_updated_at
  BEFORE UPDATE ON student_fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- STEP 4: CREATE AUTH USERS WITH SPECIFIC UUIDs
-- Trigger is disabled so we can insert school first (via seed below).
-- After seed inserts school + profiles, trigger is re-enabled.
-- ============================================================
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Remove old demo users if any
DELETE FROM auth.users WHERE email IN (
  'admin@stxaviers.edu.in',
  'teacher@stxaviers.edu.in',
  'parent@stxaviers.edu.in'
);

INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '3d6fdcbf-d5b8-4d02-a01d-3c5b5e834110',
    'authenticated', 'authenticated',
    'admin@stxaviers.edu.in',
    crypt('Admin@1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"admin","school_id":"77777777-7777-7777-7777-777777777777","name":"Sarah Johnson"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '4da6b145-d3c8-426e-8836-ccbf006e4521',
    'authenticated', 'authenticated',
    'teacher@stxaviers.edu.in',
    crypt('Teacher@1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"teacher","school_id":"77777777-7777-7777-7777-777777777777","name":"Mr. Rajesh Iyer"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c41bf63c-782e-4d26-8658-613fd1b57a7d',
    'authenticated', 'authenticated',
    'parent@stxaviers.edu.in',
    crypt('Parent@1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"parent","school_id":"77777777-7777-7777-7777-777777777777","name":"Mr. Sunil Sharma"}'::jsonb,
    now(), now(), '', '', '', ''
  );

ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;


-- ============================================================
-- STEP 5: SEED ALL DATA (auth users exist, so profiles FK works)
-- ============================================================

-- 1. School
INSERT INTO schools (id, name, address, academic_year, brand_color)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  'St. Xavier''s International Academy',
  'Plot No. 42, Knowledge Park III, Mumbai 400001',
  '2024-2025',
  '#1a3a6b'
);

-- 2. Profiles (must exist in auth.users — inserted above)
INSERT INTO profiles (id, school_id, role, name, phone)
VALUES
  ('3d6fdcbf-d5b8-4d02-a01d-3c5b5e834110', '77777777-7777-7777-7777-777777777777', 'admin',   'Sarah Johnson',    '+91 98765 43210'),
  ('4da6b145-d3c8-426e-8836-ccbf006e4521', '77777777-7777-7777-7777-777777777777', 'teacher', 'Mr. Rajesh Iyer',  '+91 98765 43211'),
  ('c41bf63c-782e-4d26-8658-613fd1b57a7d', '77777777-7777-7777-7777-777777777777', 'parent',  'Mr. Sunil Sharma', '+91 98765 43212');

-- 3. Classes
INSERT INTO classes (id, school_id, name, grade, section)
VALUES
  ('88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', '10-A', '10', 'A'),
  ('88888888-8888-8888-8888-888888888889', '77777777-7777-7777-7777-777777777777', '10-B', '10', 'B');

-- 4. Teacher → Class link
INSERT INTO teacher_classes (id, teacher_id, class_id, school_id, subject, is_class_teacher)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  '4da6b145-d3c8-426e-8836-ccbf006e4521',
  '88888888-8888-8888-8888-888888888888',
  '77777777-7777-7777-7777-777777777777',
  'Mathematics', true
);

-- 5. Students
INSERT INTO students (id, school_id, class_id, name, roll_no, dob, father_name)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', 'Arjun Sharma', '10A01', '2010-05-15', 'Mr. Sunil Sharma'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', '77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', 'Neha Patil',   '10A02', '2010-08-22', 'Mr. Vijay Patil');

-- 6. Parent → Student link
INSERT INTO parent_students (id, parent_id, student_id, school_id)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'c41bf63c-782e-4d26-8658-613fd1b57a7d',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '77777777-7777-7777-7777-777777777777'
);

-- 7. Notices
INSERT INTO notices (school_id, admin_id, title, body, category, is_visible, created_at)
VALUES
  ('77777777-7777-7777-7777-777777777777', '3d6fdcbf-d5b8-4d02-a01d-3c5b5e834110',
   'Annual Sports Meet 2026',
   'Dear parents and students, the annual sports meet will be held from June 1st to June 3rd. Detailed schedules for various track and field events are posted on the notice board. Let''s ensure 100% participation!',
   'SPORTS', true, now() - INTERVAL '1 day'),
  ('77777777-7777-7777-7777-777777777777', '3d6fdcbf-d5b8-4d02-a01d-3c5b5e834110',
   'Summer Vacation Announcement',
   'Dear parents, the school will remain closed for summer vacation from June 12th to July 15th. Regular classes will resume on July 16th. Summer homework has been uploaded under homework modules.',
   'ACADEMIC', true, now() - INTERVAL '3 days'),
  ('77777777-7777-7777-7777-777777777777', '3d6fdcbf-d5b8-4d02-a01d-3c5b5e834110',
   'Science Exhibition Winners!',
   'Congratulations to Arjun Sharma from Class 10-A for securing the first position in the Inter-School Science Exhibition with his innovative solar harvester model!',
   'ACHIEVEMENT', true, now() - INTERVAL '5 days');

-- 8. Timetable (Class 10-A)
INSERT INTO timetable (school_id, class_id, teacher_id, subject, day_of_week, start_time, end_time)
VALUES
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Mathematics',    'Monday',    '08:30:00', '09:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL,                                   'English',        'Monday',    '09:30:00', '10:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL,                                   'Science',        'Monday',    '11:00:00', '12:00:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL,                                   'Social Science', 'Monday',    '12:00:00', '13:00:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Mathematics',    'Tuesday',   '08:30:00', '09:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL,                                   'English',        'Tuesday',   '09:30:00', '10:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL,                                   'Science',        'Tuesday',   '11:00:00', '12:00:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Mathematics',    'Wednesday', '08:30:00', '09:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL,                                   'Science',        'Wednesday', '09:30:00', '10:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL,                                   'Physical Education', 'Wednesday', '11:00:00', '12:00:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Mathematics',    'Thursday',  '08:30:00', '09:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL,                                   'English',        'Thursday',  '09:30:00', '10:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL,                                   'Science',        'Thursday',  '11:00:00', '12:00:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Mathematics',    'Friday',    '08:30:00', '09:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL,                                   'English',        'Friday',    '09:30:00', '10:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL,                                   'Social Science', 'Friday',    '11:00:00', '12:00:00');

-- 9. Calendar events (title = name, both columns populated)
INSERT INTO calendar_events (school_id, title, name, event_date, type, description)
VALUES
  ('77777777-7777-7777-7777-777777777777', 'Mid-Term Mathematics Exam',    'Mid-Term Mathematics Exam',    '2026-05-26', 'exam',    'Mathematics theoretical and practical evaluation worth 100 marks.'),
  ('77777777-7777-7777-7777-777777777777', 'Annual Science Exhibition',    'Annual Science Exhibition',    '2026-05-29', 'event',   'Students showcase physics, chemistry, and biology models.'),
  ('77777777-7777-7777-7777-777777777777', 'World Environment Day Planting','World Environment Day Planting','2026-06-05','event',  'Tree planting drive in and around the campus premises.'),
  ('77777777-7777-7777-7777-777777777777', 'Summer Vacation Begins',       'Summer Vacation Begins',       '2026-06-12', 'holiday', 'School closed for students.');

-- 10. Attendance history (Arjun Sharma)
INSERT INTO attendance (school_id, student_id, class_id, teacher_id, date, status, note)
VALUES
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-11', 'present', NULL),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-12', 'present', NULL),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-13', 'absent',  'Viral fever'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-14', 'present', NULL),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-15', 'present', NULL),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-18', 'present', NULL),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-19', 'late',    'Missed school bus'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-20', 'present', NULL),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-21', 'present', NULL),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-22', 'present', NULL);

-- 11. Marks (all rows use teacher UUID — seed had NULLs which violated NOT NULL constraint)
INSERT INTO marks (school_id, student_id, class_id, teacher_id, subject, exam_type, score, max_score, published, published_at)
VALUES
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Mathematics', 'Unit Test 1', 92, 100, true, now() - INTERVAL '10 days'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Science',     'Unit Test 1', 88, 100, true, now() - INTERVAL '9 days'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'English',     'Unit Test 1', 95, 100, true, now() - INTERVAL '8 days'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Mathematics', 'Mid Term',   94, 100, true, now() - INTERVAL '1 day'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Science',     'Mid Term',   85, 100, true, now() - INTERVAL '1 day'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'English',     'Mid Term',   91, 100, true, now() - INTERVAL '1 day');

-- 12. Fee structures
INSERT INTO fee_structures (id, school_id, name, amount, frequency, class_ids, academic_year, is_active, due_day)
VALUES
  ('55555555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777', 'Tuition Fee (Q1)', 15000.00, 'quarterly',
   ARRAY['88888888-8888-8888-8888-888888888888'::UUID], '2024-25', true, 10),
  ('55555555-5555-5555-5555-555555555556', '77777777-7777-7777-7777-777777777777', 'Transport Fee (May)', 2500.00, 'monthly',
   ARRAY['88888888-8888-8888-8888-888888888888'::UUID], '2024-25', true, 10);

-- 13. Student fees (Arjun Sharma)
INSERT INTO student_fees (school_id, student_id, fee_structure_id, amount_due, amount_paid, due_date, paid_date, status, payment_mode, receipt_no, remarks)
VALUES
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555',
   15000.00, 15000.00, '2026-04-10', '2026-04-05', 'paid', 'upi', 'REC-2026-00412', 'Paid online via parents UPI dashboard'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555556',
   2500.00, 0.00, '2026-05-10', NULL, 'overdue', NULL, NULL, 'Overdue monthly transport fee');

-- 14. Behaviour logs
INSERT INTO behaviour_logs (school_id, student_id, teacher_id, date, note, type, teacher_name)
VALUES
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '4da6b145-d3c8-426e-8836-ccbf006e4521',
   '2026-05-20', 'Excellent performance and active participation in the classroom debate on algebra.', 'positive', 'Mr. Rajesh Iyer'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '4da6b145-d3c8-426e-8836-ccbf006e4521',
   '2026-05-22', 'Helped a fellow classmate clean up their science equipment after the lab session.', 'positive', 'Mr. Rajesh Iyer');

-- ============================================================
-- DONE. All tables created, users seeded, data loaded.
-- Login credentials:
--   Admin:   admin@stxaviers.edu.in   / Admin@1234
--   Teacher: teacher@stxaviers.edu.in / Teacher@1234
--   Parent:  parent@stxaviers.edu.in  / Parent@1234
-- ============================================================
