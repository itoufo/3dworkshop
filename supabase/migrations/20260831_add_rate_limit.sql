-- 回数制限を全インスタンスで共有するための置き場。
--
-- なぜ DB に置くか:
--   Netlify の関数はリクエストごとに別インスタンスへ振られ、インスタンスは勝手に増減する。
--   プロセス内の Map で数えると、実際の上限は「インスタンス数 × 上限」になり、
--   しかもコールドスタートで 0 に戻る。⚠ 無認証で OpenAI を叩く /api/chat の費用は
--   これでは止まらない（2026-08-31 のレビューで指摘）。
--
-- ⚠ これは「速さ」ではなく「上限」のための置き場。1リクエストにつき1往復増えるのは承知の上。
--   プロセス内の間引き（lib/rate-limit.ts）を前段に置いて、ここまで来る回数を減らしている。

CREATE TABLE IF NOT EXISTS public.rate_limit (
  bucket_key   TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  hits         INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.rate_limit ENABLE ROW LEVEL SECURITY;

-- ⚠ PUBLIC から先に剥がす。Postgres の既定で PUBLIC に付いている分は
--   anon / authenticated だけ REVOKE しても残る（20260816 の migration と同じ理由）。
REVOKE ALL ON public.rate_limit FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit TO service_role;

/**
 * 1回数えて、上限を超えていたら true を返す。
 *
 * ⚠ 数えるのと判定を1文でやること。SELECT してから UPDATE すると、
 *   同時に来た2本が同じ値を読んで両方通る。
 */
CREATE OR REPLACE FUNCTION public.bump_rate_limit(
  p_key            TEXT,
  p_window_seconds INTEGER,
  p_max            INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_hits INTEGER;
BEGIN
  INSERT INTO public.rate_limit AS r (bucket_key, window_start, hits)
  VALUES (p_key, now(), 1)
  ON CONFLICT (bucket_key) DO UPDATE
    SET
      -- 窓が明けていたら数え直し、明けていなければ足す
      window_start = CASE
        WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN now()
        ELSE r.window_start
      END,
      hits = CASE
        WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN 1
        ELSE r.hits + 1
      END
  RETURNING r.hits INTO v_hits;

  -- 古い行の掃除。⚠ 毎回やると無駄なので、たまにだけ。
  --   窓の4倍を過ぎた行は、もう誰の判定にも使われない。
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit
    WHERE window_start < now() - make_interval(secs => p_window_seconds * 4);
  END IF;

  RETURN v_hits > p_max;
END;
$$;

-- ⚠ PUBLIC から先に剥がす（関数の EXECUTE は既定で PUBLIC に付く）
REVOKE EXECUTE ON FUNCTION public.bump_rate_limit(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_rate_limit(TEXT, INTEGER, INTEGER)
  TO service_role;
