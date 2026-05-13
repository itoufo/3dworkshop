-- workshop_requests にカテゴリ参照を追加
-- カテゴリピラーページからの開催リクエストを区別できるようにする

ALTER TABLE public.workshop_requests
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.workshop_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workshop_requests_category_id
  ON public.workshop_requests(category_id);
