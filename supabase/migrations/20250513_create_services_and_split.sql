-- オーダーメイド・追加印刷を workshops から分離
-- 1. services テーブル新規作成
-- 2. workshops.is_service フラグで一覧から除外
-- 3. 既存 bookings は workshops を参照したまま (無傷)

-- ============ services テーブル ============
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(20) NOT NULL,                -- 'custom_made' | 'reprint'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  rich_description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  source_workshop_id UUID REFERENCES public.workshops(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_type        ON public.services(type);
CREATE INDEX IF NOT EXISTS idx_services_is_active   ON public.services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_sort_order  ON public.services(sort_order);

DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_all" ON public.services;
CREATE POLICY "services_select_all" ON public.services FOR SELECT USING (true);

DROP POLICY IF EXISTS "services_all" ON public.services;
CREATE POLICY "services_all" ON public.services FOR ALL USING (true) WITH CHECK (true);

-- ============ service_requests テーブル ============
CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  quantity INTEGER,
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'new', -- new / contacted / quoted / closed
  user_agent TEXT,
  referrer TEXT,
  ip_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_service_id ON public.service_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status     ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON public.service_requests(created_at DESC);

DROP TRIGGER IF EXISTS update_service_requests_updated_at ON public.service_requests;
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- 公開ロールは INSERT のみ (送信者が他人の送信を読めないように)
DROP POLICY IF EXISTS "service_requests_insert_public" ON public.service_requests;
CREATE POLICY "service_requests_insert_public" ON public.service_requests
  FOR INSERT TO public WITH CHECK (true);

-- ============ workshops.is_service カラム追加 ============
ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_workshops_is_service ON public.workshops(is_service);

-- ============ 該当6行に is_service=true ============
UPDATE public.workshops SET is_service = TRUE WHERE id IN (
  '0601e1e7-fbbf-4a45-ab50-b1b5dcde50b0', -- 【オーダーメイド】プレート作成
  'aaeabf13-9a89-4d30-9443-00d0329a72fd', -- 【オーダーメイド】フィギュア作成
  '71604a62-34db-470f-a8fa-62250dc09329', -- 【オーダーメイド】NFC搭載カード
  '25c94f3d-e2d3-437d-a053-d75d212a5535', -- フィギュア (¥30,000)
  '0194df3b-e29c-402f-b4f4-7bd4f6dc4a5f', -- フィギュア作成 (¥10,000)
  'a297733b-f4df-44a1-9338-7ffea8dbd3e5'  -- 追加印刷
);

-- ============ services への seed (冪等: source_workshop_id ベースで重複防止) ============
INSERT INTO public.services (type, title, description, price, image_url, sort_order, source_workshop_id)
SELECT
  CASE WHEN id = 'a297733b-f4df-44a1-9338-7ffea8dbd3e5' THEN 'reprint' ELSE 'custom_made' END AS type,
  -- 【オーダーメイド】プレフィックスを削除した表示用タイトル
  REGEXP_REPLACE(title, '^【オーダーメイド】', '') AS title,
  description,
  price,
  NULLIF(image_url, '') AS image_url,
  CASE id
    WHEN 'a297733b-f4df-44a1-9338-7ffea8dbd3e5' THEN 0  -- 追加印刷を先頭
    WHEN '0601e1e7-fbbf-4a45-ab50-b1b5dcde50b0' THEN 10 -- プレート
    WHEN '71604a62-34db-470f-a8fa-62250dc09329' THEN 20 -- NFC
    WHEN 'aaeabf13-9a89-4d30-9443-00d0329a72fd' THEN 30 -- フィギュア(オーダーメイド)
    WHEN '0194df3b-e29c-402f-b4f4-7bd4f6dc4a5f' THEN 40 -- フィギュア作成
    WHEN '25c94f3d-e2d3-437d-a053-d75d212a5535' THEN 50 -- フィギュア(¥30,000)
    ELSE 999
  END AS sort_order,
  id AS source_workshop_id
FROM public.workshops
WHERE id IN (
  '0601e1e7-fbbf-4a45-ab50-b1b5dcde50b0',
  'aaeabf13-9a89-4d30-9443-00d0329a72fd',
  '71604a62-34db-470f-a8fa-62250dc09329',
  '25c94f3d-e2d3-437d-a053-d75d212a5535',
  '0194df3b-e29c-402f-b4f4-7bd4f6dc4a5f',
  'a297733b-f4df-44a1-9338-7ffea8dbd3e5'
)
AND NOT EXISTS (
  SELECT 1 FROM public.services s WHERE s.source_workshop_id = workshops.id
);
