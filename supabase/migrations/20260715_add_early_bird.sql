-- 早割チケット（先着N組・1名あたり割引）
-- 予約1件＝1組。early_bird_slots 組（予約行数）までの予約に、
-- 「1名あたり early_bird_discount 円」の割引を適用する。
ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS early_bird_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS early_bird_discount integer,
  ADD COLUMN IF NOT EXISTS early_bird_slots integer;

COMMENT ON COLUMN public.workshops.early_bird_enabled IS '早割を有効化するか';
COMMENT ON COLUMN public.workshops.early_bird_discount IS '早割の1名あたり割引額（円）';
COMMENT ON COLUMN public.workshops.early_bird_slots IS '早割対象の先着予約組数（キャンセル以外の予約行数でカウント）';

-- 【夏休み親子特別回】(8/1) を 先着10組・1名1000円引き に設定
UPDATE public.workshops
SET early_bird_enabled = true,
    early_bird_discount = 1000,
    early_bird_slots = 10
WHERE id = '1358f1b6-a988-4825-8d8c-16b64c3e573f';
