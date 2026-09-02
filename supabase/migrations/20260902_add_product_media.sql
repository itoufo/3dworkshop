-- 物販商品のメディア（写真＋動画）を、表示順そのままの1本の配列で持つ。
-- 既存の image_urls は写真専用だったため、動画も並べられる media_urls に移行する。

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] NOT NULL DEFAULT '{}';

-- 既存商品の写真をそのまま引き継ぐ（順序も維持）
UPDATE public.products
SET media_urls = COALESCE(image_urls, '{}')
WHERE media_urls = '{}' AND image_urls IS NOT NULL AND array_length(image_urls, 1) > 0;

-- 商品写真・商品動画の保存先。読み取りは公開、書き込みは署名付きURL（service role が発行）のみ。
-- 50MB はプロジェクト全体の既定上限に合わせた値。これ以上は Supabase の設定変更が要る。
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-media',
  'product-media',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
