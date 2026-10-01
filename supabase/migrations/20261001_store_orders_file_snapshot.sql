-- 注文に「買った時点の出品データ」を写しておく。
-- ⚠ 出品者が掲載後にデータを差し替えると store_products.data_file_path は審査前の新しいファイルを指す。
--   過去の購入者のダウンロードと、支払い済みの印刷注文は、買った時点のファイルを使う。
ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS data_file_path TEXT,
  ADD COLUMN IF NOT EXISTS data_file_name TEXT;
