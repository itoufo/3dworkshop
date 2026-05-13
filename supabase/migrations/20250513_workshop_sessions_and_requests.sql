-- ワークショップ「テンプレート + セッション」分離
--   workshop_sessions: 各開催日程
--   workshop_requests: 開催未定の場合のリクエスト受付
--   bookings.session_id: 予約時にどのセッションかを記録 (nullable, back-compat)

-- ============ workshop_sessions ============
CREATE TABLE IF NOT EXISTS public.workshop_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_time TIME,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',  -- scheduled / cancelled
  max_participants INTEGER,                          -- nullable, NULLならworkshop側にフォールバック
  manual_participants INTEGER DEFAULT 0,             -- セッション単位の手動加算
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workshop_sessions_workshop_id ON public.workshop_sessions(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_sessions_event_date  ON public.workshop_sessions(event_date);

DROP TRIGGER IF EXISTS update_workshop_sessions_updated_at ON public.workshop_sessions;
CREATE TRIGGER update_workshop_sessions_updated_at BEFORE UPDATE ON public.workshop_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.workshop_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workshop_sessions_select_all" ON public.workshop_sessions;
CREATE POLICY "workshop_sessions_select_all" ON public.workshop_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "workshop_sessions_all" ON public.workshop_sessions;
CREATE POLICY "workshop_sessions_all" ON public.workshop_sessions FOR ALL USING (true) WITH CHECK (true);

-- ============ 既存 workshops から sessions に backfill ============
-- is_service=true の行はサービス扱い (日程概念なし) なので除外
-- event_date NULL の行も skip
-- 既に session が存在する workshop には追加しない (冪等)
INSERT INTO public.workshop_sessions (workshop_id, event_date, event_time, status)
SELECT id, event_date, event_time, 'scheduled'
FROM public.workshops w
WHERE event_date IS NOT NULL
  AND COALESCE(is_service, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.workshop_sessions s WHERE s.workshop_id = w.id
  );

-- ============ workshop_requests ============
CREATE TABLE IF NOT EXISTS public.workshop_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID REFERENCES public.workshops(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  preferred_dates TEXT,
  message TEXT,
  participants INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'new', -- new / contacted / scheduled / closed
  user_agent TEXT,
  referrer TEXT,
  ip_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workshop_requests_workshop_id ON public.workshop_requests(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_requests_status     ON public.workshop_requests(status);
CREATE INDEX IF NOT EXISTS idx_workshop_requests_created_at ON public.workshop_requests(created_at DESC);

DROP TRIGGER IF EXISTS update_workshop_requests_updated_at ON public.workshop_requests;
CREATE TRIGGER update_workshop_requests_updated_at BEFORE UPDATE ON public.workshop_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.workshop_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workshop_requests_insert_public" ON public.workshop_requests;
CREATE POLICY "workshop_requests_insert_public" ON public.workshop_requests
  FOR INSERT TO public WITH CHECK (true);

-- ============ bookings.session_id ============
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.workshop_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON public.bookings(session_id);

-- workshops.event_date/event_time は引き続き back-compat のため保持
-- (sitemap/StructuredData/Stripe webhook が参照中。将来 PR で deprecate)
COMMENT ON COLUMN public.workshops.event_date IS '[LEGACY 2026-05] workshop_sessions を参照すること。新規書き込み時は workshop_sessions 側も同期推奨';
COMMENT ON COLUMN public.workshops.event_time IS '[LEGACY 2026-05] workshop_sessions を参照すること';
