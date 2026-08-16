import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  KNOWLEDGE_COLUMNS,
  type KnowledgeInput,
  embedText,
  knowledgeSourceText,
  normalizeKnowledgeInput,
} from '@/lib/chat-knowledge'

/**
 * チャットボットの知識の一覧・追加。
 *
 * ⚠ すべてのメソッドの先頭で requireAdmin() を通す。
 *   ここに書けた人が、公開サイトのボットの発言を決められる。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const { data, error } = await supabaseAdmin!
    .from('chat_knowledge')
    .select(KNOWLEDGE_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[admin/chat-knowledge] list', error.message)
    // migration 未適用がいちばん多い。画面に理由をそのまま出す
    return Response.json({ error: 'db_error', message: error.message }, { status: 500 })
  }

  return Response.json({ items: data ?? [] })
}

export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  let input: KnowledgeInput
  try {
    input = await req.json()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  const { values, errors } = normalizeKnowledgeInput(input)
  if (errors.length) return Response.json({ error: 'invalid', messages: errors }, { status: 400 })

  const source = knowledgeSourceText(values.title as string, values.body as string)
  const embedding = await embedText(source)

  const { data, error } = await supabaseAdmin!
    .from('chat_knowledge')
    .insert({
      ...values,
      embedding,
      // ⚠ 埋め込みが作れなかったときは source を残さない。
      //   残すと「ベクトル化済み」に見えて、検索から漏れているのに気付けない
      embedding_source: embedding ? source : null,
    })
    .select(KNOWLEDGE_COLUMNS)
    .single()

  if (error) {
    console.error('[admin/chat-knowledge] insert', error.message)
    return Response.json({ error: 'db_error', message: error.message }, { status: 500 })
  }

  return Response.json({ item: data, embedded: !!embedding }, { status: 201 })
}
