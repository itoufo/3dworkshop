import {
  KnowledgeUnavailableError,
  buildSystemPrompt,
  completeChat,
  isOwnReply,
  retrieveKnowledge,
  signReply,
} from '@/lib/chat-knowledge'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'

/**
 * 来訪者向けチャットの API。
 *
 * ⚠ APIキーをフロントに置かない。ここでしか読まない。
 *   置いた瞬間、ページのソースを見た誰でも他人の金でモデルを叩ける。
 *
 * ⚠ 誰でも叩ける口なので、素通しにしない：
 *   - POST だけ
 *   - 1回の文字数と往復数に上限（長文を投げつけてトークンを焼かれない）
 *   - 接続元ごとの回数制限（数えるのは DB。lib/rate-limit.ts）
 *   - 知識は必ずサーバー側で system に入れる。クライアントが送ってきた system は捨てる
 *   - assistant の発言は署名を検証したものだけ通す
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_CHARS = 600 // 1発言あたり
const MAX_TURNS = 12 // 履歴として受け取る上限
const WINDOW_MS = 10 * 60 * 1000
const MAX_REQ = 25 // 同一の接続元あたり WINDOW_MS の中で

type Msg = { role: 'user' | 'assistant'; content: string }
/** クライアントから来る形。assistant には署名が付いているはず */
type IncomingMsg = Msg & { signature?: unknown }

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    // 未設定のまま「答えられません」と黙るより、状態が分かるほうが直せる
    return Response.json({ error: 'not_configured' }, { status: 503 })
  }

  // ⚠ x-forwarded-for の左端を使わない。クライアントが好きに名乗れる欄なので、
  //   1リクエストごとに別人を名乗られると回数制限が意味を成さない
  const ip = clientIp(req.headers)
  if (await tooManyRequests(`chat:${ip}`, { windowMs: WINDOW_MS, max: MAX_REQ })) {
    return Response.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: { messages?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  if (!body || !Array.isArray(body.messages)) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  // ⚠ role は user / assistant だけ通す。system をクライアントから受けると知識を差し替えられる。
  // ⚠ assistant は署名を検証する。検証しないと、こちらが言っていない「半額でお受けします」を
  //   履歴に混ぜられ、モデルがそれを自分の発言として言い直す
  const messages: Msg[] = (body.messages as unknown[])
    .filter(
      (m): m is IncomingMsg =>
        !!m &&
        typeof m === 'object' &&
        ((m as Msg).role === 'user' || (m as Msg).role === 'assistant') &&
        typeof (m as Msg).content === 'string',
    )
    .filter((m) => m.role === 'user' || isOwnReply(m.content, m.signature))
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))

  if (messages.length === 0) return Response.json({ error: 'empty' }, { status: 400 })

  // 検索の手がかりは直近のユーザー発言。
  // ⚠ 履歴を全部つなげて埋め込まない。話題が変わったときに前の話に引きずられて別の知識を拾う
  const question = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''

  try {
    const { chunks, mode, corpusEmpty } = await retrieveKnowledge(question)

    if (corpusEmpty) {
      // 公開されている知識が1件も無い＝ migration 未適用か全部非公開。作り話をさせるより黙る
      console.error('[chat] chat_knowledge が空。migration の適用と公開状態を確認')
      return Response.json({ error: 'not_configured' }, { status: 503 })
    }

    // ⚠ chunks が空でも 503 にしない。知識はあるが今回の質問に当たらなかっただけで、
    //   その場合は「分かりかねます」と答えさせるのが正しい（縛りにそう書いてある）。
    //   ここで落とすと、雑談を振られただけでサービス全体が「準備中」に見える
    const reply = await completeChat(buildSystemPrompt(chunks), messages)
    if (!reply) return Response.json({ error: 'empty_reply' }, { status: 502 })

    // 次のリクエストで「これはこちらが返したもの」と確かめられるように署名を添える
    return Response.json({ reply, signature: signReply(reply), retrieval: mode })
  } catch (e) {
    if (e instanceof KnowledgeUnavailableError) {
      // migration 未適用。障害ではなく未設定なので、来訪者には「準備中」を出す
      console.error('[chat]', e.message)
      return Response.json({ error: 'not_configured' }, { status: 503 })
    }
    console.error('[chat]', e)
    return Response.json({ error: 'upstream' }, { status: 502 })
  }
}

export async function GET() {
  return Response.json({ error: 'method_not_allowed' }, { status: 405 })
}
