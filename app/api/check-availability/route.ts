import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sumBookedParticipants, manualParticipantsFor } from '@/lib/session-participants'
import { isSessionBookable, type DeadlineSession } from '@/lib/booking-deadline'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const workshopId = searchParams.get('workshopId')
  const sessionId = searchParams.get('sessionId') // 新規: 任意

  if (!workshopId) {
    return NextResponse.json({ error: 'Workshop ID is required' }, { status: 400 })
  }

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { data: workshop, error: workshopError } = await supabaseAdmin
      .from('workshops')
      .select('max_participants, manual_participants, early_bird_enabled, early_bird_discount, early_bird_slots, event_date, event_time, zero_booking_cutoff_days_before, zero_booking_cutoff_time')
      .eq('id', workshopId)
      .single()

    if (workshopError || !workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
    }

    // 予約締切（開始時刻・予約0人の締切）の判定結果をレスポンスに載せる
    const deadlineFields = (target: DeadlineSession | null, totalParticipants: number) => {
      if (!target) return { is_closed: false, closes_at: null, close_reason: null }
      const r = isSessionBookable({ workshop, session: target, totalParticipants })
      return {
        is_closed: !r.bookable,
        closes_at: r.closesAt.toISOString(),
        close_reason: r.reason,
      }
    }

    // 早割の残り組数（ワークショップ単位・キャンセル以外の予約行数でカウント）
    let early_bird: {
      enabled: boolean
      discount: number
      slots: number
      remaining: number
    } | null = null
    if (
      workshop.early_bird_enabled &&
      (workshop.early_bird_discount ?? 0) > 0 &&
      (workshop.early_bird_slots ?? 0) > 0
    ) {
      const { count } = await supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('workshop_id', workshopId)
        .neq('status', 'cancelled')
      const used = count ?? 0
      early_bird = {
        enabled: true,
        discount: workshop.early_bird_discount,
        slots: workshop.early_bird_slots,
        remaining: Math.max(0, workshop.early_bird_slots - used),
      }
    }

    // セッション単位カウント
    if (sessionId) {
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('workshop_sessions')
        .select('id, max_participants, manual_participants, status, event_date, event_time')
        .eq('id', sessionId)
        .eq('workshop_id', workshopId)
        .single()

      if (sessionError || !session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      const bookedParticipants = await sumBookedParticipants(supabaseAdmin, { workshopId, sessionId })
      // session.max_participants が NULL なら workshop 側にフォールバック
      const maxParticipants = session.max_participants ?? workshop.max_participants
      const manualParticipants = manualParticipantsFor(session, workshop)
      const totalParticipants = bookedParticipants + manualParticipants
      const availableSpots = maxParticipants - totalParticipants
      const isCancelled = session.status === 'cancelled'

      return NextResponse.json({
        scope: 'session',
        session_id: sessionId,
        max_participants: maxParticipants,
        booked_participants: bookedParticipants,
        manual_participants: manualParticipants,
        total_participants: totalParticipants,
        available_spots: Math.max(0, availableSpots),
        is_full: isCancelled || availableSpots <= 0,
        is_cancelled: isCancelled,
        ...deadlineFields(session, totalParticipants),
        early_bird,
      })
    }

    // ワークショップ全体カウント (legacy / back-compat)
    const bookedParticipants = await sumBookedParticipants(supabaseAdmin, { workshopId })
    const manualParticipants = workshop.manual_participants || 0
    const totalParticipants = bookedParticipants + manualParticipants
    const availableSpots = workshop.max_participants - totalParticipants

    return NextResponse.json({
      scope: 'workshop',
      max_participants: workshop.max_participants,
      booked_participants: bookedParticipants,
      manual_participants: manualParticipants,
      total_participants: totalParticipants,
      available_spots: Math.max(0, availableSpots),
      is_full: availableSpots <= 0,
      ...deadlineFields(
        workshop.event_date ? { event_date: workshop.event_date, event_time: workshop.event_time } : null,
        totalParticipants
      ),
      early_bird,
    })
  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
  }
}
