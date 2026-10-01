-- 来訪者チャット（/api/chat）の会話記録。
--
-- 何に使うか: 管理画面（/admin/chat-logs）で「何を聞かれているか」「知識が当たらなかった
-- やりとりはどれか」を見る。ここが分かると chat_knowledge に足す項目が決まる。
--
-- ⚠ 一定期間で消す（/api/cron/purge-chat-logs、日数は lib/chat-retention.ts）。
--   support_tickets と違い、本人が「送る」と決めた情報ではない。
--   持ち続ける理由が無いものを持ち続けない。
-- ⚠ 公開ロールから読めるようにしないこと。他人の会話がそのまま読めてしまう。
-- ⚠ 生の IP は保存しない。同じ来訪者の続きの発言を同じ会話に足すためだけに、
--   ハッシュ（client_key）を持つ。

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- sha256(接続元IP + サーバ側の秘密)。突き合わせにしか使わないので元に戻せなくてよい
  client_key TEXT NOT NULL,
  -- どのページで開かれたか（何について困っていたかの手がかり）
  page_path TEXT,
  -- 一覧に出す見出し。毎回 chat_messages を引かなくて済むように最初の質問だけ持つ
  first_question TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  -- assistant のときだけ入る（lib/chat-knowledge.ts の Retrieval.mode）。
  --   matched  = 類似検索が当たった
  --   no_match = 類似検索は動いたが0件 ＝ 知識に無いことを聞かれた回。ここが足す項目の候補
  --   fallback = 検索が成立していない（埋め込みが無い・OpenAI が落ちている）。質問のせいではない
  retrieval VARCHAR(16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message
  ON public.chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON public.chat_messages(conversation_id, id);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ⚠ PUBLIC から先に剥がす。Postgres の既定で PUBLIC に付いている分は
--   anon / authenticated だけ REVOKE しても残る（20260816 の migration と同じ理由）。
REVOKE ALL ON public.chat_conversations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.chat_messages      FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages      TO service_role;
REVOKE ALL ON SEQUENCE public.chat_messages_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.chat_messages_id_seq TO service_role;

/**
 * 1往復（質問と返答）を記録して、その会話の id を返す。
 *
 * p_conversation_id が
 *   - 渡されていて、client_key が一致し、まだ続きとみなせる時間内 → その会話に足す
 *   - それ以外（未指定 / 別人 / 古すぎる / 消されている）          → 新しい会話を作る
 *
 * ⚠ 会話 id はブラウザから送り返される値なので、そのまま信じない。
 *   信じると、他人の会話 id を送りつけて記録を混ぜられる。client_key で持ち主を確かめる。
 * ⚠ 1文にまとめているのは、途中で失敗して「質問だけ残る」状態を作らないため。
 */
CREATE OR REPLACE FUNCTION public.append_chat_turn(
  p_conversation_id UUID,
  p_client_key      TEXT,
  p_page_path       TEXT,
  p_question        TEXT,
  p_answer          TEXT,
  p_retrieval       TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- 同じ来訪者の、まだ続いているとみなせる会話か。
  -- ⚠ 件数の上限も見る。24時間の窓は発言のたびに延びるので、これが無いと
  --   1つの会話が限りなく伸び、管理画面がその1行を開けなくなる
  SELECT c.id INTO v_id
  FROM public.chat_conversations c
  WHERE c.id = p_conversation_id
    AND c.client_key = p_client_key
    AND c.last_message_at > now() - INTERVAL '24 hours'
    AND c.message_count < 400;

  IF v_id IS NULL THEN
    INSERT INTO public.chat_conversations (client_key, page_path, first_question)
    VALUES (p_client_key, p_page_path, left(p_question, 200))
    RETURNING id INTO v_id;
  END IF;

  INSERT INTO public.chat_messages (conversation_id, role, content)
  VALUES (v_id, 'user', p_question);

  INSERT INTO public.chat_messages (conversation_id, role, content, retrieval)
  VALUES (v_id, 'assistant', p_answer, p_retrieval);

  UPDATE public.chat_conversations
  SET message_count = message_count + 2,
      last_message_at = now()
  WHERE id = v_id;

  RETURN v_id;
END;
$$;

-- ⚠ PUBLIC から先に剥がす（関数の EXECUTE は既定で PUBLIC に付く）
REVOKE EXECUTE ON FUNCTION public.append_chat_turn(UUID, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_chat_turn(UUID, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;
