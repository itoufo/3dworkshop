import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  KNOWLEDGE_COLUMNS,
  type KnowledgeInput,
  embedText,
  knowledgeSourceText,
  normalizeKnowledgeInput,
} from '@/lib/chat-knowledge'

/** 1件の更新・削除 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params

  let input: KnowledgeInput
  try {
    input = await req.json()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  const { values, errors } = normalizeKnowledgeInput(input, true)
  if (errors.length) return Response.json({ error: 'invalid', messages: errors }, { status: 400 })
  if (Object.keys(values).length === 0) {
    return Response.json({ error: 'invalid', messages: ['変更がありません'] }, { status: 400 })
  }

  const patch: Record<string, unknown> = { ...values, updated_at: new Date().toISOString() }

  // 本文が変わったら埋め込みを作り直す。
  // ⚠ 公開フラグを切り替えただけのときに作り直さない（毎回 OpenAI を叩くと無駄に金がかかる）
  if (values.title !== undefined || values.body !== undefined) {
    const { data: current, error: readError } = await supabaseAdmin!
      .from('chat_knowledge')
      .select('title, body')
      .eq('id', id)
      .single()

    if (readError) {
      return Response.json({ error: 'not_found', message: readError.message }, { status: 404 })
    }

    const title = (values.title as string | undefined) ?? current.title
    const body = (values.body as string | undefined) ?? current.body
    const source = knowledgeSourceText(title, body)
    const embedding = await embedText(source)

    if (embedding) {
      patch.embedding = embedding
      patch.embedding_source = source
    }
    // ⚠ 失敗したときに embedding を null で上書きしない。
    //   embedText は失敗しても投げずに null を返す（キー未設定・429・タイムアウト全部）。
    //   ここで null を書くと、OpenAI が詰まっている間にタイトルの誤字を直しただけで
    //   使えていたベクトルが消え、その項目は検索に出てこなくなる（2026-08-31 のレビューで指摘）。
    //   触らずに置けば embedding_source が本文とズレたままになるので、
    //   needsReembedding が true を返し「ベクトルを作り直す」で拾える。
  }

  const { data, error } = await supabaseAdmin!
    .from('chat_knowledge')
    .update(patch)
    .eq('id', id)
    .select(KNOWLEDGE_COLUMNS)
    .single()

  if (error) {
    console.error('[admin/chat-knowledge] update', error.message)
    return Response.json({ error: 'db_error', message: error.message }, { status: 500 })
  }

  return Response.json({ item: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params

  const { error } = await supabaseAdmin!.from('chat_knowledge').delete().eq('id', id)

  if (error) {
    console.error('[admin/chat-knowledge] delete', error.message)
    return Response.json({ error: 'db_error', message: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
