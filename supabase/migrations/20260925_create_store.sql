-- stores.3dlab.jp（出品マーケット）のテーブル。
--
-- 売り方は2つ。1つの商品に両方つけてもよい:
--   data  … 購入者が 3D データをダウンロードする
--   print … 3dlab がそのデータを印刷して購入者に発送する（出品者は発送しない）
--
-- ⚠ すべて service_role 専用。ブラウザから anon キーで読ませない。
--   振込先口座・購入者の住所・ダウンロード用の合言葉が入っている。
--   読み書きは /api/store/* と /api/admin/store/* から supabaseAdmin で行う。
-- ⚠ ログインは MiraiID（別の Supabase プロジェクト）。この DB の auth.users は使わない
--   （別アプリと相乗りで、ログイン者に他アプリ表の削除権限が付くため。lib/customer-auth.ts に経緯）。

-- MiraiID のユーザーと、この DB の customers 行の対応
CREATE TABLE IF NOT EXISTS public.store_identities (
  miraiid_user_id UUID PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_identities_customer ON public.store_identities(customer_id);

-- 出品者。出品には管理者の承認（status = approved）が要る
CREATE TABLE IF NOT EXISTS public.store_sellers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL,
  -- 出品者ページの URL（/s/<slug>）
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  bio TEXT,
  avatar_url TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'approved', 'rejected', 'suspended')),
  review_note TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  -- 振込先（支払い申請のときに store_payout_requests へ写す）
  bank_name TEXT,
  bank_branch TEXT,
  bank_account_type VARCHAR(8) CHECK (bank_account_type IN ('ordinary', 'checking')),
  bank_account_number VARCHAR(8) CHECK (bank_account_number ~ '^[0-9]{7}$'),
  bank_account_holder_kana TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_sellers_status ON public.store_sellers(status);

-- 商品。掲載には管理者の承認（status = published）が要る
CREATE TABLE IF NOT EXISTS public.store_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.store_sellers(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  -- 非公開 bucket store-files 内のパス。印刷販売でも 3dlab はこのデータで印刷する
  data_file_path TEXT,
  data_file_name TEXT,
  sell_data BOOLEAN NOT NULL DEFAULT FALSE,
  data_price INTEGER CHECK (data_price IS NULL OR data_price >= 100),
  sell_print BOOLEAN NOT NULL DEFAULT FALSE,
  print_price INTEGER CHECK (print_price IS NULL OR print_price >= 100),
  -- 大きさ・素材・色など、印刷の仕様（自由記述）
  print_spec TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  review_note TEXT,
  submitted_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT store_products_has_offer CHECK (sell_data OR sell_print),
  CONSTRAINT store_products_data_price CHECK (NOT sell_data OR data_price IS NOT NULL),
  CONSTRAINT store_products_print_price CHECK (NOT sell_print OR print_price IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_store_products_seller ON public.store_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_store_products_status ON public.store_products(status, published_at DESC);

-- 注文。手数料と出品者の取り分は購入時に確定して保存する（あとで料率を変えても過去分が動かない）
CREATE TABLE IF NOT EXISTS public.store_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.store_sellers(id) ON DELETE RESTRICT,
  kind VARCHAR(8) NOT NULL CHECK (kind IN ('data', 'print')),
  price INTEGER NOT NULL CHECK (price >= 0),
  platform_fee INTEGER NOT NULL CHECK (platform_fee >= 0),
  seller_amount INTEGER NOT NULL CHECK (seller_amount >= 0),
  buyer_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  buyer_email TEXT,
  buyer_name TEXT,
  -- 印刷のときだけ。⚠ 出品者には見せない
  shipping JSONB,
  status VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled', 'refunded')),
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  download_token TEXT UNIQUE,
  download_expires_at TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0,
  tracking_number TEXT,
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_orders_seller ON public.store_orders(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_store_orders_buyer ON public.store_orders(buyer_customer_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON public.store_orders(status, created_at DESC);

-- 出品者からの支払い申請。管理者が銀行振込したら paid にする
CREATE TABLE IF NOT EXISTS public.store_payout_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.store_sellers(id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status VARCHAR(16) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'paid', 'rejected')),
  -- 申請時点の振込先。あとで出品者が口座を変えても、何に振り込んだかが残る
  bank_snapshot JSONB NOT NULL,
  admin_note TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_payout_requests_seller ON public.store_payout_requests(seller_id, status);

ALTER TABLE public.store_identities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_sellers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_payout_requests ENABLE ROW LEVEL SECURITY;

-- ⚠ PUBLIC から先に剥がす。Postgres の既定で PUBLIC に付いている分は
--   anon / authenticated だけ REVOKE しても残る（20260922_create_chat_logs.sql と同じ理由）。
REVOKE ALL ON public.store_identities      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.store_sellers         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.store_products        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.store_orders          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.store_payout_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_identities      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_sellers         TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_products        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_orders          TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_payout_requests TO service_role;

-- 出品データ（非公開）と商品画像（公開）
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-files', 'store-files', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-media', 'store-media', true)
ON CONFLICT (id) DO NOTHING;
