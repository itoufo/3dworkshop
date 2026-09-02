-- product_orders: 物販（products テーブルの商品）の Stripe 決済注文を記録する。
-- 配送先は Stripe Checkout の shipping_address_collection で受け取り、
-- Webhook で shipping_name / shipping_phone / shipping_address に保存する。

CREATE TABLE IF NOT EXISTS public.product_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  shipping_fee INTEGER NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  notes TEXT,
  shipping_name TEXT,
  shipping_phone TEXT,
  shipping_address JSONB,                                 -- Stripe から受け取る住所をそのまま保持
  status VARCHAR(20) NOT NULL DEFAULT 'pending',          -- pending / paid / shipped / cancelled / refunded
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending / paid / failed / refunded
  shipped_at TIMESTAMPTZ,
  stripe_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_orders_product_id     ON public.product_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_customer_id    ON public.product_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_status         ON public.product_orders(status);
CREATE INDEX IF NOT EXISTS idx_product_orders_stripe_session ON public.product_orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_created_at     ON public.product_orders(created_at DESC);

DROP TRIGGER IF EXISTS update_product_orders_updated_at ON public.product_orders;
CREATE TRIGGER update_product_orders_updated_at BEFORE UPDATE ON public.product_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;

-- 公開ロールは INSERT のみ（決済前の作成）。
-- 読み取り・更新は service-role 経由に限る（他人の注文と配送先を見られないようにする）。
DROP POLICY IF EXISTS "product_orders_insert_public" ON public.product_orders;
CREATE POLICY "product_orders_insert_public" ON public.product_orders
  FOR INSERT TO public WITH CHECK (true);
