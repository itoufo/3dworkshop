import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'
import { isBookingSource } from '@/lib/booking-sources'
import { fetchAllRows } from '@/lib/supabase-fetch-all'
import { ADMIN_CUSTOMER_COLUMNS } from '@/lib/admin-customer-columns'

// 管理画面の予約: 一覧（GET）・対応状況の変更（PATCH）・手動登録（POST）。
//
// 手動登録は、メール・電話・他の予約サイト（ストアカ等）経由で受けた予約を、サイトの予約と同じ
// bookings に入れて、売上と人数の集計に乗せるための口。Stripe は通らないので
// 支払状況は管理者の入力値をそのまま使う。
//
// ⚠ 読み書きは anon キーではなくこのルート（service role）経由にする（/api/admin/customers と同じ理由）。

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAYMENT_STATUSES = ['paid', 'pending'] as const
const STATUSES = ['confirmed', 'pending'] as const

/** 金額欄の上限。打ち間違いで桁が増えたものを止める */
const MAX_AMOUNT = 10_000_000

function optionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

function nonNegativeInt(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 && n <= MAX_AMOUNT ? n : null
}

/** 一覧の対応状況の欄で選べる値（Booking['status']） */
const LIST_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'] as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 予約一覧で返す列。管理画面（app/admin/page.tsx）が読むものだけ。
 * ⚠ `*` や `workshops(*)` で返さない。ワークショップ行は本文（rich_description）が1件あたり数KB〜十数KB あり、
 *   予約の行数ぶん重複して載る。全列で返すと予約 約570件で Vercel の応答サイズ上限（4.5MB）を超え、
 *   一覧も売上の集計も読めなくなる（2026-10 時点の実測: 220件で 1.7MB）。
 *   画面に項目を足すときは、ここに必要な列だけを足す。
 */
const BOOKING_LIST_COLUMNS = [
  'id, workshop_id, session_id, customer_id, coupon_id, booking_date, booking_time, participants',
  'total_amount, discount_amount, commission_amount, status, payment_status',
  'minor_count, minor_grades, companion_count, participant_choices, source, source_detail, created_at',
  'workshop:workshops(id, title, event_date, event_time, location, participant_option)',
  'workshop_session:workshop_sessions(id, event_date, event_time)',
  `customer:customers(${ADMIN_CUSTOMER_COLUMNS})`,
  'coupon:coupons(id, code)',
].join(', ')

