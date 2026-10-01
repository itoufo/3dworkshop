import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CHAT_LOG_RETENTION_DAYS } from '@/lib/chat-retention'
import { isCronAuthorized } from '@/lib/cron-auth'

/**
 * 古いチャットの会話記録を消す。1日1回（JST 03:30、vercel.json の crons）。
 *
 * 会話は本人が「送る」と決めた情報ではないので、見るために必要な期間だけ持つ。
 * 日数は lib/chat-retention.ts（画面の注記もプライバシーポリシーもそこを読む）。
 *
 * ⚠ 何度呼ばれても同じ結果になること（条件は「最終発言が保持期間より前」だけ）。
 * ⚠ chat_messages は chat_conversations の外部キーが ON DELETE CASCADE なので一緒に消える。
 * ⚠ support_tickets（メールで引き継がれた問い合わせ）はここでは消さない。
 *   あちらは本人が連絡先付きで送ってきたもので、対応の記録として残す。
 */

export const runtime = 'nodejs'
// ⚠ 静的化させない。ビルド時に1回実行されて終わる
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}

async function handle(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const cutoff = new Date(
    Date.now() - CHAT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()

  // ⚠ 消した行を select で取り返さない。PostgREST が 1000行で返却を打ち切るので、
  //   1000件を超えた日に「1000件しか消えていない」ように見える（実際は全部消えている）。
  //   件数だけが欲しいので count で受ける。
  const { count, error } = await supabaseAdmin
    .from('chat_conversations')
    .delete({ count: 'exact' })
    .lt('last_message_at', cutoff)

  if (error) {
    console.error('[cron/purge-chat-logs]', error.code, error.message)
    return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 })
  }

  const deleted = count ?? 0
  console.log(`[cron/purge-chat-logs] ${deleted}件の会話を削除（${cutoff} より前）`)
  return NextResponse.json({ ok: true, deleted, cutoff })
}
