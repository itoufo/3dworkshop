-- 3dlab 専用の顧客アカウント。
--
-- ⚠ Supabase Auth（auth.users）は使わない。このインスタンスは複数のアプリが
--   同じ public スキーマに同居していて、auth.users も共有している。
--   例えば sales_portal_events には「ログイン済みなら誰でも更新・削除できる」ポリシーが
--   あるため、3dlab の顧客を auth.users に入れると、登録した客全員がその権限を持つ。
--   （2026-09-02 に本番の pg_policies を確認して判断）
--
-- 代わりに、すでに全注文が紐づいている customers 表にログイン情報を足す。
--
-- ⚠ メール確認を必ず通すこと。customers には決済履歴と配送先が入っており、
--   確認なしで登録できると、他人のメールで登録した人がその履歴を見られる。

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_created_at TIMESTAMPTZ;

COMMENT ON COLUMN public.customers.password_hash IS
  'bcrypt ハッシュ。NULL なら会員登録していない（＝これまでどおりゲスト購入のみ）';
COMMENT ON COLUMN public.customers.email_verified_at IS
  'メール確認が済んだ時刻。NULL のあいだはログインさせない';

-- メール確認とパスワード再設定の合言葉。
-- ⚠ 合言葉そのものは保存しない。ハッシュだけを持つ。
--   DB が読まれただけでアカウントを乗っ取られないようにするため。
CREATE TABLE IF NOT EXISTS public.customer_auth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('verify', 'reset')),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_auth_tokens_hash ON public.customer_auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_customer_auth_tokens_customer   ON public.customer_auth_tokens(customer_id, kind);
CREATE INDEX IF NOT EXISTS idx_customer_auth_tokens_expires    ON public.customer_auth_tokens(expires_at);

-- 公開ロールには開けない。読み書きはすべて service-role の API ルート経由。
ALTER TABLE public.customer_auth_tokens ENABLE ROW LEVEL SECURITY;
