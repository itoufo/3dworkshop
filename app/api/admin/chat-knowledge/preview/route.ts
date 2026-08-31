import { requireAdmin } from '@/lib/admin-auth'
import { buildSystemPrompt, completeChat, retrieveKnowledge } from '@/lib/chat-knowledge'

/**
 * 管理画面から知識の効きを試す口。
 *
 * 質問を入れると「どの項目が拾われたか」と「実際の回答」を返す。
 * ⚠ 拾われた項目を見ずに本文だけ直すと、直したのに答えが変わらない理由が分からなくなる。
 *   （たいてい原因は本文ではなく、その項目が検索に引っかかっていないこと）
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: 'not_configured', message: 'OPENAI_API_KEY が設定されていません。' },
      { status: 503 },
    )
  }

  let question = ''
  try {
    const body = await req.json()
    question = typeof body?.question === 'string' ? body.question.trim().slice(0, 600) : ''
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  if (!question) return Response.json({ error: 'bad_request' }, { status: 400 })

  try {
    const { chunks, mode } = await retrieveKnowledge(question)
    if (chunks.length === 0) {
      return Response.json({ error: 'empty_knowledge', message: '公開中の知識が1件もありません。' }, { status: 400 })
    }

    const reply = await completeChat(buildSystemPrompt(chunks), [{ role: 'user', content: question }])

    return Response.json({
      reply: reply ?? '(回答を取得できませんでした)',
      retrieval: mode,
      used: chunks.map((c) => c.title),
    })
  } catch (e) {
    console.error('[admin/chat-knowledge] preview', e)
    return Response.json({ error: 'upstream' }, { status: 502 })
  }
}
