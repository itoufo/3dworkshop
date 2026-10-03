import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'
import { fetchAllRows } from '@/lib/supabase-fetch-all'

// 管理画面のスクール申込: 一覧（GET）と受講状況の変更（PATCH）。
//
// ⚠ 読み書きは anon キーではなくこのルート（service role）経由にする（/api/admin/customers と同じ理由）。
//   受講者の氏名・年齢と、契約者のメール・電話・住所が入っている。

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 画面の受講状況の欄で選べる値 */
const STATUSES = ['pending', 'active', 'paused', 'cancelled'] as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** ⚠ 顧客は * で取らない（ログイン用の列まで画面へ送ることになる）。画面が出す列だけにする */
const COLUMNS = '*, customer:customers(id, name, email, phone, address)'

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'server_misconfigured', message: 'サーバーの設定に問題があります' }, { status: 500 })
  }
  const admin = supabaseAdmin

  // 古い順に読んで、返す前に新しい順へ並べ替える（読んでいる最中に行が増えても、ページの境目で行がずれない）
  const { data, error } = await fetchAllRows((from, to) =>
    admin
      .from('school_enrollments')
      .select(COLUMNS)
      .order('enrollment_date', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  )
  if (error) {
    console.error('[admin/school-enrollments] list', error.code, error.message)
    return NextResponse.json({ error: 'db_error', message: 'スクール申込の取得に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ enrollments: data.reverse() })
}

export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'server_misconfigured', message: 'サーバーの設定に問題があります' }, { status: 500 })
  }

  let body: { id?: unknown; status?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad_request', message: 'リクエストの形式が不正です' }, { status: 400 })
  }
  if (!body || typeof body.id !== 'string' || !UUID.test(body.id)) {
    return NextResponse.json({ error: 'bad_request', message: '対象の指定が正しくありません' }, { status: 400 })
  }
  const status = STATUSES.find((s) => s === body.status)
  if (!status) {
    return NextResponse.json({ error: 'bad_request', message: '知らない受講状況です' }, { status: 400 })
  }

  // ⚠ 更新できた行を必ず確かめる。0件でもエラーは出ない
  const { data, error } = await supabaseAdmin
    .from('school_enrollments')
    .update({ status })
    .eq('id', body.id)
    .select('id')

  if (error) {
    console.error('[admin/school-enrollments] update', error.code, error.message)
    return NextResponse.json({ error: 'db_error', message: 'ステータスの更新に失敗しました' }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'not_found', message: '対象の申込が見つかりませんでした' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
