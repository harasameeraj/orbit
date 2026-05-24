-- ============================================================
-- SchoolConnect — Full Consolidated Database Schema
-- Combine migrations: 001_initial_schema, 002_storage_buckets, 
--                     003_timetable_and_calendar_fixes, 004_fee_management.
--
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- =============================================================================
-- PART 1: INITIAL SCHEMA (Migration 001)
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SCHOOLS
CREATE TABLE schools (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  address       TEXT,
  logo_url      TEXT,
  brand_color   TEXT DEFAULT '#1a3a6b',
  academic_year TEXT DEFAULT '2024-2025',
  session_start DATE,
  absence_alerts_enabled BOOLEAN DEFAULT true,
  report_time   TIME DEFAULT '16:00:00',   -- daily report delivery time (IST)
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- PROFILES (extends Supabase auth.users)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin','teacher','parent')),
  name        TEXT NOT NULL,
  phone       TEXT,
  avatar_url  TEXT,
  fcm_token   TEXT,           -- Firebase Cloud Messaging device token
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- CLASSES
CREATE TABLE classes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,   -- e.g. "10-A"
  grade      TEXT NOT NULL,   -- e.g. "10"
  section    TEXT NOT NULL,   -- e.g. "A"
  created_at TIMESTAMPTZ DEFAULT now()
);

-- STUDENTS
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

-- PARENT → STUDENT link (one parent can have multiple children)
CREATE TABLE parent_students (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  UNIQUE(parent_id, student_id)
);

-- TEACHER → CLASS link
CREATE TABLE teacher_classes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  is_class_teacher BOOLEAN DEFAULT false,
  UNIQUE(teacher_id, class_id, subject)
);

-- ATTENDANCE
CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES profiles(id),
  date        DATE NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('present','absent','late','holiday')),
  marked_at   TIMESTAMPTZ DEFAULT now(),
  note        TEXT,
  UNIQUE(school_id, student_id, date)
);

-- MARKS
CREATE TABLE marks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES profiles(id),
  subject     TEXT NOT NULL,
  exam_type   TEXT NOT NULL,    -- "Unit Test 1", "Mid Term", etc.
  score       INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  max_score   INTEGER NOT NULL DEFAULT 100,
  published   BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, student_id, subject, exam_type)
);

