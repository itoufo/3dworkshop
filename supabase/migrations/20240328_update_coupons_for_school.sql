-- クーポンテーブルにスクール対応のカラムを追加
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS applicable_to TEXT DEFAULT 'workshop' CHECK (applicable_to IN ('workshop', 'school', 'all'));

-- 既存のクーポンは全てワークショップ用として設定
UPDATE coupons SET applicable_to = 'workshop' WHERE applicable_to IS NULL;

-- スクール用クーポンのインデックスを追加
CREATE INDEX IF NOT EXISTS idx_coupons_applicable_to ON coupons(applicable_to);