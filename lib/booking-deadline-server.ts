import type { SupabaseClient } from '@supabase/supabase-js'
import { isSessionBookable, CLOSE_REASON_LABEL, type BookableResult } from '@/lib/booking-deadline'
import { sumBookedParticipants, manualParticipantsFor } from '@/lib/session-participants'

/**
 * 予約1件がまだ受付期間内かをサーバー側で確かめる。
 *
 * 予約行はブラウザが anon キーで直接 insert しているので、画面側の締切表示だけでは
 * 締切後の申込を止められない。決済・確定の API で必ずこれを通す。
 * 締切後なら作られてしまった仮予約をキャンセルにして、その理由を返す。
 *
 * 参加者数は申込者本人の予約を除いて数える（本人の予約で「0人ではない」扱いにしない）。
 */
export async function closeBookingIfPastDeadline(
  client: SupabaseClient,
  bookingId: string
): Promise<{ closed: false } | { closed: true; message: string; result: BookableResult }> {
  const { data: booking } = await client
    .from('bookings')
    .select(
      'id, workshop_id, session_id, ' +
        'workshop:workshops(event_date, event_time, manual_participants, zero_booking_cutoff_days_before, zero_booking_cutoff_time), ' +
        'session:workshop_sessions(event_date, event_time, manual_participants)'
    )
    .eq('id', bookingId)
    .single()

  type Row = {
    id: string
    workshop_id: string
    session_id: string | null
    workshop: {
      event_date: string | null
      event_time: string | null
      manual_participants: number | null
      zero_booking_cutoff_days_before: number | null
      zero_booking_cutoff_time: string | null
    } | null
    session: { event_date: string; event_time: string | null; manual_participants: number | null } | null
  }
  const row = booking as unknown as Row | null
  if (!row?.workshop) return { closed: false }

  // 回に紐づかない旧形式の予約はワークショップの開催日で判定する。日付がなければ判定しない
  const target = row.session ?? (row.workshop.event_date
    ? { event_date: row.workshop.event_date, event_time: row.workshop.event_time }
    : null)
  if (!target) return { closed: false }

  const booked = await sumBookedParticipants(client, {
    workshopId: row.workshop_id,
    sessionId: row.session_id,
    excludeBookingId: row.id,
  })
  const total = booked + manualParticipantsFor(row.session, row.workshop)

  const result = isSessionBookable({ workshop: row.workshop, session: target, totalParticipants: total })
  if (result.bookable) return { closed: false }

  await client
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', row.id)
    .eq('status', 'pending')

  return { closed: true, message: CLOSE_REASON_LABEL[result.reason!], result }
}
