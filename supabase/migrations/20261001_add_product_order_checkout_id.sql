-- カートでまとめて決済した注文を束ねる。
--
-- product_orders は1行＝1商品のまま。カートの決済では商品ごとに1行ずつ作り、
-- 同じ Stripe 決済の行に同じ checkout_id を入れる。Webhook はこの id で全行を支払い済みにする。
-- 1商品ずつの決済（/api/products/[id]/checkout）の行は NULL のまま。
ALTER TABLE public.product_orders
  ADD COLUMN IF NOT EXISTS checkout_id UUID;

CREATE INDEX IF NOT EXISTS idx_product_orders_checkout ON public.product_orders(checkout_id)
  WHERE checkout_id IS NOT NULL;
