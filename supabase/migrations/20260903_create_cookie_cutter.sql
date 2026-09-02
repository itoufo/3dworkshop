-- クッキー型ジェネレーター。
--   cutter_designs : 利用者が作った型の設計（輪郭と寸法）。無料で作れる
--   cutter_orders  : その設計に対する購入（STLダウンロード / 印刷して発送）
--
-- 生成した STL は公開しないバケット cookie-cutter に置き、
-- 購入者にはトークン付きURL（有効期限つき）だけを渡す。

CREATE TABLE IF NOT EXISTS public.cutter_designs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  title TEXT,
  -- 刃の厚みの中心を通る線。[[x, y], ...] ミリ単位・Y上向き
  contour JSONB NOT NULL,
  -- lib/cookie-cutter/params.ts の CutterParams
  params JSONB NOT NULL,
  -- 元画像とプレビュー画像（cookie-cutter バケット内のパス）
  source_image_path TEXT,
  preview_image_path TEXT,
  -- 表示用。{ width, depth, height } ミリ
  size_mm JSONB,
  volume_cm3 NUMERIC(6, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cutter_designs_customer_id ON public.cutter_designs(customer_id);
CREATE INDEX IF NOT EXISTS idx_cutter_designs_created_at  ON public.cutter_designs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.cutter_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  design_id UUID NOT NULL REFERENCES public.cutter_designs(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  -- download: STLファイルのみ / print: こちらで印刷して発送する
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('download', 'print')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  shipping_fee INTEGER NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  notes TEXT,
  -- 発送する場合のみ。Stripe Checkout の shipping_address_collection で受け取る
  shipping_name TEXT,
  shipping_phone TEXT,
  shipping_address JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',          -- pending / paid / shipped / cancelled / refunded
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending / paid / failed / refunded
  -- 決済後に生成した STL の置き場所（cookie-cutter バケット内のパス）
  stl_path TEXT,
  -- ダウンロード用の合言葉。ログインを作らないので、これが本人確認を兼ねる
  download_token TEXT UNIQUE,
  download_count INTEGER NOT NULL DEFAULT 0,
  download_expires_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  stripe_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cutter_orders_design_id      ON public.cutter_orders(design_id);
CREATE INDEX IF NOT EXISTS idx_cutter_orders_customer_id    ON public.cutter_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_cutter_orders_status         ON public.cutter_orders(status);
CREATE INDEX IF NOT EXISTS idx_cutter_orders_stripe_session ON public.cutter_orders(stripe_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cutter_orders_token   ON public.cutter_orders(download_token) WHERE download_token IS NOT NULL;

DROP TRIGGER IF EXISTS update_cutter_designs_updated_at ON public.cutter_designs;
CREATE TRIGGER update_cutter_designs_updated_at BEFORE UPDATE ON public.cutter_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cutter_orders_updated_at ON public.cutter_orders;
CREATE TRIGGER update_cutter_orders_updated_at BEFORE UPDATE ON public.cutter_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 公開ロールには一切開けない。読み書きはすべて service-role のAPIルート経由。
-- ⚠ 公開 SELECT を足さないこと。download_token が漏れると誰でもファイルを取れてしまう。
ALTER TABLE public.cutter_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cutter_orders  ENABLE ROW LEVEL SECURITY;

-- 生成した STL と元画像を置く非公開バケット
INSERT INTO storage.buckets (id, name, public)
VALUES ('cookie-cutter', 'cookie-cutter', false)
ON CONFLICT (id) DO NOTHING;
