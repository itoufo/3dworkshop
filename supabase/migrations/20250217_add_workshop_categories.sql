-- Workshop Categories テーブル作成
CREATE TABLE IF NOT EXISTS public.workshop_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- workshops テーブルに category_id カラム追加
ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.workshop_categories(id) ON DELETE SET NULL;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_workshops_category_id ON public.workshops(category_id);

-- RLS ポリシー: 全員が閲覧可能
ALTER TABLE public.workshop_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workshop_categories_select_all" ON public.workshop_categories
  FOR SELECT USING (true);

CREATE POLICY "workshop_categories_insert_all" ON public.workshop_categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "workshop_categories_update_all" ON public.workshop_categories
  FOR UPDATE USING (true);

CREATE POLICY "workshop_categories_delete_all" ON public.workshop_categories
  FOR DELETE USING (true);
