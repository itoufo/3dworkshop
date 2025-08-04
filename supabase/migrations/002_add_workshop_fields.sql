-- Add new columns to workshops table
ALTER TABLE public.workshops
ADD COLUMN IF NOT EXISTS event_date DATE,
ADD COLUMN IF NOT EXISTS event_time TIME,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS rich_description TEXT;

-- Add comments to new columns
COMMENT ON COLUMN public.workshops.event_date IS 'ワークショップ開催日';
COMMENT ON COLUMN public.workshops.event_time IS 'ワークショップ開始時刻';
COMMENT ON COLUMN public.workshops.location IS 'ワークショップ開催場所';
COMMENT ON COLUMN public.workshops.rich_description IS 'リッチテキスト形式の詳細説明';