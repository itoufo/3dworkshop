import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 来訪者チャットの会話の一覧。
 *
 * ⚠ 先頭で requireAdmin() を通す。ここは他人の会話がそのまま読める口。
 * ⚠ client_key（接続元のハッシュ）は返さない。画面には要らないし、
 *   同じ人かどうかを突き合わせる材料を管理画面に置く理由が無い。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export async function GET(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const url = new URL(req.url)
  const limitRaw = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, MAX_LIMIT) : DEFAULT_LIMIT

  const { data, error } = await supabaseAdmin!
    .from('chat_conversations')
    .select('id, page_path, first_question, message_count, started_at, last_message_at')
    .order('last_message_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[admin/chat-logs] list', error.code, error.message)
    // migration 未適用がいちばん多い。原因と次の一手を画面に出す
    const missing = error.code === '42P01' || error.code === 'PGRST205'
    return Response.json(
      {
        error: 'db_error',
        message: missing
          ? 'chat_conversations テーブルがありません。supabase/migrations/20260922_create_chat_logs.sql を実行してください。'
          : error.message,
      },
      { status: 500 },
    )
  }

  return Response.json({ conversations: data ?? [] })
}
