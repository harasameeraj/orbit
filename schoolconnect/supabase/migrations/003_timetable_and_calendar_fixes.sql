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
-- Add a 'name' column alias via a generated column or just rename.
-- We'll add 'name' as a real column and keep 'title' for backward compat.
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
