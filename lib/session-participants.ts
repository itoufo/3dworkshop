import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 回ごとの参加者数の数え方（空席表示・定員チェック・予約締切で共通）。
 *
 * サイト予約: キャンセル以外かつ payment_status が pending/paid の participants 合計。
 * session_id があればその回、なければ（旧データ）ワークショップ全体で数える。
 */
export async function sumBookedParticipants(
  client: SupabaseClient,
  {
    workshopId,
    sessionId,
    excludeBookingId,
  }: { workshopId: string; sessionId?: string | null; excludeBookingId?: string | null }
): Promise<number> {
  let query = client
    .from('bookings')
    .select('participants')
    .neq('status', 'cancelled')
    .in('payment_status', ['pending', 'paid'])
  query = sessionId ? query.eq('session_id', sessionId) : query.eq('workshop_id', workshopId)
  if (excludeBookingId) query = query.neq('id', excludeBookingId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).reduce((sum, b) => sum + (b.participants || 0), 0)
}

/**
 * 予約0人の締切の判定に使う、確定済みの参加者数。
 * 確定（status=confirmed）か支払済み（payment_status=paid）のキャンセル以外だけを数える。
 * ⚠ 定員の計算（sumBookedParticipants）とは別物。そちらは仮予約も席を押さえる
 */
export async function sumConfirmedParticipants(
  client: SupabaseClient,
  {
    workshopId,
    sessionId,
    excludeBookingId,
  }: { workshopId: string; sessionId?: string | null; excludeBookingId?: string | null }
): Promise<number> {
  let query = client
    .from('bookings')
    .select('participants')
    .neq('status', 'cancelled')
    .or('status.eq.confirmed,payment_status.eq.paid')
  query = sessionId ? query.eq('session_id', sessionId) : query.eq('workshop_id', workshopId)
  if (excludeBookingId) query = query.neq('id', excludeBookingId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).reduce((sum, b) => sum + (b.participants || 0), 0)
}

/** 管理画面で手入力した他媒体の人数（回の分＋ワークショップ全体の分） */
export function manualParticipantsFor(
  session: { manual_participants?: number | null } | null | undefined,
  workshop: { manual_participants?: number | null }
): number {
  return (session?.manual_participants ?? 0) + (workshop.manual_participants ?? 0)
}
