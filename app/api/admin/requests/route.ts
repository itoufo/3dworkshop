import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 開催希望・法人向けサービスのお問い合わせ（workshop_requests / service_requests）の
 * 読み取りと、対応状況の更新。
 *
 * ⚠ なぜ API 経由なのか:
 *   この2つのテーブルは RLS が有効で、ポリシーは「誰でも INSERT できる」だけ。
 *   SELECT も UPDATE もポリシーが無い＝ anon キーでは読めないし書けない。
 *   それでも管理画面は anon キーで読んでいたので、**届いた問い合わせが1件も表示されず**、
 *   「対応済みにする」を押しても何も起きていなかった（RLS は0件返すだけでエラーを出さないので、
 *   画面上は成功したように見えていた。2026-09-23 に未対応15件が埋もれているのを発見）。
 *
 * ⚠ 公開側のフォームはこれまで通り anon キーで INSERT する。読み書きの口をここに分ける。
 * ⚠ 先頭で requireAdmin() を通す。氏名・メール・電話がそのまま入っている。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WORKSHOP_STATUSES = ['new', 'contacted', 'scheduled', 'closed'] as const
const SERVICE_STATUSES = ['new', 'contacted', 'quoted', 'closed'] as const

export async function GET(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const url = new URL(req.url)

  // 左メニューのバッジ用。件数しか要らないので中身は取らない
  if (url.searchParams.get('only') === 'count') {
    const [w, s] = await Promise.all([
      supabaseAdmin!.from('workshop_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabaseAdmin!.from('service_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    ])
    if (w.error || s.error) {
      console.error('[admin/requests] count', w.error?.message, s.error?.message)
      return Response.json({ error: 'db_error' }, { status: 500 })
    }
    return Response.json({ newCount: (w.count ?? 0) + (s.count ?? 0) })
  }

  const [w, s] = await Promise.all([
    supabaseAdmin!
      .from('workshop_requests')
      .select('*, workshop:workshops(title), category:workshop_categories(name, slug)')
      .order('created_at', { ascending: false }),
    supabaseAdmin!
      .from('service_requests')
      .select('*, service:services(title, type)')
      .order('created_at', { ascending: false }),
  ])

  if (w.error || s.error) {
    console.error('[admin/requests] list', w.error?.message, s.error?.message)
    return Response.json({ error: 'db_error', message: w.error?.message || s.error?.message }, { status: 500 })
  }

  return Response.json({ workshopRequests: w.data ?? [], serviceRequests: s.data ?? [] })
}

export async function PATCH(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  let body: { kind?: unknown; id?: unknown; status?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  const { kind, id, status } = body
  if (typeof id !== 'string' || !id) return Response.json({ error: 'bad_request' }, { status: 400 })

  // ⚠ 更新先のテーブルと入れてよい値を、こちら側の一覧で決める。
  //   リクエストの文字列をそのままテーブル名や値に使わない
  const table = kind === 'workshop' ? 'workshop_requests' : kind === 'service' ? 'service_requests' : null
  if (!table) return Response.json({ error: 'bad_request' }, { status: 400 })

  const allowed: readonly string[] = kind === 'workshop' ? WORKSHOP_STATUSES : SERVICE_STATUSES
  if (typeof status !== 'string' || !allowed.includes(status)) {
    return Response.json({ error: 'bad_request', message: '知らない対応状況です' }, { status: 400 })
  }

  // ⚠ 更新できた行を必ず確かめる。0件でもエラーは出ないので、
  //   確かめないと「押したのに変わっていない」が今度は API 側で再発する
  const { data, error } = await supabaseAdmin!
    .from(table)
    .update({ status })
    .eq('id', id)
    .select('id')

  if (error) {
    console.error('[admin/requests] update', error.message)
    return Response.json({ error: 'db_error', message: error.message }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return Response.json({ error: 'not_found', message: '対象が見つかりませんでした' }, { status: 404 })
  }

  return Response.json({ ok: true })
}
