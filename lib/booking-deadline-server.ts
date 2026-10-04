import type { SupabaseClient } from '@supabase/supabase-js'
import { isSessionBookable, CLOSE_REASON_LABEL, type BookableResult } from '@/lib/booking-deadline'
import { sumConfirmedParticipants, manualParticipantsFor } from '@/lib/session-participants'

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
): Promise<{ closed: false } | { closed: true; message: string; result: BookableResult | null }> {
  const { data: booking, error } = await client
    .from('bookings')
    .select(
      'id, workshop_id, session_id, ' +
        'workshop:workshops(event_date, event_time, manual_participants, booking_cutoff_days, zero_booking_cutoff_days_before, zero_booking_cutoff_time), ' +
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
      booking_cutoff_days: number | null
      zero_booking_cutoff_days_before: number | null
      zero_booking_cutoff_time: string | null
    } | null
    session: { event_date: string; event_time: string | null; manual_participants: number | null } | null
  }
  // ⚠ 読めなかったときに「締切なし」で通さない（失敗したら閉じる側に倒す）。呼び出し側の catch で 500 になる
  if (error) throw error
  const row = booking as unknown as Row | null
  if (!row?.workshop) throw new Error(`booking ${bookingId} or its workshop not found`)

  // 回に紐づかない予約は、そのワークショップに日程が1つも無い（日程管理以前の形式）ときだけ、
  // ワークショップの開催日で判定する。日程があるのに回の指定がない・開催日もない予約は受け付けない
  let target: { event_date: string; event_time: string | null } | null = row.session
  if (!target) {
    const { count, error: countError } = await client
      .from('workshop_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('workshop_id', row.workshop_id)
      .eq('status', 'scheduled')
    if (countError) throw countError
    if ((count ?? 0) === 0 && row.workshop.event_date) {
      target = { event_date: row.workshop.event_date, event_time: row.workshop.event_time }
    }
  }
  if (!target) {
    await cancelPending(client, row.id)
    return { closed: true, message: CLOSE_REASON_LABEL.no_session, result: null }
  }

  const booked = await sumConfirmedParticipants(client, {
    workshopId: row.workshop_id,
    sessionId: row.session_id,
    excludeBookingId: row.id,
  })
  const total = booked + manualParticipantsFor(row.session, row.workshop)

  const result = isSessionBookable({ workshop: row.workshop, session: target, totalParticipants: total })
  if (result.bookable) return { closed: false }

  await cancelPending(client, row.id)
  return { closed: true, message: CLOSE_REASON_LABEL[result.reason!], result }
}

async function cancelPending(client: SupabaseClient, bookingId: string) {
  await client.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId).eq('status', 'pending')
}
