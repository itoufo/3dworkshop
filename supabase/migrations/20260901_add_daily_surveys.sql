-- 毎日1問の2択アンケート
--   surveys        : 設問。1日1問を publish_date で割り当てる
--   survey_answers : 回答。ログインが無いので端末ごとの匿名 UUID で1人1票にする
--
-- 通知は既存の push_subscriptions / push_notification_log にそのまま乗る（新設しない）。
-- 配信区分だけ 'daily_survey' を足す（lib/push.ts の PushTopic）。

-- ============ surveys ============
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- 過去問を1問1URL（/survey/<slug>）で残すための識別子。ここが SEO の資産になる
  slug TEXT NOT NULL UNIQUE,
  question TEXT NOT NULL,               -- 「3Dプリンターで最初に作るなら？」
  description TEXT,                     -- 設問の補足1文
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  result_comment TEXT,                  -- 結果ページに出す一言解説

  -- 公開日。1日1問なので UNIQUE。NULL = まだ日付を割り当てていないストック
  publish_date DATE UNIQUE,
  -- draft(ストック) / scheduled(公開日決定) / live(受付中) / closed(締切・確定)
  status VARCHAR(20) NOT NULL DEFAULT 'draft',

  -- ⚠ 集計は毎回 count(*) しない。回答が増えるほど重くなるうえ、
  --   回答直後にその場でグラフを出す用途では毎リクエスト走ることになる。
  --   カウンタで持ち、submit_survey_answer が挿入と同じトランザクションで足す。
  --   （= counter と survey_answers の行数は常に一致する。下の関数のコメント参照）
  count_a INTEGER NOT NULL DEFAULT 0,
  count_b INTEGER NOT NULL DEFAULT 0,

  finalized_at TIMESTAMPTZ,             -- closed にした時刻（＝確定集計の時刻）

  -- 結果ページからワークショップへ送客するための紐付け。どちらも任意
  related_workshop_id UUID REFERENCES public.workshops(id) ON DELETE SET NULL,
  related_category_slug TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_publish_date ON public.surveys(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON public.surveys(status);

DROP TRIGGER IF EXISTS update_surveys_updated_at ON public.surveys;
CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: 公開済みの設問だけ匿名キーから読める。
-- ⚠ draft を読めるようにしない。ストックしてある未公開の設問が全部見えると、
--   「明日以降に何を聞くか」が先に知られるうえ、AI で作った未校正の文面が露出する。
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "surveys_select_published" ON public.surveys;
CREATE POLICY "surveys_select_published" ON public.surveys
  FOR SELECT USING (status IN ('live', 'closed'));

-- 書き込みは service role のみ（ポリシーを作らない＝それ以外は全拒否）

-- ============ survey_answers ============
CREATE TABLE IF NOT EXISTS public.survey_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  -- 端末の localStorage に置く匿名 UUID。ログイン基盤が無いのでこれが唯一の identity。
  -- ⚠ 消せば投票し直せる。厳密な一意性は担保できない前提の指標として扱う
  device_id UUID NOT NULL,
  choice CHAR(1) NOT NULL CHECK (choice IN ('a', 'b')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 1端末1票の実体。アプリ側の判定ではなくここが最後の砦
  UNIQUE (survey_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_survey_answers_survey ON public.survey_answers(survey_id);

-- RLS: 匿名キーからは一切触らせない。投票も集計も service role の API ルート経由。
-- ⚠ PUBLIC から先に剥がす。Postgres の既定で PUBLIC に付いている分は
--   anon / authenticated だけ REVOKE しても残る（20260816 / 20260831 と同じ理由）。
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.survey_answers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_answers TO service_role;

-- ============ 投票 ============
/**
 * 1票入れて、入れたあとの集計を返す。
 *
 * ⚠ 「入ったかどうか」と「カウンタを足す」を必ず同じ文脈で判定すること。
 *   先に SELECT で存在確認してから INSERT すると、同時に来た2本が両方「まだ無い」を読み、
 *   UNIQUE で片方は弾かれるのにカウンタは2回足される＝グラフだけが水増しされる。
 *   ON CONFLICT DO NOTHING の ROW_COUNT を唯一の判定にする。
 *
 * ⚠ カウンタの UPDATE に status の条件を付けないこと。
 *   付けると、締切と同時に来た票が survey_answers には入るのにカウンタには乗らず、
 *   「行数とカウンタが食い違う」状態が残る。受付可否は INSERT の前に見て弾く。
 */
CREATE OR REPLACE FUNCTION public.submit_survey_answer(
  p_survey_id UUID,
  p_device_id UUID,
  p_choice    CHAR
)
RETURNS TABLE(count_a INTEGER, count_b INTEGER, already BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_status TEXT;
  v_rows   INTEGER;
  v_a      INTEGER;
  v_b      INTEGER;
BEGIN
  IF p_choice NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'invalid choice: %', p_choice;
  END IF;

  SELECT s.status INTO v_status FROM public.surveys s WHERE s.id = p_survey_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'survey not found';
  END IF;
  IF v_status <> 'live' THEN
    RAISE EXCEPTION 'survey is not open';
  END IF;

  INSERT INTO public.survey_answers (survey_id, device_id, choice)
  VALUES (p_survey_id, p_device_id, p_choice)
  ON CONFLICT (survey_id, device_id) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 1 THEN
    -- ⚠ 右辺は必ず別名で修飾する。RETURNS TABLE の count_a / count_b が
    --   同名の変数として見えており、修飾しないと ambiguous で落ちる
    UPDATE public.surveys AS s
       SET count_a = s.count_a + CASE WHEN p_choice = 'a' THEN 1 ELSE 0 END,
           count_b = s.count_b + CASE WHEN p_choice = 'b' THEN 1 ELSE 0 END
     WHERE s.id = p_survey_id
    RETURNING s.count_a, s.count_b INTO v_a, v_b;
  ELSE
    -- 投票済み。現在の集計だけ返す（見せる内容は投票した人と同じでよい）
    SELECT s.count_a, s.count_b INTO v_a, v_b
      FROM public.surveys s WHERE s.id = p_survey_id;
  END IF;

  RETURN QUERY SELECT v_a, v_b, (v_rows = 0);
END;
$$;

-- ⚠ PUBLIC から先に剥がす（関数の EXECUTE は既定で PUBLIC に付く）
REVOKE EXECUTE ON FUNCTION public.submit_survey_answer(UUID, UUID, CHAR)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_survey_answer(UUID, UUID, CHAR)
  TO service_role;
