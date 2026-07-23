-- 同伴者（付き添いの保護者）を予約に記録する
-- 1名まで無料。料金にも定員（残席）にもカウントしない。
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS companion_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.bookings.companion_count IS '同伴者（付き添いの保護者）の人数。1名まで無料で、料金・定員・残席にはカウントしない';
