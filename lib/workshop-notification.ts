// 開催日程の通知で、サーバーとクライアントの両方が使う純粋関数。
//
// 通知の重複判定キー（dedupe key）は API ルートが作り、管理画面が「通知済みかどうか」の
// 表示に使う。両者がずれると通知済みバッジが出なくなるので、定義はこの1ファイルに置く。

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** 'HH:MM:SS' / 'HH:MM' を 'HH:MM' に揃える。時刻未定なら null */
export function formatEventTimeShort(eventTime?: string | null): string | null {
  if (!eventTime) return null
  const match = eventTime.match(/^(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : null
}

/** 'YYYY-MM-DD' を「9月13日(土)」にする。タイムゾーンでずれないよう文字列から直接組み立てる */
export function formatEventDateLabel(eventDate: string): string {
  const [y, m, d] = eventDate.split('-').map(Number)
  if (!y || !m || !d) return eventDate
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${m}月${d}日(${weekday})`
}

/** 同じ日程を二重に通知しないための鍵 */
export function scheduleDedupeKey(
  workshopId: string,
  eventDate: string,
  eventTime?: string | null
): string {
  return `${workshopId}:${eventDate}:${formatEventTimeShort(eventTime) || '--:--'}`
}
