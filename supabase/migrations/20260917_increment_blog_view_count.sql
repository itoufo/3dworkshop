-- ブログ記事の閲覧数を +1 する RPC。
-- components/ViewCountIncrementer.tsx が呼ぶが、関数自体が未作成だったため
-- 2026-03-03 以降のカウントが止まっていた。
-- SECURITY DEFINER なので anon に blog_posts の UPDATE 権限が無くても動く。
CREATE OR REPLACE FUNCTION public.increment_blog_view_count(post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.blog_posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = post_id AND is_published = true;
$$;

REVOKE ALL ON FUNCTION public.increment_blog_view_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_blog_view_count(uuid) TO anon, authenticated;
