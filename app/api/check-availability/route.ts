import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
      .select('max_participants, manual_participants')
      .eq('id', workshopId)
      .single()

    if (workshopError || !workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
    }

    // セッション単位カウント
    if (sessionId) {
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('workshop_sessions')
        .select('id, max_participants, manual_participants, status')
        .eq('id', sessionId)
        .eq('workshop_id', workshopId)
        .single()

      if (sessionError || !session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      // セッションへの予約をカウント
      const { data: sessionBookings, error: bErr } = await supabaseAdmin
        .from('bookings')
        .select('participants')
        .eq('session_id', sessionId)
        .neq('status', 'cancelled')
        .in('payment_status', ['pending', 'paid'])

      if (bErr) throw bErr

      const bookedParticipants =
        sessionBookings?.reduce((sum, b) => sum + b.participants, 0) || 0
      // session.max_participants が NULL なら workshop 側にフォールバック
      const maxParticipants = session.max_participants ?? workshop.max_participants
      const manualParticipants =
        (session.manual_participants ?? 0) + (workshop.manual_participants ?? 0)
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
      })
    }

    // ワークショップ全体カウント (legacy / back-compat)
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('participants')
      .eq('workshop_id', workshopId)
      .neq('status', 'cancelled')
      .in('payment_status', ['pending', 'paid'])

    if (bookingsError) {
      throw bookingsError
    }

    const bookedParticipants =
      bookings?.reduce((sum, booking) => sum + booking.participants, 0) || 0
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
    })
  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
  }
}
