import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { embedText, knowledgeSourceText, needsReembedding } from '@/lib/chat-knowledge'

/**
 * ベクトルの作り直し。
 *
 * 使う場面:
 *   - migration を流した直後（初期データには埋め込みが入っていない）
 *   - OPENAI_API_KEY が未設定のまま編集していて、後からキーを入れたとき
 *   - 埋め込みモデルを変えたとき（?all=1 で全件）
 *
 * 既定では「本文と埋め込みがズレている行」だけを作り直す。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: 'not_configured', message: 'OPENAI_API_KEY が設定されていません。' },
      { status: 503 },
    )
  }

  const all = new URL(req.url).searchParams.get('all') === '1'

  const { data: rows, error } = await supabaseAdmin!
    .from('chat_knowledge')
    .select('id, title, body, embedding_source')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[admin/chat-knowledge] reembed list', error.message)
    return Response.json({ error: 'db_error', message: error.message }, { status: 500 })
  }

  const targets = (rows ?? []).filter((r) => all || needsReembedding(r))

  let updated = 0
  const failed: string[] = []

  // ⚠ 直列で回す。並列にすると件数次第で OpenAI のレート制限に当たり、
  //   一部だけ更新された中途半端な状態になる。数十件なら直列で十分速い
  for (const row of targets) {
    const source = knowledgeSourceText(row.title, row.body)
    const embedding = await embedText(source)
    if (!embedding) {
      failed.push(row.title)
      continue
    }
    const { error: updateError } = await supabaseAdmin!
      .from('chat_knowledge')
      .update({ embedding, embedding_source: source })
      .eq('id', row.id)

    if (updateError) failed.push(row.title)
    else updated += 1
  }

  return Response.json({ total: targets.length, updated, failed })
}
