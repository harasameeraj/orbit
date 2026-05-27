-- ============================================================
-- SchoolConnect — Complete Database Seed Script
-- Populates the hosted Supabase project with premium mock data
-- ============================================================

-- Clean up any existing data (safe tables first due to foreign keys)
TRUNCATE TABLE notification_log CASCADE;
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE message_threads CASCADE;
TRUNCATE TABLE behaviour_logs CASCADE;
TRUNCATE TABLE homework CASCADE;
TRUNCATE TABLE marks CASCADE;
TRUNCATE TABLE attendance CASCADE;
TRUNCATE TABLE timetable CASCADE;
TRUNCATE TABLE calendar_events CASCADE;
TRUNCATE TABLE notices CASCADE;
TRUNCATE TABLE event_photos CASCADE;
TRUNCATE TABLE event_albums CASCADE;
TRUNCATE TABLE student_fees CASCADE;
TRUNCATE TABLE fee_reminders CASCADE;
TRUNCATE TABLE fee_structures CASCADE;
TRUNCATE TABLE parent_students CASCADE;
TRUNCATE TABLE teacher_classes CASCADE;
TRUNCATE TABLE students CASCADE;
TRUNCATE TABLE classes CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE schools CASCADE;

-- 1. SEED A SCHOOL
INSERT INTO schools (id, name, address, academic_year, brand_color)
VALUES (
  '77777777-7777-7777-7777-777777777777', 
  'St. Xavier''s International Academy', 
  'Plot No. 42, Knowledge Park III, Mumbai 400001', 
  '2024-2025',
  '#1a3a6b'
);

-- 2. SEED PROFILES (links to existing Auth users)
INSERT INTO profiles (id, school_id, role, name, phone)
VALUES 
  (
    '3d6fdcbf-d5b8-4d02-a01d-3c5b5e834110', 
    '77777777-7777-7777-7777-777777777777', 
    'admin', 
    'Sarah Johnson',
    '+91 98765 43210'
  ),
  (
    '4da6b145-d3c8-426e-8836-ccbf006e4521', 
    '77777777-7777-7777-7777-777777777777', 
    'teacher', 
    'Mr. Rajesh Iyer',
    '+91 98765 43211'
  ),
  (
    'c41bf63c-782e-4d26-8658-613fd1b57a7d', 
    '77777777-7777-7777-7777-777777777777', 
    'parent', 
    'Mr. Sunil Sharma',
    '+91 98765 43212'
  );

-- 3. SEED CLASSES
INSERT INTO classes (id, school_id, name, grade, section)
VALUES 
  (
    '88888888-8888-8888-8888-888888888888', 
    '77777777-7777-7777-7777-777777777777', 
    '10-A', 
    '10', 
    'A'
  ),
  (
    '88888888-8888-8888-8888-888888888889', 
    '77777777-7777-7777-7777-777777777777', 
    '10-B', 
    '10', 
    'B'
  );

-- 4. LINK TEACHER TO CLASS
INSERT INTO teacher_classes (id, teacher_id, class_id, school_id, subject, is_class_teacher)
VALUES 
  (
    '99999999-9999-9999-9999-999999999999', 
    '4da6b145-d3c8-426e-8836-ccbf006e4521', 
    '88888888-8888-8888-8888-888888888888', 
    '77777777-7777-7777-7777-777777777777', 
    'Mathematics', 
    true
  );

-- 5. SEED STUDENTS
INSERT INTO students (id, school_id, class_id, name, roll_no, dob, father_name)
VALUES 
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    '77777777-7777-7777-7777-777777777777', 
    '88888888-8888-8888-8888-888888888888', 
    'Arjun Sharma', 
    '10A01', 
    '2010-05-15',
    'Mr. Sunil Sharma'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 
    '77777777-7777-7777-7777-777777777777', 
    '88888888-8888-8888-8888-888888888888', 
    'Neha Patil', 
    '10A02', 
    '2010-08-22',
    'Mr. Vijay Patil'
  );

