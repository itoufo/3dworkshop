import { bookingDeadline } from '@/lib/booking-policy'
/**
 * 予約締切の判定（純粋関数のみ。サーバー・ブラウザ両方から使う）
 *
 * ルール:
 * - 開始時刻（開催日＋開始時刻, JST）を過ぎた回は必ず締切
 * - ワークショップに「予約0人のときの締切」が設定されていれば、その時刻の時点で
 *   参加者が0人（サイト予約＋管理画面で手入力した他媒体の人数）の回は締切。
 *   1人以上いれば開始時刻まで受け付ける
 *
 * 締切時刻 = (開催日 − zero_booking_cutoff_days_before 日) の zero_booking_cutoff_time（JST）。
 * 「前日 24:00」は days_before=0, time=00:00（＝開催日 0:00）で表す。
 *
 * Vercel の関数は UTC で動くので、日付計算は必ず +09:00 を明示して行う。
 */

export interface DeadlineWorkshop {
  booking_cutoff_days?: number | null
  zero_booking_cutoff_days_before?: number | null
  zero_booking_cutoff_time?: string | null
}

export interface DeadlineSession {
  event_date: string // YYYY-MM-DD
  event_time?: string | null // HH:MM or HH:MM:SS
}

export type CloseReason = 'started' | 'shipping_cutoff' | 'zero_booking_cutoff' | 'no_session'

export interface BookableResult {
  bookable: boolean
  reason: CloseReason | null
  /** 次に締め切られる時刻（0人締切が先に来るならそれ、なければ開始時刻） */
  closesAt: Date
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

function hhmm(time: string | null | undefined): string {
  return (time || '00:00').slice(0, 5)
}

/** JST の日付・時刻から Date を作る */
export function jstDate(date: string, time?: string | null): Date {
  return new Date(`${date}T${hhmm(time)}:00+09:00`)
}

/** JST での今日（YYYY-MM-DD） */
export function jstToday(now: Date = new Date()): string {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10)
}

/** YYYY-MM-DD から days 日引いた日付 */
function minusDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10)
}

/**
 * 回の開始時刻。開始時刻が入っていない回は、その日の 23:59（JST）まで受け付ける。
 * ⚠ 00:00 扱いにすると、当日になった瞬間に「開始済み」で一覧から消える
 */
export function sessionStartJst(session: DeadlineSession): Date {
  return jstDate(session.event_date, session.event_time || '23:59')
}

/** 0人締切の時刻。設定がなければ null */
export function zeroBookingCutoffJst(
  workshop: DeadlineWorkshop,
  session: DeadlineSession
): Date | null {
  const days = workshop.zero_booking_cutoff_days_before
  const time = workshop.zero_booking_cutoff_time
  if (days == null || !time) return null
  return jstDate(minusDays(session.event_date, days), time)
}

export function isSessionBookable({
  workshop,
  session,
  totalParticipants,
  now = new Date(),
}: {
  workshop: DeadlineWorkshop
  session: DeadlineSession
  /**
   * 申込者本人を除いた、確定済みの参加者数（確定 or 支払済みのサイト予約＋手入力人数）。
   * ⚠ 未払いの仮予約（pending）は数えない。途中で離脱した仮予約や、anon キーで
   *   誰でも作れる行で「0人ではない」扱いになり、締切後も開いたままになるため
   */
  totalParticipants: number
  now?: Date
}): BookableResult {
  const start = sessionStartJst(session)
  if (now.getTime() >= start.getTime()) {
    return { bookable: false, reason: 'started', closesAt: start }
  }
  const shippingCutoff = bookingDeadline(session.event_date, workshop.booking_cutoff_days ?? 0)
  if (shippingCutoff && now >= shippingCutoff) {
    return { bookable: false, reason: 'shipping_cutoff', closesAt: shippingCutoff }
  }
  const cutoff = zeroBookingCutoffJst(workshop, session)
  if (cutoff && totalParticipants <= 0) {
    if (now.getTime() >= cutoff.getTime()) {
      return { bookable: false, reason: 'zero_booking_cutoff', closesAt: cutoff }
    }
    return { bookable: true, reason: null, closesAt: new Date(Math.min(cutoff.getTime(), start.getTime(), shippingCutoff?.getTime() ?? Infinity)) }
  }
  return { bookable: true, reason: null, closesAt: shippingCutoff && shippingCutoff < start ? shippingCutoff : start }
}

/** 締切時刻の表示。0:00 は「前日 24:00」と書く（例: 10月4日 24:00） */
export function formatCutoffJst(d: Date): string {
  let jst = new Date(d.getTime() + JST_OFFSET_MS)
  let h = jst.getUTCHours()
  const m = jst.getUTCMinutes()
  if (h === 0 && m === 0) {
    jst = new Date(jst.getTime() - 24 * 60 * 60 * 1000)
    h = 24
  }
  return `${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日 ${h}:${String(m).padStart(2, '0')}`
}

/** 英語ページ用の締切表記（例: 'Oct 9, 23:59'）。0:00 は前日の 23:59 と書く（"24:00" は英語では伝わりにくい） */
export function formatCutoffJstEn(d: Date): string {
  const jst = new Date(d.getTime() + JST_OFFSET_MS - (isMidnight(d) ? 60 * 1000 : 0))
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[jst.getUTCMonth()]} ${jst.getUTCDate()}, ${jst.getUTCHours()}:${String(jst.getUTCMinutes()).padStart(2, '0')}`
}

function isMidnight(d: Date): boolean {
  const jst = new Date(d.getTime() + JST_OFFSET_MS)
  return jst.getUTCHours() === 0 && jst.getUTCMinutes() === 0
}

export const CLOSE_REASON_LABEL: Record<CloseReason, string> = {
  shipping_cutoff: 'サンプルの事前発送のため予約受付を終了しました',
  started: '開始時刻を過ぎたため受付を終了しました',
  zero_booking_cutoff: '受付期間が終了しました',
  no_session: 'この日程は受付していません',
}