/** 予約の一覧。ワークショップ・開催回・顧客・クーポンを付けて、新しい順に全件返す */
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'server_misconfigured', message: 'サーバーの設定に問題があります' }, { status: 500 })
  }
  const admin = supabaseAdmin

  // ⚠ 古い順に読んで、返す前に新しい順へ並べ替える。新しい順のままページを繰ると、
  //   読んでいる最中に予約が1件入ったとき全行が1つ後ろへずれ、ページの境目の行が2回入る
  //   （売上に2回足される）。古い順なら新しい行は末尾に付くだけなので、ずれない
  const { data, error } = await fetchAllRows((from, to) =>
    admin
      .from('bookings')
      .select(BOOKING_LIST_COLUMNS)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  )
  if (error) {
    console.error('[admin/bookings] list', error.code, error.message)
    return NextResponse.json({ error: 'db_error', message: '予約の取得に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ bookings: data.reverse() })
}

/** 対応状況（保留・確定・キャンセル）の変更 */
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
  const status = LIST_STATUSES.find((s) => s === body.status)
  if (!status) {
    return NextResponse.json({ error: 'bad_request', message: '知らない対応状況です' }, { status: 400 })
  }

  // ⚠ 更新できた行を必ず確かめる。0件でもエラーは出ないので、確かめないと
  //   「変えたのに変わっていない」が画面から分からない
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ status })
    .eq('id', body.id)
    .select('id')

  if (error) {
    console.error('[admin/bookings] update', error.code, error.message)
    return NextResponse.json({ error: 'db_error', message: 'ステータスの更新に失敗しました' }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'not_found', message: '対象の予約が見つかりませんでした' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  const customerId = typeof body.customer_id === 'string' ? body.customer_id : ''
  const workshopId = typeof body.workshop_id === 'string' ? body.workshop_id : ''
  const sessionId = typeof body.session_id === 'string' && body.session_id ? body.session_id : null
  if (!customerId) return NextResponse.json({ error: '顧客を選んでください' }, { status: 400 })
  if (!workshopId) return NextResponse.json({ error: 'ワークショップを選んでください' }, { status: 400 })

  const participants = Number(body.participants)
  if (!Number.isInteger(participants) || participants < 1 || participants > 100) {
    return NextResponse.json({ error: '人数は 1〜100 の整数で入力してください' }, { status: 400 })
  }

  const totalAmount = nonNegativeInt(body.total_amount)
  if (totalAmount === null) {
    return NextResponse.json({ error: '金額は 0 以上の整数（円）で入力してください' }, { status: 400 })
  }
  const commissionAmount = nonNegativeInt(body.commission_amount ?? 0)
  if (commissionAmount === null) {
    return NextResponse.json({ error: '販売手数料は 0 以上の整数（円）で入力してください' }, { status: 400 })
  }
  if (commissionAmount > totalAmount) {
    return NextResponse.json({ error: '販売手数料が金額を超えています' }, { status: 400 })
  }

  if (!isBookingSource(body.source)) {
    return NextResponse.json({ error: '流入経路を選んでください' }, { status: 400 })
  }
  const source = body.source
  const sourceDetail = optionalText(body.source_detail, 100)

  const paymentStatus = PAYMENT_STATUSES.find((s) => s === body.payment_status)
  if (!paymentStatus) return NextResponse.json({ error: '支払状況の値が不正です' }, { status: 400 })
  const status = STATUSES.find((s) => s === body.status) ?? 'confirmed'
  const notes = optionalText(body.notes, 1000)

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('id', customerId)
    .maybeSingle()
  if (!customer) return NextResponse.json({ error: '顧客が見つかりません' }, { status: 400 })

  const { data: workshop } = await supabaseAdmin
    .from('workshops')
    .select('id, event_date, event_time, max_participants, manual_participants')
    .eq('id', workshopId)
    .maybeSingle()
  if (!workshop) return NextResponse.json({ error: 'ワークショップが見つかりません' }, { status: 400 })

  // 開催日は回（workshop_sessions）のものを写す。売上は開催日で月に振り分けるので、ここが空だと集計に乗らない
  let bookingDate: string | null = typeof workshop.event_date === 'string' ? workshop.event_date : null
  let bookingTime: string | null = typeof workshop.event_time === 'string' ? workshop.event_time : null
  let maxParticipants: number | null = workshop.max_participants ?? null
  let manualParticipants: number = workshop.manual_participants ?? 0

  // 日程のあるワークショップは日程を必須にする。session_id なしで入ると、回ごとの空席計算
  // （check-availability は session_id で数える）から漏れて、その回を売りすぎる
  const { count: sessionCount } = await supabaseAdmin
    .from('workshop_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('workshop_id', workshopId)
  if ((sessionCount ?? 0) > 0 && !sessionId) {
    return NextResponse.json({ error: '開催日程を選んでください' }, { status: 400 })
  }
  if (sessionId) {
    const { data: session } = await supabaseAdmin
      .from('workshop_sessions')
      .select('id, workshop_id, event_date, event_time, status, max_participants, manual_participants')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session || session.workshop_id !== workshopId) {
      return NextResponse.json({ error: '開催日程がこのワークショップのものではありません' }, { status: 400 })
    }
    if (session.status === 'cancelled') {
      return NextResponse.json({ error: '中止になった日程には登録できません' }, { status: 400 })
    }
    bookingDate = session.event_date
    bookingTime = session.event_time
    maxParticipants = session.max_participants ?? maxParticipants
    // 空席表示（check-availability）と同じく、回の分＋ワークショップ全体の分を足す
    manualParticipants = (session.manual_participants ?? 0) + manualParticipants
  }
  if (!bookingDate) {
    return NextResponse.json({ error: '開催日程を選んでください' }, { status: 400 })
  }

  // 定員を超えるときは、管理者が承知の上で登録する（allow_over_capacity）場合だけ通す。
  // 他サイトですでに受けてしまった予約を記録する用途もあるので、拒否はしない
  if (maxParticipants != null && body.allow_over_capacity !== true) {
    let takenQuery = supabaseAdmin
      .from('bookings')
      .select('participants')
      .neq('status', 'cancelled')
      .in('payment_status', ['pending', 'paid'])
    takenQuery = sessionId ? takenQuery.eq('session_id', sessionId) : takenQuery.eq('workshop_id', workshopId)
    const { data: taken } = await takenQuery
    const takenCount = (taken || []).reduce((sum, b) => sum + (b.participants || 0), 0) + manualParticipants
    const remaining = maxParticipants - takenCount
    if (participants > remaining) {
      return NextResponse.json(
        {
          error: `定員を超えます（定員${maxParticipants}名・残り${Math.max(remaining, 0)}名に${participants}名）`,
          code: 'over_capacity',
        },
        { status: 409 },
      )
    }
  }

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      customer_id: customerId,
      workshop_id: workshopId,
      session_id: sessionId,
      booking_date: bookingDate,
      booking_time: bookingTime,
      participants,
      total_amount: totalAmount,
      commission_amount: commissionAmount,
      source,
      source_detail: sourceDetail,
      status,
      payment_status: paymentStatus,
      notes,
    })
    .select('id')
    .single()

  if (error || !booking) {
    console.error('admin booking insert failed:', error)
    return NextResponse.json({ error: '予約の登録に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ booking }, { status: 201 })
}
