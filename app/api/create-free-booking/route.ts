import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, generateBookingConfirmationEmail } from '@/app/lib/email'

/**
 * 参加費0円のワークショップの予約確定。
 *
 * Stripe Checkout は最低決済金額(¥50)があるため、無料回を通常フローに流すと
 * ¥50 を請求してしまう。無料回だけはここで決済をスキップし、予約を確定して
 * 確認メールを送る（通常回の Webhook 相当の処理をその場で行う）。
 *
 * 無料かどうかはクライアントの申告を信用せず、必ずDBの price で判定する。
 */
export async function POST(request: NextRequest) {
  try {
    const { booking_id } = await request.json()

    if (!booking_id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available')
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        workshops(*, workshop_categories(*)),
        customers(*),
        workshop_session:workshop_sessions(*)
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const workshop = booking.workshops
    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
    }

    // 有料ワークショップをこの経路で確定させない（金額の真実はDBのみ）
    if ((workshop.price ?? 0) > 0) {
      return NextResponse.json({ error: 'This workshop requires payment' }, { status: 400 })
    }

    // 二重確定を防ぐ（リトライ・二重送信時は既存の予約をそのまま返す）
    if (booking.status === 'confirmed') {
      return NextResponse.json({ success: true, booking })
    }

    // 空席の再確認。無料回は席だけ押さえられる事故が起きやすいので、
    // 確定の直前にサーバー側でも定員を超えていないか数える。
    const sessionId: string | null = booking.session_id ?? null
    const maxParticipants: number =
      (sessionId ? booking.workshop_session?.max_participants : null) ?? workshop.max_participants
    const manualParticipants: number =
      (sessionId ? booking.workshop_session?.manual_participants : null) ?? workshop.manual_participants ?? 0

    let takenQuery = supabaseAdmin
      .from('bookings')
      .select('participants')
      .neq('status', 'cancelled')
      .in('payment_status', ['pending', 'paid'])
      .neq('id', booking_id)
    takenQuery = sessionId
      ? takenQuery.eq('session_id', sessionId)
      : takenQuery.eq('workshop_id', workshop.id)

    const { data: taken } = await takenQuery
    const alreadyBooked =
      (taken?.reduce((sum, b) => sum + (b.participants || 0), 0) || 0) + manualParticipants

    if (alreadyBooked + booking.participants > maxParticipants) {
      // 席が埋まっていたら、押さえてしまった仮予約を取り消してから返す
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'cancelled', payment_status: 'failed' })
        .eq('id', booking_id)
      return NextResponse.json({ error: '満席のため予約を確定できませんでした' }, { status: 409 })
    }

    // 予約を確定。無料のため payment_status は 'paid'（金額0）として扱う。
    // 空席計算が payment_status in (pending, paid) で行われているため、
    // 独自の値を入れると席の計算が狂う。
    const { data: confirmed, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        total_amount: 0,
        discount_amount: 0,
      })
      .eq('id', booking_id)
      .select(`
        *,
        workshop:workshops(*),
        customer:customers(*)
      `)
      .single()

    if (updateError) throw updateError

    // 予約確認メール（有料回の Webhook と同じ本文を使う）
    const customer = booking.customers
    if (customer?.email) {
      const eventDate =
        booking.workshop_session?.event_date || workshop.event_date || booking.booking_date
      const eventTime =
        booking.workshop_session?.event_time || workshop.event_time || booking.booking_time

      const emailContent = generateBookingConfirmationEmail(
        workshop.title,
        eventDate
          ? new Date(`${eventDate}T00:00:00`).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })
          : '未定',
        eventTime ? eventTime.slice(0, 5) : '未定',
        workshop.location || '東京都文京区湯島3-14-8 加田湯島ビル 5F',
        customer.name,
        customer.email,
        booking.participants,
        booking.minor_count,
        booking.minor_grades,
        workshop.workshop_categories?.email_production_notes,
        booking.companion_count
      )

      const emailResult = await sendEmail({
        to: customer.email,
        cc: ['yuho.ito@walker.co.jp', 'y-sato@sunu25.com', 'nanzinaniwa6@gmail.com'],
        subject: emailContent.subject,
        html: emailContent.html,
      })

      // メール送信の失敗で予約自体を落とさない（確定は済んでいる）
      if (!emailResult.success) {
        console.error(`Free booking ${booking_id}: confirmation email failed:`, emailResult.error)
      }
    }

    return NextResponse.json({ success: true, booking: confirmed })
  } catch (error) {
    console.error('Error confirming free booking:', error)
    return NextResponse.json({ error: 'Failed to confirm booking' }, { status: 500 })
  }
}
