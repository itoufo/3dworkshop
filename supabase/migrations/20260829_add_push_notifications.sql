-- Web Push（PWA 通知）用テーブル
--   push_subscriptions   : ブラウザごとの購読情報（endpoint 単位）
--   push_notification_log: 送信履歴。日程追加通知の二重送信を防ぐ鍵も兼ねる

-- ============ push_subscriptions ============
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- ブラウザが発行するプッシュ配信先 URL。購読の一意キー
  endpoint TEXT NOT NULL UNIQUE,
  -- Web Push の暗号化キー（購読オブジェクトの keys.p256dh / keys.auth）
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  -- 配信対象の絞り込み用。今は 'workshop_schedule'（日程追加）のみ
  topics TEXT[] NOT NULL DEFAULT ARRAY['workshop_schedule'],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  -- 連続失敗回数。410/404 が返った購読は即座に削除するのでこれは一時エラー用
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(is_active);

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: 購読情報は匿名キーから一切触らせない。
-- 登録・解除・配信はすべて service role を持つ API ルート経由で行う。
-- （ポリシーを1つも作らない = service role 以外は全拒否）
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============ push_notification_log ============
CREATE TABLE IF NOT EXISTS public.push_notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- 'workshop_schedule'（日程追加の自動通知） / 'manual'（管理画面からの手動配信）
  kind VARCHAR(40) NOT NULL,
  workshop_id UUID REFERENCES public.workshops(id) ON DELETE SET NULL,
  -- 同じ日程を二重に通知しないための鍵。'<workshop_id>:<YYYY-MM-DD>:<HH:MM>' 形式。
  -- 手動配信では NULL（NULL 同士は UNIQUE 制約に引っかからない）
  dedupe_key TEXT UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_notification_log_workshop ON public.push_notification_log(workshop_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_log_created ON public.push_notification_log(created_at DESC);

ALTER TABLE public.push_notification_log ENABLE ROW LEVEL SECURITY;
