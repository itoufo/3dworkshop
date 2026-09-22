import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * チャットから担当者へ引き継がれた問い合わせの一覧。
 *
 * ⚠ 先頭で requireAdmin() を通す。氏名・メール・電話がそのまま入っている。
 * 本文もやりとりも一覧に載せる（件数が少なく、開き直す手間のほうが大きい）。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export async function GET(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const url = new URL(req.url)
  // ⚠ 整数に丸める。小数のまま渡すと PostgREST が 400 を返し、こちらの 500 になって出る
  const limitRaw = Math.trunc(Number(url.searchParams.get('limit')))
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, MAX_LIMIT) : DEFAULT_LIMIT

  const { data, error } = await supabaseAdmin!
    .from('support_tickets')
    .select('id, name, email, phone, message, transcript, page_path, source, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[admin/support-tickets] list', error.code, error.message)
    const missing = error.code === '42P01' || error.code === 'PGRST205'
    return Response.json(
      {
        error: 'db_error',
        message: missing
          ? 'support_tickets テーブルがありません。supabase/migrations/20260903_create_support_tickets.sql を実行してください。'
          : error.message,
      },
      { status: 500 },
    )
  }

  return Response.json({ tickets: data ?? [] })
}
