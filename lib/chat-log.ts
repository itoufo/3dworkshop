import { createHmac } from 'crypto'
import { replySigningSecret } from '@/lib/chat-knowledge'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 来訪者チャットの会話を記録する。
 *
 * ⚠ 記録に失敗しても、チャットの返答は返すこと。ここは「後から見るため」の記録であって、
 *   来訪者への回答より優先されるものではない。呼び出し側は結果を待つが、例外は投げない。
 * ⚠ 生の IP を保存しない。同じ来訪者の続きの発言を同じ会話にまとめるためだけに、
 *   戻せないハッシュにして持つ。
 *
 * 記録するのは成立した1往復だけ（質問と返答）。設定漏れや障害で返答できなかった回は
 * 残らないが、それはサーバのログで追うもので、会話の記録に混ぜると読みにくくなる。
 */

/** 接続元を突き合わせるための値。元の IP には戻せない */
function clientKey(ip: string): string | null {
  // ⚠ 秘密を増やさない。署名（signReply）と同じ関数を呼ぶ。
  //   同じ式を書き写すと、向こうの出どころが変わったときに黙ってすれ違い、
  //   毎回「別人」と判定されて1往復だけの会話が量産される
  const secret = replySigningSecret()
  if (!secret) return null
  return createHmac('sha256', secret).update(ip).digest('hex')
}

/** ブラウザから送り返された会話 id が、そもそも形として正しいか */
function asUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null
}

type Turn = {
  /** ブラウザが持っている会話 id。初回は null。⚠ 持ち主の確認は DB 側（append_chat_turn）でやる */
  conversationId: unknown
  ip: string
  pagePath?: unknown
  question: string
  answer: string
  /** matched / no_match / fallback（lib/chat-knowledge.ts の Retrieval.mode） */
  retrieval: string | null
}

/** 記録できたら会話 id、できなければ null（呼び出し側はこれを来訪者に返して次回また送ってもらう） */
export async function logChatTurn(turn: Turn): Promise<string | null> {
  if (!supabaseAdmin) return null

  const key = clientKey(turn.ip)
  if (!key) return null

  try {
    const { data, error } = await supabaseAdmin.rpc('append_chat_turn', {
      p_conversation_id: asUuid(turn.conversationId),
      p_client_key: key,
      p_page_path: typeof turn.pagePath === 'string' ? turn.pagePath.slice(0, 200) : null,
      p_question: turn.question,
      p_answer: turn.answer,
      p_retrieval: turn.retrieval,
    })

    if (error) {
      // 42883 = 関数が無い（migration 未適用）。記録できないだけなので、ここで止めない
      console.error('[chat-log] append_chat_turn', error.code, error.message)
      return null
    }
    return typeof data === 'string' ? data : null
  } catch (e) {
    console.error('[chat-log]', e)
    return null
  }
}
