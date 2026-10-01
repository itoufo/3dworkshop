-- 予約の流入経路と販売手数料（管理画面からの手動予約登録・売上管理用）
--
-- source:            どこから来た予約か。サイトの予約フォーム経由は 'website'
-- source_detail:     予約サイト名（ストアカ・aini・じゃらん等）や紹介者名などの補足
-- commission_amount: 他の予約サイトに払う販売手数料（円）。手取り = total_amount - commission_amount
-- customers.acquisition_source: 顧客の初回の流入経路（手動登録時に入れる。サイト経由は NULL のまま）

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'website';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_detail TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS acquisition_source TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_source_check') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_source_check
      CHECK (source IN ('website', 'booking_site', 'email', 'phone', 'referral', 'other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_commission_amount_check') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_commission_amount_check
      CHECK (commission_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_acquisition_source_check') THEN
    ALTER TABLE customers ADD CONSTRAINT customers_acquisition_source_check
      CHECK (acquisition_source IS NULL OR acquisition_source IN ('website', 'booking_site', 'email', 'phone', 'referral', 'other'));
  END IF;
END $$;
