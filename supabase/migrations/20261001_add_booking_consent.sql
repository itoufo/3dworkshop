-- 予約時の参加同意書
-- workshops.consent_text: ワークショップ固有の同意書本文。NULL なら lib/consent-default.ts の既定本文を使う
-- bookings.consent_agreed_at / consent_text_snapshot: 予約者が同意した日時と、その時点の本文
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS consent_text text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consent_agreed_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consent_text_snapshot text;
