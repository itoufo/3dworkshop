import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'
import { isBookingSource } from '@/lib/booking-sources'

// 管理画面からの予約（売上）の手動登録。
//
// メール・電話・他の予約サイト（ストアカ等）経由で受けた予約を、サイトの予約と同じ
// bookings に入れて、売上と人数の集計に乗せるための口。Stripe は通らないので
// 支払状況は管理者の入力値をそのまま使う。
//
// ⚠ 書き込みは anon キーではなくこのルート（service role）経由にする（/api/admin/customers と同じ理由）。

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
    .select('id, event_date, event_time')
    .eq('id', workshopId)
    .maybeSingle()
  if (!workshop) return NextResponse.json({ error: 'ワークショップが見つかりません' }, { status: 400 })

  // 開催日は回（workshop_sessions）のものを写す。売上は開催日で月に振り分けるので、ここが空だと集計に乗らない
  let bookingDate: string | null = typeof workshop.event_date === 'string' ? workshop.event_date : null
  let bookingTime: string | null = typeof workshop.event_time === 'string' ? workshop.event_time : null
  if (sessionId) {
    const { data: session } = await supabaseAdmin
      .from('workshop_sessions')
      .select('id, workshop_id, event_date, event_time')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session || session.workshop_id !== workshopId) {
      return NextResponse.json({ error: '開催日程がこのワークショップのものではありません' }, { status: 400 })
    }
    bookingDate = session.event_date
    bookingTime = session.event_time
  }
  if (!bookingDate) {
    return NextResponse.json({ error: '開催日程を選んでください' }, { status: 400 })
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
