-- ストアの作品への「いいね」。ログイン（MiraiID）必須。
-- customers ではなく MiraiID のユーザーに紐づける（customers は anon で書き換えられるため。
-- 20260926_store_seller_identity.sql と同じ理由）。1人1作品1回。
CREATE TABLE IF NOT EXISTS public.store_product_likes (
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  miraiid_user_id UUID NOT NULL REFERENCES public.store_identities(miraiid_user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, miraiid_user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_product_likes_user ON public.store_product_likes(miraiid_user_id);

-- store_* と同じく、読み書きは API（service role）だけ
ALTER TABLE public.store_product_likes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_product_likes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_product_likes TO service_role;
