-- 予約に高校生以下の参加者情報を追加
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS minor_count INTEGER;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS minor_grades TEXT;

COMMENT ON COLUMN public.bookings.minor_count IS '高校生以下の参加者数（いない場合はNULL）';
COMMENT ON COLUMN public.bookings.minor_grades IS '高校生以下の学年（自由入力・カンマ区切り 例: 小3, 中1）';
