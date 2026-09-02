-- チャットで解決しなかった問い合わせを、担当者へのメールに引き継ぐための記録。
--
-- チャット本体（/api/chat）は会話をどこにも保存しない。
-- ここに残るのは「メールで問い合わせる」を選んだ人が、自分で送った内容だけ。

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  -- 直前までのチャットのやりとり。本人が「共有する」を選んだときだけ入る
  transcript JSONB,
  -- どのページから送られたか（何について困っていたかの手がかり）
  page_path TEXT,
  source VARCHAR(16) NOT NULL DEFAULT 'chat',   -- chat / form
  status VARCHAR(16) NOT NULL DEFAULT 'open',   -- open / answered / closed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status     ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email      ON public.support_tickets(email);

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 公開ロールには開けない。書き込みは service-role の API ルート経由だけ。
-- ⚠ 公開 SELECT を足さないこと。他人の問い合わせ内容と連絡先が読めてしまう。
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
