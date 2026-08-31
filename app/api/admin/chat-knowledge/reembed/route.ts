import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { embedTexts, knowledgeSourceText, needsReembedding } from '@/lib/chat-knowledge'

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

// ⚠ maxDuration は Vercel の設定で、このサイトの Netlify では効かない（netlify.toml + @netlify/plugin-nextjs）。
//   置いても実行時間は伸びないので、時間内に終わるように埋め込みをまとめて作る。
const BATCH_SIZE = 32

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

  // ⚠ 1件ずつ OpenAI を叩かない。件数ぶん往復することになり、
  //   Netlify の実行時間上限に当たって途中で切れる（どこまで終わったかも分からない）。
  //   embeddings API は input に配列を取れるので、まとめて作る。
  // ⚠ バッチ同士は直列のまま。並列にするとレート制限に当たって半端に終わる
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE)
    const sources = batch.map((row) => knowledgeSourceText(row.title, row.body))
    const embeddings = await embedTexts(sources)

    for (let j = 0; j < batch.length; j += 1) {
      const row = batch[j]
      const embedding = embeddings[j]
      if (!embedding) {
        failed.push(row.title)
        continue
      }
      const { error: updateError } = await supabaseAdmin!
        .from('chat_knowledge')
        .update({ embedding, embedding_source: sources[j] })
        .eq('id', row.id)

      if (updateError) failed.push(row.title)
      else updated += 1
    }
  }

  return Response.json({ total: targets.length, updated, failed })
}
