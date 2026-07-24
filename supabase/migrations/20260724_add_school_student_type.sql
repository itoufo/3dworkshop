-- 大人の受講者に対応するため、受講者区分を記録する
-- child: お子様（18歳以下・保護者が契約者）
-- adult: 大人（19歳以上・本人が契約者。保護者名と学年を持たない）
ALTER TABLE school_enrollments
  ADD COLUMN IF NOT EXISTS student_type TEXT NOT NULL DEFAULT 'child';

ALTER TABLE school_enrollments
  DROP CONSTRAINT IF EXISTS school_enrollments_student_type_check;

ALTER TABLE school_enrollments
  ADD CONSTRAINT school_enrollments_student_type_check
  CHECK (student_type IN ('child', 'adult'));

CREATE INDEX IF NOT EXISTS idx_school_enrollments_student_type
  ON school_enrollments(student_type);
