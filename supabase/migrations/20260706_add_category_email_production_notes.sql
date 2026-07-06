-- カテゴリごとに予約完了メールの「作品制作について」文言を設定できるようにする
ALTER TABLE public.workshop_categories ADD COLUMN IF NOT EXISTS email_production_notes TEXT;

COMMENT ON COLUMN public.workshop_categories.email_production_notes IS '予約完了メールの「作品制作について」文言（1行=1項目）。NULLの場合はデフォルト文言を使用';

-- フィギュアカテゴリの初期値
UPDATE public.workshop_categories
SET email_production_notes = '制作いただく作品は、指定のサイズ・色の範囲内でのオリジナル制作となります。あらかじめご了承ください。
サイズ: 最大10cm立方（長辺が10cm以下）
色: 白
細かい文字や繊細なデザインは、再現が難しい場合がございます
サイズや仕上がりには多少の誤差が生じる可能性がございます'
WHERE slug = 'figure-ai3d-printer-original-figure'
  AND email_production_notes IS NULL;

-- オリジナル作品作りワークショップカテゴリの初期値
UPDATE public.workshop_categories
SET email_production_notes = '制作いただく作品は、指定のサイズ・色の範囲内でのオリジナル制作となります。あらかじめご了承ください。
サイズ: 最大10cm四方・厚さ約8mmのプレート
色: 白・黒 + 1色まで（計3色）
細かい文字や繊細なデザインは、再現が難しい場合がございます
サイズや仕上がりには多少の誤差が生じる可能性がございます'
WHERE slug = 'ai3d-printer-original-work-workshop'
  AND email_production_notes IS NULL;
