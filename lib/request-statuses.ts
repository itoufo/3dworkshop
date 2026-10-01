/**
 * お問い合わせ（workshop_requests / service_requests）の対応状況。
 *
 * ⚠ ここが唯一の一覧。画面の選択肢・API が受け取ってよい値・行の型が、必ず同じものを指すように
 *   3箇所ともここから取る。書き写すと、選択肢にあるのに API が 400 を返す組み合わせができる
 *   （lib/admin-tabs.ts と同じ理由。あちらは 'surveys' の取りこぼしで実際に起きた）。
 * ⚠ 2つのテーブルで使える値が違う。ワークショップは「日程確定」、サービスは「見積送付済」。
 *   片方の値をもう片方に入れない。
 */

export const WORKSHOP_REQUEST_STATUSES = ['new', 'contacted', 'scheduled', 'closed'] as const
export const SERVICE_REQUEST_STATUSES = ['new', 'contacted', 'quoted', 'closed'] as const

export type WorkshopRequestStatus = (typeof WORKSHOP_REQUEST_STATUSES)[number]
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number]
export type RequestKind = 'workshop' | 'service'

/** 画面に出す文言 */
export const REQUEST_STATUS_LABELS: Record<WorkshopRequestStatus | ServiceRequestStatus, string> = {
  new: '未対応',
  contacted: '連絡済',
  scheduled: '日程確定',
  quoted: '見積送付済',
  closed: 'クローズ',
}

/** その種類で使ってよい値か */
export function isValidRequestStatus(kind: RequestKind, status: unknown): boolean {
  const allowed: readonly string[] =
    kind === 'workshop' ? WORKSHOP_REQUEST_STATUSES : SERVICE_REQUEST_STATUSES
  return typeof status === 'string' && allowed.includes(status)
}

/** 対応状況を変えたとき、左メニューの未対応件数に知らせるための合図 */
export const REQUESTS_CHANGED_EVENT = 'admin:requests-changed'
