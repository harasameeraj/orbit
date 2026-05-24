-- Fee Management Schema
-- Migration 004: Fee structures, student fee records, payment tracking

-- Fee categories (e.g. Tuition, Transport, Library, Lab)
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

CREATE TRIGGER update_student_fees_updated_at
  BEFORE UPDATE ON student_fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed some default fee structures (runs only if school has none)
-- This is a comment — admins create their own via the UI

-- ── Behaviour log enhancements ──────────────────────────────────────────────
-- Add teacher_name column for display without join
ALTER TABLE behaviour_logs ADD COLUMN IF NOT EXISTS teacher_name TEXT;

-- Expand type check to include 'disciplinary' and 'academic'
ALTER TABLE behaviour_logs DROP CONSTRAINT IF EXISTS behaviour_logs_type_check;
ALTER TABLE behaviour_logs ADD CONSTRAINT behaviour_logs_type_check
  CHECK (type IN ('positive', 'neutral', 'concern', 'disciplinary', 'academic'));
