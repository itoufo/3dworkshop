-- workshopsテーブルに日時フィールドを追加
-- Supabase DashboardのSQL Editorで実行してください

-- 開催日時フィールドを追加
ALTER TABLE workshops
ADD COLUMN IF NOT EXISTS event_date DATE,
ADD COLUMN IF NOT EXISTS event_time TIME,
ADD COLUMN IF NOT EXISTS rich_description TEXT;

-- 既存のワークショップにデフォルト値を設定（必要に応じて）
UPDATE workshops
SET event_date = CURRENT_DATE + INTERVAL '7 days',
    event_time = '14:00:00'
WHERE event_date IS NULL;

-- types.tsのWorkshop型も更新が必要です