import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 古いチャットの会話記録を消す。1日1回（JST 03:30、vercel.json の crons）。
 *
 * 会話は本人が「送る」と決めた情報ではないので、見るために必要な期間だけ持つ。
 * 保持は90日。画面（/admin/chat-logs）にも同じ日数を書いてあるので、変えるなら両方直す。
 *
 * ⚠ 何度呼ばれても同じ結果になること（条件は「最終発言が90日より前」だけ）。
 * ⚠ chat_messages は chat_conversations の外部キーが ON DELETE CASCADE なので一緒に消える。
 * ⚠ support_tickets（メールで引き継がれた問い合わせ）はここでは消さない。
 *   あちらは本人が連絡先付きで送ってきたもので、対応の記録として残す。
 */

export const runtime = 'nodejs'
// ⚠ 静的化させない。ビルド時に1回実行されて終わる
export const dynamic = 'force-dynamic'

const RETENTION_DAYS = 90

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // 未設定なら誰も通さない（開けっ放しにしない）

  // Vercel Cron は `Authorization: Bearer <CRON_SECRET>` を自分で付けてくる
  const bearer = request.headers.get('authorization')
  const provided =
    request.headers.get('x-cron-secret') ||
    (bearer?.startsWith('Bearer ') ? bearer.slice('Bearer '.length) : null)
  if (!provided) return false

  // ⚠ === で比べない。文字列比較は先頭から順に見るので、掛かった時間で正解が漏れる
  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(secret, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('chat_conversations')
    .delete()
    .lt('last_message_at', cutoff)
    .select('id')

  if (error) {
    console.error('[cron/purge-chat-logs]', error.code, error.message)
    return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 })
  }

  const deleted = data?.length ?? 0
  console.log(`[cron/purge-chat-logs] ${deleted}件の会話を削除（${cutoff} より前）`)
  return NextResponse.json({ ok: true, deleted, cutoff })
}
