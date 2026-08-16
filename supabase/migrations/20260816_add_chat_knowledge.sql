-- チャットボットの知識ベース（RAG）
--
-- ⚠ この表の中身は、そのまま LLM の system プロンプトに入る。
--   書き込めた人がボットの発言内容を決められるということ。RLS を有効にしたうえで
--   ポリシーを 1 つも作らない＝ anon / authenticated からは読めも書けもしない。
--   触れるのは service role（サーバー側の API ルート）だけ。
--   ⚠ 他テーブルの "..._insert_all" のようなポリシーをここに真似して足さないこと。
--     足した瞬間、公開サイトの anon キーでボットの発言を書き換えられるようになる。

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.chat_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  embedding VECTOR(1536),
  embedding_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.chat_knowledge IS 'チャットボットが答えるための知識。管理画面 /admin/chat-knowledge から編集する';
COMMENT ON COLUMN public.chat_knowledge.is_pinned IS '検索結果に関係なく必ず system に入れる。料金・受け渡しなど、抜けると金銭的な間違いになる項目だけに付ける';
COMMENT ON COLUMN public.chat_knowledge.is_published IS 'FALSE の間はボットに渡らない。裏取りが済んでいない数字はここで止める';
COMMENT ON COLUMN public.chat_knowledge.embedding_source IS '埋め込みを作ったときの本文。現在の title/body と一致しなければ再ベクトル化が必要（管理画面がバッジで出す）';

CREATE INDEX IF NOT EXISTS idx_chat_knowledge_published
  ON public.chat_knowledge (is_published, sort_order);

-- ⚠ ivfflat インデックスは張らない。数十件の規模では lists の調整が必要なうえ、
--   総当たりのほうが速く、件数が少ないと近似が外れて拾えなくなる。

ALTER TABLE public.chat_knowledge ENABLE ROW LEVEL SECURITY;

-- 類似検索。ピン留めは検索を通さず常に入れるので、ここでは除外する。
CREATE OR REPLACE FUNCTION public.match_chat_knowledge(
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 6,
  min_similarity DOUBLE PRECISION DEFAULT 0.15
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  body TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    k.id,
    k.title,
    k.body,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.chat_knowledge k
  WHERE k.is_published
    AND NOT k.is_pinned
    AND k.embedding IS NOT NULL
    AND 1 - (k.embedding <=> query_embedding) >= min_similarity
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ⚠ SECURITY INVOKER のまま（既定）。呼び出し元の RLS が効くので、
--   anon キーから叩かれても 0 件になる。DEFINER に変えないこと。
REVOKE EXECUTE ON FUNCTION public.match_chat_knowledge(VECTOR, INTEGER, DOUBLE PRECISION) FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 初期データ
--
-- 出所は公式サイトと 2026-08 時点のヒアリング。⚠ 投入しただけでは埋め込みが無いので、
-- 管理画面の「ベクトルを作り直す」を一度押すまでは検索が効かず、全件を渡す動作になる。
--
-- ⚠ 裏取りが済んでいない数字（アンケート満足度・営業時間）は is_published = FALSE で入れてある。
--   ゆうさんが確認したら管理画面で公開に切り替える。
-- ---------------------------------------------------------------------------

INSERT INTO public.chat_knowledge (title, body, tags, is_pinned, is_published, sort_order) VALUES
(
  '何をしているところか',
  '3DLab — 東京都文京区湯島にある3Dプリンター体験教室。AIでデザインしたものを3Dプリンターで形にする。運営は株式会社sunU と株式会社ウォーカー。',
  ARRAY['概要'], FALSE, TRUE, 10
),
(
  '場所とアクセス',
  E'〒113-0034 東京都文京区湯島3-14-8 加田湯島ビル 5F\n- 東京メトロ千代田線 湯島駅 3番出口から徒歩1分\n- JR山手線・京浜東北線 御徒町駅 南口から徒歩8分\n- JR総武線・日比谷線 秋葉原駅 電気街口から徒歩10分\n- 丸ノ内線 御茶ノ水駅 聖橋口から徒歩12分\n専用の駐車場は無い。電車で来てもらう。\n⚠ 「秋葉原にある」と言わない。秋葉原からは徒歩10分で、施設があるのは湯島。',
  ARRAY['アクセス', '駐車場'], FALSE, TRUE, 20
),
(
  '料金（すべて税込）',
  E'- 体験ワークショップ: 12,000円 / 1回（所要2時間）\n  ⚠ 8月に募集済みの回だけは、募集時の価格（5,000円・10,000円）のまま実施する。12,000円は9月開催分から。日付を聞かれたら、この違いを正確に伝える。\n- 3DLabスクール: 月謝 17,000円（月2回・1回120分）。入会金 22,000円は2026年9月30日まで0円。スクール生は有料版AIが使い放題、ワークショップに30%OFFで参加できる。\n- 3Dプリント制作: 1点から受ける。金額は内容によるので見積り。\n⚠ 合計金額の掛け算をしない。人数分・回数分の合計を自分で計算して答えない。',
  ARRAY['料金'], TRUE, TRUE, 30
),
(
  '体験ワークショップの中身',
  E'所要2時間。流れは4つ。\n1. AIでデザインする — つくりたいものを言葉で伝えると、AIが形にする。絵が描けなくてもよい。\n2. 3Dデータに整える — スタッフが一緒に、プリントできる形に調整する。\n3. 造形を見学する — 業務用3Dプリンターが動くところを目の前で見られる。\n4. 完成品を受け取る — 後日発送。',
  ARRAY['ワークショップ'], FALSE, TRUE, 40
),
(
  '参加条件・持ち物',
  E'- 6歳から参加できる。小学生は保護者と一緒の参加をすすめている。\n- パソコンを使ったことが無くてもよい。スタッフが横につく。\n- 手ぶらで来てよい。パソコンもソフトもこちらで用意する。',
  ARRAY['ワークショップ', '年齢', '持ち物'], FALSE, TRUE, 50
),
(
  '完成品の受け渡し',
  E'⚠ その日には持って帰れない。ここを曖昧にしない。\n仕上げに時間をかけるため、後日ご自宅へ発送する（約2〜3週間・送料無料）。当日は手ぶらで帰れる。',
  ARRAY['納期', '発送'], TRUE, TRUE, 60
),
(
  '予約',
  E'公式サイトの申し込みフォーム、または電話。じゃらんnetからも予約できる（即時予約）。\n⚠ 空席や開催日をこの場で断定しない。日程は予約ページを見てもらう。',
  ARRAY['予約'], FALSE, TRUE, 70
),
(
  'メディア掲載',
  '3Dプリンター専門メディア「ShareLab NEWS」／YouTube「AI・ネクストニッポン【公式】」の2件。',
  ARRAY['実績'], FALSE, TRUE, 80
),
(
  '体験者アンケートの満足度（未確認）',
  E'体験者アンケートの満足度 95%（回答80名）。\n⚠ 出所の裏取りが済んでいないため未公開にしてある。確認が取れるまでボットに答えさせない。',
  ARRAY['実績', '要確認'], FALSE, FALSE, 90
),
(
  '営業時間（未確認）',
  E'公式サイトのスクール案内には 10:00〜19:00・火曜定休 と書かれている。\n⚠ 構造化データ（トップページ）では 10:00〜20:00 になっており、どちらが正しいか未確認。\nワークショップの回ごとの開始時間は日程によって違うので、予約ページで確認してもらう。',
  ARRAY['営業時間', '要確認'], FALSE, FALSE, 100
);