-- HOMEWORK
CREATE TABLE homework (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES profiles(id),
  subject     TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE,
  is_draft    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- BEHAVIOUR LOGS (teacher remarks per student per day)
CREATE TABLE behaviour_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES profiles(id),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  note        TEXT NOT NULL,
  type        TEXT DEFAULT 'neutral' CHECK (type IN ('positive','neutral','concern')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ANNOUNCEMENTS (teacher → class parents)
CREATE TABLE announcements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id    UUID REFERENCES classes(id),   -- NULL = school-wide
  teacher_id  UUID REFERENCES profiles(id),
  title       TEXT NOT NULL,
  body         TEXT NOT NULL,
  is_urgent   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- MESSAGES (parent ↔ teacher async chat)
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

-- NOTICES (admin → school-wide, shown on noticeboard)
CREATE TABLE notices (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  admin_id     UUID REFERENCES profiles(id),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  category     TEXT DEFAULT 'GENERAL',
  is_visible   BOOLEAN DEFAULT true,
  attachment_url TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- EVENT PHOTOS (noticeboard photo albums)
CREATE TABLE event_albums (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  admin_id    UUID REFERENCES profiles(id),
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

-- TIMETABLE
CREATE TABLE timetable (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES profiles(id),
  subject     TEXT NOT NULL,
  topic       TEXT,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL
);

-- ACADEMIC CALENDAR
CREATE TABLE calendar_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  event_date  DATE NOT NULL,
  end_date    DATE,
  type        TEXT DEFAULT 'event' CHECK (type IN ('exam','holiday','event','meeting','sports')),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- NOTIFICATION LOG (track what was sent)
CREATE TABLE notification_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  type         TEXT NOT NULL,   -- 'daily_report' | 'absence_alert' | 'fee_reminder' | 'announcement'
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  sent_at      TIMESTAMPTZ DEFAULT now(),
  fcm_success  BOOLEAN
);

-- INDEXES (performance)
CREATE INDEX idx_attendance_school_date   ON attendance(school_id, date);
CREATE INDEX idx_attendance_student_date  ON attendance(student_id, date);
CREATE INDEX idx_marks_student            ON marks(student_id, school_id);
CREATE INDEX idx_homework_class           ON homework(class_id, school_id);
CREATE INDEX idx_messages_thread          ON messages(thread_id, sent_at);
CREATE INDEX idx_behaviour_student_date   ON behaviour_logs(student_id, date);
CREATE INDEX idx_profiles_school          ON profiles(school_id);
CREATE INDEX idx_parent_students_parent   ON parent_students(parent_id);

-- HELPER FUNCTIONS (used in RLS policies)
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ROW LEVEL SECURITY — Enable on every table
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

-- RLS POLICIES

-- SCHOOLS: only see your own school
CREATE POLICY "school_isolation" ON schools
  FOR ALL USING (id = get_my_school_id());

-- PROFILES: see profiles in your school only
CREATE POLICY "profiles_school_isolation" ON profiles
  FOR SELECT USING (school_id = get_my_school_id());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- CLASSES: any authenticated user in the school can read
CREATE POLICY "classes_read" ON classes
  FOR SELECT USING (school_id = get_my_school_id());

CREATE POLICY "classes_admin_write" ON classes
  FOR ALL USING (school_id = get_my_school_id() AND get_my_role() = 'admin');

-- STUDENTS:
--   Admin → all students in school
--   Teacher → students in their assigned classes only
--   Parent → only their own children
CREATE POLICY "students_admin" ON students
  FOR ALL USING (
    school_id = get_my_school_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "students_teacher_read" ON students
  FOR SELECT USING (
    school_id = get_my_school_id()
    AND get_my_role() = 'teacher'
    AND class_id IN (
      SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "students_parent_read" ON students
  FOR SELECT USING (
    school_id = get_my_school_id()
    AND get_my_role() = 'parent'
    AND id IN (
      SELECT student_id FROM parent_students WHERE parent_id = auth.uid()
    )
  );

-- PARENT_STUDENTS: parents see only their own links
CREATE POLICY "parent_students_own" ON parent_students
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "parent_students_admin" ON parent_students
  FOR ALL USING (
    school_id = get_my_school_id() AND get_my_role() = 'admin'
  );

-- TEACHER_CLASSES
CREATE POLICY "teacher_classes_read" ON teacher_classes
  FOR SELECT USING (school_id = get_my_school_id());

CREATE POLICY "teacher_classes_admin_write" ON teacher_classes
  FOR ALL USING (
    school_id = get_my_school_id() AND get_my_role() = 'admin'
  );

-- ATTENDANCE:
--   Teacher → insert/update for their classes; read their classes
--   Parent → read only their children's attendance
--   Admin → full access
CREATE POLICY "attendance_admin" ON attendance
  FOR ALL USING (
    school_id = get_my_school_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "attendance_teacher_write" ON attendance
  FOR ALL USING (
    school_id = get_my_school_id()
    AND get_my_role() = 'teacher'
    AND class_id IN (
      SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "attendance_parent_read" ON attendance
  FOR SELECT USING (
    school_id = get_my_school_id()
    AND get_my_role() = 'parent'
    AND student_id IN (
      SELECT student_id FROM parent_students WHERE parent_id = auth.uid()
    )
  );

-- MARKS:
--   Teacher → write marks for their classes; parent reads only published marks for their children
CREATE POLICY "marks_admin" ON marks
  FOR ALL USING (
    school_id = get_my_school_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "marks_teacher_write" ON marks
  FOR ALL USING (
    school_id = get_my_school_id()
    AND get_my_role() = 'teacher'
    AND class_id IN (
      SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "marks_parent_read" ON marks
  FOR SELECT USING (
    school_id = get_my_school_id()
    AND get_my_role() = 'parent'
    AND published = true
    AND student_id IN (
      SELECT student_id FROM parent_students WHERE parent_id = auth.uid()
    )
  );

-- HOMEWORK
CREATE POLICY "homework_admin" ON homework
  FOR ALL USING (
    school_id = get_my_school_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "homework_teacher_write" ON homework
  FOR ALL USING (
    school_id = get_my_school_id()
    AND get_my_role() = 'teacher'
    AND class_id IN (
      SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "homework_parent_read" ON homework
  FOR SELECT USING (
    school_id = get_my_school_id()
    AND get_my_role() = 'parent'
    AND is_draft = false
    AND class_id IN (
      SELECT s.class_id FROM students s
      JOIN parent_students ps ON ps.student_id = s.id
      WHERE ps.parent_id = auth.uid()
    )
  );

-- BEHAVIOUR LOGS
CREATE POLICY "behaviour_admin" ON behaviour_logs
  FOR ALL USING (
    school_id = get_my_school_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "behaviour_teacher_write" ON behaviour_logs
  FOR ALL USING (
    school_id = get_my_school_id()
    AND get_my_role() = 'teacher'
    AND student_id IN (
      SELECT s.id FROM students s
      JOIN teacher_classes tc ON tc.class_id = s.class_id
      WHERE tc.teacher_id = auth.uid()
    )
  );

CREATE POLICY "behaviour_parent_read" ON behaviour_logs
  FOR SELECT USING (
    school_id = get_my_school_id()
    AND get_my_role() = 'parent'
    AND student_id IN (
      SELECT student_id FROM parent_students WHERE parent_id = auth.uid()
    )
  );

-- ANNOUNCEMENTS
CREATE POLICY "announcements_read" ON announcements
  FOR SELECT USING (school_id = get_my_school_id());

CREATE POLICY "announcements_teacher_write" ON announcements
  FOR INSERT WITH CHECK (
    school_id = get_my_school_id()
    AND get_my_role() IN ('teacher','admin')
  );

-- MESSAGE THREADS: only the parent and teacher in the thread
CREATE POLICY "threads_participant" ON message_threads
  FOR ALL USING (
    school_id = get_my_school_id()
    AND (parent_id = auth.uid() OR teacher_id = auth.uid())
  );

CREATE POLICY "messages_participant" ON messages
  FOR ALL USING (
    school_id = get_my_school_id()
    AND thread_id IN (
      SELECT id FROM message_threads
      WHERE parent_id = auth.uid() OR teacher_id = auth.uid()
    )
  );

-- NOTICES: everyone in school reads; admin writes
CREATE POLICY "notices_read" ON notices
  FOR SELECT USING (
    school_id = get_my_school_id() AND is_visible = true
  );

CREATE POLICY "notices_admin_all" ON notices
  FOR ALL USING (
    school_id = get_my_school_id() AND get_my_role() = 'admin'
  );

-- EVENT ALBUMS + PHOTOS: everyone reads, admin writes
CREATE POLICY "albums_read" ON event_albums
  FOR SELECT USING (school_id = get_my_school_id());

CREATE POLICY "albums_admin_write" ON event_albums
  FOR ALL USING (
    school_id = get_my_school_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "photos_read" ON event_photos
  FOR SELECT USING (school_id = get_my_school_id());

CREATE POLICY "photos_admin_write" ON event_photos
  FOR ALL USING (
    school_id = get_my_school_id() AND get_my_role() = 'admin'
  );

-- TIMETABLE: everyone in school reads; admin writes
CREATE POLICY "timetable_read" ON timetable
  FOR SELECT USING (school_id = get_my_school_id());

CREATE POLICY "timetable_admin_write" ON timetable
  FOR ALL USING (
    school_id = get_my_school_id() AND get_my_role() = 'admin'
  );

-- CALENDAR: everyone reads; admin writes
CREATE POLICY "calendar_read" ON calendar_events
  FOR SELECT USING (school_id = get_my_school_id());

CREATE POLICY "calendar_admin_write" ON calendar_events
  FOR ALL USING (
    school_id = get_my_school_id() AND get_my_role() = 'admin'
  );

-- NOTIFICATION LOG: users see their own
CREATE POLICY "notif_log_own" ON notification_log
  FOR SELECT USING (recipient_id = auth.uid());


-- TRIGGERS

-- Trigger: auto-create profile row after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- school_id and role come from user metadata set during invite
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: auto-mark marks.published_at when published = true
CREATE OR REPLACE FUNCTION handle_marks_publish()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.published = true AND OLD.published = false THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_marks_published
  BEFORE UPDATE ON marks
  FOR EACH ROW EXECUTE FUNCTION handle_marks_publish();


-- =============================================================================
-- PART 2: STORAGE BUCKETS (Migration 002)
-- =============================================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('school-logos',  'school-logos',  true, 5242880,   ARRAY['image/png','image/jpeg','image/webp']),
  ('event-photos',  'event-photos',  true, 10485760,  ARRAY['image/png','image/jpeg','image/webp']),
  ('student-photos','student-photos',true, 5242880,   ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies

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


-- =============================================================================
-- PART 3: TIMETABLE & CALENDAR FIXES (Migration 003)
-- =============================================================================

-- Add unique constraint for timetable upsert (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'timetable_class_day_time_unique'
  ) THEN
    ALTER TABLE timetable
      ADD CONSTRAINT timetable_class_day_time_unique
      UNIQUE (class_id, day_of_week, start_time);
  END IF;
END $$;

-- calendar_events uses 'title' in DB but our new code uses 'name'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'name'
  ) THEN
    ALTER TABLE calendar_events ADD COLUMN name TEXT;
    -- Backfill from title
    UPDATE calendar_events SET name = title WHERE name IS NULL;
  END IF;
END $$;

-- RLS: allow admin to write timetable
DROP POLICY IF EXISTS "timetable_admin_write" ON timetable;
CREATE POLICY "timetable_admin_write" ON timetable
  FOR ALL
  USING (school_id = get_my_school_id() AND get_my_role() = 'admin')
  WITH CHECK (school_id = get_my_school_id() AND get_my_role() = 'admin');

-- Also allow teachers to read their own class timetable
DROP POLICY IF EXISTS "timetable_teacher_read" ON timetable;
CREATE POLICY "timetable_teacher_read" ON timetable
  FOR SELECT
  USING (
    school_id = get_my_school_id()
    AND (
      get_my_role() IN ('admin','teacher','parent')
    )
  );

-- RLS for calendar_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'calendar_events' AND policyname = 'calendar_read'
  ) THEN
    CREATE POLICY "calendar_read" ON calendar_events
      FOR SELECT USING (school_id = get_my_school_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'calendar_events' AND policyname = 'calendar_admin_write'
  ) THEN
    CREATE POLICY "calendar_admin_write" ON calendar_events
      FOR ALL
      USING (school_id = get_my_school_id() AND get_my_role() = 'admin')
      WITH CHECK (school_id = get_my_school_id() AND get_my_role() = 'admin');
  END IF;
END $$;

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- PART 4: FEE MANAGEMENT (Migration 004)
-- =============================================================================

-- Fee structures (e.g. Tuition, Transport, Library, Lab)
CREATE TABLE IF NOT EXISTS fee_structures (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                  -- e.g. "Tuition Fee", "Transport Fee"
  amount        NUMERIC(10,2) NOT NULL,
  frequency     TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'quarterly' | 'annual' | 'one_time'
  class_ids     UUID[],                          -- NULL means applies to all classes
  academic_year TEXT NOT NULL DEFAULT '2024-25',
  is_active     BOOLEAN DEFAULT true,
  description   TEXT,
  due_day       INT DEFAULT 10,                  -- Day of month payment is due
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Per-student fee records (one row per student per fee_structure per term)
CREATE TABLE IF NOT EXISTS student_fees (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_structure_id  UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  amount_due        NUMERIC(10,2) NOT NULL,
  amount_paid       NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_date          DATE NOT NULL,
  paid_date         DATE,
  status            TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'partial' | 'overdue' | 'waived'
  payment_mode      TEXT,                             -- 'cash' | 'upi' | 'bank_transfer' | 'cheque'
  receipt_no        TEXT,
  remarks           TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Fee reminder log
CREATE TABLE IF NOT EXISTS fee_reminders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sent_by     UUID REFERENCES profiles(id),
  message     TEXT NOT NULL,
  recipient_count INT DEFAULT 0,
  sent_at     TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_fees_student   ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_school    ON student_fees(school_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status    ON student_fees(status);
CREATE INDEX IF NOT EXISTS idx_fee_structures_school  ON fee_structures(school_id);

-- RLS
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_reminders  ENABLE ROW LEVEL SECURITY;

-- Admin can do anything within their school
CREATE POLICY "admin_fee_structures" ON fee_structures
  FOR ALL USING (
    school_id = (SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_student_fees" ON student_fees
  FOR ALL USING (
    school_id = (SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_fee_reminders" ON fee_reminders
  FOR ALL USING (
    school_id = (SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Parents can view their child's fees
CREATE POLICY "parent_view_student_fees" ON student_fees
  FOR SELECT USING (
    student_id IN (
      SELECT student_id FROM parent_students WHERE parent_id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_student_fees_updated_at
  BEFORE UPDATE ON student_fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Behaviour log enhancements
-- Add teacher_name column for display without join
ALTER TABLE behaviour_logs ADD COLUMN IF NOT EXISTS teacher_name TEXT;

-- Expand type check to include 'disciplinary' and 'academic'
ALTER TABLE behaviour_logs DROP CONSTRAINT IF EXISTS behaviour_logs_type_check;
ALTER TABLE behaviour_logs ADD CONSTRAINT behaviour_logs_type_check
  CHECK (type IN ('positive', 'neutral', 'concern', 'disciplinary', 'academic'));
