-- ワークショップに手動参加人数調整フィールドを追加
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS manual_participants INTEGER DEFAULT 0;

-- 手動参加人数の説明フィールドを追加（他媒体からの予約詳細など）
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS manual_participants_note TEXT;

-- 手動参加人数の更新履歴を記録するテーブルを作成
CREATE TABLE IF NOT EXISTS manual_participants_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
  previous_value INTEGER NOT NULL,
  new_value INTEGER NOT NULL,
  note TEXT,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_manual_participants_log_workshop ON manual_participants_log(workshop_id, created_at DESC);

-- 現在の参加人数を計算するビューを作成
CREATE OR REPLACE VIEW workshop_current_participants AS
SELECT 
  w.id,
  w.title,
  w.max_participants,
  w.manual_participants,
  COALESCE(SUM(b.participants), 0) AS booked_participants,
  w.manual_participants + COALESCE(SUM(b.participants), 0) AS total_participants,
  w.max_participants - (w.manual_participants + COALESCE(SUM(b.participants), 0)) AS available_spots
FROM workshops w
LEFT JOIN bookings b ON w.id = b.workshop_id 
  AND b.status != 'cancelled' 
  AND b.payment_status IN ('pending', 'paid')
GROUP BY w.id, w.title, w.max_participants, w.manual_participants;