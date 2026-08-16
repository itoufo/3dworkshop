import { buildSystemPrompt, completeChat, retrieveKnowledge } from '@/lib/chat-knowledge'

/**
 * 来訪者向けチャットの API。
 *
 * ⚠ APIキーをフロントに置かない。ここでしか読まない。
 *   置いた瞬間、ページのソースを見た誰でも他人の金でモデルを叩ける。
 *
 * ⚠ 誰でも叩ける口なので、素通しにしない：
 *   - POST だけ
 *   - 1回の文字数と往復数に上限（長文を投げつけてトークンを焼かれない）
 *   - IPごとの簡易な回数制限
 *   - 知識は必ずサーバー側で system に入れる。クライアントが送ってきた system は捨てる
 */

// Edge だとインスタンスの寿命が短く、下の回数制限がほぼ効かない
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_CHARS = 600 // 1発言あたり
const MAX_TURNS = 12 // 履歴として受け取る上限
const WINDOW_MS = 10 * 60 * 1000
const MAX_REQ = 25 // 同一IPあたり WINDOW_MS の中で

const hits = new Map<string, number[]>()

function tooMany(ip: string): boolean {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  list.push(now)
  hits.set(ip, list)
  // 増えっぱなしにしない。古いIPを間引く
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k)
    }
  }
  return list.length > MAX_REQ
}

type Msg = { role: 'user' | 'assistant'; content: string }

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    // 未設定のまま「答えられません」と黙るより、状態が分かるほうが直せる
    return Response.json({ error: 'not_configured' }, { status: 503 })
  }

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  if (tooMany(ip)) return Response.json({ error: 'rate_limited' }, { status: 429 })

  let body: { messages?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  if (!body || !Array.isArray(body.messages)) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  // ⚠ role は user / assistant だけ通す。system をクライアントから受けると知識を差し替えられる
  const messages: Msg[] = (body.messages as unknown[])
    .filter(
      (m): m is Msg =>
        !!m &&
        typeof m === 'object' &&
        ((m as Msg).role === 'user' || (m as Msg).role === 'assistant') &&
        typeof (m as Msg).content === 'string',
    )
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))

  if (messages.length === 0) return Response.json({ error: 'empty' }, { status: 400 })

  // 検索の手がかりは直近のユーザー発言。
  // ⚠ 履歴を全部つなげて埋め込まない。話題が変わったときに前の話に引きずられて別の知識を拾う
  const question = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''

  try {
    const { chunks, mode } = await retrieveKnowledge(question)

    if (chunks.length === 0) {
      // 知識が1件も無い＝migration 未適用か全部非公開。作り話をさせるより黙る
      console.error('[chat] chat_knowledge が空。migration の適用と公開状態を確認')
      return Response.json({ error: 'not_configured' }, { status: 503 })
    }

    const reply = await completeChat(buildSystemPrompt(chunks), messages)
    if (!reply) return Response.json({ error: 'empty_reply' }, { status: 502 })

    return Response.json({ reply, retrieval: mode })
  } catch (e) {
    console.error('[chat]', e)
    return Response.json({ error: 'upstream' }, { status: 502 })
  }
}

export async function GET() {
  return Response.json({ error: 'method_not_allowed' }, { status: 405 })
}
