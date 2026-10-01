-- 物販のシリーズ（親）と、そこにぶら下がる子商品（SKU）。
--
-- 子商品は今までどおり products の1行。決済・注文・Webhook・確認メールは product_id だけを
-- 見ているので、どのサイズ・色が売れたかも product_orders.product_id でそのまま分かる。
-- シリーズは「1ページで選ばせる」ための束ね役で、選ぶ軸（動物・サイズ・色など）は
-- option_axes にシリーズごとに並べ、子商品の variant_options に各軸の値を持たせる。

CREATE TABLE IF NOT EXISTS public.product_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  description TEXT,
  -- 写真と動画を表示順のまま並べた配列。先頭がメイン（products.media_urls と同じ約束）
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  -- 選ぶ軸の名前を表示順に。例: {動物,サイズ}
  option_axes TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- 作った直後は非公開。中身を確かめてから公開する
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES public.product_series(id) ON DELETE SET NULL,
  -- 各軸の値。例: {"動物": "ねこ", "サイズ": "高さ約10cm"}
  ADD COLUMN IF NOT EXISTS variant_options JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- シリーズ内の並び順（選択肢の並びに使う）
  ADD COLUMN IF NOT EXISTS series_sort INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_series ON public.products(series_id) WHERE series_id IS NOT NULL;

-- 書き込みは管理 API（service role）だけ。anon キーはブラウザに配られているので、
-- products のように anon で書ける口を新しく作らない（20260919000000_revoke_anon_delete.sql の経緯）。
-- 公開ページは anon で読むので、公開中のシリーズだけ SELECT を許す。
ALTER TABLE public.product_series ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_series FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.product_series TO anon, authenticated;

DROP POLICY IF EXISTS "product_series_public_read" ON public.product_series;
CREATE POLICY "product_series_public_read" ON public.product_series
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);
