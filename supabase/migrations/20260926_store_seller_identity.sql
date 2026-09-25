-- 出品者を MiraiID のユーザーに紐づける（customers 行ではなく）。
--
-- ⚠ なぜ: customers は公開 anon キーで書き換えられる（RLS 無効。削除だけは
--   20260919000000_revoke_anon_delete.sql で塞いだ）。customers.email を書き換えてから
--   MiraiID でログインすると、他人の customers 行に紐づけられてしまう。
--   出品者・振込先・売上は、その行ではなく「MiraiID で本人確認したユーザー」に持たせる。
--   customer_id は、スクール在籍（出品資格）を調べるための手がかりとしてだけ残す。
-- ⚠ 申請時点の在籍情報とログインメールを写しておき、管理者が承認前に見比べる。
--   在籍の確認は Stripe の定期課金（月謝）から取る（lib/store/eligibility.ts）。
--   customers.email も school_enrollments も anon で書き換えられるので、DB の値だけでは
--   本人か分からない。Stripe 側の顧客メールは書き換えられない。

ALTER TABLE public.store_sellers
  ADD COLUMN IF NOT EXISTS miraiid_user_id UUID REFERENCES public.store_identities(miraiid_user_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS login_email TEXT,
  -- 申請時点の在籍情報（lib/store/eligibility.ts の EnrollmentCheck の配列）
  ADD COLUMN IF NOT EXISTS enrollment_snapshot JSONB;

-- まだ1件も無い（2026-09-26 時点で0件）ので NOT NULL・UNIQUE をそのまま付けられる
ALTER TABLE public.store_sellers ALTER COLUMN miraiid_user_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_store_sellers_miraiid_user ON public.store_sellers(miraiid_user_id);

-- customer_id は一意でなくする（同じ customers 行に別の MiraiID ユーザーが紐づいても、
-- 出品者はユーザーごとに別。どちらが本人かは承認時に管理者が見る）
ALTER TABLE public.store_sellers DROP CONSTRAINT IF EXISTS store_sellers_customer_id_key;
CREATE INDEX IF NOT EXISTS idx_store_sellers_customer ON public.store_sellers(customer_id);

-- アップロードの上限。署名付きアップロードURLはサイズを縛れないので、bucket 側で縛る
UPDATE storage.buckets
   SET file_size_limit = 104857600, -- 100MB
       allowed_mime_types = NULL     -- STL などはブラウザが送る MIME がまちまちなので拡張子で見る（API 側）
 WHERE id = 'store-files';
UPDATE storage.buckets
   SET file_size_limit = 10485760,  -- 10MB
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
 WHERE id = 'store-media';
