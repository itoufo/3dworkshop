-- ストアのカート。1回の決済（Stripe の1セッション）で複数の明細を買えるようにする。
--   注文は1行＝1明細のまま、同じ決済の行を checkout_id で束ねる（本サイトの product_orders と同じ形）。
--   quantity … 完成品は複数個買える。データは1つ（同じデータを2つ買う意味がない）
-- ⚠ price は1個の価格。platform_fee と seller_amount はその行の合計（1個の取り分 × quantity）。
-- ⚠ 1つの決済に複数行が付くので stripe_session_id の一意制約を外す。
ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS checkout_id UUID,
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1);

ALTER TABLE public.store_orders DROP CONSTRAINT IF EXISTS store_orders_stripe_session_id_key;
CREATE INDEX IF NOT EXISTS idx_store_orders_stripe_session ON public.store_orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_checkout ON public.store_orders(checkout_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_payment_intent ON public.store_orders(stripe_payment_intent_id);
