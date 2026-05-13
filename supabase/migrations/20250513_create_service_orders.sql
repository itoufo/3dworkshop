-- service_orders: services の Stripe 決済注文を記録

CREATE TABLE IF NOT EXISTS public.service_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',          -- pending / paid / cancelled / refunded / failed
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending / paid / failed / refunded
  stripe_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_orders_service_id        ON public.service_orders(service_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer_id       ON public.service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status            ON public.service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_stripe_session    ON public.service_orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_created_at        ON public.service_orders(created_at DESC);

DROP TRIGGER IF EXISTS update_service_orders_updated_at ON public.service_orders;
CREATE TRIGGER update_service_orders_updated_at BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

-- 公開ロールは INSERT のみ（決済前の作成）
DROP POLICY IF EXISTS "service_orders_insert_public" ON public.service_orders;
CREATE POLICY "service_orders_insert_public" ON public.service_orders
  FOR INSERT TO public WITH CHECK (true);

-- 読み取りは service-role 経由のみ (PRO_READ_ALL を作らない = 他人の注文を見られない)
