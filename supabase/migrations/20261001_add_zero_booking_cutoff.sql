-- 予約0人のときの締切（ワークショップ単位）
-- 締切 = (開催日 − zero_booking_cutoff_days_before 日) の zero_booking_cutoff_time（JST）
-- その時刻に参加者0人なら受付終了。1人以上なら開始時刻まで受け付ける。
-- どちらかが NULL なら0人締切なし（開始時刻での締切だけ）。
-- 既定は「前日 24:00」= days_before 0, time 00:00（開催日 0:00）。既存行にも入る。
ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS zero_booking_cutoff_days_before integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zero_booking_cutoff_time time DEFAULT '00:00';

ALTER TABLE workshops
  DROP CONSTRAINT IF EXISTS workshops_zero_booking_cutoff_days_before_check;
ALTER TABLE workshops
  ADD CONSTRAINT workshops_zero_booking_cutoff_days_before_check
  CHECK (zero_booking_cutoff_days_before IS NULL OR zero_booking_cutoff_days_before BETWEEN 0 AND 30);
