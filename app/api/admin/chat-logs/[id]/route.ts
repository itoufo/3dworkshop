import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 1件の会話の中身。⚠ 先頭で requireAdmin() を通す。
 *
 * ⚠ 件数に上限を付ける。append_chat_turn 側でも1会話の長さを抑えているが、
 *   上限の無い SELECT をブラウザに流し込む口を作らない。
 * conversation も返す。一覧を取ってから増えたぶんで、画面の「N往復」がズレるため。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_MESSAGES = 500

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params

  const { data: conversation, error: convError } = await supabaseAdmin!
    .from('chat_conversations')
    .select('id, page_path, first_question, message_count, started_at, last_message_at')
    .eq('id', id)
    .maybeSingle()

  if (convError) {
    console.error('[admin/chat-logs] detail', convError.code, convError.message)
    return Response.json({ error: 'db_error', message: convError.message }, { status: 500 })
  }
  if (!conversation) return Response.json({ error: 'not_found' }, { status: 404 })

  const { data: messages, error: msgError } = await supabaseAdmin!
    .from('chat_messages')
    .select('id, role, content, retrieval, created_at')
    .eq('conversation_id', id)
    .order('id', { ascending: true })
    .limit(MAX_MESSAGES)

  if (msgError) {
    console.error('[admin/chat-logs] messages', msgError.code, msgError.message)
    return Response.json({ error: 'db_error', message: msgError.message }, { status: 500 })
  }

  return Response.json({ conversation, messages: messages ?? [] })
}