-- 6. LINK STUDENT TO PARENT
INSERT INTO parent_students (id, parent_id, student_id, school_id)
VALUES 
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
    'c41bf63c-782e-4d26-8658-613fd1b57a7d', 
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    '77777777-7777-7777-7777-777777777777'
  );

-- 7. SEED NOTICES
INSERT INTO notices (school_id, admin_id, title, body, category, is_visible, created_at)
VALUES 
  (
    '77777777-7777-7777-7777-777777777777',
    '3d6fdcbf-d5b8-4d02-a01d-3c5b5e834110',
    'Annual Sports Meet 2026',
    'Dear parents and students, the annual sports meet will be held from June 1st to June 3rd. Detailed schedules for various track and field events are posted on the notice board. Let''s ensure 100% participation!',
    'SPORTS',
    true,
    now() - INTERVAL '1 day'
  ),
  (
    '77777777-7777-7777-7777-777777777777',
    '3d6fdcbf-d5b8-4d02-a01d-3c5b5e834110',
    'Summer Vacation Announcement',
    'Dear parents, the school will remain closed for summer vacation from June 12th to July 15th. Regular classes will resume on July 16th. Summer homework has been uploaded under homework modules.',
    'ACADEMIC',
    true,
    now() - INTERVAL '3 days'
  ),
  (
    '77777777-7777-7777-7777-777777777777',
    '3d6fdcbf-d5b8-4d02-a01d-3c5b5e834110',
    'Science Exhibition Winners!',
    'Congratulations to Arjun Sharma from Class 10-A for securing the first position in the Inter-School Science Exhibition with his innovative solar harvester model! St. Xavier''s is proud of you.',
    'ACHIEVEMENT',
    true,
    now() - INTERVAL '5 days'
  );

-- 8. SEED TIMETABLE SLOTS (Class 10-A)
INSERT INTO timetable (school_id, class_id, teacher_id, subject, day_of_week, start_time, end_time)
VALUES
  -- Monday
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Mathematics', 'Monday', '08:30:00', '09:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL, 'English', 'Monday', '09:30:00', '10:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL, 'Science', 'Monday', '11:00:00', '12:00:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL, 'Social Science', 'Monday', '12:00:00', '13:00:00'),
  -- Tuesday
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Mathematics', 'Tuesday', '08:30:00', '09:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL, 'English', 'Tuesday', '09:30:00', '10:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL, 'Science', 'Tuesday', '11:00:00', '12:00:00'),
  -- Wednesday
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Mathematics', 'Wednesday', '08:30:00', '09:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL, 'Science', 'Wednesday', '09:30:00', '10:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL, 'Physical Education', 'Wednesday', '11:00:00', '12:00:00'),
  -- Thursday
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Mathematics', 'Thursday', '08:30:00', '09:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL, 'English', 'Thursday', '09:30:00', '10:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL, 'Science', 'Thursday', '11:00:00', '12:00:00'),
  -- Friday
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Mathematics', 'Friday', '08:30:00', '09:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL, 'English', 'Friday', '09:30:00', '10:30:00'),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NULL, 'Social Science', 'Friday', '11:00:00', '12:00:00');

-- 9. SEED CALENDAR EVENTS
INSERT INTO calendar_events (school_id, name, event_date, type, description)
VALUES 
  ('77777777-7777-7777-7777-777777777777', 'Mid-Term Mathematics Exam', '2026-05-26', 'exam', 'Mathematics theoretical and practical evaluation worth 100 marks.'),
  ('77777777-7777-7777-7777-777777777777', 'Annual Science Exhibition', '2026-05-29', 'event', 'Students showcase physics, chemistry, and biology models.'),
  ('77777777-7777-7777-7777-777777777777', 'World Environment Day Planting', '2026-06-05', 'event', 'Tree planting drive in and around the campus premises.'),
  ('77777777-7777-7777-7777-777777777777', 'Summer Vacation Begins', '2026-06-12', 'holiday', 'School closed for students.');

