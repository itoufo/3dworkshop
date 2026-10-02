import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'
import { jstToday } from '@/lib/booking-deadline'
import { MAX_PARTICIPANTS_PER_BOOKING } from '@/lib/booking-limits'
import { sumBookedParticipants, manualParticipantsFor } from '@/lib/session-participants'
import {
  parseCustomerContact,
  parseOptionalAge,
  parseOptionalGender,
  upsertCustomerByEmail,
} from '@/lib/public-customer'

/**
 * ワークショップの仮予約（status: pending）を作る。予約フォームの送信で最初に呼ばれる。
 *
 * ここで作るのは「顧客行」と「未決済の予約行」だけ。確定はこの後の経路が行う:
 *   有料 … /api/create-checkout-session → Stripe → Webhook
 *   無料 … /api/create-free-booking
 * 同意の記録・締切・選択肢（フィギュア等）の代金・早割・クーポンはそちらで扱うので、ここでは触らない。
 *
 * ⚠ 開催日時と金額はブラウザから受け取らず、DB のワークショップ・日程から決める。
 * ⚠ 残席を超える人数・中止になった回の仮予約は作らない。仮予約も席を押さえる
 *   （空席の計算は pending も数える）ので、確かめずに作ると1回の送信でその回を満席にできる。
 * ⚠ 返すのは予約の id だけ。顧客行・予約行の中身は返さない。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_MS = 10 * 60 * 1000
/** 同じ接続元から10分に作れる仮予約の数。フォームは送信のたびに1行作るので、やり直しの分の余裕を持たせる */
const MAX_BOOKINGS = 20

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** 1回の予約の人数の上限。フォームで選べる人数と同じ値にする */
const MAX_PARTICIPANTS = MAX_PARTICIPANTS_PER_BOOKING
const MINOR_GRADES_MAX = 500

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const ip = clientIp(request.headers)
  if (await tooManyRequests(`create-booking:${ip}`, { windowMs: WINDOW_MS, max: MAX_BOOKINGS })) {
    return NextResponse.json({ error: '短時間に送信が多すぎます。しばらくしてからお試しください。' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return bad('リクエストの形式が不正です')
    body = parsed as Record<string, unknown>
  } catch {
    return bad('リクエストの形式が不正です')
  }

  const workshopId = typeof body.workshop_id === 'string' ? body.workshop_id : ''
  if (!UUID.test(workshopId)) return bad('ワークショップの指定が正しくありません')
  const sessionId = typeof body.session_id === 'string' && body.session_id ? body.session_id : null
  if (sessionId && !UUID.test(sessionId)) return bad('開催日程の指定が正しくありません')
  // 同じ画面が直前に作った仮予約の id（やり直しのときだけ付く）。形が違えば無視する
  const previousBookingId =
    typeof body.previous_booking_id === 'string' && UUID.test(body.previous_booking_id) ? body.previous_booking_id : null

  const contact = parseCustomerContact(body, { phoneRequired: true })
  if (!contact.ok) return bad(contact.error)
  const age = parseOptionalAge(body.age)
  if (!age.ok) return bad(age.error)
  const gender = parseOptionalGender(body.gender)
  if (!gender.ok) return bad(gender.error)

  const participants = Number(body.participants)
  if (!Number.isInteger(participants) || participants < 1 || participants > MAX_PARTICIPANTS) {
    return bad('参加人数が正しくありません')
  }

  // 高校生以下の人数と学年。いない場合は null（フォームの「いる」にチェックが無い状態）
  let minorCount: number | null = null
  let minorGrades: string | null = null
  if (body.minor_count !== undefined && body.minor_count !== null) {
    const n = Number(body.minor_count)
    if (!Number.isInteger(n) || n < 1 || n > MAX_PARTICIPANTS) return bad('高校生以下の人数が正しくありません')
    minorCount = n
    minorGrades = typeof body.minor_grades === 'string' ? body.minor_grades.trim() : ''
    // 黙って切り詰めない（書いたものが欠けたことに誰も気づけない）
    if (minorGrades.length > MINOR_GRADES_MAX) return bad(`学年は${MINOR_GRADES_MAX}文字以内で入力してください`)
  }

  const companionRaw = Number(body.companion_count ?? 0)
  if (!Number.isInteger(companionRaw) || companionRaw < 0 || companionRaw > 1) {
    return bad('同伴者の人数が正しくありません')
  }

  const { data: workshop } = await supabaseAdmin
    .from('workshops')
    .select('id, price, event_date, event_time, collect_demographics, max_participants, manual_participants')
    .eq('id', workshopId)
    .maybeSingle()
  if (!workshop) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })

  let session: {
    event_date: string | null
    event_time: string | null
    is_family_friendly: boolean | null
    status: string | null
    max_participants: number | null
    manual_participants: number | null
  } | null = null
  if (sessionId) {
    const { data } = await supabaseAdmin
      .from('workshop_sessions')
      .select('id, workshop_id, event_date, event_time, is_family_friendly, status, max_participants, manual_participants')
      .eq('id', sessionId)
      .maybeSingle()
    // 別のワークショップの日程を付けた予約を作らせない（その回の空席計算に紛れ込む）
    if (!data || data.workshop_id !== workshop.id) return bad('開催日程がこのワークショップのものではありません')
    if (data.status === 'cancelled') {
      return NextResponse.json({ error: 'この日程は中止になりました', code: 'sold_out' }, { status: 409 })
    }
    session = data
  }

  // 同じ画面からのやり直し。直前に作った仮予約（決済画面まで進まなかったもの）を取り消してから数える。
  // 決済画面の作成（/api/create-checkout-session）が通信断などで失敗すると仮予約だけが残り、
  // Stripe のセッションが無いので失効の Webhook も来ない。そのままだと本人のやり直しが
  // 「自分の仮予約のせいで満席」で通らなくなる。
  // ⚠ 取り消すのは、画面が送ってきた id の予約1件だけ。メールアドレスや回で探さない
  //   （管理者が手で入れた「保留・未払い」の予約や、別の端末で決済に進んでいる予約を巻き込む）。
  //   id は作った画面しか知らない。さらに、このフォームが作った未決済の仮予約であることを条件で確かめる
  if (previousBookingId) {
    const { error: previousError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', previousBookingId)
      .eq('workshop_id', workshop.id)
      .eq('source', 'website')
      .eq('status', 'pending')
      .eq('payment_status', 'pending')
      .is('stripe_session_id', null)
    if (previousError) {
      console.error('[create-booking] previous pending cleanup failed:', previousError.code, previousError.message)
    }
  }

  // 残席の確認。数え方は空席表示（/api/check-availability）と同じ関数を使う
  const maxParticipants: number | null = session?.max_participants ?? workshop.max_participants ?? null
  if (maxParticipants !== null) {
    let taken: number
    try {
      taken =
        (await sumBookedParticipants(supabaseAdmin, { workshopId: workshop.id, sessionId })) +
        manualParticipantsFor(session, workshop)
    } catch (e) {
      console.error('[create-booking] seat count failed:', e)
      return NextResponse.json({ error: '予約の作成に失敗しました' }, { status: 500 })
    }
    const remaining = maxParticipants - taken
    if (participants > remaining) {
      return NextResponse.json(
        {
          error: remaining > 0 ? `残り${remaining}名のため、${participants}名ではお申し込みいただけません` : '満席のためお申し込みいただけません',
          code: 'sold_out',
        },
        { status: 409 },
      )
    }
  }

  const customer = await upsertCustomerByEmail(supabaseAdmin, contact.value, {
    // 年齢・性別は収集対象のワークショップで入力があった場合のみ更新（未入力は不明のまま）
    ...(workshop.collect_demographics && age.value !== null ? { age: age.value } : {}),
    ...(workshop.collect_demographics && gender.value !== null ? { gender: gender.value } : {}),
  })
  if (!customer) return NextResponse.json({ error: '予約の作成に失敗しました' }, { status: 500 })

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      workshop_id: workshop.id,
      session_id: sessionId,
      customer_id: customer.id,
      booking_date: session?.event_date || workshop.event_date || jstToday(),
      booking_time: session?.event_time || workshop.event_time || '10:00',
      participants,
      // 参加費×人数。選択肢のあるワークショップでは、決済セッション作成時に選んだものの代金を足して書き直す
      total_amount: workshop.price * participants,
      status: 'pending',
      payment_status: 'pending',
      minor_count: minorCount,
      minor_grades: minorGrades,
      // 同伴者は親子向け日程のみ無料・定員外。participants（＝料金/残席の基準）には含めない
      companion_count: session?.is_family_friendly ? companionRaw : 0,
    })
    .select('id')
    .single()

  if (error || !booking) {
    console.error('[create-booking] insert failed:', error?.code, error?.message)
    return NextResponse.json({ error: '予約の作成に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ booking_id: booking.id }, { status: 201 })
}
