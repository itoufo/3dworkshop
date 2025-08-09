import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const workshopId = searchParams.get('workshopId')

  if (!workshopId) {
    return NextResponse.json({ error: 'Workshop ID is required' }, { status: 400 })
  }

  try {
    // ワークショップ情報を取得
    const { data: workshop, error: workshopError } = await supabaseAdmin
      .from('workshops')
      .select('max_participants, manual_participants')
      .eq('id', workshopId)
      .single()

    if (workshopError || !workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
    }

    // 現在の予約数を取得
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('participants')
      .eq('workshop_id', workshopId)
      .neq('status', 'cancelled')
      .in('payment_status', ['pending', 'paid'])

    if (bookingsError) {
      throw bookingsError
    }

    // 合計参加人数を計算
    const bookedParticipants = bookings?.reduce((sum, booking) => sum + booking.participants, 0) || 0
    const manualParticipants = workshop.manual_participants || 0
    const totalParticipants = bookedParticipants + manualParticipants
    const availableSpots = workshop.max_participants - totalParticipants

    return NextResponse.json({
      max_participants: workshop.max_participants,
      booked_participants: bookedParticipants,
      manual_participants: manualParticipants,
      total_participants: totalParticipants,
      available_spots: Math.max(0, availableSpots),
      is_full: availableSpots <= 0
    })
  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
  }
}