-- 10. SEED ATTENDANCE HISTORY (Arjun Sharma)
INSERT INTO attendance (school_id, student_id, class_id, teacher_id, date, status, note)
VALUES 
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-11', 'present', NULL),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-12', 'present', NULL),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-13', 'absent', 'Viral fever'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-14', 'present', NULL),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-15', 'present', NULL),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-18', 'present', NULL),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-19', 'late', 'Missed school bus'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-20', 'present', NULL),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-21', 'present', NULL),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', '2026-05-22', 'present', NULL);

-- 11. SEED MARKS HISTORY (Arjun Sharma)
INSERT INTO marks (school_id, student_id, class_id, teacher_id, subject, exam_type, score, max_score, published, published_at)
VALUES 
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Mathematics', 'Unit Test 1', 92, 100, true, now() - INTERVAL '10 days'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', NULL, 'Science', 'Unit Test 1', 88, 100, true, now() - INTERVAL '9 days'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', NULL, 'English', 'Unit Test 1', 95, 100, true, now() - INTERVAL '8 days'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '4da6b145-d3c8-426e-8836-ccbf006e4521', 'Mathematics', 'Mid Term', 94, 100, true, now() - INTERVAL '1 day'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', NULL, 'Science', 'Mid Term', 85, 100, true, now() - INTERVAL '1 day'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', NULL, 'English', 'Mid Term', 91, 100, true, now() - INTERVAL '1 day');

-- 12. SEED FEE STRUCTURES
INSERT INTO fee_structures (id, school_id, name, amount, frequency, class_ids, academic_year, is_active, due_day)
VALUES 
  (
    '55555555-5555-5555-5555-555555555555', 
    '77777777-7777-7777-7777-777777777777', 
    'Tuition Fee (Q1)', 
    15000.00, 
    'quarterly', 
    ARRAY['88888888-8888-8888-8888-888888888888'::UUID], 
    '2024-25', 
    true, 
    10
  ),
  (
    '55555555-5555-5555-5555-555555555556', 
    '77777777-7777-7777-7777-777777777777', 
    'Transport Fee (May)', 
    2500.00, 
    'monthly', 
    ARRAY['88888888-8888-8888-8888-888888888888'::UUID], 
    '2024-25', 
    true, 
    10
  );

-- 13. SEED STUDENT FEES (Arjun Sharma)
INSERT INTO student_fees (school_id, student_id, fee_structure_id, amount_due, amount_paid, due_date, paid_date, status, payment_mode, receipt_no, remarks)
VALUES 
  (
    '77777777-7777-7777-7777-777777777777', 
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    '55555555-5555-5555-5555-555555555555', 
    15000.00, 
    15000.00, 
    '2026-04-10', 
    '2026-04-05', 
    'paid', 
    'upi', 
    'REC-2026-00412', 
    'Paid online via parents UPI dashboard'
  ),
  (
    '77777777-7777-7777-7777-777777777777', 
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    '55555555-5555-5555-5555-555555555556', 
    2500.00, 
    0.00, 
    '2026-05-10', 
    NULL, 
    'overdue', 
    NULL, 
    NULL, 
    'Overdue monthly transport fee'
  );

-- 14. SEED BEHAVIOUR LOGS
INSERT INTO behaviour_logs (school_id, student_id, teacher_id, date, note, type)
VALUES 
  (
    '77777777-7777-7777-7777-777777777777', 
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    '4da6b145-d3c8-426e-8836-ccbf006e4521', 
    '2026-05-20', 
    'Excellent performance and active participation in the classroom debate on algebra.', 
    'positive'
  ),
  (
    '77777777-7777-7777-7777-777777777777', 
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    '4da6b145-d3c8-426e-8836-ccbf006e4521', 
    '2026-05-22', 
    'Helped a fellow classmate clean up their science equipment after the lab session.', 
    'positive'
  );
