-- ストアの作品に「完成品の選択肢」（サイズ・色など）を持たせる。
--   option_axes    … 選ぶ項目の名前。例 {サイズ}、{サイズ,色}。空なら選択肢なし（これまでどおり print_price 1つ）
--   print_variants … 組み合わせごとの価格。例 [{"id":"a1b2c3d4","options":{"サイズ":"高さ約7cm"},"price":1980}]
--                    id は注文・カートが指す目印。出品者が編集しても同じ組み合わせなら変えない
-- ⚠ 選択肢があるとき、print_price にはいちばん安い組み合わせの価格を入れる（一覧の並び・表示に使う）。
-- ⚠ 3D データ販売は対象外。サイズや色でデータは変わらないので、データは作品に1つ・価格1つ。
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS option_axes TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS print_variants JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 注文には、買った時点の組み合わせを写す（あとで出品者が名前や価格を変えても注文は変わらない）
ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS variant_id TEXT,
  ADD COLUMN IF NOT EXISTS variant_label TEXT;
