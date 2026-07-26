-- 同伴者（付き添いの保護者）を予約に記録する
-- 親子向けの日程では 1名まで無料。料金にも定員（残席）にもカウントしない。
-- （非親子向けの日程では同伴者は参加人数に含めるため、この値は 0 のまま）
-- 旧 20260723_add_booking_companion.sql の復活（当時 Revert されていた）。
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS companion_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.bookings.companion_count IS '同伴者（付き添いの保護者）の人数。親子向け日程で1名まで無料・料金/定員/残席にカウントしない';
