-- スクール申込テーブル
CREATE TABLE IF NOT EXISTS school_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  class_type TEXT NOT NULL, -- 'free' or 'basic'
  class_name TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_age INTEGER,
  student_grade TEXT,
  monthly_fee DECIMAL(10, 2) NOT NULL,
  registration_fee DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, active, paused, cancelled
  payment_status TEXT DEFAULT 'pending', -- pending, paid, failed
  enrollment_date TIMESTAMPTZ DEFAULT NOW(),
  start_date DATE,
  stripe_subscription_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_school_enrollments_customer_id ON school_enrollments(customer_id);
CREATE INDEX idx_school_enrollments_status ON school_enrollments(status);
CREATE INDEX idx_school_enrollments_class_type ON school_enrollments(class_type);
CREATE INDEX idx_school_enrollments_enrollment_date ON school_enrollments(enrollment_date);

-- 更新時刻を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_school_enrollments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_school_enrollments_updated_at_trigger
BEFORE UPDATE ON school_enrollments
FOR EACH ROW
EXECUTE FUNCTION update_school_enrollments_updated_at();